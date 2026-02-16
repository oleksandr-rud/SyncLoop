---
name: "SyncLoop: Validate Neighbors"
description: "Shape, boundary, bridge checks"
applyTo: "**/*"
---

# Validate Neighbors (Stage 2)

Validation of **shapes, boundaries, and bridge interfaces** when modifying shared code.

This is **Stage 2** of the 2-stage validation integrated into the reasoning kernel.

---

## Position in Reasoning Kernel

```
CHALLENGE-TEST (from reasoning-kernel.md):
  │
  ├─► [Stage 1] validate-env.md
  │     └─► Check NFRs (types, tests, layers, docs)
  │
  └─► [Stage 2] validate-n.md  ◄── YOU ARE HERE
        │
        ├─► Check shapes (function signatures)
        ├─► Check boundaries (module exports)
        ├─► Check bridges (cross-module contracts)
        └─► FAIL? → feedback.md → patch → retry
```

---

## When to Run

- When modifying **any public interface** (function signatures, class APIs)
- When changing **module boundaries** (adding/removing exports)
- When creating **new modules** or **moving code between modules**
- Before merging changes that touch **multiple modules**

### Neighbor Map

{Fill in during bootstrap with actual project coupling paths.}

Key coupling paths to track:

```
routes/* ──► services/* ──► repositories/* / database
                 │
                 ├──► external adapters (APIs, integrations)
                 ├──► utilities (logging, audit, helpers)
                 └──► background workers / job queues
```

When modifying any of these, check all neighbors in the coupling path.

---

## Core Concepts

### Shapes

The **signature contract** of a function, method, or class:

```python
# Shape = name + parameters + return type + raises
def query(
    self,
    collection: str,
    query_text: str,
    *,
    filters: dict | None = None,
    limit: int = 10,
) -> list[Result]:
    ...
```

A shape change is anything that alters the call contract:
adding/removing parameters, changing types, or modifying return types.

### Boundaries

The **module interface** — what is exported/public:

```python
# module/__init__.py
from .service import MyService        # Public boundary
from .routes import router            # Public boundary

# Private (not exported) — can change freely
# from .internal import _helper
```

Boundary changes affect every consumer that imports from the module.

### Bridges

The **contracts between modules** — how they communicate:

```python
# Bridge: module_a → module_b
# Contract: ServiceA.process() returns list[Result]
# Consumer: ServiceB expects this shape

# If ServiceA.process() changes return type:
# → ServiceB breaks (bridge violation)
```

---

## 2-Stage Validation Pattern

Each neighbor check follows this pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                  NEIGHBOR VALIDATION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  STAGE 1: CHECK                                              │
│  ───────────────                                             │
│  Identify neighbors → Analyze shapes → Verify compatibility  │
│                                                              │
│  STAGE 2: FEEDBACK (if failed)                               │
│  ─────────────────────────────                               │
│  Diagnose break → Update callers first → Retry               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Per-Check Execution Patterns

### Check 1: Shape Compatibility

**2-Stage Pattern:**
```
STAGE 1 — CHECK:
  Compare before/after signatures → Classify change type

STAGE 2 — FEEDBACK (if BREAKING):
  ├─► Identify all callers
  ├─► Generate patches for each caller
  ├─► Apply caller updates FIRST
  ├─► Then apply source change
  └─► Retry STAGE 1
```

For each changed function/class:

```
SHAPE CHECK: [function_name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before:
  def query(collection: str, query: str) -> list[dict]

After:
  def query(collection: str, query: str) -> list[Result]

Change Type: [BREAKING | ADDITIVE | COMPATIBLE]

Callers Affected:
  - module_a/services.py:45 → NEEDS UPDATE
  - module_b/services.py:78 → COMPATIBLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Check 2: Boundary Integrity

**2-Stage Pattern:**
```
STAGE 1 — CHECK:
  Verify __init__.py exports → Check for accidental exposure

STAGE 2 — FEEDBACK (if violation):
  ├─► Remove accidental exports OR
  ├─► Properly document new exports
  └─► Retry STAGE 1
```

```
BOUNDARY CHECK: [module]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Exports:
  ✅ MyService (public, stable)
  ✅ router (public, stable)
  ⚠️ ResultModel (newly exported — verify callers)

Internal (not exported):
  ✅ _build_filters (private, can change)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Check 3: Bridge Contracts

**2-Stage Pattern:**
```
STAGE 1 — CHECK:
  Verify cross-module contracts still hold

STAGE 2 — FEEDBACK (if broken):
  ├─► Analyze contract requirements
  ├─► Update either producer or consumers
  └─► Retry STAGE 1
```

```
BRIDGE CHECK: [source] → [target]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contract: ServiceB calls ServiceA.process()
Expected: list[Result] with fields [id, text, score]
Actual: list[Result] with fields [id, text, score, metadata]

Compatibility: ✅ ADDITIVE (new field, no breakage)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Change Classification

| Type | Description | Action Required |
|------|-------------|-----------------|
| **COMPATIBLE** | No signature change | None |
| **ADDITIVE** | New optional params, new fields | Verify callers handle gracefully |
| **BREAKING** | Changed types, removed params | Update all callers |

### Breaking Change Protocol

When a breaking change is detected:

1. **Identify all callers** (grep/search for usages)
2. **Update callers first** (before changing source)
3. **Run validate-env** (ensure no regressions)
4. **Apply source change**
5. **Run validate-env again** (final verification)

---

## Coupling Strength Definitions

Track coupling between modules to assess impact:

| Coupling | Definition | Example |
|----------|------------|---------|
| **Strong** | Direct function calls, shared types | Service calls another service |
| **Medium** | Shared infrastructure (same DB tables, collections) | Two modules writing the same store |
| **Weak** | Only via events, tasks, or async messages | Background job triggers downstream module |

---

## Output Contract

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATE-N (Stage 2 of CHALLENGE-TEST)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHANGED MODULE: [module name]

NEIGHBORS:
  - [module1]: [weak | medium | strong] coupling
  - [module2]: [weak | medium | strong] coupling

CHECK: SHAPES
  - [function1]: [COMPATIBLE | ADDITIVE | BREAKING]
  - [function2]: [COMPATIBLE | ADDITIVE | BREAKING]
  Feedback: [applied patch or "—"]

CHECK: BOUNDARIES
  Status: [INTACT | MODIFIED]
  Feedback: [applied patch or "—"]

CHECK: BRIDGES
  Status: [VALID | BROKEN]
  Feedback: [applied patch or "—"]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 2 RESULT: [PASS | FAIL]
PROCEED: [YES → UPDATE phase | NO → escalate]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Typical Corrections

| Failure Type | Correction Strategy |
|--------------|---------------------|
| Shape mismatch | Align shared model/signature across producer and consumers |
| Boundary drift | Restore intended exports and update docs |
| Bridge mismatch | Normalize adapter/mapper at integration boundary |

---

## Integration with Reasoning Kernel

```
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATION CHAIN                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. reasoning-kernel.md                                      │
│     └─► Plan action, identify affected modules               │
│                                                              │
│  2. validate-env.md (Stage 1)                                │
│     └─► Run quality gates                                    │
│                                                              │
│  3. validate-n.md (THIS — Stage 2)                           │
│     └─► Check shapes, boundaries, bridges                    │
│     └─► If BREAKING → update callers first                   │
│                                                              │
│  4. On FAIL → feedback.md                                    │
│     └─► Apply patches, retry                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [validate-env.md](validate-env.instructions.md) | Stage 1 gates |
| [feedback.md](feedback.instructions.md) | Retry and escalation logic |
| [patterns/refactoring-workflow.md](refactoring-workflow.instructions.md) | Safe dependency and import movement |
