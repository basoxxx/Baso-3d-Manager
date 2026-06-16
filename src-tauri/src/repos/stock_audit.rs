//! Stock audit log. Every change to a filament's stock_grams writes
//! a row here so the user can see "where did my 200g of PLA go?".
//!
//! The Rust side treats this as an append-only log. The frontend can
//! query the log per filament (or globally, in the future) to
//! display a timeline.

use crate::db::DbPool;
use crate::error::AppResult;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Stable enum for the kind of change. The DB column has a CHECK
/// constraint; this enum maps 1:1.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StockChangeReason {
    /// User clicked ±100g on the FilamentsPage row.
    ManualAdjust,
    /// Order moved to in_produzione; stock was decremented for the
    /// quote items.
    OrderProduction,
    /// Order moved back from in_produzione; stock was restored.
    OrderRevert,
    /// User bought new filament and is restocking.
    Restock,
    /// Inventory correction after a count or a physical adjustment.
    Correction,
}

impl StockChangeReason {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ManualAdjust => "manual_adjust",
            Self::OrderProduction => "order_production",
            Self::OrderRevert => "order_revert",
            Self::Restock => "restock",
            Self::Correction => "correction",
        }
    }

    /// Human-readable label for the UI.
    #[allow(dead_code)]
    pub fn label(&self) -> &'static str {
        match self {
            Self::ManualAdjust => "Aggiustamento manuale",
            Self::OrderProduction => "Ordine in produzione",
            Self::OrderRevert => "Ordine annullato",
            Self::Restock => "Rifornimento",
            Self::Correction => "Rettifica inventario",
        }
    }

    /// Stable icon name (lucide) for the UI.
    #[allow(dead_code)]
    pub fn icon(&self) -> &'static str {
        match self {
            Self::ManualAdjust => "sliders-horizontal",
            Self::OrderProduction => "hammer",
            Self::OrderRevert => "undo-2",
            Self::Restock => "package-plus",
            Self::Correction => "check-circle",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockAuditEntry {
    pub id: String,
    pub filament_id: String,
    pub delta_grams: f64,
    pub stock_after: f64,
    pub reason: String, // StockChangeReason::as_str
    pub order_id: Option<String>,
    pub user_note: Option<String>,
    pub created_at: String,
}

/// Append a new audit entry. The caller has already updated
/// `filaments.stock_grams`; we just record what changed. We pass
/// the connection (or transaction) so the call site can include
/// this in an existing atomic block.
pub fn append_in_tx(
    conn: &rusqlite::Connection,
    filament_id: &str,
    delta_grams: f64,
    stock_after: f64,
    reason: StockChangeReason,
    order_id: Option<&str>,
    user_note: Option<&str>,
) -> AppResult<StockAuditEntry> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO stock_audit_log
           (id, filament_id, delta_grams, stock_after, reason, order_id, user_note)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            filament_id,
            delta_grams,
            stock_after,
            reason.as_str(),
            order_id,
            user_note,
        ],
    )?;
    // The created_at defaults to datetime('now'). We can't read it
    // back portably without a second query, so re-SELECT to populate
    // the returned struct. SQLite's CURRENT_TIMESTAMP is also fine
    // for a stable ISO-like value.
    let mut stmt = conn.prepare(
        "SELECT id, filament_id, delta_grams, stock_after, reason, order_id, user_note, created_at
         FROM stock_audit_log WHERE id = ?1",
    )?;
    let entry = stmt.query_row(params![id], |row| {
        Ok(StockAuditEntry {
            id: row.get(0)?,
            filament_id: row.get(1)?,
            delta_grams: row.get(2)?,
            stock_after: row.get(3)?,
            reason: row.get(4)?,
            order_id: row.get(5)?,
            user_note: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;
    Ok(entry)
}

/// List the audit log for one filament, newest first. Optional
/// `limit` to paginate.
pub fn list_for_filament(
    pool: &DbPool,
    filament_id: &str,
    limit: Option<i64>,
) -> AppResult<Vec<StockAuditEntry>> {
    let conn = pool.get()?;
    let lim = limit.unwrap_or(100).clamp(1, 500);
    let mut stmt = conn.prepare(
        // ROWID is monotonically increasing per insert, so even two
        // rows in the same second sort deterministically by RECENCY
        // (most recent insert first). created_at alone is ambiguous
        // because SQLite's default CURRENT_TIMESTAMP has second
        // precision. UUIDs are random so id DESC is unreliable.
        "SELECT id, filament_id, delta_grams, stock_after, reason, order_id, user_note, created_at
         FROM stock_audit_log
         WHERE filament_id = ?1
         ORDER BY ROWID DESC
         LIMIT ?2",
    )?;
    let rows = stmt
        .query_map(params![filament_id, lim], |row| {
            Ok(StockAuditEntry {
                id: row.get(0)?,
                filament_id: row.get(1)?,
                delta_grams: row.get(2)?,
                stock_after: row.get(3)?,
                reason: row.get(4)?,
                order_id: row.get(5)?,
                user_note: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Recent entries across all filaments, newest first. Used for the
/// global "stock activity" feed (future dashboard panel).
pub fn list_recent(pool: &DbPool, limit: i64) -> AppResult<Vec<StockAuditEntry>> {
    let conn = pool.get()?;
    let lim = limit.clamp(1, 500);
    let mut stmt = conn.prepare(
        "SELECT id, filament_id, delta_grams, stock_after, reason, order_id, user_note, created_at
         FROM stock_audit_log
         ORDER BY ROWID DESC
         LIMIT ?1",
    )?;
    let rows = stmt
        .query_map(params![lim], |row| {
            Ok(StockAuditEntry {
                id: row.get(0)?,
                filament_id: row.get(1)?,
                delta_grams: row.get(2)?,
                stock_after: row.get(3)?,
                reason: row.get(4)?,
                order_id: row.get(5)?,
                user_note: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use crate::repos::filaments;

    fn pool() -> DbPool {
        let mut p = std::env::temp_dir();
        p.push(format!("baso-audit-test-{}.db", Uuid::new_v4()));
        let pool = db::init_pool(&p).unwrap();
        db::run_migrations(&pool).unwrap();
        pool
    }

    fn seed(p: &DbPool, stock: f64) -> String {
        filaments::create(
            p,
            filaments::NewFilament {
                brand: "X".into(),
                material: "PLA".into(),
                color: None,
                diameter: 1.75,
                density: None,
                price_per_kg: 20.0,
                stock_grams: stock,
                low_stock_threshold: 100.0,
            },
        )
        .unwrap()
        .id
    }

    #[test]
    fn append_and_read_back() {
        let p = pool();
        let fid = seed(&p, 1000.0);
        let conn = p.get().unwrap();
        let entry = append_in_tx(
            &conn,
            &fid,
            -100.0,
            900.0,
            StockChangeReason::ManualAdjust,
            None,
            Some("lost a spool"),
        )
        .unwrap();
        assert_eq!(entry.filament_id, fid);
        assert_eq!(entry.delta_grams, -100.0);
        assert_eq!(entry.stock_after, 900.0);
        assert_eq!(entry.reason, "manual_adjust");
        assert_eq!(entry.user_note.as_deref(), Some("lost a spool"));
        assert!(entry.created_at.len() > 0);
    }

    #[test]
    fn list_for_filament_orders_newest_first() {
        let p = pool();
        let fid = seed(&p, 1000.0);
        let conn = p.get().unwrap();
        // Two changes: -100 then -50. Newest first means -50 at the top.
        append_in_tx(&conn, &fid, -100.0, 900.0, StockChangeReason::ManualAdjust, None, None).unwrap();
        append_in_tx(&conn, &fid, -50.0, 850.0, StockChangeReason::OrderProduction, None, None).unwrap();
        let list = list_for_filament(&p, &fid, None).unwrap();
        assert_eq!(list.len(), 2);
        // Reason is stored as the string; the -50 was order_production.
        assert_eq!(list[0].reason, "order_production");
        assert_eq!(list[1].reason, "manual_adjust");
    }

    #[test]
    fn list_for_filament_respects_limit() {
        let p = pool();
        let fid = seed(&p, 1000.0);
        let conn = p.get().unwrap();
        for _ in 0..5 {
            append_in_tx(&conn, &fid, -1.0, 999.0, StockChangeReason::Correction, None, None).unwrap();
        }
        let list = list_for_filament(&p, &fid, Some(3)).unwrap();
        assert_eq!(list.len(), 3);
    }

    #[test]
    fn list_recent_returns_all_filaments() {
        let p = pool();
        let f1 = seed(&p, 1000.0);
        let f2 = seed(&p, 2000.0);
        let conn = p.get().unwrap();
        append_in_tx(&conn, &f1, -10.0, 990.0, StockChangeReason::ManualAdjust, None, None).unwrap();
        append_in_tx(&conn, &f2, -20.0, 1980.0, StockChangeReason::Restock, None, None).unwrap();
        let list = list_recent(&p, 10).unwrap();
        assert_eq!(list.len(), 2);
    }

    #[test]
    fn reason_strings_are_stable() {
        // The DB CHECK constraint depends on these strings. If they
        // change, the constraint must change too.
        assert_eq!(StockChangeReason::ManualAdjust.as_str(), "manual_adjust");
        assert_eq!(StockChangeReason::OrderProduction.as_str(), "order_production");
        assert_eq!(StockChangeReason::OrderRevert.as_str(), "order_revert");
        assert_eq!(StockChangeReason::Restock.as_str(), "restock");
        assert_eq!(StockChangeReason::Correction.as_str(), "correction");
    }

    #[test]
    fn rejects_unknown_reason_at_db_level() {
        let p = pool();
        let fid = seed(&p, 1000.0);
        let conn = p.get().unwrap();
        let id = Uuid::new_v4().to_string();
        let r = conn.execute(
            "INSERT INTO stock_audit_log
               (id, filament_id, delta_grams, stock_after, reason)
             VALUES (?1, ?2, 0, 1000, 'unknown_thing')",
            rusqlite::params![id, fid],
        );
        assert!(r.is_err(), "CHECK constraint should reject unknown reason");
    }
}
