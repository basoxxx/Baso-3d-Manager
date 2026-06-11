import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ipc, type NewFilament } from '@/lib/ipc'
import type { Filament } from '@/lib/db-types'

export const filamentKeys = {
  all: ['filaments'] as const,
  list: (material?: string) => [...filamentKeys.all, 'list', material ?? ''] as const,
  detail: (id: string) => [...filamentKeys.all, 'detail', id] as const,
}

export function useFilaments(material?: string) {
  return useQuery({
    queryKey: filamentKeys.list(material),
    queryFn: () => ipc.filaments.list(material),
  })
}

export function useFilament(id: string | undefined) {
  return useQuery({
    queryKey: filamentKeys.detail(id ?? ''),
    queryFn: () => ipc.filaments.get(id!),
    enabled: !!id,
  })
}

export function useCreateFilament() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewFilament) => ipc.filaments.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: filamentKeys.all }),
  })
}

export function useUpdateFilament(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewFilament) => ipc.filaments.update(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: filamentKeys.all })
      qc.setQueryData(filamentKeys.detail(id), data)
    },
  })
}

export function useAdjustFilamentStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, delta_grams }: { id: string; delta_grams: number }) =>
      ipc.filaments.adjustStock(id, delta_grams),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: filamentKeys.all })
      qc.setQueryData(filamentKeys.detail(data.id), data)
    },
  })
}

export function useDeleteFilament() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ipc.filaments.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: filamentKeys.all }),
  })
}

export type { Filament, NewFilament }
