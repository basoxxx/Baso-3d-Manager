import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReactTable, getCoreRowModel, getSortedRowModel, type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useOrders, useDeleteOrder, useSetOrderStatus, type Order } from '@/hooks/useOrders'
import { ORDER_STATUSES } from '@/lib/order-schema'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/domain/orders/StatusBadge'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [toDelete, setToDelete] = useState<Order | null>(null)
  const navigate = useNavigate()
  const { data, isLoading } = useOrders({ status: statusFilter ? (statusFilter as any) : undefined })
  const deleteMut = useDeleteOrder()
  const setStatus = useSetOrderStatus()

  const columns = useMemo<ColumnDef<Order>[]>(() => [
    { accessorKey: 'customer_id', header: 'Cliente', cell: (c) => <span className="font-medium">{c.row.original.customer_id.slice(0, 8)}…</span> },
    {
      accessorKey: 'status', header: 'Stato',
      cell: (c) => <StatusBadge status={c.row.original.status} />,
    },
    {
      accessorKey: 'created_at', header: 'Data',
      cell: (c) => format(new Date(c.row.original.created_at), 'dd MMM yyyy', { locale: it }),
    },
    {
      accessorKey: 'margin_percent', header: 'Margine',
      cell: (c) => `${c.row.original.margin_percent.toFixed(1)}%`,
    },
    {
      id: 'actions', header: '', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <select
            value={row.original.status}
            onChange={async (e) => {
              try {
                await setStatus.mutateAsync({ id: row.original.id, status: e.target.value })
                toast.success('Stato aggiornato')
              } catch (err) { toast.error(String(err)) }
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-7 rounded border border-border bg-bg-1 px-1 text-xs text-text-1"
          >
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => navigate(`/orders/${row.original.id}`)}
            className="rounded p-1.5 text-text-3 hover:bg-bg-2 hover:text-text-1"
            title="Apri"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => navigate(`/orders/${row.original.id}`)}
            className="rounded p-1.5 text-text-3 hover:bg-bg-2 hover:text-text-1"
            title="Modifica"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setToDelete(row.original)}
            className="rounded p-1.5 text-text-3 hover:bg-bg-2 hover:text-danger"
            title="Elimina"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [navigate, setStatus])

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
      toast.success('Ordine eliminato')
      setToDelete(null)
    } catch (e) { toast.error(String(e)) }
  }

  return (
    <div>
      <PageHeader
        title="Ordini"
        description="Gestione preventivi e ordini di stampa"
        actions={
          <Link to="/orders/new">
            <Button><Plus size={14} /> Nuovo ordine</Button>
          </Link>
        }
      />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`rounded-md px-3 py-1.5 text-xs ${!statusFilter ? 'bg-accent text-white' : 'bg-bg-2 text-text-2 hover:bg-bg-3'}`}
          >
            Tutti
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs ${statusFilter === s ? 'bg-accent text-white' : 'bg-bg-2 text-text-2 hover:bg-bg-3'}`}
            >
              {s}
            </button>
          ))}
        </div>

        <Table
          table={table}
          isLoading={isLoading}
          empty={
            <EmptyState
              title="Nessun ordine"
              description="Crea il primo ordine per iniziare"
              action={
                <Link to="/orders/new">
                  <Button><Plus size={14} /> Nuovo ordine</Button>
                </Link>
              }
            />
          }
        />
      </div>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Elimina ordine"
        description={`Eliminare l'ordine ${toDelete?.id.slice(0, 8)}…?`}
        destructive
        confirmLabel="Elimina"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
