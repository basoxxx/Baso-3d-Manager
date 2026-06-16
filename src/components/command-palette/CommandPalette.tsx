/**
 * Command palette. Toggled with ⌘K (or Ctrl+K on Windows/Linux).
 *
 * Renders a Radix Dialog containing the `cmdk` keyboard-driven list.
 *   - Static commands (navigation, create, export, backup) are always
 *     available and ranked by `cmdk`'s built-in fuzzy matcher.
 *   - Search commands (per-record) are computed live from the latest
 *     customers/orders/filaments/printers query data, gated behind a
 *     2-character query so the palette isn't flooded on open.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { Search, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { useCustomers } from '@/hooks/useCustomers'
import { useOrders } from '@/hooks/useOrders'
import { useFilaments } from '@/hooks/useFilaments'
import { usePrinters } from '@/hooks/usePrinters'
import { useStaticCommands } from './useCommands'
import { buildSearchCommands } from './buildSearchCommands'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  // Reset the query when the palette closes (otherwise re-opening shows
  // the stale filter and a stale `requiresQuery` set).
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  // Data sources — only used to compute search commands when the user
  // has typed at least 2 chars.
  const { data: customers = [] } = useCustomers()
  const { data: orders = [] } = useOrders()
  const { data: filaments = [] } = useFilaments()
  const { data: printers = [] } = usePrinters()

  const staticCommands = useStaticCommands()

  const searchCommands = useMemo(
    () =>
      buildSearchCommands({
        customers,
        orders,
        filaments,
        printers,
        navigate,
        query,
      }),
    [customers, orders, filaments, printers, navigate, query],
  )

  const allCommands = useMemo(
    () => [...staticCommands, ...searchCommands],
    [staticCommands, searchCommands],
  )

  // Group-preserve order: Navigation, Clienti/Ordini/Filamenti/Stampanti
  // (intermixed by query), Crea, Azioni.
  const groups = useMemo(() => {
    const order: string[] = []
    for (const c of allCommands) {
      if (!order.includes(c.group)) order.push(c.group)
    }
    return order
  }, [allCommands])

  // cmdk will only render commands whose `keywords` field is searched
  // against the visible string. The default `filter` callback uses
  // fuzzy match on `label + value + keywords`; we use it as-is.
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-bg-1 shadow-2xl"
              >
                <Dialog.Title className="sr-only">Palette comandi</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Cerca e apri clienti, ordini, filamenti, stampanti o
                  azioni rapide. Premi Esc per chiudere.
                </Dialog.Description>
                <Command
                  label="Palette comandi"
                  shouldFilter
                  loop
                  className="flex max-h-[60vh] flex-col"
                >
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <Search size={16} className="text-text-3" />
                    <Command.Input
                      autoFocus
                      value={query}
                      onValueChange={setQuery}
                      placeholder="Cerca un cliente, ordine, filamento, stampante o azione…"
                      className="flex-1 bg-transparent text-sm text-text-1 placeholder:text-text-3 focus:outline-none"
                    />
                    <kbd className="rounded border border-border bg-bg-2 px-1.5 text-[10px] text-text-3">
                      Esc
                    </kbd>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="ml-1 rounded p-1 text-text-3 hover:bg-bg-2 hover:text-text-1"
                        aria-label="Chiudi"
                      >
                        <X size={14} />
                      </button>
                    </Dialog.Close>
                  </div>

                  <Command.List className="flex-1 overflow-y-auto p-2">
                    <Command.Empty className="px-3 py-6 text-center text-sm text-text-3">
                      Nessun risultato. Prova un altro termine.
                    </Command.Empty>

                    {groups.map((g) => (
                      <Command.Group
                        key={g}
                        heading={g}
                        className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-3"
                      >
                        {allCommands
                          .filter((c) => c.group === g)
                          .map((c) => {
                            const Icon = c.icon
                            return (
                              <Command.Item
                                key={c.id}
                                value={`${c.label} ${(c.keywords ?? []).join(' ')}`}
                                onSelect={async () => {
                                  await c.perform()
                                  onOpenChange(false)
                                }}
                                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-text-1 aria-selected:bg-bg-2 data-[selected=true]:bg-bg-2"
                              >
                                {Icon && <Icon size={14} className="text-text-3" />}
                                <span className="flex-1 truncate">{c.label}</span>
                                {c.hint && (
                                  <span className="ml-auto truncate text-xs text-text-3">
                                    {c.hint}
                                  </span>
                                )}
                              </Command.Item>
                            )
                          })}
                      </Command.Group>
                    ))}
                  </Command.List>

                  <div className="flex items-center justify-between border-t border-border bg-bg-2 px-3 py-2 text-[10px] text-text-3">
                    <span>
                      <kbd className="rounded border border-border bg-bg-1 px-1">↑</kbd>{' '}
                      <kbd className="rounded border border-border bg-bg-1 px-1">↓</kbd>{' '}
                      naviga{'  '}
                      <kbd className="rounded border border-border bg-bg-1 px-1">↵</kbd>{' '}
                      seleziona
                    </span>
                    <span>{allCommands.length} comandi</span>
                  </div>
                </Command>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
