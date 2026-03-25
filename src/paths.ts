import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./config/load-env.js";

/**
 * Directory containing manifest.json, Markdown under patterns/, and JSON bundles under bundles/.
 * Override with env APG_MCP_DATA_DIR (absolute path recommended).
 */
export function resolveDataDir(): string {
  loadEnv();
  const env = process.env.APG_MCP_DATA_DIR?.trim();
  if (env) {
    if (!fs.existsSync(path.join(env, "manifest.json"))) {
      throw new Error(
        `APG_MCP_DATA_DIR is set but manifest.json was not found: ${path.join(env, "manifest.json")}`,
      );
    }
    return env;
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const fromDist = path.join(here, "..", "data");
  if (fs.existsSync(path.join(fromDist, "manifest.json"))) {
    return path.resolve(fromDist);
  }

  const fromSrc = path.join(here, "..", "..", "data");
  if (fs.existsSync(path.join(fromSrc, "manifest.json"))) {
    return path.resolve(fromSrc);
  }

  throw new Error(
    "Could not find data/manifest.json. Run `npm run ingest` in the package root, or set APG_MCP_DATA_DIR.",
  );
}
