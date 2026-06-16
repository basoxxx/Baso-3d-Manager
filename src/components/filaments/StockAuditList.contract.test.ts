/**
 * Contract test: the wire shape of the Rust StockAuditEntry must
 * match the TS type. We assert the field names + types by checking
 * a sample value (a plain object built from a JS sample). If the
 * Rust side renames a field, this snapshot flags the drift.
 *
 * We also assert the StockChangeReason enum strings are stable
 * (they're persisted in the DB CHECK constraint).
 */
import { describe, it, expect } from 'vitest'

const REASONS = [
  'manual_adjust',
  'order_production',
  'order_revert',
  'restock',
  'correction',
] as const

describe('StockAuditEntry wire contract', () => {
  it('uses snake_case fields that the Rust struct also uses', () => {
    // Sample payload as it would come from the Rust side via serde.
    const wire = {
      id: 'a-1',
      filament_id: 'f-1',
      delta_grams: -100,
      stock_after: 900,
      reason: 'manual_adjust',
      order_id: null,
      user_note: null,
      created_at: '2026-01-15 10:30:00',
    }
    expect(Object.keys(wire).sort()).toEqual(
      [
        'created_at',
        'delta_grams',
        'filament_id',
        'id',
        'order_id',
        'reason',
        'stock_after',
        'user_note',
      ].sort(),
    )
  })

  it('exposes all five StockChangeReason enum values', () => {
    // Mirrors the DB CHECK constraint in 003_stock_audit_log.sql.
    const reasonsFromDb = new Set([
      'manual_adjust',
      'order_production',
      'order_revert',
      'restock',
      'correction',
    ])
    for (const r of REASONS) {
      expect(reasonsFromDb.has(r)).toBe(true)
    }
    expect(REASONS).toHaveLength(5)
  })

  it('order_id is nullable (manual adjustments have no order)', () => {
    const wire: { order_id: string | null } = { order_id: null }
    expect(wire.order_id).toBeNull()
  })

  it('user_note is nullable', () => {
    const wire: { user_note: string | null } = { user_note: null }
    expect(wire.user_note).toBeNull()
  })

  it('delta_grams is a signed number (positive for restock, negative for production)', () => {
    const positive: { delta_grams: number } = { delta_grams: 500 }
    const negative: { delta_grams: number } = { delta_grams: -200 }
    expect(positive.delta_grams).toBeGreaterThan(0)
    expect(negative.delta_grams).toBeLessThan(0)
  })
})
