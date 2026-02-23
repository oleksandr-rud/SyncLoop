# SyncLoop

Main entrypoint for AI agents working on this codebase.
Routes into `.github/instructions/` for reasoning protocol, validation, feedback, and learning.

**DO NOT MOVE THIS FILE TO DOCS/**. Keep it in the project root.

---

## 1. Project Identity

MCP server + CLI for the SyncLoop agent reasoning protocol. Distributable via `npx -y -p @oleksandr.rudnychenko/sync_loop sync_loop`. Scaffolds platform-specific instruction files, subagents, and skills for Copilot, Cursor, and Claude Code.

| Stack | Languages | Frameworks |
|-------|-----------|------------|
| mcp-server | TypeScript + JavaScript (ESM runtime) | @modelcontextprotocol/sdk, zod |

**Architecture source of truth:** `src/server.ts` (MCP server), `src/init.ts` (scaffolding logic) — code is authoritative when docs conflict.

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
bin/cli.ts (CLI transport source)
    └──► src/init.ts (core logic)
              └──► src/template/ (static assets)

src/server.ts (MCP transport)
    └──► src/init.ts (core logic)
              └──► src/template/ (static assets)
```

| Layer | Directory | Rules |
|-------|-----------|-------|
| **CLI Transport** | `bin/` | Argument parsing and output formatting only. No scaffolding logic. Delegates to `src/init.ts`. |
| **MCP Transport** | `src/server.ts` | Registers resources, tools, prompts. No scaffolding logic. Delegates to `src/init.ts`. |
| **Core Logic** | `src/init.ts` | Stack detection, link rewriting, platform file generation. No transport concerns. |
| **Templates** | `src/template/` | Static read-only source files. No imports from `src/`. Includes `.agent-loop/` canonical docs, `wiring/` platform wrappers, and `AGENTS.md` / `backlog-index.md` scaffolding templates. |

### Cross-Layer Rules

- **Never** implement scaffolding logic directly in `bin/cli.ts` or `src/server.ts` — delegate to `src/init.ts`
- **Never** import from `src/` inside `src/template/` files (static content only)
- **Never** change the `init()` or `detectStacks()` public API without updating both callers (`bin/cli.ts` and `src/server.ts`)
- **Never** add Node.js-version-specific APIs without updating `engines.node` in `package.json`
- **Never** add an agent/skill template for one platform without adding the equivalent for all agent-capable platforms (copilot + claude)

---

## 5. Validation Commands

```bash
# Install deps + build artifacts
npm install

# Type check + tests
npm run typecheck
npm test

# Smoke test CLI
node bin/cli.js --help

# Dry-run scaffold (no writes)
node bin/cli.js init --dry-run
node bin/cli.js init --target copilot --dry-run

# Test MCP server starts without errors
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node bin/cli.js

# Publish (requires npm login)
npm publish --access public
```

---

## 6. Key Domain Terms

See [glossary.md](.github/instructions/glossary.instructions.md) for full definitions.

| Term | Model / Location | Description |
|------|------------------|-------------|
| `stack` | `src/init.ts → detectStacks()` | Detected project technology unit (Node.js or Python) with its tools (testRunner, typeChecker, linter) |
| `target` | `bin/cli.ts`, `src/server.ts` | Output platform: `copilot` \| `cursor` \| `claude` \| `codex` \| `all`, or array of platforms |
| `source file` | `src/init.ts → SOURCE_FILES` | Template document with a canonical ID; maps to platform-specific output paths |
| `platform config` | `src/init.ts → COPILOT / CURSOR / CLAUDE` | Mapping of source IDs to target paths + frontmatter per platform |
| `dry-run` | `bin/cli.ts`, `src/init.ts` | Preview mode — reports what would be written without modifying files |
| `overwrite` | `src/init.ts → writeOutput()` | Whether to replace existing generated files (default: `true`) |

---

## 7. Core SyncLoop Components

| Component | File | Role |
|-----------|------|------|
| Protocol kernel | [.agent-loop/reasoning-kernel.md](.github/instructions/reasoning-kernel.instructions.md) | Master loop and execution schema |
| Pattern registry | [.agent-loop/patterns.md](.github/instructions/patterns.instructions.md) | Pattern routing + learned fixes |
| Pattern specs | [.agent-loop/patterns/](.github/instructions/) | Detailed implementation playbooks |
| MCP pattern spec | [.agent-loop/patterns/mcp-patterns.md](.github/instructions/mcp-patterns.instructions.md) | M1–M5 bootstrap/resources/tools/prompts/lifecycle patterns |
| Domain vocabulary | [.agent-loop/glossary.md](.github/instructions/glossary.instructions.md) | Canonical terms and naming |
| ENV validation | [.agent-loop/validate-env.md](.github/instructions/validate-env.instructions.md) | NFR gates |
| NEIGHBOR validation | [.agent-loop/validate-n.md](.github/instructions/validate-n.instructions.md) | Shape/boundary/bridge checks |
| Feedback loop | [.agent-loop/feedback.md](.github/instructions/feedback.instructions.md) | Failure diagnosis + patching |

---

## 8. Non-Negotiable Rules

- ❌ Never modify tests only to force a pass result
- ❌ Never suppress typing or validation just to remove errors
- ❌ Never change public contracts without explicit approval
- ❌ Never bypass architecture boundaries for convenience
- ❌ Never rename the package/binary in one place — grep for all references across `package.json`, `bin/`, `src/`, `src/template/`, `README.md`, and `AGENTS.md`
- ❌ Never skip `--dry-run` smoke test after scaffolding changes

If uncertain, choose isolated and reversible changes.

---

## 9. Reporting, Backlog & Artifacts

The REPORT stage (stage 7) produces exactly one of three outcomes per task:

```
Work implemented this session?
├─ YES + multi-file or architecture change → REPORT
├─ YES + single-file cosmetic/docs-only    → SKIP
├─ NO  + investigation/plan produced       → BACKLOG TASK
└─ NO  + trivial lookup/question           → SKIP
```

**Key rule:** Reports record **completed work**. Backlog tasks record **planned but unexecuted work**. Never create both for the same task.

### Reports (completed work)

- Path: `docs/reports/YYYY-MM-DD-{slug}.md`
- Artifacts: `docs/reports/artifacts/`
- Trigger: implementation was done this session AND touched ≥2 files or changed architecture/patterns

### Backlog (planned but deferred work)

- Index: `docs/backlog/index.md` — priority-sorted table with task state
- Tasks: `docs/backlog/YYYY-MM-DD-{slug}.md` — one file per task
- Trigger: investigation or planning was done BUT implementation was NOT executed
- After creating a task file, add a row to `docs/backlog/index.md`
- When a backlog task is later implemented, mark it `done` in the index and write a report

### Learning memory

- `.github/instructions/patterns.instructions.md` and `.github/instructions/`
- Updated during LEARN (stage 6), independent of report/backlog routing

