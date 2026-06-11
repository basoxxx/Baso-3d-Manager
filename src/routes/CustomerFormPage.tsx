import { useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { customerFormSchema, emptyCustomerForm, toNewCustomer, type CustomerFormValues } from '@/lib/customer-schema'
import { useCustomer, useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { PageHeader } from '@/components/layout/PageHeader'

export function CustomerFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing, isLoading } = useCustomer(id)
  const createMut = useCreateCustomer()
  const updateMut = useUpdateCustomer(id ?? '')

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: emptyCustomerForm,
  })

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        email: existing.email,
        phone: existing.phone ?? '',
        address: existing.address ?? '',
        vat_number: existing.vat_number ?? '',
        notes: existing.notes ?? '',
      })
    }
  }, [existing, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateMut.mutateAsync(toNewCustomer(values))
        toast.success('Cliente aggiornato')
      } else {
        await createMut.mutateAsync(toNewCustomer(values))
        toast.success('Cliente creato')
      }
      navigate('/customers')
    } catch (e) {
      toast.error(`Errore: ${(e as Error).message}`)
    }
  })

  const submitting = createMut.isPending || updateMut.isPending

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifica cliente' : 'Nuovo cliente'}
        description={isEdit ? 'Aggiorna i dati del cliente' : 'Aggiungi un nuovo cliente al gestionale'}
        actions={
          <Link to="/customers">
            <Button variant="ghost" size="sm"><ArrowLeft size={14} /> Torna alla lista</Button>
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4 p-6">
        {isLoading && isEdit ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-bg-1" />
            ))}
          </div>
        ) : (
          <>
            <Input label="Nome *" {...register('name')} error={errors.name?.message} />
            <Input label="Email *" type="email" {...register('email')} error={errors.email?.message} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Telefono" {...register('phone')} error={errors.phone?.message} />
              <Input label="P.IVA / CF" {...register('vat_number')} error={errors.vat_number?.message} />
            </div>
            <Textarea label="Indirizzo" rows={2} {...register('address')} error={errors.address?.message} />
            <Textarea label="Note" rows={3} {...register('notes')} error={errors.notes?.message} />

            <div className="flex justify-end gap-2 pt-4">
              <Link to="/customers">
                <Button type="button" variant="secondary">Annulla</Button>
              </Link>
              <Button type="submit" loading={submitting} disabled={!isDirty && isEdit}>
                {isEdit ? 'Salva modifiche' : 'Crea cliente'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
