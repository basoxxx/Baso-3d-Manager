import { invoke } from '@tauri-apps/api/core'

export interface IpcError { code: string; message: string }

export class IpcException extends Error {
  code: string
  constructor(err: IpcError) { super(err.message); this.name = 'IpcException'; this.code = err.code }
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try { return await invoke<T>(cmd, args) }
  catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && 'message' in e) {
      throw new IpcException(e as IpcError)
    }
    throw e
  }
}

import type { Customer, Filament, Order, OrderStatus, Printer, QuoteItem, Settings } from './db-types'
import type { DashboardData } from './dashboard-types'

interface NewCustomer { name: string; email: string; phone: string|null; address: string|null; vat_number: string|null; notes: string|null }
export interface NewFilament { brand: string; material: string; color: string|null; diameter: number; density: number|null; price_per_kg: number; stock_grams: number; low_stock_threshold: number }
interface NewPrinter { name: string; model: string|null; build_volume_x: number|null; build_volume_y: number|null; build_volume_z: number|null; status: string; notes: string|null }
interface UpdateSettings { default_hourly_rate: number; default_margin_percent: number; currency: string; vat_rate: number }
interface NewQuoteItem { description: string; quantity: number; time_hours: number; material_grams: number; filament_id: string|null; post_processing_cost: number }
export interface NewOrder { customer_id: string; status: string; notes: string|null; margin_percent: number; apply_vat: boolean; quote_items: NewQuoteItem[] }
export interface OrderWithItems extends Order { items: QuoteItem[] }

export const ipc = {
  ping: () => call<string>('ping'),

  customers: {
    list: (search?: string) => call<Customer[]>('list_customers', { search: search ?? null }),
    get: (id: string) => call<Customer>('get_customer', { id }),
    create: (input: NewCustomer) => call<Customer>('create_customer', { input }),
    update: (id: string, input: NewCustomer) => call<Customer>('update_customer', { id, input }),
    delete: (id: string) => call<void>('delete_customer', { id }),
  },

  filaments: {
    list: (material?: string) => call<Filament[]>('list_filaments', { material: material ?? null }),
    get: (id: string) => call<Filament>('get_filament', { id }),
    create: (input: NewFilament) => call<Filament>('create_filament', { input }),
    update: (id: string, input: NewFilament) => call<Filament>('update_filament', { id, input }),
    adjustStock: (id: string, delta_grams: number) => call<Filament>('adjust_filament_stock', { id, delta_grams }),
    delete: (id: string) => call<void>('delete_filament', { id }),
  },

  printers: {
    list: () => call<Printer[]>('list_printers'),
    get: (id: string) => call<Printer>('get_printer', { id }),
    create: (input: NewPrinter) => call<Printer>('create_printer', { input }),
    update: (id: string, input: NewPrinter) => call<Printer>('update_printer', { id, input }),
    delete: (id: string) => call<void>('delete_printer', { id }),
  },

  settings: {
    get: () => call<Settings>('get_settings'),
    update: (input: UpdateSettings) => call<Settings>('update_settings', { input }),
  },

  orders: {
    list: (filters?: { status?: OrderStatus; customer_id?: string }) =>
      call<Order[]>('list_orders', { status: filters?.status ?? null, customer_id: filters?.customer_id ?? null }),
    get: (id: string) => call<OrderWithItems>('get_order', { id }),
    create: (input: NewOrder) => call<OrderWithItems>('create_order', { input }),
    update: (id: string, input: NewOrder) => call<OrderWithItems>('update_order', { id, input }),
    setStatus: (id: string, newStatus: string) => call<Order>('set_order_status', { id, newStatus: newStatus }),
    delete: (id: string) => call<void>('delete_order', { id }),
  },

  quoteItems: {
    list: (orderId: string) => call<QuoteItem[]>('list_quote_items', { orderId }),
  },

  dashboard: {
    get: () => call<DashboardData>('get_dashboard'),
  },

  exportData: {
    csv: (domain: 'orders' | 'filaments') =>
      call<string>('export_csv', { domain }),
    backup: () => call<string>('export_backup'),
    restore: () => call<void>('import_backup'),
  },
}
