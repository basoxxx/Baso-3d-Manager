/**
 * Unit tests for `buildSearchCommands` — the pure data → CommandAction
 * transformer. These run without React, without the router, without
 * TanStack Query. Pure function, deterministic, fast.
 */
import { describe, it, expect, vi } from 'vitest'
import { buildSearchCommands } from './buildSearchCommands'
import type { Customer, Filament, Order, Printer as PrinterRow } from '@/lib/db-types'

const NAV = vi.fn()

const sampleCustomer = (over: Partial<Customer> = {}): Customer => ({
  id: 'c-1',
  name: 'Mario Rossi',
  email: 'mario@example.com',
  phone: '+39 333 1234567',
  address: null,
  vat_number: 'IT12345678901',
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...over,
})

const sampleOrder = (over: Partial<Order> = {}): Order => ({
  id: 'o-1',
  customer_id: 'c-1',
  status: 'draft',
  notes: 'supporto',
  margin_percent: 40,
  apply_vat: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...over,
})

const sampleFilament = (over: Partial<Filament> = {}): Filament => ({
  id: 'f-1',
  brand: 'Prusament',
  material: 'PLA',
  color: 'Galaxy Black',
  diameter: 1.75,
  density: 1.24,
  price_per_kg: 24.0,
  stock_grams: 1000,
  low_stock_threshold: 200,
  created_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...over,
})

const samplePrinter = (over: Partial<PrinterRow> = {}): PrinterRow => ({
  id: 'p-1',
  name: 'Voron 2.4',
  model: 'Voron 2.4 R2',
  build_volume_x: 350,
  build_volume_y: 350,
  build_volume_z: 350,
  status: 'active',
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...over,
})

describe('buildSearchCommands', () => {
  it('returns nothing for queries shorter than 2 chars', () => {
    const out = buildSearchCommands({
      customers: [sampleCustomer()],
      orders: [sampleOrder()],
      filaments: [sampleFilament()],
      printers: [samplePrinter()],
      navigate: NAV,
      query: 'm',
    })
    expect(out).toEqual([])
  })

  it('finds a customer by name', () => {
    const out = buildSearchCommands({
      customers: [sampleCustomer()],
      orders: [],
      filaments: [],
      printers: [],
      navigate: NAV,
      query: 'mario',
    })
    expect(out).toHaveLength(1)
    expect(out[0].group).toBe('Clienti')
    expect(out[0].label).toBe('Mario Rossi')
  })

  it('finds a customer by email', () => {
    const out = buildSearchCommands({
      customers: [sampleCustomer()],
      orders: [],
      filaments: [],
      printers: [],
      navigate: NAV,
      query: 'mario@',
    })
    expect(out).toHaveLength(1)
  })

  it('finds a customer by phone', () => {
    const out = buildSearchCommands({
      customers: [sampleCustomer()],
      orders: [],
      filaments: [],
      printers: [],
      navigate: NAV,
      query: '333',
    })
    expect(out).toHaveLength(1)
  })

  it('finds a customer by VAT number', () => {
    const out = buildSearchCommands({
      customers: [sampleCustomer()],
      orders: [],
      filaments: [],
      printers: [],
      navigate: NAV,
      query: 'IT123',
    })
    expect(out).toHaveLength(1)
  })

  it('finds a filament by material and brand', () => {
    const out = buildSearchCommands({
      customers: [],
      orders: [],
      filaments: [sampleFilament()],
      printers: [],
      navigate: NAV,
      query: 'Prusament',
    })
    expect(out).toHaveLength(1)
    expect(out[0].group).toBe('Filamenti')
  })

  it('finds a printer by name and model', () => {
    const out = buildSearchCommands({
      customers: [],
      orders: [],
      filaments: [],
      printers: [samplePrinter()],
      navigate: NAV,
      query: 'Voron',
    })
    expect(out).toHaveLength(1)
  })

  it('navigates to the customer detail when a customer command is performed', () => {
    const out = buildSearchCommands({
      customers: [sampleCustomer()],
      orders: [],
      filaments: [],
      printers: [],
      navigate: NAV,
      query: 'mario',
    })
    out[0].perform()
    expect(NAV).toHaveBeenCalledWith('/customers/c-1')
  })

  it('navigates to the order detail', () => {
    const out = buildSearchCommands({
      customers: [],
      orders: [sampleOrder({ id: 'o-99' })],
      filaments: [],
      printers: [],
      navigate: NAV,
      query: 'supporto',
    })
    expect(out).toHaveLength(1)
    out[0].perform()
    expect(NAV).toHaveBeenCalledWith('/orders/o-99')
  })

  it('returns commands from multiple sources when the query matches', () => {
    const out = buildSearchCommands({
      customers: [sampleCustomer({ name: 'Studio PLA' })],
      orders: [sampleOrder({ notes: 'PLA bracket' })],
      filaments: [sampleFilament({ material: 'PLA' })],
      printers: [],
      navigate: NAV,
      query: 'pla',
    })
    expect(out.length).toBeGreaterThanOrEqual(3)
    const groups = new Set(out.map((c) => c.group))
    expect(groups).toContain('Clienti')
    expect(groups).toContain('Ordini')
    expect(groups).toContain('Filamenti')
  })

  it('returns nothing if no record matches', () => {
    const out = buildSearchCommands({
      customers: [sampleCustomer()],
      orders: [sampleOrder()],
      filaments: [sampleFilament()],
      printers: [samplePrinter()],
      navigate: NAV,
      query: 'zzznotfound',
    })
    expect(out).toEqual([])
  })
})
