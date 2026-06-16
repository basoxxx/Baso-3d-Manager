/**
 * React Query hook for the stock audit log. Returns the entries for
 * a specific filament (when `filamentId` is provided) or the most
 * recent entries across all filaments.
 */
import { useQuery } from '@tanstack/react-query'
import { ipc } from '@/lib/ipc'

export const stockAuditKeys = {
  all: ['stock-audit'] as const,
  list: (filament_id?: string) =>
    [...stockAuditKeys.all, 'list', filament_id ?? ''] as const,
}

export function useStockAudit(opts: { filament_id?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: stockAuditKeys.list(opts.filament_id),
    queryFn: () => ipc.stockAudit.list(opts),
  })
}
