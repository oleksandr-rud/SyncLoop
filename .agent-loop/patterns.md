# Pattern Registry & Routing Index

Central pattern index for GKP routing and LEARN persistence.
Referenced from [reasoning-kernel.md](reasoning-kernel.md).

---

## Pattern Families

| IDs | Family | Primary Spec |
|-----|--------|--------------|
| **P1–P11** | Core code architecture patterns | [patterns/code-patterns.md](patterns/code-patterns.md) |
| **R1–R3** | Refactoring, testing, and API quality patterns | [patterns/refactoring-workflow.md](patterns/refactoring-workflow.md), [patterns/testing-guide.md](patterns/testing-guide.md), [patterns/api-standards.md](patterns/api-standards.md) |

---

## Architecture Baseline

```
CLI Transport (bin/) ─┬► Init Logic (src/init.ts) ► Templates (template/)
MCP Transport (src/) ─┘
```

### Layer Intent
- **`bin/cli.ts`**: Argument parsing and output formatting only. Delegates all scaffolding to `src/init.ts`.
- **`src/server.ts`**: MCP resource/tool/prompt registration only. Delegates all scaffolding to `src/init.ts`.
- **`src/init.ts`**: All core logic — stack detection, link rewriting, placeholder substitution, file generation. No transport concerns.
- **`template/`**: Read-only static assets. Never import from `src/`.

### Non-Bypass Rules
- Never implement scaffolding logic in `bin/cli.ts` or `src/server.ts` — delegate to `src/init.ts`
- Never change `init()` or `detectStacks()` signatures without updating both callers
- Never change public APIs without explicit approval
- Never rename `sync_loop` (package/binary) in one place — update all references atomically

---

## Core Code Patterns (P1–P11)

> Full spec with examples → [patterns/code-patterns.md](patterns/code-patterns.md)

#### P1 · Port/Adapter

Infrastructure abstraction via interface protocols (ports) with concrete implementations (adapters).

**Use when:** Adding external service · Swapping infrastructure impl · Writing tests that mock I/O · Reviewing layer boundary compliance · Creating a new infrastructure package

#### P2 · Domain Module

Standard multi-file layout for each business domain. Enforces separation of concerns within features.

**Use when:** Creating a new feature module · Adding a file to existing module · Checking module completeness · Reviewing cross-module dependencies · Moving logic out of routes into services

#### P3 · Background Task Boundary

Async background processing with runtime dependency injection. Task handlers stay thin; business logic lives in services.

**Use when:** Adding a background processing task · Debugging task dependency injection · Understanding task status tracking · Reviewing task error handling and retry logic

#### P4 · App Context / Composition Root

Global dependency container initialized once at startup. Provides config, session factory, and shared services.

**Use when:** Understanding runtime dependency wiring · Adding a new global dependency · Debugging initialization errors · Writing test fixtures that reset global state

#### P5 · Transport Route

Boundary endpoints using dependency injection for service access. Routes contain only transport concerns.

**Use when:** Adding a new endpoint · Wiring a service into a route · Reviewing route-to-service boundary · Adding request/response validation

#### P6 · Typed Models

Domain entities with explicit types, default factories for collections, and serialization methods.

**Use when:** Defining a new entity or value object · Adding fields to existing model · Reviewing serialization behavior · Deciding model type (dataclass vs schema model)

#### P7 · Collection/Enum Safety

Type-safe namespace references replacing magic strings with enums/constants.

**Use when:** Adding a new namespace/collection · Debugging name mismatches · Reviewing normalization logic

#### P8 · Error Handling

Layered exception hierarchy: domain base → specific errors. Routes catch domain errors and map to transport status codes.

**Use when:** Adding error handling · Defining domain exceptions · Mapping service errors to transport responses · Reviewing error propagation across layers

#### P9 · Type Hints Everywhere

All functions require complete type annotations: parameters, returns, generics. No bare `Any` without justification.

**Use when:** Writing any new function · Fixing type checker errors · Reviewing type completeness · Using project-specific type aliases

#### P10 · Service Orchestration

Services accept all dependencies via constructor. No hidden imports or global access in service methods.

**Use when:** Creating a new service · Making a service testable · Wiring mocks in test fixtures · Reviewing service constructor signatures

#### P11 · Config Isolation

Environment-based config with centralized source and startup validation.

**Use when:** Adding environment variable · Understanding config overrides · Debugging config initialization

---

## Process Patterns (R1–R3)

#### R1 · Refactoring Workflow

4-phase checklist for safe file moves, import changes, and module restructuring.

**Use when:** Moving a file · Renaming a module · Splitting a large file · Merging modules · Running post-refactor validation

**Spec:** [patterns/refactoring-workflow.md](patterns/refactoring-workflow.md)

#### R2 · Testing Guide

Test patterns covering the full test pyramid with fixtures, factories, mocks, and parameterized tests.

**Use when:** Writing a new test · Setting up fixtures · Creating mock adapters · Deciding test layer · Reviewing naming conventions · Structuring parameterized tests

**Spec:** [patterns/testing-guide.md](patterns/testing-guide.md)

#### R3 · API / Boundary Standards

Documentation and contract requirements for boundary endpoints: typed models, docstrings, schema generation.

**Use when:** Adding a new endpoint · Documenting existing routes · Reviewing response models · Generating or updating specs

**Spec:** [patterns/api-standards.md](patterns/api-standards.md)

---

## GKP Routing Table

| If task involves… | Use IDs | Read this first |
|-------------------|---------|-----------------|
| Ports/adapters and layering | P1, P2, P10 | [patterns/code-patterns.md](patterns/code-patterns.md) |
| Task orchestration/runtime composition | P3, P4 | [patterns/code-patterns.md](patterns/code-patterns.md) |
| Boundary contracts and typing | P5, P6, P9 | [patterns/code-patterns.md](patterns/code-patterns.md) |
| Error policies and config safety | P8, P11 | [patterns/code-patterns.md](patterns/code-patterns.md) |
| File moves and API-safe refactors | R1 | [patterns/refactoring-workflow.md](patterns/refactoring-workflow.md) |
| Verification strategy | R2 | [patterns/testing-guide.md](patterns/testing-guide.md) |
| Interface docs/schema discipline | R3 | [patterns/api-standards.md](patterns/api-standards.md) |

---

## Artifact Placement

### Application Code

| Artifact Type | Location |
|---------------|----------|
| CLI entry point | `bin/cli.js` |
| MCP server | `src/server.js` |
| Core scaffolding logic | `src/init.ts` |
| Protocol template files | `template/.agent-loop/` |
| Agent bootstrap templates | `template/AGENTS.md`, `template/protocol-summary.md`, `template/bootstrap-prompt.md` |

### Tests

| Test Type | Command | Purpose |
|-----------|----------|---------|
| CLI smoke | `node bin/cli.js --help` | Verify CLI entry point loads |
| Dry-run scaffold | `node bin/cli.js init --dry-run` | Verify file generation logic |
| MCP server start | pipe `initialize` JSON to `node bin/cli.js` | Verify MCP transport connects |

### Documentation & Agent Loop

| Doc Type | Location |
|----------|----------|
| Architecture overview | `docs/ARCHITECTURE.md` |
| Engineering reports | `docs/reports/YYYY-MM-DD-*.md` |
| Report artifacts | `docs/reports/artifacts/` |
| Pattern index + learned fixes | `.agent-loop/patterns.md` |
| Pattern detail specs | `.agent-loop/patterns/*.md` |
| Domain terminology | `.agent-loop/glossary.md` |

---

## Naming Anti-Patterns

| Anti-Pattern | Correct Approach | Reason |
|--------------|------------------|--------|
| `*_v1.py`, `*_v2.py` | Update existing or rename clearly | Git handles versions |
| `*_new.py`, `*_old.py` | Refactor into `*_next.py` then swap | "New" becomes old quickly |
| `test_*_v2.py` | `test_<original_name>.py` | 1:1 mapping to source module |

---

## Learned Patterns (LEARN writes here)

### Auto-Fixes

| Trigger | Root Cause | Minimal Safe Fix | Auto-Apply |
|---------|------------|------------------|------------|
| Missing explicit return type | Signature drift | Add concrete return annotation | ✅ |
| Stray debug artifact | Temporary local instrumentation left in patch | Remove or replace with standard logging | ✅ |
| Caller mismatch after rename | Incomplete refactor propagation | Update all known call sites before merge | ⚠️ |
| Stale package/binary name in docs or templates | Rename applied to code but not docs | Grep all references (`bin/`, `src/`, `template/`, `README.md`, `AGENTS.md`) and update atomically | ⚠️ |

### Common Errors

| Symptom | Why It Happens | Prevention Heuristic |
|---------|----------------|----------------------|
| Gate keeps failing with small patch changes | Symptoms fixed, not root cause | Patch the first cause in dependency chain |
| Neighbor break after "safe" refactor | Consumer map incomplete | Run validate-n immediately after structural edits |
| Quality regressions in fast fixes | No targeted test sequence | Start with narrow tests, then expand |
| Old package name appears in published output | Rename skipped template/ or README | Always grep template/ when renaming package or binary |

### Heuristics

| Do More | Do Less |
|---------|--------|
| Compress context into explicit constraints | Carry large raw snippets forward |
| Validate boundaries early | Delay compatibility checks |
| Keep patches reversible | Mix refactor and feature changes together |
| Grep all surfaces (src, bin, template, docs) before publishing a rename | Assume code-only rename is complete |

### Pruning Records

Populated by [feedback.md §Branch Pruning Protocol](feedback.md) during the LEARN phase when a failed approach is pruned.

| Attempt | Strategy | Failure Reason | Constraint Added |
|---------|----------|----------------|------------------|
| — | — | — | — |

---

## Pattern Addition Policy

Add a new pattern when all are true:
1. The approach is reusable across multiple tasks
2. It reduces failure recurrence
3. It has clear constraints and examples

Write location:
- Short rule: table in this file
- Deep implementation: dedicated section/file under `patterns/`

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [reasoning-kernel.md](reasoning-kernel.md) | End-to-end protocol and mode selection |
| [feedback.md](feedback.md) | Failure-to-learning bridge |
| [glossary.md](glossary.md) | Canonical naming and ambiguity resolution |
