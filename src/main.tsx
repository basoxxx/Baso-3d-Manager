import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { App } from './App'
import './styles/globals.css'

// DEBUG: surface runtime errors on screen
window.addEventListener('error', (e) => {
  const d = document.createElement('pre')
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#7f1d1d;color:#fff;padding:8px;font:11px monospace;white-space:pre-wrap;max-height:50vh;overflow:auto'
  d.textContent = '[ERROR] ' + (e.message || '') + '\n\n' + (e.error?.stack || e.message || '')
  document.body.appendChild(d)
})
window.addEventListener('unhandledrejection', (e) => {
  const d = document.createElement('pre')
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#7f1d1d;color:#fff;padding:8px;font:11px monospace;white-space:pre-wrap;max-height:50vh;overflow:auto'
  d.textContent = '[PROMISE] ' + (e.reason?.message || '') + '\n\n' + (e.reason?.stack || String(e.reason))
  document.body.appendChild(d)
})

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
