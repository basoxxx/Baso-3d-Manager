use crate::db::DbPool;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::stock_audit::{self, StockChangeReason};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Filament {
    pub id: String,
    pub brand: String,
    pub material: String,
    pub color: Option<String>,
    pub diameter: f64,
    pub density: Option<f64>,
    pub price_per_kg: f64,
    pub stock_grams: f64,
    pub low_stock_threshold: f64,
    pub created_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewFilament {
    pub brand: String,
    pub material: String,
    pub color: Option<String>,
    pub diameter: f64,
    pub density: Option<f64>,
    pub price_per_kg: f64,
    pub stock_grams: f64,
    pub low_stock_threshold: f64,
}

const MATERIALS: &[&str] = &["PLA", "PETG", "ABS", "TPU", "ASA", "NYLON", "PC", "OTHER"];

pub fn list(pool: &DbPool, material: Option<&str>) -> AppResult<Vec<Filament>> {
    let conn = pool.get()?;
    let mut sql = String::from(
        "SELECT id, brand, material, color, diameter, density, price_per_kg,
                stock_grams, low_stock_threshold, created_at, deleted_at
         FROM filaments WHERE deleted_at IS NULL",
    );
    if material.is_some() {
        sql.push_str(" AND material = ?1");
    }
    sql.push_str(" ORDER BY brand ASC, material ASC");

    let mut stmt = conn.prepare(&sql)?;
    let mapper = |row: &rusqlite::Row| -> rusqlite::Result<Filament> {
        Ok(Filament {
            id: row.get(0)?,
            brand: row.get(1)?,
            material: row.get(2)?,
            color: row.get(3)?,
            diameter: row.get(4)?,
            density: row.get(5)?,
            price_per_kg: row.get(6)?,
            stock_grams: row.get(7)?,
            low_stock_threshold: row.get(8)?,
            created_at: row.get(9)?,
            deleted_at: row.get(10)?,
        })
    };

    let rows = if let Some(m) = material {
        stmt.query_map([m], mapper)?.collect::<Result<Vec<_>, _>>()?
    } else {
        stmt.query_map([], mapper)?.collect::<Result<Vec<_>, _>>()?
    };
    Ok(rows)
}

pub fn get(pool: &DbPool, id: &str) -> AppResult<Filament> {
    let conn = pool.get()?;
    conn.query_row(
        "SELECT id, brand, material, color, diameter, density, price_per_kg,
                stock_grams, low_stock_threshold, created_at, deleted_at
         FROM filaments WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |r| {
            Ok(Filament {
                id: r.get(0)?,
                brand: r.get(1)?,
                material: r.get(2)?,
                color: r.get(3)?,
                diameter: r.get(4)?,
                density: r.get(5)?,
                price_per_kg: r.get(6)?,
                stock_grams: r.get(7)?,
                low_stock_threshold: r.get(8)?,
                created_at: r.get(9)?,
                deleted_at: r.get(10)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("filament {id}")),
        other => AppError::Db(other),
    })
}

pub fn create(pool: &DbPool, input: NewFilament) -> AppResult<Filament> {
    validate(&input)?;
    let id = Uuid::new_v4().to_string();
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO filaments
         (id, brand, material, color, diameter, density, price_per_kg, stock_grams, low_stock_threshold)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            input.brand.trim(),
            input.material,
            input.color,
            input.diameter,
            input.density,
            input.price_per_kg,
            input.stock_grams,
            input.low_stock_threshold,
        ],
    )?;
    get(pool, &id)
}

pub fn update(pool: &DbPool, id: &str, input: NewFilament) -> AppResult<Filament> {
    validate(&input)?;
    let conn = pool.get()?;
    let changes = conn.execute(
        "UPDATE filaments
         SET brand=?2, material=?3, color=?4, diameter=?5, density=?6,
             price_per_kg=?7, stock_grams=?8, low_stock_threshold=?9
         WHERE id=?1 AND deleted_at IS NULL",
        params![
            id,
            input.brand.trim(),
            input.material,
            input.color,
            input.diameter,
            input.density,
            input.price_per_kg,
            input.stock_grams,
            input.low_stock_threshold,
        ],
    )?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("filament {id}")));
    }
    get(pool, id)
}

/// Update stock and record an audit row. The caller owns the
/// transaction; this function does NOT commit. The audit row is
/// written in the same transaction so a failure leaves no half-state.
///
/// Returns the updated `stock_after` value so the caller can echo
/// it back (and so we don't have to re-SELECT just to know it).
pub fn adjust_stock_in_tx(
    conn: &rusqlite::Connection,
    id: &str,
    delta_grams: f64,
    reason: StockChangeReason,
    order_id: Option<&str>,
    user_note: Option<&str>,
) -> AppResult<Filament> {
    // Use a single statement: SQLite's `RETURNING` clause gives us
    // the new value atomically without a second SELECT.
    let mut stmt = conn.prepare(
        "UPDATE filaments
         SET stock_grams = MAX(0, stock_grams + ?2)
         WHERE id = ?1 AND deleted_at IS NULL
         RETURNING stock_grams",
    )?;
    let new_stock: Option<f64> = stmt
        .query_row(params![id, delta_grams], |row| row.get::<_, f64>(0))
        .optional()?;
    let stock_after = new_stock.ok_or_else(|| AppError::NotFound(format!("filament {id}")))?;
    // Append the audit row in the same tx.
    stock_audit::append_in_tx(
        conn,
        id,
        delta_grams,
        stock_after,
        reason,
        order_id,
        user_note,
    )?;
    // Re-read to get the full Filament row (with created_at etc.).
    let mut stmt = conn.prepare(
        "SELECT id, brand, material, color, diameter, density, price_per_kg,
                stock_grams, low_stock_threshold, created_at, deleted_at
         FROM filaments WHERE id = ?1",
    )?;
    let row = stmt
        .query_row(params![id], |r| {
            Ok(Filament {
                id: r.get(0)?,
                brand: r.get(1)?,
                material: r.get(2)?,
                color: r.get(3)?,
                diameter: r.get(4)?,
                density: r.get(5)?,
                price_per_kg: r.get(6)?,
                stock_grams: r.get(7)?,
                low_stock_threshold: r.get(8)?,
                created_at: r.get(9)?,
                deleted_at: r.get(10)?,
            })
        })
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("filament {id}")),
            other => AppError::Db(other),
        })?;
    Ok(row)
}

/// Public entry point used by the IPC command `adjust_filament_stock`.
/// The user clicks ±100g in the UI; this is a manual adjustment with
/// no order attached. Opens its own short transaction.
pub fn adjust_stock(pool: &DbPool, id: &str, delta_grams: f64) -> AppResult<Filament> {
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;
    let row = adjust_stock_in_tx(
        &tx,
        id,
        delta_grams,
        StockChangeReason::ManualAdjust,
        None,
        None,
    )?;
    tx.commit()?;
    Ok(row)
}

/// Internal helper kept for backward compatibility. New callers
    /// should use `adjust_stock_in_tx` inside their own transaction.
    #[allow(dead_code)]
    /// Internal helper used by `orders::set_status` when moving to
/// in_produzione (or reverting). The call site owns the transaction
/// so the per-item decrement and its audit row are atomic with the
/// order status update.
pub fn adjust_stock_internal(
    pool: &DbPool,
    id: &str,
    delta: f64,
) -> AppResult<Filament> {
    // Deprecated: prefer adjust_stock_in_tx inside the caller's tx.
    // Kept for backward compatibility with the old single-tx
    // code path; opens its own tx.
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;
    let row = adjust_stock_in_tx(
        &tx,
        id,
        delta,
        StockChangeReason::Correction,
        None,
        Some("legacy adjust_stock_internal call"),
    )?;
    tx.commit()?;
    Ok(row)
}

pub fn soft_delete(pool: &DbPool, id: &str) -> AppResult<()> {
    let conn = pool.get()?;
    let changes = conn.execute(
        "UPDATE filaments SET deleted_at = datetime('now') WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
    )?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("filament {id}")));
    }
    Ok(())
}

fn validate(f: &NewFilament) -> AppResult<()> {
    if f.brand.trim().is_empty() {
        return Err(AppError::Validation("brand is required".into()));
    }
    if !MATERIALS.contains(&f.material.as_str()) {
        return Err(AppError::Validation(format!("invalid material: {}", f.material)));
    }
    if f.diameter <= 0.0 || f.diameter > 10.0 {
        return Err(AppError::Validation("diameter must be 0 < x <= 10".into()));
    }
    if f.price_per_kg < 0.0 {
        return Err(AppError::Validation("price_per_kg cannot be negative".into()));
    }
    if f.stock_grams < 0.0 {
        return Err(AppError::Validation("stock_grams cannot be negative".into()));
    }
    if f.low_stock_threshold < 0.0 {
        return Err(AppError::Validation("low_stock_threshold cannot be negative".into()));
    }
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

    fn sample() -> NewFilament {
        NewFilament {
            brand: "Polymaker".into(),
            material: "PLA".into(),
            color: Some("Nero".into()),
            diameter: 1.75,
            density: Some(1.24),
            price_per_kg: 22.0,
            stock_grams: 1000.0,
            low_stock_threshold: 500.0,
        }
    }

    #[test]
    fn create_and_get() {
        let p = pool();
        let f = create(&p, sample()).unwrap();
        assert_eq!(f.brand, "Polymaker");
        assert_eq!(f.material, "PLA");
    }

    #[test]
    fn list_filter_by_material() {
        let p = pool();
        create(&p, sample()).unwrap();
        let mut other = sample();
        other.material = "PETG".into();
        create(&p, other).unwrap();

        let pla = list(&p, Some("PLA")).unwrap();
        assert_eq!(pla.len(), 1);
        let all = list(&p, None).unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn adjust_stock_adds_and_subtracts() {
        let p = pool();
        let f = create(&p, sample()).unwrap();
        let f2 = adjust_stock(&p, &f.id, -300.0).unwrap();
        assert_eq!(f2.stock_grams, 700.0);
        let f3 = adjust_stock(&p, &f.id, 200.0).unwrap();
        assert_eq!(f3.stock_grams, 900.0);
    }

    #[test]
    fn adjust_stock_clamps_to_zero() {
        let p = pool();
        let f = create(&p, sample()).unwrap();
        let f2 = adjust_stock(&p, &f.id, -5000.0).unwrap();
        assert_eq!(f2.stock_grams, 0.0);
    }

    #[test]
    fn soft_delete_works() {
        let p = pool();
        let f = create(&p, sample()).unwrap();
        soft_delete(&p, &f.id).unwrap();
        assert!(matches!(get(&p, &f.id), Err(AppError::NotFound(_))));
    }

    #[test]
    fn validate_rejects_invalid_material() {
        let mut s = sample();
        s.material = "WOOD".into();
        let p = pool();
        assert!(matches!(create(&p, s), Err(AppError::Validation(_))));
    }

    #[test]
    fn validate_rejects_negative_price() {
        let mut s = sample();
        s.price_per_kg = -1.0;
        let p = pool();
        assert!(matches!(create(&p, s), Err(AppError::Validation(_))));
    }
}
