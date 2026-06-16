/**
 * Unit tests for the printable-quote formatter. We test the
 * function directly (no React, no DOM) to keep the test fast and
 * deterministic.
 */
import { describe, it, expect } from 'vitest'
import {
  buildPrintableQuote,
  formatItNumber,
  formatItCurrency,
  formatItQty,
  formatItHours,
  formatItGrams,
} from './quote-format'
import { calcOrderTotals } from './calc'

const baseSettings = {
  default_hourly_rate: 3.0,
  vat_rate: 22,
  currency: 'EUR',
}

const sample = (over: Parameters<typeof buildPrintableQuote>[0] = {
  order_id: 'ord-12345678',
  customer: { name: 'Acme Srl', email: 'info@acme.it' },
  notes: null,
  items: [
    {
      description: 'Staffa',
      quantity: 2,
      time_hours: 1.5,
      material_grams: 80,
      filament_label: 'Prusament PLA',
      price_per_kg: 24,
      hourly_rate: 3,
      post_processing_cost: 0,
    },
  ],
  margin_percent: 40,
  apply_vat: true,
  settings: baseSettings,
}) => buildPrintableQuote(over)

describe('formatItNumber', () => {
  it('formats an integer with a thousand separator', () => {
    expect(formatItNumber(1234.5)).toBe('1.234,50')
  })
  it('handles zero', () => {
    expect(formatItNumber(0)).toBe('0,00')
  })
  it('handles negative numbers', () => {
    expect(formatItNumber(-12.5)).toBe('-12,50')
  })
  it('handles non-finite gracefully', () => {
    expect(formatItNumber(NaN)).toBe('0,00')
    expect(formatItNumber(Infinity)).toBe('0,00')
  })
})

describe('formatItCurrency', () => {
  it('delegates to formatItNumber', () => {
    expect(formatItCurrency(22.5)).toBe('22,50')
  })
})

describe('formatItQty / formatItHours / formatItGrams', () => {
  it('integer quantities have no decimals', () => {
    expect(formatItQty(3)).toBe('3')
  })
  it('fractional quantities use a comma', () => {
    expect(formatItQty(1.5)).toBe('1,5')
  })
  it('hours are suffixed with h', () => {
    expect(formatItHours(1.5)).toBe('1,5h')
  })
  it('grams stay in g below 1kg', () => {
    expect(formatItGrams(500)).toBe('500 g')
  })
  it('grams above 1kg convert to kg', () => {
    expect(formatItGrams(1500)).toBe('1,50 kg')
    expect(formatItGrams(1000)).toBe('1,00 kg')
  })
})

describe('buildPrintableQuote', () => {
  it('produces a stable, derived quote number', () => {
    const q = sample()
    expect(q.number).toMatch(/^PREV-ORD-1234-\d{8}$/)
    expect(q.number).toContain('PREV-')
    expect(q.number).toContain('ORD-1234')
  })

  it('numbers items starting at 1', () => {
    const q = sample({
      order_id: 'ord-x',
      customer: { name: 'C' },
      notes: null,
      items: [
        { description: 'A', quantity: 1, time_hours: 0, material_grams: 0, filament_label: null, price_per_kg: 0, hourly_rate: 0, post_processing_cost: 0 },
        { description: 'B', quantity: 1, time_hours: 0, material_grams: 0, filament_label: null, price_per_kg: 0, hourly_rate: 0, post_processing_cost: 0 },
      ],
      margin_percent: 0,
      apply_vat: false,
      settings: baseSettings,
    })
    expect(q.items.map((i) => i.index)).toEqual([1, 2])
  })

  it('computes the same totals as calcOrderTotals (single source of truth)', () => {
    const q = sample()
    // The printable quote's totals come from calcOrderTotals (same
    // function as the on-screen form). Assert the printable numbers
    // match the on-screen numbers exactly — no rounding drift between
    // the editor and the printed quote.
    const onScreen = calcOrderTotals(
      [
        {
          time_hours: 1.5,
          material_grams: 80,
          price_per_kg: 24,
          hourly_rate: 3,
          post_processing_cost: 0,
          quantity: 2,
        },
      ],
      40,
      22,
      true,
    )
    expect(q.subtotal_items).toBe(onScreen.subtotal_items)
    expect(q.margin_amount).toBe(onScreen.margin_amount)
    expect(q.taxable).toBe(onScreen.taxable)
    expect(q.vat_amount).toBe(onScreen.vat_amount)
    expect(q.total).toBe(onScreen.total)
  })

  it('sets vat_amount to 0 when apply_vat is false', () => {
    const q = sample({
      order_id: 'o-1',
      customer: { name: 'C' },
      notes: null,
      items: [],
      margin_percent: 0,
      apply_vat: false,
      settings: baseSettings,
    })
    expect(q.apply_vat).toBe(false)
    expect(q.vat_amount).toBe(0)
  })

  it('per-item unit_price is the line total divided by quantity', () => {
    const q = sample({
      order_id: 'o-1',
      customer: { name: 'C' },
      notes: null,
      items: [
        { description: 'X', quantity: 3, time_hours: 1, material_grams: 0, filament_label: null, price_per_kg: 0, hourly_rate: 10, post_processing_cost: 0 },
      ],
      margin_percent: 0,
      apply_vat: false,
      settings: baseSettings,
    })
    expect(q.items[0].unit_price).toBeCloseTo(10, 2)
    expect(q.items[0].total).toBeCloseTo(30, 2)
  })

  it('passes through customer fields (or null)', () => {
    const q = sample({
      order_id: 'o-1',
      customer: { name: 'C', email: 'a@b.it', address: 'Via X 1', vat_number: 'IT123' },
      notes: 'Note',
      items: [],
      margin_percent: 0,
      apply_vat: false,
      settings: baseSettings,
    })
    expect(q.customer_name).toBe('C')
    expect(q.customer_email).toBe('a@b.it')
    expect(q.customer_address).toBe('Via X 1')
    expect(q.customer_vat).toBe('IT123')
    expect(q.notes).toBe('Note')
  })

  it('uses a custom issued_at when provided', () => {
    const q = sample({
      order_id: 'o-1',
      customer: { name: 'C' },
      notes: null,
      items: [],
      margin_percent: 0,
      apply_vat: false,
      settings: baseSettings,
      issued_at: '2025-01-15T00:00:00.000Z',
    })
    expect(q.issued_at).toBe('2025-01-15T00:00:00.000Z')
    expect(q.number).toContain('20250115')
  })

  it('defaults issuer_name to "BASO 3D"', () => {
    const q = sample()
    expect(q.issuer_name).toBe('BASO 3D')
  })

  it('uses a custom issuer_name when provided', () => {
    const q = sample({
      order_id: 'o-1',
      customer: { name: 'C' },
      notes: null,
      items: [],
      margin_percent: 0,
      apply_vat: false,
      settings: { ...baseSettings, issuer_name: 'Studio Y', issuer_address: 'Via Y 2', issuer_vat: 'IT999' },
    })
    expect(q.issuer_name).toBe('Studio Y')
    expect(q.issuer_address).toBe('Via Y 2')
    expect(q.issuer_vat).toBe('IT999')
  })
})
