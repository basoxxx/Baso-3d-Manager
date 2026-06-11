import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReactTable, getCoreRowModel, getSortedRowModel, type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, PlusCircle, MinusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useFilaments, useDeleteFilament, useAdjustFilamentStock, type Filament } from '@/hooks/useFilaments'
import { FILAMENT_MATERIALS } from '@/lib/filament-schema'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StockBadge } from '@/components/domain/filaments/StockBadge'

export function FilamentsPage() {
  const [filter, setFilter] = useState<string>('')
  const [toDelete, setToDelete] = useState<Filament | null>(null)
  const navigate = useNavigate()
  const { data, isLoading } = useFilaments(filter || undefined)
  const deleteMut = useDeleteFilament()
  const adjustMut = useAdjustFilamentStock()

  useEffect(() => { /* placeholder for filter debounce if needed */ }, [filter])

  const columns = useMemo<ColumnDef<Filament>[]>(() => [
    { accessorKey: 'brand', header: 'Marca', cell: (c) => <span className="font-medium">{c.row.original.brand}</span> },
    { accessorKey: 'material', header: 'Materiale' },
    { accessorKey: 'color', header: 'Colore', cell: (c) => c.row.original.color ?? '—' },
    { accessorKey: 'diameter', header: 'Ø (mm)', cell: (c) => c.row.original.diameter.toFixed(2) },
    { accessorKey: 'price_per_kg', header: '€/kg', cell: (c) => `€${c.row.original.price_per_kg.toFixed(2)}` },
    {
      accessorKey: 'stock_grams', header: 'Stock (g)',
      cell: (c) => (
        <div className="flex items-center gap-2">
          <span>{c.row.original.stock_grams.toFixed(0)}</span>
          <StockBadge filament={c.row.original} />
        </div>
      ),
    },
    {
      id: 'quick', header: '', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={async (e) => {
              e.stopPropagation()
              try {
                await adjustMut.mutateAsync({ id: row.original.id, delta_grams: 100 })
                toast.success('+100g aggiunti')
              } catch (err) { toast.error(String(err)) }
            }}
            className="rounded p-1 text-text-3 hover:bg-bg-2 hover:text-success"
            title="+100g"
          >
            <PlusCircle size={14} />
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation()
              try {
                await adjustMut.mutateAsync({ id: row.original.id, delta_grams: -100 })
                toast.success('-100g scalati')
              } catch (err) { toast.error(String(err)) }
            }}
            className="rounded p-1 text-text-3 hover:bg-bg-2 hover:text-warning"
            title="-100g"
          >
            <MinusCircle size={14} />
          </button>
        </div>
      ),
    },
    {
      id: 'actions', header: '', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => navigate(`/filaments/${row.original.id}`)}
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
  ], [navigate, adjustMut])

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
      toast.success('Filamento eliminato')
      setToDelete(null)
    } catch (e) { toast.error(String(e)) }
  }

  return (
    <div>
      <PageHeader
        title="Filamenti"
        description="Magazzino filamenti per materiale e colore"
        actions={
          <Link to="/filaments/new">
            <Button><Plus size={14} /> Nuovo filamento</Button>
          </Link>
        }
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('')}
            className={`rounded-md px-3 py-1.5 text-xs ${filter === '' ? 'bg-accent text-white' : 'bg-bg-2 text-text-2 hover:bg-bg-3'}`}
          >
            Tutti
          </button>
          {FILAMENT_MATERIALS.map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`rounded-md px-3 py-1.5 text-xs ${filter === m ? 'bg-accent text-white' : 'bg-bg-2 text-text-2 hover:bg-bg-3'}`}
            >
              {m}
            </button>
          ))}
        </div>

        <Table
          table={table}
          isLoading={isLoading}
          empty={
            <EmptyState
              title="Nessun filamento"
              description="Aggiungi il primo filamento al magazzino"
              action={
                <Link to="/filaments/new">
                  <Button><Plus size={14} /> Aggiungi filamento</Button>
                </Link>
              }
            />
          }
        />
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Elimina filamento"
        description={`Eliminare ${toDelete?.brand} ${toDelete?.material}?`}
        confirmLabel="Elimina"
        destructive
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
