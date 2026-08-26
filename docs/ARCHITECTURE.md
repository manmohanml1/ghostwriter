# Ghostwriter architecture

## Repository boundaries

```text
apps/web/              Angular 20 studio, reader, local persistence, and cloud client
api/ai.ts              Authenticated Vercel Function for Gemini/Groq requests
packages/contracts/    Shared TypeScript story and graph contracts
supabase/migrations/   Forward-only transactional sync and limit migrations
supabase/tests/        Staging and PostgreSQL CI verification
infrastructure/        Baseline Supabase schema and local development configuration
docs/                  Product, deployment, milestone, and decision records
```

There is no Java, Spring Boot, Render, Neon, SSE, worker, or separate API service in the current implementation.

## Runtime flow

```text
Author interaction
  -> Angular TreeStore
      -> account-scoped IndexedDB workspace (always available)
      -> Supabase Auth session (optional)
          -> transactional sync_story_tree_v2 RPC
              -> PostgreSQL tables protected by RLS and optimistic revision checks
      -> authenticated /api/ai request (optional)
          -> Vercel Function verifies the Supabase session
              -> server-held Gemini or Groq credential
      -> deterministic offline narrative fallback
```

## Invariants

- The canvas, reader, graph validation, local persistence, and offline generator work without cloud connectivity.
- A signed-out workspace cannot inherit the previous account's local draft.
- Cloud saves replace a complete story atomically and reject stale revisions.
- Story tables remain owner-scoped by PostgreSQL RLS.
- Gemini and Groq credentials never enter Angular code, browser storage, or public environment variables.
- Graph edges may express multiple parents, but a cycle is never accepted.
- One primary parent provides a deterministic default breadcrumb and manuscript route.
- Database changes are forward-only, verified in staging first, and require explicit production approval.

## Compatibility versions

The product version does not replace the independent story schema, database migration, graph state, and AI prompt compatibility versions. A change to any of those contracts must be documented and tested at its boundary.
