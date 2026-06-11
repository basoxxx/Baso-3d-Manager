import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReactTable, getCoreRowModel, getSortedRowModel, type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useCustomers, useDeleteCustomer, type Customer } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [toDelete, setToDelete] = useState<Customer | null>(null)

  const navigate = useNavigate()
  const { data, isLoading } = useCustomers(debouncedSearch)
  const deleteMut = useDeleteCustomer()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(t)
  }, [search])

  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    { accessorKey: 'name', header: 'Nome', cell: (c) => <span className="font-medium">{c.row.original.name}</span> },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Telefono', cell: (c) => c.row.original.phone ?? '—' },
    { accessorKey: 'vat_number', header: 'P.IVA', cell: (c) => c.row.original.vat_number ?? '—' },
    {
      id: 'actions', header: '', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => navigate(`/customers/${row.original.id}`)}
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
      toast.success('Cliente eliminato')
      setToDelete(null)
    } catch (e) {
      toast.error(`Errore: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <PageHeader
        title="Clienti"
        description="Gestione anagrafica clienti"
        actions={
          <Link to="/customers/new">
            <Button><Plus size={14} /> Nuovo cliente</Button>
          </Link>
        }
      />

      <div className="space-y-4 p-6">
        <div className="max-w-sm">
          <Input
            placeholder="Cerca per nome o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Table
          table={table}
          isLoading={isLoading}
          empty={
            <EmptyState
              title={search ? 'Nessun cliente trovato' : 'Nessun cliente ancora'}
              description={search ? 'Prova a cambiare i termini di ricerca' : 'Aggiungi il primo cliente per iniziare'}
              action={
                !search && (
                  <Link to="/customers/new">
                    <Button><Plus size={14} /> Aggiungi cliente</Button>
                  </Link>
                )
              }
            />
          }
        />
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Elimina cliente"
        description={`Sei sicuro di voler eliminare ${toDelete?.name}? L'operazione è reversibile solo tramite backup.`}
        confirmLabel="Elimina"
        destructive
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
