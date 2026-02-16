---
name: "SyncLoop: Reasoning Kernel"
description: "7-stage agent reasoning loop with context clearage"
applyTo: "**/*"
---

# Reasoning Kernel

Core reasoning loop executed **every turn** before any action.
Referenced from [patterns.md](patterns.instructions.md) and [AGENTS.md](../AGENTS.md).

**Use when:**
- Starting any task (this loop runs **every turn**, not optionally)
- Deciding which operational mode to apply
- Choosing which patterns to consult before acting
- Validating changes before confirming completion
- Understanding the full agent lifecycle from sense → learn

---

## Primary Loop

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │                                                                      │
  │   ┌─────────┐     ┌─────────┐                                       │
  │   │ 1 SENSE │◄───►│ 2 GKP   │  ◄── inner loop: gather + compress   │
  │   └────┬────┘     └────┬────┘      until context is sufficient      │
  │        └───────┬───────┘                                            │
  │                ▼                                                    │
  │        ┌──────────────┐                                             │
  │        │ 3 DECIDE+ACT │  ← select mode, plan action, execute       │
  │        └──────┬───────┘                                             │
  │               ▼                                                     │
  │   ┌───────────────────────┐                                         │
  │   │ 4 CHALLENGE-TEST      │  ◄── inner loop: validate + fix        │
  │   │   ├ validate-env.md   │      until all gates pass or max 5      │
  │   │   └ validate-n.md     │                                         │
  │   └──────────┬────────────┘                                         │
  │              ▼                                                      │
  │        ┌──────────┐                                                 │
  │        │ 5 UPDATE  │  ← commit state transitions                   │
  │        └─────┬────┘                                                 │
  │              ▼                                                      │
  │        ┌──────────┐                                                 │
  │        │ 6 LEARN   │  ← persist to patterns.md / patterns/ specs   │
  │        └────┬─────┘                                                 │
  │             ▼                                                      │
  │        ┌──────────┐                                                 │
  │        │ 7 REPORT  │  ← store session log to docs/reports/          │
  │        └──────────┘  (skip if trivial)                              │
  │                                                                      │
  └──────────────────────────────────────────────────────────────────────┘
```

**Two inner loops exist:**
1. **SENSE ↔ GKP** — cycle until relevant context is gathered and compressed
2. **CHALLENGE-TEST → fix → retry** — cycle until gates pass (max 5 iterations)

---

## Transition Map

Explicit named edges define when to move between stages:

| From | To | Condition |
|------|----|-----------|
| SENSE | GKP | Context gaps remain |
| GKP | SENSE | New gaps discovered from reading |
| GKP | DECIDE+ACT | Context sufficient |
| DECIDE+ACT | CHALLENGE-TEST | Action executed |
| CHALLENGE-TEST | CHALLENGE-TEST | Micro-fix applied (no budget consumed) |
| CHALLENGE-TEST | FEEDBACK | Macro failure detected |
| FEEDBACK | SENSE | Correction vector generated |
| CHALLENGE-TEST | UPDATE | All gates pass |
| UPDATE | CHALLENGE-TEST | New issue discovered during update |
| UPDATE | LEARN | State committed cleanly |
| LEARN | REPORT | Patterns persisted |
| LEARN | DECIDE | Branch pruned — re-entering with lesson |
| REPORT | SENSE | Checkpoint clearage, ready for next task |
| REPORT | — | Session complete |

**Rule:** Never skip a stage or invent an edge not in this table. If stuck, escalate.

---

## Integrated Validation (CHALLENGE-TEST → fix → retry)

The CHALLENGE-TEST stage runs both validation prompts **in a loop** until all gates pass
or the iteration budget (5 macro iterations) is exhausted.

**Before routing any failure**, classify it:

### Failure Classification

| Signal | Class | Action |
|--------|-------|--------|
| Type error on new code only | **Micro** | Fix in-place, no budget consumed |
| `print()` / `breakpoint()` left in | **Micro** | Remove, no budget consumed |
| Unused import after refactor | **Micro** | Remove, no budget consumed |
| Formatting / whitespace issue | **Micro** | Auto-format, no budget consumed |
| Test failure | **Macro** | → feedback.md, consumes 1 of 5 iterations |
| Layer violation | **Macro** | → feedback.md, consumes 1 of 5 iterations |
| Shape mismatch across modules | **Macro** | → feedback.md, consumes 1 of 5 iterations |
| Same micro-fix needed 3x | **→ Macro** | Upgrade: systemic issue |

**Calibration rule:** If fix is "supported" (evidence in error message) → Micro. If fix is "assumed" (needs diagnosis) → Macro.

**Micro budget:** Max 2 micro-fixes per gate before escalating to macro.
**Macro budget:** 5 total iterations (existing).

```
CHALLENGE-TEST:
  │
  ├─► validate-env.md   (Stage 1: NFRs)
  │     └─► FAIL? → classify:
  │           ├─ Micro → fix in-place, retry (no budget cost)
  │           └─ Macro → feedback.md → patch → re-enter loop (-1 budget)
  │
  └─► validate-n.md     (Stage 2: Neighbors)
        └─► FAIL? → classify:
              ├─ Micro → fix in-place, retry (no budget cost)
              └─ Macro → feedback.md → patch → re-enter loop (-1 budget)
  │
  ALL PASS? ─► proceed to UPDATE
  BUDGET EXHAUSTED? ─► Branch Pruning (see §Context Clearage Protocol)
```

**Each macro iteration is 3-step:**
1. **Check** — run gate (types, tests, layers, shapes)
2. **Feedback** — on failure, diagnose via [feedback.md](feedback.instructions.md) and generate patch
3. **Retry** — apply patch, re-enter the same gate check

**Micro-fixes are self-contained** — they do NOT route through feedback.md.

---

## Stage Details

### 1. SENSE (+ context loop with GKP)

Extract current state and detect issues. **Cycle with GKP** until sufficient context is gathered.

```
SENSE:
- Challenges: [what needs to be solved]
- Success criteria: [what must pass]
- Failure modes: [what could break]
- Detected issues: [code smells, type errors, test failures, layer breaks]
- Current mode: [Stabilize | Expand | Split]
- Context gaps: [what else do I need to read?]
```

**SENSE ↔ GKP Inner Loop:**

```
┌─────────────────────────────────────────────────────────┐
│  SENSE                                                   │
│    Scan task, detect issues, identify context gaps        │
│                        │                                 │
│              Gaps remain?                                │
│              │ YES              │ NO                     │
│              ▼                  ▼                        │
│  GKP: lookup patterns,     Proceed to DECIDE+ACT        │
│  read specs, compress      with compressed context       │
│              │                                           │
│     New gaps from reading?                               │
│     │ YES → back to SENSE                                │
│     │ NO  → context sufficient                           │
└─────────────────────────────────────────────────────────┘
```

**Compression:** After each GKP pass, compress gathered context into a tight summary.
Don't carry raw file contents forward — extract only relevant constraints, patterns, and risks.

### 2. GKP (Generated Knowledge Pack)

Generate task-relevant context before any action.
**Route into [patterns.md](patterns.instructions.md) → then into the matching [patterns/](patterns/) spec.**

```
GKP:
- DOMAIN: [project stack and runtime — filled during bootstrap]
- PATTERNS: [route from patterns.md to applicable spec — see lookup below]
- CONSTRAINTS:
  • [layer architecture rules — from patterns.md]
  • [typing requirements — from validate-env.md]
  • [boundary contracts — from validate-n.md]
- RISKS:
  • [what could break from this action]
  • [cross-layer imports break modularity]
  • [missing types cause runtime errors]
- KNOWN FIXES: [check patterns.md §Auto-Fixes table]
- DECISION CUES:
  • Keywords: [domain-specific terms from glossary.md]
  • Gates: [type_check_pass, tests_pass, layer_rules_pass]
  • Blockers: [destructive_change, infinite_loop, architecture_violation]
```

**Pattern Lookup & Routing (6 steps):**

```
1. READ patterns.md → scan "Use when" triggers for matching pattern IDs
2. ROUTE to the spec file:
   ┌──────────────────────────────────────────────────────────┐
   │ P1–P11 (code)      → patterns/code-patterns.md          │
   │ R1 (refactoring)   → patterns/refactoring-workflow.md   │
   │ R2 (testing)       → patterns/testing-guide.md          │
   │ R3 (API standards) → patterns/api-standards.md          │
   └──────────────────────────────────────────────────────────┘
3. READ the spec section for implementation examples
4. CHECK patterns.md §Common Errors for known pitfalls
5. CHECK patterns.md §Auto-Fixes for applicable transforms
6. COMPRESS: extract only the constraints + examples relevant to this task
```

**Domain terms:** If any term is ambiguous, consult [glossary.md](glossary.instructions.md).

---

## Context Scope (Per-Stage Loading)

At each stage, load only the context relevant to that stage. Unload what isn't needed.

| Stage | Load | Skip | Budget Focus |
|-------|------|------|--------------|
| SENSE | workspace state, task description | patterns/, glossary | — |
| GKP | patterns.md → relevant spec | validate-*.md, feedback.md | Evidence 40–60% |
| DECIDE+ACT | GKP output (compressed) | raw pattern files | Instructions 10–20% |
| CHALLENGE-TEST | validate-env.md, validate-n.md | patterns/*.md | Verification 5–10% |
| FEEDBACK | feedback.md, failing file | everything else | Evidence 40–60% |
| LEARN | patterns.md, relevant spec | validate-*.md | Examples 0–30% |
| REPORT | session state only | all .agent-loop/ files | — |

**Budget Controller** (context allocation guideline):

| Component | Allocation |
|-----------|------------|
| Instructions & constraints | 10–20% |
| Evidence / references | 40–60% |
| Examples / demos | 0–30% |
| Verification checklist | 5–10% |

**Key rule:** After GKP compression, do NOT re-read the source files. Work from the compressed context.

---

### 3. DECIDE + ACT

Select operational mode **and** plan the concrete action in a single step.

**Mode Selection:**

| Mode | Trigger | Behavior |
|------|---------|----------|
| **INTACT-STABILIZE** | All gates pass, code working | Harden: add tests, improve types, document |
| **BROKEN-EXPAND** | Issues detected | Fix: apply minimal patches, expand outward |
| **OVERDENSE-SPLIT** | Complexity too high | Decompose: split files, extract modules |

**Selection Logic:**

```python
def select_mode(state):
    if state.all_gates_pass and state.complexity < THRESHOLD:
        return Mode.INTACT_STABILIZE
    elif state.has_issues:
        return Mode.BROKEN_EXPAND
    elif state.complexity >= THRESHOLD or state.file_size > MAX_LINES:
        return Mode.OVERDENSE_SPLIT
```

**Action Plan** (produced alongside mode):

```
ACTION PLAN:
- Core:     [main logic change — what files, what functions]
- Shell:    [interface/boundary change — new params, new exports]
- Neighbor: [affected modules — who calls this, who breaks]
- Pattern:  [which pattern ID(s) apply — e.g., P1+P10, R1]
- Risk:     [what could go wrong — rollback strategy]
```

The agent executes the plan immediately after producing it.
Do **not** output a plan and wait — DECIDE and ACT are one phase.

### 4. CHALLENGE-TEST

See [Integrated Validation](#integrated-validation-challenge-test--fix--retry) above.
Run gates in a loop until all pass or budget (5 iterations) is exhausted.

### 5. UPDATE

Commit state transitions after all gates pass:

```
UPDATE:
- Files changed: [list]
- State before → after: [what shifted]
- Reports generated: [stored in docs/reports/ if applicable]
- Patterns affected: [any new or modified pattern IDs]
```

If UPDATE reveals that the change introduced a new issue not caught by gates
(e.g., a documentation reference is now stale), **cycle back** to CHALLENGE-TEST
for one more validation pass.

### 6. LEARN

Persist lessons from this cycle. Route to the correct target per [feedback.md §Persisting to Spec Files](feedback.instructions.md):

```
LEARN:
- Quick fix? → Add row to patterns.md table (Auto-Fixes, Common Errors, Heuristics)
- Deep pattern? → Add/update section in patterns/{spec}.md + update patterns.md index
- New term? → Add to glossary.md with [→ ID] cross-reference
- Heuristic? → One-line do-more/do-less for next cycle
```

### 7. REPORT (Session Log)

After completing a non-trivial task, persist a session summary to `docs/reports/`.

**When to write a report:**

| Condition | Report Required | Format |
|-----------|----------------|--------|
| Multi-file refactoring | Yes | Full report |
| New feature / module added | Yes | Full report |
| Bug fix with root cause analysis | Yes | Abbreviated (scope + fix + verification) |
| Architecture or pattern change | Yes | Full report + patterns.md update |
| Single-file cosmetic fix | No | — |
| Documentation-only update | No | — |

**Report structure:**

```markdown
# {Short Description}

**Date:** YYYY-MM-DD
**Status:** Complete

## 1. Summary
{What was done and why — 1–3 sentences}

## 2. Scope
{Modules/files affected, pattern IDs referenced}

## 3. Changes
{Itemized list of what changed: code, config, docs, patterns}

## 4. Verification
- [ ] Type check pass
- [ ] Tests pass
- [ ] Layer rules: no cross-layer violations
{Gate results: PASS/FAIL + iteration count}

## 5. Artifacts
{Links to: diffs, logs, diagrams in docs/reports/artifacts/}

## 6. Learned Patterns
{What was persisted to patterns.md / patterns/ specs / glossary}
```

**File placement:**
- Report: `docs/reports/YYYY-MM-DD-{short-description}.md`
- Supporting artifacts: `docs/reports/artifacts/`
- Naming: date-prefixed, lowercase-kebab-case, no `_v1`/`_new` suffixes

---

## Context Clearage Protocol

Explicit lifecycle management for accumulated context. Prevents stale data from degrading reasoning quality in long sessions.

### Strategy 1: State Collapse (on success)

**Trigger:** LEARN stage completes successfully → entering REPORT.

**Process** (RCG-based — Referential Context Graph):

```
1. EXTRACT  — Identify entities, facts, rules from current session
2. RELATE   — Establish edges between nodes (defines, supports, conflicts)
3. ANCHOR   — Mark task root + outcome as entry points
4. PRUNE    — Remove disconnected or stale nodes
5. VALIDATE — Check for conflicts or missing links
```

**Compression:** Use **Abstractive** strategy — synthesize a session summary with attribution.

**Output:** Checkpoint Summary (see template below) → discard raw history → restart SENSE with only the summary as input.

### Strategy 2: Branch Pruning (on repeated failure)

**Trigger:** Same error 3× OR macro retry budget exhausted without resolution.

**Process:**
1. Identify the failed approach ("rotten branch")
2. Revert file changes from that branch (not unrelated passing changes)
3. Record lesson: `"Approach: [X] | Failure: [Y] | Constraint: do NOT retry X"`
4. Restart at DECIDE with lesson injected as hard constraint

**Compression:** Use **Extractive** strategy — keep failure evidence sentences faithfully.

**Guard:** If the same branch has already been pruned once → escalate instead of pruning again.

**Detail:** See [feedback.md §Branch Pruning Protocol](feedback.instructions.md).

### Strategy 3: Scoped Loading (per-stage)

See [§Context Scope table](#context-scope-per-stage-loading) above. At each stage, only load the files listed in the "Load" column and skip everything in the "Skip" column.

### Checkpoint Summary Template

Produced by State Collapse at the end of each successful cycle:

```
CHECKPOINT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task:    [original task description]
Status:  [complete | partial | blocked]
Changes: [files modified/created — bullet list]
Gates:   [PASS (iteration N) | FAIL (escalated)]
Lessons: [patterns persisted, if any]
Next:    [ready for new task | continue with {remaining work}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This summary becomes the **sole input** to the next SENSE stage after clearage.

---

## Output Schema

When executing a step, output this exact structure:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SENSE (1-3 lines)
[current state, detected issues, context gaps]

MODE
[INTACT-STABILIZE | BROKEN-EXPAND | OVERDENSE-SPLIT]

GKP
- Patterns: [IDs consulted, spec files read]
- Constraints: [list key constraints]
- Risks: [list key risks]

ACTION (DECIDE+ACT)
- Core: [main logic change]
- Shell: [interface/boundary change]
- Neighbor: [affected modules]
- Pattern: [which IDs apply]

CHALLENGE-TEST (iteration N/5)
[PASS | FAIL] — [reason/gate violated]
[If FAIL: patch applied, retrying...]

UPDATE
[what changed, state transitions]
(If new issues found → one more CHALLENGE-TEST pass)

LEARN
[quick fix → patterns.md table | deep → patterns/{spec}.md]
[one-line do-more/do-less heuristic]

REPORT (if non-trivial)
[docs/reports/YYYY-MM-DD-{slug}.md created — or "skipped (trivial)"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Internal Critic (Pre-Action Check)

Before finalizing any action, validate:

```
CRITIC CHECK:
- Legality: Any cross-layer violation? [YES → revise]
- Viability: Will this break existing functionality? [YES → revise]
- Overload: Is complexity increasing without decomposition? [YES → split first]
- Regression: Could this reintroduce a fixed issue? [YES → add guard]

If any fail → revise action once, then output revised version.
Do not output critic reasoning; only output final decision.
```

---

## Guardrails (Never Violate)

- Never modify test files to make tests pass — fix the source code
- Never remove type hints to fix type errors — add correct types
- Never change public API without explicit approval
- Never import across incompatible layers (e.g., infra importing domain)
- Never merge/absorb across incompatible boundaries without decomposing first

**If uncertain about impact:** Treat as risky, prefer isolated fix.

---

## Termination Conditions

| Condition | Action |
|-----------|--------|
| All gates pass | SUCCESS — complete |
| Max iterations (5) | TIMEOUT — report partial |
| Same error 3+ times | BRANCH PRUNE — revert, inject lesson, re-enter DECIDE (see §Context Clearage) |
| Branch already pruned | ESCALATE — same approach failed twice, stop and report |
| Destructive change needed | BLOCKED — require confirmation |
| Architecture violation | HARD STOP — cannot proceed |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [patterns.md](patterns.instructions.md) | Pattern registry — GKP reads from here, LEARN writes here |
| [patterns/](patterns/) | Detailed specs — GKP routes into these for implementation examples |
| [glossary.md](glossary.instructions.md) | Domain terminology — resolves ambiguous terms in SENSE/GKP |
| [feedback.md](feedback.instructions.md) | Behavioral patches — invoked by CHALLENGE-TEST on FAIL |
| [validate-env.md](validate-env.instructions.md) | Stage 1 NFRs — run in CHALLENGE-TEST loop |
| [validate-n.md](validate-n.instructions.md) | Stage 2 neighbors — run in CHALLENGE-TEST loop |
| [AGENTS.md](../AGENTS.md) | Main entrypoint — references this file |
