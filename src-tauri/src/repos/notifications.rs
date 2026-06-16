//! Notification repository. Persists notifications in the SQLite DB
//! (see migration 004). The frontend reads/writes via IPC.

use crate::db::DbPool;
use crate::error::AppResult;
use chrono::{DateTime, Utc};
use rusqlite::params;
use serde_json::Value as JsonValue;
use uuid::Uuid;

use super::super::commands::notifications::Notification;

pub fn list(pool: &DbPool, unread_only: bool, limit: Option<i64>) -> AppResult<Vec<Notification>> {
    let conn = pool.get()?;
    let lim = limit.unwrap_or(100).clamp(1, 500);
    let sql = if unread_only {
        "SELECT id, kind, title, body, data, read, created_at
         FROM notifications
         WHERE read = 0
         ORDER BY created_at DESC, ROWID DESC
         LIMIT ?1"
    } else {
        "SELECT id, kind, title, body, data, read, created_at
         FROM notifications
         ORDER BY created_at DESC, ROWID DESC
         LIMIT ?1"
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt
        .query_map(params![lim], |row| {
            let data_str: Option<String> = row.get(4)?;
            let data = data_str
                .as_deref()
                .and_then(|s| serde_json::from_str::<JsonValue>(s).ok());
            Ok(Notification {
                id: row.get(0)?,
                kind: row.get(1)?,
                title: row.get(2)?,
                body: row.get(3)?,
                data,
                read: row.get::<_, i64>(5)? != 0,
                created_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn insert(
    pool: &DbPool,
    kind: &str,
    title: &str,
    body: &str,
    data: Option<&str>,
    now: DateTime<Utc>,
) -> AppResult<Notification> {
    let id = Uuid::new_v4().to_string();
    // Store ISO8601 in UTC; the dashboard's date-fns will render it
    // in the user's local timezone.
    let created_at = now.to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO notifications (id, kind, title, body, data, read, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
        params![id, kind, title, body, data, created_at],
    )?;
    // Re-read so the caller gets a fully-populated struct including
    // the read flag.
    let mut stmt = conn.prepare(
        "SELECT id, kind, title, body, data, read, created_at
         FROM notifications WHERE id = ?1",
    )?;
    let n = stmt.query_row(params![id], |row| {
        let data_str: Option<String> = row.get(4)?;
        let data = data_str
            .as_deref()
            .and_then(|s| serde_json::from_str::<JsonValue>(s).ok());
        Ok(Notification {
            id: row.get(0)?,
            kind: row.get(1)?,
            title: row.get(2)?,
            body: row.get(3)?,
            data,
            read: row.get::<_, i64>(5)? != 0,
            created_at: row.get(6)?,
        })
    })?;
    Ok(n)
}

pub fn mark_read(pool: &DbPool, id: &str) -> AppResult<()> {
    let conn = pool.get()?;
    let changes = conn.execute(
        "UPDATE notifications SET read = 1 WHERE id = ?1",
        params![id],
    )?;
    if changes == 0 {
        return Err(crate::error::AppError::NotFound(format!(
            "notification {id}"
        )));
    }
    Ok(())
}

pub fn mark_all_read(pool: &DbPool) -> AppResult<()> {
    let conn = pool.get()?;
    conn.execute("UPDATE notifications SET read = 1 WHERE read = 0", [])?;
    Ok(())
}

pub fn delete(pool: &DbPool, id: &str) -> AppResult<()> {
    let conn = pool.get()?;
    conn.execute("DELETE FROM notifications WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn unread_count(pool: &DbPool) -> AppResult<i64> {
    let conn = pool.get()?;
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM notifications WHERE read = 0",
        [],
        |r| r.get(0),
    )?;
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pool() -> DbPool {
        let mut p = std::env::temp_dir();
        p.push(format!("baso-notif-test-{}.db", Uuid::new_v4()));
        let pool = crate::db::init_pool(&p).unwrap();
        crate::db::run_migrations(&pool).unwrap();
        pool
    }

    #[test]
    fn push_and_list() {
        let p = pool();
        let n = insert(
            &p,
            "low_stock",
            "Filamento in esaurimento",
            "Prusament PLA: 50 g rimasti",
            Some(r#"{"filament_id":"f-1"}"#),
            Utc::now(),
        )
        .unwrap();
        assert_eq!(n.kind, "low_stock");
        assert!(!n.read);
        let list = list(&p, false, None).unwrap();
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn unread_only_filters_read() {
        let p = pool();
        let a = insert(&p, "error", "t1", "b1", None, Utc::now()).unwrap();
        let _b = insert(&p, "error", "t2", "b2", None, Utc::now()).unwrap();
        mark_read(&p, &a.id).unwrap();
        let unread = list(&p, true, None).unwrap();
        assert_eq!(unread.len(), 1);
        assert_eq!(unread[0].title, "t2");
        let all = list(&p, false, None).unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn mark_all_read_zeroes_unread_count() {
        let p = pool();
        insert(&p, "error", "t1", "b1", None, Utc::now()).unwrap();
        insert(&p, "error", "t2", "b2", None, Utc::now()).unwrap();
        assert_eq!(unread_count(&p).unwrap(), 2);
        mark_all_read(&p).unwrap();
        assert_eq!(unread_count(&p).unwrap(), 0);
    }

    #[test]
    fn delete_removes_a_row() {
        let p = pool();
        let n = insert(&p, "error", "t1", "b1", None, Utc::now()).unwrap();
        assert_eq!(list(&p, false, None).unwrap().len(), 1);
        delete(&p, &n.id).unwrap();
        assert_eq!(list(&p, false, None).unwrap().len(), 0);
    }

    #[test]
    fn rejects_unknown_kind_at_db_level() {
        let p = pool();
        let id = Uuid::new_v4().to_string();
        let conn = p.get().unwrap();
        let r = conn.execute(
            "INSERT INTO notifications (id, kind, title, body) VALUES (?1, 'mystery', 't', 'b')",
            params![id],
        );
        assert!(r.is_err(), "CHECK should reject");
    }

    #[test]
    fn list_orders_newest_first() {
        let p = pool();
        // Two inserts in the same second — sort by ROWID DESC.
        let a = insert(&p, "error", "first", "b", None, Utc::now()).unwrap();
        let b = insert(&p, "error", "second", "b", None, Utc::now()).unwrap();
        let list = list(&p, false, None).unwrap();
        assert_eq!(list[0].id, b.id);
        assert_eq!(list[1].id, a.id);
    }
}
