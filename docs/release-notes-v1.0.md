# Pool Boy Pro — Release Notes v1.0.0

**Release date:** July 7, 2026  
**Version:** 1.0.0

---

## Overview

Pool Boy Pro v1.0 is the first public release of a local-first pool water testing and management application centered on the **Taylor K-2006-SALT** test kit. This release delivers a complete workflow from test entry through analysis, treatment planning, history, charts, and operational tools for equipment, maintenance, and chemical inventory.

---

## Major Features

### Water Testing & Analysis
- Guided Taylor K-2006-SALT test wizard with step validation and review screen
- **Edit existing tests** — change any reading and automatically regenerate water analysis, CSI, health score, treatment plan, and dashboard/history summaries
- Pool profile configuration (surface, sanitizer, environment, spa mode) drives chemistry targets
- Water health score, parameter bands, CSI explanation, and prioritized recommendations
- Sequenced treatment plans with inventory and equipment integration

### Tracking & Reporting
- Dashboard with latest test health summary, FC/pH trends, and integration alerts
- Test history with search, filters, sorting, and side-by-side comparison
- Profile-aware chart ideal range overlays on all trend parameters
- Printable pool water report
- Standalone dosing calculator

### Pool Operations
- Equipment registry with warranty expiration alerts
- Maintenance scheduler with overdue/due-soon grouping and completion tracking
- Chemical inventory with low, expired, and expiring-soon alerts
- Cross-feature integration (recommendations check inventory; maintenance pre-fill from treatment steps)

### Settings & Data
- Pool name, volume, theme, Taylor preferences, and chemical product strengths
- JSON backup export and validated import
- Light, dark, and system theme support

---

## Reliability & Quality Fixes

### Critical (RC pass)
- Immutable state snapshots on save — UI updates immediately after test/equipment/inventory changes
- Corrupt `localStorage` detection with user notice and restore guidance
- Save failure surfacing when browser storage is unavailable or quota is exceeded

### High Priority (v1.0 polish)
- **404 / Not Found page** for invalid routes with navigation back to Dashboard
- **Accessibility** — removed invalid nested `<Link><Button>` patterns via `NavButton`
- **Settings sync** — local form state stays in sync with context after import or in-test preference saves
- **Import validation** — malformed backups rejected with clear errors; no partial imports
- **Profile-aware charts** — ideal range overlays reflect the selected pool profile
- **Shared Taylor workflow** — New Test and Edit Test reuse `TaylorTestWorkflow`
- **Code cleanup** — consolidated status labels, step guides, and removed dead `useFilteredTests` hook
- **Document titles** — page title updates per route via `getPageTitle`

---

## Known Limitations

- **Local storage only** — no cloud sync; data is tied to the browser and device
- **Taylor kit primary** — optimized for K-2006-SALT; test strip entry is not implemented (history filter exists for legacy data only)
- **Legacy tests without analysis** — older imports may lack analysis; edit and save to regenerate
- **Browser dialogs** — destructive actions use `confirm()` rather than custom modals
- **System theme** — may not react to OS theme changes without a page reload
- **Bundle size** — production JS bundle is ~780 KB; route code-splitting not yet implemented
- **Calculator** — does not block zero pool volume input
- **Reports** — print view omits some integration badges present on screen

> **Chemistry disclaimer:** Calculations and dosing amounts are informational. Verify all results against your Taylor kit instructions, chemical product labels, and applicable professional standards before treating real pool water.

---

## Test & Build Status

Verified at release:

| Check | Result |
|-------|--------|
| Unit tests | **129 passing** (19 test files) |
| Production build | **Passing** (`tsc -b && vite build`) |
| Lint | Available via `npm run lint` |

Commands:

```bash
npm run test
npm run build
```

---

## Upgrade Notes

- First release — no migration from prior versions required
- Export a backup from Settings before clearing browser data or switching browsers
- Imported backups must include valid settings and complete test records (readings and pool info per test)

---

## Documentation

- [README.md](../README.md) — setup, features, and development commands
- [release-candidate-review.md](./release-candidate-review.md) — full pre-release review
