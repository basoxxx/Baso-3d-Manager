/**
 * Unit tests for OverdueList.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OverdueList } from './OverdueList'
import type { OverdueOrder } from '@/lib/db-types.generated'

const sample = (over: Partial<OverdueOrder> = {}): OverdueOrder => ({
  id: 'o-1',
  customer_id: 'c-1',
  customer_name: 'Acme',
  status: 'in_produzione',
  created_at: '2025-05-01T00:00:00Z',
  days_old: 20,
  ...over,
})

function renderList(orders: OverdueOrder[]) {
  return render(
    <MemoryRouter>
      <OverdueList orders={orders} />
    </MemoryRouter>,
  )
}

describe('OverdueList', () => {
  it('shows the empty state when there are no overdue orders', () => {
    renderList([])
    expect(screen.getByText(/Nessun ordine in ritardo/i)).toBeInTheDocument()
  })

  it('renders one row per order', () => {
    renderList([
      sample({ id: 'o-1', customer_name: 'CustA' }),
      sample({ id: 'o-2', customer_name: 'CustB' }),
    ])
    expect(screen.getByText('CustA')).toBeInTheDocument()
    expect(screen.getByText('CustB')).toBeInTheDocument()
  })

  it('shows the age in days with a + prefix', () => {
    renderList([sample({ days_old: 25 })])
    expect(screen.getByText('+25gg')).toBeInTheDocument()
  })

  it('links each row to the order detail', () => {
    renderList([sample({ id: 'o-77' })])
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/orders/o-77')
  })

  it('shows the status badge in the row (Italian label)', () => {
    renderList([sample({ status: 'draft' })])
    // StatusBadge renders the Italian label
    expect(screen.getByText('Bozza')).toBeInTheDocument()
  })
})
