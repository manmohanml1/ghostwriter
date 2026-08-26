# Ghostwriter deployment and promotion

## Environments

| Environment | Runtime | Data boundary | Purpose |
| --- | --- | --- | --- |
| Development | Local Angular server | Account-scoped IndexedDB; optional configured backend | Focused development and browser testing |
| Test | GitHub Actions | PostgreSQL 17 compatibility database and test fixtures | App, browser, migration, RLS, conflict, and dependency gates |
| Staging | Vercel Preview and staging Supabase | Isolated staging users and stories | Authenticated acceptance and migration verification |
| Production | Vercel and production Supabase | Production users protected by RLS | Public application |

Production application: <https://web-green-beta-4giz07ncu3.vercel.app>

## Current hosting boundary

- Vercel serves the Angular application and the authenticated `/api/ai` Function.
- Supabase provides authentication, PostgreSQL persistence, RPCs, and RLS.
- Gemini and Groq keys exist only as server-side Vercel environment variables.
- Local IndexedDB and the deterministic offline generator remain available during provider outages.
- No Render, Neon, paid queue, worker, or browser-held AI credential belongs to the current system.

## Required pull-request gate

`.github/workflows/quality.yml` provides one stable required status, `build-and-test`. It aggregates:

- Conventional Commit PR-title and topic-branch validation;
- locked Node 24 installation and contract build;
- regression, API, and Playwright browser tests;
- production Angular build and immutable SHA-named artifact;
- ordered migration application to PostgreSQL 17;
- authenticated sync, stale-revision, payload-limit, and RLS tests;
- high/critical production dependency audit.

The aggregate status name is intentionally stable because GitHub branch protection depends on it.

## Promotion contract

```text
topic branch
  -> pull request
  -> required quality gate and Vercel Preview
  -> staging acceptance against the exact commit SHA
  -> explicit owner merge approval
  -> merge to protected master
  -> explicit production migration approval, when needed
  -> apply forward-only migrations in order
  -> production schema/RLS/conflict verification
  -> production deployment of the merged commit
  -> browser smoke verification
  -> separately authorized annotated tag and GitHub Release, when desired
```

Merging, deploying, completing a milestone, or changing application code does not automatically authorize a tag or GitHub Release.

## Database migration rules

- Migrations are forward-only and ordered by their 14-digit timestamp.
- Every migration must pass the local contract validator and PostgreSQL CI job.
- Apply and verify every migration in staging before production.
- Production migrations are manual approval-gated actions; they do not run automatically on merge.
- Prefer expand-and-contract compatibility so old and new application revisions can overlap safely.
- Recovery uses a new forward migration. Never rewrite an already-applied production migration.

The pending production sequence is:

1. `20260825000000_atomic_story_sync.sql`
2. `20260825010000_story_revision_conflicts.sql`
3. `20260825020000_story_payload_limits.sql`

After applying them, verify RPC privileges, owner isolation, public/anonymous access rules, stale-write rejection, content limits, node/lore triggers, and cleanup of test data.

## Releases

Release tags are annotated `vMAJOR.MINOR.PATCH` tags created only after explicit owner instruction. The release workflow rejects lightweight tags, tags outside `master`, version mismatches, failed tests, failed migration validation, and high/critical production advisories.

The existing remote `v0.5.3` tag is lightweight and caused its release workflow to fail. Repairing a published tag is a separate approval-gated operation; future tags are protected by the release preflight.

## GitHub repository settings

The desired settings are:

- protected `master`, with direct pushes, force pushes, and deletion blocked;
- administrator enforcement enabled;
- required status `build-and-test`, strict/up-to-date before merge;
- required conversation resolution;
- squash merge as the sole merge strategy and automatic topic-branch deletion;
- secret scanning and push protection enabled;
- dependency graph, Dependabot alerts, and Dependabot security updates enabled.
- CodeQL JavaScript/TypeScript analysis active on pull requests, protected-branch pushes, and its weekly schedule.

Repository settings are live external state and must be verified after any change.
