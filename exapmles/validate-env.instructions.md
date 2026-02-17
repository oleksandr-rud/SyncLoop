---
name: "SyncLoop: Validate Environment"
description: "NFR gates: types, tests, layers, complexity"
applyTo: "**/*"
---

# SyncLoop Wiring: Validate Environment

This instruction delegates Stage 1 validation to:

- `.agent-loop/validate-env.md`

Run gates and retries exactly as defined there.

## Resolution Rule

If this file conflicts with `.agent-loop/validate-env.md`, follow `.agent-loop/validate-env.md`.

## Related Sources

- `.agent-loop/reasoning-kernel.md`
- `.agent-loop/feedback.md`
- `.agent-loop/validate-n.md`
