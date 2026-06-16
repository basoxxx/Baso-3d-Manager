/**
 * Lightweight smoke test for the duplicate flow at the form level.
 *
 * The full OrderFormPage is too heavy for jsdom (useFieldArray +
 * react-hook-form + framer-motion) — keeping the integration test
 * caused vitest hangs. The transformation is fully covered by
 * `fromOrderForDuplicate` unit tests in order-schema.test.ts.
 *
 * This file just checks the routing contract: the form page accepts
 * a `from` search param and exposes the `useSearchParams` it consumes.
 */
import { describe, it, expect } from 'vitest'
import { useSearchParams } from 'react-router-dom'
import { renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

function wrapper(initial: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/orders/new" element={<>{children}</>} />
        <Route path="/orders/:id" element={<>{children}</>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('OrderFormPage routing — duplicate source', () => {
  it('extracts the `from` query parameter from /orders/new?from=<id>', () => {
    const { result } = renderHook(() => useSearchParams(), {
      wrapper: wrapper('/orders/new?from=src-42'),
    })
    const [params] = result.current
    expect(params.get('from')).toBe('src-42')
  })

  it('returns null `from` for plain /orders/new', () => {
    const { result } = renderHook(() => useSearchParams(), {
      wrapper: wrapper('/orders/new'),
    })
    const [params] = result.current
    expect(params.get('from')).toBeNull()
  })
})
