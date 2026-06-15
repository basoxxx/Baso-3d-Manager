/**
 * Command palette — the types a command producer needs to know about.
 *
 * Two flavours of command:
 *   - "static"  : always available, e.g. "Vai a Clienti", "Esporta CSV"
 *   - "search"  : produced on-the-fly by querying a data source
 *                 (customers, orders, filaments, printers) and turning
 *                 each hit into a command that navigates to its detail
 *                 page
 */
import type { LucideIcon } from 'lucide-react'

export interface CommandAction {
  /** Stable id. Used by `cmdk` for active highlighting and tests. */
  id: string
  /** Group label, e.g. "Clienti", "Ordini", "Navigazione". */
  group: string
  /** Title shown in the list. */
  label: string
  /** One-line description, shown to the right of the title. */
  hint?: string
  /** Icon shown to the left of the title. */
  icon?: LucideIcon
  /** Free-text search keywords (matched against the user query). */
  keywords?: string[]
  /** What to do when the user picks this command. */
  perform: () => void | Promise<void>
  /**
   * When true, the command is hidden unless the user has typed at least
   * 2 characters. Used for search results so the palette isn't
   * cluttered with hundreds of items on open.
   */
  requiresQuery?: boolean
}

export interface CommandGroup {
  id: string
  label: string
}
