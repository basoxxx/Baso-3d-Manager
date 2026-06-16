/**
 * Frontend ↔ Backend IPC contract.
 *
 * Type-safety strategy:
 *   - "Create" payloads (`NewCustomer`, `NewFilament`, `NewPrinter`, `NewOrder`,
 *     `UpdateSettings`) are defined ONCE in `lib/*-schema.ts` next to their Zod
 *     schema and `toNew*` transform, then re-exported here. This makes the
 *     form input and the IPC payload share a single source of truth.
 *   - "Read" shapes (`Customer`, `Filament`, `Printer`, `Order`, `QuoteItem`,
 *     `Settings`) live in `lib/db-types.ts` (mirroring the Rust structs).
 *
 * Drift detection: in dev we call `assertShape` to log a warning when the
 * runtime payload diverges from the declared TS type. The Rust side is the
 * authoritative truth — if you see a warning, fix Rust first, then update
 * `db-types.ts`.
 *
 * TODO(P0.3 follow-up): replace the manual TS mirrors with `ts-rs` or
 * `specta` so that the Rust structs themselves generate the TS types at
 * build time. That's a one-day job once this manual layer is in place.
 */
import { invoke } from '@tauri-apps/api/core'
import type { Customer, Filament, Order, OrderStatus, Printer, QuoteItem, Settings } from './db-types'
import type { DashboardData } from './dashboard-types'
import type { NewCustomer } from './customer-schema'
import type { NewFilament } from './filament-schema'
import type { NewPrinter } from './printer-schema'
import type { NewOrder } from './order-schema'
import type { Notification, StockAuditEntry } from './db-types.generated'
import type { UpdateSettings } from './settings-schema'

export interface IpcError { code: string; message: string }

export class IpcException extends Error {
  code: string
  constructor(err: IpcError) { super(err.message); this.name = 'IpcException'; this.code = err.code }
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args)
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && 'message' in e) {
      throw new IpcException(e as IpcError)
    }
    throw e
  }
}

export interface OrderWithItems extends Order { items: QuoteItem[] }

// Re-export the canonical "create payload" types so existing call sites
// (useOrders, useFilaments, useSettings, ...) keep their `import { ... } from '@/lib/ipc'`.
export type { NewCustomer, NewFilament, NewPrinter, NewOrder, UpdateSettings, StockAuditEntry, Notification }

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
    adjustStock: (id: string, delta_grams: number) =>
      call<Filament>('adjust_filament_stock', { id, delta_grams }),
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
      call<Order[]>('list_orders', {
        status: filters?.status ?? null,
        customer_id: filters?.customer_id ?? null,
      }),
    get: (id: string) => call<OrderWithItems>('get_order', { id }),
    create: (input: NewOrder) => call<OrderWithItems>('create_order', { input }),
    update: (id: string, input: NewOrder) => call<OrderWithItems>('update_order', { id, input }),
    setStatus: (id: string, newStatus: string) =>
      call<Order>('set_order_status', { id, new_status: newStatus }),
    delete: (id: string) => call<void>('delete_order', { id }),
  },

  quoteItems: {
    list: (orderId: string) => call<QuoteItem[]>('list_quote_items', { orderId }),
  },

  stockAudit: {
    list: (opts?: { filament_id?: string; limit?: number }) =>
      call<StockAuditEntry[]>('list_stock_audit', {
        filament_id: opts?.filament_id ?? null,
        limit: opts?.limit ?? null,
      }),
  },

  notifications: {
    list: (opts?: { unread_only?: boolean; limit?: number }) =>
      call<Notification[]>('list_notifications', {
        unread_only: opts?.unread_only ?? null,
        limit: opts?.limit ?? null,
      }),
    push: (input: {
      kind: 'overdue_order' | 'low_stock' | 'app_update_available' | 'backup_ok' | 'error'
      title: string
      body: string
      data?: unknown
    }) => call<Notification>('push_notification', { input }),
    markRead: (id: string) => call<void>('mark_notification_read', { id }),
    markAllRead: () => call<void>('mark_all_notifications_read'),
    delete: (id: string) => call<void>('delete_notification', { id }),
    unreadCount: () => call<number>('unread_notification_count'),
  },

  dashboard: {
    get: () => call<DashboardData>('get_dashboard'),
  },

  exportData: {
    csv: (domain: 'orders' | 'filaments' | 'customers' | 'printers') =>
      call<string>('export_csv', { domain }),
    backup: () => call<string>('export_backup'),
    restore: () => call<void>('import_backup'),
  },
}
