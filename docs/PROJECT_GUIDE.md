# Ghostwriter project guide

This repository is the source of truth for Ghostwriter product, architecture, security, deployment, and release decisions.

## Source precedence

1. Accepted ADRs
2. Security, architecture, deployment, and versioning records
3. Active roadmap and milestone acceptance contracts
4. Current implementation and automated tests
5. Pull requests, issues, and chat history

Correct an implementation that contradicts a higher-priority record, or deliberately change the decision through an ADR. Do not silently drift.

## Product invariants

- Local-first authoring, graph editing, reading, and deterministic offline generation remain usable without cloud services.
- IndexedDB workspaces are isolated between signed-out use and individual accounts.
- A cloud save is transactional and rejects stale device revisions.
- Supabase RLS enforces ownership independently of the browser.
- Gemini and Groq credentials remain server-side; the browser uses an authenticated bounded proxy.
- The narrative graph permits merge edges but rejects every cycle.
- AI output never silently overwrites the author's recoverable text.
- Save, sync, authentication, provider, and storage failures are visible to the user.
- The supported production path introduces no paid resource without explicit owner approval.

## Branch and pull-request workflow

1. Start from current `master` on a short-lived topic branch.
2. Approved prefixes are `feat/`, `fix/`, `docs/`, `refactor/`, `perf/`, `test/`, `build/`, `ci/`, `chore/`, `release/`, `codex/`, and `dependabot/`.
3. Use a lowercase descriptive suffix and a Conventional Commit PR title.
4. Keep commits scoped and never include credentials, private story data, generated builds, or local environment files.
5. Run focused tests while editing, then `npm run verify` before review.
6. Update the changelog, roadmap, milestone, deployment record, or ADR when its facts change.
7. Push and open a PR only when authorized. Never commit or push directly to `master`.

Local hooks are optional developer convenience and are not a security boundary. GitHub rulesets, branch protection, and required CI are the enforceable controls.

## Change-to-gate mapping

| Change | Required verification |
| --- | --- |
| Story graph or persistence | Focused store tests, Playwright workflows, production build |
| Authentication or cloud sync | Local tests, staging authenticated journey, RLS/conflict verification |
| AI proxy or provider client | API contract tests, authenticated staging provider call, offline fallback |
| Database migration | Static migration validation, PostgreSQL CI, staging application, production approval |
| UI/accessibility | Component behavior, keyboard path, desktop/mobile browser evidence |
| Dependencies or workflow | Locked install, production audit, affected full gate |
| Documentation only | Path/link review and applicable CI |

## Deployment and release authorization

- Pull-request previews are non-production acceptance evidence.
- Production migrations, production deployment, merge, tag creation, and GitHub Release creation are distinct actions.
- Each external action follows its explicit owner approval boundary.
- Application changes do not inherently require an immediate version tag.
- Releases use annotated semantic-version tags and the release workflow in `.github/workflows/release.yml`.

## Decision discipline

Write an ADR before changing authentication, credential placement, persistence provider, graph semantics, deployment provider, paid infrastructure, or another difficult-to-reverse boundary.
