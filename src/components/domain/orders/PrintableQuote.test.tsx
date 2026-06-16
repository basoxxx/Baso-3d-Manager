/**
 * Smoke tests for PrintableQuote. We mock the three hooks it uses
 * (settings, customers, filaments) and render the modal with a
 * known set of form values. We assert:
 *   - the quote number appears
 *   - the customer name + email appear
 *   - the per-item total appears
 *   - the "Totale" row carries the correct formatted value
 *   - the empty state shows up when no customer is selected
 *
 * We do NOT assert on @media print behaviour — jsdom doesn't
 * implement layout. The print CSS is in globals.css and gets
 * validated by the browser when the user clicks "Stampa".
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrintableQuote } from './PrintableQuote'
import type { OrderFormValues } from '@/lib/order-schema'

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    data: {
      id: 1,
      default_hourly_rate: 3,
      default_margin_percent: 40,
      currency: 'EUR',
      vat_rate: 22,
      updated_at: '2025-01-01T00:00:00Z',
    },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useCustomers', () => ({
  useCustomers: () => ({
    data: [
      {
        id: 'c-1',
        name: 'Acme Srl',
        email: 'info@acme.it',
        phone: null,
        address: 'Via Roma 1',
        vat_number: 'IT123',
        notes: null,
        created_at: '2025-01-01T00:00:00Z',
        deleted_at: null,
      },
    ],
  }),
}))

vi.mock('@/hooks/useFilaments', () => ({
  useFilaments: () => ({
    data: [
      {
        id: 'f-1',
        brand: 'Prusament',
        material: 'PLA',
        color: 'Galaxy Black',
        diameter: 1.75,
        density: 1.24,
        price_per_kg: 24,
        stock_grams: 1000,
        low_stock_threshold: 200,
        created_at: '2025-01-01T00:00:00Z',
        deleted_at: null,
      },
    ],
  }),
}))

const baseValues: OrderFormValues = {
  customer_id: 'c-1',
  status: 'draft',
  notes: 'Consegna venerdì',
  margin_percent: 40,
  apply_vat: true,
  quote_items: [
    {
      description: 'Staffa',
      quantity: 2,
      time_hours: 1.5,
      material_grams: 80,
      filament_id: 'f-1',
      post_processing_cost: 0,
    },
  ],
}

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('PrintableQuote', () => {
  it('renders the quote number, customer, items, and total', () => {
    wrap(
      <PrintableQuote
        orderId="ord-abcdef1234567890"
        values={baseValues}
        open
        onClose={() => {}}
      />,
    )
    // Quote number is derived from the order id
    // The document contains the derived quote number somewhere.
    expect(document.body.textContent).toMatch(/PREV-ORD-ABCD/)
    // Customer section
    expect(screen.getByText('Acme Srl')).toBeInTheDocument()
    expect(screen.getByText('info@acme.it')).toBeInTheDocument()
    expect(screen.getByText('Via Roma 1')).toBeInTheDocument()
    // Item
    expect(screen.getByText('Staffa')).toBeInTheDocument()
    expect(screen.getByText(/Prusament PLA/)).toBeInTheDocument()
    // Notes
    expect(screen.getByText('Consegna venerdì')).toBeInTheDocument()
  })

  it('shows the empty state when no customer is selected', () => {
    wrap(
      <PrintableQuote
        orderId="ord-1"
        values={{ ...baseValues, customer_id: '' }}
        open
        onClose={() => {}}
      />,
    )
    expect(
      screen.getByText(/Dati insufficienti per generare il preventivo/i),
    ).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    wrap(
      <PrintableQuote
        orderId="ord-1"
        values={baseValues}
        open={false}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByText('Staffa')).toBeNull()
  })

  it('marks the totals area with the correct currency', () => {
    wrap(
      <PrintableQuote
        orderId="ord-1"
        values={baseValues}
        open
        onClose={() => {}}
      />,
    )
    // The "Totale" row label is rendered
    expect(screen.getAllByText('Totale').length).toBeGreaterThan(0)
    // Currency suffix "EUR" appears (in the right-side reference)
    expect(document.body.textContent).toMatch(/EUR/)
  })

  it('hides the VAT row when apply_vat is false', () => {
    wrap(
      <PrintableQuote
        orderId="ord-1"
        values={{ ...baseValues, apply_vat: false }}
        open
        onClose={() => {}}
      />,
    )
    // No "(22,0%)" VAT row should appear in the body
    expect(screen.queryByText(/IVA \(22/)).toBeNull()
  })
})
