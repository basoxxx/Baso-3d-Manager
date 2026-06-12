# Changelog

Tutte le modifiche notevoli a BASO 3D Manager.

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
