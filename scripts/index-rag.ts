#!/usr/bin/env npx tsx
/**
 * Build `data/rag/chunks.json`: embed pattern Markdown + condensed example sources via Ollama.
 * Requires `npm run ingest` first and a reachable Ollama with OLLAMA_EMBEDDING_MODEL.
 *
 * Usage: npm run rag:index
 */
import fs from "node:fs";
import path from "node:path";
import { createOllamaEmbeddings } from "../src/ollama/langchain.ts";
import { ensureOllamaModels } from "../src/ollama/ensure-models.ts";
import { getOllamaConfig } from "../src/config/ollama.ts";
import { resolveDataDir } from "../src/paths.ts";
import { chunkMarkdown } from "../src/rag/chunk-md.ts";
import { writeRagIndex } from "../src/rag/index-io.ts";
import type { ApgManifest } from "../src/manifest-types.ts";
import type { RagChunk, RagIndexFile } from "../src/rag/types.ts";

/** Example bundle text cap before the example header (must fit embedding model context). */
const EXAMPLE_BLOB_MAX = 6000;
/** Hard cap per chunk sent to Ollama embed (chars). Keeps under typical small embedding contexts. */
const MAX_EMBED_CHARS = 4096;
const EMBED_BATCH = 8;

function clipForEmbed(text: string): string {
  if (text.length <= MAX_EMBED_CHARS) return text;
  return `${text.slice(0, MAX_EMBED_CHARS)}\n\n[…truncated for embedding…]`;
}

type Pending = {
  id: string;
  patternId: string;
  kind: "pattern" | "example";
  exampleSlug?: string;
  text: string;
};

async function main(): Promise<void> {
  await ensureOllamaModels((m) => console.error(`[rag:index] ${m}`));
  const dataDir = resolveDataDir();
  const manifestPath = path.join(dataDir, "manifest.json");
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as ApgManifest;

  const pending: Pending[] = [];

  for (const p of manifest.patterns) {
    const mdPath = path.join(dataDir, p.markdownRelativePath);
    if (!fs.existsSync(mdPath)) continue;
    const md = fs.readFileSync(mdPath, "utf8");
    const parts = chunkMarkdown(md, 1200);
    parts.forEach((text, i) => {
      pending.push({
        id: `pattern:${p.id}:doc:${i}`,
        patternId: p.id,
        kind: "pattern",
        text: clipForEmbed(text),
      });
    });

    for (const ex of p.examples) {
      const bundlePath = path.join(dataDir, ex.bundleRelativePath);
      if (!fs.existsSync(bundlePath)) continue;
      const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8")) as {
        files?: Array<{
          relativePath?: string;
          text?: string;
          omitted?: boolean;
        }>;
      };
      const lines: string[] = [];
      for (const f of bundle.files ?? []) {
        if (f.omitted || !f.text || !f.relativePath) continue;
        lines.push(`### ${f.relativePath}\n${f.text}`);
      }
      const blob = lines.join("\n\n").slice(0, EXAMPLE_BLOB_MAX).trim();
      if (blob.length < 80) continue;
      const exampleText = clipForEmbed(
        `Example \`${ex.slug}\` (pattern \`${p.id}\`):\n\n${blob}`,
      );
      pending.push({
        id: `pattern:${p.id}:example:${ex.slug}`,
        patternId: p.id,
        kind: "example",
        exampleSlug: ex.slug,
        text: exampleText,
      });
    }
  }

  if (pending.length === 0) {
    console.error("No text to embed. Run npm run ingest first.");
    process.exit(1);
  }

  const emb = createOllamaEmbeddings({ truncate: true });
  const cfg = getOllamaConfig();
  const chunks: RagChunk[] = [];

  for (let i = 0; i < pending.length; i += EMBED_BATCH) {
    const batch = pending.slice(i, i + EMBED_BATCH);
    const texts = batch.map((b) => b.text);
    process.stderr.write(
      `[rag:index] embedding ${i + 1}–${i + batch.length} / ${pending.length}\n`,
    );
    const vectors = await emb.embedDocuments(texts);
    if (vectors.length !== batch.length) {
      throw new Error(
        `embedDocuments length mismatch: got ${vectors.length}, expected ${batch.length}`,
      );
    }
    for (let j = 0; j < batch.length; j++) {
      const b = batch[j]!;
      chunks.push({
        id: b.id,
        patternId: b.patternId,
        kind: b.kind,
        exampleSlug: b.exampleSlug,
        text: b.text,
        embedding: vectors[j]!,
      });
    }
  }

  const index: RagIndexFile = {
    version: 1,
    embeddingModel: cfg.embeddingModel,
    sourceCommit: manifest.sourceCommit,
    generatedAt: new Date().toISOString(),
    chunkCount: chunks.length,
    chunks,
  };

  writeRagIndex(dataDir, index);
  console.error(
    `[rag:index] wrote ${chunks.length} chunks → data/rag/chunks.json (model ${cfg.embeddingModel})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
