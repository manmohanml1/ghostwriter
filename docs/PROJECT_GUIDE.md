# Ghostwriter Project Guide

This is the canonical index for the product and engineering decisions established for **Ghostwriter** — the AI Co-Writing Studio with Interactive Branching Narratives.

## Source Precedence

When two sources disagree, use this order:

1. Accepted architecture decision records in `docs/adr/`
2. Security and product invariants in `docs/ARCHITECTURE.md` and `docs/PROJECT_GUIDE.md`
3. The active milestone contract in `docs/milestones/`
4. Current implementation and automated tests
5. Chat history and issue records

If implementation contradicts a higher-priority record, either correct the implementation or write an ADR that deliberately changes the decision. Do not silently drift.

---

## Product Invariants & Principles

1. **Deterministic Foundations Before AI Augmentation**: The core story graph DAG traversal, serialization, branch switching, and local persistence work 100% offline without AI. AI generates continuations and hypotheses, but the deterministic state machine enforces schema invariants.
2. **Visual Narrative Tree as First-Class Canvas**: Every branch point, alternate timeline, and character decision is rendered as an interactive, navigable graph tree.
3. **Resilience to Provider Outages & Cold Starts**: External API limits (e.g., Gemini rate limits, Render/Neon spin-up delays) are modeled as visible, recoverable application states, never unhandled crashes.
4. **Permanent Zero-Cost Operation**: The base system is engineered strictly to run within **$0/month** free-tier boundaries (Vercel + Render/Cloud Run + Neon/Supabase + Gemini Flash).
5. **Local-First Safety**: All active edits are committed to browser `IndexedDB` before dispatching remote network sync events.

---

## Stable Scope Decisions

- Graph topology is strictly a Directed Acyclic Graph (DAG); cycle formation is prohibited by domain validation.
- Node contents support standard GitHub-flavored Markdown.
- Client runs fully in offline mode with bundled demo trees when backend API is unreachable.
- Post-1.0 features: Android standalone APK distribution via GitHub Actions / Capacitor, in-app auto-updater, multi-user real-time collaborative writing.
