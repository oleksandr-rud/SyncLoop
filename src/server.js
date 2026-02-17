import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join, dirname, resolve, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { init, detectStacks } from "./init.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, "template");
const PACKAGE_JSON = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

function readTemplate(relativePath) {
  return readFileSync(join(TEMPLATE_DIR, relativePath), "utf-8");
}

function pathDir(value) {
  const dir = posix.dirname(value);
  return dir === "." ? "" : dir;
}

function splitHash(link) {
  const idx = link.indexOf("#");
  if (idx === -1) return { pathPart: link, hash: "" };
  return {
    pathPart: link.slice(0, idx),
    hash: link.slice(idx),
  };
}

function isExternalLink(link) {
  return /^([a-z]+:|#)/i.test(link);
}

function rewriteMarkdownLinks(content, transform) {
  let inFence = false;
  return content
    .split("\n")
    .map((line) => {
      if (line.trimStart().startsWith("```")) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line.replace(/\]\(([^)]+)\)/g, (_match, linkPath) => `](${transform(linkPath)})`);
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Doc registry
// ---------------------------------------------------------------------------

const DOCS = {
  "overview": {
    path: ".agent-loop/README.md",
    name: "Protocol Overview",
    description: "SyncLoop file index and framework overview",
  },
  "agents-md": {
    path: "AGENTS.md",
    name: "AGENTS.md Template",
    description: "Root entrypoint template for AI agents - project identity, protocol, guardrails",
  },
  "protocol-summary": {
    path: "protocol-summary.md",
    name: "Protocol Summary",
    description: "Condensed 7-stage reasoning loop overview (~50 lines)",
  },
  "reasoning-kernel": {
    path: ".agent-loop/reasoning-kernel.md",
    name: "Reasoning Kernel",
    description: "Core 7-stage loop, transition map, context clearage, micro/macro classification",
  },
  "feedback": {
    path: ".agent-loop/feedback.md",
    name: "Feedback Loop",
    description: "Failure diagnosis, patch protocol, micro-loop, branch pruning, learning persistence",
  },
  "validate-env": {
    path: ".agent-loop/validate-env.md",
    name: "Validate Environment (Stage 1)",
    description: "NFR gates: type safety, tests, layer integrity, complexity, debug hygiene",
  },
  "validate-n": {
    path: ".agent-loop/validate-n.md",
    name: "Validate Neighbors (Stage 2)",
    description: "Shape compatibility, boundary integrity, bridge contracts",
  },
  "patterns": {
    path: ".agent-loop/patterns.md",
    name: "Pattern Registry",
    description: "Pattern routing index, architecture baseline, learned patterns, pruning records",
  },
  "glossary": {
    path: ".agent-loop/glossary.md",
    name: "Domain Glossary",
    description: "Canonical terminology, naming rules, deprecated aliases",
  },
  "code-patterns": {
    path: ".agent-loop/patterns/code-patterns.md",
    name: "Code Patterns (P1-P11)",
    description: "Port/adapter, domain modules, tasks, routes, DI, config, types, error handling",
  },
  "testing-guide": {
    path: ".agent-loop/patterns/testing-guide.md",
    name: "Testing Guide (R2)",
    description: "Test pyramid, fixtures, factories, mocks, parametrized tests, naming",
  },
  "refactoring-workflow": {
    path: ".agent-loop/patterns/refactoring-workflow.md",
    name: "Refactoring Workflow (R1)",
    description: "4-phase checklist for safe file moves and module restructuring",
  },
  "api-standards": {
    path: ".agent-loop/patterns/api-standards.md",
    name: "API Standards (R3)",
    description: "Boundary contracts, typed models, error envelopes, versioning strategy",
  },
};

const DOC_ID_BY_PATH = {};
for (const [id, doc] of Object.entries(DOCS)) {
  DOC_ID_BY_PATH[doc.path] = id;
}

function rewriteResourceLinks(content, sourcePath) {
  return rewriteMarkdownLinks(content, (linkPath) => {
    if (isExternalLink(linkPath)) return linkPath;

    const { pathPart, hash } = splitHash(linkPath);
    if (!pathPart) return linkPath;

    let canonical = posix.normalize(posix.join(pathDir(sourcePath) || ".", pathPart)).replace(/^\.\//, "");
    if (canonical === ".agent-loop/patterns") canonical = ".agent-loop/patterns.md";
    if (canonical === "../AGENTS.md" || canonical === "AGENTS.md") canonical = "AGENTS.md";
    if (canonical === "../README.md") return linkPath;

    const docId = DOC_ID_BY_PATH[canonical];
    if (!docId) return linkPath;

    return `syncloop://docs/${docId}${hash}`;
  });
}

function formatStacks(stacks) {
  return stacks
    .map((stack) => [
      `\n### ${stack.name}${stack.path ? ` (${stack.path})` : ""}`,
      `- Languages: ${stack.languages.join(", ")}`,
      `- Frameworks: ${stack.frameworks.join(", ")}`,
      stack.testRunner ? `- Test runner: ${stack.testRunner}` : null,
      stack.typeChecker ? `- Type checker: ${stack.typeChecker}` : null,
      stack.linter ? `- Linter: ${stack.linter}` : null,
      stack.packageManager ? `- Package manager: ${stack.packageManager}` : null,
    ].filter(Boolean).join("\n"))
    .join("\n");
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "sync_loop",
  version: PACKAGE_JSON.version,
});

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

for (const [id, doc] of Object.entries(DOCS)) {
  server.registerResource(
    doc.name,
    `syncloop://docs/${id}`,
    { description: doc.description, mimeType: "text/markdown" },
    async (uri) => {
      const raw = readTemplate(doc.path);
      const rewritten = rewriteResourceLinks(raw, doc.path);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: rewritten,
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const StackSchema = z.object({
  name: z.string().describe("Stack/layer name (for example: backend, frontend, worker)"),
  languages: z.array(z.string()).describe("Programming languages used by this stack"),
  frameworks: z.array(z.string()).describe("Frameworks/libraries for this stack"),
  testRunner: z.string().optional().describe("Test runner command"),
  typeChecker: z.string().optional().describe("Type checker command"),
  linter: z.string().optional().describe("Lint/format command"),
  packageManager: z.string().optional().describe("Package manager name"),
  path: z.string().optional().describe("Root directory of this stack relative to project root"),
});

server.registerTool(
  "init",
  {
    description: "Scaffold SyncLoop protocol files into a project. If target is not explicitly provided, default to all. If stacks are not provided, auto-detect them by scanning the repository.",
    inputSchema: {
      projectPath: z.string().optional().describe("Project root path. Defaults to current working directory."),
      target: z.enum(["copilot", "cursor", "claude", "all"]).optional().default("all"),
      stacks: z.array(StackSchema).optional().describe("Optional stack definitions. Auto-detected when omitted."),
      dryRun: z.boolean().optional().default(false).describe("Preview file writes without modifying files."),
      overwrite: z.boolean().optional().default(true).describe("Overwrite existing generated files."),
    },
  },
  async ({ projectPath, target = "all", stacks, dryRun = false, overwrite = true }) => {
    try {
      const resolvedProjectPath = resolve(projectPath ?? process.cwd());
      const effectiveStacks = stacks?.length ? stacks : detectStacks(resolvedProjectPath);
      const initResult = init(
        resolvedProjectPath,
        target,
        effectiveStacks,
        { dryRun, overwrite },
      );
      const bootstrapPrompt = readTemplate("bootstrap-prompt.md");
      const stackSummary = formatStacks(initResult.stacks);

      return {
        content: [
          { type: "text", text: `SyncLoop initialized for ${target}:\n\n${initResult.results.join("\n")}` },
          { type: "text", text: `\n---\n\n## Options\n- dryRun: ${dryRun}\n- overwrite: ${overwrite}` },
          { type: "text", text: `\n---\n\n## Detected stacks\n${stackSummary}` },
          {
            type: "text",
            text: `\n---\n\n**IMPORTANT: Now scan the codebase and wire the generated SyncLoop files to this project.**\n\n${bootstrapPrompt}`,
          },
          { type: "text", text: `\n---\n\n## Machine-readable result\n\`\`\`json\n${JSON.stringify(initResult, null, 2)}\n\`\`\`` },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error initializing SyncLoop: ${err.message}` }],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

server.registerPrompt(
  "bootstrap",
  { description: "Bootstrap prompt - wire SyncLoop protocol to an existing project by scanning its codebase" },
  async () => ({
    description: "Scan the project codebase and wire SyncLoop protocol references to real project structure",
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: readTemplate("bootstrap-prompt.md"),
      },
    }],
  }),
);

server.registerPrompt(
  "protocol",
  { description: "SyncLoop reasoning protocol summary - inject as system context for any AI coding task" },
  async () => ({
    description: "The SyncLoop 7-stage reasoning protocol for self-correcting agent behavior",
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: readTemplate("protocol-summary.md"),
      },
    }],
  }),
);

// ---------------------------------------------------------------------------
// Connect transport
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
