mod db;
mod error;
mod paths;

use db::DbPool;
use error::AppResult;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub pool: DbPool,
    pub paths: paths::AppPaths,
}

#[tauri::command]
fn ping(state: tauri::State<'_, AppState>) -> AppResult<String> {
    let conn = state.pool.get()?;
    let n: i64 = conn.query_row("SELECT COUNT(*) FROM settings", [], |r| r.get(0))?;
    Ok(format!("pong (settings rows: {n})"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with_target(false)
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_paths = paths::AppPaths::resolve(app.handle())?;
            let pool = db::init_pool(&app_paths.db_path)
                .map_err(|e| format!("init_pool: {e}"))?;
            db::run_migrations(&pool)
                .map_err(|e| format!("run_migrations: {e}"))?;

            app.manage(AppState {
                pool,
                paths: app_paths,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
