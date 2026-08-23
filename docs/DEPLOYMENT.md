# Deployment Guide: Ghostwriter

This document records the exact 4-environment matrix, hosting topology, verified live deployments, zero-cost budget, and release promotion contracts for **Ghostwriter**.

---

## 1. Verified Live Deployments

- **Production Web Application**: [https://web-green-beta-4giz07ncu3.vercel.app](https://web-green-beta-4giz07ncu3.vercel.app)
- **Vercel Project Dashboard**: `https://vercel.com/manmohanlonawat-8572s-projects/web`
- **Hosting Region**: Washington, D.C., USA (`iad1`)
- **Deployment Status**: `READY / 200 OK` (Edge CDN active)

---

## 2. The 4-Environment Matrix

Ghostwriter maintains 4 strictly isolated environments with typed configuration schemas:

| Environment | Purpose | Hosting / Runtime | Data & Storage Boundary |
|---|---|---|---|
| **`dev`** | Local feature development & rapid prototyping | Local Node.js (`http://localhost:4200`) | In-browser `IndexedDB` & mock sessions |
| **`test`** | Automated CI verification & contract validation | GitHub Actions Ubuntu Runner (`quality.yml`) | Headless mocks & ephemeral fixtures |
| **`stage`** *(Preview)* | Immutable staging preview for open Pull Requests | Vercel Preview Deployments | Staging Supabase schema / isolated preview data |
| **`prod`** | Canonical public web studio & reader player | Vercel Production Edge CDN (`iad1`) | Production Supabase PostgreSQL with RLS |

---

## 3. Hosting Architecture & Free-Tier Budget

Ghostwriter is engineered to operate permanently at **$0.00/month** total cost.

| Environment Role | Provider / Tier | Configuration & Limits |
|---|---|---|
| **Static Web App** | Vercel Hobby | Edge CDN distribution, automated HTTPS, SPA routing via `vercel.json` |
| **Database & Auth** | Supabase Free | 500 MB PostgreSQL storage, 50,000 MAU, Row-Level Security (RLS) |
| **AI Inference** | Client BYOK | Google AI Studio (1,500 req/day) + Groq (Llama 3.3 70B free tier) |
| **Offline Fallback** | Local Browser | In-memory Dynamic Beat Engine + `IndexedDB` storage |

---

## 4. Strict Promotion & Release Contract

```text
1. Pull Request Opened on Feature Branch (`feat/...`, `fix/...`, `docs/...`)
   │
   ▼
2. Automated GitHub Actions CI Check (.github/workflows/quality.yml)
   │ • Conventional Commit PR title verification
   │ • TypeScript contracts build & Angular production build
   │ • Upload immutable artifact: `ghostwriter-web-${{ github.sha }}`
   ▼
3. Vercel Staging Deployment (Immutable Preview URL Generated on PR)
   │ • Manual smoke QA of Canvas, AI Failover & E-Reader on Preview URL
   ▼
4. STOP & AWAIT OWNER REVIEW: NEVER DEPLOY TO PRODUCTION PRE-MERGE
   │
   ▼
5. Pull Request Merged into `master` (Explicit Owner Approval Required)
   │
   ▼
6. Production Vercel Deployment (Promote Artifact to Canonical Production Domain)
   │ • Verify live production URL: https://web-green-beta-4giz07ncu3.vercel.app
   ▼
7. Explicit Annotated Git Tag & GitHub Release (vMAJOR.MINOR.PATCH)
```

> [!CAUTION]
> **Zero Pre-Merge Production Deployments**:
> Production deployment commands (`npx vercel --prod`) are strictly forbidden on unmerged feature branches. Production promotion happens strictly on `master` following merge approval.

---

## 5. Branch Protection, Rulesets & Pre-Push Guard Architecture

Ghostwriter enforces an automated 3-layer security lockdown ensuring no code enters `master` without full regression verification and pull request review:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   3-LAYER REPOSITORY SECURITY LOCKDOWN                   │
├──────────────────────────────────────────────────────────────────────────┤
│ 1. LOCAL GIT PRE-PUSH GUARD (`.git/hooks/pre-push`)                     │
│    • Intercepts local `git push origin master` commands immediately.     │
│    • Aborts direct pushes before reaching the network.                   │
├──────────────────────────────────────────────────────────────────────────┤
│ 2. GITHUB REPOSITORY RULESET (ID: 21227008 — Active)                    │
│    • Target: `refs/heads/master` & `refs/heads/main`                     │
│    • Pull Request Required: Direct pushes hard-rejected (GH006 error).    │
│    • Bypass Actors: Empty (`current_user_can_bypass: "never"`).          │
│    • Mandatory Status Checks: `build-and-test` must pass on every PR.    │
├──────────────────────────────────────────────────────────────────────────┤
│ 3. CLASSIC BRANCH PROTECTION (`enforce_admins: true`)                    │
│    • Blocks force pushes (`allow_force_pushes: false`).                  │
│    • Blocks branch deletion (`allow_deletions: false`).                  │
│    • Enforces admin compliance unconditionally.                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Pre-Deployment Verification Protocol
Every commit and deployment must follow this sequence:
1. **Local Regression Suite**: Run `npm test` locally (13 tests must pass).
2. **Local Production Build**: Run `npm run build` locally (must exit with code 0).
3. **Staging Preview**: Deploy feature branch via `npx vercel --yes` for staging smoke testing.
4. **Pull Request**: Open PR targeting `master` on GitHub.
5. **Merge & Tag**: Merge via GitHub, switch to `master`, pull, tag `vX.Y.Z`, and promote to production via `npx vercel --prod --yes`.

