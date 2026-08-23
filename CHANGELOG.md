# 📜 Changelog

All notable changes to **Ghostwriter** are documented in this file in accordance with [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.2] - 2026-08-23

### Security & UX Hardening
- **Protected Sensitive Endpoint Configuration**: Custom Backend forms no longer expose or pre-populate internal Supabase project URLs or keys in public text inputs.
- **Dedicated Custom Backend Reset**: Added 1-click `[↺ Reset]` action allowing self-hosted users to revert to the default cloud backend seamlessly.
- **Glassmorphism Custom Backend UI**: Upgraded custom backend form with sleek purple gradient action buttons and descriptive security banners.

---

## [0.5.1] - 2026-08-23

### Added
- **1-Click AI Undo Snapshot**: Automatically records pre-generation chapter state with dedicated `[↺ Restore Previous Text]` action.
- **Recursive Cascade Branch Pruning**: Pruning any parent chapter automatically cascade prunes all child and descendant branch subtrees.
- **Parent Branch Divergence Safeguard**: Amber button highlights and confirmation modal with options to cascade prune or permanently delete downstream child branches upon root edits.
- **In-Place Cloud Story Updates**: Deterministic UUID stability resolving duplicate database insertions during multi-session editing.
- **Multi-Account PostgreSQL Cloud Isolation**: User-scoped deterministic UUIDs ensuring 50+ concurrent author accounts with zero primary key collisions.
- **Story Switcher & Cloud Catalog**: Multi-story catalog in top navigation bar and cloud modal for 1-click project switching.
- **Comprehensive Regression Suite**: 10 scenario tests covering graph DAG operations, cascade pruning, undo snapshots, and RFC-4122 UUID compliance running pre-build and in CI.
- **Mobile Navigation Suite**: Persistent cloud indicator, editor quick toggle, and slide-over menu drawer for mobile viewports.

---

## [0.5.0] - 2026-08-22

### Added
- Linked official remote GitHub repository at `https://github.com/manmohanml1/ghostwriter`.
- Automated GitHub Actions CI/CD workflow (`.github/workflows/ci.yml`) validating contracts, tests, and production builds.
- Supabase PostgreSQL schema (`infrastructure/supabase/schema.sql`) with Row-Level Security (RLS) policies.
- In-App `AuthModalComponent` supporting Email/Password, Google OAuth, GitHub OAuth, and custom Supabase backend configuration.
- Header Account and Cloud Sync Status Pill (`👤 Account` / `☁️ Synced` / `💾 Local Mode`).
- Canonical governance documentation: `docs/PROJECT_GUIDE.md`, `docs/DEPLOYMENT.md`, and ADRs 0001 through 0004.

---

## [0.4.0] - 2026-08-22

### Added
- Cascading Tri-Provider AI Failover: Google Gemini 2.5 Flash $\rightarrow$ Groq Llama 3.3 70B $\rightarrow$ Smart Offline Beat Engine.
- Live AI Health Telemetry status pill in the studio header.
- Multi-key BYOK settings modal with roundtrip connection latency diagnostics.
- Dynamic non-repetitive offline narrative beat generation.

---

## [0.3.0] - 2026-08-22

### Added
- Deep 1,500w+ Webnovel Chapter Expansion with narrative beat selector (*Balanced*, *Action*, *Dialogue*, *Investigation*, *Cliffhanger*).
- Sequential scene streaming (`⏩ + Write Next Paragraph`).
- Immersive Webnovel E-Reader with 4 themes: *Dark Slate*, *OLED Black*, *Warm Sepia*, and *Novel Paper*.
- Slide-out Table of Contents drawer.
- Novel Manuscript (`.md`) publishing export suite.

---

## [0.2.0] - 2026-08-22

### Added
- AI 3-Way Branch Hypothesis Generator (*Action*, *Plot Twist*, *Intrigue*).
- World & Character Lore Bible with character traits and consistency tracking.
- Story Style Controls (Genre, Pacing, Tone, Dialogue Density).
- Interactive Choose-Your-Own-Adventure reader mode.

---

## [0.1.0] - 2026-08-22

### Added
- Initial monorepo workspace scaffold with Angular 19 standalone web app and `@ghostwriter/contracts`.
- Interactive SVG Directed Acyclic Graph (DAG) canvas with pan, zoom, and cubic bezier spline connectors.
- Reactive `TreeStore` with browser `IndexedDB` persistence.
- Node inspector with Markdown editing and node status lifecycle (*Active*, *Canon*, *Pruned*).
