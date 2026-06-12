use crate::error::AppResult;
use crate::repos::orders::{self, NewOrder, Order};
use crate::repos::quote_items::QuoteItem;
use crate::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct OrderWithItems {
    #[serde(flatten)]
    pub order: Order,
    pub items: Vec<QuoteItem>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn list_orders(
    state: State<'_, AppState>,
    status: Option<String>,
    customer_id: Option<String>,
) -> AppResult<Vec<Order>> {
    orders::list(&state.pool, status.as_deref(), customer_id.as_deref())
}

#[tauri::command]
pub fn get_order(state: State<'_, AppState>, id: String) -> AppResult<OrderWithItems> {
    let (order, items) = orders::get_with_items(&state.pool, &id)?;
    Ok(OrderWithItems { order, items })
}

#[tauri::command]
pub fn create_order(state: State<'_, AppState>, input: NewOrder) -> AppResult<OrderWithItems> {
    let (order, items) = orders::create(&state.pool, input)?;
    Ok(OrderWithItems { order, items })
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_order(
    state: State<'_, AppState>,
    id: String,
    input: NewOrder,
) -> AppResult<OrderWithItems> {
    let (order, items) = orders::update(&state.pool, &id, input)?;
    Ok(OrderWithItems { order, items })
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_order_status(
    state: State<'_, AppState>,
    id: String,
    new_status: String,
) -> AppResult<Order> {
    orders::set_status(&state.pool, &id, &new_status)
}

#[tauri::command]
pub fn delete_order(state: State<'_, AppState>, id: String) -> AppResult<()> {
    orders::soft_delete(&state.pool, &id)
}
