use crate::error::{AppError, AppResult};
use crate::AppState;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

#[tauri::command(rename_all = "snake_case")]
pub async fn export_csv(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    domain: String,
) -> AppResult<String> {
    let (file_name, filter) = match domain.as_str() {
        "orders" => (format!("baso-orders-{}.csv", chrono::Local::now().format("%Y-%m-%d")), "*.csv"),
        "filaments" => (format!("baso-filaments-{}.csv", chrono::Local::now().format("%Y-%m-%d")), "*.csv"),
        other => return Err(AppError::Validation(format!("unknown domain: {other}"))),
    };

    let path = app
        .dialog()
        .file()
        .add_filter("CSV", &[filter])
        .set_file_name(&file_name)
        .blocking_save_file();

    let path = match path {
        Some(p) => p.into_path().map_err(|e| AppError::Internal(format!("path: {e}")))?,
        None => return Ok(String::new()), // user cancelled
    };

    let conn = state.pool.get()?;
    match domain.as_str() {
        "orders" => crate::csv_export::write_orders_csv(&conn, &path)?,
        "filaments" => crate::csv_export::write_filaments_csv(&conn, &path)?,
        _ => unreachable!(),
    }

    Ok(path.to_string_lossy().to_string())
}
