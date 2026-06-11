use crate::error::{AppError, AppResult};
use crate::paths::AppPaths;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Write};
use zip::write::SimpleFileOptions;

pub const BACKUP_VERSION: u32 = 1;

#[derive(Debug, Serialize, Deserialize)]
pub struct Manifest {
    pub version: u32,
    pub exported_at: String,
    pub schema_version: u32,
    pub app_version: String,
}

impl Manifest {
    pub fn current(app_version: &str) -> Self {
        Self {
            version: BACKUP_VERSION,
            exported_at: chrono::Utc::now().to_rfc3339(),
            schema_version: 1,
            app_version: app_version.to_string(),
        }
    }
}

pub fn export_zip(
    paths: &AppPaths,
    out_path: &std::path::Path,
    app_version: &str,
) -> AppResult<()> {
    let file = File::create(out_path)?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .compression_level(Some(6));

    // manifest
    let manifest = Manifest::current(app_version);
    zip.start_file("manifest.json", options)?;
    zip.write_all(serde_json::to_string_pretty(&manifest)?.as_bytes())?;

    // db files (main + wal + shm if present)
    for fname in ["baso.db", "baso.db-wal", "baso.db-shm"] {
        let src = paths.db_path.with_file_name(fname);
        if src.exists() {
            zip.start_file(fname, options)?;
            let mut f = File::open(&src)?;
            let mut buf = Vec::new();
            f.read_to_end(&mut buf)?;
            zip.write_all(&buf)?;
        }
    }

    zip.finish()?;
    Ok(())
}

pub fn read_manifest(zip_path: &std::path::Path) -> AppResult<Manifest> {
    let file = File::open(zip_path)?;
    let mut zip = zip::ZipArchive::new(file)
        .map_err(|e| AppError::Backup(format!("invalid zip: {e}")))?;
    let mut entry = zip
        .by_name("manifest.json")
        .map_err(|e| AppError::Backup(format!("manifest.json missing: {e}")))?;
    let mut content = String::new();
    entry.read_to_string(&mut content)
        .map_err(|e| AppError::Backup(format!("cannot read manifest: {e}")))?;
    let m: Manifest = serde_json::from_str(&content)
        .map_err(|e| AppError::Backup(format!("invalid manifest: {e}")))?;
    if m.version != BACKUP_VERSION {
        return Err(AppError::Backup(format!(
            "unsupported backup version: {}",
            m.version
        )));
    }
    Ok(m)
}

pub fn import_zip(
    zip_path: &std::path::Path,
    target_db_path: &std::path::Path,
) -> AppResult<()> {
    // 1. validate manifest
    let _ = read_manifest(zip_path)?;

    // 2. extract db files to a temp dir
    let tmp_dir = std::env::temp_dir().join(format!("baso-restore-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&tmp_dir)?;

    let file = File::open(zip_path)?;
    let mut zip = zip::ZipArchive::new(file)?;
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i)?;
        let name = entry.name().to_string();
        if name.contains('/') || name.contains("..") {
            return Err(AppError::Backup(format!("unsafe path in zip: {name}")));
        }
        if !name.starts_with("baso.db") {
            continue;
        }
        let out = tmp_dir.join(&name);
        let mut out_f = File::create(&out)?;
        std::io::copy(&mut entry, &mut out_f)?;
    }

    // 3. validate extracted db is openable
    let extracted_db = tmp_dir.join("baso.db");
    if !extracted_db.exists() {
        return Err(AppError::Backup("baso.db not found in zip".into()));
    }
    {
        let test_conn = Connection::open(&extracted_db)?;
        let _: i32 = test_conn.query_row("SELECT COUNT(*) FROM sqlite_master", [], |r| r.get(0))?;
    }

    // 4. replace target db files
    if let Some(parent) = target_db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    for fname in ["baso.db", "baso.db-wal", "baso.db-shm"] {
        let dst = target_db_path.with_file_name(fname);
        // remove any existing file (incl. stale WAL/SHM not present in the zip)
        // so SQLite doesn't replay old transactions on top of the restored db
        if dst.exists() {
            std::fs::remove_file(&dst)?;
        }
        let src = tmp_dir.join(fname);
        if src.exists() {
            std::fs::copy(&src, &dst)?;
        }
    }

    // 5. cleanup tmp
    let _ = std::fs::remove_dir_all(&tmp_dir);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use crate::db::DbPool;

    fn setup_db() -> (AppPaths, DbPool) {
        let mut dir = std::env::temp_dir();
        dir.push(format!("baso-bk-{}", uuid::Uuid::new_v4()));
        let paths = AppPaths {
            data_dir: dir.clone(),
            db_path: dir.join("baso.db"),
            config_path: dir.join("config.json"),
            log_dir: dir.join("logs"),
        };
        std::fs::create_dir_all(&dir).unwrap();
        let pool = db::init_pool(&paths.db_path).unwrap();
        db::run_migrations(&pool).unwrap();
        (paths, pool)
    }

    #[test]
    fn export_and_import_roundtrip() {
        let (paths, pool) = setup_db();
        let zip_path = paths.data_dir.join("test.zip");

        // export
        export_zip(&paths, &zip_path, "0.1.0").unwrap();
        assert!(zip_path.exists());

        // add some data
        let conn = pool.get().unwrap();
        conn.execute(
            "INSERT INTO customers (id, name, email) VALUES ('c1', 'Test', 't@x.it')",
            [],
        ).unwrap();

        // validate manifest
        let m = read_manifest(&zip_path).unwrap();
        assert_eq!(m.version, 1);

        // import (will overwrite, removing 'Test' customer)
        import_zip(&zip_path, &paths.db_path).unwrap();

        // re-open and check no customers
        let pool2 = db::init_pool(&paths.db_path).unwrap();
        let conn2 = pool2.get().unwrap();
        let n: i64 = conn2.query_row("SELECT COUNT(*) FROM customers", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 0);
    }

    #[test]
    fn rejects_wrong_version() {
        let (paths, _pool) = setup_db();
        let zip_path = paths.data_dir.join("bad.zip");
        let f = File::create(&zip_path).unwrap();
        let mut zip = zip::ZipWriter::new(f);
        let opts = SimpleFileOptions::default();
        zip.start_file("manifest.json", opts).unwrap();
        zip.write_all(br#"{"version":99,"exported_at":"x","schema_version":1,"app_version":"x"}"#).unwrap();
        zip.finish().unwrap();

        let r = read_manifest(&zip_path);
        assert!(matches!(r, Err(AppError::Backup(_))));
    }
}
