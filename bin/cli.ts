#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { detectStacks, init, type InitTarget, type StackDefinition } from "../src/init.js";
import { startServer } from "../src/server.js";

const VALID_TARGETS: InitTarget[] = ["copilot", "cursor", "claude", "all"];

const HELP_TEXT = `
sync_loop - MCP server + CLI for the SyncLoop agent reasoning protocol

Usage:
  npx -y -p @oleksandr.rudnychenko/sync_loop sync_loop
    Start MCP server (stdio transport)

  npx -y -p @oleksandr.rudnychenko/sync_loop sync_loop init [projectPath] [--target <platform>] [--dry-run] [--no-overwrite]
    Scaffold files into the project

  npx -y -p @oleksandr.rudnychenko/sync_loop sync_loop --help
    Show this help

Init targets:
  copilot   .agent-loop/ + .github/instructions/ + copilot-instructions.md
  cursor    .agent-loop/ + .cursor/rules/ with frontmatter
  claude    .agent-loop/ + CLAUDE.md + .claude/rules/
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
`;

export interface CliIo {
  stdout: Pick<NodeJS.WritableStream, "write">;
  stderr: Pick<NodeJS.WritableStream, "write">;
  cwd: () => string;
}

export interface CliDeps {
  detectStacksFn: (projectPath: string) => StackDefinition[];
  initFn: typeof init;
  startServerFn: () => Promise<unknown>;
  waitForStdinFn: () => Promise<number>;
}

function defaultIo(): CliIo {
  return {
    stdout: process.stdout,
    stderr: process.stderr,
    cwd: () => process.cwd(),
  };
}

function defaultDeps(): CliDeps {
  return {
    detectStacksFn: detectStacks,
    initFn: init,
    startServerFn: startServer,
    waitForStdinFn: () => new Promise((resolve) => {
      process.stdin.on("end", () => resolve(0));
      process.stdin.on("close", () => resolve(0));
    }),
  };
}

export function getOptionValue(args: string[], optionName: string): string | undefined {
  const idx = args.indexOf(optionName);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

export function getPositionalArgs(args: string[]): string[] {
  const positionals: string[] = [];
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

export async function runCli(
  args: string[] = process.argv.slice(2),
  io: CliIo = defaultIo(),
  deps: CliDeps = defaultDeps(),
): Promise<number> {
  const command = args[0];

  if (args.includes("--help") || args.includes("-h")) {
    io.stdout.write(HELP_TEXT);
    return 0;
  }

  if (command === "init") {
    const target = (getOptionValue(args, "--target") ?? "all") as InitTarget;
    const dryRun = args.includes("--dry-run");
    const overwrite = args.includes("--no-overwrite") ? false : true;

    if (!VALID_TARGETS.includes(target)) {
      io.stderr.write(`Error: unknown target "${target}". Use one of: ${VALID_TARGETS.join(", ")}\n`);
      return 1;
    }

    const [projectPath] = getPositionalArgs(args);
    const resolvedProjectPath = projectPath || io.cwd();

    try {
      const stacks = deps.detectStacksFn(resolvedProjectPath);
      const result = deps.initFn(
        resolvedProjectPath,
        target,
        stacks,
        { dryRun, overwrite },
      );

      io.stdout.write([
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
      return 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      io.stderr.write(`Error: ${message}\n`);
      return 1;
    }
  }

  await deps.startServerFn();
  
  // Keep the process alive until stdin is closed by the parent process.
  return deps.waitForStdinFn();
}

function isMainModule(metaUrl: string): boolean {
  const entryFile = process.argv[1];
  if (!entryFile) return false;
  return metaUrl === pathToFileURL(entryFile).href;
}

if (isMainModule(import.meta.url)) {
  const exitCode = await runCli();
  process.exit(exitCode);
}
