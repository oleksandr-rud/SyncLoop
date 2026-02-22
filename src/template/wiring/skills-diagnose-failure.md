---
name: "diagnose-failure"
description: "Run the SyncLoop FEEDBACK loop to diagnose a test failure, type error, or layer violation. Use this when CHALLENGE-TEST fails."
---

# Diagnose Failure (SyncLoop FEEDBACK)

You are executing the **FEEDBACK** stage of the SyncLoop protocol.

## Instructions

1. Read `.agent-loop/feedback.md` to understand the patch protocol and branch pruning rules.
2. Analyze the failure (test output, type error, or layer violation).
3. Classify the failure as **Micro** or **Macro**.
4. Produce a patch.
5. If this is the 3rd time the same error has occurred, trigger **Branch Prune** and revert the approach.

## Output Schema

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIAGNOSIS
[Error analysis and classification: Micro vs Macro]

PATCH PLAN
[What needs to be changed to fix the error]

EXECUTION
[Apply the patch]

NEXT STEPS
[Instructions to re-run CHALLENGE-TEST]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```