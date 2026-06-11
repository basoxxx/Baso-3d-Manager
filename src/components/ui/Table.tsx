import { flexRender, type Table as TanTable } from '@tanstack/react-table'
import type { ReactNode } from 'react'

interface TableProps<T> {
  table: TanTable<T>
  empty?: ReactNode
  isLoading?: boolean
}

export function Table<T>({ table, empty, isLoading }: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-bg-1" />
        ))}
      </div>
    )
  }

  if (table.getRowModel().rows.length === 0) {
    return <>{empty}</>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-bg-1 text-xs uppercase text-text-3">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-3 py-2 text-left font-medium">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-border transition-colors hover:bg-bg-1"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 text-text-1">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
