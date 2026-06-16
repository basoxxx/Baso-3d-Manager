import { Search } from 'lucide-react'
import { UpdateIndicator } from './UpdateIndicator'
import { NotificationBell } from '@/components/notifications'

interface TopBarProps {
  onOpenPalette: () => void
}

export function TopBar({ onOpenPalette }: TopBarProps) {
  return (
    <header className="flex h-14 items-center border-b border-border bg-bg-1 px-4">
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex w-full max-w-md items-center gap-2 rounded-md border border-border bg-bg-2 px-3 py-1.5 text-left text-sm text-text-3 transition-colors hover:border-accent/40 hover:text-text-2"
        aria-label="Apri palette comandi"
      >
        <Search size={14} />
        <span>Cerca…</span>
        <kbd className="ml-auto rounded border border-border bg-bg-1 px-1.5 text-[10px] text-text-2">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <UpdateIndicator />
      </div>
    </header>
  )
}
