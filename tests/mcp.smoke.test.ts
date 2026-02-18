import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

test("MCP server responds to initialize handshake via CLI entrypoint", () => {
  const request = "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0.0\"}}}\n";

  const result = spawnSync(
    process.execPath,
    [join(process.cwd(), "bin", "cli.js")],
    {
      input: request,
      encoding: "utf-8",
      timeout: 10000,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.signal, null);
  assert.equal(result.stderr, "");
});
