# Versioning and Releases

Ghostwriter uses Semantic Versioning (`vMAJOR.MINOR.PATCH`) to govern all product, contract, and infrastructure milestones.

---

## 1. Product Progression to v1.0.0

```text
v0.1.0  Local-first DAG engine, SVG canvas, and reactive store
v0.2.0  AI 3-way hypothesis generator, Lore Bible, and Choose-Your-Own-Adventure reader
v0.3.0  Full 1,500w+ webnovel chapter expansion, e-reader themes, and novel manuscript export
v0.4.0  Cascading tri-provider AI failover (Gemini -> Groq -> Offline) and quota telemetry
v0.5.0  4-Environment matrix, GitHub remote CI/CD, Supabase schema, and verified Vercel hosting
v0.5.1  Cascade pruning, in-place cloud sync, parent divergence warning, and 1-click undo snapshot
v0.5.2  Security hardening, masked backend credentials, and dynamic version badge binding
v0.5.3  Pure dynamic synthesis engine, thematic scene weaver, Gemini 3.6 discovery, and mobile bottom sheet drawer
v0.6.0  1-Click public story showcase links (/story/:slug) and standalone reader player
v0.7.0  Community story gallery and reader bookmarks
v0.8.0  ePub & print-ready PDF publishing suite
v0.9.0  Accessibility audit, performance optimization, and hardening
v1.0.0  Stable production release (Free & Pro Writer tiers)
```

---

## 2. Release & Tagging Invariants

1. **Owner Authorization Required**:
   - A completed milestone, merged Pull Request, or successful production deployment does **not** authorize a tag or GitHub Release.
   - Annotated release tags (`vX.Y.Z`) and GitHub Releases are created **strictly upon explicit owner instruction**.

2. **Tag Format**:
   - Production releases use annotated Git tags matching `v[0-9]+.[0-9]+.[0-9]+` (e.g. `v0.5.0`, `v0.6.0`).
   - Prereleases and release candidates use `-preview.N`, `-beta.N`, or `-rc.N`.
   - Environments (`dev`, `test`, `stage`, `prod`) are deployment metadata and never appear in a product version string.

3. **Automated Release Packaging Workflow** (`.github/workflows/release.yml`):
   - Triggered automatically when an approved tag is pushed to `origin`.
   - Validates contracts, compiles the production Angular bundle, archives `ghostwriter-web-vX.Y.Z.zip`, and attaches it to the official GitHub Release with auto-generated release notes.

---

## 3. Independent Compatibility Versions

To prevent cross-layer coupling, sub-components maintain independent versioning:
- Domain Contract Schema version (`@ghostwriter/contracts`)
- Database Migration / Supabase Schema version (`infrastructure/supabase/schema.sql`)
- Story DAG State Machine version (`StoryTree.version`)
- AI Prompt & Persona ruleset version

---

## 4. Change Classification Policy

- `feat:` produces a minor version increment (`v0.X.0`).
- `fix:` and `perf:` produce a patch version increment (`v0.X.Y`).
- `feat!:` or `BREAKING CHANGE:` produces a major version increment (`v1.0.0`).
- `docs:`, `test:`, `ci:`, and `chore:` are recorded in `CHANGELOG.md` without forcing an immediate product release alone.
