import fs from "node:fs";
import path from "node:path";
import type { RagIndexFile } from "./types.js";

export function ragIndexPath(dataDir: string): string {
  return path.join(dataDir, "rag", "chunks.json");
}

export function loadRagIndex(dataDir: string): RagIndexFile | null {
  const p = ragIndexPath(dataDir);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw) as RagIndexFile;
    if (data.version !== 1 || !Array.isArray(data.chunks)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeRagIndex(dataDir: string, index: RagIndexFile): void {
  const p = ragIndexPath(dataDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(index), "utf8");
}
