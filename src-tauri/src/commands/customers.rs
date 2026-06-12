use crate::error::AppResult;
use crate::repos::customers::{self, Customer, NewCustomer};
use tauri::State;

use crate::AppState;

#[tauri::command(rename_all = "snake_case")]
pub fn list_customers(
    state: State<'_, AppState>,
    search: Option<String>,
) -> AppResult<Vec<Customer>> {
    customers::list(&state.pool, search.as_deref())
}

#[tauri::command]
pub fn get_customer(state: State<'_, AppState>, id: String) -> AppResult<Customer> {
    customers::get(&state.pool, &id)
}

#[tauri::command]
pub fn create_customer(state: State<'_, AppState>, input: NewCustomer) -> AppResult<Customer> {
    customers::create(&state.pool, input)
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_customer(
    state: State<'_, AppState>,
    id: String,
    input: NewCustomer,
) -> AppResult<Customer> {
    customers::update(&state.pool, &id, input)
}

#[tauri::command]
pub fn delete_customer(state: State<'_, AppState>, id: String) -> AppResult<()> {
    customers::soft_delete(&state.pool, &id)
}
