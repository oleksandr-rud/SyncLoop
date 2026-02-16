---
name: "SyncLoop: Validate Environment"
description: "NFR gates: types, tests, layers, complexity"
applyTo: "**/*"
---

# Validate Environment (NFRs)

**Fixed Non-Functional Requirements** for solutions, code, and documentation.

This is **Stage 1** of the 2-stage validation integrated into the reasoning kernel.

---

## Position in Reasoning Kernel

```
CHALLENGE-TEST (from reasoning-kernel.md):
  │
  ├─► [Stage 1] validate-env.md  ◄── YOU ARE HERE
  │     │
  │     ├─► Check NFRs (types, tests, layers, complexity, debug)
  │     └─► FAIL? → feedback.md → patch → retry
  │
  └─► [Stage 2] validate-n.md
        └─► Check neighbors (shapes, boundaries, bridges)
```

---

## NFR Categories

### Code NFRs

| NFR | Requirement | Evidence | Required |
|-----|-------------|----------|----------|
| **Type Safety** | All functions typed, no untyped `Any` | Static type checker output | Yes |
| **Test Coverage** | Critical paths tested | Test runner result | Yes |
| **Layer Integrity** | No cross-layer imports | Import analysis | Yes |
| **Complexity** | Files < 500 LOC, functions < 50 LOC | Size/complexity metrics | Warning |
| **No Debug Code** | No print(), breakpoint(), TODO | Grep/search | Yes |

### Solution NFRs

| NFR | Requirement | Evidence |
|-----|-------------|----------|
| **Minimal Change** | Smallest diff that solves the problem | Review diff size |
| **No Regressions** | Existing tests must pass | Test runner |
| **Backward Compatible** | Public APIs unchanged (unless approved) | Shape check |
| **Idiomatic** | Follows project patterns from patterns.md | Pattern match |

### Documentation NFRs

| NFR | Requirement | Evidence |
|-----|-------------|----------|
| **Docstrings** | Public functions have docstrings | AST/lint check |
| **Type Hints** | Parameters and returns annotated | Type checker |
| **Updated Docs** | README/docs reflect changes | Manual review |

---

## 2-Stage Validation Pattern

Each NFR check follows this pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    NFR VALIDATION                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  STAGE 1: CHECK                                              │
│  ───────────────                                             │
│  Run gate command → Collect results                          │
│                                                              │
│  STAGE 2: FEEDBACK (if failed)                               │
│  ─────────────────────────────                               │
│  Diagnose error → Generate patch → Apply fix → Retry         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Gate Execution Order

1. Run gates in defined order (Type Safety → Tests → Layers → Complexity → Debug)
2. Stop at first failure
3. Route to [feedback.md](feedback.instructions.md) for diagnosis
4. Patch minimally at root cause
5. Retry the same failing gate
6. Continue only after pass

---

## Per-Gate Execution Patterns

### Gate 1: Type Safety

**Failure class:** Micro (if error on new code only) / Macro (if existing signatures affected)

Run static type checker for the project.

**Commands:**
```bash
# {Fill in with project type check command}
{typecheck command}
```

**2-Stage Pattern:**
```
STAGE 1 — CHECK:
  Run type checker → Collect errors

STAGE 2 — FEEDBACK (if failed):
  ├─► Parse error: e.g. "Missing return type annotation"
  ├─► Generate patch: Add return type based on body analysis
  ├─► Apply fix
  └─► Retry STAGE 1
```

**Auto-fixable:** Missing return types (obvious), simple type narrowing
**Not auto-fixable:** Complex generics, protocol violations

### Gate 2: Test Coverage

**Failure class:** Macro (always — test failures require root cause diagnosis)

Run the project test suite.

**Commands:**
```bash
# {Fill in with project test commands}
{test command}
```

**2-Stage Pattern:**
```
STAGE 1 — CHECK:
  Run test suite → Collect failures

STAGE 2 — FEEDBACK (if failed):
  ├─► Identify failing test
  ├─► Analyze root cause in SOURCE (never modify test)
  ├─► Generate fix for source code
  └─► Retry STAGE 1
```

**Rule:** Never modify tests to make them pass.

**Critical Workflow:**
```
After ANY of these changes:
  ├─► Code refactoring (moved files, renamed modules)
  ├─► Import path changes
  ├─► Documentation updates (especially imports in docs)
  ├─► Type check fixes
  └─► MUST run full test suite

Reason: Ensure imports work, examples are valid, no broken references.
```

### Gate 3: Layer Integrity

**Failure class:** Macro (always — requires architectural decision)

Verify no cross-layer imports exist in the project architecture.

**Project-specific rules:**
{Fill in during bootstrap — define which layers cannot import from which.}

- Routes must NOT contain business logic — delegate to services
- Services must NOT depend on transport layer
- Infrastructure utilities must NOT import from domain modules

{Add additional project-specific layer rules here.}

**2-Stage Pattern:**
```
STAGE 1 — CHECK:
  Scan for cross-layer imports (e.g., infra importing domain)

STAGE 2 — FEEDBACK (if failed):
  ├─► Identify violation location
  ├─► Refactor: extract to correct layer OR use dependency injection
  └─► Retry STAGE 1
```

**Not auto-fixable:** Requires architectural decision.

### Gate 4: Complexity

**Failure class:** Macro (triggers mode switch to OVERDENSE-SPLIT)

Check file and function sizes against thresholds.

**2-Stage Pattern:**
```
STAGE 1 — CHECK:
  Measure file LOC, function LOC, cyclomatic complexity

STAGE 2 — FEEDBACK (if exceeded):
  ├─► Identify overdense code
  ├─► Switch to OVERDENSE-SPLIT mode
  ├─► Decompose before proceeding
  └─► Retry STAGE 1
```

### Gate 5: Debug Hygiene

**Failure class:** Micro (always — auto-removable artifacts)

Check for debug artifacts left in production code.

**Commands:**
```bash
# {Fill in with project lint/format commands}
{lint command}
```

**2-Stage Pattern:**
```
STAGE 1 — CHECK:
  Scan for debug artifacts (print, breakpoint, TODO, etc.)

STAGE 2 — FEEDBACK (if found):
  ├─► Remove or convert to proper logging
  └─► Retry STAGE 1
```

---

## Auto-Fix Rules

| NFR | Auto-Fixable | Condition |
|-----|--------------|-----------|
| Type Safety | Partial | Only obvious return types, simple narrowing |
| Test Coverage | Never | Fix source, not tests |
| Layer Integrity | Never | Requires architecture decision |
| Complexity | Via Split | Triggers OVERDENSE-SPLIT mode |
| Debug Code | Yes | Remove or convert to logging |

---

## Iteration Budget and Escalation

- Max 5 full CHALLENGE-TEST iterations
- Escalate when:
  - Budget exhausted
  - Same gate fails 3+ times with equivalent symptom
  - Required fix exceeds approved scope

Escalation report should include failing gate, attempted patches, and blockers.

---

## Output Contract

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATE-ENV (Stage 1 of CHALLENGE-TEST)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NFR: TYPE SAFETY
  Check: [PASS | FAIL]
  Feedback: [applied patch if failed, or "—"]
  Retry: [PASS | SKIP]

NFR: TEST COVERAGE
  Check: [PASS | FAIL]
  Feedback: [applied patch if failed, or "—"]
  Retry: [PASS | SKIP]

NFR: LAYER INTEGRITY
  Check: [PASS | FAIL]
  Feedback: [applied patch if failed, or "—"]
  Retry: [PASS | SKIP]

NFR: COMPLEXITY
  Check: [PASS | WARN | FAIL]
  Feedback: [applied patch if failed, or "—"]
  Retry: [PASS | SKIP]

NFR: DEBUG CODE
  Check: [PASS | FAIL]
  Feedback: [applied patch if failed, or "—"]
  Retry: [PASS | SKIP]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 1 RESULT: [PASS | FAIL]
PROCEED TO STAGE 2: [YES | NO - escalate]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Integration with Reasoning Kernel

```
reasoning-kernel.md
        │
        ▼
   CHALLENGE-TEST
        │
        ├─► Stage 1: validate-env.md (NFRs)
        │     │
        │     └─► Each NFR: CHECK → FEEDBACK → RETRY
        │
        └─► Stage 2: validate-n.md (Neighbors)
              │
              └─► Each check: CHECK → FEEDBACK → RETRY
```

**Flow on failure:**
1. NFR check fails
2. Invoke `feedback.md` with error context
3. Generate and apply patch
4. Retry the same NFR check
5. If still fails after 3 retries → escalate

---

## Common Failure Patterns

| Symptom | Likely Cause | Preferred Fix |
|---------|--------------|---------------|
| Recurrent type failures | Incomplete interface update | Update all impacted signatures |
| Passing tests but failing layers | Hidden architectural shortcut | Restore layer boundaries |
| Complexity spike after quick fix | Accretive patching | Switch to OVERDENSE-SPLIT mode |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [reasoning-kernel.md](reasoning-kernel.instructions.md) | Full loop orchestration |
| [validate-n.md](validate-n.instructions.md) | Neighbor compatibility stage |
| [feedback.md](feedback.instructions.md) | Patch generation and escalation |
