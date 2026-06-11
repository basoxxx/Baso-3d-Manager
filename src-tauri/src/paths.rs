use std::path::PathBuf;
use tauri::Manager;

pub struct AppPaths {
    pub data_dir: PathBuf,
    pub db_path: PathBuf,
    pub log_dir: PathBuf,
    pub config_path: PathBuf,
}

impl AppPaths {
    pub fn resolve<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<Self, String> {
        let data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("cannot resolve app_data_dir: {e}"))?;

        std::fs::create_dir_all(&data_dir).map_err(|e| format!("create data_dir: {e}"))?;

        let log_dir = data_dir.join("logs");
        std::fs::create_dir_all(&log_dir).map_err(|e| format!("create log_dir: {e}"))?;

        Ok(Self {
            db_path: data_dir.join("baso.db"),
            config_path: data_dir.join("config.json"),
            data_dir,
            log_dir,
        })
    }
}
