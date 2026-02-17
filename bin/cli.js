#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(`
sync_loop — MCP server + CLI for the SyncLoop agent reasoning protocol

Usage:
  npx -y -p @oleksandr.rudnychenko/sync_loop sync_loop                              Start MCP server (stdio transport)
  npx -y -p @oleksandr.rudnychenko/sync_loop sync_loop init [--target <platform>]   Scaffold files into current project
  npx -y -p @oleksandr.rudnychenko/sync_loop sync_loop --help                       Show this help

Init targets:
  copilot   .github/instructions/ + copilot-instructions.md
  cursor    .cursor/rules/ with frontmatter
  claude    CLAUDE.md + .claude/rules/
  all       All of the above (default)

MCP Configuration (add to your client settings):

  {
    "mcpServers": {
      "sync_loop": {
        "command": "npx",
        "args": ["-y", "-p", "@oleksandr.rudnychenko/sync_loop", "sync_loop"]
      }
    }
  }

Resources:  Protocol docs on-demand (reasoning kernel, validation, feedback, patterns)
Tools:      init — scaffold platform-specific files
Prompts:    bootstrap — wire SyncLoop to your project; protocol — reasoning loop

https://github.com/oleksandr-rud/SyncLoop
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// CLI: npx sync_loop init
// ---------------------------------------------------------------------------
if (command === "init") {
  const targetIdx = args.indexOf("--target");
  const target = targetIdx !== -1 && args[targetIdx + 1] ? args[targetIdx + 1] : "all";
  const validTargets = ["copilot", "cursor", "claude", "all"];

  if (!validTargets.includes(target)) {
    process.stderr.write(`Error: unknown target "${target}". Use one of: ${validTargets.join(", ")}\n`);
    process.exit(1);
  }

  const { init } = await import("../src/init.js");

  // Positional arg after flags = project path; default to cwd
  const positional = args.slice(1).filter(a => !a.startsWith("--") && a !== target);
  const projectPath = positional[0] || process.cwd();

  try {
    const results = init(projectPath, target);
    process.stdout.write(`SyncLoop initialized for ${target}:\n\n${results.join("\n")}\n\nDone. Run the bootstrap prompt to wire to your project.\n`);
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }

  process.exit(0);
}

// ---------------------------------------------------------------------------
// Default: start MCP server
// ---------------------------------------------------------------------------
import("../src/server.js");
