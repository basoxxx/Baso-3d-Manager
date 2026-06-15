use crate::db::DbPool;
use crate::error::AppResult;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use rusqlite::Transaction;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuoteItem {
    pub id: String,
    pub order_id: String,
    pub description: String,
    pub quantity: i64,
    pub time_hours: f64,
    pub material_grams: f64,
    pub filament_id: Option<String>,
    pub post_processing_cost: f64,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewQuoteItem {
    pub description: String,
    pub quantity: i64,
    pub time_hours: f64,
    pub material_grams: f64,
    pub filament_id: Option<String>,
    pub post_processing_cost: f64,
}

pub fn list_for_order(pool: &DbPool, order_id: &str) -> AppResult<Vec<QuoteItem>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, order_id, description, quantity, time_hours, material_grams,
                filament_id, post_processing_cost, sort_order, created_at
         FROM quote_items WHERE order_id = ?1
         ORDER BY sort_order ASC, created_at ASC",
    )?;
    let rows = stmt.query_map(params![order_id], |row| {
        Ok(QuoteItem {
            id: row.get(0)?,
            order_id: row.get(1)?,
            description: row.get(2)?,
            quantity: row.get(3)?,
            time_hours: row.get(4)?,
            material_grams: row.get(5)?,
            filament_id: row.get(6)?,
            post_processing_cost: row.get(7)?,
            sort_order: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?
    .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Insert many quote items inside an existing transaction. The caller is
/// responsible for committing or rolling back.
pub fn create_many_in_tx(
    tx: &Transaction<'_>,
    order_id: &str,
    items: &[NewQuoteItem],
) -> AppResult<Vec<QuoteItem>> {
    let mut created = Vec::with_capacity(items.len());
    for (idx, item) in items.iter().enumerate() {
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO quote_items
             (id, order_id, description, quantity, time_hours, material_grams,
              filament_id, post_processing_cost, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                id,
                order_id,
                item.description,
                item.quantity,
                item.time_hours,
                item.material_grams,
                item.filament_id,
                item.post_processing_cost,
                idx as i64,
            ],
        )?;
        created.push(QuoteItem {
            id,
            order_id: order_id.to_string(),
            description: item.description.clone(),
            quantity: item.quantity,
            time_hours: item.time_hours,
            material_grams: item.material_grams,
            filament_id: item.filament_id.clone(),
            post_processing_cost: item.post_processing_cost,
            sort_order: idx as i64,
            created_at: chrono::Utc::now().to_rfc3339(),
        });
    }
    Ok(created)
}

/// Convenience wrapper for callers that don't already own a transaction.
/// Opens its own short transaction and commits on success.
#[allow(dead_code)]
pub fn create_many(pool: &DbPool, order_id: &str, items: &[NewQuoteItem]) -> AppResult<Vec<QuoteItem>> {
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;
    let created = create_many_in_tx(&tx, order_id, items)?;
    tx.commit()?;
    Ok(created)
}

/// Delete all quote items for an order and re-insert the supplied list, in a
/// single transaction. If the insert fails, the deletion is rolled back so
/// the order keeps its previous items untouched.
#[allow(dead_code)]
pub fn replace_for_order(
    pool: &DbPool,
    order_id: &str,
    items: &[NewQuoteItem],
) -> AppResult<Vec<QuoteItem>> {
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM quote_items WHERE order_id = ?1", params![order_id])?;
    let created = create_many_in_tx(&tx, order_id, items)?;
    tx.commit()?;
    Ok(created)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn pool() -> DbPool {
        let mut p = std::env::temp_dir();
        p.push(format!("baso-test-{}.db", Uuid::new_v4()));
        let pool = db::init_pool(&p).unwrap();
        db::run_migrations(&pool).unwrap();
        pool
    }

    fn sample_item() -> NewQuoteItem {
        NewQuoteItem {
            description: "Supporto".into(),
            quantity: 2,
            time_hours: 1.5,
            material_grams: 50.0,
            filament_id: None,
            post_processing_cost: 0.0,
        }
    }

    fn seed_order(pool: &DbPool, order_id: &str) {
        let conn = pool.get().unwrap();
        let customer_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO customers (id, name, email) VALUES (?1, ?2, ?3)",
            params![customer_id, "Test Customer", "test@example.com"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO orders (id, customer_id) VALUES (?1, ?2)",
            params![order_id, customer_id],
        )
        .unwrap();
    }

    #[test]
    fn create_many_inserts_with_sort_order() {
        let p = pool();
        seed_order(&p, "ord-1");
        let items = create_many(&p, "ord-1", &[sample_item(), sample_item()]).unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].sort_order, 0);
        assert_eq!(items[1].sort_order, 1);
    }

    #[test]
    fn replace_for_order_deletes_then_creates() {
        let p = pool();
        seed_order(&p, "ord-1");
        create_many(&p, "ord-1", &[sample_item()]).unwrap();
        let new = vec![sample_item(), sample_item(), sample_item()];
        let created = replace_for_order(&p, "ord-1", &new).unwrap();
        assert_eq!(created.len(), 3);
        let all = list_for_order(&p, "ord-1").unwrap();
        assert_eq!(all.len(), 3);
    }

    /// Simulate a failing insert: when something in the middle of the items
    /// list violates a NOT NULL constraint, the surrounding transaction must
    /// roll back, leaving the order's previous items untouched.
    #[test]
    fn replace_for_order_rolls_back_on_failure() {
        let p = pool();
        seed_order(&p, "ord-1");
        create_many(&p, "ord-1", &[sample_item()]).unwrap();
        let before = list_for_order(&p, "ord-1").unwrap();
        assert_eq!(before.len(), 1);

        // Force a failure: an invalid filament_id (foreign key to a row that
        // does not exist) should be rejected, rolling back the delete.
        let bogus = vec![NewQuoteItem {
            description: "will fail".into(),
            quantity: 1,
            time_hours: 0.0,
            material_grams: 0.0,
            filament_id: Some("00000000-0000-0000-0000-000000000000".into()),
            post_processing_cost: 0.0,
        }];
        let r = replace_for_order(&p, "ord-1", &bogus);
        assert!(r.is_err(), "expected FK violation");

        // The original item must still be there: rollback worked.
        let after = list_for_order(&p, "ord-1").unwrap();
        assert_eq!(after.len(), 1, "previous items lost on rollback");
        assert_eq!(after[0].description, before[0].description);
    }

    /// `create_many_in_tx` participates in a caller-owned transaction. If the
    /// caller aborts, nothing is persisted.
    #[test]
    fn create_many_in_tx_rolls_back_when_caller_drops() {
        let p = pool();
        seed_order(&p, "ord-2");
        {
            let mut conn = p.get().unwrap();
            let tx = conn.transaction().unwrap();
            create_many_in_tx(&tx, "ord-2", &[sample_item()]).unwrap();
            // tx is dropped here without commit
        }
        let items = list_for_order(&p, "ord-2").unwrap();
        assert!(items.is_empty(), "uncommitted tx must not be visible");
    }
}
