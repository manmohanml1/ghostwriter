# ADR 0006: Authenticated server-side AI proxy

- **Status**: Accepted
- **Date**: 2026-08-25
- **Deciders**: Repository owner

## Context

The original BYOK design stored Gemini and Groq credentials in browser `localStorage` and called providers directly. That exposed durable provider secrets to browser extensions, injected scripts, shared profiles, and copied local state. It also made request validation and provider limits impossible to enforce centrally.

## Decision

- Gemini and Groq credentials are server-only Vercel environment variables.
- Angular sends a Supabase access token to the same-origin `/api/ai` function.
- The function verifies that token with Supabase Auth before contacting a provider.
- Provider names, paths, methods, and request sizes are allowlisted and bounded.
- Browser settings describe server-managed providers and never accept or retain provider keys.
- The deterministic offline generator remains available without authentication or network access.

## Consequences

- Cloud AI requires a valid Ghostwriter account session.
- Provider credentials can be rotated without changing browser code.
- Provider quotas are shared by authenticated users and must remain bounded and observable.
- Vercel Function or authentication outages disable cloud inference but cannot disable local writing.
- A future user-supplied-key mode requires a separate decision and must not restore durable browser key storage.
