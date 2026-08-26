# Contributing to Ghostwriter

Read `docs/PROJECT_GUIDE.md` before changing product behavior, architecture, persistence, provider integration, deployment, or release records.

## Workflow

1. Create a short-lived topic branch from current `master`.
2. Use an approved prefix from the project guide and a Conventional Commit pull-request title.
3. Add or update tests for changed behavior and invariants.
4. Run focused tests during development and `npm run verify` before review.
5. Complete the pull-request template with risk, recovery, verification, data, and deployment impact.
6. Keep production migrations, deployments, merges, tags, and releases behind their explicit approval gates.

## Engineering rules

- Preserve offline authoring and account-scoped local data.
- Treat RLS and server-side authorization as mandatory even when the UI hides an action.
- Never put provider or service-role credentials in browser code, logs, fixtures, screenshots, issues, or commits.
- Never rewrite an applied migration; add a forward migration.
- Keep graph operations deterministic and cycle-safe.
- Make failures visible instead of reporting optimistic success.
- Update repository records whenever their facts change.

## Review evidence

A review-ready PR identifies the exact commit, focused tests, full gate, browser paths, staging evidence where needed, affected contracts, deployment impact, and intentionally deferred work.
