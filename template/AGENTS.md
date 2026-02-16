# SyncLoop — {Project Name}

Main entrypoint for AI agents working on this codebase.
Routes into `.agent-loop/` for reasoning protocol, validation, feedback, and learning.

**DO NOT MOVE THIS FILE TO DOCS/**. Keep it in the project root.

---

## 1. Project Identity

{Brief project description — what it does, who it serves.}

| Layer | Stack |
|-------|-------|
| Backend | {language, framework, runtime, database} |
| Frontend | {framework, build tool, language, UI library} |
| Infra | {hosting, CI/CD, object storage, caching} |

**Architecture source of truth:** {path to architecture doc} — but code is authoritative when docs conflict.

---

## 2. SyncLoop Protocol

Every turn follows a **7-stage protocol**:

```
1) SENSE ↔ 2) GKP
        ↓
3) DECIDE+ACT
        ↓
4) CHALLENGE-TEST
   ├─ Stage 1: ENV   (validate-env.md)
   └─ Stage 2: NEIGHBOR (validate-n.md)
        ↓
5) UPDATE
        ↓
6) LEARN
        ↓
7) REPORT
```

**Inner loops:**
1. **SENSE ↔ GKP**: gather and compress context until sufficient
2. **CHALLENGE-TEST → FEEDBACK → patch → retry**: iterate until gates pass (max 5)

---

## 3. Operational Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **INTACT-STABILIZE** | System is healthy | Harden quality, docs, and test confidence |
| **BROKEN-EXPAND** | Defect or regression is present | Fix root cause with minimal safe surface area |
| **OVERDENSE-SPLIT** | Complexity exceeds maintainability threshold | Decompose into smaller units before feature expansion |

Mode is selected in DECIDE+ACT and can change after each validation cycle.

---

## 4. Architecture Guardrails

### Layer Architecture

```
Routes → Services → Repositories → Libs
```

{Replace with actual project layers. Map directories to layer roles.}

| Layer | Directory | Rules |
|-------|-----------|-------|
| **Routes** | `{path}` | Transport/boundary only. No business logic. |
| **Services** | `{path}` | Business orchestration. Domain logic lives here. |
| **Repositories** | `{path}` | Data access contracts. |
| **Libs** | `{path}` | Infrastructure utilities. No imports from app modules. |

### Cross-Layer Rules

- **Never** import across incompatible layers (e.g., infra importing domain)
- **Never** bypass the service layer from transport/route handlers
- **Never** change public APIs without explicit approval
- **Never** introduce sync calls in an async codebase (or vice versa)

{Add project-specific cross-layer rules here.}

---

## 5. Validation Commands

{Fill in with actual project commands after bootstrap.}

```bash
# Type check
{typecheck command}

# Lint & format
{lint command}

# Tests (all)
{test command}

# Tests (targeted)
{targeted test command}

# Install deps
{install command}
```

---

## 6. Key Domain Terms

{Fill in during bootstrap — see [glossary.md](.agent-loop/glossary.md) for canonical definitions.}

| Term | Model / Location | Description |
|------|------------------|-------------|
| {Term} | {file path} | {what it represents} |

---

## 7. Core SyncLoop Components

| Component | File | Role |
|-----------|------|------|
| Protocol kernel | [.agent-loop/reasoning-kernel.md](.agent-loop/reasoning-kernel.md) | Master loop and execution schema |
| Pattern registry | [.agent-loop/patterns.md](.agent-loop/patterns.md) | Pattern routing + learned fixes |
| Pattern specs | [.agent-loop/patterns/](.agent-loop/patterns/) | Detailed implementation playbooks |
| Domain vocabulary | [.agent-loop/glossary.md](.agent-loop/glossary.md) | Canonical terms and naming |
| ENV validation | [.agent-loop/validate-env.md](.agent-loop/validate-env.md) | NFR gates |
| NEIGHBOR validation | [.agent-loop/validate-n.md](.agent-loop/validate-n.md) | Shape/boundary/bridge checks |
| Feedback loop | [.agent-loop/feedback.md](.agent-loop/feedback.md) | Failure diagnosis + patching |

---

## 8. Non-Negotiable Rules

- ❌ Never modify tests only to force a pass result
- ❌ Never suppress typing or validation just to remove errors
- ❌ Never change public contracts without explicit approval
- ❌ Never bypass architecture boundaries for convenience

{Add project-specific rules here (e.g., multi-tenant isolation, audit requirements).}

If uncertain, choose isolated and reversible changes.

---

## 9. Reporting & Artifacts

- Reports: `docs/reports/YYYY-MM-DD-{slug}.md`
- Artifacts: `docs/reports/artifacts/`
- Learning memory: `.agent-loop/patterns.md` and `.agent-loop/patterns/*.md`

Create reports for non-trivial work (multi-file refactor, root-cause fix, architecture change).

