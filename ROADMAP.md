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

- [x] **v0.5.2 (Security Hardening & Protected Endpoint Configuration)**:
  - Protected Custom Backend inputs with clean placeholders and no pre-population.
  - 1-Click reset to default cloud backend.
  - Upgraded custom backend glassmorphism action styling.

- [x] **v0.5.3 (DAG Lifecycle Hardening, Pure Dynamic Synthesis, Gemini 3.6 & Mobile Architecture)**:
  - **Pure Dynamic Narrative Synthesis Engine**: 100% elimination of hardcoded candidate matrices, synthesizing branch hypotheses and continuations from active chapter prose and lore.
  - **Thematic Scene Weaver & Location Seeding**: Classifies chapter themes (Discovery/Anomaly, Infiltration/Stealth, Action/Confrontation) to generate rich, non-overlapping scene prose, with automatic extraction and seeding of named world settings.
  - **Dynamic Model Discovery & Google AI Studio Gemini 3.6**: Auto-queries `ListModels` for `gemini-3.6-flash` and `gemini-3.6-pro`; auto-retries deprecation errors.
  - **Dynamic Groq LPU Discovery**: Multi-model selector (`llama-3.3-70b`, `deepseek-r1-70b`, `llama-3.1-8b`, `qwen-2.5-32b`).
  - **Scope & Depth-Aware Narrative Vector Engine**: Story Scope selector (`Short ~3-5 Ch`, `Medium ~8-15 Ch`, `Long ~20+ Ch`) adapting narrative velocity across genres.
  - **Universal In-Flight Entity Harvester**: 1-click discovery and ingestion of newly introduced characters, locations, factions, and key items into the Lore Bible.
  - **Sequential Sibling Lettering & Canon Sanitization**: Smart `Path D/E/F` lettering; automatic `Path X:` prefix stripping upon canon promotion; single canon sibling reconciliation.
  - **Mobile Slide-up Bottom Sheet Drawer**: 3-state bottom sheet (`PEEK` / `HALF` / `FULL`) with floating canvas controls and segmented navigation.
  - **Expanded Regression Suite**: 23 test suites with 65 automated end-to-end assertions.

- [ ] **v0.6.0 (Visual Lorebook, Public Story Showcase & Standalone Web Player)**:
  - Visual Character Relationship Network Graph and Keyword Activation Tags.
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
