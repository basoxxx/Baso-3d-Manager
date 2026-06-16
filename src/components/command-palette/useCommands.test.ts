/**
 * Unit tests for `buildStaticCommands` — the static (always-available)
 * command set. Verifies:
 *   - all 4 groups are present (Navigazione, Crea, Azioni)
 *   - each navigation command routes to the right URL
 *   - create-* commands route to the right "new" URL
 *   - export/backup actions call the right IPC command
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildStaticCommands } from './useCommands'

// Mock the `ipc` and `sonner` modules so the actions don't actually
// hit the IPC bridge.
vi.mock('@/lib/ipc', () => ({
  ipc: {
    exportData: {
      csv: vi.fn(async (_domain: string) => '/tmp/out.csv'),
      backup: vi.fn(async () => '/tmp/baso.zip'),
    },
  },
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ipc } from '@/lib/ipc'

const NAV = vi.fn()

const commands = () => buildStaticCommands(NAV as unknown as ReturnType<typeof Object>)

beforeEach(() => {
  NAV.mockReset()
})

describe('buildStaticCommands', () => {
  it('includes all 4 groups', () => {
    const groups = new Set(commands().map((c) => c.group))
    expect(groups).toEqual(new Set(['Navigazione', 'Crea', 'Azioni']))
  })

  it('exposes 5 quick actions (3 csv + backup + 0 nav)', () => {
    const actions = commands().filter((c) => c.group === 'Azioni')
    expect(actions).toHaveLength(5)
  })

  it('exposes one navigation command per route', () => {
    const navs = commands().filter((c) => c.group === 'Navigazione')
    const targets = new Set(navs.map((c) => c.id))
    expect(targets).toEqual(
      new Set([
        'nav.dashboard',
        'nav.customers',
        'nav.orders',
        'nav.filaments',
        'nav.printers',
        'nav.settings',
        'nav.backup',
      ]),
    )
  })

  it('navigates to the right URL when a navigation command is performed', () => {
    const all = commands()
    const c = all.find((x) => x.id === 'nav.customers')!
    c.perform()
    expect(NAV).toHaveBeenCalledWith('/customers')
  })

  it('navigates to /orders/new for the create-order command', () => {
    const c = commands().find((x) => x.id === 'create.order')!
    c.perform()
    expect(NAV).toHaveBeenCalledWith('/orders/new')
  })

  it('navigates to /customers/new for the create-customer command', () => {
    const c = commands().find((x) => x.id === 'create.customer')!
    c.perform()
    expect(NAV).toHaveBeenCalledWith('/customers/new')
  })

  it('invokes ipc.exportData.csv("orders") for the export command', async () => {
    const c = commands().find((x) => x.id === 'action.export_orders_csv')!
    await c.perform()
    expect(ipc.exportData.csv).toHaveBeenCalledWith('orders')
  })

  it('invokes ipc.exportData.csv("filaments") for the filament export', async () => {
    const c = commands().find((x) => x.id === 'action.export_filaments_csv')!
    await c.perform()
    expect(ipc.exportData.csv).toHaveBeenCalledWith('filaments')
  })

  it('invokes ipc.exportData.csv("customers") for the customer export', async () => {
    const c = commands().find((x) => x.id === 'action.export_customers_csv')!
    await c.perform()
    expect(ipc.exportData.csv).toHaveBeenCalledWith('customers')
  })

  it('invokes ipc.exportData.csv("printers") for the printer export', async () => {
    const c = commands().find((x) => x.id === 'action.export_printers_csv')!
    await c.perform()
    expect(ipc.exportData.csv).toHaveBeenCalledWith('printers')
  })

  it('invokes ipc.exportData.backup() for the backup action', async () => {
    const c = commands().find((x) => x.id === 'action.backup_export')!
    await c.perform()
    expect(ipc.exportData.backup).toHaveBeenCalled()
  })
})
