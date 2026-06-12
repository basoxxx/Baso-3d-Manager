import { useWatch, useFormContext, Controller } from 'react-hook-form'
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
  const applyVat = useWatch({ control, name: 'apply_vat' }) ?? true

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

  const totals = calcOrderTotals(calcItems, Number(margin) || 0, settings?.vat_rate || 0, applyVat)
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
        {applyVat && (
          <div className="flex justify-between text-text-2">
            <span>IVA ({settings?.vat_rate.toFixed(1)}%)</span>
            <span>€{totals.vat_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-base font-bold text-success">Totale</span>
          <div className="flex items-center gap-2">
            {!applyVat && (
              <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
                Esente IVA
              </span>
            )}
            <span className="text-base font-bold text-success">
              €{totals.total.toFixed(2)} {currency}
            </span>
          </div>
        </div>
      </div>
      <Controller
        control={control}
        name="apply_vat"
        render={({ field }) => (
          <label className="flex cursor-pointer items-center gap-2 border-t border-border pt-3 text-xs text-text-2">
            <input
              type="checkbox"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              onBlur={field.onBlur}
              className="h-3.5 w-3.5 rounded border-border bg-bg-1 text-accent focus:ring-accent"
            />
            <span>Applica IVA ({settings?.vat_rate.toFixed(1)}%)</span>
          </label>
        )}
      />
    </div>
  )
}
