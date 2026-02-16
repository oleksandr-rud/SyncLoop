import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, "..", "template");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readTemplate(relativePath) {
  return readFileSync(join(TEMPLATE_DIR, relativePath), "utf-8");
}

function writeOutput(projectPath, relativePath, content) {
  const fullPath = join(projectPath, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
  return relativePath;
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
// Source file list (maps to template/.agent-loop/)
// ---------------------------------------------------------------------------

const SOURCE_FILES = [
  { id: "reasoning-kernel",     path: ".agent-loop/reasoning-kernel.md" },
  { id: "feedback",             path: ".agent-loop/feedback.md" },
  { id: "validate-env",         path: ".agent-loop/validate-env.md" },
  { id: "validate-n",           path: ".agent-loop/validate-n.md" },
  { id: "patterns",             path: ".agent-loop/patterns.md" },
  { id: "glossary",             path: ".agent-loop/glossary.md" },
  { id: "code-patterns",        path: ".agent-loop/patterns/code-patterns.md" },
  { id: "testing-guide",        path: ".agent-loop/patterns/testing-guide.md" },
  { id: "refactoring-workflow",  path: ".agent-loop/patterns/refactoring-workflow.md" },
  { id: "api-standards",        path: ".agent-loop/patterns/api-standards.md" },
];

// ---------------------------------------------------------------------------
// Platform configs  —  source ID → { target path, YAML frontmatter }
// ---------------------------------------------------------------------------

const COPILOT = {
  "reasoning-kernel":    { target: ".github/instructions/reasoning-kernel.instructions.md",    fm: { name: "SyncLoop: Reasoning Kernel",       description: "7-stage agent reasoning loop with context clearage",               applyTo: "**/*" } },
  "feedback":            { target: ".github/instructions/feedback.instructions.md",            fm: { name: "SyncLoop: Feedback Loop",          description: "Failure diagnosis, patch protocol, branch pruning",               applyTo: "**/*" } },
  "validate-env":        { target: ".github/instructions/validate-env.instructions.md",        fm: { name: "SyncLoop: Validate Environment",   description: "NFR gates: types, tests, layers, complexity",                     applyTo: "**/*" } },
  "validate-n":          { target: ".github/instructions/validate-n.instructions.md",          fm: { name: "SyncLoop: Validate Neighbors",     description: "Shape, boundary, bridge checks",                                  applyTo: "**/*" } },
  "patterns":            { target: ".github/instructions/patterns.instructions.md",            fm: { name: "SyncLoop: Pattern Registry",       description: "Pattern routing and learned patterns",                            applyTo: "**/*" } },
  "glossary":            { target: ".github/instructions/glossary.instructions.md",            fm: { name: "SyncLoop: Glossary",               description: "Canonical terminology",                                           applyTo: "**/*" } },
  "code-patterns":       { target: ".github/instructions/code-patterns.instructions.md",       fm: { name: "SyncLoop: Code Patterns",          description: "P1-P11 implementation patterns",                                  applyTo: "{src,app,lib}/**/*.{ts,py,js,jsx,tsx}" } },
  "testing-guide":       { target: ".github/instructions/testing-guide.instructions.md",       fm: { name: "SyncLoop: Testing Guide",          description: "Test patterns and strategies",                                    applyTo: "{tests,test,__tests__}/**/*" } },
  "refactoring-workflow":{ target: ".github/instructions/refactoring-workflow.instructions.md", fm: { name: "SyncLoop: Refactoring Workflow",   description: "4-phase refactoring checklist",                                   applyTo: "**/*" } },
  "api-standards":       { target: ".github/instructions/api-standards.instructions.md",       fm: { name: "SyncLoop: API Standards",          description: "Boundary contracts and API conventions",                          applyTo: "{routes,routers,controllers,api}/**/*" } },
};

const CURSOR = {
  "reasoning-kernel":    { target: ".cursor/rules/01-reasoning-kernel.md",    fm: { description: "7-stage agent reasoning loop with context clearage and transitions",   alwaysApply: true } },
  "feedback":            { target: ".cursor/rules/02-feedback.md",            fm: { description: "Failure diagnosis, patch protocol, micro-loop, branch pruning",          alwaysApply: true } },
  "validate-env":        { target: ".cursor/rules/03-validate-env.md",        fm: { description: "Stage 1 NFR gates: types, tests, layers, complexity, debug hygiene",     alwaysApply: true } },
  "validate-n":          { target: ".cursor/rules/04-validate-n.md",          fm: { description: "Stage 2 checks: shapes, boundaries, bridges",                            alwaysApply: true } },
  "patterns":            { target: ".cursor/rules/05-patterns.md",            fm: { description: "Pattern routing index and learned patterns",                              alwaysApply: true } },
  "glossary":            { target: ".cursor/rules/06-glossary.md",            fm: { description: "Canonical domain terminology and naming rules",                           alwaysApply: true } },
  "code-patterns":       { target: ".cursor/rules/07-code-patterns.md",       fm: { description: "P1-P11 implementation patterns for layered code",                        globs: "{src,app,lib}/**/*.{ts,py,js,jsx,tsx}" } },
  "testing-guide":       { target: ".cursor/rules/08-testing-guide.md",       fm: { description: "Test patterns, fixtures, mocks, strategies",                              globs: "{tests,test,__tests__}/**/*" } },
  "refactoring-workflow":{ target: ".cursor/rules/09-refactoring-workflow.md", fm: { description: "4-phase refactoring checklist for safe restructuring",                   alwaysApply: false } },
  "api-standards":       { target: ".cursor/rules/10-api-standards.md",       fm: { description: "Boundary contracts, typed models, error envelopes",                       globs: "{routes,routers,controllers,api}/**/*" } },
};

const CLAUDE = {
  "reasoning-kernel":    { target: ".claude/rules/reasoning-kernel.md",    fm: { paths: ["**/*"] } },
  "feedback":            { target: ".claude/rules/feedback.md",            fm: { paths: ["**/*"] } },
  "validate-env":        { target: ".claude/rules/validate-env.md",        fm: { paths: ["**/*"] } },
  "validate-n":          { target: ".claude/rules/validate-n.md",          fm: { paths: ["**/*"] } },
  "patterns":            { target: ".claude/rules/patterns.md",            fm: { paths: ["**/*"] } },
  "glossary":            { target: ".claude/rules/glossary.md",            fm: { paths: ["**/*"] } },
  "code-patterns":       { target: ".claude/rules/code-patterns.md",       fm: { paths: ["src/**", "app/**", "lib/**"] } },
  "testing-guide":       { target: ".claude/rules/testing-guide.md",       fm: { paths: ["tests/**", "test/**", "__tests__/**"] } },
  "refactoring-workflow":{ target: ".claude/rules/refactoring-workflow.md", fm: { paths: ["**/*"] } },
  "api-standards":       { target: ".claude/rules/api-standards.md",       fm: { paths: ["**/routes/**", "**/api/**", "**/controllers/**"] } },
};

const PLATFORM_CONFIGS = { copilot: COPILOT, cursor: CURSOR, claude: CLAUDE };

// ---------------------------------------------------------------------------
// Link rewriting — rewrite .agent-loop/ refs to platform-specific paths
// ---------------------------------------------------------------------------

// Map from canonical .agent-loop/ filename to source ID
const CANONICAL_TO_ID = {};
for (const s of SOURCE_FILES) {
  // ".agent-loop/reasoning-kernel.md" → "reasoning-kernel"
  CANONICAL_TO_ID[s.path.replace(".agent-loop/", "")] = s.id;
}

/**
 * Build a lookup: source-id → target filename (basename only, since platform
 * files live in one flat directory per platform).
 */
function buildTargetMap(platform) {
  const config = PLATFORM_CONFIGS[platform];
  const map = {};
  for (const [id, entry] of Object.entries(config)) {
    // e.g. ".github/instructions/feedback.instructions.md" → "feedback.instructions.md"
    map[id] = entry.target.split("/").pop();
  }
  return map;
}

/**
 * Rewrite internal cross-references inside a spec file.
 *
 * Template files use relative paths like:
 *   [reasoning-kernel.md](reasoning-kernel.md)
 *   [patterns/code-patterns.md](patterns/code-patterns.md)
 *   [../AGENTS.md](../AGENTS.md)
 *
 * For a platform target these must point to sibling files in the same directory.
 */
function rewriteSpecLinks(content, sourceId, platform) {
  const targetMap = buildTargetMap(platform);
  const sourceFile = SOURCE_FILES.find(s => s.id === sourceId);
  // Is this file in a subdirectory (patterns/)?
  const isNested = sourceFile?.path.includes("patterns/") && sourceId !== "patterns";

  return content.replace(/\]\(([^)]+\.md)\)/g, (_match, linkPath) => {
    // Normalize: resolve relative paths from the source file's perspective
    let canonical = linkPath;

    if (isNested) {
      // Files in patterns/ use "../" to reach parent-level siblings
      if (canonical.startsWith("../")) {
        canonical = canonical.replace(/^\.\.\//, "");
      } else {
        // Sibling reference within patterns/ → prefix with "patterns/"
        canonical = `patterns/${canonical}`;
      }
    }

    // Handle ../AGENTS.md → just skip (AGENTS.md is at root, not in platform dir)
    if (canonical === "AGENTS.md" || canonical === "../AGENTS.md") {
      return "](../AGENTS.md)";
    }

    // Handle ../README.md (agent-loop readme — not relevant for platform files)
    if (canonical === "README.md" || canonical === "../README.md") {
      return `](${linkPath})`;
    }

    // Look up the target filename for this canonical path
    const id = CANONICAL_TO_ID[canonical];
    if (id && targetMap[id]) {
      return `](${targetMap[id]})`;
    }

    // No match — keep original
    return `](${linkPath})`;
  });
}

/**
 * Rewrite AGENTS.md links from .agent-loop/ paths to platform-specific paths.
 *
 * For target="all" links stay as .agent-loop/ (canonical source exists).
 * For single platform, links point into that platform's directory.
 */
function rewriteAgentsLinks(content, platform) {
  if (platform === "all") return content;

  const config = PLATFORM_CONFIGS[platform];

  // Build map: ".agent-loop/reasoning-kernel.md" → platform target path
  const pathMap = {};
  for (const source of SOURCE_FILES) {
    const entry = config[source.id];
    if (entry) {
      pathMap[source.path] = entry.target;
    }
  }

  // Also map the patterns/ directory reference
  const platformDir = Object.values(config)[0].target.split("/").slice(0, -1).join("/");

  let result = content;

  // Rewrite markdown links: [text](.agent-loop/xxx.md) → [text](platform/xxx.md)
  result = result.replace(/\]\(\.agent-loop\/([^)]+)\)/g, (_match, relPath) => {
    const fullPath = `.agent-loop/${relPath}`;
    if (pathMap[fullPath]) {
      return `](${pathMap[fullPath]})`;
    }
    // Directory reference like .agent-loop/patterns/
    if (relPath === "patterns/" || relPath === "patterns") {
      return `](${platformDir}/)`;
    }
    return `](${fullPath})`;
  });

  // Rewrite inline backtick references: `.agent-loop/patterns.md` → platform path
  result = result.replace(/`\.agent-loop\/([^`]+)`/g, (_match, relPath) => {
    const fullPath = `.agent-loop/${relPath}`;
    if (pathMap[fullPath]) {
      return `\`${pathMap[fullPath]}\``;
    }
    if (relPath.startsWith("patterns/") || relPath === "patterns") {
      return `\`${platformDir}/\``;
    }
    return `\`${fullPath}\``;
  });

  // Rewrite the intro line
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

  // Aggregate across all stacks
  const allLanguages = [...new Set(stacks.flatMap(s => s.languages))];
  const allFrameworks = [...new Set(stacks.flatMap(s => s.frameworks))];
  const testRunners = stacks.map(s => s.testRunner).filter(Boolean);
  const typeCheckers = stacks.map(s => s.typeChecker).filter(Boolean);
  const linters = stacks.map(s => s.linter).filter(Boolean);
  const packageManagers = [...new Set(stacks.map(s => s.packageManager).filter(Boolean))];

  // Build stack table for AGENTS.md
  const stackRows = stacks.map(s =>
    `| ${s.name}${s.path ? ` (\`${s.path}\`)` : ""} | ${s.languages.join(", ")} | ${s.frameworks.join(", ")} |`
  ).join("\n");
  const stackTable = `| Stack | Languages | Frameworks |\n|-------|-----------|------------|\n${stackRows}`;

  const replacements = {
    "{typecheck command}": typeCheckers.join(" && ") || "{typecheck command}",
    "{lint command}": linters.join(" && ") || "{lint command}",
    "{test command}": testRunners.join(" && ") || "{test command}",
    "{targeted test command}": testRunners[0] ? `${testRunners[0]} {path}` : "{targeted test command}",
    "{install command}": packageManagers.map(pm => `${pm} install`).join(" && ") || "{install command}",
  };

  let result = content;

  // Replace the entire Layer/Stack table section (handles \r\n line endings)
  result = result.replace(
    /\| Layer \| Stack \|\r?\n\|[-|]+\|\r?\n\| Backend \|[^\r\n]*\|\r?\n\| Frontend \|[^\r\n]*\|\r?\n\| Infra \|[^\r\n]*\|/,
    stackTable,
  );

  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replaceAll(placeholder, value);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Platform file generation
// ---------------------------------------------------------------------------

function generatePlatformFiles(projectPath, platform, stacks) {
  const config = PLATFORM_CONFIGS[platform];
  const results = [];

  // Generate per-doc files with frontmatter + rewritten links
  for (const source of SOURCE_FILES) {
    const entry = config[source.id];
    if (!entry) continue;

    let content = applyStacks(readTemplate(source.path), stacks);
    content = rewriteSpecLinks(content, source.id, platform);
    const frontmatter = yamlFrontmatter(entry.fm);
    writeOutput(projectPath, entry.target, `${frontmatter}\n\n${content}`);
    results.push(`  ${entry.target}`);
  }

  // Generate condensed entrypoint per platform
  const platformDir = Object.values(config)[0].target.split("/").slice(0, -1).join("/");
  const summary = readTemplate("protocol-summary.md")
    .replace(/`\.agent-loop\/`/, `\`${platformDir}/\``);

  if (platform === "copilot") {
    writeOutput(projectPath, ".github/copilot-instructions.md", summary);
    results.push("  .github/copilot-instructions.md");
  } else if (platform === "cursor") {
    const fm = yamlFrontmatter({ description: "SyncLoop protocol summary and guardrails", alwaysApply: true });
    writeOutput(projectPath, ".cursor/rules/00-protocol.md", `${fm}\n\n${summary}`);
    results.push("  .cursor/rules/00-protocol.md");
  } else if (platform === "claude") {
    writeOutput(projectPath, "CLAUDE.md", summary);
    results.push("  CLAUDE.md");
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function init(projectPath, target, stacks) {
  const results = [];

  // 1. Copy .agent-loop/ canonical source — only for "all" (multi-platform needs the shared source)
  if (target === "all") {
    const agentLoopSrc = join(TEMPLATE_DIR, ".agent-loop");
    const agentLoopDest = join(projectPath, ".agent-loop");
    cpSync(agentLoopSrc, agentLoopDest, { recursive: true });

    // Pre-fill stack placeholders in canonical source files
    if (stacks && stacks.length > 0) {
      for (const source of SOURCE_FILES) {
        const destFile = join(projectPath, source.path);
        try {
          const content = readFileSync(destFile, "utf-8");
          const updated = applyStacks(content, stacks);
          if (updated !== content) writeFileSync(destFile, updated, "utf-8");
        } catch { /* skip if file doesn't exist */ }
      }
    }
    results.push(".agent-loop/ (canonical source)");
  }

  // AGENTS.md — always generated as root entrypoint
  // For single-platform targets, rewrite .agent-loop/ links to platform paths
  const effectivePlatform = target === "all" ? "all" : target;
  let agentsMd = readTemplate("AGENTS.md");
  if (stacks?.length) agentsMd = applyStacks(agentsMd, stacks);
  agentsMd = rewriteAgentsLinks(agentsMd, effectivePlatform);
  writeOutput(projectPath, "AGENTS.md", agentsMd);
  results.push("AGENTS.md (cross-platform entrypoint)");

  // 2. Generate platform-specific files
  const targets = target === "all" ? ["copilot", "cursor", "claude"] : [target];
  for (const t of targets) {
    results.push(`\n[${t}]`);
    results.push(...generatePlatformFiles(projectPath, t, stacks));
  }

  return results;
}
