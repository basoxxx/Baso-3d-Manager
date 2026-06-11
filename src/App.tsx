import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { CustomersPage } from '@/routes/CustomersPage'
import { CustomerFormPage } from '@/routes/CustomerFormPage'
import { FilamentsPage } from '@/routes/FilamentsPage'
import { FilamentFormPage } from '@/routes/FilamentFormPage'
import { PrintersPage } from '@/routes/PrintersPage'
import { PrinterFormPage } from '@/routes/PrinterFormPage'
import { SettingsPage } from '@/routes/SettingsPage'

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
          <Route path="/filaments" element={<FilamentsPage />} />
          <Route path="/filaments/new" element={<FilamentFormPage />} />
          <Route path="/filaments/:id" element={<FilamentFormPage />} />
          <Route path="/printers" element={<PrintersPage />} />
          <Route path="/printers/new" element={<PrinterFormPage />} />
          <Route path="/printers/:id" element={<PrinterFormPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
