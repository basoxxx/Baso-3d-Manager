/**
 * Unit tests for the ⌘K / Ctrl+K listener inside CommandPaletteProvider.
 * We render the provider, fire a synthetic keyboard event, and assert
 * the palette opens / closes.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, fireEvent, screen, cleanup, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CommandPaletteProvider } from './CommandPaletteProvider'

// The provider doesn't need the IPC-backed hooks for the open/close
// keyboard listener — but to keep the test self-contained, we mock the
// hooks the underlying CommandPalette uses, in case any future change
// triggers data fetching during the listener cycle.
vi.mock('@/hooks/useCustomers', () => ({ useCustomers: () => ({ data: [] }) }))
vi.mock('@/hooks/useOrders', () => ({ useOrders: () => ({ data: [] }) }))
vi.mock('@/hooks/useFilaments', () => ({ useFilaments: () => ({ data: [] }) }))
vi.mock('@/hooks/usePrinters', () => ({ usePrinters: () => ({ data: [] }) }))

afterEach(() => cleanup())

describe('CommandPaletteProvider', () => {
  it('opens the palette on ⌘K', () => {
    render(
      <MemoryRouter>
        <CommandPaletteProvider>
          <div>app body</div>
        </CommandPaletteProvider>
      </MemoryRouter>,
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {children}
          </QueryClientProvider>
        ),
      },
    )
    expect(screen.queryByPlaceholderText(/Cerca un cliente/i)).toBeNull()

    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    expect(screen.getByPlaceholderText(/Cerca un cliente/i)).toBeInTheDocument()
  })

  it('opens the palette on Ctrl+K', () => {
    render(
      <MemoryRouter>
        <CommandPaletteProvider>
          <div>app body</div>
        </CommandPaletteProvider>
      </MemoryRouter>,
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {children}
          </QueryClientProvider>
        ),
      },
    )
    act(() => {
      fireEvent.keyDown(window, { key: 'K', ctrlKey: true })
    })
    expect(screen.getByPlaceholderText(/Cerca un cliente/i)).toBeInTheDocument()
  })

  it('toggles open state on repeated ⌘K', async () => {
    render(
      <MemoryRouter>
        <CommandPaletteProvider>
          <div>app body</div>
        </CommandPaletteProvider>
      </MemoryRouter>,
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {children}
          </QueryClientProvider>
        ),
      },
    )
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    expect(screen.getByPlaceholderText(/Cerca un cliente/i)).toBeInTheDocument()
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    // AnimatePresence keeps the dialog mounted for the exit animation
    // (forceMount), so we wait for the input to disappear instead of
    // asserting synchronously.
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Cerca un cliente/i)).toBeNull(),
    )
  })

  it('opens on "/" but only when no input is focused', () => {
    render(
      <MemoryRouter>
        <CommandPaletteProvider>
          <div>app body</div>
        </CommandPaletteProvider>
      </MemoryRouter>,
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {children}
          </QueryClientProvider>
        ),
      },
    )
    act(() => {
      fireEvent.keyDown(window, { key: '/' })
    })
    expect(screen.getByPlaceholderText(/Cerca un cliente/i)).toBeInTheDocument()
  })
})
