# SyncLoop Scaffolding: Wrapper Wiring + Canonical Source Always Generated

## Summary

Updated scaffolding so generated platform instruction files are lightweight wrappers that delegate to `.agent-loop/*` canonical documents, and made `.agent-loop/` generation unconditional for every `init --target` option (`copilot`, `cursor`, `claude`, `all`).

## Root Cause

`src/init.js` previously generated full duplicated protocol specs into platform-specific destinations and only copied `.agent-loop/` when target was `all`, which prevented consistent canonical wiring for single-target scaffolds.

## Changes

1. Added wrapper templates in `src/template/wiring/`:
   - `reasoning-kernel.md`
   - `feedback.md`
   - `validate-env.md`
   - `validate-n.md`
   - `patterns.md`
   - `glossary.md`
   - `code-patterns.md`
   - `testing-guide.md`
   - `refactoring-workflow.md`
   - `api-standards.md`
2. Updated `src/init.js`:
   - Added `WRAPPER_FILES` map and switched platform file generation to wrapper templates.
   - Removed platform link-rewrite pipeline in `init` path.
   - Stopped rewriting `AGENTS.md` links away from `.agent-loop`.
   - Ensured `.agent-loop/` is copied and stack placeholders are applied for every target.
   - Kept public API unchanged (`init()`, `detectStacks()`).
3. Updated user-facing docs/help:
   - `bin/cli.js` help text now states `.agent-loop/` is scaffolded for each target.
   - `README.md` target output table updated accordingly and notes wrapper delegation to `.agent-loop/*`.

## Validation Plan

Run:

```bash
node bin/cli.js --help
node bin/cli.js init --dry-run
node bin/cli.js init --target copilot --dry-run
node bin/cli.js init --target cursor --dry-run
node bin/cli.js init --target claude --dry-run
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node bin/cli.js
```

And inspect temp scaffold output to confirm platform files reference `.agent-loop/*`.
