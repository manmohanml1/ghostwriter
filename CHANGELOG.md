# 📜 Changelog

All notable changes to **Ghostwriter** are documented in this file in accordance with [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.0] - 2026-08-23

### Added
- **Real Supabase PostgreSQL Cloud Integration**: Replaced mock storage with live PostgreSQL tables (`stories`, `tree_nodes`, `tree_edges`, `lore_entities`) and Row-Level Security (RLS).
- **Multi-Account Cloud Isolation**: User-scoped deterministic UUIDs (`toUUID`) supporting 50+ concurrent author accounts with zero primary key collisions.
- **In-Place Cloud Story Updates**: Deterministic UUID stability resolving duplicate database insertions during multi-session editing.
- **Story Switcher & Cloud Catalog**: Multi-story catalog in top navigation bar and cloud modal for 1-click project switching.
- **OAuth & Email Authentication**: Real Google OAuth, GitHub OAuth, and Email/Password flows via Supabase Auth with custom credentials fallback.
- **1-Click AI Undo Snapshot**: Automatically records pre-generation chapter state with dedicated `[↺ Restore Previous Text]` action.
- **Recursive Cascade Branch Pruning**: Pruning any parent chapter automatically cascade prunes all child and descendant branch subtrees.
- **Parent Branch Divergence Safeguard**: Amber button highlights and confirmation modal with options to cascade prune or permanently delete downstream child branches upon root edits.
- **End-to-End Regression Test Suite**: 10 scenario tests covering graph DAG operations, cascade pruning, undo snapshots, and RFC-4122 UUID compliance running pre-build and in CI.
- **Mobile Navigation Suite**: Persistent cloud indicator, editor quick toggle, and slide-over menu drawer for mobile viewports.
- **Automated CI/CD Workflows**: GitHub Actions CI validating contracts, unit/regression tests, and production Angular bundle generation.
- **Canonical Governance Documentation**: `docs/PROJECT_GUIDE.md`, `docs/DEPLOYMENT.md`, ADRs 0001–0004, and `docs/milestones/0.5.0.md`.

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
