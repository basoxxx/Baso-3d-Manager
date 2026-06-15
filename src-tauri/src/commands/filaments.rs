use crate::error::AppResult;
use crate::repos::filaments::{self, Filament, NewFilament};
use crate::AppState;
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub fn list_filaments(
    state: State<'_, AppState>,
    material: Option<String>,
) -> AppResult<Vec<Filament>> {
    filaments::list(&state.pool, material.as_deref())
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_filament(state: State<'_, AppState>, id: String) -> AppResult<Filament> {
    filaments::get(&state.pool, &id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn create_filament(state: State<'_, AppState>, input: NewFilament) -> AppResult<Filament> {
    filaments::create(&state.pool, input)
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_filament(
    state: State<'_, AppState>,
    id: String,
    input: NewFilament,
) -> AppResult<Filament> {
    filaments::update(&state.pool, &id, input)
}

#[tauri::command(rename_all = "snake_case")]
pub fn adjust_filament_stock(
    state: State<'_, AppState>,
    id: String,
    delta_grams: f64,
) -> AppResult<Filament> {
    filaments::adjust_stock(&state.pool, &id, delta_grams)
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_filament(state: State<'_, AppState>, id: String) -> AppResult<()> {
    filaments::soft_delete(&state.pool, &id)
}
