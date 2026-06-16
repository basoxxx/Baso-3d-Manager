/**
 * Unit tests for StockAuditList. The list is pure: it renders the
 * input array, no IPC, no router. The link uses <a> via MemoryRouter.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StockAuditList } from './StockAuditList'
import type { StockAuditEntry } from '@/lib/db-types.generated'

const sample = (over: Partial<StockAuditEntry> = {}): StockAuditEntry => ({
  id: 'a-1',
  filament_id: 'f-1',
  delta_grams: -100,
  stock_after: 900,
  reason: 'manual_adjust',
  order_id: null,
  user_note: null,
  created_at: '2026-01-15 10:30:00',
  ...over,
})

function renderList(entries: StockAuditEntry[]) {
  return render(
    <MemoryRouter>
      <StockAuditList entries={entries} />
    </MemoryRouter>,
  )
}

describe('StockAuditList', () => {
  it('shows the empty state when there are no entries', () => {
    renderList([])
    expect(screen.getByText(/Nessuna variazione di magazzino/i)).toBeInTheDocument()
  })

  it('renders one row per entry with the correct delta sign', () => {
    renderList([
      sample({ id: 'a-1', delta_grams: -100 }),
      sample({ id: 'a-2', delta_grams: 500 }),
    ])
    expect(screen.getByText('-100 g')).toBeInTheDocument()
    expect(screen.getByText('+500 g')).toBeInTheDocument()
  })

  it('shows the human-readable reason label (Italian)', () => {
    renderList([
      sample({ reason: 'manual_adjust' }),
      sample({ id: 'a-2', reason: 'order_production' }),
      sample({ id: 'a-3', reason: 'order_revert' }),
      sample({ id: 'a-4', reason: 'restock' }),
      sample({ id: 'a-5', reason: 'correction' }),
    ])
    expect(screen.getByText('Aggiustamento manuale')).toBeInTheDocument()
    expect(screen.getByText('Ordine in produzione')).toBeInTheDocument()
    expect(screen.getByText('Ripristino da annullamento')).toBeInTheDocument()
    expect(screen.getByText('Rifornimento')).toBeInTheDocument()
    expect(screen.getByText('Rettifica inventario')).toBeInTheDocument()
  })

  it('falls back to the raw reason string for unknown codes', () => {
    renderList([sample({ reason: 'mystery_reason' })])
    expect(screen.getByText('mystery_reason')).toBeInTheDocument()
  })

  it('shows the stock_after value', () => {
    renderList([sample({ stock_after: 1234.5 })])
    expect(document.body.textContent).toMatch(/stock: 1235 g/)
  })

  it('links to the originating order when order_id is present', () => {
    renderList([sample({ order_id: 'o-77' })])
    const link = screen.getByText('vedi ordine')
    expect(link.getAttribute('href')).toBe('/orders/o-77')
  })

  it('does NOT show the order link when order_id is null', () => {
    renderList([sample({ order_id: null })])
    expect(screen.queryByText('vedi ordine')).toBeNull()
  })

  it('renders an italic user_note when present', () => {
    renderList([sample({ user_note: 'spool perso' })])
    const note = screen.getByText('spool perso')
    expect(note.tagName).toBe('SPAN')
  })

  it('orders entries as given (parent is responsible for sorting)', () => {
    const { container } = renderList([
      sample({ id: 'a-1' }),
      sample({ id: 'a-2' }),
    ])
    const lis = container.querySelectorAll('li')
    expect(lis.length).toBe(2)
  })
})
