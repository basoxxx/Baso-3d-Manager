import { useSettings } from '@/hooks/useSettings'

export function PriceLegend() {
  const { data: settings } = useSettings()
  const hourly = settings?.default_hourly_rate.toFixed(2) ?? '—'
  const vat = settings?.vat_rate.toFixed(1) ?? '—'

  return (
    <details className="rounded-md border border-border bg-bg-1 px-3 py-2 text-xs text-text-3 [&_summary]:cursor-pointer [&_summary]:select-none">
      <summary className="flex items-center gap-1.5 font-medium text-text-2">
        <span className="inline-block text-base">ⓘ</span>
        Come si calcola il prezzo
      </summary>
      <div className="mt-2 space-y-1.5 leading-relaxed">
        <p>
          <strong className="text-text-2">Per ogni articolo</strong> il subtotale è:
        </p>
        <ul className="list-disc space-y-0.5 pl-5">
          <li>
            <strong>Tempo</strong>: ore × tariffa oraria (€{hourly}/h, modificabile in Impostazioni)
          </li>
          <li>
            <strong>Materiale</strong>: grammi / 1000 × prezzo €/kg del filamento scelto
          </li>
          <li>
            <strong>Post-proc</strong>: costo fisso aggiuntivo in €
          </li>
          <li>
            Moltiplicato per la quantità
          </li>
        </ul>
        <p className="pt-1">
          <strong className="text-text-2">Totale ordine</strong>:
        </p>
        <ol className="list-decimal space-y-0.5 pl-5">
          <li>Subtotale articoli</li>
          <li>+ Margine % (impostato in fondo al form)</li>
          <li>= Imponibile</li>
          <li>+ IVA {vat}% (rimovibile dal checkbox nel Riepilogo)</li>
          <li>= Totale</li>
        </ol>
      </div>
    </details>
  )
}
