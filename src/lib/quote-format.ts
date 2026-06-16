/**
 * Format helpers for printable quotes. The on-screen form uses the
 * same `calcOrderTotals` for live totals; the printed version needs
 * a few more fields (issuer info, line numbers, formatted numbers
 * with thousand separators) that are presentation-only.
 *
 * The printable view is a server-rendered HTML doc (Tauri serves it
 * via the asset protocol) with @media print styles, but the data
 * shaping lives here so the React Preview component, the HTML doc,
 * and any future PDF generator all share the same shape.
 */
import { calcOrderTotals, type QuoteItemInput } from './calc'

export interface PrintableItem {
  index: number
  description: string
  quantity: number
  time_hours: number
  material_grams: number
  filament_label: string | null
  post_processing_cost: number
  unit_price: number
  total: number
}

export interface PrintableQuote {
  number: string
  issued_at: string
  issuer_name: string
  issuer_address: string | null
  issuer_vat: string | null
  customer_name: string
  customer_address: string | null
  customer_vat: string | null
  customer_email: string | null
  notes: string | null
  items: PrintableItem[]
  subtotal_items: number
  margin_percent: number
  margin_amount: number
  taxable: number
  vat_rate: number
  vat_amount: number
  apply_vat: boolean
  total: number
  currency: string
}

export interface PrintableItemInput extends QuoteItemInput {
  description: string
  filament_label: string | null
}

export interface BuildPrintableQuoteInput {
  /** Stable id used to derive the quote number (e.g. order id). */
  order_id: string
  customer: {
    name: string
    email?: string | null
    address?: string | null
    vat_number?: string | null
  }
  notes: string | null
  items: PrintableItemInput[]
  margin_percent: number
  apply_vat: boolean
  settings: {
    default_hourly_rate: number
    vat_rate: number
    currency: string
    issuer_name?: string | null
    issuer_address?: string | null
    issuer_vat?: string | null
  }
  /** ISO timestamp for the quote header; defaults to "now". */
  issued_at?: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

const itNumber = (n: number) => {
  if (!Number.isFinite(n)) return '0,00'
  const s = n.toFixed(2)
  const [int, dec] = s.split('.')
  const withDots = int!
    .split('')
    .reverse()
    .join('')
    .match(/.{1,3}/g)!
    .join('.')
    .split('')
    .reverse()
    .join('')
  return `${withDots},${dec}`
}

const itCurrency = (n: number) => `${itNumber(n)}`

/** Format a quantity for the printable view (1, 2, 1.5). */
const itQty = (n: number) => {
  if (Number.isInteger(n)) return String(n)
  // Round to 2 decimals then strip trailing zero on .X (e.g. "1,5" not "1,50").
  const s = n.toFixed(2)
  return s.replace(/\.?0+$/, '').replace('.', ',')
}

/** Format hours: 1, 1.5 -> "1,5h". */
const itHours = (n: number) => `${itQty(n)}h`

/** Format grams: 500 -> "500 g", 1500 -> "1,5 kg". */
const itGrams = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(2).replace('.', ',')} kg`
  return `${n.toFixed(0)} g`
}

export function buildPrintableQuote(input: BuildPrintableQuoteInput): PrintableQuote {
  const totals = calcOrderTotals(
    input.items,
    input.margin_percent,
    input.settings.vat_rate,
    input.apply_vat,
  )

  const items: PrintableItem[] = input.items.map((it, idx) => {
    const unit = calcOrderTotals(
      [{ ...it, quantity: 1 }],
      0,
      0,
      false,
    ).subtotal_items
    return {
      index: idx + 1,
      description: it.description,
      quantity: it.quantity,
      time_hours: it.time_hours,
      material_grams: it.material_grams,
      filament_label: it.filament_label,
      post_processing_cost: it.post_processing_cost,
      unit_price: round2(unit),
      total: round2(unit * it.quantity),
    }
  })

  const now = input.issued_at ?? new Date().toISOString()
  const datePart = now.split('T')[0] ?? now
  const num = `PREV-${input.order_id.slice(0, 8).toUpperCase()}-${datePart.replace(/-/g, '')}`

  return {
    number: num,
    issued_at: now,
    issuer_name: input.settings.issuer_name ?? 'BASO 3D',
    issuer_address: input.settings.issuer_address ?? null,
    issuer_vat: input.settings.issuer_vat ?? null,
    customer_name: input.customer.name,
    customer_address: input.customer.address ?? null,
    customer_vat: input.customer.vat_number ?? null,
    customer_email: input.customer.email ?? null,
    notes: input.notes,
    items,
    subtotal_items: totals.subtotal_items,
    margin_percent: input.margin_percent,
    margin_amount: totals.margin_amount,
    taxable: totals.taxable,
    vat_rate: input.settings.vat_rate,
    vat_amount: totals.vat_amount,
    apply_vat: input.apply_vat,
    total: totals.total,
    currency: input.settings.currency,
  }
}

export const formatItNumber = itNumber
export const formatItCurrency = itCurrency
export const formatItQty = itQty
export const formatItHours = itHours
export const formatItGrams = itGrams
