import { useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useFieldArray, useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Save } from 'lucide-react'
import { orderFormSchema, emptyQuoteItem, toNewOrder, type OrderFormValues } from '@/lib/order-schema'
import { useOrder, useCreateOrder, useUpdateOrder } from '@/hooks/useOrders'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/layout/PageHeader'
import { Textarea } from '@/components/ui/Textarea'
import { CustomerPicker } from '@/components/domain/orders/CustomerPicker'
import { QuoteItemRow } from '@/components/domain/orders/QuoteItemRow'
import { PriceSummary } from '@/components/domain/orders/PriceSummary'
import { PriceLegend } from '@/components/domain/orders/PriceLegend'

export function OrderFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing, isLoading } = useOrder(id)
  const { data: settings } = useSettings()
  const createMut = useCreateOrder()
  const updateMut = useUpdateOrder(id ?? '')

  const methods = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customer_id: '',
      status: 'draft',
      notes: '',
      margin_percent: 40,
      apply_vat: true,
      quote_items: [emptyQuoteItem],
    },
  })

  const { control, handleSubmit, reset, register, formState: { errors, isDirty } } = methods
  const { fields, append, remove } = useFieldArray({ control, name: 'quote_items' })

  useEffect(() => {
    if (existing) {
      reset({
        customer_id: existing.customer_id,
        status: existing.status as OrderFormValues['status'],
        notes: existing.notes ?? '',
        margin_percent: existing.margin_percent,
        apply_vat: existing.apply_vat ?? true,
        quote_items: existing.items.length > 0
          ? existing.items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              time_hours: i.time_hours,
              material_grams: i.material_grams,
              filament_id: i.filament_id,
              post_processing_cost: i.post_processing_cost,
            }))
          : [emptyQuoteItem],
      })
    } else if (settings) {
      reset({
        customer_id: '',
        status: 'draft',
        notes: '',
        margin_percent: settings.default_margin_percent,
        apply_vat: true,
        quote_items: [emptyQuoteItem],
      })
    }
  }, [existing, settings, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateMut.mutateAsync(toNewOrder(values))
        toast.success('Ordine aggiornato')
      } else {
        await createMut.mutateAsync(toNewOrder(values))
        toast.success('Ordine creato')
      }
      navigate('/orders')
    } catch (e) { toast.error(String(e)) }
  })

  const submitting = createMut.isPending || updateMut.isPending

  return (
    <FormProvider {...methods}>
      <div>
        <PageHeader
          title={isEdit ? 'Modifica ordine' : 'Nuovo ordine'}
          actions={
            <Link to="/orders">
              <Button variant="ghost" size="sm"><ArrowLeft size={14} /> Torna alla lista</Button>
            </Link>
          }
        />

        <form onSubmit={onSubmit}>
          {isLoading && isEdit ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-md bg-bg-1" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="rounded-md border border-border bg-bg-1 p-4">
                  <Controller
                    name="customer_id"
                    control={control}
                    render={({ field }) => (
                      <CustomerPicker
                        value={field.value || null}
                        onChange={field.onChange}
                        error={errors.customer_id?.message}
                      />
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-1">Articoli</h3>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => append(emptyQuoteItem)}
                    >
                      <Plus size={14} /> Aggiungi
                    </Button>
                  </div>
                  <PriceLegend />
                  {fields.map((f, index) => (
                    <QuoteItemRow
                      key={f.id}
                      index={index}
                      control={control}
                      hourlyRate={settings?.default_hourly_rate || 0}
                      onRemove={() => fields.length > 1 && remove(index)}
                    />
                  ))}
                  {errors.quote_items?.message && (
                    <p className="text-xs text-danger">{errors.quote_items.message}</p>
                  )}
                </div>

                <div className="rounded-md border border-border bg-bg-1 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Margine (%) *"
                      type="number" step="0.1"
                      {...register('margin_percent')}
                      error={errors.margin_percent?.message}
                    />
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-3">Stato *</label>
                      <select
                        {...register('status')}
                        className="h-9 rounded-md border border-border bg-bg-1 px-3 text-sm text-text-1 focus:border-accent focus:outline-none"
                      >
                        <option value="draft">Bozza</option>
                        <option value="in_produzione">In produzione</option>
                        <option value="completato">Completato</option>
                        <option value="consegnato">Consegnato</option>
                        <option value="annullato">Annullato</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Textarea label="Note" rows={3} {...register('notes')} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <PriceSummary />
                <Button
                  type="submit"
                  className="mt-3 w-full"
                  loading={submitting}
                  disabled={!isDirty && isEdit}
                >
                  <Save size={14} /> {isEdit ? 'Salva modifiche' : 'Crea ordine'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </FormProvider>
  )
}

// Controller import for inline use
import { Controller } from 'react-hook-form'
