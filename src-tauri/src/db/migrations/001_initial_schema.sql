-- BASO 3D Manager — initial schema
-- v1. Idempotent: uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  vat_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS filaments (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  material TEXT NOT NULL CHECK (material IN ('PLA','PETG','ABS','TPU','ASA','NYLON','PC','OTHER')),
  color TEXT,
  diameter REAL NOT NULL DEFAULT 1.75,
  density REAL,
  price_per_kg REAL NOT NULL,
  stock_grams REAL NOT NULL DEFAULT 0,
  low_stock_threshold REAL NOT NULL DEFAULT 500,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS printers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT,
  build_volume_x INTEGER,
  build_volume_y INTEGER,
  build_volume_z INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','retired')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_produzione','completato','consegnato','annullato')),
  notes TEXT,
  margin_percent REAL NOT NULL DEFAULT 40,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  time_hours REAL NOT NULL DEFAULT 0,
  material_grams REAL NOT NULL DEFAULT 0,
  filament_id TEXT REFERENCES filaments(id) ON DELETE SET NULL,
  post_processing_cost REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_hourly_rate REAL NOT NULL DEFAULT 2.50,
  default_margin_percent REAL NOT NULL DEFAULT 40,
  currency TEXT NOT NULL DEFAULT 'EUR',
  vat_rate REAL NOT NULL DEFAULT 22,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (id) VALUES (1);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_order ON quote_items(order_id);
CREATE INDEX IF NOT EXISTS idx_filaments_material ON filaments(material);
