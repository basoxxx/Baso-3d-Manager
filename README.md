# BASO 3D Manager

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

## Release

```bash
bun run version:patch   # bump + tag + push → CI builda e pubblica
```

## Sicurezza

- macOS: app non firmata al primo avvio, autorizzare da "Sicurezza e Privacy" → "Apri comunque"
- Windows: SmartScreen warning al primo avvio, cliccare "Maggiori informazioni" → "Esegui comunque"

## Architettura

- **Backend**: Rust con `rusqlite` (SQLite embedded), comandi Tauri esposti via IPC
- **Frontend**: React 19 + Vite + Tailwind 4 + TanStack Query
- **Storage**: `~/Library/Application Support/BASO3DManager/baso.db` (mac) o `%APPDATA%/BASO3DManager/baso.db` (win)

## Licenza

Proprietario.
