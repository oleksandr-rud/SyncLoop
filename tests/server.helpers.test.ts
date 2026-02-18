import test from "node:test";
import assert from "node:assert/strict";
import { formatStacks, rewriteMarkdownLinks, rewriteResourceLinks } from "../src/server.js";

test("rewriteMarkdownLinks rewrites links outside fenced code blocks only", () => {
  const input = [
    "[Link](./reasoning-kernel.md)",
    "```md",
    "[CodeLink](./feedback.md)",
    "```",
  ].join("\n");

  const output = rewriteMarkdownLinks(input, (link) => `rewritten://${link}`);

  assert.ok(output.includes("[Link](rewritten://./reasoning-kernel.md)"));
  assert.ok(output.includes("[CodeLink](./feedback.md)"));
});

test("rewriteResourceLinks maps internal doc links to syncloop URIs", () => {
  const input = "See [Kernel](./reasoning-kernel.md#stage-1) and [External](https://example.com).";
  const output = rewriteResourceLinks(input, ".agent-loop/README.md");

  assert.ok(output.includes("syncloop://docs/reasoning-kernel#stage-1"));
  assert.ok(output.includes("https://example.com"));
});

test("formatStacks renders markdown with stack details", () => {
  const output = formatStacks([
    {
      name: "backend",
      path: "api",
      languages: ["TypeScript"],
      frameworks: ["Express"],
      testRunner: "npm run test",
      typeChecker: "npm run typecheck",
      linter: "npm run lint",
      packageManager: "npm",
    },
  ]);

  assert.ok(output.includes("### backend (api)"));
  assert.ok(output.includes("- Languages: TypeScript"));
  assert.ok(output.includes("- Frameworks: Express"));
  assert.ok(output.includes("- Test runner: npm run test"));
});
