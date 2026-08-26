# Cost model and hosting boundaries

Ghostwriter's current production path is designed to remain within free provider tiers. Free-tier limits are capacity constraints, not availability guarantees.

| Capability | Provider | Cost boundary | Degraded behavior |
| --- | --- | --- | --- |
| Angular web and AI proxy | Vercel Hobby | No paid upgrade or metered add-on is authorized | Local story data remains usable; server AI becomes unavailable |
| Authentication and story sync | Supabase Free | Production and staging projects remain within free quotas | Account/cloud features show a failure while local authoring continues |
| Gemini inference | Google AI Studio free allowance | Server key, request bounds, and provider quota | Fail over to Groq, then the offline generator |
| Groq inference | Groq free allowance | Server key, request bounds, and provider quota | Fall back to the offline generator |
| Local workspace | Browser IndexedDB | Browser-managed storage quota | Show save errors; never report a failed save as successful |

No Render service, Neon database, paid queue, object store, or continuously running worker is part of the current architecture. A paid resource, billing tier, or materially different provider requires explicit owner approval and an ADR.
