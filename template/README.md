# SyncLoop Setup Guide

This directory is a reusable template for bootstrapping SyncLoop into an existing codebase.

---

## Primary: MCP (recommended)

Add the SyncLoop MCP server to your AI coding client. The agent gets the full protocol on-demand — no file scaffolding needed.

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

### Where to add MCP config

| Client | Config location |
|--------|----------------|
| **VS Code (Copilot)** | `.vscode/mcp.json` or Settings → MCP Servers |
| **Cursor** | Settings → MCP Servers |
| **Claude Desktop** | `claude_desktop_config.json` |
| **Claude Code** | `claude_code_config.json` or `--mcp-config` flag |

Once connected, the agent has access to all protocol resources, the `init` tool for scaffolding, and the `bootstrap` prompt for project wiring.

---

## Alternative: Scaffold Files

If you want the protocol files in your project (for offline use, customization, or CI), use the `init` tool via MCP or manually copy from this template.

### Via MCP (ask the agent)

Ask: "Use the sync_loop init tool to scaffold files for [copilot/cursor/claude/all] into this project"

Before calling `init`, the agent should ask:
"Which SyncLoop target platform should I scaffold: `copilot`, `cursor`, `claude`, or `all`?"

### Manual Copy

1. Copy `.agent-loop/` into your project root
2. Copy `AGENTS.md` into your project root
3. Run the bootstrap prompt below to wire to your project

---

## What This Setup Produces

After bootstrap, the project should have:
1. A root `AGENTS.md` aligned to the actual repository architecture
2. A `.agent-loop/` pack with project-aware validation commands and routing
3. A patterns index tied to real modules/services/contracts
4. A glossary with canonical domain terms used in the repo

The protocol itself remains generic:
- SENSE ↔ GKP → DECIDE+ACT → CHALLENGE-TEST → UPDATE → LEARN → REPORT

---

## Bootstrap Prompt (Copy/Paste)

Use this prompt with your coding agent in the target repository:

```md
Initialize and wire this SyncLoop framework to the current repository.

Requirements:
1) Scan the full codebase to understand:
   - folder/module structure
   - runtime stack and libraries/frameworks in use
   - test/build/typecheck/lint commands
   - architecture boundaries and dependency flow

2) Update root AGENTS.md and .agent-loop docs so they reference the actual project:
   - keep protocol abstractions and stage flow intact
   - replace placeholders with project-specific references where needed
   - include real validation commands for this repo
   - include real module/layer boundaries and guardrails

3) Build/refresh these artifacts:
   - .agent-loop/patterns.md routing index
   - .agent-loop/glossary.md canonical terms
   - .agent-loop/validate-env.md with actual gate commands
   - .agent-loop/validate-n.md with real neighbor/contract checks
   - .agent-loop/feedback.md escalation and learn-routing

4) Preserve safety constraints:
   - do not weaken validation gates
   - do not change public APIs unless explicitly requested
   - do not edit tests only to force passing status

5) Output:
   - summary of files changed
   - detected stack/tools/commands
   - unresolved ambiguities requiring user input

Work end-to-end and apply edits directly.
```

---

## Recommended Execution Sequence

1. **Inventory**
   - Parse manifests/lockfiles and CI configs
   - Identify source roots, module boundaries, and docs locations

2. **Command Discovery**
   - Detect canonical commands for typecheck/tests/lint/build
   - Prefer existing scripts over inferred commands

3. **Architecture Mapping**
   - Map route/service/repository/lib equivalents for this codebase
   - Identify forbidden dependency directions

4. **Doc Wiring**
   - Update `AGENTS.md` first (entrypoint)
   - Align `.agent-loop/*` files with discovered project facts
   - Keep generic reasoning protocol unchanged

5. **Validation Pass**
   - Run the detected validation commands
   - Fix only issues introduced by wiring changes

6. **Handoff**
   - Provide concise report and any follow-up actions

---

## Acceptance Checklist

- [ ] `AGENTS.md` points to the right local docs and architecture
- [ ] `.agent-loop/validate-env.md` uses repo-true commands
- [ ] `.agent-loop/patterns.md` routes to real project patterns
- [ ] `.agent-loop/glossary.md` reflects actual domain vocabulary
- [ ] No direct references to unrelated projects
- [ ] Protocol and guardrails remain intact
