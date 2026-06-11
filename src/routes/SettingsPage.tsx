import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Save, RefreshCw } from 'lucide-react'
import { useSettings, useUpdateSettings, settingsKeys } from '@/hooks/useSettings'
import { settingsFormSchema, type SettingsFormValues } from '@/lib/settings-schema'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/layout/PageHeader'
import { useQueryClient } from '@tanstack/react-query'

export function SettingsPage() {
  const { data, isLoading } = useSettings()
  const updateMut = useUpdateSettings()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      default_hourly_rate: 2.5,
      default_margin_percent: 40,
      currency: 'EUR',
      vat_rate: 22,
    },
  })

  useEffect(() => {
    if (data) {
      reset({
        default_hourly_rate: data.default_hourly_rate,
        default_margin_percent: data.default_margin_percent,
        currency: data.currency,
        vat_rate: data.vat_rate,
      })
    }
  }, [data, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateMut.mutateAsync(values)
      toast.success('Impostazioni salvate')
      qc.invalidateQueries({ queryKey: settingsKeys.all })
    } catch (e) { toast.error(String(e)) }
  })

  return (
    <div>
      <PageHeader
        title="Impostazioni"
        description="Configurazione calcolo preventivi"
        actions={
          isLoading ? <RefreshCw size={14} className="animate-spin text-text-3" /> : null
        }
      />

      <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tariffa oraria default (€) *"
            type="number" step="0.01"
            {...register('default_hourly_rate')}
            error={errors.default_hourly_rate?.message}
          />
          <Input
            label="Margine default (%) *"
            type="number" step="0.1"
            {...register('default_margin_percent')}
            error={errors.default_margin_percent?.message}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Valuta (ISO 4217) *"
            {...register('currency')}
            error={errors.currency?.message}
            hint="3 lettere, es. EUR, USD"
          />
          <Input
            label="Aliquota IVA (%) *"
            type="number" step="0.1"
            {...register('vat_rate')}
            error={errors.vat_rate?.message}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" loading={updateMut.isPending} disabled={!isDirty}>
            <Save size={14} /> Salva impostazioni
          </Button>
        </div>
      </form>
    </div>
  )
}
