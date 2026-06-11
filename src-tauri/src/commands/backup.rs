use crate::error::{AppError, AppResult};
use crate::AppState;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn export_backup(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> AppResult<String> {
    let file_name = format!("baso-backup-{}.zip", chrono::Local::now().format("%Y-%m-%d-%H%M%S"));

    let path = app
        .dialog()
        .file()
        .add_filter("Backup ZIP", &["zip"])
        .set_file_name(&file_name)
        .blocking_save_file();

    let path = match path {
        Some(p) => p.into_path().map_err(|e| AppError::Internal(format!("path: {e}")))?,
        None => return Ok(String::new()),
    };

    let version = env!("CARGO_PKG_VERSION").to_string();
    crate::backup::export_zip(&state.paths, &path, &version)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_backup(app: tauri::AppHandle, state: State<'_, AppState>) -> AppResult<()> {
    let path = app
        .dialog()
        .file()
        .add_filter("Backup ZIP", &["zip"])
        .blocking_pick_file();

    let path = match path {
        Some(p) => p.into_path().map_err(|e| AppError::Internal(format!("path: {e}")))?,
        None => return Ok(()),
    };

    crate::backup::import_zip(&path, &state.paths.db_path)?;
    Ok(())
}
