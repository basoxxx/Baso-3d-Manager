use crate::error::AppResult;
use crate::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct DashboardData {
    pub kpis: Kpis,
    pub revenue_30d: Vec<DailyTotal>,
    pub upcoming: Vec<UpcomingOrder>,
}

#[derive(Serialize)]
pub struct Kpis {
    pub open_orders: i64,
    pub month_revenue: f64,
    pub total_customers: i64,
    pub kg_consumed_month: f64,
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

#[tauri::command(rename_all = "snake_case")]
pub fn get_dashboard(state: State<'_, AppState>) -> AppResult<DashboardData> {
    let conn = state.pool.get()?;

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
    let revenue_30d: Vec<DailyTotal> = stmt.query_map([], |row| {
        Ok(DailyTotal {
            date: row.get::<_, String>(0)?,
            total: row.get::<_, f64>(1)?,
        })
    })?
    .filter_map(Result::ok)
    .collect();

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
    let upcoming: Vec<UpcomingOrder> = stmt.query_map([], |row| {
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

    Ok(DashboardData {
        kpis: Kpis { open_orders, month_revenue, total_customers, kg_consumed_month },
        revenue_30d,
        upcoming,
    })
}
