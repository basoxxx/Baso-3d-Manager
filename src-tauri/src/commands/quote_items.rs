use crate::error::AppResult;
use crate::repos::quote_items::{self, QuoteItem};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn list_quote_items(state: State<'_, AppState>, order_id: String) -> AppResult<Vec<QuoteItem>> {
    quote_items::list_for_order(&state.pool, &order_id)
}
