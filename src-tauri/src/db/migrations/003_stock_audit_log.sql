-- v3: stock audit log.
--
-- Every change to `filaments.stock_grams` writes a row here so the
-- user can see "where did my 200g of PLA go?". Captured:
--   - delta_grams: signed (e.g. -300 for a 300g decrement)
--   - reason: a stable enum value: 'manual_adjust', 'order_production',
--     'order_revert', 'restock', 'correction'
--   - order_id: optional, set when the change is tied to a specific
--     order moving to/from in_produzione
--   - user_note: optional free-form note (e.g. "lost spool")
--   - created_at: ISO timestamp
--   - stock_after: the stock_grams value after the change (denormalized
--     so we don't have to walk the log forward to compute the current
--     stock at any historical point)
CREATE TABLE IF NOT EXISTS stock_audit_log (
  id TEXT PRIMARY KEY,
  filament_id TEXT NOT NULL REFERENCES filaments(id) ON DELETE RESTRICT,
  delta_grams REAL NOT NULL,
  stock_after REAL NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'manual_adjust',
    'order_production',
    'order_revert',
    'restock',
    'correction'
  )),
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  user_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_audit_filament
  ON stock_audit_log(filament_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_audit_order
  ON stock_audit_log(order_id);
