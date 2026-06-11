import { Search } from 'lucide-react'
import { UpdateIndicator } from './UpdateIndicator'

export function TopBar() {
  return (
    <header className="flex h-14 items-center border-b border-border bg-bg-1 px-4">
      <div className="flex w-full max-w-md items-center gap-2 rounded-md border border-border bg-bg-2 px-3 py-1.5 text-sm text-text-3">
        <Search size={14} />
        <span>Cerca…</span>
        <kbd className="ml-auto rounded border border-border bg-bg-1 px-1.5 text-[10px] text-text-2">⌘K</kbd>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <UpdateIndicator />
      </div>
    </header>
  )
}
