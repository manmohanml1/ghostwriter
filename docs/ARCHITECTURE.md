# Architecture: Ghostwriter Studio

## Repository Boundaries

```text
apps/
  web/          Angular 19+ standalone application (signals, zoneless-ready, local IndexedDB)
  api/          Java 25 / Spring Boot 4 modular monolith (SSE streaming, Gemini client, persistence)
packages/
  contracts/    Shared TypeScript interfaces & JSON schemas
  tokens/       Shared design tokens & themes
docs/
  adr/          Architecture Decision Records
  milestones/   Milestone acceptance contracts
infrastructure/
  local/        Docker Compose definitions for local PostgreSQL & WireMock
```

## Data Flow & Invariants

```text
[ Author / User Interaction ]
        │
        ▼
[ Angular StoryStore (Signals) ] ───(Sync)───► [ IndexedDB Local Vault ]
        │ (SSE Request)
        ▼
[ Spring Boot API Gateway ]
        │
        ├─► [ Gemini Client ] (With Rate Limit & Circuit Breaker)
        │
        └─► [ Neon PostgreSQL ] (Transactional Story Tree Ledger)
```

### Evolution by Phase

- **Phase 1 (v0.1–v0.2)**: 100% client-side narrative DAG engine and visual canvas with zero backend dependencies.
- **Phase 2 (v0.3–v0.4)**: Spring Boot API gateway, SSE token streaming, and AI co-writer persona generator.
- **Phase 3 (v0.5–v1.0)**: Neon PostgreSQL persistence, public read-only showcase links, and interactive story reader export suite.
