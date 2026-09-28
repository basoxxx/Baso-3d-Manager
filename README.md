# BASO 3D Manager

**Versione 0.3.1** (2026-09-28) — vedi [CHANGELOG](./CHANGELOG.md). Include ⌘K palette, audit log stock, dashboard alerts, stampa PDF, duplica ordine, notifiche in-app.

Gestionale desktop per servizi di stampa 3D. Multipiattaforma (macOS, Windows), offline-first, basato su Tauri 2 + React + SQLite.

## Features

- Gestione clienti, ordini, preventivi con calcolo prezzi live
- Magazzino filamenti con alert scorte basse, decremento automatico al passaggio in produzione, e **cronologia variazioni stock** (audit log con motivo, timestamp, ordine collegato)
- Configurazione stampanti e parametri globali
- Dashboard con KPI (ordini attivi, fatturato 30gg, clienti, kg consumati, **filamenti sotto soglia**, **ordini in ritardo**) + grafico fatturato + pannelli "Da evadere", "Da riordinare", "In ritardo > 14gg"
- Export CSV per **clienti, ordini, filamenti, stampanti**
- 🖨️ **Stampa / PDF del preventivo** — il pulsante nel form apre un'anteprima con numero, totale e layout pulito, stampabile dal browser o salvabile come PDF (zero dipendenze extra) (UTF-8 BOM, separatore `;`, date `dd/mm/yyyy`, compatibile Excel IT)
- Backup/ripristino ZIP
- Auto-update via GitHub Releases
- 🔔 **Centro notifiche in-app** — campanella in topbar con badge, pannello a tendina con lista notifiche, dismiss + segna come letto, e generazione automatica da alert dashboard (filamenti bassi, ordini in ritardo)
- Dark mode

## Test

- **79 test Rust** (cargo test) — copertura: migrations, repos (customers, filaments, printers, orders, quote_items, settings, stock_audit, notifications), commands (dashboard, export, csv_export), build script pinning
- **141 test TypeScript** (vitest) — copertura: schemi Zod, contract IPC, react-hook-form flow, palette comandi, StockAuditList, NotificationBell, useDashboardAlerts, quote-format
- **CI matrix** (GitHub Actions) — `tsc` + ESLint + `vitest` + `cargo test` + verifica versioni/tipi generati ad ogni PR
- **0 warning** nel tree principale
- **CSP stretta** — `default-src 'self'`, no remote script

## Requisiti di sviluppo

- Node 20+, Bun
- Rust stable (1.75+)
- Tauri CLI: `cargo install tauri-cli --version "^2"`
- pnpm (opzionale, Bun già gestisce)

## Comandi

```bash
bun install          # install deps
bun run tauri:dev    # dev con hot reload
bun run test         # unit test
bun run tauri:build  # build produzione OS corrente
```

## Build cross-platform

Richiede i target Rust installati:

```bash
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin
rustup target add x86_64-pc-windows-msvc
```

Quindi:

```bash
bun run tauri:build:mac-arm
bun run tauri:build:mac-intel
bun run tauri:build:win
```

I bundle sono in `src-tauri/target/release/bundle/`.

## Release (automatica)

```bash
bun run version:patch   # (o :minor / :major) aggiorna package.json, tauri.conf.json, Cargo.toml e fa commit
git push                # su main
```

Ad ogni push su `main` il workflow **Release** controlla la versione: se non esiste ancora la release `v<versione>`,
builda gli installer macOS (Apple Silicon + Intel) e Windows, carica i bundle firmati per l'updater e `latest.json`,
e pubblica la release. Le app già installate si aggiornano da sole (pulsante "Aggiorna" in topbar).
Si può lanciare anche a mano da *Actions → Release → Run workflow*.

**Setup una tantum** — in *Settings → Secrets and variables → Actions* servono:

- `TAURI_SIGNING_PRIVATE_KEY`: la chiave privata generata con `bun tauri signer generate`, corrispondente a `plugins.updater.pubkey` in `tauri.conf.json`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: la sua password (vuota se non impostata)

Senza la chiave la release si ferma subito con un errore esplicito.

## Sicurezza

- macOS: app non firmata al primo avvio, autorizzare da "Sicurezza e Privacy" → "Apri comunque"
- Windows: SmartScreen warning al primo avvio, cliccare "Maggiori informazioni" → "Esegui comunque"

## Architettura

- **Backend**: Rust con `rusqlite` (SQLite embedded), comandi Tauri esposti via IPC
- **Frontend**: React 19 + Vite + Tailwind 4 + TanStack Query
- **Storage**: `~/Library/Application Support/BASO3DManager/baso.db` (mac) o `%APPDATA%/BASO3DManager/baso.db` (win)

## Licenza

Proprietario.
