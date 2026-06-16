use crate::csv_export::{self, ExportDomain};
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
    let domain = ExportDomain::parse(&domain)
        .ok_or_else(|| AppError::Validation(format!("unknown domain: {domain}")))?;

    let file_name = domain.default_filename();

    let path = app
        .dialog()
        .file()
        .add_filter("CSV", &["*.csv"])
        .set_file_name(&file_name)
        .blocking_save_file();

    let path = match path {
        Some(p) => p.into_path().map_err(|e| AppError::Internal(format!("path: {e}")))?,
        None => return Ok(String::new()), // user cancelled
    };

    let conn = state.pool.get()?;
    match domain {
        ExportDomain::Customers => csv_export::write_customers_csv(&conn, &path)?,
        ExportDomain::Filaments => csv_export::write_filaments_csv(&conn, &path)?,
        ExportDomain::Printers => csv_export::write_printers_csv(&conn, &path)?,
        ExportDomain::Orders => csv_export::write_orders_csv(&conn, &path)?,
    }

    Ok(path.to_string_lossy().to_string())
}
