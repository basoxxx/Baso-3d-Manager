import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { useCustomers } from '@/hooks/useCustomers'

interface CustomerPickerProps {
  value: string | null
  onChange: (id: string | null) => void
  error?: string
}

export function CustomerPicker({ value, onChange, error }: CustomerPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data: customers } = useCustomers(search)

  const selected = customers?.find((c) => c.id === value)

  return (
    <div className="relative">
      <label className="mb-1 block text-xs text-text-3">Cliente *</label>
      {selected ? (
        <div className="flex items-center justify-between rounded-md border border-border bg-bg-1 px-3 py-2">
          <div>
            <div className="text-sm font-medium text-text-1">{selected.name}</div>
            <div className="text-xs text-text-3">{selected.email}</div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded p-1 text-text-3 hover:bg-bg-2 hover:text-text-1"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full items-center gap-2 rounded-md border bg-bg-1 px-3 py-2 text-left text-sm text-text-3 hover:border-accent ${
            error ? 'border-danger' : 'border-border'
          }`}
        >
          <Search size={14} />
          Seleziona cliente…
        </button>
      )}

      {open && !selected && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-bg-1 shadow-2xl">
          <div className="sticky top-0 border-b border-border bg-bg-1 p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca…"
              className="h-8 w-full rounded border border-border bg-bg-2 px-2 text-sm text-text-1 focus:border-accent focus:outline-none"
            />
          </div>
          <div className="p-1">
            {customers?.length === 0 ? (
              <div className="p-3 text-center text-xs text-text-3">Nessun cliente</div>
            ) : (
              customers?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setOpen(false); setSearch('') }}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-text-1 hover:bg-bg-2"
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-text-3">{c.email}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
