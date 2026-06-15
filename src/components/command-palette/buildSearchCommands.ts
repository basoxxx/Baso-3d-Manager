/**
 * Build per-record search commands from in-memory data sources. Each
 * record becomes a CommandAction that, when picked, navigates to the
 * entity's detail page.
 *
 * The records are passed in (rather than queried here) so this function
 * stays pure and easy to test — the React component owns the
 * `useCustomers`/`useOrders`/... hooks and feeds the latest snapshot.
 */
import {
  Users,
  ClipboardList,
  Layers,
  Printer,
} from 'lucide-react'
import type { NavigateFunction } from 'react-router-dom'
import type { Customer, Filament, Order, Printer as PrinterRow } from '@/lib/db-types'
import type { CommandAction } from './types'

const NAVIGATE_TO = {
  customer: (n: NavigateFunction, id: string) => n(`/customers/${id}`),
  order: (n: NavigateFunction, id: string) => n(`/orders/${id}`),
  filament: (n: NavigateFunction, id: string) => n(`/filaments/${id}`),
  printer: (n: NavigateFunction, id: string) => n(`/printers/${id}`),
} as const

function matches(record: Record<string, unknown>, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return Object.values(record).some((v) =>
    typeof v === 'string' ? v.toLowerCase().includes(needle) : false,
  )
}

export interface BuildSearchCommandsInput {
  customers: Customer[]
  orders: Order[]
  filaments: Filament[]
  printers: PrinterRow[]
  navigate: NavigateFunction
  query: string
}

export function buildSearchCommands({
  customers,
  orders,
  filaments,
  printers,
  navigate,
  query,
}: BuildSearchCommandsInput): CommandAction[] {
  const q = query.trim()
  if (q.length < 2) return []
  const out: CommandAction[] = []

  for (const c of customers) {
    if (!matches({ name: c.name, email: c.email, phone: c.phone, vat: c.vat_number } as Record<string, unknown>, q)) continue
    out.push({
      id: `customer:${c.id}`,
      group: 'Clienti',
      label: c.name,
      hint: c.email,
      icon: Users,
      keywords: [c.email, c.phone ?? '', c.vat_number ?? ''].filter(Boolean),
      perform: () => NAVIGATE_TO.customer(navigate, c.id),
    })
  }
  for (const o of orders) {
    if (!matches({ status: o.status, notes: o.notes, id: o.id } as Record<string, unknown>, q)) continue
    out.push({
      id: `order:${o.id}`,
      group: 'Ordini',
      label: `Ordine ${o.id.slice(0, 8)}…`,
      hint: `${o.status} · €${o.margin_percent.toFixed(1)}% margine`,
      icon: ClipboardList,
      keywords: [o.status, o.notes ?? '', o.id].filter(Boolean),
      perform: () => NAVIGATE_TO.order(navigate, o.id),
    })
  }
  for (const f of filaments) {
    if (
      !matches(
        { brand: f.brand, material: f.material, color: f.color } as Record<string, unknown>,
        q,
      )
    ) continue
    out.push({
      id: `filament:${f.id}`,
      group: 'Filamenti',
      label: `${f.brand} ${f.material}`,
      hint: f.color ?? undefined,
      icon: Layers,
      keywords: [f.material, f.color ?? ''].filter(Boolean),
      perform: () => NAVIGATE_TO.filament(navigate, f.id),
    })
  }
  for (const p of printers) {
    if (!matches({ name: p.name, model: p.model, status: p.status } as Record<string, unknown>, q)) continue
    out.push({
      id: `printer:${p.id}`,
      group: 'Stampanti',
      label: p.name,
      hint: `${p.model ?? ''} ${p.model ? '·' : ''}${p.status}`.trim(),
      icon: Printer,
      keywords: [p.model ?? '', p.status].filter(Boolean),
      perform: () => NAVIGATE_TO.printer(navigate, p.id),
    })
  }
  return out
}
