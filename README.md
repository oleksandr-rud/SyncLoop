# SyncLoop

MCP server that gives AI coding agents a self-correcting reasoning protocol.

Works with **GitHub Copilot**, **Cursor**, and **Claude Code** — any client that supports [Model Context Protocol](https://modelcontextprotocol.io/).

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

That's it. Your AI agent now has access to the full SyncLoop reasoning protocol.

### Where to add MCP config

| Client | Config location |
|--------|----------------|
| **VS Code (Copilot)** | `.vscode/mcp.json` or Settings → MCP Servers |
| **Cursor** | Settings → MCP Servers |
| **Claude Desktop** | `claude_desktop_config.json` |
| **Claude Code** | `claude_code_config.json` or `--mcp-config` flag |

## What it provides

### Resources (protocol docs, served on-demand)

| Resource | Content |
|----------|---------|
| `reasoning-kernel` | Core 7-stage loop, transition map, context clearage |
| `feedback` | Failure diagnosis, patch protocol, branch pruning |
| `validate-env` | Stage 1 NFR gates (types, tests, layers, complexity) |
| `validate-n` | Stage 2 neighbor checks (shapes, boundaries, bridges) |
| `patterns` | Pattern routing index and learned patterns |
| `glossary` | Canonical terminology and naming rules |
| `code-patterns` | P1–P11 implementation patterns |
| `testing-guide` | Test pyramid, fixtures, mocks, strategies |
| `refactoring-workflow` | 4-phase safe refactoring checklist |
| `api-standards` | Boundary contracts and versioning |
| `protocol-summary` | Condensed protocol overview (~50 lines) |
| `agents-md` | AGENTS.md entrypoint template |
| `overview` | File index and framework overview |

### Tools

| Tool | Description |
|------|-------------|
| `init` | Scaffold platform-specific files into your project (`.github/instructions/`, `.cursor/rules/`, `.claude/rules/`) |

### Prompts

| Prompt | Description |
|--------|-------------|
| `bootstrap` | Wire SyncLoop to your project — scans codebase and fills in project-specific details |
| `protocol` | Condensed reasoning protocol for system-level injection |

## Protocol Overview

Every agent turn follows a 7-stage loop:

```
SENSE → GKP → DECIDE+ACT → CHALLENGE-TEST → UPDATE → LEARN → REPORT
```

| Stage | Purpose |
|-------|---------|
| **SENSE** | Detect state, issues, context gaps |
| **GKP** | Gather knowledge, compress into constraints + risks |
| **DECIDE+ACT** | Select mode, plan, execute immediately |
| **CHALLENGE-TEST** | 2-stage validation (ENV gates + NEIGHBOR checks) |
| **UPDATE** | Commit state transitions |
| **LEARN** | Persist fixes and patterns |
| **REPORT** | Session summary (skip if trivial) |

Three operational modes:

| Mode | Trigger |
|------|---------|
| **INTACT-STABILIZE** | All gates pass → harden quality |
| **BROKEN-EXPAND** | Issues detected → fix root cause |
| **OVERDENSE-SPLIT** | Complexity high → decompose first |

## Scaffolding (optional)

If you also want the protocol files in your project (for offline use or customization), use the `init` tool:

```
Use the sync_loop init tool to scaffold files for copilot/cursor/claude/all
```

When an AI agent performs this step, it should ask first:
"Which SyncLoop target platform should I scaffold: `copilot`, `cursor`, `claude`, or `all`?"

This creates:

| Target | Files generated |
|--------|----------------|
| `copilot` | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` |
| `cursor` | `.cursor/rules/*.md` with proper frontmatter |
| `claude` | `CLAUDE.md` + `.claude/rules/*.md` with `paths` frontmatter |
| `all` | All of the above |

Plus `AGENTS.md` (cross-platform entrypoint) and `.agent-loop/` (canonical source).

## Bootstrap

After scaffolding, use the `bootstrap` prompt to wire SyncLoop to your actual project:

1. Ask the agent to use the **bootstrap** prompt
2. The agent scans your codebase structure and fills in project-specific details
3. `AGENTS.md`, validation commands, patterns, and glossary get wired to real code

## License

MIT
