#!/usr/bin/env npx tsx
/**
 * Validate APG vendored data + (optional) RAG retrieval benchmark with HTML report.
 *
 *   npm run validate:data          # structure only, no Ollama
 *   npm run eval:rag               # validate + benchmark + reports/rag-eval.html (needs Ollama + data/rag/chunks.json)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOllamaEmbeddings } from "../src/ollama/langchain.ts";
import { resolveDataDir } from "../src/paths.ts";
import { loadRagIndex } from "../src/rag/index-io.ts";
import { searchChunks } from "../src/rag/similarity.ts";
import {
  validateManifestFiles,
  validateRagIndex,
} from "../src/validate/apg-data.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REPORT_DIR = path.join(ROOT, "reports");

type BenchmarkFile = {
  version: number;
  queries: Array<{
    id: string;
    query: string;
    expectedPatternIds: string[];
  }>;
};

type Row = {
  id: string;
  query: string;
  top1Score: number;
  hitAt1: boolean;
  hitAt5: boolean;
  reciprocalRank: number;
  topPatternIds: string[];
};

function parseArgs(): { validateOnly: boolean } {
  const validateOnly = process.argv.includes("--validate-only");
  return { validateOnly };
}

function reciprocalRank(
  hits: { patternId: string }[],
  expected: Set<string>,
): number {
  for (let i = 0; i < hits.length; i++) {
    if (expected.has(hits[i]!.patternId)) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

function hitAtK(
  hits: { patternId: string }[],
  expected: Set<string>,
  k: number,
): boolean {
  return hits.slice(0, k).some((h) => expected.has(h.patternId));
}

function writeHtmlReport(
  rows: Row[],
  summary: { mrr: number; hit1: number; hit5: number; meanTop1: number },
): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const out = path.join(REPORT_DIR, "rag-eval.html");
  const labels = rows.map((r) => r.id);
  const scores = rows.map((r) => r.top1Score);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>RAG retrieval evaluation</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 1100px; }
    h1 { font-size: 1.25rem; }
    .note { color: #444; font-size: 0.9rem; margin-bottom: 1.5rem; }
    canvas { max-height: 360px; }
    table { border-collapse: collapse; width: 100%; font-size: 0.85rem; margin-top: 2rem; }
    th, td { border: 1px solid #ccc; padding: 0.4rem 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
    .ok { color: #0a0; }
    .bad { color: #a00; }
  </style>
</head>
<body>
  <h1>RAG retrieval evaluation</h1>
  <p class="note">
    Frozen embedding models have no training <strong>loss curve</strong> here—this report uses
    <strong>retrieval metrics</strong> (MRR, Hit@1, Hit@5) and <strong>top-1 cosine scores</strong> per query.
    Regenerate after <code>npm run rag:index</code> or benchmark changes.
  </p>
  <p><strong>Summary</strong> — MRR: ${summary.mrr.toFixed(3)} · Hit@1: ${(summary.hit1 * 100).toFixed(1)}% · Hit@5: ${(summary.hit5 * 100).toFixed(1)}% · mean top-1 score: ${summary.meanTop1.toFixed(3)}</p>
  <canvas id="scores"></canvas>
  <h2>Per-query</h2>
  <table>
    <thead><tr><th>id</th><th>Hit@1</th><th>Hit@5</th><th>top-1 score</th><th>top patterns (5)</th></tr></thead>
    <tbody>
${rows
  .map(
    (r) => `      <tr>
        <td>${escapeHtml(r.id)}</td>
        <td class="${r.hitAt1 ? "ok" : "bad"}">${r.hitAt1 ? "yes" : "no"}</td>
        <td class="${r.hitAt5 ? "ok" : "bad"}">${r.hitAt5 ? "yes" : "no"}</td>
        <td>${r.top1Score.toFixed(4)}</td>
        <td><code>${escapeHtml(r.topPatternIds.join(", "))}</code></td>
      </tr>`,
  )
  .join("\n")}
    </tbody>
  </table>
  <script>
    const labels = ${JSON.stringify(labels)};
    const scores = ${JSON.stringify(scores)};
    new Chart(document.getElementById("scores"), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Top-1 cosine similarity",
          data: scores,
          backgroundColor: scores.map((s) => (s >= 0.25 ? "rgba(34, 139, 34, 0.7)" : "rgba(200, 120, 0, 0.7)")),
        }],
      },
      options: {
        responsive: true,
        scales: { y: { min: 0, max: 1, title: { display: true, text: "cosine(query, top chunk)" } } },
      },
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(out, html, "utf8");
  console.error(`[eval-rag] wrote ${out}`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main(): Promise<void> {
  const { validateOnly } = parseArgs();
  const dataDir = resolveDataDir();

  const manifestIssues = validateManifestFiles(dataDir);
  const errors = manifestIssues.filter((i) => i.level === "error");
  const warns = manifestIssues.filter((i) => i.level === "warn");
  for (const i of manifestIssues) {
    console.error(`[validate] ${i.level}: ${i.message}`);
  }
  if (errors.length) {
    process.exit(1);
  }

  const idx = loadRagIndex(dataDir);
  if (!idx) {
    console.error(
      "[validate] warn: no data/rag/chunks.json (run npm run rag:index)",
    );
    if (!validateOnly) {
      process.exit(1);
    }
    process.exit(0);
  }

  const ragIssues = validateRagIndex(idx);
  for (const i of ragIssues) {
    console.error(`[validate] ${i.level}: ${i.message}`);
  }
  if (ragIssues.some((x) => x.level === "error")) {
    process.exit(1);
  }

  if (warns.length || ragIssues.some((x) => x.level === "warn")) {
    console.error(
      `[validate] ${warns.length + ragIssues.filter((w) => w.level === "warn").length} warning(s) (non-fatal)`,
    );
  }

  if (validateOnly) {
    console.error("[eval-rag] --validate-only: done");
    process.exit(0);
  }

  const benchPath = path.join(ROOT, "benchmarks", "rag-retrieval.json");
  if (!fs.existsSync(benchPath)) {
    console.error(`missing ${benchPath}`);
    process.exit(1);
  }
  const bench = JSON.parse(fs.readFileSync(benchPath, "utf8")) as BenchmarkFile;
  const emb = createOllamaEmbeddings();
  const rows: Row[] = [];

  for (const q of bench.queries) {
    const qv = await emb.embedQuery(q.query);
    const hits = searchChunks(idx.chunks, qv, 10);
    const expected = new Set(q.expectedPatternIds);
    const topPatternIds = [
      ...new Set(hits.slice(0, 5).map((h) => h.patternId)),
    ];
    const top1 = hits[0]?.score ?? 0;
    rows.push({
      id: q.id,
      query: q.query,
      top1Score: top1,
      hitAt1: hits[0] ? expected.has(hits[0].patternId) : false,
      hitAt5: hitAtK(hits, expected, 5),
      reciprocalRank: reciprocalRank(hits, expected),
      topPatternIds,
    });
  }

  const n = rows.length;
  const mrr = rows.reduce((s, r) => s + r.reciprocalRank, 0) / n;
  const hit1 = rows.filter((r) => r.hitAt1).length / n;
  const hit5 = rows.filter((r) => r.hitAt5).length / n;
  const meanTop1 = rows.reduce((s, r) => s + r.top1Score, 0) / n;

  const summary = { mrr, hit1, hit5, meanTop1 };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(REPORT_DIR, "rag-eval.json"),
    JSON.stringify({ summary, rows }, null, 2),
    "utf8",
  );
  writeHtmlReport(rows, summary);

  console.error(
    `[eval-rag] MRR=${mrr.toFixed(3)} Hit@1=${(hit1 * 100).toFixed(1)}% Hit@5=${(hit5 * 100).toFixed(1)}% meanTop1=${meanTop1.toFixed(3)}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
