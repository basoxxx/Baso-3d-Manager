/**
 * React Query bindings for the in-app notification center. The
 * hook exposes list/mark-read/mark-all-read/delete and a polling
 * unread count so the bell badge in the TopBar updates without
 * needing a full refetch.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ipc } from '@/lib/ipc'
import type { Notification } from '@/lib/db-types.generated'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (unreadOnly = false) =>
    [...notificationKeys.all, 'list', unreadOnly] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

export function useNotifications(opts: { unreadOnly?: boolean; limit?: number } = {}) {
  return useQuery({
    queryKey: notificationKeys.list(opts.unreadOnly ?? false),
    queryFn: () => ipc.notifications.list({ unread_only: opts.unreadOnly, limit: opts.limit }),
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => ipc.notifications.unreadCount(),
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ipc.notifications.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => ipc.notifications.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ipc.notifications.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function usePushNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      kind: 'overdue_order' | 'low_stock' | 'app_update_available' | 'backup_ok' | 'error'
      title: string
      body: string
      data?: unknown
    }) => ipc.notifications.push(input),
    onSuccess: (n: Notification) => {
      qc.invalidateQueries({ queryKey: notificationKeys.all })
      return n
    },
  })
}
