---
name: "SyncLoop: Glossary"
description: "Canonical terminology"
applyTo: "**/*"
---

# Domain Glossary

Canonical terminology for the project codebase. All code, comments, docs, and agent reasoning must use these terms.
Referenced from [patterns.md](patterns.instructions.md). Cross-references use `[→ ID]` pattern IDs from the registry.

**Use when:**
- Naming a new variable, field, class, or parameter
- Writing comments, docstrings, or documentation
- Interpreting domain concepts in user requests or specs
- Resolving ambiguity between similar terms
- Checking deprecated aliases before using a term in new code

---

## Architecture Terms

{Fill in during bootstrap with project-specific layer terms.}

| Term | Canonical Symbol | Definition |
|------|------------------|------------|
| **service** | `*Service` [→ P2, P10] | Business orchestration unit — contains domain logic and data access. No transport concerns. |
| **route** | `*_router` / `*_controller` [→ P5] | Transport boundary — handles requests, delegates to services. No business logic. |
| **adapter** | `*Adapter` [→ P1] | Concrete implementation of an infrastructure port/interface. |
| **config** | `Settings` / `Config` [→ P11] | Centralized configuration — single env source with startup validation. |

{Add project-specific architecture terms here.}

---

## Domain Objects

{Fill in during bootstrap with actual domain models.}

| Term | Canonical Symbol | Model / Location | Description |
|------|------------------|------------------|-------------|
| {entity} | `{ClassName}` | `{models/file.py}` | {what it represents} |

---

## Agent Loop Lifecycle Terms

| Term | Meaning |
|------|---------|
| **SENSE** | State detection and requirement extraction |
| **GKP** | Generated Knowledge Pack — context retrieval + compression |
| **DECIDE+ACT** | Mode selection and immediate implementation |
| **CHALLENGE-TEST** | Validation loop with retry-driven patching |
| **UPDATE** | State transition persistence |
| **LEARN** | Persisting reusable corrections and heuristics |
| **REPORT** | Writing non-trivial session outcomes |

---

## Naming Rules

1. **One concept → one canonical term** — never use synonyms in code
2. **Prefer explicit nouns** over abbreviations (`service` not `svc`)
3. **Keep boundary model names stable** once published to consumers
4. **Record deprecated aliases** before removal (see table below)
5. **Suffix conventions** (adapt to project):
   - `*Service` for business logic
   - `*Router` / `*Controller` for transport handlers
   - `*Adapter` for infrastructure implementations
   - `*Port` / `*Interface` for infrastructure abstractions

---

## Deprecated Alias Table

| Deprecated | Canonical | Notes |
|------------|-----------|-------|
| `svc` | `service` | Abbreviated form |
| `handler` | `service` | Avoid ambiguity with route handlers |

{Add project-specific deprecated aliases here.}

---

## Data Flow Diagram

{Fill in during bootstrap with actual project data flow.}

```
┌──────────────────────────────┐
│        USER INPUT            │
├──────────────────────────────┤
│  Request → Transport Layer   │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│       SERVICE LAYER          │
├──────────────────────────────┤
│  Business Logic → Data Access│
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│         OUTPUT               │
├──────────────────────────────┤
│  Response → Side Effects     │
└──────────────────────────────┘
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [reasoning-kernel.md](reasoning-kernel.instructions.md) | Where lifecycle terms are executed |
| [patterns.md](patterns.instructions.md) | Where pattern IDs are defined and routed |
| [../AGENTS.md](../AGENTS.md) | Main entrypoint with full architecture reference |
