use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::OpenFlags;

pub type DbPool = Pool<SqliteConnectionManager>;

pub mod schema {
    pub const SQL: &str = include_str!("schema.sql");
}

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("pool: {0}")]
    Pool(#[from] r2d2::Error),
    #[error("sqlite: {0}")]
    Sqlite(#[from] rusqlite::Error),
}

pub fn init_pool(db_path: &std::path::Path) -> Result<DbPool, DbError> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?;
    }

    let manager = SqliteConnectionManager::file(db_path)
        .with_flags(OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE)
        .with_init(|c| {
            c.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;")
        });

    let pool = Pool::builder()
        .max_size(8)
        .build(manager)?;

    Ok(pool)
}

pub fn run_migrations(pool: &DbPool) -> Result<(), DbError> {
    let conn = pool.get()?;
    // Schema is multi-statement SQL. We need to run it twice on existing DBs:
    // `CREATE TABLE IF NOT EXISTS` is naturally idempotent, but our v2 migration
    // (`ALTER TABLE ... ADD COLUMN apply_vat`) would fail on the second run because
    // the column already exists. Skip statements that error with "duplicate column".
    for stmt in schema::SQL.split(';') {
        let trimmed = stmt.trim();
        if trimmed.is_empty() {
            continue;
        }
        match conn.execute_batch(trimmed) {
            Ok(()) => {}
            Err(rusqlite::Error::SqliteFailure(_, Some(msg)))
                if msg.contains("duplicate column name") =>
            {
                // expected on re-run; column already present
            }
            Err(e) => return Err(e.into()),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db_path() -> std::path::PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!("baso-test-{}.db", uuid::Uuid::new_v4()));
        p
    }

    #[test]
    fn init_pool_creates_file() {
        let path = temp_db_path();
        let _pool = init_pool(&path).unwrap();
        assert!(path.exists());
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn migrations_create_all_tables() {
        let path = temp_db_path();
        let pool = init_pool(&path).unwrap();
        run_migrations(&pool).unwrap();

        let conn = pool.get().unwrap();
        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap();
        let tables: Vec<String> = stmt
            .query_map([], |r| r.get(0))
            .unwrap()
            .filter_map(Result::ok)
            .collect();

        for expected in [
            "customers", "filaments", "orders", "printers",
            "quote_items", "settings",
        ] {
            assert!(tables.contains(&expected.to_string()), "missing table: {expected}");
        }

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn migrations_are_idempotent() {
        let path = temp_db_path();
        let pool = init_pool(&path).unwrap();
        run_migrations(&pool).unwrap();
        run_migrations(&pool).unwrap();
    }

    #[test]
    fn orders_has_apply_vat_column() {
        let path = temp_db_path();
        let pool = init_pool(&path).unwrap();
        run_migrations(&pool).unwrap();

        let conn = pool.get().unwrap();
        let mut stmt = conn
            .prepare("PRAGMA table_info(orders)")
            .unwrap();
        let cols: Vec<String> = stmt
            .query_map([], |r| r.get::<_, String>(1))
            .unwrap()
            .filter_map(Result::ok)
            .collect();
        assert!(cols.iter().any(|c| c == "apply_vat"), "apply_vat column missing");
    }
}
