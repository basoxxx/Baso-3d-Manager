use crate::error::AppResult;
use crate::repos::stock_audit::{self, StockAuditEntry};
use crate::AppState;
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub fn list_stock_audit(
    state: State<'_, AppState>,
    filament_id: Option<String>,
    limit: Option<i64>,
) -> AppResult<Vec<StockAuditEntry>> {
    match filament_id {
        Some(fid) => stock_audit::list_for_filament(&state.pool, &fid, limit),
        None => stock_audit::list_recent(&state.pool, limit.unwrap_or(100)),
    }
}
