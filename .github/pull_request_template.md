## Purpose

<!-- Describe the problem, intended outcome, and user impact. -->

## Scope

<!-- List the affected product, data, API, deployment, or documentation boundaries. -->

## Risk and recovery

<!-- Describe failure modes, compatibility concerns, and the safe recovery path. -->

## Verification

- [ ] Focused tests for changed behavior passed
- [ ] `npm run verify` passed
- [ ] Desktop and mobile browser review completed when UI changed
- [ ] Staging authentication/cloud/AI paths tested when affected
- [ ] No secrets, private story data, or generated output are committed

## Data and deployment impact

- [ ] No database migration is required
- [ ] Migration was applied and verified in staging first
- [ ] Production migration or deployment still requires explicit owner approval
- [ ] Offline authoring remains usable when cloud or AI providers are unavailable

## Repository records

- [ ] Changelog updated for user-visible behavior
- [ ] Roadmap or milestone records updated when status changed
- [ ] ADR added or updated for consequential architecture/security decisions
- [ ] Documentation agrees with the implementation

## Evidence

<!-- Add screenshots, preview links, test output summaries, and exact commit SHA where useful. -->
