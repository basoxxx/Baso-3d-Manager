import { describe, it, expect } from 'vitest'
import { orderFormSchema, toNewOrder, emptyQuoteItem } from './order-schema'

describe('orderFormSchema', () => {
  const base = {
    customer_id: 'c1',
    status: 'draft' as const,
    notes: '',
    margin_percent: 40,
    apply_vat: true,
    quote_items: [{ ...emptyQuoteItem, description: 'X' }],
  }

  it('accepts valid order', () => {
    expect(orderFormSchema.safeParse(base).success).toBe(true)
  })

  it('requires customer_id', () => {
    const r = orderFormSchema.safeParse({ ...base, customer_id: '' })
    expect(r.success).toBe(false)
  })

  it('requires at least one item', () => {
    const r = orderFormSchema.safeParse({ ...base, quote_items: [] })
    expect(r.success).toBe(false)
  })

  it('rejects bad status', () => {
    const r = orderFormSchema.safeParse({ ...base, status: 'BOGUS' as any })
    expect(r.success).toBe(false)
  })
})

describe('toNewOrder', () => {
  it('converts empty notes to null', () => {
    const out = toNewOrder({
      customer_id: 'c', status: 'draft', notes: '', margin_percent: 0,
      apply_vat: true,
      quote_items: [{ ...emptyQuoteItem, description: 'X' }],
    })
    expect(out.notes).toBeNull()
  })

  it('preserves item order from form values', () => {
    const out = toNewOrder({
      customer_id: 'c', status: 'draft', notes: '', margin_percent: 0,
      apply_vat: true,
      quote_items: [
        { ...emptyQuoteItem, description: 'A' },
        { ...emptyQuoteItem, description: 'B' },
      ],
    })
    expect(out.quote_items.map((qi) => qi.description)).toEqual(['A', 'B'])
  })

  it('passes apply_vat through to NewOrder', () => {
    const on = toNewOrder({
      customer_id: 'c', status: 'draft', notes: '', margin_percent: 0,
      apply_vat: true,
      quote_items: [{ ...emptyQuoteItem, description: 'X' }],
    })
    expect(on.apply_vat).toBe(true)
    const off = toNewOrder({
      customer_id: 'c', status: 'draft', notes: '', margin_percent: 0,
      apply_vat: false,
      quote_items: [{ ...emptyQuoteItem, description: 'X' }],
    })
    expect(off.apply_vat).toBe(false)
  })
})
