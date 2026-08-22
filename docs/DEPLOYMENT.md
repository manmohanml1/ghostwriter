# Deployment Guide: Ghostwriter

This document records the exact hosting topology, environment boundaries, verified live deployments, zero-cost budget, and release promotion contracts for **Ghostwriter**.

---

## 1. Verified Live Deployments

- **Production Web Application**: [https://web-green-beta-4giz07ncu3.vercel.app](https://web-green-beta-4giz07ncu3.vercel.app)
- **Immutable Deployment URL**: `https://web-3nz846d9f-manmohanlonawat-8572s-projects.vercel.app`
- **Vercel Project Dashboard**: `https://vercel.com/manmohanlonawat-8572s-projects/web`
- **Hosting Region**: Washington, D.C., USA (`iad1`)
- **Deployment Status**: `READY / 200 OK` (Edge CDN active)

---

## 2. Hosting Architecture & Free-Tier Budget

Ghostwriter is engineered to operate permanently at **$0.00/month** total cost.

| Environment Role | Provider / Tier | Configuration & Limits |
|---|---|---|
| **Static Web App** | Vercel Hobby | Edge CDN distribution, automated HTTPS, SPA routing via `vercel.json` |
| **Database & Auth** | Supabase Free | 500 MB PostgreSQL storage, 50,000 MAU, Row-Level Security (RLS) |
| **AI Inference** | Client BYOK | Google AI Studio (1,500 req/day) + Groq (Llama 3.3 70B free tier) |
| **Offline Fallback** | Local Browser | In-memory Dynamic Beat Engine + `IndexedDB` storage |

---

## 3. Environments

- **Development (`local`)**:
  - Runs at `http://localhost:4200` via `npm start`.
  - Local `IndexedDB` storage with starter story fixtures.
  - Zero required cloud credentials.

- **Staging (`preview`)**:
  - Automatically deployed by Vercel for every open Pull Request on GitHub.
  - Immutable preview artifact tagged by commit SHA.
  - Serves as the acceptance testing ground before merge approval.

- **Production (`main`)**:
  - Live at **`https://web-green-beta-4giz07ncu3.vercel.app`**.
  - Published to Vercel production edge network.

---

## 4. Promotion & Release Contract

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
Pull Request Merged into `master` (Owner Approval Required)
  │
  ▼
Production Vercel Deployment (Promote Artifact)
  │ (Production Smoke Check on Live URL)
  ▼
Explicit Annotated Git Tag & GitHub Release (vMAJOR.MINOR.PATCH)
```

> [!IMPORTANT]
> **Owner-Gated Release Gate**:
> A merged pull request or staging deployment does **not** automatically create an official release. An annotated Git tag (`vX.Y.Z`) and GitHub Release are published only after explicit verification of the live production artifact.
