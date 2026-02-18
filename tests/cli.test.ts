import test from "node:test";
import assert from "node:assert/strict";
import { runCli, type CliDeps, type CliIo } from "../bin/cli.js";
import type { StackDefinition } from "../src/init.js";

function createIo(): { io: CliIo; output: { stdout: string; stderr: string } } {
  const output = { stdout: "", stderr: "" };
  const io: CliIo = {
    stdout: {
      write: (chunk) => {
        output.stdout += String(chunk);
        return true;
      },
    },
    stderr: {
      write: (chunk) => {
        output.stderr += String(chunk);
        return true;
      },
    },
    cwd: () => "C:/workspace/mock-project",
  };

  return { io, output };
}

function createDeps(): { deps: CliDeps; calls: { startServer: number; initArgs: unknown[] } } {
  const calls = { startServer: 0, initArgs: [] as unknown[] };
  const stacks: StackDefinition[] = [{
    name: "app",
    languages: ["JavaScript"],
    frameworks: ["Node.js"],
  }];

  const deps: CliDeps = {
    detectStacksFn: () => stacks,
    initFn: (...args) => {
      calls.initArgs = args;
      return {
        projectPath: String(args[0]),
        target: args[1],
        dryRun: Boolean(args[3]?.dryRun),
        overwrite: args[3]?.overwrite ?? true,
        stacks,
        results: ["AGENTS.md"],
      };
    },
    startServerFn: async () => {
      calls.startServer += 1;
    },
  };

  return { deps, calls };
}

test("runCli prints help", async () => {
  const { io, output } = createIo();
  const { deps } = createDeps();

  const code = await runCli(["--help"], io, deps);

  assert.equal(code, 0);
  assert.match(output.stdout, /sync_loop - MCP server \+ CLI/);
  assert.equal(output.stderr, "");
});

test("runCli validates unsupported targets", async () => {
  const { io, output } = createIo();
  const { deps } = createDeps();

  const code = await runCli(["init", "--target", "invalid"], io, deps);

  assert.equal(code, 1);
  assert.match(output.stderr, /unknown target "invalid"/);
});

test("runCli runs init command with parsed flags", async () => {
  const { io, output } = createIo();
  const { deps, calls } = createDeps();

  const code = await runCli(["init", "my-project", "--target", "copilot", "--dry-run", "--no-overwrite"], io, deps);

  assert.equal(code, 0);
  assert.equal(calls.startServer, 0);
  assert.ok(Array.isArray(calls.initArgs));
  assert.deepEqual(calls.initArgs, [
    "my-project",
    "copilot",
    [{ name: "app", languages: ["JavaScript"], frameworks: ["Node.js"] }],
    { dryRun: true, overwrite: false },
  ]);
  assert.match(output.stdout, /SyncLoop initialized for copilot/);
});

test("runCli starts MCP server in default mode", async () => {
  const { io } = createIo();
  const { deps, calls } = createDeps();

  const code = await runCli([], io, deps);

  assert.equal(code, 0);
  assert.equal(calls.startServer, 1);
});
