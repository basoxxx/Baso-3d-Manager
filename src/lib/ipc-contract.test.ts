/**
 * Contract tests: snapshot the IPC create payloads. Any change to a payload
 * shape is intentional, has to be reflected in the corresponding Rust struct
 * (`src-tauri/src/repos/*.rs`), and the snapshot must be updated.
 *
 * This is the cheap-and-fast drift detector. The ideal replacement is
 * `ts-rs` or `specta` to derive TS types from Rust at build time.
 */
import { describe, it, expect } from 'vitest'
import { toNewCustomer, emptyCustomerForm } from './customer-schema'
import { toNewFilament, emptyFilamentForm } from './filament-schema'
import { toNewPrinter, emptyPrinterForm } from './printer-schema'
import { toNewOrder, emptyQuoteItem } from './order-schema'
import { toUpdateSettings } from './settings-schema'

describe('IPC contract snapshots', () => {
  it('NewCustomer matches the wire shape', () => {
    expect(
      toNewCustomer({ ...emptyCustomerForm, name: 'A', email: 'a@b.it' }),
    ).toEqual({
      name: 'A',
      email: 'a@b.it',
      phone: null,
      address: null,
      vat_number: null,
      notes: null,
    })
  })

  it('NewFilament matches the wire shape', () => {
    expect(toNewFilament(emptyFilamentForm)).toEqual({
      brand: '',
      material: 'PLA',
      color: null,
      diameter: 1.75,
      density: 1.24,
      price_per_kg: 0,
      stock_grams: 0,
      low_stock_threshold: 500,
    })
  })

  it('NewPrinter matches the wire shape', () => {
    expect(toNewPrinter(emptyPrinterForm)).toEqual({
      name: '',
      model: null,
      build_volume_x: null,
      build_volume_y: null,
      build_volume_z: null,
      status: 'active',
      notes: null,
    })
  })

  it('NewOrder matches the wire shape', () => {
    expect(
      toNewOrder({
        customer_id: 'c1',
        status: 'draft',
        notes: '',
        margin_percent: 40,
        apply_vat: true,
        quote_items: [{ ...emptyQuoteItem, description: 'X' }],
      }),
    ).toEqual({
      customer_id: 'c1',
      status: 'draft',
      notes: null,
      margin_percent: 40,
      apply_vat: true,
      quote_items: [
        {
          description: 'X',
          quantity: 1,
          time_hours: 0,
          material_grams: 0,
          filament_id: null,
          post_processing_cost: 0,
        },
      ],
    })
  })

  it('UpdateSettings matches the wire shape', () => {
    expect(
      toUpdateSettings({
        default_hourly_rate: 2.5,
        default_margin_percent: 40,
        currency: 'EUR',
        vat_rate: 22,
      }),
    ).toEqual({
      default_hourly_rate: 2.5,
      default_margin_percent: 40,
      currency: 'EUR',
      vat_rate: 22,
    })
  })
})
