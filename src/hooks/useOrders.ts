import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ipc, type OrderWithItems, type NewOrder } from '@/lib/ipc'
import type { Order, OrderStatus } from '@/lib/db-types'

export const orderKeys = {
  all: ['orders'] as const,
  list: (status?: OrderStatus, customer_id?: string) =>
    [...orderKeys.all, 'list', status ?? '', customer_id ?? ''] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
}

export function useOrders(filters?: { status?: OrderStatus; customer_id?: string }) {
  return useQuery({
    queryKey: orderKeys.list(filters?.status, filters?.customer_id),
    queryFn: () => ipc.orders.list(filters),
  })
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    queryFn: () => ipc.orders.get(id!),
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewOrder) => ipc.orders.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  })
}

export function useUpdateOrder(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewOrder) => ipc.orders.update(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: orderKeys.all })
      qc.setQueryData(orderKeys.detail(id), data)
    },
  })
}

export function useSetOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ipc.orders.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ipc.orders.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  })
}

export type { Order, OrderStatus, OrderWithItems, NewOrder }
