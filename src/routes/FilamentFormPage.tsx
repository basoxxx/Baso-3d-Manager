import { useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { filamentFormSchema, emptyFilamentForm, toNewFilament, FILAMENT_MATERIALS, type FilamentFormValues } from '@/lib/filament-schema'
import { useFilament, useCreateFilament, useUpdateFilament } from '@/hooks/useFilaments'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/layout/PageHeader'

export function FilamentFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing, isLoading } = useFilament(id)
  const createMut = useCreateFilament()
  const updateMut = useUpdateFilament(id ?? '')

  const { register, handleSubmit, reset, control, formState: { errors, isDirty } } = useForm<FilamentFormValues>({
    resolver: zodResolver(filamentFormSchema),
    defaultValues: emptyFilamentForm,
  })

  useEffect(() => {
    if (existing) {
      reset({
        brand: existing.brand,
        material: existing.material as FilamentFormValues['material'],
        color: existing.color ?? '',
        diameter: existing.diameter,
        density: existing.density ?? undefined,
        price_per_kg: existing.price_per_kg,
        stock_grams: existing.stock_grams,
        low_stock_threshold: existing.low_stock_threshold,
      })
    }
  }, [existing, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateMut.mutateAsync(toNewFilament(values))
        toast.success('Filamento aggiornato')
      } else {
        await createMut.mutateAsync(toNewFilament(values))
        toast.success('Filamento creato')
      }
      navigate('/filaments')
    } catch (e) { toast.error(String(e)) }
  })

  const submitting = createMut.isPending || updateMut.isPending

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifica filamento' : 'Nuovo filamento'}
        actions={
          <Link to="/filaments">
            <Button variant="ghost" size="sm"><ArrowLeft size={14} /> Torna alla lista</Button>
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4 p-6">
        {isLoading && isEdit ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-md bg-bg-1" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Marca *" {...register('brand')} error={errors.brand?.message} />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-3">Materiale *</label>
                <Controller
                  control={control}
                  name="material"
                  render={({ field }) => (
                    <select
                      {...field}
                      className="h-9 rounded-md border border-border bg-bg-1 px-3 text-sm text-text-1 focus:border-accent focus:outline-none"
                    >
                      {FILAMENT_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                />
                {errors.material && <span className="text-xs text-danger">{errors.material.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input label="Colore" {...register('color')} />
              <Input label="Diametro (mm) *" type="number" step="0.01" {...register('diameter')} error={errors.diameter?.message} />
              <Input label="Densità (g/cm³)" type="number" step="0.01" {...register('density')} error={errors.density?.message} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input label="Prezzo €/kg *" type="number" step="0.01" {...register('price_per_kg')} error={errors.price_per_kg?.message} />
              <Input label="Stock (g) *" type="number" step="1" {...register('stock_grams')} error={errors.stock_grams?.message} />
              <Input label="Soglia scorta bassa (g) *" type="number" step="1" {...register('low_stock_threshold')} error={errors.low_stock_threshold?.message} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link to="/filaments">
                <Button type="button" variant="secondary">Annulla</Button>
              </Link>
              <Button type="submit" loading={submitting} disabled={!isDirty && isEdit}>
                {isEdit ? 'Salva modifiche' : 'Crea filamento'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
