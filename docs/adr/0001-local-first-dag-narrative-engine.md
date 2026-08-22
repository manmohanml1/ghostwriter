# ADR 0001: Local-First Directed Acyclic Graph (DAG) Narrative Engine

- **Status**: Accepted
- **Date**: 2026-08-22
- **Deciders**: Lead Architect, Core Team

## Context

Fiction writers, webnovel creators, and interactive story designers frequently explore multiple narrative possibilities, alternate character choices, and divergent plot twists. Traditional linear text editors (e.g., Google Docs, Scrivener) force authors into flat text files, making branch tracking chaotic and prone to continuity errors.

We need a core data structure and visualization engine that:
1. Represents narrative branching with mathematical precision.
2. Prevents infinite loops or circular plot dependencies.
3. Operates with 100% fidelity offline in the browser without mandatory network roundtrips.
4. Scales smoothly to hundreds of chapters on an infinite visual canvas.

## Decision

We adopt a **Local-First Directed Acyclic Graph (DAG)** architecture:

1. **Data Model**:
   - Every chapter/scene is a `TreeNode` uniquely identified by UUID.
   - Node relationships are directed `TreeEdge` records (`BRANCH`, `MERGE`, `REBASE`).
   - Cycles are strictly prohibited by runtime validation upon edge creation.
   - Node status lifecycle: `ACTIVE`, `EXPLORING`, `PRUNED`, and `CANON_PATH`.

2. **Reactive State & Persistence**:
   - State is managed via **Angular 19 Signals** (`TreeStore`) with granular computed projections.
   - Every mutation is committed synchronously to browser `IndexedDB` / `localStorage` before any cloud sync is attempted.

3. **Visual SVG Rendering**:
   - Hierarchical tree layout computed with depth-based column positioning.
   - Smooth pan & zoom with cubic bezier spline connectors (`M x1 y1 C x1+offset y1, x2-offset y2, x2 y2`).
   - Hardware-accelerated SVG transformations isolated from heavy DOM re-renders.

## Consequences

### Positive
- Zero network lag when branching, typing, or reorganizing story chapters.
- Authors can write completely offline on laptops, airplanes, or low-connectivity environments.
- Clean separation between mathematical graph state and presentation layers.

### Negative / Trade-offs
- Large graphs (>1,000 nodes) require SVG viewport virtualization to maintain 60 FPS on low-end mobile devices.
- Multi-user real-time collaborative editing requires operational transformation (CRDT) in post-1.0.
