# Deployment Guide: Ghostwriter

This document records the exact 4-environment matrix, hosting topology, verified live deployments, zero-cost budget, and release promotion contracts for **Ghostwriter**.

---

## 1. Verified Live Deployments

- **Production Web Application**: [https://web-green-beta-4giz07ncu3.vercel.app](https://web-green-beta-4giz07ncu3.vercel.app)
- **Immutable Deployment URL**: `https://web-3nz846d9f-manmohanlonawat-8572s-projects.vercel.app`
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

## 4. Promotion & Release Contract

```text
Pull Request Opened on GitHub
  │
  ▼
Automated GitHub Actions Quality & CI Check (.github/workflows/quality.yml)
  │ • Conventional Commit title verification
  │ • TypeScript contracts build & Angular production build
  │ • Upload immutable artifact: `ghostwriter-web-${{ github.sha }}`
  ▼
Vercel Staging Deployment (Immutable Preview URL)
  │ • Manual smoke QA of Canvas, AI Failover & E-Reader
  ▼
Pull Request Merged into `master` (Explicit Owner Approval Required)
  │
  ▼
Production Vercel Deployment (Promote Artifact to Live Edge)
  │
  ▼
Explicit Annotated Git Tag & GitHub Release (vMAJOR.MINOR.PATCH)
```

> [!IMPORTANT]
> **Owner-Gated Release Gate**:
> A merged pull request or staging deployment does **not** automatically create an official release. An annotated Git tag (`vX.Y.Z`) and GitHub Release are published only after explicit verification of the live production artifact and owner authorization.
