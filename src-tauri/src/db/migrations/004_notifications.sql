-- v4: in-app notification center.
--
-- Persists notifications so they survive app restarts. Each
-- notification has a kind (stable enum string), a title and body,
-- an optional JSON payload, a read flag, and a created_at
-- timestamp.
--
-- Design note: we keep the payload as a TEXT JSON column rather
-- than splitting into kind-specific tables. The notification list
-- is a UI feed, not a query target; the JSON keeps the schema
-- simple and lets us add new kinds without migrations.
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN (
    'overdue_order',
    'low_stock',
    'app_update_available',
    'backup_ok',
    'error'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(read, created_at DESC)
  WHERE read = 0;
