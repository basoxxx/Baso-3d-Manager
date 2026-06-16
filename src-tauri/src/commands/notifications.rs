//! In-app notification center. Persists a list of notifications in
//! the SQLite DB and exposes them via IPC. The frontend renders a
//! bell icon with an unread count in the TopBar; clicking opens a
//! panel with the full list (newest first, markable read).
//!
//! Native OS notifications (tauri-plugin-notification) would be the
//! next step, but the plugin isn't in the offline cargo cache. The
//! shape here is designed so swapping in native notifications later
//! is a single IPC change.

use crate::error::AppResult;
use crate::repos::notifications as repo;
use crate::AppState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Stable notification categories. Each maps to a default icon
/// (lucide) and tone in the frontend.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NotificationKind {
    /// An order has aged past the dashboard threshold.
    OverdueOrder,
    /// A filament is at or below its low-stock threshold.
    LowStock,
    /// A new release of the app is available.
    AppUpdateAvailable,
    /// A backup was successfully created.
    BackupOk,
    /// An error worth surfacing (e.g. a failed CSV export).
    Error,
}

impl NotificationKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::OverdueOrder => "overdue_order",
            Self::LowStock => "low_stock",
            Self::AppUpdateAvailable => "app_update_available",
            Self::BackupOk => "backup_ok",
            Self::Error => "error",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    pub kind: String, // NotificationKind::as_str
    pub title: String,
    pub body: String,
    /// JSON payload: kind-specific extra info (e.g. order id,
    /// filament id, version). The frontend parses this lazily.
    pub data: Option<serde_json::Value>,
    pub read: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct PushNotificationInput {
    pub kind: NotificationKind,
    pub title: String,
    pub body: String,
    pub data: Option<serde_json::Value>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn list_notifications(
    state: State<'_, AppState>,
    unread_only: Option<bool>,
    limit: Option<i64>,
) -> AppResult<Vec<Notification>> {
    repo::list(&state.pool, unread_only.unwrap_or(false), limit)
}

#[tauri::command(rename_all = "snake_case")]
pub fn push_notification(
    state: State<'_, AppState>,
    input: PushNotificationInput,
) -> AppResult<Notification> {
    let now: DateTime<Utc> = Utc::now();
    repo::insert(
        &state.pool,
        input.kind.as_str(),
        &input.title,
        &input.body,
        input.data.as_ref().map(|v| v.to_string()).as_deref(),
        now,
    )
}

#[tauri::command(rename_all = "snake_case")]
pub fn mark_notification_read(state: State<'_, AppState>, id: String) -> AppResult<()> {
    repo::mark_read(&state.pool, &id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn mark_all_notifications_read(state: State<'_, AppState>) -> AppResult<()> {
    repo::mark_all_read(&state.pool)
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_notification(state: State<'_, AppState>, id: String) -> AppResult<()> {
    repo::delete(&state.pool, &id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn unread_notification_count(state: State<'_, AppState>) -> AppResult<i64> {
    repo::unread_count(&state.pool)
}
