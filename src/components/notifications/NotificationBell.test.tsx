/**
 * Smoke tests for the NotificationBell + NotificationPanel. We
 * mock the hooks to render the bell with a known unread count and
 * assert the badge appears; opening the panel renders the list.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockUnread = vi.fn(() => 0)
const mockUseNotifications = vi.fn<() => { data: Notification[] }>(() => ({ data: [] }))
const mockMarkRead = vi.fn()
const mockMarkAllRead = vi.fn()
const mockDelete = vi.fn()
const mockPush = vi.fn()

vi.mock('@/hooks/useNotifications', () => ({
  useUnreadNotificationCount: () => ({ data: mockUnread() }),
  useNotifications: () => mockUseNotifications(),
  useMarkNotificationRead: () => ({ mutate: mockMarkRead }),
  useMarkAllNotificationsRead: () => ({ mutate: mockMarkAllRead }),
  useDeleteNotification: () => ({ mutate: mockDelete }),
  usePushNotification: () => ({ mutate: mockPush }),
}))

import { NotificationBell } from './NotificationBell'
import type { Notification } from '@/lib/db-types.generated'

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

const sampleNotification = (over: Partial<Notification> = {}): Notification => ({
  id: 'n-1',
  kind: 'low_stock',
  title: 'Filamento in esaurimento',
  body: '50 g rimasti',
  data: { filament_id: 'f-1' },
  read: false,
  created_at: '2026-06-12T10:00:00Z',
  ...over,
})

beforeEach(() => {
  mockUnread.mockReturnValue(0)
  mockUseNotifications.mockReturnValue({ data: [] })
  mockMarkRead.mockReset()
  mockMarkAllRead.mockReset()
  mockDelete.mockReset()
  mockPush.mockReset()
})

afterEach(() => cleanup())

describe('NotificationBell', () => {
  it('does not show a badge when there are no unread notifications', () => {
    wrap(<NotificationBell />)
    expect(screen.queryByTestId('notif-badge')).toBeNull()
  })

  it('shows the badge with the unread count', () => {
    mockUnread.mockReturnValue(3)
    wrap(<NotificationBell />)
    expect(screen.getByTestId('notif-badge')).toHaveTextContent('3')
  })

  it('caps the badge at 99+', () => {
    mockUnread.mockReturnValue(150)
    wrap(<NotificationBell />)
    expect(screen.getByTestId('notif-badge')).toHaveTextContent('99+')
  })

  it('opens the panel on click and lists the notifications', () => {
    mockUnread.mockReturnValue(2)
    mockUseNotifications.mockReturnValue({
      data: [
        sampleNotification({ id: 'n-1', kind: 'low_stock' }),
        sampleNotification({ id: 'n-2', kind: 'overdue_order' }),
      ],
    })
    wrap(<NotificationBell />)
    act(() => {
      fireEvent.click(screen.getByLabelText('Centro notifiche'))
    })
    expect(screen.getByText('Centro notifiche')).toBeInTheDocument()
    expect(screen.getAllByText('Filamento in esaurimento').length).toBeGreaterThan(0)
    const links = screen.getAllByText('Apri filamento →')
    expect(links.some((el) => el.getAttribute('href') === '/filaments/f-1')).toBe(true)
  })

  it('shows the empty state when the list is empty', () => {
    wrap(<NotificationBell />)
    act(() => {
      fireEvent.click(screen.getByLabelText('Centro notifiche'))
    })
    expect(screen.getByText('Nessuna notifica.')).toBeInTheDocument()
  })

  it('marks a single notification as read', () => {
    mockUnread.mockReturnValue(1)
    mockUseNotifications.mockReturnValue({
      data: [sampleNotification()],
    })
    wrap(<NotificationBell />)
    act(() => {
      fireEvent.click(screen.getByLabelText('Centro notifiche'))
    })
    act(() => {
      fireEvent.click(screen.getByText('Segna letto'))
    })
    expect(mockMarkRead).toHaveBeenCalledWith('n-1')
  })

  it('marks all as read', () => {
    wrap(<NotificationBell />)
    act(() => {
      fireEvent.click(screen.getByLabelText('Centro notifiche'))
    })
    act(() => {
      fireEvent.click(screen.getByText(/Segna tutti come letti/))
    })
    expect(mockMarkAllRead).toHaveBeenCalled()
  })

  it('renders different icons per kind (smoke check)', () => {
    mockUnread.mockReturnValue(3)
    mockUseNotifications.mockReturnValue({
      data: [
        sampleNotification({ id: 'n-1', kind: 'low_stock' }),
        sampleNotification({ id: 'n-2', kind: 'overdue_order' }),
        sampleNotification({ id: 'n-3', kind: 'error' }),
      ],
    })
    wrap(<NotificationBell />)
    act(() => {
      fireEvent.click(screen.getByLabelText('Centro notifiche'))
    })
    // All three category labels appear in the panel headers.
    expect(screen.getByText('Magazzino')).toBeInTheDocument()
    expect(screen.getByText('Ordine in ritardo')).toBeInTheDocument()
    expect(screen.getByText('Errore')).toBeInTheDocument()
  })
})
