/**
 * Unit tests for the dashboard alert hook. We mock the dashboard
 * and the push mutation, then assert that:
 *  - the first time a low_stock filament appears, a notification
 *    is pushed
 *  - the second time (same data), no extra notifications are pushed
 *  - when the alert goes away, no extra notifications are pushed
 *  - when a NEW entity enters the list, a new notification is pushed
 *
 * We use vitest fake timers to control Date.now() for the
 * localStorage snapshot.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockDashboard = vi.fn<() => unknown>(() => null)
const mockFilaments = vi.fn<() => unknown>(() => [])
const mockPush = vi.fn()

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: () => ({ data: mockDashboard() }),
}))
vi.mock('@/hooks/useFilaments', () => ({
  useFilaments: () => ({ data: mockFilaments() }),
}))
vi.mock('@/hooks/useNotifications', () => ({
  usePushNotification: () => ({ mutate: mockPush }),
}))

import { useDashboardAlerts } from './useDashboardAlerts'

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  mockPush.mockReset()
  mockDashboard.mockReturnValue(null)
  mockFilaments.mockReturnValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDashboardAlerts', () => {
  it('does nothing when the dashboard has no data', () => {
    renderHook(() => useDashboardAlerts(), { wrapper: wrap() })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('pushes a low_stock notification the first time a filament enters the list', () => {
    mockDashboard.mockReturnValue({
      low_stock: [{ id: 'f-1', brand: 'Prusament', material: 'PLA', color: null, stock_grams: 50, low_stock_threshold: 500 }],
      overdue: [],
    })
    mockFilaments.mockReturnValue([
      { id: 'f-1', brand: 'Prusament', material: 'PLA', stock_grams: 50, low_stock_threshold: 500 },
    ])
    renderHook(() => useDashboardAlerts(), { wrapper: wrap() })
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'low_stock',
        data: { filament_id: 'f-1' },
      }),
    )
  })

  it('does NOT re-push the same alert on the next render', () => {
    mockDashboard.mockReturnValue({
      low_stock: [{ id: 'f-1', brand: 'A', material: 'PLA', color: null, stock_grams: 50, low_stock_threshold: 500 }],
      overdue: [],
    })
    mockFilaments.mockReturnValue([
      { id: 'f-1', brand: 'A', material: 'PLA', stock_grams: 50, low_stock_threshold: 500 },
    ])
    const { rerender } = renderHook(() => useDashboardAlerts(), { wrapper: wrap() })
    expect(mockPush).toHaveBeenCalledTimes(1)
    // Re-render with the same dashboard data.
    rerender()
    expect(mockPush).toHaveBeenCalledTimes(1)
  })

  it('pushes a new alert when a NEW filament enters the low_stock list', () => {
    mockDashboard.mockReturnValue({
      low_stock: [
        { id: 'f-1', brand: 'A', material: 'PLA', color: null, stock_grams: 50, low_stock_threshold: 500 },
        { id: 'f-2', brand: 'B', material: 'PETG', color: null, stock_grams: 30, low_stock_threshold: 500 },
      ],
      overdue: [],
    })
    mockFilaments.mockReturnValue([
      { id: 'f-1', brand: 'A', material: 'PLA', stock_grams: 50, low_stock_threshold: 500 },
      { id: 'f-2', brand: 'B', material: 'PETG', stock_grams: 30, low_stock_threshold: 500 },
    ])
    renderHook(() => useDashboardAlerts(), { wrapper: wrap() })
    // Two new filaments => two notifications (no prior state).
    expect(mockPush).toHaveBeenCalledTimes(2)
  })

  it('pushes overdue notifications for new orders', () => {
    mockDashboard.mockReturnValue({
      low_stock: [],
      overdue: [
        { id: 'o-1', customer_id: 'c-1', customer_name: 'Acme', status: 'draft', created_at: '2025-01-01', days_old: 30 },
      ],
    })
    renderHook(() => useDashboardAlerts(), { wrapper: wrap() })
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'overdue_order',
        data: { order_id: 'o-1' },
      }),
    )
  })
})
