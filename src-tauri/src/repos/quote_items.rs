use crate::db::DbPool;
use crate::error::AppResult;
use rusqlite::params;
use serde::{Deserialize, Serialize};
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
    pub sort_order: i64,
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

pub fn create_many(pool: &DbPool, order_id: &str, items: &[NewQuoteItem]) -> AppResult<Vec<QuoteItem>> {
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;
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
    tx.commit()?;
    Ok(created)
}

pub fn replace_for_order(
    pool: &DbPool,
    order_id: &str,
    items: &[NewQuoteItem],
) -> AppResult<Vec<QuoteItem>> {
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM quote_items WHERE order_id = ?1", params![order_id])?;
    tx.commit()?;
    create_many(pool, order_id, items)
}

pub fn delete_for_order(pool: &DbPool, order_id: &str) -> AppResult<()> {
    let conn = pool.get()?;
    conn.execute("DELETE FROM quote_items WHERE order_id = ?1", params![order_id])?;
    Ok(())
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
            sort_order: 0,
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
}
