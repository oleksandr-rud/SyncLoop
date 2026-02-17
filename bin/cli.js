#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];

function getOptionValue(optionName) {
  const idx = args.indexOf(optionName);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function getPositionalArgs() {
  const positionals = [];
  for (let i = 1; i < args.length; i += 1) {
    const current = args[i];
    if (current === "--target") {
      i += 1;
      continue;
    }
    if (current === "--dry-run" || current === "--overwrite" || current === "--no-overwrite") {
      continue;
    }
    if (current.startsWith("--")) {
      continue;
    }
    positionals.push(current);
  }
  return positionals;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(`
sync_loop - MCP server + CLI for the SyncLoop agent reasoning protocol

Usage:
  npx -y -p @oleksandr.rudnychenko/sync_loop sync_loop
    Start MCP server (stdio transport)

  npx -y -p @oleksandr.rudnychenko/sync_loop sync_loop init [projectPath] [--target <platform>] [--dry-run] [--no-overwrite]
    Scaffold files into the project

  npx -y -p @oleksandr.rudnychenko/sync_loop sync_loop --help
    Show this help

Init targets:
  copilot   .github/instructions/ + copilot-instructions.md
  cursor    .cursor/rules/ with frontmatter
  claude    CLAUDE.md + .claude/rules/
  all       All of the above (default)

Flags:
  --dry-run       Preview writes without modifying files
  --no-overwrite  Do not overwrite existing generated files

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
Tools:      init - scaffold platform-specific files
Prompts:    bootstrap - wire SyncLoop to your project; protocol - reasoning loop

https://github.com/oleksandr-rud/SyncLoop
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// CLI: npx sync_loop init
// ---------------------------------------------------------------------------
if (command === "init") {
  const target = getOptionValue("--target") ?? "all";
  const dryRun = args.includes("--dry-run");
  const overwrite = args.includes("--no-overwrite") ? false : true;
  const validTargets = ["copilot", "cursor", "claude", "all"];

  if (!validTargets.includes(target)) {
    process.stderr.write(`Error: unknown target "${target}". Use one of: ${validTargets.join(", ")}\n`);
    process.exit(1);
  }

  const [projectPath] = getPositionalArgs();
  const resolvedProjectPath = projectPath || process.cwd();

  const { init, detectStacks } = await import("../src/init.js");

  try {
    const stacks = detectStacks(resolvedProjectPath);
    const result = init(
      resolvedProjectPath,
      target,
      stacks,
      { dryRun, overwrite },
    );

    process.stdout.write([
      `SyncLoop initialized for ${target}:`,
      "",
      ...result.results,
      "",
      "Detected stacks:",
      ...result.stacks.map((stack) => `- ${stack.name}${stack.path ? ` (${stack.path})` : ""}: ${stack.languages.join(", ")} | ${stack.frameworks.join(", ")}`),
      "",
      dryRun
        ? "Dry run complete. No files were modified."
        : "Done. Run the bootstrap prompt to wire to your project.",
      "",
    ].join("\n"));
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

