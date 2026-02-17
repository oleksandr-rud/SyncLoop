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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readTemplate(relativePath) {
  return readFileSync(join(TEMPLATE_DIR, relativePath), "utf-8");
}

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
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

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function detectPackageManager(dirPath) {
  if (existsSync(join(dirPath, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(dirPath, "yarn.lock"))) return "yarn";
  if (existsSync(join(dirPath, "package-lock.json"))) return "npm";
  if (existsSync(join(dirPath, "uv.lock"))) return "uv";
  return "npm";
}

function runCommandPrefix(packageManager) {
  if (packageManager === "npm") return "npm run";
  if (packageManager === "pnpm") return "pnpm";
  if (packageManager === "yarn") return "yarn";
  return `${packageManager} run`;
}

function detectNodeFrameworks(pkg) {
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const frameworks = [];
  const known = [
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

function detectNodeStack(projectPath, relativePath = "") {
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

function detectPythonStack(projectPath, relativePath = "") {
  const stackRoot = join(projectPath, relativePath);
  const pyprojectPath = join(stackRoot, "pyproject.toml");
  const requirementsPath = join(stackRoot, "requirements.txt");
  if (!existsSync(pyprojectPath) && !existsSync(requirementsPath)) return null;

  const pyproject = existsSync(pyprojectPath) ? readFileSync(pyprojectPath, "utf-8").toLowerCase() : "";
  const reqs = existsSync(requirementsPath) ? readFileSync(requirementsPath, "utf-8").toLowerCase() : "";
  const merged = `${pyproject}\n${reqs}`;

  const frameworks = [];
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

export function detectStacks(projectPath) {
  const root = resolve(projectPath);
  const candidates = [""];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules") continue;
    candidates.push(entry.name);
  }

  const stacks = [];
  for (const rel of candidates) {
    const nodeStack = detectNodeStack(root, rel);
    if (nodeStack) stacks.push(nodeStack);
    const pythonStack = detectPythonStack(root, rel);
    if (pythonStack) stacks.push(pythonStack);
  }

  const deduped = [];
  const seen = new Set();
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

function writeOutput(projectPath, relativePath, content, options = {}) {
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

function formatWriteResult(result) {
  if (result.status === "skipped") return `${result.path} (skipped: exists)`;
  if (result.status.startsWith("would-")) return `${result.path} (dry-run)`;
  return result.path;
}

function yamlFrontmatter(fields) {
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

const SOURCE_FILES = [
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

// ---------------------------------------------------------------------------
// Platform configs
// ---------------------------------------------------------------------------

const COPILOT = {
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

const CURSOR = {
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

const CLAUDE = {
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

const PLATFORM_CONFIGS = { copilot: COPILOT, cursor: CURSOR, claude: CLAUDE };

// ---------------------------------------------------------------------------
// Link rewriting
// ---------------------------------------------------------------------------

const CANONICAL_TO_ID = {};
for (const source of SOURCE_FILES) {
  CANONICAL_TO_ID[source.path.replace(".agent-loop/", "")] = source.id;
}

function buildTargetMap(platform) {
  const config = PLATFORM_CONFIGS[platform];
  const map = {};
  for (const [id, entry] of Object.entries(config)) {
    map[id] = toPosixPath(entry.target);
  }
  return map;
}

function resolveCanonicalLink(linkPath, sourceId) {
  const source = SOURCE_FILES.find((item) => item.id === sourceId);
  if (!source) return linkPath;

  const sourceRelPath = source.path.replace(".agent-loop/", "");
  const sourceDir = pathDir(sourceRelPath);
  const normalized = posix.normalize(posix.join(sourceDir || ".", linkPath));
  return normalized.replace(/^\.\//, "");
}

function rewriteSpecLinks(content, sourceId, platform) {
  const targetMap = buildTargetMap(platform);
  const currentTargetPath = targetMap[sourceId];
  const currentDir = pathDir(currentTargetPath);

  return rewriteMarkdownLinks(content, (linkPath) => {
    if (isExternalLink(linkPath)) return linkPath;

    const { pathPart, hash } = splitHash(linkPath);
    if (!pathPart) return linkPath;

    const canonical = resolveCanonicalLink(pathPart, sourceId);

    if (
      pathPart === "../AGENTS.md" ||
      canonical === "../AGENTS.md" ||
      canonical === "AGENTS.md"
    ) {
      const rel = posix.relative(currentDir || ".", "AGENTS.md") || "AGENTS.md";
      return `${rel}${hash}`;
    }

    if (
      pathPart === "../README.md" ||
      canonical === "../README.md"
    ) {
      const rel = posix.relative(currentDir || ".", "README.md") || "README.md";
      return `${rel}${hash}`;
    }

    if (pathPart === "patterns/" || pathPart === "patterns") {
      const targetPath = targetMap.patterns;
      if (!targetPath) return linkPath;
      const rel = posix.relative(currentDir || ".", targetPath) || posix.basename(targetPath);
      return `${rel}${hash}`;
    }

    const docId = CANONICAL_TO_ID[canonical];
    if (!docId) return linkPath;

    const targetPath = targetMap[docId];
    if (!targetPath) return linkPath;

    const rel = posix.relative(currentDir || ".", targetPath) || posix.basename(targetPath);
    return `${rel}${hash}`;
  });
}

function rewriteAgentsLinks(content, platform) {
  if (platform === "all") return content;

  const config = PLATFORM_CONFIGS[platform];
  const pathMap = {};
  for (const source of SOURCE_FILES) {
    const entry = config[source.id];
    if (entry) pathMap[source.path] = entry.target;
  }

  const platformDir = Object.values(config)[0].target.split("/").slice(0, -1).join("/");
  let result = content;

  result = result.replace(/\]\(\.agent-loop\/([^)]+)\)/g, (_match, relPath) => {
    const fullPath = `.agent-loop/${relPath}`;
    if (pathMap[fullPath]) return `](${pathMap[fullPath]})`;
    if (relPath === "patterns/" || relPath === "patterns") return `](${platformDir}/)`;
    return `](${fullPath})`;
  });

  result = result.replace(/`\.agent-loop\/([^`]+)`/g, (_match, relPath) => {
    const fullPath = `.agent-loop/${relPath}`;
    if (pathMap[fullPath]) return `\`${pathMap[fullPath]}\``;
    if (relPath.startsWith("patterns/") || relPath === "patterns") return `\`${platformDir}/\``;
    return `\`${fullPath}\``;
  });

  result = result.replace(
    /Routes into `\.agent-loop\/`/,
    `Routes into \`${platformDir}/\``,
  );
  return result;
}

// ---------------------------------------------------------------------------
// Environment placeholder replacement
// ---------------------------------------------------------------------------

function applyStacks(content, stacks) {
  if (!stacks || stacks.length === 0) return content;

  const testRunners = stacks.map((stack) => stack.testRunner).filter(Boolean);
  const typeCheckers = stacks.map((stack) => stack.typeChecker).filter(Boolean);
  const linters = stacks.map((stack) => stack.linter).filter(Boolean);
  const packageManagers = [...new Set(stacks.map((stack) => stack.packageManager).filter(Boolean))];

  const stackRows = stacks
    .map((stack) => `| ${stack.name}${stack.path ? ` (\`${stack.path}\`)` : ""} | ${stack.languages.join(", ")} | ${stack.frameworks.join(", ")} |`)
    .join("\n");
  const stackTable = `| Stack | Languages | Frameworks |\n|-------|-----------|------------|\n${stackRows}`;

  const replacements = {
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

function generatePlatformFiles(projectPath, platform, stacks, options) {
  const config = PLATFORM_CONFIGS[platform];
  const results = [];

  for (const source of SOURCE_FILES) {
    const entry = config[source.id];
    if (!entry) continue;

    let content = applyStacks(readTemplate(source.path), stacks);
    content = rewriteSpecLinks(content, source.id, platform);
    const frontmatter = yamlFrontmatter(entry.fm);
    const writeResult = writeOutput(projectPath, entry.target, `${frontmatter}\n\n${content}`, options);
    results.push(`  ${formatWriteResult(writeResult)}`);
  }

  const platformDir = Object.values(config)[0].target.split("/").slice(0, -1).join("/");
  const summary = readTemplate("protocol-summary.md")
    .replace(/`\.agent-loop\/`/, `\`${platformDir}/\``);

  if (platform === "copilot") {
    const writeResult = writeOutput(projectPath, ".github/copilot-instructions.md", summary, options);
    results.push(`  ${formatWriteResult(writeResult)}`);
  } else if (platform === "cursor") {
    const frontmatter = yamlFrontmatter({ description: "SyncLoop protocol summary and guardrails", alwaysApply: true });
    const writeResult = writeOutput(projectPath, ".cursor/rules/00-protocol.md", `${frontmatter}\n\n${summary}`, options);
    results.push(`  ${formatWriteResult(writeResult)}`);
  } else if (platform === "claude") {
    const writeResult = writeOutput(projectPath, "CLAUDE.md", summary, options);
    results.push(`  ${formatWriteResult(writeResult)}`);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function init(projectPath, target = "all", stacks = [], options = {}) {
  const root = resolve(projectPath);
  const effectiveStacks = stacks?.length ? stacks : detectStacks(root);
  const mergedOptions = {
    dryRun: Boolean(options.dryRun),
    overwrite: options.overwrite ?? true,
  };

  const validTargets = ["copilot", "cursor", "claude", "all"];
  if (!validTargets.includes(target)) {
    throw new Error(`Unknown target "${target}". Use one of: ${validTargets.join(", ")}`);
  }

  const results = [];

  if (target === "all") {
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
  }

  const agentsContent = rewriteAgentsLinks(
    applyStacks(readTemplate("AGENTS.md"), effectiveStacks),
    target === "all" ? "all" : target,
  );
  const agentsResult = writeOutput(root, "AGENTS.md", agentsContent, mergedOptions);
  results.push(`AGENTS.md (cross-platform entrypoint: ${formatWriteResult(agentsResult)})`);

  const targets = target === "all" ? ["copilot", "cursor", "claude"] : [target];
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
