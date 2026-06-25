import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

let loaded = false;

/**
 * Loads `.env` from the package root (next to `package.json`).
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, "..", "..");
  /** `quiet` avoids printing to **stdout** — required for MCP stdio (JSON-RPC must own stdout). */
  dotenv.config({ path: path.join(root, ".env"), quiet: true });
}
