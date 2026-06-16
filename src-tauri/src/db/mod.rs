use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::OpenFlags;

pub type DbPool = Pool<SqliteConnectionManager>;

/// Embedded migration files. The runner executes them in lexicographic order
/// and records the version (e.g. `"001_initial_schema"`) in the
/// `_migrations` table, so a migration runs exactly once per database.
pub mod migrations {
    pub const ENTRIES: &[(&str, &str)] = &[
        ("001_initial_schema", include_str!("migrations/001_initial_schema.sql")),
        ("002_orders_apply_vat", include_str!("migrations/002_orders_apply_vat.sql")),
        ("003_stock_audit_log", include_str!("migrations/003_stock_audit_log.sql")),
    ];
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
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
             version TEXT PRIMARY KEY,
             applied_at TEXT NOT NULL DEFAULT (datetime('now'))
         )",
    )?;

    let already_applied: std::collections::HashSet<String> = {
        let mut stmt = conn.prepare("SELECT version FROM _migrations")?;
        let rows = stmt
            .query_map([], |r| r.get::<_, String>(0))?
            .filter_map(Result::ok)
            .collect::<std::collections::HashSet<_>>();
        rows
    };

    // Pre-0.2.3 databases were created with the old single-script runner:
    // the tables exist but the `_migrations` table does not. Detect this by
    // looking for the `orders` table and skipping every already-applied
    // migration whose effects are already present in the schema.
    let has_legacy_schema = !already_applied.is_empty()
        || table_exists(&conn, "orders")
            && table_exists(&conn, "quote_items")
            && table_exists(&conn, "settings");

    for (version, sql) in migrations::ENTRIES {
        if already_applied.contains(*version) {
            continue;
        }
        // If the schema already reflects this migration (legacy DB), mark
        // it applied without re-running the script.
        if has_legacy_schema && version_already_present(&conn, *version) {
            record_migration(&conn, *version)?;
            continue;
        }
        conn.execute_batch(sql)?;
        record_migration(&conn, *version)?;
    }
    Ok(())
}

fn table_exists(conn: &rusqlite::Connection, name: &str) -> bool {
    conn.query_row(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?1",
        rusqlite::params![name],
        |_| Ok(()),
    )
    .is_ok()
}

fn record_migration(conn: &rusqlite::Connection, version: &str) -> Result<(), DbError> {
    conn.execute(
        "INSERT INTO _migrations (version) VALUES (?1)",
        rusqlite::params![version],
    )?;
    Ok(())
}

/// Heuristic: returns true if the schema already includes the effects of the
/// given migration, so we can mark it as applied on a legacy database.
fn version_already_present(conn: &rusqlite::Connection, version: &str) -> bool {
    match version {
        // v1 created the base tables.
        "001_initial_schema" => {
            table_exists(conn, "orders")
                && table_exists(conn, "quote_items")
                && table_exists(conn, "settings")
        }
        // v2 added the apply_vat column on orders.
        "002_orders_apply_vat" => column_exists(conn, "orders", "apply_vat"),
        _ => false,
    }
}

fn column_exists(conn: &rusqlite::Connection, table: &str, column: &str) -> bool {
    let sql = format!("PRAGMA table_info({})", table);
    let Ok(mut stmt) = conn.prepare(&sql) else { return false };
    stmt.query_map([], |r| r.get::<_, String>(1))
        .map(|rows| rows.filter_map(Result::ok).any(|c| c == column))
        .unwrap_or(false)
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

    /// Fresh database: every embedded migration should be recorded.
    #[test]
    fn fresh_db_records_all_migrations() {
        let path = temp_db_path();
        let pool = init_pool(&path).unwrap();
        run_migrations(&pool).unwrap();

        let conn = pool.get().unwrap();
        let mut stmt = conn.prepare("SELECT version FROM _migrations ORDER BY version").unwrap();
        let applied: Vec<String> = stmt
            .query_map([], |r| r.get::<_, String>(0))
            .unwrap()
            .filter_map(Result::ok)
            .collect();
        assert_eq!(
            applied,
            vec![
                "001_initial_schema".to_string(),
                "002_orders_apply_vat".to_string(),
                "003_stock_audit_log".to_string(),
            ]
        );
        let _ = std::fs::remove_file(&path);
    }

    /// Existing v0.2.x databases were created by the old single-script
    /// runner: the tables exist but the `_migrations` table does not. The
    /// new runner must detect this and mark v1+v2 as already applied
    /// instead of failing on duplicate columns.
    #[test]
    fn upgrade_from_legacy_db_marks_versions_applied() {
        let path = temp_db_path();
        {
            // Manually create a legacy v0.2.x database: every table from v1
            // and the apply_vat column from v2, but no _migrations table.
            let conn = rusqlite::Connection::open(&path).unwrap();
            conn.execute_batch(include_str!("migrations/001_initial_schema.sql")).unwrap();
            conn.execute_batch("ALTER TABLE orders ADD COLUMN apply_vat INTEGER NOT NULL DEFAULT 1").unwrap();
        }
        let pool = init_pool(&path).unwrap();
        // Must not error.
        run_migrations(&pool).unwrap();

        // The runner must have detected the existing schema and recorded
        // both versions as applied without trying to re-apply them.
        let conn = pool.get().unwrap();
        let mut stmt = conn.prepare("SELECT version FROM _migrations ORDER BY version").unwrap();
        let applied: Vec<String> = stmt
            .query_map([], |r| r.get::<_, String>(0))
            .unwrap()
            .filter_map(Result::ok)
            .collect();
        assert_eq!(
            applied,
            vec![
                "001_initial_schema".to_string(),
                "002_orders_apply_vat".to_string(),
                "003_stock_audit_log".to_string(),
            ]
        );

        // The legacy v2 ALTER must not have been re-run.
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM _migrations WHERE version = '002_orders_apply_vat'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1, "002 must be recorded exactly once");

        let _ = std::fs::remove_file(&path);
    }
}
