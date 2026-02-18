import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectStacks } from "../src/init.js";

function makeTempProject(): string {
  return mkdtempSync(join(tmpdir(), "sync-loop-stacks-"));
}

function cleanup(path: string): void {
  rmSync(path, { recursive: true, force: true });
}

test("detectStacks detects Node and Python stacks with tooling commands", () => {
  const project = makeTempProject();

  try {
    writeFileSync(
      join(project, "package.json"),
      JSON.stringify({
        scripts: {
          test: "node --test",
          typecheck: "tsc --noEmit",
          lint: "eslint .",
        },
        dependencies: {
          react: "18.0.0",
          typescript: "5.0.0",
        },
      }),
      "utf-8",
    );

    const frontend = join(project, "frontend");
    mkdirSync(frontend, { recursive: true });
    writeFileSync(
      join(frontend, "package.json"),
      JSON.stringify({ dependencies: { next: "15.0.0" } }),
      "utf-8",
    );
    writeFileSync(join(frontend, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");

    const api = join(project, "api");
    mkdirSync(api, { recursive: true });
    writeFileSync(
      join(api, "requirements.txt"),
      ["fastapi", "pytest", "ruff", "mypy"].join("\n"),
      "utf-8",
    );

    const stacks = detectStacks(project);

    const rootStack = stacks.find((stack) => stack.name === "app" && !stack.path);
    assert.ok(rootStack);
    assert.deepEqual(rootStack.languages, ["TypeScript", "JavaScript"]);
    assert.equal(rootStack.testRunner, "npm run test");
    assert.equal(rootStack.typeChecker, "npm run typecheck");
    assert.equal(rootStack.linter, "npm run lint");
    assert.equal(rootStack.packageManager, "npm");
    assert.ok(rootStack.frameworks.includes("React"));

    const frontendStack = stacks.find((stack) => stack.path === "frontend");
    assert.ok(frontendStack);
    assert.equal(frontendStack.packageManager, "pnpm");
    assert.ok(frontendStack.frameworks.includes("Next.js"));

    const pythonStack = stacks.find((stack) => stack.path === "api" && stack.languages.includes("Python"));
    assert.ok(pythonStack);
    assert.equal(pythonStack.testRunner, "pytest");
    assert.equal(pythonStack.typeChecker, "mypy");
    assert.equal(pythonStack.linter, "ruff check .");
    assert.ok(pythonStack.frameworks.includes("FastAPI"));
  } finally {
    cleanup(project);
  }
});

test("detectStacks falls back to Unknown when no stacks are detected", () => {
  const project = makeTempProject();

  try {
    const stacks = detectStacks(project);

    assert.equal(stacks.length, 1);
    assert.equal(stacks[0].name, "app");
    assert.deepEqual(stacks[0].languages, ["Unknown"]);
    assert.deepEqual(stacks[0].frameworks, ["Unknown"]);
  } finally {
    cleanup(project);
  }
});
