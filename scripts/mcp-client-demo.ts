/**
 * Minimal MCP stdio client: spawn the built server and call one tool (or list tools).
 * No Claude required — uses @modelcontextprotocol/sdk like the integration test.
 *
 * Usage:
 *   npm run mcp:try
 *   npm run mcp:try -- --list
 *   npm run mcp:try -- apg_list_patterns '{"query":"carousel"}'
 *   npm run mcp:try -- apg_semantic_search '{"query":"carousel keyboard","k":3}'
 *
 * Requires: npm run build (dist/cli.js). Uses OLLAMA_SKIP_PULL=1 at spawn; RAG still needs Ollama at call time.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const cliJs = path.join(root, "dist", "cli.js");

function usage(): void {
  console.error(`Usage:
  npm run mcp:try -- --list
  npm run mcp:try -- [toolName] [argumentsJson]

Examples:
  npm run mcp:try -- apg_meta
  npm run mcp:try -- apg_list_patterns '{"query":"carousel"}'
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    usage();
    process.exit(0);
  }

  if (!fs.existsSync(cliJs)) {
    console.error(`Missing ${cliJs}. Run: npm run build`);
    process.exit(1);
  }

  const listOnly = argv.includes("--list") || argv.includes("-l");
  const rest = argv.filter((a) => a !== "--list" && a !== "-l");

  const transport = new StdioClientTransport({
    command: "node",
    args: [cliJs],
    env: { ...process.env, OLLAMA_SKIP_PULL: "1" },
    cwd: root,
    stderr: "inherit",
  });

  const client = new Client(
    { name: "mcp-client-demo", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);

  try {
    if (listOnly) {
      const { tools } = await client.listTools();
      console.log(
        JSON.stringify(
          (tools ?? []).map((t) => ({
            name: t.name,
            description: t.description,
          })),
          null,
          2,
        ),
      );
      return;
    }

    const tool = rest[0] ?? "apg_meta";
    const argsJson = rest[1] ?? "{}";
    let params: Record<string, unknown>;
    try {
      params = JSON.parse(argsJson) as Record<string, unknown>;
    } catch {
      console.error("Invalid JSON for tool arguments:", argsJson);
      usage();
      process.exit(1);
    }

    const result = await client.callTool({ name: tool, arguments: params });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
