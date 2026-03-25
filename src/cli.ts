#!/usr/bin/env node
import { createApgServer } from "./create-server.js";
import { resolveDataDir } from "./paths.js";
import { ensureOllamaModels } from "./ollama/ensure-models.js";

async function main(): Promise<void> {
  await ensureOllamaModels();
  const dataDir = resolveDataDir();
  const server = createApgServer(dataDir);
  await server.start({
    transportType: "stdio",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
