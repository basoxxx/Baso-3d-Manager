/**
 * Hook that produces the static commands (navigation + quick actions)
 * for the command palette. Search commands (clients/orders/etc.) are
 * computed separately inside the palette so they can use the live query
 * results.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Layers,
  Printer,
  Settings,
  Database,
  FileSpreadsheet,
  Plus,
  UserPlus,
  FilePlus,
  Beaker,
  HardDrive,
} from 'lucide-react'
import { ipc } from '@/lib/ipc'
import { toast } from 'sonner'
import type { CommandAction } from './types'

/**
 * Build a static-command set. Kept as a function (not a hook body) so it
 * can be unit-tested without a router.
 */
export function buildStaticCommands(navigate: ReturnType<typeof useNavigate>): CommandAction[] {
  const nav = (to: string) => () => navigate(to)
  const run = (label: string, fn: () => Promise<unknown>) => async () => {
    try {
      const result = await fn()
      if (typeof result === 'string' && result) {
        toast.success(`${label}: ${result}`)
      } else {
        toast.success(label)
      }
    } catch (e) {
      toast.error(`Errore: ${String(e)}`)
    }
  }

  return [
    // --- Navigazione
    {
      id: 'nav.dashboard',
      group: 'Navigazione',
      label: 'Vai a Dashboard',
      hint: '/',
      icon: LayoutDashboard,
      keywords: ['home', 'panoramica'],
      perform: nav('/'),
    },
    {
      id: 'nav.customers',
      group: 'Navigazione',
      label: 'Vai a Clienti',
      hint: '/customers',
      icon: Users,
      keywords: ['cliente', 'anagrafica'],
      perform: nav('/customers'),
    },
    {
      id: 'nav.orders',
      group: 'Navigazione',
      label: 'Vai a Ordini',
      hint: '/orders',
      icon: ClipboardList,
      keywords: ['ordine', 'preventivo'],
      perform: nav('/orders'),
    },
    {
      id: 'nav.filaments',
      group: 'Navigazione',
      label: 'Vai a Filamenti',
      hint: '/filaments',
      icon: Layers,
      keywords: ['magazzino', 'filamento', 'stock'],
      perform: nav('/filaments'),
    },
    {
      id: 'nav.printers',
      group: 'Navigazione',
      label: 'Vai a Stampanti',
      hint: '/printers',
      icon: Printer,
      keywords: ['stampante', 'parco'],
      perform: nav('/printers'),
    },
    {
      id: 'nav.settings',
      group: 'Navigazione',
      label: 'Vai a Impostazioni',
      hint: '/settings',
      icon: Settings,
      keywords: ['configurazione', 'tariffa', 'iva'],
      perform: nav('/settings'),
    },
    {
      id: 'nav.backup',
      group: 'Navigazione',
      label: 'Vai a Esporta & Backup',
      hint: '/backup',
      icon: Database,
      keywords: ['csv', 'zip', 'esporta'],
      perform: nav('/backup'),
    },

    // --- Crea
    {
      id: 'create.customer',
      group: 'Crea',
      label: 'Nuovo cliente',
      hint: 'Apre il form vuoto',
      icon: UserPlus,
      keywords: ['cliente', 'aggiungi', 'nuovo'],
      perform: nav('/customers/new'),
    },
    {
      id: 'create.order',
      group: 'Crea',
      label: 'Nuovo ordine',
      hint: 'Apre il form vuoto',
      icon: FilePlus,
      keywords: ['ordine', 'preventivo', 'aggiungi', 'nuovo'],
      perform: nav('/orders/new'),
    },
    {
      id: 'create.filament',
      group: 'Crea',
      label: 'Nuovo filamento',
      hint: 'Apre il form vuoto',
      icon: Beaker,
      keywords: ['filamento', 'magazzino', 'aggiungi', 'nuovo'],
      perform: nav('/filaments/new'),
    },
    {
      id: 'create.printer',
      group: 'Crea',
      label: 'Nuova stampante',
      hint: 'Apre il form vuoto',
      icon: Plus,
      keywords: ['stampante', 'aggiungi', 'nuova'],
      perform: nav('/printers/new'),
    },

    // --- Azioni rapide
    {
      id: 'action.export_orders_csv',
      group: 'Azioni',
      label: 'Esporta CSV ordini',
      hint: 'Salva sul disco',
      icon: FileSpreadsheet,
      keywords: ['csv', 'ordini', 'esporta'],
      perform: run('CSV ordini salvato', () => ipc.exportData.csv('orders')),
    },
    {
      id: 'action.export_filaments_csv',
      group: 'Azioni',
      label: 'Esporta CSV filamenti',
      hint: 'Salva sul disco',
      icon: FileSpreadsheet,
      keywords: ['csv', 'filamenti', 'esporta'],
      perform: run('CSV filamenti salvato', () => ipc.exportData.csv('filaments')),
    },
    {
      id: 'action.backup_export',
      group: 'Azioni',
      label: 'Crea backup ZIP',
      hint: 'Salva sul disco',
      icon: HardDrive,
      keywords: ['backup', 'zip', 'esporta'],
      perform: run('Backup salvato', () => ipc.exportData.backup()),
    },
  ]
}

/**
 * React hook wrapper. Recomputes when the router changes (cheap; the
 * array contents only depend on `navigate`).
 */
export function useStaticCommands(): CommandAction[] {
  const navigate = useNavigate()
  return useMemo(() => buildStaticCommands(navigate), [navigate])
}
