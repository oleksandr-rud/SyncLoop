import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { join, dirname, resolve, posix } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, "template");

export type Platform = "copilot" | "cursor" | "claude" | "codex";
export type InitTarget = Platform | Platform[] | "all";
export const ALL_PLATFORMS: readonly Platform[] = ["copilot", "cursor", "claude", "codex"];

export interface StackDefinition {
  name: string;
  languages: string[];
  frameworks: string[];
  testRunner?: string;
  typeChecker?: string;
  linter?: string;
  packageManager?: string;
  path?: string;
}

export interface InitOptions {
  dryRun?: boolean;
  overwrite?: boolean;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface WriteOutputResult {
  path: string;
  status: "skipped" | "would-overwrite" | "would-create" | "overwritten" | "created";
}

interface SourceFile {
  id: string;
  path: string;
}

interface PlatformFileConfig {
  target: string;
  fm: Record<string, string | boolean | string[]>;
}

type PlatformConfig = Record<string, PlatformFileConfig>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readTemplate(relativePath: string): string {
  return readFileSync(join(TEMPLATE_DIR, relativePath), "utf-8");
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function readJsonSafe(path: string): PackageJson | null {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as PackageJson;
  } catch {
    return null;
  }
}

function detectPackageManager(dirPath: string): string {
  if (existsSync(join(dirPath, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(dirPath, "yarn.lock"))) return "yarn";
  if (existsSync(join(dirPath, "package-lock.json"))) return "npm";
  if (existsSync(join(dirPath, "uv.lock"))) return "uv";
  return "npm";
}

function runCommandPrefix(packageManager: string): string {
  if (packageManager === "npm") return "npm run";
  if (packageManager === "pnpm") return "pnpm";
  if (packageManager === "yarn") return "yarn";
  return `${packageManager} run`;
}

function detectNodeFrameworks(pkg: PackageJson): string[] {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const frameworks: string[] = [];
  const known: Array<[string, string]> = [
    ["next", "Next.js"],
    ["react", "React"],
    ["vite", "Vite"],
    ["vue", "Vue"],
    ["svelte", "Svelte"],
    ["tailwindcss", "TailwindCSS"],
    ["express", "Express"],
    ["fastify", "Fastify"],
    ["@nestjs/core", "NestJS"],
    ["@modelcontextprotocol/sdk", "MCP SDK"],
    ["@tanstack/react-query", "TanStack Query"],
    ["zustand", "Zustand"],
  ];

  for (const [dep, name] of known) {
    if (deps[dep]) frameworks.push(name);
  }

  return frameworks;
}

function detectNodeStack(projectPath: string, relativePath = ""): StackDefinition | null {
  const stackRoot = join(projectPath, relativePath);
  const pkgPath = join(stackRoot, "package.json");
  if (!existsSync(pkgPath)) return null;

  const pkg = readJsonSafe(pkgPath) ?? {};
  const scripts = pkg.scripts ?? {};
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const packageManager = detectPackageManager(stackRoot);
  const runPrefix = runCommandPrefix(packageManager);
  const frameworks = detectNodeFrameworks(pkg);
  const usesTypeScript = Boolean(deps.typescript || existsSync(join(stackRoot, "tsconfig.json")));
  const languages = usesTypeScript ? ["TypeScript", "JavaScript"] : ["JavaScript"];

  const stackName = relativePath ? posix.basename(toPosixPath(relativePath)) : "app";

  return {
    name: stackName,
    languages,
    frameworks: frameworks.length > 0 ? frameworks : ["Node.js"],
    testRunner: scripts.test ? `${runPrefix} test` : undefined,
    typeChecker: scripts.typecheck ? `${runPrefix} typecheck` : (usesTypeScript ? "tsc --noEmit" : undefined),
    linter: scripts.lint ? `${runPrefix} lint` : undefined,
    packageManager,
    path: relativePath || undefined,
  };
}

function detectPythonStack(projectPath: string, relativePath = ""): StackDefinition | null {
  const stackRoot = join(projectPath, relativePath);
  const pyprojectPath = join(stackRoot, "pyproject.toml");
  const requirementsPath = join(stackRoot, "requirements.txt");
  if (!existsSync(pyprojectPath) && !existsSync(requirementsPath)) return null;

  const pyproject = existsSync(pyprojectPath) ? readFileSync(pyprojectPath, "utf-8").toLowerCase() : "";
  const reqs = existsSync(requirementsPath) ? readFileSync(requirementsPath, "utf-8").toLowerCase() : "";
  const merged = `${pyproject}\n${reqs}`;

  const frameworks: string[] = [];
  if (merged.includes("fastapi")) frameworks.push("FastAPI");
  if (merged.includes("django")) frameworks.push("Django");
  if (merged.includes("flask")) frameworks.push("Flask");
  if (merged.includes("langgraph")) frameworks.push("LangGraph");
  if (merged.includes("pydantic")) frameworks.push("Pydantic");

  const stackName = relativePath ? posix.basename(toPosixPath(relativePath)) : "app";
  const hasPyright = merged.includes("pyright");
  const hasMypy = merged.includes("mypy");
  const hasRuff = merged.includes("ruff");
  const hasPytest = merged.includes("pytest");

  return {
    name: stackName,
    languages: ["Python"],
    frameworks: frameworks.length > 0 ? frameworks : ["Python"],
    testRunner: hasPytest ? "pytest" : undefined,
    typeChecker: hasPyright ? "pyright" : (hasMypy ? "mypy" : undefined),
    linter: hasRuff ? "ruff check ." : undefined,
    path: relativePath || undefined,
  };
}

export function detectStacks(projectPath: string): StackDefinition[] {
  const root = resolve(projectPath);
  const candidates = [""];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules") continue;
    candidates.push(entry.name);
  }

  const stacks: StackDefinition[] = [];
  for (const rel of candidates) {
    const nodeStack = detectNodeStack(root, rel);
    if (nodeStack) stacks.push(nodeStack);
    const pythonStack = detectPythonStack(root, rel);
    if (pythonStack) stacks.push(pythonStack);
  }

  const deduped: StackDefinition[] = [];
  const seen = new Set<string>();
  for (const stack of stacks) {
    const key = `${stack.name}:${stack.path ?? ""}:${stack.languages.join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(stack);
  }

  if (deduped.length === 0) {
    return [{
      name: "app",
      languages: ["Unknown"],
      frameworks: ["Unknown"],
    }];
  }

  return deduped;
}

function writeOutput(
  projectPath: string,
  relativePath: string,
  content: string,
  options: InitOptions = {},
): WriteOutputResult {
  const { dryRun = false, overwrite = true } = options;
  const fullPath = join(projectPath, relativePath);
  const alreadyExists = existsSync(fullPath);

  if (alreadyExists && !overwrite) {
    return { path: relativePath, status: "skipped" };
  }

  if (!dryRun) {
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
  }

  if (dryRun) {
    return { path: relativePath, status: alreadyExists ? "would-overwrite" : "would-create" };
  }
  return { path: relativePath, status: alreadyExists ? "overwritten" : "created" };
}

function formatWriteResult(result: WriteOutputResult): string {
  if (result.status === "skipped") return `${result.path} (skipped: exists)`;
  if (result.status.startsWith("would-")) return `${result.path} (dry-run)`;
  return result.path;
}

function yamlFrontmatter(fields: Record<string, string | boolean | string[]>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - "${item}"`);
      }
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: "${value}"`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Source file list (maps to src/template/.agent-loop/)
// ---------------------------------------------------------------------------

const SOURCE_FILES: SourceFile[] = [
  { id: "reasoning-kernel", path: ".agent-loop/reasoning-kernel.md" },
  { id: "feedback", path: ".agent-loop/feedback.md" },
  { id: "validate-env", path: ".agent-loop/validate-env.md" },
  { id: "validate-n", path: ".agent-loop/validate-n.md" },
  { id: "patterns", path: ".agent-loop/patterns.md" },
  { id: "glossary", path: ".agent-loop/glossary.md" },
  { id: "code-patterns", path: ".agent-loop/patterns/code-patterns.md" },
  { id: "testing-guide", path: ".agent-loop/patterns/testing-guide.md" },
  { id: "refactoring-workflow", path: ".agent-loop/patterns/refactoring-workflow.md" },
  { id: "api-standards", path: ".agent-loop/patterns/api-standards.md" },
];

const WRAPPER_FILES: SourceFile[] = [
  { id: "reasoning-kernel", path: "wiring/reasoning-kernel.md" },
  { id: "feedback", path: "wiring/feedback.md" },
  { id: "validate-env", path: "wiring/validate-env.md" },
  { id: "validate-n", path: "wiring/validate-n.md" },
  { id: "patterns", path: "wiring/patterns.md" },
  { id: "glossary", path: "wiring/glossary.md" },
  { id: "code-patterns", path: "wiring/code-patterns.md" },
  { id: "testing-guide", path: "wiring/testing-guide.md" },
  { id: "refactoring-workflow", path: "wiring/refactoring-workflow.md" },
  { id: "api-standards", path: "wiring/api-standards.md" },
];

// ---------------------------------------------------------------------------
// Platform configs
// ---------------------------------------------------------------------------

const COPILOT: PlatformConfig = {
  "reasoning-kernel": { target: ".github/instructions/reasoning-kernel.instructions.md", fm: { name: "SyncLoop: Reasoning Kernel", description: "7-stage agent reasoning loop with context clearage", applyTo: "**/*" } },
  "feedback": { target: ".github/instructions/feedback.instructions.md", fm: { name: "SyncLoop: Feedback Loop", description: "Failure diagnosis, patch protocol, branch pruning", applyTo: "**/*" } },
  "validate-env": { target: ".github/instructions/validate-env.instructions.md", fm: { name: "SyncLoop: Validate Environment", description: "NFR gates: types, tests, layers, complexity", applyTo: "**/*" } },
  "validate-n": { target: ".github/instructions/validate-n.instructions.md", fm: { name: "SyncLoop: Validate Neighbors", description: "Shape, boundary, bridge checks", applyTo: "**/*" } },
  "patterns": { target: ".github/instructions/patterns.instructions.md", fm: { name: "SyncLoop: Pattern Registry", description: "Pattern routing and learned patterns", applyTo: "**/*" } },
  "glossary": { target: ".github/instructions/glossary.instructions.md", fm: { name: "SyncLoop: Glossary", description: "Canonical terminology", applyTo: "**/*" } },
  "code-patterns": { target: ".github/instructions/code-patterns.instructions.md", fm: { name: "SyncLoop: Code Patterns", description: "P1-P11 implementation patterns", applyTo: "{src,app,lib}/**/*.{ts,py,js,jsx,tsx}" } },
  "testing-guide": { target: ".github/instructions/testing-guide.instructions.md", fm: { name: "SyncLoop: Testing Guide", description: "Test patterns and strategies", applyTo: "{tests,test,__tests__}/**/*" } },
  "refactoring-workflow": { target: ".github/instructions/refactoring-workflow.instructions.md", fm: { name: "SyncLoop: Refactoring Workflow", description: "4-phase refactoring checklist", applyTo: "**/*" } },
  "api-standards": { target: ".github/instructions/api-standards.instructions.md", fm: { name: "SyncLoop: API Standards", description: "Boundary contracts and API conventions", applyTo: "{routes,routers,controllers,api}/**/*" } },
};

const CURSOR: PlatformConfig = {
  "reasoning-kernel": { target: ".cursor/rules/01-reasoning-kernel.md", fm: { description: "7-stage agent reasoning loop with context clearage and transitions", alwaysApply: true } },
  "feedback": { target: ".cursor/rules/02-feedback.md", fm: { description: "Failure diagnosis, patch protocol, micro-loop, branch pruning", alwaysApply: true } },
  "validate-env": { target: ".cursor/rules/03-validate-env.md", fm: { description: "Stage 1 NFR gates: types, tests, layers, complexity, debug hygiene", alwaysApply: true } },
  "validate-n": { target: ".cursor/rules/04-validate-n.md", fm: { description: "Stage 2 checks: shapes, boundaries, bridges", alwaysApply: true } },
  "patterns": { target: ".cursor/rules/05-patterns.md", fm: { description: "Pattern routing index and learned patterns", alwaysApply: true } },
  "glossary": { target: ".cursor/rules/06-glossary.md", fm: { description: "Canonical domain terminology and naming rules", alwaysApply: true } },
  "code-patterns": { target: ".cursor/rules/07-code-patterns.md", fm: { description: "P1-P11 implementation patterns for layered code", globs: "{src,app,lib}/**/*.{ts,py,js,jsx,tsx}" } },
  "testing-guide": { target: ".cursor/rules/08-testing-guide.md", fm: { description: "Test patterns, fixtures, mocks, strategies", globs: "{tests,test,__tests__}/**/*" } },
  "refactoring-workflow": { target: ".cursor/rules/09-refactoring-workflow.md", fm: { description: "4-phase refactoring checklist for safe restructuring", alwaysApply: false } },
  "api-standards": { target: ".cursor/rules/10-api-standards.md", fm: { description: "Boundary contracts, typed models, error envelopes", globs: "{routes,routers,controllers,api}/**/*" } },
};

const CLAUDE: PlatformConfig = {
  "reasoning-kernel": { target: ".claude/rules/reasoning-kernel.md", fm: { paths: ["**/*"] } },
  "feedback": { target: ".claude/rules/feedback.md", fm: { paths: ["**/*"] } },
  "validate-env": { target: ".claude/rules/validate-env.md", fm: { paths: ["**/*"] } },
  "validate-n": { target: ".claude/rules/validate-n.md", fm: { paths: ["**/*"] } },
  "patterns": { target: ".claude/rules/patterns.md", fm: { paths: ["**/*"] } },
  "glossary": { target: ".claude/rules/glossary.md", fm: { paths: ["**/*"] } },
  "code-patterns": { target: ".claude/rules/code-patterns.md", fm: { paths: ["src/**", "app/**", "lib/**"] } },
  "testing-guide": { target: ".claude/rules/testing-guide.md", fm: { paths: ["tests/**", "test/**", "__tests__/**"] } },
  "refactoring-workflow": { target: ".claude/rules/refactoring-workflow.md", fm: { paths: ["**/*"] } },
  "api-standards": { target: ".claude/rules/api-standards.md", fm: { paths: ["**/routes/**", "**/api/**", "**/controllers/**"] } },
};

const CODEX: PlatformConfig = {};

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  copilot: COPILOT,
  cursor: CURSOR,
  claude: CLAUDE,
  codex: CODEX,
};

// ---------------------------------------------------------------------------
// Environment placeholder replacement
// ---------------------------------------------------------------------------

function applyStacks(content: string, stacks: StackDefinition[]): string {
  if (!stacks || stacks.length === 0) return content;

  const testRunners = stacks.map((stack) => stack.testRunner).filter(Boolean) as string[];
  const typeCheckers = stacks.map((stack) => stack.typeChecker).filter(Boolean) as string[];
  const linters = stacks.map((stack) => stack.linter).filter(Boolean) as string[];
  const packageManagers = [...new Set(stacks.map((stack) => stack.packageManager).filter(Boolean) as string[])];

  const stackRows = stacks
    .map((stack) => `| ${stack.name}${stack.path ? ` (\`${stack.path}\`)` : ""} | ${stack.languages.join(", ")} | ${stack.frameworks.join(", ")} |`)
    .join("\n");
  const stackTable = `| Stack | Languages | Frameworks |\n|-------|-----------|------------|\n${stackRows}`;

  const replacements: Record<string, string> = {
    "{typecheck command}": typeCheckers.join(" && ") || "{typecheck command}",
    "{lint command}": linters.join(" && ") || "{lint command}",
    "{test command}": testRunners.join(" && ") || "{test command}",
    "{targeted test command}": testRunners[0] ? `${testRunners[0]} {path}` : "{targeted test command}",
    "{install command}": packageManagers.map((pm) => `${pm} install`).join(" && ") || "{install command}",
  };

  let result = content;

  const legacyTableRegex = /\| Layer \| Stack \|\r?\n\|[-|]+\|\r?\n\| Backend \|[^\r\n]*\|\r?\n\| Frontend \|[^\r\n]*\|\r?\n\| Infra \|[^\r\n]*\|/;
  const generatedTableRegex = /\| Stack \| Languages \| Frameworks \|\r?\n\|[-|]+\|(?:\r?\n\|[^\r\n]*\|)+/;
  result = result.replace(legacyTableRegex, stackTable);
  result = result.replace(generatedTableRegex, stackTable);

  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replaceAll(placeholder, value);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Platform file generation
// ---------------------------------------------------------------------------

function generatePlatformFiles(
  projectPath: string,
  platform: Platform,
  stacks: StackDefinition[],
  options: InitOptions,
): string[] {
  const config = PLATFORM_CONFIGS[platform];
  const results: string[] = [];
  const wrapperById = new Map(WRAPPER_FILES.map((item) => [item.id, item.path]));

  for (const source of SOURCE_FILES) {
    const entry = config[source.id];
    if (!entry) continue;
    const wrapperPath = wrapperById.get(source.id);
    if (!wrapperPath) continue;

    const content = applyStacks(readTemplate(wrapperPath), stacks);
    const frontmatter = yamlFrontmatter(entry.fm);
    const writeResult = writeOutput(projectPath, entry.target, `${frontmatter}\n\n${content}`, options);
    results.push(`  ${formatWriteResult(writeResult)}`);
  }

  const summary = readTemplate("protocol-summary.md");

  if (platform === "copilot") {
    const writeResult = writeOutput(projectPath, ".github/copilot-instructions.md", summary, options);
    results.push(`  ${formatWriteResult(writeResult)}`);

    const agentBody = applyStacks(readTemplate("wiring/agents-github.md"), stacks);
    const agentResult = writeOutput(projectPath, ".github/agents/SyncLoop.agent.md", agentBody, options);
    results.push(`  ${formatWriteResult(agentResult)}`);

    const architectBody = applyStacks(readTemplate("wiring/agents-github-architect.md"), stacks);
    const architectResult = writeOutput(projectPath, ".github/agents/SyncLoop-Architect.agent.md", architectBody, options);
    results.push(`  ${formatWriteResult(architectResult)}`);

    const fixerBody = applyStacks(readTemplate("wiring/agents-github-fixer.md"), stacks);
    const fixerResult = writeOutput(projectPath, ".github/agents/SyncLoop-Fixer.agent.md", fixerBody, options);
    results.push(`  ${formatWriteResult(fixerResult)}`);

    const diagnoseFailureBody = applyStacks(readTemplate("wiring/skills-diagnose-failure.md"), stacks);
    const diagnoseFailureResult = writeOutput(projectPath, ".github/skills/diagnose-failure/SKILL.md", diagnoseFailureBody, options);
    results.push(`  ${formatWriteResult(diagnoseFailureResult)}`);
  } else if (platform === "cursor") {
    const frontmatter = yamlFrontmatter({ description: "SyncLoop protocol summary and guardrails", alwaysApply: true });
    const writeResult = writeOutput(projectPath, ".cursor/rules/00-protocol.md", `${frontmatter}\n\n${summary}`, options);
    results.push(`  ${formatWriteResult(writeResult)}`);

    const diagnoseFailureBody = applyStacks(readTemplate("wiring/skills-diagnose-failure.md"), stacks);
    const diagnoseFailureResult = writeOutput(projectPath, ".cursor/skills/diagnose-failure/SKILL.md", diagnoseFailureBody, options);
    results.push(`  ${formatWriteResult(diagnoseFailureResult)}`);
  } else if (platform === "claude") {
    const writeResult = writeOutput(projectPath, "CLAUDE.md", summary, options);
    results.push(`  ${formatWriteResult(writeResult)}`);

    const agentBody = applyStacks(readTemplate("wiring/agents-claude.md"), stacks);
    const agentResult = writeOutput(projectPath, ".claude/agents/SyncLoop.md", agentBody, options);
    results.push(`  ${formatWriteResult(agentResult)}`);

    const architectBody = applyStacks(readTemplate("wiring/agents-claude-architect.md"), stacks);
    const architectResult = writeOutput(projectPath, ".claude/agents/SyncLoop-Architect.md", architectBody, options);
    results.push(`  ${formatWriteResult(architectResult)}`);

    const fixerBody = applyStacks(readTemplate("wiring/agents-claude-fixer.md"), stacks);
    const fixerResult = writeOutput(projectPath, ".claude/agents/SyncLoop-Fixer.md", fixerBody, options);
    results.push(`  ${formatWriteResult(fixerResult)}`);

    const diagnoseFailureBody = applyStacks(readTemplate("wiring/skills-diagnose-failure.md"), stacks);
    const diagnoseFailureResult = writeOutput(projectPath, ".claude/skills/diagnose-failure/SKILL.md", diagnoseFailureBody, options);
    results.push(`  ${formatWriteResult(diagnoseFailureResult)}`);
  } else if (platform === "codex") {
    const writeResult = writeOutput(projectPath, "CODEX.md", summary, options);
    results.push(`  ${formatWriteResult(writeResult)}`);

    const diagnoseFailureBody = applyStacks(readTemplate("wiring/skills-diagnose-failure.md"), stacks);
    const diagnoseFailureResult = writeOutput(projectPath, ".agents/skills/diagnose-failure/SKILL.md", diagnoseFailureBody, options);
    results.push(`  ${formatWriteResult(diagnoseFailureResult)}`);

    const codexConfig = readTemplate("wiring/codex-config.toml");
    const configResult = writeOutput(projectPath, ".codex/config.toml", codexConfig, options);
    results.push(`  ${formatWriteResult(configResult)}`);

    const defaultAgent = readTemplate("wiring/codex-agent-default.toml");
    const defaultResult = writeOutput(projectPath, ".codex/agents/default.toml", defaultAgent, options);
    results.push(`  ${formatWriteResult(defaultResult)}`);

    const architectAgent = readTemplate("wiring/codex-agent-architect.toml");
    const architectResult = writeOutput(projectPath, ".codex/agents/architect.toml", architectAgent, options);
    results.push(`  ${formatWriteResult(architectResult)}`);

    const fixerAgent = readTemplate("wiring/codex-agent-fixer.toml");
    const fixerResult = writeOutput(projectPath, ".codex/agents/fixer.toml", fixerAgent, options);
    results.push(`  ${formatWriteResult(fixerResult)}`);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseTarget(value: string): InitTarget {
  if (value === "all") return "all";
  const parts = [...new Set(value.split(",").map((t) => t.trim()).filter(Boolean))];
  if (parts.length === 1) return parts[0] as Platform;
  return parts as Platform[];
}

export function init(
  projectPath: string,
  target: InitTarget = "all",
  stacks: StackDefinition[] = [],
  options: InitOptions = {},
): {
  projectPath: string;
  target: InitTarget;
  dryRun: boolean;
  overwrite: boolean;
  stacks: StackDefinition[];
  results: string[];
} {
  const root = resolve(projectPath);
  const effectiveStacks = stacks.length > 0 ? stacks : detectStacks(root);
  const mergedOptions = {
    dryRun: Boolean(options.dryRun),
    overwrite: options.overwrite ?? true,
  };

  if (typeof target === "string" && target !== "all" && !(ALL_PLATFORMS as readonly string[]).includes(target)) {
    throw new Error(`Unknown target "${target}". Use one of: ${[...ALL_PLATFORMS, "all"].join(", ")}`);
  }
  if (Array.isArray(target)) {
    for (const t of target) {
      if (!(ALL_PLATFORMS as readonly string[]).includes(t)) {
        throw new Error(`Unknown target "${t}". Use one of: ${[...ALL_PLATFORMS, "all"].join(", ")}`);
      }
    }
  }

  const results: string[] = [];

  const src = join(TEMPLATE_DIR, ".agent-loop");
  const dest = join(root, ".agent-loop");

  if (!mergedOptions.dryRun) {
    cpSync(src, dest, {
      recursive: true,
      force: mergedOptions.overwrite,
      errorOnExist: false,
    });

    if (effectiveStacks.length > 0) {
      for (const source of SOURCE_FILES) {
        const destFile = join(root, source.path);
        if (!mergedOptions.overwrite && existsSync(destFile)) continue;
        try {
          const current = readFileSync(destFile, "utf-8");
          const updated = applyStacks(current, effectiveStacks);
          if (updated !== current) writeFileSync(destFile, updated, "utf-8");
        } catch {
          // Ignore files that are missing after copy.
        }
      }
    }
  }

  results.push(`.agent-loop/ (canonical source${mergedOptions.dryRun ? ", dry-run" : ""})`);

  const agentsContent = applyStacks(readTemplate("AGENTS.md"), effectiveStacks);
  const agentsResult = writeOutput(root, "AGENTS.md", agentsContent, mergedOptions);
  results.push(`AGENTS.md (cross-platform entrypoint: ${formatWriteResult(agentsResult)})`);

  const backlogContent = readTemplate("backlog-index.md");
  const backlogResult = writeOutput(root, "docs/backlog/index.md", backlogContent, { ...mergedOptions, overwrite: false });
  results.push(`docs/backlog/index.md (${formatWriteResult(backlogResult)})`);

  const targets: Platform[] = target === "all"
    ? [...ALL_PLATFORMS]
    : Array.isArray(target)
      ? target
      : [target];

  for (const currentTarget of targets) {
    results.push(`\n[${currentTarget}]`);
    results.push(...generatePlatformFiles(root, currentTarget, effectiveStacks, mergedOptions));
  }

  return {
    projectPath: root,
    target,
    dryRun: mergedOptions.dryRun,
    overwrite: mergedOptions.overwrite,
    stacks: effectiveStacks,
    results,
  };
}
