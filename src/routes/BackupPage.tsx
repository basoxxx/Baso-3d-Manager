import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Upload, Database, FileSpreadsheet, Loader2 } from 'lucide-react'
import { ipc } from '@/lib/ipc'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/layout/PageHeader'

type Action = null | 'csv-orders' | 'csv-filaments' | 'csv-customers' | 'csv-printers' | 'backup-export' | 'backup-import'

export function BackupPage() {
  const [busy, setBusy] = useState<Action>(null)

  const run = async (action: Action, fn: () => Promise<string | void>, successMsg: (p?: string) => string) => {
    if (busy) return
    setBusy(action)
    try {
      const result = await fn()
      if (typeof result === 'string' && result === '') {
        // user cancelled the dialog
        return
      }
      toast.success(typeof result === 'string' && result ? `${successMsg()}: ${result}` : successMsg())
    } catch (e) {
      toast.error(`Errore: ${String(e)}`)
    } finally {
      setBusy(null)
    }
  }

  const exportOrdersCsv = () => run('csv-orders', () => ipc.exportData.csv('orders'), () => 'CSV ordini salvato')
  const exportFilamentsCsv = () => run('csv-filaments', () => ipc.exportData.csv('filaments'), () => 'CSV filamenti salvato')
  const exportCustomersCsv = () => run('csv-customers', () => ipc.exportData.csv('customers'), () => 'CSV clienti salvato')
  const exportPrintersCsv = () => run('csv-printers', () => ipc.exportData.csv('printers'), () => 'CSV stampanti salvato')
  const exportBackup = () => run('backup-export', () => ipc.exportData.backup(), () => 'Backup salvato')
  const importBackup = () => run('backup-import', () => ipc.exportData.restore(), () => 'Backup ripristinato')

  return (
    <div>
      <PageHeader
        title="Esporta & Backup"
        description="Esporta dati in CSV o crea un backup completo del database"
      />

      <div className="space-y-6 p-6">
        <Card>
          <div className="flex items-start gap-4">
            <div className="rounded-md bg-bg-2 p-2">
              <FileSpreadsheet size={20} className="text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-text-1">Esporta CSV</h3>
              <p className="mt-1 text-xs text-text-3">
                Esporta clienti, ordini, filamenti o stampanti in formato CSV (Excel compatibile, separatore italiano)
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportOrdersCsv}
                  disabled={busy !== null}
                >
                  {busy === 'csv-orders' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Esporta ordini
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportFilamentsCsv}
                  disabled={busy !== null}
                >
                  {busy === 'csv-filaments' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Esporta filamenti
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportCustomersCsv}
                  disabled={busy !== null}
                >
                  {busy === 'csv-customers' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Esporta clienti
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportPrintersCsv}
                  disabled={busy !== null}
                >
                  {busy === 'csv-printers' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Esporta stampanti
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-4">
            <div className="rounded-md bg-bg-2 p-2">
              <Database size={20} className="text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-text-1">Backup completo</h3>
              <p className="mt-1 text-xs text-text-3">
                Salva una copia compressa dell'intero database da usare in caso di ripristino
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={exportBackup}
                  disabled={busy !== null}
                >
                  {busy === 'backup-export' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Esporta backup
                </Button>
                <Button
                  variant="secondary"
                  onClick={importBackup}
                  disabled={busy !== null}
                >
                  {busy === 'backup-import' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Importa backup
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-xs text-text-3">
          I file CSV sono codificati UTF-8 con BOM e separano i decimali con la virgola, come da standard italiano.
        </p>
      </div>
    </div>
  )
}
