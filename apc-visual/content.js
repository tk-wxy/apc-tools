/* APC 知识库文件 markdown 内容（只读快照） */

const CONTENT = {};

CONTENT['manifest'] = `# Project Manifest

> High trust after initialization and user confirmation.
> \`{{...}}\` means this consumer template is not initialized.

## Mission

- **Name**: {{PROJECT_NAME}}
- **Positioning**: {{PROJECT_DESCRIPTION}}
- **Goals**: {{CORE_GOALS}}
- **Non-goals**: {{NON_GOALS}}

## Locked stack

{{TECH_STACK}}

## Architecture invariants

Changing an invariant requires a recorded root cause in
\`decisions.md\` and user confirmation.

- {{ARCHITECTURE_INVARIANTS}}

## High-risk zones

- {{HIGH_RISK_AREAS}}

## Project structure

{{PROJECT_STRUCTURE}}

## Common commands

{{COMMON_COMMANDS}}

## Editing

After initialization, change this file only for fundamental project
changes. Record the decision first. Entry files remain generic routes.`;

CONTENT['workflow'] = `# Development Protocol

Use this file as guidance, not ceremony. Real code and verified
results override stale notes.

## Trust

| File | Trust and use |
|---|---|
| \`manifest.md\` | High after user confirmation; project anchor |
| \`rules.md\` | High only while evidence, scope, and status match |
| \`decisions.md\` | High within the recorded scope |
| \`memory.md §0\` | Low; use as a lead and verify |
| \`history.md\` | Forensics only |

## 0. Cold start

On first contact, model/tool switch, or return after a long gap:

1. Read \`manifest.md\`.
2. Read \`memory.md\`.
3. Scan the \`rules.md\` index and dead ends; read high-risk or relevant
   rules in full.
4. Scan the \`decisions.md\` table of contents; open relevant decisions
   only.
5. Read this workflow.

You should now know the project, hard constraints, current stage, and
next step.

## 1. Session start

1. Read \`memory.md §0\` and verify any detail you will rely on.
2. Use the rules index for relevant modules.
3. Open decisions only for needed root causes; search history only for
   forensics.

## 2. Execute a task

1. Derive intent, boundaries, and acceptance criteria from the request
   and repository. Ask only if material ambiguity remains.
2. Identify affected modules and manifest high-risk zones.
3. Check relevant dead ends and decisions before choosing an approach.
4. Diagnose before editing. In high-risk zones, change one variable at
   a time. Keep tunable values named.
5. Verify with tests, build, or execution. Label unavailable paths
   \`unverified\`.
6. If repeated attempts fail at the same point, stop, roll back when
   appropriate, and reassess.

## 3. Task variants

- **Feature**: preserve invariants; implement in small verifiable steps.
- **Bug**: reproduce and trace the causal chain to the actual mechanism
  (not just the nearest upstream event). Fix the mechanism, not the
  visible symptom.

  Reject fixes that suppress an effect without addressing its cause —
  e.g. hardcoding visual properties, swallowing errors, adding delays
  without understanding the timing issue, or gating around broken logic.
  If the fix doesn't explain *why* the bug occurred, it's not done.

  Verify: (1) the original mechanism no longer triggers, not just that
  it's no longer visible, and (2) the change hasn't relocated or
  disguised the failure elsewhere.
- **Review**: check relevant rules and high-risk changes; report before
  mutating unless the user requested fixes.
- **Refactor**: require adequate tests; separate behavior changes; verify
  after each step.

## 4. Task end

First classify the result:

- **No reusable knowledge or material state change**: no-op; do not
  modify \`.apc/\`.
- **Material change**: update only the applicable files below.

Updates:

1. \`rules.md\`: add only reproduced/evidenced pitfalls or dead ends.
   Include scope, evidence, verification date, status, index, and
   symptom lookup.
2. \`decisions.md\`: add only adopted or user-confirmed decisions.
   Include scope, evidence, rejected alternatives, date, and status.
3. \`memory.md §0\`: overwrite only when current state, next step, or
   known issues materially changed.
4. \`memory.md §0A\`: keep at most three sessions; move the oldest whole
   entry to \`history.md\`.

Each fact has one home: identity in manifest, scoped constraints in
rules, root causes in decisions, current state in memory, archives in
history. Use pointers elsewhere. Never invent an entry to satisfy this
protocol.

## 5. Working principles

- Evidence before authority.
- Source and verified results beat notes.
- A verified simple approach beats an unverified clever one.
- Keep knowledge concise; store conclusions and pointers, not logs or
  code dumps.
- Inspect before asking; ask when ambiguity materially changes the
  result.
- Stay aligned with the manifest.`;

CONTENT['rules'] = `# Scoped Rules and Dead Ends

> High trust only while evidence, scope, environment, and status match.
> Record reproduced or authoritative constraints, never hunches.

Keep invalidated entries with strikethrough and the reason/date.

## Index

Scan this table and dead ends at startup. Open full rules only when
relevant or high-risk.

| ID | Summary | Section | High-risk |
|---|---|---|---|
| R1 | [one-line summary] | Core | [yes/no] |

## Rules

### Core

- [ ] R1: [directive] - [reason] - see decisions.md §[id]
  - Scope: [module/platform/version]
  - Evidence: [test/log/source/reference]
  - Last verified: [YYYY-MM-DD]
  - Status: active

### {{HIGH_RISK_AREAS}}

- [Add a rule only after evidence exists.]

## Dead Ends

- [failed route] -> [failure reason]
  - Scope: [module/platform/version]
  - Evidence: [test/log/source/reference]
  - Last verified: [YYYY-MM-DD]
  - Status: active

## Symptom Lookup

- [symptom] -> check R[id]`;

CONTENT['decisions'] = `# Decisions

> High trust within recorded scope when evidence is traceable.
> Append adopted or user-confirmed decisions, not brainstorms.
> Keep superseded decisions and point to their replacement.

## Index

- §1 [title] - [conclusion]

## Details

### §1 [title]

- **Final approach**: [adopted approach]
- **Scope**: [modules/platforms/versions]
- **Evidence and root cause**: [test/log/source/reference]
- **Rejected alternatives**: [option and reason]
- **Decided / last verified**: [YYYY-MM-DD] / [YYYY-MM-DD]
- **Status**: active`;

CONTENT['memory'] = `# Current State

> Low trust: use this as a lead and verify against source or execution.

Rules:

- \`§0\` always contains exactly the four bullets below; overwrite it.
- Never put a session changelog in \`§0\`.
- Keep at most three \`§0A\` sessions; move older entries whole to
  \`history.md\`.
- Identity belongs in \`manifest.md\`, constraints in \`rules.md\`, and
  root causes in \`decisions.md\`.

## §0 Snapshot

- **Status**: [current development stage]
- **Latest progress**: [most recent material result]
- **Next step**: [top upcoming task]
- **Known issues**: [unresolved issues or "none"]

## §0A Recent sessions

### Session [YYYY-MM-DD HH:MM] - [topic]

- [material step or conclusion]
- [verification or next-step pointer]

## Pointers

- Identity, stack, structure, commands: \`manifest.md\`
- Scoped rules and dead ends: \`rules.md\`
- Decision root causes: \`decisions.md\`
- Older sessions: \`history.md\``;

CONTENT['history'] = `# History Archive (history.md)

> **Note**: this file archives aged-out entries from \`memory.md\` §0A (beyond the rolling window).
> **Not read by default** — grep it only when you need forensics. Ordered newest-first.

## [YYYY-MM]

### Session [YYYY-MM-DD HH:MM] - [short topic]

- [archived point 1]
- [archived point 2]`;

CONTENT['garden'] = `# Knowledge-Base Gardening

User-triggered maintenance only. Do not read during normal startup.

## Prompt

Review \`.apc/\` as a librarian. Do not change product code; read it only
to verify documentation.

1. **Current state**
   - Compare every \`memory.md §0\` claim with source, commands, and git
     history.
   - Report and correct stale signposts.
2. **Rules and dead ends**
   - Check scope, evidence, last-verified date, status, index, symptom
     lookup, and duplicates.
   - Mark invalid entries with strikethrough and reason/date; do not
     erase their history.
   - Mark unsupported claims \`disputed\`.
3. **Decisions**
   - Check index, scope, evidence, dates, status, and later reversals.
   - Keep superseded entries and link replacements.
4. **Session aging**
   - Keep at most three sessions in \`memory.md §0A\`; move older entries
     whole to \`history.md\`.
5. **Bloat and duplication**
   - Remove routine logs and duplicated facts.
   - Enforce one home per fact: manifest, rules, decisions, memory, or
     history.
6. **Manifest**
   - Report fundamental drift but do not edit without user confirmation.

Report findings by section. Separate safe fixes from changes requiring
user judgment. State uncertainty; do not invent evidence.`;

CONTENT['init'] = `# Initialization Protocol

Run once when the manifest still contains \`{{...}}\` and the user asks
to initialize a consumer project. This file overrides normal startup.

Use the user's language for the dialogue and generated knowledge base,
including headings and boilerplate.

## 1. Understand

Extract project name, positioning, and goals from the request and
repository. Inspect before asking. Resolve these material gaps:

- stack and platform;
- highest-risk area, or "none known yet";
- non-goals, if any.

For an existing project, inspect structure, core modules, build/test
commands, and evidence such as unusual config, \`HACK\`, or \`FIXME\`.
For greenfield work, mark structure and commands as planned.

## 2. Initialize

1. Fill every placeholder in \`manifest.md\`: mission, stack,
   invariants, high-risk zones, structure, and commands.
2. Leave generic entry files unchanged unless the project explicitly
   customizes one.
3. Fill \`memory.md §0\` with exactly four bullets and add this session
   to \`§0A\`.
4. Keep rules and decisions empty unless real evidence already exists.
   Never fabricate an initial rule or decision.

## 3. Confirm

Recite mission, stack, invariants, and high-risk zones. Obtain explicit
user confirmation and correct discrepancies before development.

## 4. Consume scaffolding

After confirmation, you may remove:

- \`.apc/init.md\`;
- placeholder examples and fill-in hints;
- bundled framework README files, \`examples/\`, and \`tools/\`.

Keep workflow, trust rules, memory's four-bullet/rolling-window
discipline, and all initialized project knowledge.`;