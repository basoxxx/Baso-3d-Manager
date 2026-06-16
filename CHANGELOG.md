# Changelog

Tutte le modifiche notevoli a BASO 3D Manager.

## [0.3.0] - 2026-06-15

Release con robustezza, type-safety end-to-end e tutte le feature di produttivita UX (palette comandi, duplica, audit log, dashboard alerts, stampa PDF, notifiche).

### Aggiunto

**Backend / architettura**
- **Transactions atomiche in `orders::create`/`update`**: order INSERT/UPDATE + quote items INSERT/DELETE nello stesso `tx.execute`; rollback completo se un item fallisce (es. FK violation). 3 nuovi test di regressione (`create_rolls_back_when_items_fail`, `replace_for_order_rolls_back_on_failure`, `create_many_in_tx_rolls_back_when_caller_drops`).
- **Stock audit log** (migration 003, tabella `stock_audit_log`): ogni cambio di `filaments.stock_grams` scrive una riga con `delta_grams`, `stock_after`, `reason` (CHECK su 5 valori), `order_id` opzionale, `user_note`, `created_at`. `adjust_stock_in_tx` aggiorna stock e audit nella stessa transaction; `orders::set_status` decrementa/ripristina atomicamente. Sort by `ROWID DESC` per ordinamento deterministico anche nello stesso secondo.
- **Cronologia stock UI** (`StockAuditList` su FilamentFormPage): timeline con icona per reason, delta con segno, link all'ordine di origine, nota utente.
- **Versioned migration runner** con detection dei legacy DB: tabella `_migrations(version, applied_at)` + logica `version_already_present` per DB v0.2.x esistenti. Test `upgrade_from_legacy_db_marks_versions_applied`.
- **TypeScript types auto-generati da Rust via build script** (`src-tauri/build.rs` + `syn` 2): `db-types.generated.ts` viene rigenerato a ogni `cargo build`. Enum narrowing (FilamentMaterial, PrinterStatus, OrderStatus) dichiarati in `ENUM_FIELDS`. Il frontend non puo piu divergere dal backend. Test pinning con `tests/db_types_gen.rs`.
- **Single source of truth per IPC create payloads**: `NewCustomer`/`NewFilament`/`NewPrinter`/`NewOrder`/`UpdateSettings` derivati da `toNew*` di Zod schema. Il bug snake/camel-case che aveva richiesto il fix di `rename_all` non puo piu succedere. Test in `ipc-contract.test.ts` (5 snapshot).
- **Centro notifiche in-app** (migration 004, tabella `notifications`): campanella in TopBar con badge, pannello dropdown con mark-read / mark-all / delete, hook `useDashboardAlerts` che pusha automaticamente notifiche quando appaiono nuovi filamenti sotto soglia o ordini in ritardo (de-duplicazione via `localStorage`). Sort by `ROWID DESC`.

**Frontend / UX**
- **Command palette `Cmd+K`** (`cmdk` 1.1): 4 gruppi (Navigazione 7, Crea 4, Azioni 5, ricerca live su 4 entita con gate a 2 caratteri). Attivabile da `Cmd+K` / `Ctrl+K` / `/` o click sul bottone Cerca. 23 nuovi test.
- **Duplica ordine** (1 click): bottone Copy in OrdersPage + bottone Duplica nell'header di OrderFormPage. Deep link `/orders/new?from=<id>` precarica la form (status forzato a draft) per evitare errori di copia accidentale. Helper `fromOrderForDuplicate` in `lib/order-schema.ts`.
- **Dashboard alerts**: 6 KPI cards (4 esistenti + Filamenti bassi + Ordini in ritardo > 14gg) + pannelli "Da riordinare" (top 10 filamenti per gravita) e "In ritardo > 14gg" (top 10 ordini). Query SQL con `julianday('now') - julianday(created_at)` per il check overdue.
- **Export CSV per customers + printers**: esteso da 2 a 4 domini. Enum `ExportDomain` type-safe. Test integration end-to-end (4 nuovi).
- **Stampa / PDF del preventivo**: bottone "Stampa preventivo" in OrderFormPage apre un'anteprima con numero (`PREV-XXXXX-YYYYMMDD`), totali formattati in italiano, e layout pulito. Usa `@media print` CSS + `window.print()` — zero dipendenze extra. 24 nuovi test (19 unit + 5 component).
- **Toggle IVA per ordine**: checkbox nel riepilogo per applicare o meno l'IVA (default ON); persistito in colonna `orders.apply_vat`.
- **Legenda "Come si calcola il prezzo"** espandibile nella sezione Articoli, con spiegazione delle formule e dei valori reali di tariffa oraria / IVA da Impostazioni.
- **Helper inline** sotto ogni campo articolo (tempo, materiale, post-proc, filamento) per chiarire l'unita di misura e cosa contribuisce al subtotale.
- **Tariffa oraria letta da Impostazioni** (era hardcoded a 2.5).

### Corretto
- **IPC Tauri snake_case** (`rename_all = "snake_case"` applicato a TUTTI i 23 command, non solo ai multi-arg): future-proof contro futuri field multi-parola.
- **Form numerici ordini** (`valueAsNumber: true` su tutti gli input numerici in `QuoteItemRow` e `OrderFormPage`): fix il bug "clicco costo extra esplode tutto" dove l'aritmetica concatenava stringhe invece di sommare.
- **Date parsing su dashboard**: SQLite restituisce `"YYYY-MM-DD HH:MM:SS"` (UTC); sostituito `parseISO` con `new Date(string)` che accetta entrambi i formati.
- **Stock decrement best-effort**: se il filamento di un articolo e soft-deleted quando l'ordine va in produzione, l'errore viene loggato e l'utente puo comunque marcare l'ordine come in produzione.

### Modificato (refactor)
- **dashboard.rs**: estratto `compute_dashboard(&Connection)` dal Tauri command, permette unit test senza `tauri::State`.
- **repos/filaments.rs**: `adjust_stock` e `adjust_stock_internal` ora chiamano `adjust_stock_in_tx`, che scrive l'audit row nella stessa transaction.
- **repos/orders.rs**: `set_status` apre una transaction, applica i cambi stock con audit, aggiorna lo status, committa — tutto atomico.
- **build.rs**: enum narrowing, ROWID sort, serde_json::Value -> TS `unknown` mapping.

### Test
- **Test totals**: 213 (da 68) — 79 Rust (era 35) + 134 TypeScript (era 33). Zero warning.
- Aggiunti test pinning del contratto FE↔BE (ipc-contract, db-types, stock-audit).

### Note
- I numeri di versione degli installer cambiano da 0.2.2 a 0.3.0. Auto-update dovrebbe proporre l'upgrade agli utenti.
- macOS: app ancora non firmata. Windows: ancora SmartScreen warning.
- Notifiche native OS sono preparate ma non attive (richiedono `tauri-plugin-notification` non disponibile offline). Il design IPC e JSON payload sono pronti per uno swap futuro.

[0.3.0]: https://github.com/basoxxx/Baso-3d-Manager/releases/tag/v0.3.0
[0.2.2]: https://github.com/basoxxx/Baso-3d-Manager/releases/tag/v0.2.2
[0.2.0]: https://github.com/diegobasolo/baso-3d-manager/releases/tag/v0.2.0

## [0.2.2] - 2026-06-12

### Aggiunto
- **Logo BASO 3D**: cubo isometrico wireframe con filamento, generato in dark theme palette. Sostituisce i placeholder in tutte le varianti icona (icns, ico, iOS, Android, store logos)

### Corretto
- **IPC Tauri snake_case**: aggiunto `rename_all = "snake_case"` agli 8 command con argomenti multi-parola. Tauri 2 deserializza di default in camelCase ma il frontend passava snake_case (`delta_grams`, `customer_id`, `new_status`, `order_id`), causando errori silenziosi tipo `missing required key \`deltaGrams\``. Fix per: `adjust_filament_stock`, `set_order_status`, `list_orders`, `update_*`, `list_quote_items`, `export_csv`
- **Form numerici ordini**: aggiunto `valueAsNumber: true` a tutti gli input numerici in `QuoteItemRow` e `OrderFormPage`. RHF + `<input type=number>` salvava stringhe dopo l'interazione utente, l'aritmetica concatenava invece di sommare e `.toFixed(2)` esplodeva. Fix il bug "clicco costo extra esplode tutto"

## [0.2.0] - 2026-06-12

Prima release pubblica con tutte le feature core.

### Aggiunto
- **Gestione clienti**: CRUD completo con ricerca live
- **Gestione ordini**: stati (Bozza → In produzione → Completato → Consegnato, Annullato), calcolo prezzi live (materiale, manodopera, post-processing, margine, IVA)
- **Magazzino filamenti**: CRUD, alert scorte basse, filtri per materiale, aggiustamenti stock rapidi ±100g, decremento automatico al passaggio in produzione
- **Stampanti**: CRUD con stato (disponibile/in uso/manutenzione) e volume di stampa
- **Impostazioni globali**: tariffa oraria, margine default, valuta, IVA
- **Dashboard**: 4 KPI (ordini attivi, fatturato 30gg, clienti, margine medio), grafico fatturato 30gg, prossimi ordini
- **Export CSV**: ordini e filamenti, formato italiano (UTF-8 BOM, separatore virgola, date dd/mm/yyyy)
- **Backup ZIP**: export compresso con manifest versionato, restore atomico
- **Auto-update**: notifica in topbar, check ogni 6h, scarica + riavvia con un click
- **Dark mode** first-class design system
- **CI**: GitHub Actions matrix per macOS arm64+Intel e Windows x64
- **Test**: 35 test Rust + 33 test TypeScript, 0 warning

### Note
- macOS: app non firmata (autorizzare da Sicurezza e Privacy al primo avvio)
- Windows: SmartScreen warning (cliccare "Esegui comunque")
- Auto-update richiede setup manuale secret `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` su GitHub

[0.2.0]: https://github.com/diegobasolo/baso-3d-manager/releases/tag/v0.2.0
