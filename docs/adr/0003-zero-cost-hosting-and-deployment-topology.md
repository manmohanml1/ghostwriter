# ADR 0003: Zero-Cost Hosting and Deployment Topology

- **Status**: Superseded in part by ADR 0006 for AI credential placement. Historical BYOK references describe the earlier implementation.
- **Date**: 2026-08-22
- **Deciders**: Lead Architect, Core Team

## Context

To ensure the Ghostwriter open-source project remains sustainable indefinitely with zero recurring operational expenses, all infrastructure components must run permanently within **$0/month free-tier limits**.

The deployment architecture must support:
1. Fast, global CDN delivery with automatic edge HTTPS and SPA routing.
2. Isolated Staging preview builds on every pull request.
3. Durable transactional cloud database persistence for authenticated authors.

## Decision

We establish a **Strict Zero-Cost Deployment Topology** matching the standards of `commitquest`:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HOSTING & CLOUD TOPOLOGY                           │
├─────────────────────┬──────────────────────────┬────────────────────────────┤
│ Component           │ Provider / Tier          │ Resource Boundary & Limits │
├─────────────────────┼──────────────────────────┼────────────────────────────┤
│ **Static Web App**  │ Vercel Hobby             │ 100 GB bandwidth / mo      │
│                     │ (Edge CDN + SPA Routing) │ Unlimited Preview Deploys  │
├─────────────────────┼──────────────────────────┼────────────────────────────┤
│ **Database & Auth** │ Supabase / Neon Free     │ 500 MB PostgreSQL storage  │
│                     │ (PostgreSQL + RLS)       │ 50,000 MAU free Auth       │
├─────────────────────┼──────────────────────────┼────────────────────────────┤
│ **AI Inference**    │ BYOK (Google / Groq)     │ Free tiers (1.5k req/day)  │
│                     │ + In-Browser Fallback    │ Client-side execution ($0) │
└─────────────────────┴──────────────────────────┴────────────────────────────┘
```

1. **Vercel SPA Configuration**:
   - `apps/web/vercel.json` provides strict single-page application rewrites (`"destination": "/index.html"`), security headers (Content-Security-Policy, X-Frame-Options: SAMEORIGIN), and immutable asset caching.
2. **Environment Separation**:
   - `Development`: Local loopback server (`http://localhost:4200`) with IndexedDB storage.
   - `Staging`: Immutable Vercel preview artifact generated automatically on pull requests.
   - `Production`: Promoted production artifact attached to official custom/subdomain.

## Consequences

### Positive
- Exactly **$0.00/month** total hosting and maintenance cost.
- Continuous deployment with immutable preview verification before every release.
- Complete data privacy: no centralized server storing user writing or credentials.

### Negative / Trade-offs
- Free database tiers can pause after extended inactivity (handled gracefully by local IndexedDB fallback).
