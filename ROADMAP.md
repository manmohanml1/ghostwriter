# 🗺️ Ghostwriter Roadmap to v1.0.0

This document tracks the phased development and release plan for **Ghostwriter**, evolving from a local-first studio into a complete cloud-connected webnovel publishing platform.

---

## Phase 1: Local-First Studio Engine (v0.1.0 – v0.4.0) — ✅ Completed

- [x] **v0.1.0 (Scaffold & DAG Visual Canvas)**:
  - Strict TypeScript domain contracts in `@ghostwriter/contracts`.
  - Reactive Signal Store (`TreeStore`) with local browser persistence.
  - Interactive SVG canvas with zoom, pan, and cubic bezier spline routing.
  - Node inspector with GitHub-flavored Markdown editing.

- [x] **v0.2.0 (AI Co-Writer Personas & E-Reader Mode)**:
  - 3-Way AI branch suggestions (*Action*, *Plot Twist*, *Intrigue*).
  - Character & World Lore Bible for narrative consistency.
  - Genre, Pacing, and Tone style controls.
  - Interactive Choose-Your-Own-Adventure reader mode.

- [x] **v0.3.0 (Full Webnovel Chapter Expander & E-Reader Themes)**:
  - Deep 1,500–2,500+ word multi-scene chapter expansion.
  - Sequential paragraph continuation (`⏩ + Write Next Paragraph`).
  - 4 E-Reader themes: *Dark Slate*, *OLED Black*, *Warm Sepia*, *Novel Paper*.
  - Full Novel Manuscript (`.md`) export suite.

- [x] **v0.4.0 (Tri-Provider Rate Limit Defense & Telemetry)**:
  - Cascading failover: Gemini 2.5 Flash $\rightarrow$ Groq Llama 3.3 70B $\rightarrow$ Dynamic Offline Beat Engine.
  - Live AI health status pill and roundtrip latency diagnostics.
  - Dynamic, non-repetitive offline branch generation.

---

## Phase 2: Remote Governance & Cloud Sync (v0.5.0 – v0.6.0) — 🔄 Active

- [x] **v0.5.0 (Remote GitHub & Cloud Sync Engine)**:
  - Official remote repository: [https://github.com/manmohanml1/ghostwriter](https://github.com/manmohanml1/ghostwriter).
  - Automated GitHub Actions CI/CD workflow (`.github/workflows/ci.yml`).
  - Supabase PostgreSQL schema with Row-Level Security (RLS).
  - In-app Supabase Auth Modal (Email, Google, GitHub, Custom Backend).

- [x] **v0.5.1 (Cascade Pruning, In-Place Cloud Sync & End-to-End Regression Suite)**:
  - 1-Click AI Undo Snapshot (`[↺ Restore Previous Text]`).
  - Recursive Cascade Branch Pruning with descendant cleanup.
  - Parent Chapter divergence safeguard & high-contrast action modal.
  - Multi-account PostgreSQL UUID scoping & in-place story update stability.
  - Persistent mobile navigation toolbar and slide-over menu drawer.
  - Automated native end-to-end regression test suite running pre-build & in CI.

- [ ] **v0.6.0 (Public Story Showcase & Standalone Web Player)**:
  - 1-Click "Publish Story" generating shareable URLs (`/story/:slug`).
  - Standalone reader player for mobile readers with branch choices.
  - OpenGraph / Twitter meta-cards for social media sharing.

---

## Phase 3: Community & Production Launch (v0.7.0 – v1.0.0) — ⏳ Upcoming

- [ ] **v0.7.0 (Community Story Gallery & Bookmarks)**:
  - Discover and read branching stories published by other authors.
  - Reader bookmarks and rating system.

- [ ] **v0.8.0 (Novel Formatting & Export Suite)**:
  - Direct ePub and print-ready PDF compilation.
  - Custom book cover generator.

- [ ] **v0.9.0 (Hardening, Accessibility & Performance)**:
  - WCAG 2.1 AA accessibility audit (keyboard navigation, screen reader support).
  - SVG canvas viewport culling for 1,000+ node trees.

- [ ] **v1.0.0 (Production Launch & Monetization Tiers)**:
  - Free Tier ($0/mo): Unlimited DAG authoring, full offline engine, 3 public showcase stories.
  - Pro Writer Tier ($8/mo): Managed cloud AI tokens, ePub/PDF export, multiplayer collaborative rooms.
