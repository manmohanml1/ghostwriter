# Deployment Guide: Ghostwriter

This document records the exact hosting topology, environment boundaries, zero-cost budget, and release promotion contracts for **Ghostwriter**.

---

## 1. Hosting Architecture & Free-Tier Budget

Ghostwriter is engineered to operate permanently at **$0.00/month** total cost.

| Environment Role | Provider / Tier | Configuration & Limits |
|---|---|---|
| **Static Web App** | Vercel Hobby | Edge CDN distribution, automated HTTPS, SPA routing via `vercel.json` |
| **Database & Auth** | Supabase Free | 500 MB PostgreSQL storage, 50,000 MAU, Row-Level Security (RLS) |
| **AI Inference** | Client BYOK | Google AI Studio (1,500 req/day) + Groq (Llama 3.3 70B free tier) |
| **Offline Fallback** | Local Browser | In-memory Dynamic Beat Engine + `IndexedDB` storage |

---

## 2. Environments

- **Development (`local`)**:
  - Runs at `http://localhost:4200` via `npm start`.
  - Local `IndexedDB` storage with starter story fixtures.
  - Zero required cloud credentials.

- **Staging (`preview`)**:
  - Automatically deployed by Vercel for every open Pull Request on GitHub.
  - Immutable preview artifact tagged by commit SHA.
  - Serves as the acceptance testing ground before merge approval.

- **Production (`main`)**:
  - Deployed automatically from approved commits on `master`.
  - Published to Vercel production edge network.
  - Environment names are deployment metadata and never part of the product version.

---

## 3. Promotion & Release Contract

```text
Pull Request Opened on GitHub
  │
  ▼
Automated GitHub Actions CI Check (.github/workflows/ci.yml)
  │ (Lint, Angular Production Build, Bundle Verification)
  ▼
Vercel Staging Deployment (Immutable Preview URL)
  │ (Manual Smoke QA of Canvas, AI Failover & E-Reader)
  ▼
Pull Request Merged into `master`
  │
  ▼
Production Vercel Deployment
  │ (Production Smoke Check on Live URL)
  ▼
Explicit Annotated Git Tag & GitHub Release (vMAJOR.MINOR.PATCH)
```

> [!IMPORTANT]
> **Owner-Gated Release Gate**:
> A merged pull request or staging deployment does **not** automatically create an official release. An annotated Git tag (`vX.Y.Z`) and GitHub Release are published only after explicit verification of the live production artifact.

---

## 4. Vercel Configuration (`vercel.json`)

The web application contains a production `apps/web/vercel.json` defining:
- Single-page application URL rewrites to `/index.html`.
- Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`).
- Immutable cache-control for static hashed assets (`/assets/*`, `.js`, `.css`).
