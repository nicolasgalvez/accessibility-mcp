import fs from "node:fs";
import path from "node:path";
import type { ApgManifest } from "../manifest-types.js";
import type { RagIndexFile } from "../rag/types.js";

export type ValidationIssue = { level: "error" | "warn"; message: string };

/** Check manifest ↔ files on disk (patterns + bundles). */
export function validateManifestFiles(dataDir: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const manifestPath = path.join(dataDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    issues.push({ level: "error", message: "missing data/manifest.json" });
    return issues;
  }
  let manifest: ApgManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ApgManifest;
  } catch (e) {
    issues.push({ level: "error", message: `manifest.json parse error: ${e}` });
    return issues;
  }
  if (!Array.isArray(manifest.patterns)) {
    issues.push({
      level: "error",
      message: "manifest.patterns is not an array",
    });
    return issues;
  }

  for (const p of manifest.patterns) {
    const md = path.join(dataDir, p.markdownRelativePath);
    if (!fs.existsSync(md)) {
      issues.push({
        level: "error",
        message: `missing pattern doc: ${p.markdownRelativePath}`,
      });
    }
    for (const ex of p.examples) {
      const bp = path.join(dataDir, ex.bundleRelativePath);
      if (!fs.existsSync(bp)) {
        issues.push({
          level: "error",
          message: `missing bundle: ${ex.bundleRelativePath}`,
        });
      }
    }
  }
  return issues;
}

/** Check RAG index shape and numeric sanity (NaN, dimension consistency). */
export function validateRagIndex(idx: RagIndexFile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (idx.version !== 1) {
    issues.push({
      level: "error",
      message: `unexpected rag index version: ${idx.version}`,
    });
  }
  if (idx.chunkCount !== idx.chunks.length) {
    issues.push({
      level: "error",
      message: `chunkCount (${idx.chunkCount}) !== chunks.length (${idx.chunks.length})`,
    });
  }
  if (idx.chunks.length === 0) {
    issues.push({ level: "error", message: "RAG index has zero chunks" });
    return issues;
  }

  const dim = idx.chunks[0]!.embedding.length;
  if (dim < 8) {
    issues.push({
      level: "warn",
      message: `unexpected embedding dimension: ${dim}`,
    });
  }

  for (const c of idx.chunks) {
    if (c.embedding.length !== dim) {
      issues.push({
        level: "error",
        message: `chunk ${c.id}: embedding dim ${c.embedding.length} (expected ${dim})`,
      });
    }
    for (let i = 0; i < c.embedding.length; i++) {
      const v = c.embedding[i]!;
      if (!Number.isFinite(v)) {
        issues.push({
          level: "error",
          message: `chunk ${c.id}: non-finite embedding at [${i}]`,
        });
        break;
      }
    }
    if (!c.text?.trim()) {
      issues.push({ level: "warn", message: `chunk ${c.id}: empty text` });
    }
    if (!c.patternId?.trim()) {
      issues.push({
        level: "error",
        message: `chunk ${c.id}: missing patternId`,
      });
    }
  }

  return issues;
}
