/**
 * Printable quote view. Shown on the OrderFormPage in a Modal that
 * the user can print with the browser's native print dialog.
 *
 * The component is also rendered in a hidden iframe on the page so
 * the browser's "Save as PDF" target is the quote, not the rest of
 * the app shell.
 *
 * The @media print CSS hides everything except the quote body.
 */
import { useMemo, useEffect, useRef } from 'react'
import { Printer } from 'lucide-react'
import {
  buildPrintableQuote,
  formatItNumber,
  formatItCurrency,
  formatItQty,
  formatItHours,
  formatItGrams,
  type PrintableQuote as Quote,
} from '@/lib/quote-format'
import { useSettings } from '@/hooks/useSettings'
import { useCustomers } from '@/hooks/useCustomers'
import { useFilaments } from '@/hooks/useFilaments'
import type { OrderFormValues } from '@/lib/order-schema'

interface PrintableQuoteProps {
  /** Order id used to derive a stable quote number. */
  orderId: string
  /** Form values — read at the time the modal opens. */
  values: OrderFormValues
  /** Whether the modal is open. */
  open: boolean
  /** Close handler. */
  onClose: () => void
}

export function PrintableQuote({ orderId, values, open, onClose }: PrintableQuoteProps) {
  const { data: settings } = useSettings()
  const { data: customers } = useCustomers()
  const { data: filaments } = useFilaments()

  // Build the quote shape from the current form values. This is a
  // pure derivation, so we use useMemo and depend only on the form
  // values + the customer/filament records. If the user keeps editing
  // the form while the modal is open, the preview updates.
  const quote: Quote | null = useMemo(() => {
    const customer = customers?.find((c) => c.id === values.customer_id)
    if (!settings || !customer) return null
    const items = values.quote_items.map((qi) => {
      const filament = filaments?.find((f) => f.id === qi.filament_id)
      return {
        description: qi.description,
        quantity: Number(qi.quantity) || 1,
        time_hours: Number(qi.time_hours) || 0,
        material_grams: Number(qi.material_grams) || 0,
        filament_label: filament
          ? `${filament.brand} ${filament.material}${filament.color ? ` (${filament.color})` : ''}`
          : null,
        price_per_kg: filament?.price_per_kg ?? 0,
        hourly_rate: settings.default_hourly_rate,
        post_processing_cost: Number(qi.post_processing_cost) || 0,
      }
    })
    return buildPrintableQuote({
      order_id: orderId,
      customer: {
        name: customer.name,
        email: customer.email,
        address: customer.address,
        vat_number: customer.vat_number,
      },
      notes: values.notes || null,
      items,
      margin_percent: Number(values.margin_percent) || 0,
      apply_vat: !!values.apply_vat,
      settings: {
        default_hourly_rate: settings.default_hourly_rate,
        vat_rate: settings.vat_rate,
        currency: settings.currency,
        issuer_name: 'BASO 3D',
        issuer_address: null,
        issuer_vat: null,
      },
    })
  }, [orderId, values, customers, filaments, settings])

  const printRef = useRef<HTMLDivElement | null>(null)

  // Trigger the browser's print dialog when the user clicks the
  // "Stampa" button. We use setTimeout(0) so the modal layout has a
  // chance to settle before the print preview is captured.
  const handlePrint = () => {
    setTimeout(() => window.print(), 0)
  }

  // Close on Esc (the dialog also handles this via the Modal component
  // but we add a guard for the iframe target).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div data-print-root className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:static print:bg-white print:p-0">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-bg-1 shadow-2xl print:max-h-none print:w-full print:max-w-none print:border-0 print:bg-white print:shadow-none">
        <div className="flex items-center justify-between border-b border-border bg-bg-2 px-4 py-3 print:hidden">
          <div className="flex items-center gap-2 text-sm font-medium text-text-1">
            <Printer size={14} />
            Anteprima preventivo
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              Stampa / Salva PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text-2 hover:bg-bg-3 hover:text-text-1"
            >
              Chiudi
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 print:overflow-visible print:p-0" ref={printRef}>
          {quote ? (
            <QuoteBody quote={quote} />
          ) : (
            <div className="text-sm text-text-3">
              Dati insufficienti per generare il preventivo. Assicurati
              di aver selezionato un cliente e che le impostazioni siano
              salvate.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuoteBody({ quote }: { quote: Quote }) {
  return (
    <article className="mx-auto max-w-2xl space-y-6 bg-white p-8 text-sm text-neutral-900 print:p-0">
      <header className="flex items-start justify-between border-b border-neutral-300 pb-4">
        <div>
          <h1 className="text-xl font-bold">Preventivo {quote.number}</h1>
          <p className="mt-0.5 text-xs text-neutral-600">
            Emesso il {quote.issued_at.split('T')[0]}
          </p>
        </div>
        <div className="text-right text-xs">
          <div className="font-bold">{quote.issuer_name}</div>
          {quote.issuer_address && <div>{quote.issuer_address}</div>}
          {quote.issuer_vat && <div>P.IVA {quote.issuer_vat}</div>}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 text-xs">
        <div>
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Destinatario</h2>
          <div className="font-medium">{quote.customer_name}</div>
          {quote.customer_address && <div>{quote.customer_address}</div>}
          {quote.customer_vat && <div>P.IVA {quote.customer_vat}</div>}
          {quote.customer_email && <div>{quote.customer_email}</div>}
        </div>
        <div>
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Riferimento</h2>
          <div>Preventivo: <span className="font-mono">{quote.number}</span></div>
          <div>Valuta: {quote.currency}</div>
        </div>
      </section>

      <section>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-300 text-[10px] uppercase tracking-wide text-neutral-500">
              <th className="py-1.5 pr-2 text-right">#</th>
              <th className="py-1.5 pr-2">Descrizione</th>
              <th className="py-1.5 pr-2 text-right">Qtà</th>
              <th className="py-1.5 pr-2 text-right">Tempo</th>
              <th className="py-1.5 pr-2 text-right">Materiale</th>
              <th className="py-1.5 pr-2 text-right">Post-proc</th>
              <th className="py-1.5 pr-2 text-right">Prezzo unit.</th>
              <th className="py-1.5 pl-2 text-right">Totale</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it) => (
              <tr key={it.index} className="border-b border-neutral-100 align-top">
                <td className="py-2 pr-2 text-right font-mono text-[10px] text-neutral-500">{it.index}</td>
                <td className="py-2 pr-2">
                  <div className="font-medium">{it.description}</div>
                  {it.filament_label && (
                    <div className="text-[10px] text-neutral-500">{it.filament_label}</div>
                  )}
                </td>
                <td className="py-2 pr-2 text-right">{formatItQty(it.quantity)}</td>
                <td className="py-2 pr-2 text-right">{formatItHours(it.time_hours)}</td>
                <td className="py-2 pr-2 text-right">{it.material_grams > 0 ? formatItGrams(it.material_grams) : '—'}</td>
                <td className="py-2 pr-2 text-right">
                  {it.post_processing_cost > 0 ? formatItCurrency(it.post_processing_cost) : '—'}
                </td>
                <td className="py-2 pr-2 text-right">{formatItCurrency(it.unit_price)}</td>
                <td className="py-2 pl-2 text-right font-semibold">{formatItCurrency(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ml-auto max-w-xs space-y-1 text-xs">
        <Row label="Subtotale" value={formatItCurrency(quote.subtotal_items)} />
        <Row label={`Margine (${formatItNumber(quote.margin_percent)}%)`} value={formatItCurrency(quote.margin_amount)} />
        <Row label="Imponibile" value={formatItCurrency(quote.taxable)} bold />
        {quote.apply_vat && (
          <Row label={`IVA (${formatItNumber(quote.vat_rate)}%)`} value={formatItCurrency(quote.vat_amount)} />
        )}
        <Row label="Totale" value={formatItCurrency(quote.total)} big />
      </section>

      {quote.notes && (
        <section className="border-t border-neutral-200 pt-4 text-xs text-neutral-700">
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Note</h2>
          <p className="whitespace-pre-line">{quote.notes}</p>
        </section>
      )}

      <footer className="border-t border-neutral-200 pt-4 text-[10px] text-neutral-500">
        <p>Validità: 30 giorni dalla data di emissione. Pagamento: bonifico bancario 30gg df.fm.</p>
        <p className="mt-1">Documento generato con BASO 3D Manager.</p>
      </footer>
    </article>
  )
}

function Row({ label, value, bold, big }: { label: string; value: string; bold?: boolean; big?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-b border-neutral-100 py-1 ${
        bold ? 'font-medium text-neutral-900' : 'text-neutral-700'
      } ${big ? 'border-t border-neutral-300 pt-2 text-base font-bold text-neutral-900' : ''}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
