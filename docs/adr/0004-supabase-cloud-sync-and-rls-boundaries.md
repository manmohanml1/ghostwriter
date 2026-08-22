# ADR 0004: Supabase Cloud Sync and Row-Level Security (RLS) Boundaries

- **Status**: Accepted
- **Date**: 2026-08-22
- **Deciders**: Lead Architect, Core Team

## Context

Authors require multi-device access to their stories (e.g. drafting on a desktop, reading on a mobile browser or tablet). At the same time, privacy is paramount: unpublished creative writing, alternate endings, and character notes must never be accessible by other users.

Furthermore, in accordance with the core principle *"Missing data is not failed engineering"*, the application must operate flawlessly in offline guest mode when unauthenticated.

## Decision

We adopt a **Dual-Mode Cloud Sync Engine** with PostgreSQL Row-Level Security:

1. **Explicit Operational Modes**:
   - **`LOCAL_SANDBOX` (Default Mode)**: Active when no user is signed in. All stories, nodes, and lore entities are persisted locally in `IndexedDB`. No external network calls or auth redirects are made.
   - **`CONNECTED_CLOUD` (Authenticated Mode)**: Activated when a valid user session is established. Story mutations trigger non-blocking cloud synchronization.

2. **Database & Row-Level Security (RLS)**:
   - Schema defined in `infrastructure/supabase/schema.sql`.
   - `public.stories` and `public.tree_nodes` enforce `auth.uid() = user_id` for all INSERT, UPDATE, and DELETE operations.
   - Public stories (`is_public = TRUE`) are readable anonymously for readers viewing shared showcase links (`/story/:slug`).

3. **Honest Authentication & Error Handling**:
   - The app never executes external browser redirects to invalid or placeholder endpoints.
   - When running against local development environments without a cloud project, an instant demo session is established locally.
   - Users can connect any standard Supabase instance via `⚙️ Custom Backend`.

## Consequences

### Positive
- Strict, mathematically enforced privacy for all author manuscripts and branches.
- Seamless offline writing experience with zero forced logins.
- 1-click sharing for readers when an author explicitly publishes a story showcase.

### Negative / Trade-offs
- Cloud sync requires network connectivity; offline edits made on multiple devices simultaneously must be resolved via timestamp-based last-write-wins or branch merging.
