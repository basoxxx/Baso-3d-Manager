import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ipc } from '@/lib/ipc'
import type { Settings } from '@/lib/db-types'
import type { SettingsFormValues } from '@/lib/settings-schema'

export const settingsKeys = {
  all: ['settings'] as const,
}

export function useSettings() {
  return useQuery({ queryKey: settingsKeys.all, queryFn: () => ipc.settings.get() })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SettingsFormValues) => ipc.settings.update(input),
    onSuccess: (data) => qc.setQueryData(settingsKeys.all, data),
  })
}

export type { Settings }
