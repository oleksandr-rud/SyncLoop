---
name: "SyncLoop: Feedback Loop"
description: "Failure diagnosis, patch protocol, branch pruning"
applyTo: "**/*"
---

# Feedback Loop (Failure Diagnosis & Patch Protocol)

Behavioral patches and learning from failures. Invoked by [reasoning-kernel.md](reasoning-kernel.instructions.md) when validation fails.
Referenced from [patterns.md](patterns.instructions.md). Writes learned fixes to patterns.md tables (quick) and [patterns/](patterns/) specs (deep).

**Use when:**
- A validation gate fails (types, tests, layers) → diagnose + patch + retry
- `validate-env.md` or `validate-n.md` returns FAIL
- User provides explicit score or correction on agent output
- Same error recurs 2+ times (escalation trigger)
- A task completes successfully (learning phase → persist pattern)
- Refactoring changes imports/docs and tests must re-verify

---

## Failure Types

| Type | Detection Signal | Required Response |
|------|------------------|-------------------|
| **Gate Failure** | Stage 1 or 2 returns FAIL | Patch root cause, rerun same gate |
| **Shape Mismatch** | Signature/data contract breaks | Align producer/consumer contracts |
| **Boundary Drift** | Unintended API/export changes | Restore or document intentional change |
| **User Misalignment** | User indicates wrong behavior/scope | Re-scope and patch to requested intent |
| **Low Coverage** | Coverage report below threshold | Add tests, retry |
| **Bad Naming** | Files with `v1`, `new`, `old` suffixes | Rename to canonical form |
| **Doc Change** | Documentation/import updates | Run tests to verify examples |
| **Infinite Loop** | Same error 3+ times | Branch prune first, then escalate |

---

## Micro-Loop Protocol

Surface-level fixes that are resolved **within CHALLENGE-TEST** without consuming the macro retry budget.
Does NOT route through the patch contract below — self-contained.

**Micro Signals:**

| Signal | Fix | Budget Impact |
|--------|-----|---------------|
| Missing return type on new code | Add annotation based on body analysis | None |
| `print()` / `breakpoint()` left in | Remove or convert to logging | None |
| Unused import after refactor | Remove import line | None |
| Formatting / whitespace issue | Auto-format | None |

**Rules:**
- Max **2 micro-fixes per gate** before escalating to macro
- Same micro-fix needed **3×** → reclassify as macro (systemic issue)
- Micro-fixes do NOT generate a patch contract — they are applied directly

**Calibration** (from Verification Protocol):
- Fix is **"Supported"** (evidence directly in error message) → Micro
- Fix is **"Assumed"** (needs root cause diagnosis) → Macro

---

## Feedback Input Formats

### From User

```
FEEDBACK ON LAST STEP

Score (0-5): [rating]
Misalignment: [what went wrong]
Good: [what worked]
New constraint: [rule to enforce]
```

### From Gate Failure

```
GATE FAILURE

Gate: [type_check | tests | layer_rules | complexity | debug]
Error: [specific error message]
File: [affected file]
Line: [line number]
```

### From Refactoring/Documentation Changes

```
REFACTORING APPLIED

Changes:
  ├─► Files moved: [list]
  ├─► Imports updated: [count]
  ├─► Documentation updated: [files]
  └─► Status: [incomplete]

Required Next Steps:
  1. Run type checker
  2. Run test suite
  3. Verify documentation examples
  4. Check for orphaned imports

Reason: Files/imports changed → MUST verify no breakage.
```

---

## Patch Contract

When feedback is received, output explicit behavioral changes:

```
FEEDBACK PATCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Failure: [what failed]
Root cause: [why it failed — not the symptom]
Affected scope: [files/modules impacted]
Minimal correction: [smallest fix that resolves root cause]
Safety checks: [what to verify after patch]
Retry target gate: [which gate to re-run]
Behavioral change: [one sentence: what changes next turn]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Patch must satisfy:
- minimal surface area
- preserved public contracts (unless approved)
- explicit retry target

---

## Learning Mechanism

After each successful cycle, persist the lesson into the **Learned Patterns** section of [patterns.md](patterns.instructions.md).
Three target tables exist — route each lesson to the correct one:

### 1. Log Common Errors → patterns.md §Common Errors

Add to the **Common Errors** table in `patterns.md`:

```markdown
| Symptom | Why It Happens | Prevention Heuristic |
|---------|----------------|----------------------|
| Missing return type | Signature drift | Add return types immediately on creation |
| Fixture not found | conftest.py not in path | Check test fixture scope |
```

### 2. Log Auto-Fixes → patterns.md §Auto-Fixes

Add to the **Auto-Fixes** table in `patterns.md`:

```markdown
| Trigger | Root Cause | Minimal Safe Fix | Auto-Apply |
|---------|------------|------------------|------------|
| Missing return type | `def get_name():` → no annotation | Add `-> str:` based on body | ✅ |
| Unused import | Import left after refactor | Remove unused import line | ✅ |
```

### 3. Extract Heuristics → patterns.md §Heuristics

Add to the **Heuristics** table in `patterns.md`:

```markdown
| Do More | Do Less |
|---------|---------|
| Check return types before type check | Assume function has correct type |
| Verify neighbor compatibility first | Change interfaces without checking |
```

### Pattern Update Protocol (Quick Fixes → patterns.md tables)

```
On successful fix:
  1. Identify pattern category (error, auto-fix, heuristic)
  2. Check if pattern already exists in patterns.md
  3. If new → append to appropriate table
  4. If existing → update confidence/weight
```

---

## Persisting to Spec Files (patterns/)

Quick-fix rows land in the patterns.md tables (above). **Deeper patterns** — new code examples,
expanded approaches, new domain rules — must be persisted into the dedicated spec files under `patterns/`.

### When to Write to a Spec (vs. Index-Only)

| Signal | Action | Target |
|--------|--------|--------|
| One-liner fix (import path, type annotation) | Row in patterns.md table only | `patterns.md §Learned Patterns` |
| New code example or convention (>5 lines) | Add section to existing spec | `patterns/{spec}.md` |
| New pattern ID created (P#, D#, R#) | Add entry in patterns.md + section in spec | Both |
| Existing spec section outdated by code change | Update spec section in-place | `patterns/{spec}.md` |
| Pattern grows complex enough to need its own spec | Create new spec file | `patterns/{new-spec}.md` |

### Routing: Which Spec File Gets the Update

```
Classify the pattern → route to target file:

  Core code (ports, modules, tasks, routes, DI, config, types, errors)
    → patterns/code-patterns.md         [P1–P11]

  Testing fixtures, mocks, factories, parametrize, naming
    → patterns/testing-guide.md         [R2]

  File moves, import updates, refactor checklist
    → patterns/refactoring-workflow.md  [R1]

  API docs, boundary contracts, schema generation
    → patterns/api-standards.md         [R3]
```

### Spec File Template (for new files)

When creating a **new** spec file in `patterns/`:

```markdown
# {Pattern Name}

{One-line description of what this spec covers}.
Referenced from [patterns.md](../patterns.md).

---

## {Section 1}

{Explanation + code example}

---

## {Section N}
```

**Required conventions** (must match existing specs):
1. **H1 title** — matches the pattern name in patterns.md
2. **Backlink** — `Referenced from [patterns.md](../patterns.md).` on line 2-3
3. **`---` separators** between sections
4. **Code blocks** with language tags for all examples
5. Format: runnable examples > abstract descriptions

### Dual-Write Flow (Index + Spec)

When a pattern is substantial enough for a spec file:

```
┌──────────────────────────────────┐
│          LEARN phase             │
│    (after successful fix)        │
└───────────────┬──────────────────┘
                │
        Is it a quick fix?
        (one-liner, import path,
         type annotation)
                │
         ┌──────┴──────┐
         │ YES         │ NO
         ▼             ▼
  ┌──────────────┐  ┌──────────────────────────────────┐
  │ patterns.md  │  │ 1. Add/update patterns/{spec}.md │
  │ table row    │  │    (code, explanation, examples)  │
  │ only         │  │                                   │
  └──────────────┘  │ 2. Update patterns.md index:      │
                    │    - "Use when" triggers           │
                    │    - Spec table link               │
                    │    - Source file references         │
                    │                                    │
                    │ 3. Cross-ref from glossary.md      │
                    │    if new domain terms introduced   │
                    └──────────────────────────────────┘
```

---

## Infinite Loop Detection

Track error occurrences per cycle:

```
error_counts = {}

for each gate failure:
    key = f"{gate}:{file}:{error_signature}"
    error_counts[key] += 1

    if error_counts[key] >= 3:
        → BRANCH PRUNE (see §Branch Pruning Protocol above)
        → If already pruned this approach: ESCALATE
```

The default action on repeated failure is now **prune first, escalate second**.

---

## Escalation Protocol

When feedback loop cannot resolve:

```
ESCALATION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue: [description]
Attempted fixes: [list of attempts]
Reason for escalation: [infinite loop | architecture blocker | unclear requirement]

Recommended action:
  - [specific action needed]
  - [alternative approaches if any]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Escalate when:
1. Retry budget exhausted (iteration > 5)
2. Same gate fails repeatedly without meaningful delta
3. Fix requires destructive or unapproved contract change

---

## State Artifacts

Learned patterns are persisted in [patterns.md](patterns.instructions.md) and route to [patterns/](patterns/) specs.
Session summaries go to `docs/reports/`.

```
.agent-loop/
├── patterns.md                  # INDEX — pattern registry + learned fixes + pruning records
│   ├── Pattern Registry
│   │   ├── Core Code (P1–P11)        → patterns/code-patterns.md
│   │   └── Process (R1–R3)           → patterns/refactoring-workflow.md,
│   │                                   patterns/testing-guide.md,
│   │                                   patterns/api-standards.md
│   ├── Architecture Baseline
│   ├── Artifact Placement
│   └── Learned Patterns             ← FEEDBACK WRITES HERE
│       ├── Auto-Fixes table
│       ├── Heuristics table
│       ├── Common Errors table
│       └── Pruning Records table      ← BRANCH PRUNING WRITES HERE
│
├── patterns/                    # SPECS — detailed approaches & examples
│   ├── code-patterns.md              # P1–P11 with examples
│   ├── testing-guide.md              # R2 test patterns
│   ├── refactoring-workflow.md       # R1 4-phase checklist
│   └── api-standards.md              # R3 API/boundary standards
│
├── glossary.md                  # Domain terminology (cross-refs → D#/P#)
├── feedback.md                  # THIS FILE — behavioral patches + micro-loop + branch pruning
├── reasoning-kernel.md          # Core 7-stage loop + context clearage + transitions
├── validate-env.md              # Stage 1: NFR validation (micro/macro annotated)
└── validate-n.md                # Stage 2: neighbor validation
```

---

## Integration with Agent Loop

```
┌─────────────────────────────────────────────────────────────┐
│                     FEEDBACK INTEGRATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  reasoning-kernel.md                                         │
│        │                                                     │
│        ▼                                                     │
│   CHALLENGE-TEST                                             │
│        │                                                     │
│  validate-env.md ─┬─► PASS ─┐                                │
│                   └─► FAIL ─┤                                │
│  validate-n.md ───┬─► PASS ─┤                                │
│                   └─► FAIL ─┤                                │
│                              ▼                               │
│                   feedback.md (THIS)                         │
│                              │                               │
│                        Diagnose error                        │
│                              │                               │
│                        Apply patch                           │
│                              │                               │
│                        Retry action                          │
│                              │                               │
│                   ┌─► PASS → learn → persist:              │
│                   │    ├─ quick fix → patterns.md table      │
│                   │    └─ deep pattern → patterns/{spec}.md  │
│                   └─► FAIL (3x) → escalate                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [patterns.md](patterns.instructions.md) | Pattern registry — learned fixes written here |
| [reasoning-kernel.md](reasoning-kernel.instructions.md) | 7-stage loop that invokes feedback on FAIL |
| [validate-env.md](validate-env.instructions.md) | Stage 1 NFRs — gate failures feed into this file |
| [validate-n.md](validate-n.instructions.md) | Stage 2 neighbors — shape breaks feed into this file |
| [glossary.md](glossary.instructions.md) | Domain terms — naming feedback references glossary |
| [patterns/testing-guide.md](testing-guide.instructions.md) | R2: test patterns for coverage feedback |
| [patterns/refactoring-workflow.md](refactoring-workflow.instructions.md) | R1: refactoring checklist for doc-change feedback |
