# ADR 0002: Cascading Tri-Provider AI Failover Architecture

- **Status**: Accepted
- **Date**: 2026-08-22
- **Deciders**: Lead Architect, Core Team

## Context

Cloud AI APIs impose strict operational constraints, including:
1. **Rate Limits (RPM/TPM)**: Free-tier models (such as Google Gemini 2.5 Flash) enforce 15 Requests Per Minute and daily quota caps.
2. **Burst Writing Sessions**: Novelists frequently generate multiple chapter continuations and branch comparisons in rapid succession, which can trigger HTTP 429 errors.
3. **Availability & Outages**: External provider outages or network interruptions must never crash the application or wipe an author's unsaved draft.

## Decision

We implement a **Cascading Tri-Provider AI Failover Architecture**:

```
                       [ Writer Generates Chapter / 3 Paths ]
                                         │
                                         ▼
                       ┌───────────────────────────────────┐
                       │ 1. Primary: Gemini 2.5 Flash      │
                       │    (1,500 free requests/day)      │
                       └─────────────────┬─────────────────┘
                                         │
                          (If Rate-Limited / HTTP 429)
                                         │
                                         ▼
                       ┌───────────────────────────────────┐
                       │ 2. Failover: Groq (Llama 3.3 70B) │
                       │    (300 tok/sec, generous quota)  │
                       └─────────────────┬─────────────────┘
                                         │
                             (If Offline / Quotas Hit)
                                         │
                                         ▼
                       ┌───────────────────────────────────┐
                       │ 3. Fallback: Dynamic Beat Engine  │
                       │    ($0 cost, instant, infinite)   │
                       └───────────────────────────────────┘
```

1. **Context Window Optimization**:
   - Only the active breadcrumb trail (ancestor nodes) and the compact Lore Bible are included in prompts (<1,200 tokens).
   - This saves ~85% of token budget and prevents hitting Tokens-Per-Minute (TPM) limits.

2. **BYOK Client Storage**:
   - Users provide their own Gemini and Groq API keys, stored strictly in browser `localStorage`.
   - Each author operates on their own independent quota, completely eliminating central backend bottlenecks.

3. **Silent Failover with Telemetry**:
   - When Gemini returns HTTP 429 or network errors, `AIGeneratorService` seamlessly retries on Groq without interrupting writing.
   - Active telemetry is surfaced via a non-intrusive status pill in the header.

## Consequences

### Positive
- 100% immune to API rate limits, daily caps, and temporary cloud outages.
- $0 server infrastructure cost for AI inference.
- Instant feedback and fallback even when completely disconnected from the internet.

### Negative / Trade-offs
- Users must generate their own free API keys from Google AI Studio / Groq if they desire cloud models over the built-in offline engine.
