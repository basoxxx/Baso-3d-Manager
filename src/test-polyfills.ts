/**
 * jsdom polyfills for browser-only APIs that the components (and the
 * `cmdk` library in particular) use at module-eval or render time.
 * Kept separate from test-setup so it's easy to find.
 */

// cmdk uses ResizeObserver at module-eval time; jsdom doesn't ship one.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverPolyfill {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverPolyfill
}

// jsdom doesn't implement scrollIntoView; cmdk calls it on items when
// the active item changes.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {}
}

// Radix uses matchMedia.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}


// jsdom doesn't expose localStorage by default; some tests use it
// for the dashboard alert hook.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size },
  }
  globalThis.localStorage = ls
}
