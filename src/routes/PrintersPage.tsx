import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReactTable, getCoreRowModel, getSortedRowModel, type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePrinters, useDeletePrinter, type Printer } from '@/hooks/usePrinters'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  maintenance: 'warning',
  retired: 'neutral',
}

export function PrintersPage() {
  const [toDelete, setToDelete] = useState<Printer | null>(null)
  const navigate = useNavigate()
  const { data, isLoading } = usePrinters()
  const deleteMut = useDeletePrinter()

  const columns = useMemo<ColumnDef<Printer>[]>(() => [
    { accessorKey: 'name', header: 'Nome', cell: (c) => <span className="font-medium">{c.row.original.name}</span> },
    { accessorKey: 'model', header: 'Modello', cell: (c) => c.row.original.model ?? '—' },
    {
      id: 'volume', header: 'Volume (mm)',
      cell: ({ row }) => {
        const { build_volume_x: x, build_volume_y: y, build_volume_z: z } = row.original
        if (!x || !y || !z) return '—'
        return `${x} × ${y} × ${z}`
      },
    },
    {
      accessorKey: 'status', header: 'Stato',
      cell: (c) => <Badge tone={STATUS_TONE[c.row.original.status] ?? 'neutral'}>{c.row.original.status}</Badge>,
    },
    {
      id: 'actions', header: '', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => navigate(`/printers/${row.original.id}`)}
            className="rounded p-1.5 text-text-3 hover:bg-bg-2 hover:text-text-1"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setToDelete(row.original)}
            className="rounded p-1.5 text-text-3 hover:bg-bg-2 hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [navigate])

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteMut.mutateAsync(toDelete.id)
      toast.success('Stampante eliminata')
      setToDelete(null)
    } catch (e) { toast.error(String(e)) }
  }

  return (
    <div>
      <PageHeader
        title="Stampanti"
        description="Lista stampanti del laboratorio"
        actions={
          <Link to="/printers/new">
            <Button><Plus size={14} /> Nuova stampante</Button>
          </Link>
        }
      />
      <div className="space-y-4 p-6">
        <Table
          table={table}
          isLoading={isLoading}
          empty={
            <EmptyState
              title="Nessuna stampante"
              description="Aggiungi la prima stampante"
              action={
                <Link to="/printers/new">
                  <Button><Plus size={14} /> Aggiungi stampante</Button>
                </Link>
              }
            />
          }
        />
      </div>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Elimina stampante"
        description={`Eliminare ${toDelete?.name}?`}
        destructive
        confirmLabel="Elimina"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
