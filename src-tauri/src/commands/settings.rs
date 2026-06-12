use crate::error::AppResult;
use crate::repos::settings::{self, Settings, UpdateSettings};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    settings::get(&state.pool)
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_settings(
    state: State<'_, AppState>,
    input: UpdateSettings,
) -> AppResult<Settings> {
    settings::update(&state.pool, input)
}
