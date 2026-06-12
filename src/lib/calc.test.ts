import { describe, it, expect } from 'vitest'
import { calcItemTotal, calcOrderTotals } from './calc'

describe('calcItemTotal', () => {
  it('returns 0 for empty item', () => {
    expect(calcItemTotal({
      time_hours: 0, material_grams: 0, price_per_kg: 0,
      hourly_rate: 0, post_processing_cost: 0, quantity: 1,
    })).toBe(0)
  })

  it('sums time + material + post', () => {
    const r = calcItemTotal({
      time_hours: 2, hourly_rate: 2.5,
      material_grams: 100, price_per_kg: 20,
      post_processing_cost: 5,
      quantity: 1,
    })
    // 2*2.5 + (100/1000)*20 + 5 = 5 + 2 + 5 = 12
    expect(r).toBe(12)
  })

  it('multiplies by quantity', () => {
    const r = calcItemTotal({
      time_hours: 1, hourly_rate: 10,
      material_grams: 0, price_per_kg: 0,
      post_processing_cost: 0,
      quantity: 3,
    })
    expect(r).toBe(30)
  })

  it('handles missing/nullish values as 0', () => {
    expect(calcItemTotal({
      time_hours: 0, material_grams: 50, price_per_kg: 20,
      hourly_rate: 0, post_processing_cost: 0, quantity: 1,
    })).toBe(1)
  })
})

describe('calcOrderTotals', () => {
  const item = (overrides = {}) => ({
    time_hours: 0, material_grams: 0, price_per_kg: 0,
    hourly_rate: 0, post_processing_cost: 0, quantity: 1, ...overrides,
  })

  it('returns zeros for empty list', () => {
    const t = calcOrderTotals([], 40, 22)
    expect(t.subtotal_items).toBe(0)
    expect(t.total).toBe(0)
  })

  it('applies margin then VAT', () => {
    // subtotal 100, margin 40% -> taxable 140, VAT 22% -> total 170.8
    const t = calcOrderTotals([
      item({ time_hours: 10, hourly_rate: 10 }), // 100
    ], 40, 22)
    expect(t.subtotal_items).toBe(100)
    expect(t.margin_amount).toBe(40)
    expect(t.taxable).toBe(140)
    expect(t.vat_amount).toBe(30.8)
    expect(t.total).toBe(170.8)
  })

  it('rounds to 2 decimals', () => {
    const t = calcOrderTotals([
      item({ time_hours: 1, hourly_rate: 0.1 }), // 0.1
    ], 33.33, 22)
    // 0.1 + 0.0333 = 0.1333, * 1.22 = 0.1626
    expect(t.subtotal_items).toBe(0.1)
    expect(t.margin_amount).toBeCloseTo(0.03, 2)
    expect(t.total).toBeCloseTo(0.16, 2)
  })

  it('sums multiple items', () => {
    const t = calcOrderTotals([
      item({ time_hours: 2, hourly_rate: 5 }), // 10
      item({ material_grams: 100, price_per_kg: 20 }), // 2
    ], 50, 0)
    expect(t.subtotal_items).toBe(12)
    expect(t.margin_amount).toBe(6)
    expect(t.taxable).toBe(18)
    expect(t.vat_amount).toBe(0)
    expect(t.total).toBe(18)
  })

  it('skips VAT when applyVat is false', () => {
    const t = calcOrderTotals([
      item({ time_hours: 10, hourly_rate: 10 }), // 100
    ], 40, 22, false)
    expect(t.subtotal_items).toBe(100)
    expect(t.margin_amount).toBe(40)
    expect(t.taxable).toBe(140)
    expect(t.vat_amount).toBe(0)
    expect(t.total).toBe(140)
  })
})
