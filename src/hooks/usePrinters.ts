import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ipc } from '@/lib/ipc'
import type { Printer } from '@/lib/db-types'
import type { NewPrinter } from '@/lib/printer-schema'

export const printerKeys = {
  all: ['printers'] as const,
  list: () => [...printerKeys.all, 'list'] as const,
  detail: (id: string) => [...printerKeys.all, 'detail', id] as const,
}

export function usePrinters() {
  return useQuery({ queryKey: printerKeys.list(), queryFn: () => ipc.printers.list() })
}

export function usePrinter(id: string | undefined) {
  return useQuery({
    queryKey: printerKeys.detail(id ?? ''),
    queryFn: () => ipc.printers.get(id!),
    enabled: !!id,
  })
}

export function useCreatePrinter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewPrinter) => ipc.printers.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: printerKeys.all }),
  })
}

export function useUpdatePrinter(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewPrinter) => ipc.printers.update(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: printerKeys.all })
      qc.setQueryData(printerKeys.detail(id), data)
    },
  })
}

export function useDeletePrinter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ipc.printers.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: printerKeys.all }),
  })
}

export type { Printer, NewPrinter }
