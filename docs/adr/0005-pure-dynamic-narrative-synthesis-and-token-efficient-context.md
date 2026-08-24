# ADR 0005: Pure Dynamic Narrative Synthesis and Token-Efficient Hierarchical Context Window

## Status
Accepted

## Context
Previous versions of the Ghostwriter offline/fallback branch engine relied on predefined matrices of static tropes and candidate arrays. When exploring custom genres (such as Noir Mystery, Culinary Fiction, High Fantasy) or branching repeatedly on deep nodes, static pools caused thematic bleed, repetitive noun phrases (e.g. "the surrounding area"), and title collisions with ancestor chapters. Additionally, cloud generation needed a token-efficient strategy that supplies rich multi-chapter narrative continuity without exhausting context token quotas.

## Decision
1. **Zero Hardcoded Candidate Arrays**: Completely remove all static story matrices and fixed phrase arrays from `AIGeneratorService`.
2. **Dynamic Semantic Tokenizer**: Extract key topical nouns, character names, and concrete locations directly from `chapter.content`, `chapter.title`, and `loreBible`.
3. **Thematic Scene Weaver**: Dynamically classify the chapter's dramatic intent (*Discovery/Anomaly*, *Stealth/Infiltration*, *Action/Confrontation*, *Forensics/Investigation*) to synthesize tailored, non-overlapping scene prose and continuations.
4. **Hierarchical 5-Layer Context Builder**:
   - Layer 1: Story & Protagonist Anchor (~80 tokens)
   - Layer 2: Grounded Lore Bible Entities (~120 tokens)
   - Layer 3: Macro Story Summary (~150 tokens)
   - Layer 4: Micro Local Context (~300 tokens)
   - Layer 5: Sibling Novelty Constraint (~50 tokens)
   Total input prompt: ~700 tokens.
5. **Concrete Location Seeding**: Story Inception automatically seeds both the primary protagonist and a concrete named location into `initialLore`.

## Consequences
- 100% genre-adaptive synthesis for any custom user premise with zero hardcoded trope bleed.
- Rapid, token-efficient cloud generation well under free tier token budgets.
- Automated regression test suite expanded to 23 suites / 65 assertions verifying zero cross-chapter prose duplication.
