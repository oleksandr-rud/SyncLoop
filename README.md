# SyncLoop

**Give your AI coding agent a structured reasoning loop.**

Without a protocol, AI agents guess — they hallucinate fixes, ignore architecture rules, fail silently, and lose context across a long session. SyncLoop solves this by wiring a strict 7-stage reasoning loop directly into your agent via MCP, so every task goes through sense → plan → act → validate → learn, every turn.

Works with **GitHub Copilot**, **Cursor**, and **Claude Code** — any client that supports [Model Context Protocol](https://modelcontextprotocol.io/).

---

## Why it matters

| Without SyncLoop | With SyncLoop |
|------------------|---------------|
| Agent jumps straight to coding | Agent senses state and gaps first |
| Fixes symptoms, not root causes | Diagnoses root cause before patching |
| Ignores architecture layers | Enforces layer rules on every change |
| Loses context in long sessions | Compresses and clears context each cycle |
| Repeats the same mistakes | Learns from failures, persists heuristics |
| No self-correction on test failures | Retries with targeted patches (max 5 iterations) |

---

## Quick Start

Add to your MCP client configuration:

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

That's it. Your agent now runs the full SyncLoop protocol on every turn.

### Where to add the config

| Client | Config location |
|--------|----------------|
| **VS Code (Copilot)** | `.vscode/mcp.json` or Settings → MCP Servers |
| **Cursor** | Settings → MCP Servers |
| **Claude Desktop** | `claude_desktop_config.json` |
| **Claude Code** | `claude_code_config.json` or `--mcp-config` flag |

---

## How the Agent Loop Works

Every agent turn runs the same 7-stage loop — no shortcuts:

```
SENSE → GKP → DECIDE+ACT → CHALLENGE-TEST → UPDATE → LEARN → REPORT
```

### Stage by stage

**1. SENSE**
Before touching any code, the agent reads the current codebase state and identifies:
- what needs to change
- what could break
- what context is still missing

It will not proceed until it has enough information to act safely.

**2. GKP — Generated Knowledge Pack**
The agent routes through a pattern registry to pull only the constraints, risks, and implementation
examples relevant to this specific task. Raw files are not carried forward — only a compressed,
task-scoped context bundle is produced.

**3. DECIDE + ACT**
The agent selects one of three operational modes and executes immediately:

| Mode | When | What the agent does |
|------|------|---------------------|
| **INTACT-STABILIZE** | System is healthy | Harden types, add tests, improve docs |
| **BROKEN-EXPAND** | Something is broken | Patch the root cause with minimal surface area |
| **OVERDENSE-SPLIT** | Code is too complex | Decompose before adding anything new |

Plan and action happen in the same step — no plans without execution.

**4. CHALLENGE-TEST**
Two validation gates run in a loop until everything passes or the retry budget runs out (max 5):

1. **ENV gate** — type safety, test coverage, layer integrity, complexity thresholds, debug hygiene
2. **NEIGHBOR gate** — shape compatibility across modules, boundary exports, cross-module contracts

Failures are classified before any fix is attempted:

| Class | Signal | What happens |
|-------|--------|--------------|
| **Micro** | Error text directly explains fix (missing return type, stray `print()`) | Fixed in-place, no budget consumed |
| **Macro** | Root cause needs diagnosis (test failure, layer violation) | Patch cycle runs, consumes 1 of 5 retries |

If the same failure recurs 3 times, the approach is pruned and the agent re-enters planning
with a hardcoded constraint against repeating it. If it was already pruned once, the agent escalates.

**5. UPDATE**
Once all gates pass, state transitions are committed: changed files, updated contracts, modified patterns.

**6. LEARN**
Lessons from the cycle are persisted so they carry into future turns:
- Quick fix → added as a row in the auto-fixes or common errors table
- New reusable approach → written into the matching pattern spec

**7. REPORT**
Non-trivial tasks produce a structured session summary: what changed, which gates passed, what was learned.
Skipped for trivial one-liners.

---

## Context Compaction

Long coding sessions degrade agent quality when too much raw context accumulates.
SyncLoop actively manages this with two strategies:

**State Collapse — after a successful cycle**
Everything is summarised into a compact checkpoint. Only that checkpoint enters the next SENSE stage.
Raw history is discarded.

**Branch Pruning — on repeated failure**
When the same error recurs 3 times, the failing approach is reverted and a constraint is recorded:
"do not retry approach X". The agent re-enters DECIDE with that lesson injected.

This keeps the agent sharp in long sessions instead of degrading.

---

## Pattern System

SyncLoop routes implementation decisions through a structured registry rather than letting the agent free-associate.

### Pattern families

| ID | What it covers |
|----|----------------|
| **P1–P11** | Port/adapter, domain modules, background tasks, transport routes, dependency injection, typed models, enum safety, error handling, type hints, service orchestration, config isolation |
| **R1** | 4-phase safe refactoring: plan → execute → validate → document |
| **R2** | Full test pyramid: unit, integration, API — fixtures, factories, mocks, naming conventions |
| **R3** | API boundary contracts: typed request/response models, error envelopes, versioning |

### How pattern routing works

Inside GKP, the agent:
1. Scans pattern triggers (`"Use when: moving a file"`, `"Use when: adding an endpoint"`)
2. Routes to the matching spec
3. Extracts constraints and examples for the active task only
4. Checks learned tables for known pitfalls and auto-fixes
5. Compresses to a minimal action context

This makes decisions consistent across the session and prevents architecture drift.

---

## Testing Approach

Tests are run in order: changed files first → adjacent modules → full suite.
The agent never modifies tests to make them pass. If a test fails, the source is fixed.

**Failure handling:**
- Missing return types, stray debug calls → fixed inline, no retry budget spent
- Real test failures or layer violations → root-cause diagnosis → targeted patch → retry gate

**Test pyramid targets:** ≥70% unit, ≤20% integration, ≤10% API.

---

## Guardrails

The agent is hardcoded never to:

- Modify tests to force them green
- Remove type annotations to silence type errors
- Bypass architecture layer boundaries
- Change public APIs or contracts without explicit user approval
- Mix refactoring with feature changes in the same patch
- Skip validation after refactors, import moves, or interface changes

If any of these are required to proceed, the agent stops and escalates.

---

## What the MCP server exposes

### Resources

All protocol docs are served on-demand — the agent pulls only what it needs per stage.

| Resource | Content |
|----------|---------|
| `reasoning-kernel` | Full 7-stage loop, transition map, stage details, context clearage |
| `feedback` | Failure diagnosis, patch contract, micro-loop, branch pruning, learning |
| `validate-env` | Stage 1 gates: types, tests, layers, complexity, debug hygiene |
| `validate-n` | Stage 2 gates: shape compatibility, boundaries, bridge contracts |
| `patterns` | Pattern routing index, GKP table, auto-fixes, heuristics, pruning records |
| `glossary` | Canonical domain terminology and naming rules |
| `code-patterns` | P1–P11 implementation patterns with examples |
| `testing-guide` | Full test strategy: pyramid, fixtures, factories, mocks, parametrize |
| `refactoring-workflow` | 4-phase refactoring checklist |
| `api-standards` | Boundary contracts: typed models, error envelopes, versioning |
| `protocol-summary` | Condensed ~50-line overview for system-prompt injection |
| `agents-md` | AGENTS.md entrypoint template |
| `overview` | File index and framework overview |

### Tools

| Tool | Description |
|------|-------------|
| `init` | Scaffold platform-specific protocol files into your project |

### Prompts

| Prompt | Description |
|--------|-------------|
| `bootstrap` | Wire SyncLoop to your actual project — scans codebase, populates real commands and architecture |
| `protocol` | Condensed protocol for direct system-prompt injection |

---

## Optional: scaffold files into your project

For offline use, CI, or customisation, the full protocol can be written into your repo:

```
Use the sync_loop init tool — choose: copilot, cursor, claude, or all
```

| Target | Files generated |
|--------|----------------|
| `copilot` | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` |
| `cursor` | `.cursor/rules/*.md` with frontmatter |
| `claude` | `CLAUDE.md` + `.claude/rules/*.md` |
| `all` | All of the above + `AGENTS.md` + `.agent-loop/` canonical source |

After scaffolding, use the `bootstrap` prompt so the agent scans your codebase and populates
the generated files with real validation commands, architecture layers, and module boundaries.

---

## License

MIT
