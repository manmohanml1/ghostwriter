# Security policy

## Supported version

Before 1.0, security fixes target the latest deployed minor line and the active hardening branch.

## Reporting

Do not open a public issue containing an API key, access token, private story, user identifier, database credential, exploitable authorization detail, or other sensitive evidence. Contact the repository owner privately through GitHub instead.

## Security boundaries

- Supabase RLS and authenticated RPCs enforce story ownership.
- The Vercel AI proxy verifies Supabase sessions and allowlists provider operations.
- Gemini, Groq, service-role, and database credentials are server-only.
- Local workspaces are isolated by account identity and signed-out mode.
- Story sync uses optimistic revisions to reject stale writes.
- Payload, node, lore, and chapter limits protect storage and execution paths.
- Production migrations, deployment, and release actions require explicit approval.

## Secret response

If a credential is exposed, revoke or rotate it first, remove it from active configuration, assess logs and history, and add a prevention test or control. Deleting it from the latest commit alone is not remediation.
