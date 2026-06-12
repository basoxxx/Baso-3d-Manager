export interface QuoteItemInput {
  time_hours: number
  material_grams: number
  price_per_kg: number
  hourly_rate: number
  post_processing_cost: number
  quantity: number
}

export interface OrderTotals {
  subtotal_items: number
  margin_amount: number
  taxable: number
  vat_amount: number
  total: number
}

export function calcItemTotal(i: QuoteItemInput): number {
  const time = (i.time_hours || 0) * (i.hourly_rate || 0)
  const mat = ((i.material_grams || 0) / 1000) * (i.price_per_kg || 0)
  return (time + mat + (i.post_processing_cost || 0)) * (i.quantity || 1)
}

export function calcOrderTotals(
  items: QuoteItemInput[],
  marginPercent: number,
  vatRate: number,
  applyVat: boolean = true
): OrderTotals {
  const subtotal_items = items.reduce((s, i) => s + calcItemTotal(i), 0)
  const margin_amount = subtotal_items * ((marginPercent || 0) / 100)
  const taxable = subtotal_items + margin_amount
  const vat_amount = applyVat ? taxable * ((vatRate || 0) / 100) : 0
  const total = taxable + vat_amount
  return {
    subtotal_items: round2(subtotal_items),
    margin_amount: round2(margin_amount),
    taxable: round2(taxable),
    vat_amount: round2(vat_amount),
    total: round2(total),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
