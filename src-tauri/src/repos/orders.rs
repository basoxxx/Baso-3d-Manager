use crate::db::DbPool;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::quote_items::{self, NewQuoteItem, QuoteItem};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub customer_id: String,
    pub status: String,
    pub notes: Option<String>,
    pub margin_percent: f64,
    pub apply_vat: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NewOrder {
    pub customer_id: String,
    pub status: String,
    pub notes: Option<String>,
    pub margin_percent: f64,
    pub apply_vat: bool,
    pub quote_items: Vec<NewQuoteItem>,
}

const STATUSES: &[&str] = &["draft", "in_produzione", "completato", "consegnato", "annullato"];

pub fn list(
    pool: &DbPool,
    status: Option<&str>,
    customer_id: Option<&str>,
) -> AppResult<Vec<Order>> {
    let conn = pool.get()?;
    let mut sql = String::from(
        "SELECT id, customer_id, status, notes, margin_percent, apply_vat, created_at, updated_at, deleted_at
         FROM orders WHERE deleted_at IS NULL",
    );
    let mut binds: Vec<String> = Vec::new();
    if status.is_some() {
        binds.push(format!("status = ?{}", binds.len() + 1));
    }
    if customer_id.is_some() {
        binds.push(format!("customer_id = ?{}", binds.len() + 1));
    }
    if !binds.is_empty() {
        sql.push_str(" AND ");
        sql.push_str(&binds.join(" AND "));
    }
    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let mapper = |row: &rusqlite::Row| -> rusqlite::Result<Order> {
        Ok(Order {
            id: row.get(0)?,
            customer_id: row.get(1)?,
            status: row.get(2)?,
            notes: row.get(3)?,
            margin_percent: row.get(4)?,
            apply_vat: row.get::<_, i64>(5)? != 0,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            deleted_at: row.get(8)?,
        })
    };

    let params_iter: Vec<String> = [status.map(String::from), customer_id.map(String::from)]
        .into_iter()
        .flatten()
        .collect();
    let out: Vec<Order> = stmt
        .query_map(rusqlite::params_from_iter(params_iter.iter()), mapper)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(out)
}

pub fn get_with_items(pool: &DbPool, id: &str) -> AppResult<(Order, Vec<QuoteItem>)> {
    let conn = pool.get()?;
    let order = conn.query_row(
        "SELECT id, customer_id, status, notes, margin_percent, apply_vat, created_at, updated_at, deleted_at
         FROM orders WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |r| {
            Ok(Order {
                id: r.get(0)?,
                customer_id: r.get(1)?,
                status: r.get(2)?,
                notes: r.get(3)?,
                margin_percent: r.get(4)?,
                apply_vat: r.get::<_, i64>(5)? != 0,
                created_at: r.get(6)?,
                updated_at: r.get(7)?,
                deleted_at: r.get(8)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("order {id}")),
        other => AppError::Db(other),
    })?;
    let items = quote_items::list_for_order(pool, id)?;
    Ok((order, items))
}

pub fn create(pool: &DbPool, input: NewOrder) -> AppResult<(Order, Vec<QuoteItem>)> {
    validate(&input)?;
    let id = Uuid::new_v4().to_string();
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO orders (id, customer_id, status, notes, margin_percent, apply_vat)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            input.customer_id,
            input.status,
            input.notes,
            input.margin_percent,
            input.apply_vat as i64,
        ],
    )?;
    tx.commit()?;

    let items = quote_items::create_many(pool, &id, &input.quote_items)?;
    let order = get_with_items(pool, &id)?.0;
    Ok((order, items))
}

pub fn update(pool: &DbPool, id: &str, input: NewOrder) -> AppResult<(Order, Vec<QuoteItem>)> {
    validate(&input)?;
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;
    let changes = tx.execute(
        "UPDATE orders
         SET customer_id = ?2, status = ?3, notes = ?4, margin_percent = ?5, apply_vat = ?6,
             updated_at = datetime('now')
         WHERE id = ?1 AND deleted_at IS NULL",
        params![
            id,
            input.customer_id,
            input.status,
            input.notes,
            input.margin_percent,
            input.apply_vat as i64,
        ],
    )?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("order {id}")));
    }
    tx.commit()?;

    let _ = quote_items::replace_for_order(pool, id, &input.quote_items)?;
    let (order, items) = get_with_items(pool, id)?;
    Ok((order, items))
}

pub fn set_status(pool: &DbPool, id: &str, new_status: &str) -> AppResult<Order> {
    if !STATUSES.contains(&new_status) {
        return Err(AppError::Validation(format!("invalid status: {new_status}")));
    }
    let conn = pool.get()?;
    let (order, items) = get_with_items(pool, id)?;
    if order.status == "draft" && new_status == "in_produzione" {
        for item in items {
            // Skip items without a real filament assigned (None or empty string)
            let Some(fid) = item.filament_id.as_deref().filter(|s| !s.is_empty()) else {
                continue;
            };
            if item.material_grams > 0.0 && item.quantity > 0 {
                // Best-effort stock decrement. If the filament was soft-deleted
                // or the row vanished, log and continue — don't block the status
                // transition (a user can still want to mark an old order as
                // "in production" even if its filament is gone).
                if let Err(e) = super::filaments::adjust_stock_internal(
                    pool, fid, -item.material_grams * (item.quantity as f64),
                ) {
                    tracing::warn!(order_id = %id, filament_id = %fid, error = %e, "stock decrement skipped");
                }
            }
        }
    }
    let changes = conn.execute(
        "UPDATE orders SET status = ?2, updated_at = datetime('now')
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id, new_status],
    )?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("order {id}")));
    }
    let (order, _) = get_with_items(pool, id)?;
    Ok(order)
}

pub fn soft_delete(pool: &DbPool, id: &str) -> AppResult<()> {
    let conn = pool.get()?;
    let changes = conn.execute(
        "UPDATE orders SET deleted_at = datetime('now') WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
    )?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("order {id}")));
    }
    Ok(())
}

fn validate(o: &NewOrder) -> AppResult<()> {
    if o.customer_id.trim().is_empty() {
        return Err(AppError::Validation("customer_id is required".into()));
    }
    if !STATUSES.contains(&o.status.as_str()) {
        return Err(AppError::Validation(format!("invalid status: {}", o.status)));
    }
    if o.margin_percent < 0.0 {
        return Err(AppError::Validation("margin_percent cannot be negative".into()));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use crate::repos::customers;

    fn pool() -> DbPool {
        let mut p = std::env::temp_dir();
        p.push(format!("baso-test-{}.db", Uuid::new_v4()));
        let pool = db::init_pool(&p).unwrap();
        db::run_migrations(&pool).unwrap();
        pool
    }

    fn seed_customer(p: &DbPool) -> String {
        let c = customers::create(p, customers::NewCustomer {
            name: "Test".into(), email: "t@x.it".into(),
            phone: None, address: None, vat_number: None, notes: None,
        }).unwrap();
        c.id
    }

    fn seed_filament(p: &DbPool, stock: f64) -> String {
        let f = crate::repos::filaments::create(p, crate::repos::filaments::NewFilament {
            brand: "X".into(), material: "PLA".into(), color: None,
            diameter: 1.75, density: None, price_per_kg: 20.0,
            stock_grams: stock, low_stock_threshold: 100.0,
        }).unwrap();
        f.id
    }

    fn sample_order(customer_id: &str, items: Vec<NewQuoteItem>) -> NewOrder {
        NewOrder {
            customer_id: customer_id.to_string(),
            status: "draft".into(),
            notes: None,
            margin_percent: 40.0,
            apply_vat: true,
            quote_items: items,
        }
    }

    #[test]
    fn create_persists_apply_vat() {
        let p = pool();
        let cid = seed_customer(&p);
        let mut o = sample_order(&cid, vec![]);
        o.apply_vat = false;
        let (created, _) = create(&p, o).unwrap();
        assert!(!created.apply_vat);
        let fetched = get_with_items(&p, &created.id).unwrap().0;
        assert!(!fetched.apply_vat);
    }

    #[test]
    fn create_with_items() {
        let p = pool();
        let cid = seed_customer(&p);
        let items = vec![NewQuoteItem {
            description: "X".into(), quantity: 1, time_hours: 1.0,
            material_grams: 0.0, filament_id: None,
            post_processing_cost: 0.0,
        }];
        let (o, items_back) = create(&p, sample_order(&cid, items)).unwrap();
        assert_eq!(o.status, "draft");
        assert_eq!(items_back.len(), 1);
    }

    #[test]
    fn set_status_to_production_decrements_stock() {
        let p = pool();
        let cid = seed_customer(&p);
        let fid = seed_filament(&p, 1000.0);
        let items = vec![NewQuoteItem {
            description: "X".into(), quantity: 1, time_hours: 1.0,
            material_grams: 100.0, filament_id: Some(fid.clone()),
            post_processing_cost: 0.0,
        }];
        let (o, _) = create(&p, sample_order(&cid, items)).unwrap();
        set_status(&p, &o.id, "in_produzione").unwrap();
        let f = crate::repos::filaments::get(&p, &fid).unwrap();
        assert_eq!(f.stock_grams, 900.0);
    }

    #[test]
    fn set_status_rejects_invalid() {
        let p = pool();
        let cid = seed_customer(&p);
        let (o, _) = create(&p, sample_order(&cid, vec![])).unwrap();
        assert!(matches!(
            set_status(&p, &o.id, "BROKEN"),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn set_status_to_production_skips_missing_filament() {
        // Regression: a draft order referencing a soft-deleted filament must
        // still transition to in_produzione (best-effort stock decrement).
        let p = pool();
        let cid = seed_customer(&p);
        let fid = seed_filament(&p, 1000.0);
        let items = vec![NewQuoteItem {
            description: "X".into(), quantity: 1, time_hours: 1.0,
            material_grams: 100.0, filament_id: Some(fid.clone()),
            post_processing_cost: 0.0,
        }];
        let (o, _) = create(&p, sample_order(&cid, items)).unwrap();
        crate::repos::filaments::soft_delete(&p, &fid).unwrap();
        let updated = set_status(&p, &o.id, "in_produzione").unwrap();
        assert_eq!(updated.status, "in_produzione");
    }

    #[test]
    fn list_with_no_filters_returns_all() {
        let p = pool();
        let cid = seed_customer(&p);
        create(&p, sample_order(&cid, vec![])).unwrap();
        create(&p, sample_order(&cid, vec![])).unwrap();
        let all = list(&p, None, None).unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn list_with_status_filter() {
        let p = pool();
        let cid = seed_customer(&p);
        let (o, _) = create(&p, sample_order(&cid, vec![])).unwrap();
        create(&p, sample_order(&cid, vec![])).unwrap();
        let drafts = list(&p, Some("draft"), None).unwrap();
        assert_eq!(drafts.len(), 2);
        set_status(&p, &o.id, "in_produzione").unwrap();
        let drafts = list(&p, Some("draft"), None).unwrap();
        let in_prod = list(&p, Some("in_produzione"), None).unwrap();
        assert_eq!(drafts.len(), 1);
        assert_eq!(in_prod.len(), 1);
    }

    #[test]
    fn list_with_customer_id_filter() {
        let p = pool();
        let cid_a = seed_customer(&p);
        let cid_b = customers::create(&p, customers::NewCustomer {
            name: "Other".into(), email: "o@x.it".into(),
            phone: None, address: None, vat_number: None, notes: None,
        }).unwrap().id;
        create(&p, sample_order(&cid_a, vec![])).unwrap();
        create(&p, sample_order(&cid_b, vec![])).unwrap();
        let only_a = list(&p, None, Some(&cid_a)).unwrap();
        assert_eq!(only_a.len(), 1);
    }
}
