/**
 * Bell icon + unread badge for the TopBar. Clicking opens the
 * NotificationPanel popover.
 */
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useUnreadNotificationCount } from '@/hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'

export function NotificationBell() {
  const { data: unread = 0 } = useUnreadNotificationCount()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg-2 text-text-2 hover:bg-bg-3 hover:text-text-1"
        aria-label="Centro notifiche"
      >
        <Bell size={14} />
        {unread > 0 && (
          <span
            data-testid="notif-badge"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  )
}
