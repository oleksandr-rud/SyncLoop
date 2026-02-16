import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "./init.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, "..", "template");

function readTemplate(relativePath) {
  return readFileSync(join(TEMPLATE_DIR, relativePath), "utf-8");
}

// ---------------------------------------------------------------------------
// Doc registry — each entry maps to a template file
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
    description: "Root entrypoint template for AI agents — project identity, protocol, guardrails",
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
    name: "Code Patterns (P1–P11)",
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

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = new McpServer({
  name: "syncloop",
  version: "0.1.0",
});

// ---------------------------------------------------------------------------
// Resources — each protocol doc exposed as a readable resource
// ---------------------------------------------------------------------------
for (const [id, doc] of Object.entries(DOCS)) {
  server.resource(
    doc.name,
    `syncloop://docs/${id}`,
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: readTemplate(doc.path),
      }],
    }),
  );
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const StackSchema = z.object({
  name: z.string().describe("Stack/layer name (e.g. 'backend', 'frontend', 'auth-service', 'worker')"),
  languages: z.array(z.string()).describe("Programming languages used (e.g. ['TypeScript', 'Python'])"),
  frameworks: z.array(z.string()).describe("Frameworks used (e.g. ['Next.js', 'Tailwind'] or ['FastAPI', 'SQLAlchemy'])"),
  testRunner: z.string().optional().describe("Test runner command (e.g. 'jest', 'pytest', 'vitest')"),
  typeChecker: z.string().optional().describe("Type checker command (e.g. 'tsc --noEmit', 'mypy', 'pyright')"),
  linter: z.string().optional().describe("Lint/format command (e.g. 'eslint .', 'ruff check')"),
  packageManager: z.string().optional().describe("Package manager (e.g. 'npm', 'pnpm', 'poetry')"),
  path: z.string().optional().describe("Root directory of this stack relative to project root (e.g. 'apps/web', 'services/auth'). Omit for monolith."),
});

server.tool(
  "init",
  "Scaffold SyncLoop protocol files into a project. The agent MUST scan the codebase first to detect all stacks (frontend, backend, services, etc.) and pass them as the stacks array. After scaffolding, the agent MUST scan again and update the generated files with actual project data.",
  {
    projectPath: z.string().describe("Absolute path to the project root directory"),
    target: z.enum(["copilot", "cursor", "claude", "all"]).describe(
      "Target platform: copilot (.github/instructions/), cursor (.cursor/rules/), claude (.claude/rules/ + CLAUDE.md), or all",
    ),
    stacks: z.array(StackSchema).min(1).describe(
      "Project stacks — one entry per layer/service. Fullstack app: [{name:'backend',...},{name:'frontend',...}]. Monolith: [{name:'app',...}]. Microservices: one per service.",
    ),
  },
  async ({ projectPath, target, stacks }) => {
    try {
      const results = init(projectPath, target, stacks);
      const bootstrapPrompt = readTemplate("bootstrap-prompt.md");

      const stackSummary = stacks.map(s => [
        `\n### ${s.name}${s.path ? ` (${s.path})` : ""}`,
        `- Languages: ${s.languages.join(", ")}`,
        `- Frameworks: ${s.frameworks.join(", ")}`,
        s.testRunner   ? `- Test runner: ${s.testRunner}` : null,
        s.typeChecker  ? `- Type checker: ${s.typeChecker}` : null,
        s.linter       ? `- Linter: ${s.linter}` : null,
        s.packageManager ? `- Package manager: ${s.packageManager}` : null,
      ].filter(Boolean).join("\n")).join("\n");

      return {
        content: [
          { type: "text", text: `SyncLoop initialized for ${target}:\n\n${results.join("\n")}` },
          { type: "text", text: `\n---\n\n## Detected stacks\n${stackSummary}` },
          { type: "text", text: `\n---\n\n**IMPORTANT: Now scan the codebase and wire the generated SyncLoop files to this project.**\n\n${bootstrapPrompt}` },
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

server.prompt(
  "bootstrap",
  "Bootstrap prompt — wire SyncLoop protocol to an existing project by scanning its codebase",
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

server.prompt(
  "protocol",
  "SyncLoop reasoning protocol summary — inject as system context for any AI coding task",
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
