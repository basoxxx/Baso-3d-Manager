use crate::error::AppResult;
use crate::AppState;
use serde::Serialize;
use tauri::State;

/// Number of days after which an open order is considered "in ritardo".
/// Exposed as a constant so the frontend can render the same threshold
/// in the UI ("in ritardo > Ngg").
const OVERDUE_DAYS: i64 = 14;

#[derive(Serialize)]
pub struct DashboardData {
    pub kpis: Kpis,
    pub revenue_30d: Vec<DailyTotal>,
    pub upcoming: Vec<UpcomingOrder>,
    pub low_stock: Vec<LowStockFilament>,
    pub overdue: Vec<OverdueOrder>,
}

#[derive(Serialize)]
pub struct Kpis {
    pub open_orders: i64,
    pub month_revenue: f64,
    pub total_customers: i64,
    pub kg_consumed_month: f64,
    /// Number of filaments whose `stock_grams <= low_stock_threshold`.
    pub low_stock_filaments: i64,
    /// Number of open orders (draft / in_produzione / completato) that
    /// are older than `OVERDUE_DAYS` days.
    pub overdue_orders: i64,
}

#[derive(Serialize)]
pub struct DailyTotal {
    pub date: String,
    pub total: f64,
}

#[derive(Serialize)]
pub struct UpcomingOrder {
    pub id: String,
    pub customer_id: String,
    pub customer_name: String,
    pub status: String,
    pub created_at: String,
    pub total: f64,
}

#[derive(Serialize)]
pub struct LowStockFilament {
    pub id: String,
    pub brand: String,
    pub material: String,
    pub color: Option<String>,
    pub stock_grams: f64,
    pub low_stock_threshold: f64,
}

#[derive(Serialize)]
pub struct OverdueOrder {
    pub id: String,
    pub customer_id: String,
    pub customer_name: String,
    pub status: String,
    pub created_at: String,
    pub days_old: i64,
}

/// Pure dashboard builder. Exposed for unit tests; the Tauri command
/// below delegates to it.
pub fn compute_dashboard(conn: &rusqlite::Connection) -> AppResult<DashboardData> {
    // --- KPIs ---s -------------------------------------------------------------

    let open_orders: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders WHERE status IN ('draft','in_produzione') AND deleted_at IS NULL",
        [],
        |r| r.get(0),
    )?;

    let month_revenue: f64 = conn.query_row(
        "SELECT COALESCE(SUM(
                  (oi.time_hours * s.default_hourly_rate
                   + (oi.material_grams / 1000.0) * COALESCE(f.price_per_kg, 0)
                   + oi.post_processing_cost) * oi.quantity
                ), 0.0)
         FROM quote_items oi
         JOIN orders o ON o.id = oi.order_id
         CROSS JOIN settings s
         LEFT JOIN filaments f ON f.id = oi.filament_id
         WHERE o.deleted_at IS NULL
           AND date(o.created_at) >= date('now', '-30 days')",
        [],
        |r| r.get(0),
    )?;

    let total_customers: i64 = conn.query_row(
        "SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL",
        [],
        |r| r.get(0),
    )?;

    let kg_consumed_month: f64 = conn.query_row(
        "SELECT COALESCE(SUM(oi.material_grams * oi.quantity), 0.0) / 1000.0
         FROM quote_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.deleted_at IS NULL
           AND o.status IN ('in_produzione','completato','consegnato')
           AND date(o.created_at) >= date('now', '-30 days')",
        [],
        |r| r.get(0),
    )?;

    // Filaments whose stock has reached or fallen below their own
    // threshold. A filament with stock 0 and threshold 500 still shows
    // up here — the user clearly needs to know.
    let low_stock_filaments: i64 = conn.query_row(
        "SELECT COUNT(*) FROM filaments
         WHERE deleted_at IS NULL
           AND stock_grams <= low_stock_threshold",
        [],
        |r| r.get(0),
    )?;

    // Open orders (any non-terminal status) older than OVERDUE_DAYS days.
    // "consegnato" and "annullato" are terminal — excluded.
    let overdue_orders: i64 = conn.query_row(
        "SELECT COUNT(*) FROM orders
         WHERE deleted_at IS NULL
           AND status NOT IN ('consegnato','annullato')
           AND julianday('now') - julianday(created_at) > ?1",
        [OVERDUE_DAYS],
        |r| r.get(0),
    )?;

    // --- 30-day revenue chart --------------------------------------------

    let mut stmt = conn.prepare(
        "SELECT date(o.created_at) AS d,
                COALESCE(SUM(
                  (oi.time_hours * s.default_hourly_rate
                   + (oi.material_grams / 1000.0) * COALESCE(f.price_per_kg, 0)
                   + oi.post_processing_cost) * oi.quantity
                ), 0.0) AS total
         FROM orders o
         JOIN quote_items oi ON oi.order_id = o.id
         CROSS JOIN settings s
         LEFT JOIN filaments f ON f.id = oi.filament_id
         WHERE o.deleted_at IS NULL
           AND date(o.created_at) >= date('now', '-30 days')
         GROUP BY date(o.created_at)
         ORDER BY d ASC",
    )?;
    let revenue_30d: Vec<DailyTotal> = stmt
        .query_map([], |row| {
            Ok(DailyTotal {
                date: row.get::<_, String>(0)?,
                total: row.get::<_, f64>(1)?,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    // --- Upcoming orders (top 5) -----------------------------------------

    let mut stmt = conn.prepare(
        "SELECT o.id, o.customer_id, c.name, o.status, o.created_at,
                COALESCE(SUM(
                  (oi.time_hours * s.default_hourly_rate
                   + (oi.material_grams / 1000.0) * COALESCE(f.price_per_kg, 0)
                   + oi.post_processing_cost) * oi.quantity
                ), 0.0) AS total
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         LEFT JOIN quote_items oi ON oi.order_id = o.id
         CROSS JOIN settings s
         LEFT JOIN filaments f ON f.id = oi.filament_id
         WHERE o.deleted_at IS NULL
           AND o.status IN ('draft','in_produzione')
         GROUP BY o.id
         ORDER BY o.created_at DESC
         LIMIT 5",
    )?;
    let upcoming: Vec<UpcomingOrder> = stmt
        .query_map([], |row| {
            Ok(UpcomingOrder {
                id: row.get(0)?,
                customer_id: row.get(1)?,
                customer_name: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
                total: row.get::<_, f64>(5).unwrap_or(0.0),
            })
        })?
        .filter_map(Result::ok)
        .collect();

    // --- Low-stock filaments (up to 10) ----------------------------------

    let mut stmt = conn.prepare(
        "SELECT id, brand, material, color, stock_grams, low_stock_threshold
         FROM filaments
         WHERE deleted_at IS NULL
           AND stock_grams <= low_stock_threshold
         ORDER BY (stock_grams / NULLIF(low_stock_threshold, 0)) ASC,
                  brand ASC
         LIMIT 10",
    )?;
    let low_stock: Vec<LowStockFilament> = stmt
        .query_map([], |row| {
            Ok(LowStockFilament {
                id: row.get(0)?,
                brand: row.get(1)?,
                material: row.get(2)?,
                color: row.get(3)?,
                stock_grams: row.get::<_, f64>(4)?,
                low_stock_threshold: row.get::<_, f64>(5)?,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    // --- Overdue orders (top 10) ------------------------------------------

    let mut stmt = conn.prepare(
        "SELECT o.id, o.customer_id, c.name, o.status, o.created_at,
                CAST(julianday('now') - julianday(o.created_at) AS INTEGER) AS days_old
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         WHERE o.deleted_at IS NULL
           AND o.status NOT IN ('consegnato','annullato')
           AND julianday('now') - julianday(o.created_at) > ?1
         ORDER BY days_old DESC
         LIMIT 10",
    )?;
    let overdue: Vec<OverdueOrder> = stmt
        .query_map([OVERDUE_DAYS], |row| {
            Ok(OverdueOrder {
                id: row.get(0)?,
                customer_id: row.get(1)?,
                customer_name: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
                days_old: row.get(5)?,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    Ok(DashboardData {
        kpis: Kpis {
            open_orders,
            month_revenue,
            total_customers,
            kg_consumed_month,
            low_stock_filaments,
            overdue_orders,
        },
        revenue_30d,
        upcoming,
        low_stock,
        overdue,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_dashboard(state: State<'_, AppState>) -> AppResult<DashboardData> {
    let conn = state.pool.get()?;
    compute_dashboard(&conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use crate::repos::{customers, filaments, settings};

    fn pool() -> crate::db::DbPool {
        let mut p = std::env::temp_dir();
        p.push(format!("baso-dash-test-{}.db", uuid::Uuid::new_v4()));
        let pool = db::init_pool(&p).unwrap();
        db::run_migrations(&pool).unwrap();
        pool
    }

    fn seed_customer(p: &crate::db::DbPool) -> String {
        let c = customers::create(
            p,
            customers::NewCustomer {
                name: "Test".into(),
                email: "t@x.it".into(),
                phone: None,
                address: None,
                vat_number: None,
                notes: None,
            },
        )
        .unwrap();
        c.id
    }

    fn seed_filament(p: &crate::db::DbPool, brand: &str, stock: f64, threshold: f64) -> String {
        let f = filaments::create(
            p,
            filaments::NewFilament {
                brand: brand.into(),
                material: "PLA".into(),
                color: None,
                diameter: 1.75,
                density: None,
                price_per_kg: 20.0,
                stock_grams: stock,
                low_stock_threshold: threshold,
            },
        )
        .unwrap();
        f.id
    }

    /// Convenience: run compute_dashboard on the pool.
    fn dash(p: &crate::db::DbPool) -> DashboardData {
        let conn = p.get().unwrap();
        super::compute_dashboard(&conn).unwrap()
    }

    fn insert_order_with_created_at(p: &crate::db::DbPool, customer: &str, days_ago: i64) -> String {
        let oid = uuid::Uuid::new_v4().to_string();
        let conn = p.get().unwrap();
        conn.execute(
            "INSERT INTO orders (id, customer_id, status, margin_percent, apply_vat, created_at, updated_at)
             VALUES (?1, ?2, 'draft', 40, 1,
                     datetime('now', ?3),
                     datetime('now', ?3))",
            rusqlite::params![oid, customer, format!("-{} days", days_ago)],
        )
        .unwrap();
        oid
    }

    fn insert_filament_with_stock(p: &crate::db::DbPool, brand: &str, stock: f64, threshold: f64) {
        let fid = uuid::Uuid::new_v4().to_string();
        let conn = p.get().unwrap();
        conn.execute(
            "INSERT INTO filaments (id, brand, material, color, diameter, price_per_kg, stock_grams, low_stock_threshold)
             VALUES (?1, ?2, 'PLA', NULL, 1.75, 20, ?3, ?4)",
            rusqlite::params![fid, brand, stock, threshold],
        )
        .unwrap();
    }

    #[test]
    fn kpis_are_zero_on_empty_db() {
        let p = pool();
        let d = dash(&p);
        assert_eq!(d.kpis.open_orders, 0);
        assert_eq!(d.kpis.low_stock_filaments, 0);
        assert_eq!(d.kpis.overdue_orders, 0);
        assert!(d.low_stock.is_empty());
        assert!(d.overdue.is_empty());
        assert!(d.upcoming.is_empty());
    }

    #[test]
    fn low_stock_kpi_counts_filaments_at_or_below_threshold() {
        let p = pool();
        let _ = seed_filament(&p, "OK", 1000.0, 500.0);     // above
        let _ = seed_filament(&p, "Edge", 500.0, 500.0);    // at threshold
        let _ = seed_filament(&p, "Low", 100.0, 500.0);     // below
        let _ = seed_filament(&p, "Empty", 0.0, 500.0);     // empty
        // Add a soft-deleted one — must not be counted.
        let gone_id = seed_filament(&p, "Gone", 0.0, 100.0);
        filaments::soft_delete(&p, &gone_id).unwrap();

        let d = dash(&p);
        assert_eq!(d.kpis.low_stock_filaments, 3);
        assert_eq!(d.low_stock.len(), 3);
    }

    #[test]
    fn low_stock_list_is_sorted_by_severity() {
        let p = pool();
        // Insert in random order; the response should be sorted by
        // stock/threshold ratio ascending (most depleted first).
        insert_filament_with_stock(&p, "Half", 250.0, 500.0);
        insert_filament_with_stock(&p, "Empty", 0.0, 500.0);
        insert_filament_with_stock(&p, "Edge", 500.0, 500.0);

        let d = dash(&p);
        let brands: Vec<&str> = d.low_stock.iter().map(|f| f.brand.as_str()).collect();
        assert_eq!(brands, vec!["Empty", "Half", "Edge"]);
    }

    #[test]
    fn overdue_kpi_excludes_terminal_statuses() {
        let p = pool();
        let cid = seed_customer(&p);
        // 30 days old, draft -> overdue
        let _ = insert_order_with_created_at(&p, &cid, 30);
        // 30 days old, consegnato -> NOT overdue
        let oid2 = insert_order_with_created_at(&p, &cid, 30);
        p.get().unwrap().execute(
            "UPDATE orders SET status = 'consegnato' WHERE id = ?1",
            rusqlite::params![oid2],
        ).unwrap();
        // 30 days old, annullato -> NOT overdue
        let oid3 = insert_order_with_created_at(&p, &cid, 30);
        p.get().unwrap().execute(
            "UPDATE orders SET status = 'annullato' WHERE id = ?1",
            rusqlite::params![oid3],
        ).unwrap();
        // 3 days old, draft -> NOT overdue
        let _ = insert_order_with_created_at(&p, &cid, 3);

        let d = dash(&p);
        assert_eq!(d.kpis.overdue_orders, 1);
        assert_eq!(d.overdue.len(), 1);
    }

    #[test]
    fn overdue_list_carries_days_old() {
        let p = pool();
        let cid = seed_customer(&p);
        let _ = insert_order_with_created_at(&p, &cid, 21);
        let _ = insert_order_with_created_at(&p, &cid, 7); // too recent, excluded

        let d = dash(&p);
        assert_eq!(d.overdue.len(), 1);
        // Allow ±1 day for the exact timestamp the DB uses.
        let days = d.overdue[0].days_old;
        assert!(days >= OVERDUE_DAYS, "days_old should be >= {OVERDUE_DAYS}, got {days}");
    }

    #[test]
    fn upcoming_excludes_completed_and_annullato() {
        let p = pool();
        let cid = seed_customer(&p);
        // 3 orders in different statuses
        for (i, status) in ["draft", "in_produzione", "completato"].iter().enumerate() {
            let oid = uuid::Uuid::new_v4().to_string();
            p.get().unwrap().execute(
                "INSERT INTO orders (id, customer_id, status, margin_percent, apply_vat)
                 VALUES (?1, ?2, ?3, 40, 1)",
                rusqlite::params![oid, cid, status],
            ).unwrap();
            // ensure distinct created_at
            p.get().unwrap().execute(
                "UPDATE orders SET created_at = datetime('now', ?1) WHERE id = ?2",
                rusqlite::params![format!("-{} hours", i), oid],
            ).unwrap();
        }

        let d = dash(&p);
        // completato is NOT in the upcoming list (the original SQL only
        // includes draft / in_produzione). The 'open_orders' KPI also
        // excludes completato.
        assert_eq!(d.kpis.open_orders, 2);
        assert_eq!(d.upcoming.len(), 2);
    }

    #[test]
    fn low_stock_excludes_soft_deleted_filaments() {
        let p = pool();
        let fid = seed_filament(&p, "Soon", 100.0, 500.0);
        filaments::soft_delete(&p, &fid).unwrap();
        let d = dash(&p);
        assert_eq!(d.kpis.low_stock_filaments, 0);
        assert!(d.low_stock.is_empty());
    }

    #[test]
    fn settings_pool_is_read() {
        // Sanity: the dashboard command does not write to settings.
        let p = pool();
        let _ = settings::update(&p, settings::UpdateSettings {
            default_hourly_rate: 3.0,
            default_margin_percent: 40.0,
            currency: "EUR".into(),
            vat_rate: 22.0,
        }).unwrap();
        let d = dash(&p);
        // month_revenue is 0 with no orders, regardless of the rate.
        assert_eq!(d.kpis.month_revenue, 0.0);
    }
}
