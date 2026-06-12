import { Trash2 } from 'lucide-react'
import { Controller, useFormContext, useWatch, type Control } from 'react-hook-form'
import { useFilaments } from '@/hooks/useFilaments'
import { Input } from '@/components/ui/Input'
import type { OrderFormValues, QuoteItemFormValues } from '@/lib/order-schema'

interface QuoteItemRowProps {
  index: number
  onRemove: () => void
  control: Control<OrderFormValues>
  hourlyRate: number
}

export function QuoteItemRow({ index, onRemove, control, hourlyRate }: QuoteItemRowProps) {
  const { register, formState: { errors } } = useFormContext<OrderFormValues>()
  const itemErrors = errors.quote_items?.[index]
  const { data: filaments } = useFilaments()

  const item = useWatch({ control, name: `quote_items.${index}` }) as QuoteItemFormValues | undefined
  const selectedFilament = filaments?.find((f) => f.id === item?.filament_id)

  // Defensive: coerce every numeric field. RHF + native <input type=number>
  // yields string values after user interaction; without Number() the
  // arithmetic eventually concatenates as string and .toFixed throws.
  const itemTotal = (() => {
    if (!item) return 0
    const t = Number(item.time_hours) || 0
    const m = Number(item.material_grams) || 0
    const p = Number(item.post_processing_cost) || 0
    const pricePerKg = Number(selectedFilament?.price_per_kg) || 0
    const rate = Number(hourlyRate) || 0
    return t * rate + (m / 1000) * pricePerKg + p
  })()

  return (
    <div className="space-y-2 rounded-md border border-border bg-bg-1 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-3">Articolo #{index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-text-3 hover:bg-bg-2 hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <Input
        placeholder="Descrizione (es. Supporto telefono)"
        {...register(`quote_items.${index}.description` as const)}
        error={itemErrors?.description?.message}
      />
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Input
            type="number" min="1" step="1"
            placeholder="Qtà"
            aria-label="Quantità"
            {...register(`quote_items.${index}.quantity` as const, { valueAsNumber: true })}
            error={itemErrors?.quantity?.message}
          />
          <p className="mt-0.5 text-[10px] text-text-3">pezzi</p>
        </div>
        <div>
          <Input
            type="number" min="0" step="0.1"
            placeholder="Tempo"
            aria-label="Tempo (ore)"
            {...register(`quote_items.${index}.time_hours` as const, { valueAsNumber: true })}
            error={itemErrors?.time_hours?.message}
          />
          <p className="mt-0.5 text-[10px] text-text-3">ore × €{hourlyRate.toFixed(2)}/h</p>
        </div>
        <div>
          <Input
            type="number" min="0" step="1"
            placeholder="Materiale"
            aria-label="Materiale (grammi)"
            {...register(`quote_items.${index}.material_grams` as const, { valueAsNumber: true })}
            error={itemErrors?.material_grams?.message}
          />
          <p className="mt-0.5 text-[10px] text-text-3">grammi</p>
        </div>
        <div>
          <Input
            type="number" min="0" step="0.01"
            placeholder="Post-proc"
            aria-label="Post-processing (€)"
            {...register(`quote_items.${index}.post_processing_cost` as const, { valueAsNumber: true })}
            error={itemErrors?.post_processing_cost?.message}
          />
          <p className="mt-0.5 text-[10px] text-text-3">costo extra €</p>
        </div>
      </div>
      <Controller
        control={control}
        name={`quote_items.${index}.filament_id` as const}
        render={({ field }) => (
          <div>
            <select
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value || null)}
              className="h-9 w-full rounded-md border border-border bg-bg-1 px-3 text-sm text-text-1 focus:border-accent focus:outline-none"
            >
              <option value="">— Nessun filamento —</option>
              {filaments?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.brand} {f.material} {f.color ? `(${f.color})` : ''} — €{f.price_per_kg.toFixed(2)}/kg
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-[10px] text-text-3">
              {selectedFilament
                ? `usato per calcolare il costo materiale (€/kg)`
                : 'opzionale — senza filamento il materiale non è calcolato'}
            </p>
          </div>
        )}
      />
      <div className="text-right text-xs text-text-3">
        Subtotale: <span className="font-semibold text-text-1">€{itemTotal.toFixed(2)}</span>
      </div>
    </div>
  )
}
