/**
 * Unit tests for LowStockList. Pure: just renders the input array,
 * no IPC, no router (we use MemoryRouter for the Link <a>).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LowStockList } from './LowStockList'
import type { LowStockFilament } from '@/lib/db-types.generated'

const sample = (over: Partial<LowStockFilament> = {}): LowStockFilament => ({
  id: 'f-1',
  brand: 'Prusament',
  material: 'PLA',
  color: 'Galaxy Black',
  stock_grams: 100,
  low_stock_threshold: 500,
  ...over,
})

function renderList(filaments: LowStockFilament[]) {
  return render(
    <MemoryRouter>
      <LowStockList filaments={filaments} />
    </MemoryRouter>,
  )
}

describe('LowStockList', () => {
  it('shows the empty state when there are no filaments', () => {
    renderList([])
    expect(screen.getByText(/sopra soglia/i)).toBeInTheDocument()
  })

  it('renders one row per filament', () => {
    renderList([
      sample({ id: 'f-1', brand: 'AlphaBrand' }),
      sample({ id: 'f-2', brand: 'BetaBrand' }),
    ])
    expect(screen.getByText(/AlphaBrand/)).toBeInTheDocument()
    expect(screen.getByText(/BetaBrand/)).toBeInTheDocument()
  })

  it('shows the material next to the brand', () => {
    renderList([sample({ brand: 'Polymaker', material: 'PETG' })])
    expect(screen.getByText(/Polymaker/)).toBeInTheDocument()
    expect(screen.getByText(/PETG/)).toBeInTheDocument()
  })

  it('shows the color in parentheses when present', () => {
    renderList([sample({ color: 'Galaxy Black' })])
    expect(screen.getByText(/Galaxy Black/)).toBeInTheDocument()
  })

  it('shows stock and threshold values in the description', () => {
    renderList([sample({ stock_grams: 100, low_stock_threshold: 500 })])
    expect(screen.getByText(/100 g \/ soglia 500 g/)).toBeInTheDocument()
  })

  it('computes a 0% badge for empty stock', () => {
    renderList([sample({ stock_grams: 0, low_stock_threshold: 500 })])
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('computes the percentage as stock/threshold*100', () => {
    renderList([sample({ stock_grams: 250, low_stock_threshold: 500 })])
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('skips the percentage when threshold is 0 (avoid divide-by-zero)', () => {
    renderList([sample({ stock_grams: 100, low_stock_threshold: 0 })])
    // No percentage badge rendered; the description still shows the numbers.
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('links each row to the filament detail', () => {
    renderList([sample({ id: 'f-42' })])
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/filaments/f-42')
  })
})
