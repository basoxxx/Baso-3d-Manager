import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ipc } from '@/lib/ipc'
import type { Customer } from '@/lib/db-types'
import type { NewCustomer } from '@/lib/customer-schema'

export const customerKeys = {
  all: ['customers'] as const,
  list: (search?: string) => [...customerKeys.all, 'list', search ?? ''] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
}

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: customerKeys.list(search),
    queryFn: () => ipc.customers.list(search),
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ''),
    queryFn: () => ipc.customers.get(id!),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewCustomer) => ipc.customers.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  })
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewCustomer) => ipc.customers.update(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: customerKeys.all })
      qc.setQueryData(customerKeys.detail(id), data)
    },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ipc.customers.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  })
}

export type { Customer, NewCustomer }
