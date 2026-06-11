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
    conn.execute_batch(schema::SQL)?;
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
}
