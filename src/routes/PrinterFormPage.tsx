import { useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { printerFormSchema, emptyPrinterForm, toNewPrinter, PRINTER_STATUSES, type PrinterFormValues } from '@/lib/printer-schema'
import { usePrinter, useCreatePrinter, useUpdatePrinter } from '@/hooks/usePrinters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { PageHeader } from '@/components/layout/PageHeader'

export function PrinterFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing, isLoading } = usePrinter(id)
  const createMut = useCreatePrinter()
  const updateMut = useUpdatePrinter(id ?? '')

  const { register, handleSubmit, reset, control, formState: { errors, isDirty } } = useForm<PrinterFormValues>({
    resolver: zodResolver(printerFormSchema),
    defaultValues: emptyPrinterForm,
  })

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        model: existing.model ?? '',
        build_volume_x: existing.build_volume_x ?? undefined,
        build_volume_y: existing.build_volume_y ?? undefined,
        build_volume_z: existing.build_volume_z ?? undefined,
        status: existing.status as PrinterFormValues['status'],
        notes: existing.notes ?? '',
      })
    }
  }, [existing, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateMut.mutateAsync(toNewPrinter(values))
        toast.success('Stampante aggiornata')
      } else {
        await createMut.mutateAsync(toNewPrinter(values))
        toast.success('Stampante creata')
      }
      navigate('/printers')
    } catch (e) { toast.error(String(e)) }
  })

  const submitting = createMut.isPending || updateMut.isPending

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifica stampante' : 'Nuova stampante'}
        actions={
          <Link to="/printers">
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
              <Input label="Nome *" {...register('name')} error={errors.name?.message} />
              <Input label="Modello" {...register('model')} error={errors.model?.message} />
            </div>

            <div>
              <label className="mb-1 block text-xs text-text-3">Volume di stampa (mm)</label>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" placeholder="X" {...register('build_volume_x')} error={errors.build_volume_x?.message} />
                <Input type="number" placeholder="Y" {...register('build_volume_y')} error={errors.build_volume_y?.message} />
                <Input type="number" placeholder="Z" {...register('build_volume_z')} error={errors.build_volume_z?.message} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-3">Stato</label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <select
                    {...field}
                    className="h-9 rounded-md border border-border bg-bg-1 px-3 text-sm text-text-1 focus:border-accent focus:outline-none"
                  >
                    {PRINTER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              />
            </div>

            <Textarea label="Note" rows={3} {...register('notes')} error={errors.notes?.message} />

            <div className="flex justify-end gap-2 pt-4">
              <Link to="/printers">
                <Button type="button" variant="secondary">Annulla</Button>
              </Link>
              <Button type="submit" loading={submitting} disabled={!isDirty && isEdit}>
                {isEdit ? 'Salva modifiche' : 'Crea stampante'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
