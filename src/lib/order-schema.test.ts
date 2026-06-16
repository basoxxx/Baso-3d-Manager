import { describe, it, expect } from 'vitest'
import {
  orderFormSchema,
  toNewOrder,
  emptyQuoteItem,
  fromOrderForDuplicate,
} from './order-schema'

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

describe('fromOrderForDuplicate', () => {
  const source = {
    customer_id: 'c-original',
    notes: 'Preventivo di prova',
    margin_percent: 45,
    apply_vat: true,
    items: [
      {
        description: 'Staffa',
        quantity: 2,
        time_hours: 1.5,
        material_grams: 80,
        filament_id: 'f-1',
        post_processing_cost: 5,
      },
      {
        description: 'Coperchio',
        quantity: 1,
        time_hours: 3,
        material_grams: 200,
        filament_id: 'f-2',
        post_processing_cost: 0,
      },
    ],
  }

  it('always sets status to draft', () => {
    const out = fromOrderForDuplicate(source)
    expect(out.status).toBe('draft')
  })

  it('copies customer_id, notes, margin_percent, apply_vat', () => {
    const out = fromOrderForDuplicate(source)
    expect(out.customer_id).toBe('c-original')
    expect(out.notes).toBe('Preventivo di prova')
    expect(out.margin_percent).toBe(45)
    expect(out.apply_vat).toBe(true)
  })

  it('copies every quote item verbatim', () => {
    const out = fromOrderForDuplicate(source)
    expect(out.quote_items).toHaveLength(2)
    expect(out.quote_items[0].description).toBe('Staffa')
    expect(out.quote_items[0].quantity).toBe(2)
    expect(out.quote_items[0].time_hours).toBe(1.5)
    expect(out.quote_items[0].material_grams).toBe(80)
    expect(out.quote_items[0].filament_id).toBe('f-1')
    expect(out.quote_items[0].post_processing_cost).toBe(5)
  })

  it('converts null notes to empty string (form shape)', () => {
    const out = fromOrderForDuplicate({ ...source, notes: null })
    expect(out.notes).toBe('')
  })

  it('falls back to a single empty item if the source has no items', () => {
    const out = fromOrderForDuplicate({ ...source, items: [] })
    expect(out.quote_items).toHaveLength(1)
    expect(out.quote_items[0].description).toBe('')
  })

  it('preserves apply_vat=false (off)', () => {
    const out = fromOrderForDuplicate({ ...source, apply_vat: false })
    expect(out.apply_vat).toBe(false)
  })

  it('preserves filament_id when an item has none (null in form)', () => {
    const out = fromOrderForDuplicate({
      ...source,
      items: [
        {
          description: 'No filament',
          quantity: 1,
          time_hours: 0,
          material_grams: 0,
          filament_id: null,
          post_processing_cost: 0,
        },
      ],
    })
    expect(out.quote_items[0].filament_id).toBeNull()
  })

  it('passes through the form schema (sanity check)', () => {
    const out = fromOrderForDuplicate(source)
    const r = orderFormSchema.safeParse(out)
    expect(r.success).toBe(true)
  })
})
