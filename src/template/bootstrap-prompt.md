Initialize and wire the SyncLoop reasoning protocol to the current repository.

If SyncLoop target platform is not explicitly provided yet, ask the user first:
"Which SyncLoop target platform should I scaffold: `copilot`, `cursor`, `claude`, or `all`?"

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
