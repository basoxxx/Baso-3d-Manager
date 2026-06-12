# 🧊 BASO 3D Manager

> Gestionale desktop **offline-first** per servizi di stampa 3D. Clienti, ordini, preventivi, magazzino filamenti e stampanti, in un'unica app nativa multipiattaforma.

[![version](https://img.shields.io/badge/version-0.2.2-blue.svg)](CHANGELOG.md)
[![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)](#-download)
[![stack](https://img.shields.io/badge/stack-Tauri%202%20%2B%20React%2019%20%2B%20Rust-orange.svg)](#-architettura)
[![license](https://img.shields.io/badge/license-Proprietary-red.svg)](#-licenza)
---

## ✨ Cosa fa

Un piccolo laboratorio di stampa 3D ha bisogno di tracciare **chi ordina cosa, quanto costa, quanto materiale resta, e se conviene**. BASO 3D Manager lo fa in locale, senza server, senza account, senza abbonamenti.

- 👥 **Clienti** — anagrafica completa (ragione sociale, P.IVA, email, telefono, note, soft-delete)
- 🧾 **Ordini e preventivi** — più articoli per ordine, calcolo prezzi live (tempo × tariffa, materiale, post-processing, margine %, IVA per-riga)
- 🧵 **Magazzino filamenti** — PLA, PETG, ABS, TPU, ASA, Nylon, PC, Other. Densità, diametro, scorte in grammi, soglia alert, aggiustamenti rapidi ±100 g
- 🖨️ **Stampanti** — CRUD con volume di stampa e stato (attiva / manutenzione / ritirata)
- 📊 **Dashboard** — KPI (ordini attivi, fatturato 30gg, clienti, margine medio) + grafico fatturato + prossimi ordini
- 📤 **Export CSV** — UTF-8 BOM, separatore `,`, date `dd/mm/yyyy`, compatibile Excel IT
- 💾 **Backup / Restore** — ZIP con manifest versionato, ripristino atomico
- 🔄 **Auto-update** — notifiche in topbar, controllo ogni 6h, installazione con un click da GitHub Releases
- 🌙 **Dark mode** first-class

---

## 🖼️ Screenshot

| Dashboard | Ordine con calcolo live |
|---|---|
| _TODO: screenshot_ | _TODO: screenshot_ |

---

## 📦 Download

Vedi la pagina [Releases](../../releases). Ultima build stabile: **0.2.2**.

| Piattaforma | File | Note |
|---|---|---|
| macOS Apple Silicon | `BASO 3D Manager_0.2.2_aarch64.dmg` | macOS 10.15+ |
| macOS Intel | `BASO 3D Manager_0.2.2_x64.dmg` | macOS 10.15+ |
| Windows x64 | `BASO-3D-Manager-0.2.2-Setup.exe` | Windows 10/11, **WebView2** scaricato automaticamente |

> ⚠️ Entrambe le build sono **non firmate** in CI: al primo avvio macOS chiede autorizzazione da *Sicurezza e Privacy → Apri comunque*, Windows mostra lo SmartScreen (*Maggiori informazioni → Esegui comunque*).

---

## 🏗️ Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                       Tauri 2 (WebView2 / WKWebView)         │
│                                                               │
│   ┌───────────────────────────┐   ┌──────────────────────┐  │
│   │  Frontend (React 19)      │   │  Backend (Rust)      │  │
│   │                           │   │                      │  │
│   │  • Vite 6                 │   │  • rusqlite (SQLite) │  │
│   │  • Tailwind 4             │   │  • r2d2 pool         │  │
│   │  • TanStack Query         │◄─►│  • Comandi Tauri IPC │  │
│   │  • React Hook Form + Zod  │   │  • rusqlite migrations│  │
│   │  • Recharts (dashboard)   │   │  • csv + zip crates  │  │
│   │  • Radix UI primitives    │   │  • tracing logs      │  │
│   └───────────────────────────┘   └──────────┬───────────┘  │
│                                                │              │
│                                  ┌─────────────▼──────────┐  │
│                                  │  SQLite embedded file  │  │
│                                  │  ~/Library/Application │  │
│                                  │  Support/.../baso.db   │  │
│                                  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Schema DB (v1)

| Tabella | Cosa contiene |
|---|---|
| `customers` | anagrafica clienti, soft-delete |
| `filaments` | catalogo filamenti con scorte |
| `printers` | parco stampanti e stato |
| `orders` | testate ordine con stato, margine %, IVA per-riga |
| `quote_items` | righe preventivo con tempi, materiale, post-proc |
| `settings` | tariffa oraria, margine default, valuta, IVA (singola riga) |

Tutte le tabelle hanno `created_at` / `deleted_at` per audit e soft-delete. Foreign keys abilitate, WAL journal mode, migrations idempotenti.

### Calcolo prezzo (vedi [`src/lib/calc.ts`](src/lib/calc.ts))

```
item    = (time_h × hourly_rate + material_g/1000 × €/kg + post_proc) × qty
subtot  = Σ items
margin  = subtot × margin%
taxable = subtot + margin
vat     = taxable × vat_rate   (se apply_vat = true)
total   = taxable + vat
```

---

## 🧪 Qualità

- **35 test Rust** (`cargo test` in `src-tauri/`)
- **33 test TypeScript** (Vitest, dominio + schemi Zod)
- **CI matrix** — lint, type-check, test su ogni PR
- **0 warning** nel tree principale
- **CSP stretta** — `default-src 'self'`, no remote script

---

## 🚀 Sviluppo locale

### Prerequisiti

| Strumento | Versione |
|---|---|
| [Bun](https://bun.sh) | ≥ 1.3 |
| [Rust](https://rustup.rs) | stable ≥ 1.75 |
| [Tauri CLI](https://tauri.app) | `^2` (via `bunx`) |
| Xcode CLT (solo macOS) | latest |

### Setup

```bash
git clone https://github.com/basoxxx/Baso-3d-Manager.git
cd Baso-3d-Manager
bun install
bun run tauri:dev          # dev server con HMR
```

### Comandi utili

```bash
bun run dev                # solo Vite
bun run build              # build frontend (tsc + vite build)
bun run test               # Vitest
bun run test:e2e           # Playwright
bun run lint               # ESLint
bun run format             # Prettier
bun run tauri:dev          # app nativa con hot reload
bun run tauri:build        # build per OS corrente
```

### Build multipiattaforma

```bash
# macOS
bun run tauri:build:mac-arm
bun run tauri:build:mac-intel

# Windows (richiede rustup target)
rustup target add x86_64-pc-windows-msvc
bun run tauri:build:win
```

I bundle finiscono in `src-tauri/target/<target>/release/bundle/`.

### Release flow

```bash
bun run version:patch      # 0.2.2 → 0.2.3, commit, tag, push
# → GitHub Actions builda macOS+Windows, pubblica draft su Releases
```

---

## 🗂️ Struttura del repo

```
.
├── src/                       # React frontend
│   ├── components/
│   │   ├── layout/            # AppShell, Sidebar, TopBar
│   │   ├── ui/                # primitive (Button, Card, Modal, …)
│   │   ├── dashboard/         # KpiCard, RevenueChart, UpcomingList
│   │   └── domain/            # componenti specifici (orders, filaments)
│   ├── routes/                # una pagina per route di react-router
│   ├── hooks/                 # useCustomers, useOrders, useDashboard…
│   ├── lib/                   # calc, ipc, schemi Zod, query client
│   └── styles/                # globals.css + theme.css (design tokens)
│
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── commands/          # 8 moduli: customers, orders, filaments…
│   │   ├── db/                # migrations, pool, schema
│   │   ├── repos/             # data access layer
│   │   ├── backup.rs          # export/import ZIP con manifest
│   │   ├── csv_export.rs      # CSV UTF-8 BOM compatibile Excel IT
│   │   ├── paths.rs           # AppPaths
│   │   └── lib.rs             # run() + entry point
│   ├── capabilities/          # default.json — CSP e permessi IPC
│   ├── icons/                 # .icns / .ico / .png (10+ varianti)
│   ├── tauri.conf.json
│   └── Cargo.toml
│
├── docs/
│   ├── superpowers/plans/     # piani di implementazione
│   └── superpowers/specs/     # specifiche features
│
├── .github/workflows/
│   ├── ci.yml                 # lint + test su PR
│   └── release.yml            # matrix build su tag v*
│
├── index.html                 # entry Vite
├── vite.config.ts
├── tailwind.config.* (via PostCSS)
├── vitest.config.ts
└── package.json
```

---

## 🔐 Sicurezza

- **CSP** stretta: `default-src 'self'`, asset locali o `data:`
- Permessi Tauri minimi in `capabilities/default.json` (filesystem scoped, dialog, updater)
- Niente telemetria, niente richieste remote a server terzi (l'unica chiamata esterna è il check di update verso GitHub Releases)
- I dati utente restano in locale; nessun cloud, nessun sync

---

## 🤝 Contribuire

Per ora il progetto è in fase di **single-maintainer** (Diego Basolo). PR e issue sono benvenute ma potrebbero richiedere tempo per la review.

1. Fork & branch (`feat/nome-corto`)
2. `bun install && bun run tauri:dev` per validare
3. `bun run lint && bun run test` deve restare verde
4. Apri PR descrivendo il *cosa* e il *perché*, non il *come*

---

## 📜 Licenza

**Proprietario** — © Diego Basolo. Tutti i diritti riservati.
Il codice è pubblicato per riferimento e build locale; ridistribuzione, vendita o uso commerciale non autorizzati sono vietati.

Vedi [`CHANGELOG.md`](CHANGELOG.md) per la storia delle release.
