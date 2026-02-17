---
name: "SyncLoop: Reasoning Kernel"
description: "7-stage agent reasoning loop with context clearage"
applyTo: "**/*"
---

# SyncLoop Wiring: Reasoning Kernel

This instruction file is wired to the project source-of-truth kernel at:

- `.agent-loop/reasoning-kernel.md`

Use the full 7-stage protocol from that file as authoritative for every turn.

## Resolution Rule

When this file and `.agent-loop/reasoning-kernel.md` differ, follow `.agent-loop/reasoning-kernel.md`.

## Required Companion Specs

- `.agent-loop/patterns.md`
- `.agent-loop/feedback.md`
- `.agent-loop/validate-env.md`
- `.agent-loop/validate-n.md`
