import { useWatch, useFormContext } from 'react-hook-form'
import { useSettings } from '@/hooks/useSettings'
import { useFilaments } from '@/hooks/useFilaments'
import { calcOrderTotals, type QuoteItemInput } from '@/lib/calc'
import type { OrderFormValues } from '@/lib/order-schema'

export function PriceSummary() {
  const { control } = useFormContext<OrderFormValues>()
  const { data: settings } = useSettings()
  const { data: filaments } = useFilaments()
  const items = useWatch({ control, name: 'quote_items' }) || []
  const margin = useWatch({ control, name: 'margin_percent' }) || 0

  const calcItems: QuoteItemInput[] = items.map((i) => {
    const f = filaments?.find((x) => x.id === i.filament_id)
    return {
      time_hours: Number(i.time_hours) || 0,
      material_grams: Number(i.material_grams) || 0,
      price_per_kg: f?.price_per_kg || 0,
      hourly_rate: settings?.default_hourly_rate || 0,
      post_processing_cost: Number(i.post_processing_cost) || 0,
      quantity: Number(i.quantity) || 1,
    }
  })

  const totals = calcOrderTotals(calcItems, Number(margin) || 0, settings?.vat_rate || 0)
  const currency = settings?.currency || 'EUR'

  return (
    <div className="sticky top-4 space-y-3 rounded-lg border border-border bg-gradient-to-br from-bg-1 to-bg-2 p-4">
      <h3 className="text-sm font-semibold text-text-1">Riepilogo</h3>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-text-2">
          <span>Subtotale</span>
          <span>€{totals.subtotal_items.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-text-2">
          <span>Margine ({Number(margin).toFixed(1)}%)</span>
          <span>€{totals.margin_amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 text-text-1">
          <span>Imponibile</span>
          <span>€{totals.taxable.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-text-2">
          <span>IVA ({settings?.vat_rate.toFixed(1)}%)</span>
          <span>€{totals.vat_amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-success">
          <span>Totale</span>
          <span>€{totals.total.toFixed(2)} {currency}</span>
        </div>
      </div>
    </div>
  )
}
