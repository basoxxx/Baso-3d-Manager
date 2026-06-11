use crate::error::AppResult;
use crate::repos::printers::{self, NewPrinter, Printer};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn list_printers(state: State<'_, AppState>) -> AppResult<Vec<Printer>> {
    printers::list(&state.pool)
}

#[tauri::command]
pub fn get_printer(state: State<'_, AppState>, id: String) -> AppResult<Printer> {
    printers::get(&state.pool, &id)
}

#[tauri::command]
pub fn create_printer(state: State<'_, AppState>, input: NewPrinter) -> AppResult<Printer> {
    printers::create(&state.pool, input)
}

#[tauri::command]
pub fn update_printer(
    state: State<'_, AppState>,
    id: String,
    input: NewPrinter,
) -> AppResult<Printer> {
    printers::update(&state.pool, &id, input)
}

#[tauri::command]
pub fn delete_printer(state: State<'_, AppState>, id: String) -> AppResult<()> {
    printers::soft_delete(&state.pool, &id)
}
