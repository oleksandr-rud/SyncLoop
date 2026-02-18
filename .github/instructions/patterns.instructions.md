---
name: "SyncLoop: Pattern Registry"
description: "Pattern routing and learned patterns"
applyTo: "**/*"
---

# SyncLoop Wiring: Pattern Registry

This instruction delegates pattern routing and LEARN writes to:

- `.agent-loop/patterns.md`

Use the registry and routing table in that file as authoritative.

## Pattern Specs

- `.agent-loop/patterns/code-patterns.md`
- `.agent-loop/patterns/refactoring-workflow.md`
- `.agent-loop/patterns/testing-guide.md`
- `.agent-loop/patterns/api-standards.md`
- `.agent-loop/patterns/mcp-patterns.md`

## Resolution Rule

If this file conflicts with `.agent-loop/patterns.md`, follow `.agent-loop/patterns.md`.
