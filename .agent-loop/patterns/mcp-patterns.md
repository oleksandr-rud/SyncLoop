# MCP Server Patterns (M1–M5)

Patterns for building and maintaining the SyncLoop MCP server.
Referenced from [../patterns.md](../patterns.md).

Source: [@modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) + [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/)

---

## M1 · MCP Bootstrap

**Server initialization with stdio transport.**

**Use when:** Setting up the MCP server entry point · Debugging connection failures · Understanding the startup sequence · Adding a new transport type

### Minimal server bootstrap (stdio — local/CLI)

```js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "sync_loop",
  version: PACKAGE_JSON.version,   // always read from package.json
});

// Register resources, tools, prompts here (before connecting)

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Rules:**
- Always pass `version` from `package.json` — never hardcode
- Register all resources/tools/prompts **before** `server.connect()`
- `StdioServerTransport` is correct for local process-spawned integrations (VS Code MCP, Claude Desktop, Cursor)
- `await server.connect(transport)` is the last line — it blocks

### Client configuration (mcp.json / settings)

```json
{
  "servers": {
    "sync_loop": {
      "command": "node",
      "args": ["bin/cli.js"]
    }
  }
}
```

**Published npm package (Unix/Mac/Linux):**
```json
{
  "mcpServers": {
    "sync_loop": {
      "command": "npx",
      "args": ["-y", "-p", "@oleksandr.rudnychenko/sync_loop", "sync_loop"]
    }
  }
}
```

**Published npm package (Windows — VS Code):**
```json
{
  "mcpServers": {
    "sync_loop": {
      "command": "npx.cmd",
      "args": ["-y", "-p", "@oleksandr.rudnychenko/sync_loop", "sync_loop"]
    }
  }
}
```

> **Why `npx.cmd`?** VS Code spawns MCP server processes via `child_process.spawn` without a shell. On Windows, npm installs CLI wrappers as `.cmd` scripts (`npx.cmd`, not `npx`). Without the shell, only the explicit `.cmd` form resolves. Use `node bin/cli.js` for the local dev config where the path is known.

### MCP Lifecycle (handshake sequence)

```
Client                Server
  │── initialize ──────►│  { protocolVersion, capabilities, clientInfo }
  │◄── initialize resp ─│  { protocolVersion, serverCapabilities, serverInfo }
  │── initialized ───►  │  (notification — client is ready)
  │                     │
  │    [operation]      │  tools/list, resources/read, prompts/get, etc.
  │                     │
  │── disconnect ───►   │
```

**Server capabilities declared automatically by `McpServer`:**
- `resources.listChanged: true` — when resources are registered
- `tools.listChanged: true` — when tools are registered
- `prompts.listChanged: true` — when prompts are registered

---

## M2 · MCP Resources

**Expose read-only data to MCP clients.**

**Use when:** Adding a new doc/file to serve · Understanding how links are rewritten · Debugging `resources/list` or `resources/read` · Adding dynamic (parameterized) resources

### Static resource (fixed URI) — SDK 1.x API

```js
server.registerResource(
  "my-doc",                          // unique ID — used for routing
  "syncloop://docs/my-doc",          // URI scheme: syncloop://docs/{id}
  { description: "Doc description", mimeType: "text/markdown" },
  async (uri) => {
    const raw = readTemplate("path/to/file.md");
    const rewritten = rewriteResourceLinks(raw, "path/to/file.md");
    return {
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: rewritten,
      }],
    };
  },
);
```

> **Always call `rewriteResourceLinks()`** before returning content — converts internal `.agent-loop/` links to `syncloop://docs/{id}` URIs so clients can follow cross-document references.

### Dynamic resource (URI template with parameters)

```js
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

server.registerResource(
  "user-profile",
  new ResourceTemplate("user://{userId}/profile", {
    list: async () => ({
      resources: [
        { uri: "user://123/profile", name: "Alice" },
        { uri: "user://456/profile", name: "Bob" },
      ],
    }),
  }),
  {
    title: "User Profile",
    description: "User profile data",
    mimeType: "application/json",
  },
  async (uri, { userId }) => ({
    contents: [{ uri: uri.href, text: JSON.stringify({ userId }) }],
  }),
);
```

### DOCS registry (sync_loop pattern)

In `src/server.js`, all resources are driven from the `DOCS` map:

```js
const DOCS = {
  "reasoning-kernel": {
    path: ".agent-loop/reasoning-kernel.md",   // relative to template/
    name: "Reasoning Kernel",
    description: "...",
  },
  // ...
};

// Auto-register all docs
for (const [id, doc] of Object.entries(DOCS)) {
  server.registerResource(
    doc.name,
    `syncloop://docs/${id}`,
    { description: doc.description, mimeType: "text/markdown" },
    async (uri) => {
      const raw = readTemplate(doc.path);
      const rewritten = rewriteResourceLinks(raw, doc.path);
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: rewritten }] };
    },
  );
}
```

**Rule:** New template files → add entry to `DOCS` → auto-registered. Never hardcode individual `registerResource` calls outside this loop.

---

## M3 · MCP Tools

**Expose callable actions to MCP clients.**

**Use when:** Adding a new tool · Debugging `tools/call` errors · Adding input validation · Returning structured output

### Tool with Zod input schema — SDK 1.x API

```js
import { z } from "zod";

server.registerTool(
  "my-tool",
  {
    title: "Human-Readable Title",
    description: "What this tool does — shown to the agent",
    inputSchema: {
      projectPath: z.string().optional().describe("Root path"),
      target: z.enum(["copilot", "cursor", "claude", "all"]).optional().default("all"),
      dryRun: z.boolean().optional().default(false),
    },
  },
  async ({ projectPath, target, dryRun }) => {
    try {
      // ... do work
      return {
        content: [{ type: "text", text: "Result text here" }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);
```

**Always return `isError: true`** in catch — never throw from a tool handler. The SDK wraps errors, but explicit `isError` makes failures visible to the agent.

### Tool returning resource links (lazy content)

```js
server.registerTool("list-docs", {}, async () => ({
  content: [
    { type: "resource_link", uri: "syncloop://docs/reasoning-kernel", name: "Reasoning Kernel", mimeType: "text/markdown" },
    { type: "resource_link", uri: "syncloop://docs/patterns", name: "Patterns", mimeType: "text/markdown" },
  ],
}));
```

### Tool with logging

```js
server.registerTool("fetch-data", { inputSchema: { url: z.string() } }, async ({ url }, ctx) => {
  await ctx.mcpReq.log("info", `Fetching ${url}`);
  const res = await fetch(url);
  await ctx.mcpReq.log("debug", `Status: ${res.status}`);
  return { content: [{ type: "text", text: await res.text() }] };
});
```

### `init` tool (sync_loop canonical pattern)

The `init` tool in `src/server.js` is the main action tool. Its shape must stay stable:

```
Input:  { projectPath?, target?, stacks?, dryRun?, overwrite? }
Output: content[] with init results, stack summary, bootstrap prompt, JSON result
```

**Never** implement scaffolding logic inside the tool handler — delegate to `init()` from `src/init.js`.

---

## M4 · MCP Prompts

**Expose reusable prompt templates.**

**Use when:** Adding a new prompt · Debugging `prompts/get` · Adding argument autocompletion

### Basic prompt — SDK 1.x API

```js
server.registerPrompt(
  "my-prompt",
  {
    description: "What this prompt is for — shown in the client",
    // No argsSchema = prompt takes no arguments
  },
  async () => ({
    description: "Scan repo and wire the SyncLoop protocol",
    messages: [{
      role: "user",
      content: { type: "text", text: readTemplate("bootstrap-prompt.md") },
    }],
  }),
);
```

### Prompt with argument schema

```js
server.registerPrompt(
  "review-code",
  {
    title: "Code Review",
    description: "Review code for best practices",
    argsSchema: z.object({
      language: z.string().describe("Programming language"),
      code: z.string().describe("Code to review"),
    }),
  },
  ({ language, code }) => ({
    messages: [{
      role: "user",
      content: { type: "text", text: `Review this ${language} code:\n\n${code}` },
    }],
  }),
);
```

### sync_loop canonical prompts

| Prompt ID | Template file | Purpose |
|-----------|--------------|---------|
| `bootstrap` | `bootstrap-prompt.md` | Wire SyncLoop to an existing project |
| `protocol` | `protocol-summary.md` | Inject condensed protocol as system context |

**Rule:** Prompts return file contents via `readTemplate()` — never inline large strings in the handler.

---

## M5 · MCP Capability Negotiation

**Understanding what capabilities are exchanged and what they enable.**

**Use when:** Debugging initialization failures · Adding new capability types · Understanding why a feature isn't available

### Server capabilities (declared by McpServer automatically)

| Capability | Declared when | Enables |
|-----------|---------------|---------|
| `resources.listChanged` | Any `registerResource()` call | Server can notify client when resource list changes |
| `tools.listChanged` | Any `registerTool()` call | Server can notify client when tool list changes |
| `prompts.listChanged` | Any `registerPrompt()` call | Server can notify client when prompt list changes |

### Valid initialize handshake (verified working)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "my-client", "version": "1.0.0" }
  }
}
```

`clientInfo` is **required** by the SDK validator (`zod` will reject requests without it). The AGENTS.md smoke test must include it.

### Smoke test command

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node bin/cli.js
```

Expected: JSON response with `result.serverInfo.name === "sync_loop"` and `result.capabilities` declaring resources, tools, prompts.

---

## Common Errors

| Symptom | Why It Happens | Fix |
|---------|----------------|-----|
| `'sync_loop' is not recognized` on Windows | VS Code spawns without shell; `npx` resolves to `npx.cmd` | Use `"command": "npx.cmd"` or `"command": "node"` with local path |
| `clientInfo` validation error on initialize | SDK requires `clientInfo` object in `initialize` params | Add `"clientInfo": {"name":"...","version":"..."}` to test payload |
| Resource content has broken links | `rewriteResourceLinks()` not called | Always call before returning `contents` |
| New template file not showing as resource | Not added to `DOCS` map in `server.js` | Add entry to `DOCS` — auto-registration handles the rest |
| Tool logic leaking into `server.js` | Scaffolding code written in tool handler | Delegate to `src/init.js` — transport layer is boundary only |
| `typedHandler is not a function` | Old SDK API: passing description string as 2nd arg | Use config object: `{ description, inputSchema }` as 2nd arg |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [../patterns.md](../patterns.md) | Pattern registry — this spec is registered here |
| [code-patterns.md](code-patterns.md) | P1–P11 general code patterns |
| [../validate-env.md](../validate-env.md) | MCP smoke test is the primary gate for this codebase |
