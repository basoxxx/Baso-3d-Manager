-- v2: per-order VAT toggle.
-- The v1 schema had no apply_vat column on orders. The original
-- schema.sql worked around it by ALTERing in the same script and
-- swallowing the "duplicate column" error on re-run. With the
-- migration runner now we explicitly skip already-applied versions.
ALTER TABLE orders ADD COLUMN apply_vat INTEGER NOT NULL DEFAULT 1;
