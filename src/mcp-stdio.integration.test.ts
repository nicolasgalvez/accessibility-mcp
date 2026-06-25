import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, describe, expect, it } from "vitest";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const cliJs = path.join(root, "dist", "cli.js");

/**
 * Spawns `node dist/cli.js`, completes the MCP initialize handshake, and lists tools.
 * Catches stdout pollution (e.g. dotenv) and Claude-style reconnect failures.
 *
 * Requires `npm run build` first (`dist/cli.js`).
 */
describe.skipIf(!fs.existsSync(cliJs))("MCP stdio (dist/cli.js)", () => {
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;

  afterEach(async () => {
    try {
      await client?.close();
    } finally {
      client = undefined;
      transport = undefined;
    }
  });

  it("handshakes and exposes apg_meta without polluting stdout", async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: [cliJs],
      env: {
        ...process.env,
        OLLAMA_SKIP_PULL: "1",
      },
      cwd: root,
      stderr: "pipe",
    });

    const stderrChunks: Buffer[] = [];
    const stderr = transport.stderr;
    if (stderr && "on" in stderr) {
      stderr.on("data", (d: Buffer) => stderrChunks.push(d));
    }

    client = new Client(
      { name: "vitest-mcp", version: "0.0.0" },
      { capabilities: {} },
    );
    await client.connect(transport);

    const { tools } = await client.listTools();
    const names = (tools ?? []).map((t) => t.name);
    expect(names).toContain("apg_meta");
    expect(names).toContain("apg_list_patterns");

    const call = await client.callTool({ name: "apg_meta", arguments: {} });
    expect(call.isError).not.toBe(true);
    const text = (call.content as { type: string; text?: string }[]).find(
      (c) => c.type === "text",
    )?.text;
    expect(text).toBeDefined();
    expect(JSON.parse(text as string)).toMatchObject({
      sourceRepo: expect.any(String),
    });

    const joined = Buffer.concat(stderrChunks).toString("utf8");
    expect(joined).not.toMatch(/\[dotenv@/);
  });
});
