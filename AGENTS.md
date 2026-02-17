# SyncLoop

Main entrypoint for AI agents working on this codebase.
Routes into `.github/instructions/` for reasoning protocol, validation, feedback, and learning.

**DO NOT MOVE THIS FILE TO DOCS/**. Keep it in the project root.

---

## 1. Project Identity

MCP server + CLI for the SyncLoop agent reasoning protocol. Distributable via `npx sync_loop`. Scaffolds platform-specific instruction files for Copilot, Cursor, and Claude Code.

| Stack | Languages | Frameworks |
|-------|-----------|------------|
| mcp-server | JavaScript (ESM) | @modelcontextprotocol/sdk, zod |

**Architecture source of truth:** `src/server.js` (MCP server), `src/init.js` (scaffolding logic) — code is authoritative when docs conflict.

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
bin/cli.js (CLI transport)
    └──► src/init.js (core logic)
              └──► template/ (static assets)

src/server.js (MCP transport)
    └──► src/init.js (core logic)
              └──► template/ (static assets)
```

| Layer | Directory | Rules |
|-------|-----------|-------|
| **CLI Transport** | `bin/` | Argument parsing and output formatting only. No scaffolding logic. Delegates to `src/init.js`. |
| **MCP Transport** | `src/server.js` | Registers resources, tools, prompts. No scaffolding logic. Delegates to `src/init.js`. |
| **Core Logic** | `src/init.js` | Stack detection, link rewriting, platform file generation. No transport concerns. |
| **Templates** | `template/` | Static read-only source files. No imports from `src/`. |

### Cross-Layer Rules

- **Never** implement scaffolding logic directly in `bin/cli.js` or `src/server.js` — delegate to `src/init.js`
- **Never** import from `src/` inside `template/` files (static content only)
- **Never** change the `init()` or `detectStacks()` public API without updating both callers (`bin/cli.js` and `src/server.js`)
- **Never** add Node.js-version-specific APIs without updating `engines.node` in `package.json`

---

## 5. Validation Commands

```bash
# Smoke test CLI
node bin/cli.js --help

# Dry-run scaffold (no writes)
node bin/cli.js init --dry-run
node bin/cli.js init --target copilot --dry-run

# Test MCP server starts without errors
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' | node bin/cli.js

# Install deps
npm install

# Publish (requires npm login)
npm publish --access public
```

---

## 6. Key Domain Terms

See [glossary.md](.github/instructions/glossary.instructions.md) for full definitions.

| Term | Model / Location | Description |
|------|------------------|-------------|
| `stack` | `src/init.js → detectStacks()` | Detected project technology unit (Node.js or Python) with its tools (testRunner, typeChecker, linter) |
| `target` | `bin/cli.js`, `src/server.js` | Output platform: `copilot` \| `cursor` \| `claude` \| `all` |
| `source file` | `src/init.js → SOURCE_FILES` | Template document with a canonical ID; maps to platform-specific output paths |
| `platform config` | `src/init.js → COPILOT / CURSOR / CLAUDE` | Mapping of source IDs to target paths + frontmatter per platform |
| `dry-run` | `bin/cli.js`, `src/init.js` | Preview mode — reports what would be written without modifying files |
| `overwrite` | `src/init.js → writeOutput()` | Whether to replace existing generated files (default: `true`) |

---

## 7. Core SyncLoop Components

| Component | File | Role |
|-----------|------|------|
| Protocol kernel | [.agent-loop/reasoning-kernel.md](.github/instructions/reasoning-kernel.instructions.md) | Master loop and execution schema |
| Pattern registry | [.agent-loop/patterns.md](.github/instructions/patterns.instructions.md) | Pattern routing + learned fixes |
| Pattern specs | [.agent-loop/patterns/](.github/instructions/) | Detailed implementation playbooks |
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
- ❌ Never rename the package/binary in one place — grep for all references across `package.json`, `bin/`, `src/`, `template/`, `README.md`, and `AGENTS.md`
- ❌ Never skip `--dry-run` smoke test after scaffolding changes

If uncertain, choose isolated and reversible changes.

---

## 9. Reporting & Artifacts

- Reports: `docs/reports/YYYY-MM-DD-{slug}.md`
- Artifacts: `docs/reports/artifacts/`
- Learning memory: `.github/instructions/patterns.instructions.md` and `.github/instructions/`

Create reports for non-trivial work (multi-file refactor, root-cause fix, architecture change).

