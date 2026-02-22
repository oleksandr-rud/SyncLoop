# SyncLoop

**Stop your AI agent from guessing. Give it a reasoning loop.**

AI coding agents hallucinate fixes, ignore your architecture, lose context in long sessions, and repeat the same mistakes. SyncLoop wires a 7-stage self-correcting loop into your agent via MCP — sense → plan → act → validate → learn — every turn, automatically.

Works with **GitHub Copilot**, **Cursor**, and **Claude Code**.

---

## What changes for you

| Problem | How SyncLoop fixes it |
|---------|----------------------|
| Agent breaks your architecture | Layer rules enforced on every change |
| Same bug reappears after agent "fixes" it | Agent retries with targeted patches, max 5 attempts, then escalates |
| Agent loses track in long sessions | Context compressed after each cycle — stale data discarded |
| Agent repeats failed approaches | Failed approaches pruned and recorded as hard constraints |
| Tests modified to pass | Agent is hardcoded to fix source code, never tests |
| No record of what the agent did or why | Structured reports and backlog tasks generated automatically |

---

## Quick Start

### 1. Add to your MCP config

```json
{
  "mcpServers": {
    "sync_loop": {
      "command": "npx",
      "args": ["-y", "-p", "@oleksandr.rudnychenko/sync_loop", "sync_loop"]
    }
  }
}
```

> **Windows (VS Code):** use `"command": "npx.cmd"` — VS Code spawns without a shell on Windows.

| Client | Where to add it |
|--------|-----------------|
| **VS Code (Copilot)** | `.vscode/mcp.json` or Settings → MCP Servers |
| **Cursor** | Settings → MCP Servers |
| **Claude Desktop** | `claude_desktop_config.json` |
| **Claude Code** | `claude_code_config.json` or `--mcp-config` flag |

Done. Your agent now has access to the full protocol, pattern registry, and validation gates.

### 2. Bootstrap to your project (optional)

Run the `bootstrap` prompt so the agent scans your codebase and populates protocol files with your real commands, architecture layers, and stack info.

### 3. Scaffold files for offline use (optional)

Use the `init` tool to write protocol files directly into your repo:

```
Use the sync_loop init tool — choose: copilot, cursor, claude, or all
```

This generates agent definitions, instruction files, and a canonical `.agent-loop/` folder with the full protocol. Useful for CI, offline work, or customization.

---

## Use Cases

### "Fix this bug without breaking anything else"

The agent reads the codebase first (SENSE), pulls only the relevant constraints (GKP), patches the root cause (DECIDE+ACT), then runs type checks + test gates + neighbor checks in a loop until everything passes (CHALLENGE-TEST). If the same fix fails 3 times, it's pruned and the agent tries a different approach.

### "Refactor this module safely"

Pattern R1 kicks in: the agent plans the moves, executes them, validates all imports and cross-module contracts, and documents what changed. It won't mix refactoring with feature changes in the same patch.

### "Add an API endpoint"

Patterns R3 (API contracts) and P5 (transport routes) route the agent to use typed request/response models, proper error envelopes, and enforce that no business logic leaks into the route handler.

### "This session is getting long and the agent is getting confused"

SyncLoop compresses context after each successful cycle (State Collapse) and discards raw history. Only a compact checkpoint enters the next turn. The agent stays sharp instead of degrading.

### "I want to plan work but not implement it yet"

The REPORT stage routes investigations to `docs/backlog/` as structured task files with priority, Action Plan, and acceptance criteria — separate from completed-work reports in `docs/reports/`.

---

## The 7-Stage Loop

Every turn follows this sequence — no shortcuts, no skipped stages:

```
SENSE → GKP → DECIDE+ACT → CHALLENGE-TEST → UPDATE → LEARN → REPORT
```

| Stage | What the agent does |
|-------|---------------------|
| **SENSE** | Reads codebase state, identifies gaps, won't proceed until context is sufficient |
| **GKP** | Routes through pattern registry, pulls only relevant constraints, compresses context |
| **DECIDE+ACT** | Selects mode (stabilize / fix / decompose), produces plan, executes immediately |
| **CHALLENGE-TEST** | Runs ENV gates (types, tests, layers) + NEIGHBOR gates (shapes, boundaries) in a loop |
| **UPDATE** | Commits state transitions — files changed, contracts updated |
| **LEARN** | Persists lessons to pattern tables for future turns |
| **REPORT** | Writes a report (completed work) or backlog task (deferred work) or skips (trivial) |

**Self-correction:** Test failures and layer violations trigger a patch → retry loop (max 5). Trivial issues (missing type, stray debug call) are fixed in-place without consuming retries. Same failure 3× → approach pruned, lesson injected, agent re-plans.

---

## What Gets Scaffolded

| Target | Files generated |
|--------|----------------|
| `copilot` | `.agent-loop/` + `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` + `.github/agents/SyncLoop*.agent.md` + `.github/skills/diagnose-failure/SKILL.md` |
| `cursor` | `.agent-loop/` + `.cursor/rules/*.md` |
| `claude` | `.agent-loop/` + `CLAUDE.md` + `.claude/rules/*.md` + `.claude/agents/SyncLoop*.md` + `.claude/skills/diagnose-failure/SKILL.md` |
| `all` | All of the above + `AGENTS.md` + `docs/backlog/index.md` |

**Agents scaffolded** (Copilot + Claude):
- **SyncLoop** — Full 7-stage protocol agent
- **SyncLoop-Architect** — Read-only planning agent (SENSE → GKP → DECIDE+ACT only)
- **SyncLoop-Fixer** — Implementation agent (CHALLENGE-TEST → UPDATE → LEARN)

**Skills scaffolded:**
- **diagnose-failure** — Failure diagnosis using the FEEDBACK loop

---

## MCP Server Reference

### Resources (on-demand protocol docs)

| Resource | Content |
|----------|---------|
| `reasoning-kernel` | Full 7-stage loop, transition map, context clearage |
| `feedback` | Failure diagnosis, patch protocol, branch pruning |
| `validate-env` | Stage 1: types, tests, layers, complexity, debug hygiene |
| `validate-n` | Stage 2: shapes, boundaries, bridge contracts |
| `patterns` | Pattern routing index, auto-fixes, heuristics |
| `code-patterns` | P1–P11 implementation patterns |
| `testing-guide` | Test pyramid, fixtures, factories, mocks |
| `refactoring-workflow` | 4-phase safe refactoring checklist |
| `api-standards` | Boundary contracts, typed models, error envelopes |
| `glossary` | Domain terminology and naming rules |
| `protocol-summary` | Condensed ~50-line overview |
| `agents-md` | AGENTS.md entrypoint template |
| `overview` | File index and framework overview |

### Tools

| Tool | Description |
|------|-------------|
| `init` | Scaffold platform-specific protocol files into your project |

### Prompts

| Prompt | Description |
|--------|-------------|
| `bootstrap` | Scan your codebase and wire SyncLoop to your real architecture |
| `protocol` | Condensed protocol for direct system-prompt injection |

---

## Development

```bash
npm install
npm run typecheck
npm test
```

## License

MIT
