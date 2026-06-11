import { useQuery } from '@tanstack/react-query'
import { ipc } from '@/lib/ipc'
import type { DashboardData } from '@/lib/dashboard-types'

export const dashboardKeys = {
  all: ['dashboard'] as const,
}

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: () => ipc.dashboard.get(),
    staleTime: 60_000,
  })
}

export type { DashboardData }
