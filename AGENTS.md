# Agent Entry

Read `.apc/manifest.md` first. `.apc/workflow.md` is the
development-protocol source of truth.

## Route

Choose one route:

1. **Develop the APC visualizer / knowledge tooling**
   - Condition: the task concerns `apc-visual/` or improving how the
     knowledge base is read/visualized.
   - The `apc/` submodule is read-only reference (APC framework itself).
   - Follow `.apc/workflow.md` §0 on first contact, otherwise §1.
2. **Work in this project**
   - Follow `.apc/workflow.md` §0 on first contact, otherwise §1.
3. **Ambiguous uninitialized project**
   - For ordinary product work with placeholders still present, stop
     and ask the user to initialize APC.

If a route's required file is unreadable, stop and report its path.

## Task end

Before the final summary, follow `.apc/workflow.md` §4. Persist only
material, verified knowledge or state. A no-op is valid.

## Core

- Diagnose before modifying.
- Inspect before asking; ask only about material ambiguity.
- Change one variable at a time in high-risk areas.
- Repeated failure at one point means stop and reassess.
- Stay consistent with the manifest.