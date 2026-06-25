#!/usr/bin/env node
import { createApgServer } from "./create-server.js";
import { resolveDataDir } from "./paths.js";
import { ensureOllamaModels } from "./ollama/ensure-models.js";

/**
 * Run after stdio MCP is up so clients (e.g. Claude Code with a short MCP timeout) do not wait
 * on Ollama HTTP before the handshake. The inspector is more tolerant; Claude often is not.
 */
function ensureOllamaModelsInBackground(): void {
  void (async () => {
    try {
      await ensureOllamaModels();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[accessibility-mcp] Ollama model check failed (${msg}).`);
      console.error(
        "[accessibility-mcp] APG list/get tools still work. For RAG, fix Ollama or set OLLAMA_SKIP_PULL=1.",
      );
    }
  })();
}

async function main(): Promise<void> {
  const dataDir = resolveDataDir();
  const server = createApgServer(dataDir);
  await server.start({
    transportType: "stdio",
  });
  ensureOllamaModelsInBackground();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
