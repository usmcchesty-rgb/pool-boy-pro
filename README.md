# Pool Boy Pro

Pool Boy Pro is a browser-based pool water testing and management app built for owners and service professionals who use the **Taylor K-2006-SALT** test kit. Record titration readings step by step, get water analysis and treatment recommendations, track chemistry trends over time, and keep equipment, maintenance, and chemical inventory in one place.

All data is stored locally in your browser (`localStorage`). Export backups regularly from Settings.

> **Disclaimer:** Chemistry calculations and dosing recommendations are provided for convenience. Always verify results against your test kit instructions, product labels, and professional guidance before adjusting real pool water.

## Core Features

- **Taylor K-2006-SALT test workflow** — Guided step-by-step entry for FC, CC, pH, TA, CH, CYA, salt, and temperature
- **Edit existing tests** — Update readings and automatically regenerate analysis, CSI, health score, and treatment plan
- **Water analysis** — Parameter status, Langelier Saturation Index (CSI), water health score, and prioritized recommendations
- **Treatment plans** — Sequenced steps with wait times, inventory availability, and equipment references
- **Dashboard** — Latest test summary, trends, maintenance alerts, equipment warranty notices, and inventory alerts
- **History** — Search, filter, sort, and compare tests over time
- **Charts** — Profile-aware ideal range overlays on trend charts
- **Calculator** — Standalone dosing calculator using your chemical strengths and pool volume
- **Reports** — Printable pool water report
- **Pool profile** — Surface, sanitizer, environment, and spa mode drive chemistry targets
- **Equipment** — Track pumps, filters, heaters, SWG, and other gear with warranty dates
- **Maintenance scheduler** — Recurring and one-time tasks with overdue/due-soon status
- **Chemical inventory** — On-hand stock with low, expired, and expiring-soon alerts
- **Settings** — Theme, Taylor preferences, chemical strengths, backup export/import

## Tech Stack

- React 19 + TypeScript
- Vite
- React Router
- Recharts
- Vitest

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm

## Local Development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build & Test

```bash
# Run unit tests
npm run test

# Production build
npm run build

# Preview production build locally
npm run preview

# Lint
npm run lint
```

## Data Storage

Pool Boy Pro stores all application data in the browser under the key `pool-boy-pro-data`. Data includes settings, water tests, equipment, maintenance tasks, and chemical inventory.

- Data stays on your device unless you export a backup
- Clearing browser storage or using private browsing can remove data
- Use **Settings → Backup & Restore → Export Backup** to save a JSON backup file
- Import restores all data after validation

## Taylor K-2006-SALT Focus

The New Test and Edit Test workflows are designed around the Taylor K-2006-SALT kit:

- FAS-DPD free and combined chlorine (10 mL or 25 mL sample sizes)
- pH with optional acid/base demand
- Total alkalinity and calcium hardness (drops or direct ppm entry)
- Cyanuric acid turbidity test
- Salt titration for saltwater pools

Default sample size and entry modes can be configured in Settings.

## Project Structure

```
src/
  chemistry/     # Analysis, CSI, dosing, pool profiles
  components/    # UI and feature components
  context/       # App state and persistence
  pages/         # Route pages
  services/      # Test creation, import/export
  storage/       # localStorage repository
  utilities/     # Formatting, validation, chart helpers
docs/            # Release notes and review documents
```

## Release

See [docs/release-notes-v1.0.md](docs/release-notes-v1.0.md) for v1.0 release details.

## License

Private project — see repository owner for terms of use.
