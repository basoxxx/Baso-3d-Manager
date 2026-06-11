import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { CustomersPage } from '@/routes/CustomersPage'
import { CustomerFormPage } from '@/routes/CustomerFormPage'

export function App() {
  return (
    <BrowserRouter>
      <Toaster theme="dark" position="top-right" richColors closeButton />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/customers" replace />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:id" element={<CustomerFormPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
