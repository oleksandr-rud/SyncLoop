---
name: "SyncLoop: Feedback Loop"
description: "Failure diagnosis, patch protocol, branch pruning"
applyTo: "**/*"
---

# SyncLoop Wiring: Feedback

This instruction delegates to:

- `.agent-loop/feedback.md`

Use that file as the authoritative protocol for gate failures, micro/macro fixes, patch contracts, pruning, and escalation.

## Resolution Rule

If this file conflicts with `.agent-loop/feedback.md`, follow `.agent-loop/feedback.md`.

## Related Sources

- `.agent-loop/reasoning-kernel.md`
- `.agent-loop/validate-env.md`
- `.agent-loop/validate-n.md`
- `.agent-loop/patterns.md`
