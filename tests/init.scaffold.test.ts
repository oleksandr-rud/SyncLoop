import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { init, type StackDefinition } from "../src/init.js";

function makeTempProject(): string {
  return mkdtempSync(join(tmpdir(), "sync-loop-init-"));
}

function cleanup(path: string): void {
  rmSync(path, { recursive: true, force: true });
}

const stacks: StackDefinition[] = [{
  name: "app",
  languages: ["TypeScript", "JavaScript"],
  frameworks: ["Node.js"],
  testRunner: "npm run test",
  typeChecker: "npm run typecheck",
  linter: "npm run lint",
  packageManager: "npm",
}];

test("init dry-run reports writes without creating files", () => {
  const project = makeTempProject();

  try {
    const result = init(project, "copilot", stacks, { dryRun: true });

    assert.equal(result.dryRun, true);
    assert.ok(result.results.some((line) => line.includes(".agent-loop/ (canonical source, dry-run)")));
    assert.equal(existsSync(join(project, ".agent-loop")), false);
    assert.equal(existsSync(join(project, "AGENTS.md")), false);
  } finally {
    cleanup(project);
  }
});

test("init all writes canonical and platform files", () => {
  const project = makeTempProject();

  try {
    const result = init(project, "all", stacks, { dryRun: false, overwrite: true });

    assert.equal(result.target, "all");
    assert.ok(existsSync(join(project, ".agent-loop", "reasoning-kernel.md")));
    assert.ok(existsSync(join(project, ".github", "instructions", "reasoning-kernel.instructions.md")));
    assert.ok(existsSync(join(project, ".cursor", "rules", "00-protocol.md")));
    assert.ok(existsSync(join(project, ".claude", "rules", "reasoning-kernel.md")));
    assert.ok(existsSync(join(project, "CLAUDE.md")));
    assert.ok(existsSync(join(project, "CODEX.md")));
    assert.ok(existsSync(join(project, "AGENTS.md")));

    // Skills across platforms
    assert.ok(existsSync(join(project, ".github", "skills", "diagnose-failure", "SKILL.md")));
    assert.ok(existsSync(join(project, ".cursor", "skills", "diagnose-failure", "SKILL.md")));
    assert.ok(existsSync(join(project, ".claude", "skills", "diagnose-failure", "SKILL.md")));
    assert.ok(existsSync(join(project, ".agents", "skills", "diagnose-failure", "SKILL.md")));

    // Codex agent roles
    assert.ok(existsSync(join(project, ".codex", "config.toml")));
    assert.ok(existsSync(join(project, ".codex", "agents", "default.toml")));
    assert.ok(existsSync(join(project, ".codex", "agents", "architect.toml")));
    assert.ok(existsSync(join(project, ".codex", "agents", "fixer.toml")));

    const agents = readFileSync(join(project, "AGENTS.md"), "utf-8");
    assert.ok(agents.includes("npm run typecheck"));
    assert.ok(agents.includes("npm run lint"));
    assert.ok(agents.includes("npm run test"));
  } finally {
    cleanup(project);
  }
});

test("init respects no-overwrite for AGENTS.md", () => {
  const project = makeTempProject();

  try {
    const marker = "DO NOT TOUCH";
    writeFileSync(join(project, "AGENTS.md"), marker, "utf-8");

    init(project, "copilot", stacks, { overwrite: false });

    const agents = readFileSync(join(project, "AGENTS.md"), "utf-8");
    assert.equal(agents, marker);
  } finally {
    cleanup(project);
  }
});

test("init throws on unsupported target", () => {
  const project = makeTempProject();

  try {
    assert.throws(
      () => init(project, "invalid" as never, stacks),
      /Unknown target "invalid"/,
    );
  } finally {
    cleanup(project);
  }
});

test("init codex creates CODEX.md and agent roles", () => {
  const project = makeTempProject();

  try {
    init(project, "codex", stacks);

    assert.ok(existsSync(join(project, "CODEX.md")));
    assert.ok(existsSync(join(project, "AGENTS.md")));
    assert.ok(existsSync(join(project, ".agent-loop", "reasoning-kernel.md")));

    // Skills
    assert.ok(existsSync(join(project, ".agents", "skills", "diagnose-failure", "SKILL.md")));

    // Agent roles
    assert.ok(existsSync(join(project, ".codex", "config.toml")));
    const config = readFileSync(join(project, ".codex", "config.toml"), "utf-8");
    assert.ok(config.includes("[agents.architect]"));
    assert.ok(config.includes("[agents.fixer]"));

    assert.ok(existsSync(join(project, ".codex", "agents", "default.toml")));
    assert.ok(existsSync(join(project, ".codex", "agents", "architect.toml")));
    const architect = readFileSync(join(project, ".codex", "agents", "architect.toml"), "utf-8");
    assert.ok(architect.includes('sandbox_mode = "read-only"'));

    assert.ok(existsSync(join(project, ".codex", "agents", "fixer.toml")));

    // Should NOT have other platform files
    assert.ok(!existsSync(join(project, "CLAUDE.md")));
    assert.ok(!existsSync(join(project, ".github", "instructions")));
  } finally {
    cleanup(project);
  }
});

test("init multi-target writes only selected platforms", () => {
  const project = makeTempProject();

  try {
    init(project, ["copilot", "codex"], stacks);

    assert.ok(existsSync(join(project, ".github", "instructions", "reasoning-kernel.instructions.md")));
    assert.ok(existsSync(join(project, "CODEX.md")));
    assert.ok(existsSync(join(project, "AGENTS.md")));
    assert.ok(!existsSync(join(project, "CLAUDE.md")));
    assert.ok(!existsSync(join(project, ".cursor", "rules")));
  } finally {
    cleanup(project);
  }
});

test("init cursor creates skills", () => {
  const project = makeTempProject();

  try {
    init(project, "cursor", stacks);

    assert.ok(existsSync(join(project, ".cursor", "rules", "00-protocol.md")));
    assert.ok(existsSync(join(project, ".cursor", "skills", "diagnose-failure", "SKILL.md")));
    const skill = readFileSync(join(project, ".cursor", "skills", "diagnose-failure", "SKILL.md"), "utf-8");
    assert.ok(skill.includes("diagnose-failure"));
  } finally {
    cleanup(project);
  }
});

test("init throws on unsupported target in array", () => {
  const project = makeTempProject();

  try {
    assert.throws(
      () => init(project, ["copilot", "invalid" as never], stacks),
      /Unknown target "invalid"/,
    );
  } finally {
    cleanup(project);
  }
});
