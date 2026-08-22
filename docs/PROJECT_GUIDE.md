# Ghostwriter Project Guide

This is the canonical index for the product, engineering, and governance rules established for **Ghostwriter** — the AI Co-Writing Studio with Interactive Branching Narratives.

---

## 1. Source Precedence

When two sources disagree, use this strict order of authority:

1. **Accepted Architecture Decision Records** in `docs/adr/`
2. **Product Invariants & Governance Rules** in `docs/PROJECT_GUIDE.md` and `docs/DEPLOYMENT.md`
3. **Active Milestone Acceptance Contracts** in `docs/milestones/`
4. **Current Implementation and Automated Verification Tests**
5. **Chat History and Discussion Transcripts**

*If implementation contradicts a higher-priority record, either correct the code or draft an ADR that deliberately records the evolution. Do not silently drift.*

---

## 2. Product Principles & Invariants

1. **Deterministic Foundations Before AI Augmentation**: The visual DAG engine, graph layout, branch switching, and local persistence work with 100% fidelity offline without AI. AI personas generate continuations and hypotheses, but the deterministic state machine enforces schema validity.
2. **Visual Narrative Tree as First-Class Canvas**: Every branch point, alternate timeline, and character decision is rendered as an interactive, navigable graph tree with pan, zoom, and bezier spline routing.
3. **Resilience to Provider Outages & Rate Limits**: External API limits (e.g., Gemini rate limits, Groq quotas) are modeled as visible, recoverable application states with cascading failover, never unhandled crashes.
4. **Permanent Zero-Cost Budget Invariant**: The base system is engineered strictly to run within **$0.00/month** free-tier boundaries (Vercel Hobby + Supabase Free + Client BYOK AI).
5. **Local-First Safety & Data Sovereignty**: All active edits are committed to browser `IndexedDB` before dispatching remote network sync events.

---

## 3. Reference Model vs. Beyond Baseline Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   REFERENCE MODEL & BEYOND BASELINE                         │
├──────────────────────────┬────────────────────────────┬─────────────────────┤
│ Reference Source         │ What We Adopt (Baseline)   │ How Ghostwriter     │
│                          │                            │ Surpasses It        │
├──────────────────────────┼────────────────────────────┼─────────────────────┤
│ **CommitQuest**          │ • Strict PR & Release Flow │ • Adds Interactive  │
│                          │ • Zero-Cost Hosting Model  │   Infinite SVG DAG  │
│                          │ • ADR Documentation Suite  │ • Tri-Provider AI   │
│                          │ • 4-Environment Isolation  │   Auto-Failover     │
├──────────────────────────┼────────────────────────────┼─────────────────────┤
│ **E-Reader & Webnovel    │ • Sepia/OLED/Dark Themes   │ • Non-linear branch │
│ Platforms**              │ • Fluid typography scaling │   choice navigation │
│                          │ • Table of Contents drawer │ • 1,500w AI expander│
└──────────────────────────┴────────────────────────────┴─────────────────────┘
```

- **Reference Model, Not Rigid Ceiling**: We reference `commitquest` and open-source e-reader engines as engineering benchmarks for governance, deployment discipline, and reader ergonomics.
- **Continuous Superiority**: Ghostwriter is built to improve upon and surpass reference models by introducing unique, high-value capabilities (e.g. mathematical branch trees, multi-scene novel prose expansion, and character Lore Bibles).

---

## 4. Non-Negotiable Branching, Deployment & Release Rules

### A. Zero Direct Commits to Master
> [!CAUTION]
> **Never commit or push directly to the `master` / `main` branch under any circumstances.** All work must originate on an isolated topic branch.

### B. Standard Branch Naming Taxonomy
Branches must strictly use one of the following standard semantic prefixes:

| Prefix | Purpose | Example |
|---|---|---|
| `feat/` | New features or product capabilities | `feat/public-story-showcase`, `feat/epub-export` |
| `fix/` | Bug fixes and visual/layout corrections | `fix/modal-clipping`, `fix/token-refresh` |
| `docs/` | Documentation, ADRs, and governance rules | `docs/enforce-post-merge-deploy-rule` |
| `refactor/` | Code refactoring without behavioral change | `refactor/tree-canvas-svg` |
| `chore/` | Dependency upgrades, CI/CD, or build scripts | `chore/upgrade-angular` |

### C. Zero Pre-Merge Production Deployments
> [!CAUTION]
> **NEVER DEPLOY TO VERCEL PRODUCTION BEFORE A PR IS APPROVED AND MERGED TO `MASTER`.**
> 
> - **Pre-Merge Testing**: Occurs strictly in `dev` (local), `test` (CI), or `stage` (immutable Vercel Preview deployments generated on the PR).
> - **Production Deployment**: Occurs strictly on `master` **after** the PR has been reviewed, approved, and merged.

### D. Explicit Owner-Gated Merge & Release Rule
> [!IMPORTANT]
> **NEVER MERGE ANY PULL REQUEST OR TAG RELEASES WITHOUT EXPLICIT OWNER INSTRUCTION.**
> 
> The development lifecycle:
> 1. Create and push topic branch: `git checkout -b <prefix>/<name>`
> 2. Implement changes and run `npm run build` verification
> 3. Open Pull Request with completed `.github/pull_request_template.md`
> 4. Present the PR link, Vercel Preview URL, and verification evidence to the repository owner
> 5. **STOP AND WAIT**: Merge the PR and deploy to production *only* after the owner explicitly says `"merge"`.

---

## 5. Stable Scope Decisions

- Graph topology is strictly a Directed Acyclic Graph (DAG); cycle formation is prohibited by domain validation.
- Node contents support standard GitHub-flavored Markdown.
- Client runs fully in offline mode with bundled demo trees when backend API is unreachable.
- Post-1.0 features: Android standalone APK distribution via GitHub Actions / Capacitor, in-app auto-updater, multi-user real-time collaborative writing.
