#!/usr/bin/env npx tsx
/**
 * Clones w3c/aria-practices (shallow), converts pattern HTML to Markdown,
 * writes per-example JSON bundles under data/bundles/, and a compact data/manifest.json.
 *
 * Usage: npm run ingest [-- --force]
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";
import TurndownService from "turndown";
import type {
  ApgExampleBundle,
  ApgExampleFile,
  ApgExampleSummary,
  ApgManifest,
  ApgPattern,
} from "../src/manifest-types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CACHE = path.join(ROOT, ".cache", "aria-practices");
const DATA = path.join(ROOT, "data");
const PATTERNS_MD = path.join(DATA, "patterns");
const BUNDLES = path.join(DATA, "bundles");

const REPO = "https://github.com/w3c/aria-practices.git";
const APG_BASE = "https://www.w3.org/WAI/ARIA/apg";
const INDEX_URL = `${APG_BASE}/patterns/`;

const TEXT_EXT = /\.(html?|css|js|svg|json|txt|md)$/i;

function ensureRepo(force: boolean): void {
  if (fs.existsSync(CACHE) && force) {
    fs.rmSync(CACHE, { recursive: true, force: true });
  }
  if (!fs.existsSync(CACHE)) {
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    execSync(`git clone --depth 1 ${REPO} "${CACHE}"`, {
      stdio: "inherit",
      cwd: path.dirname(CACHE),
    });
  }
}

function gitHead(): string {
  return execSync("git rev-parse HEAD", {
    encoding: "utf8",
    cwd: CACHE,
  }).trim();
}

function patternHtmlPath(patternDir: string): string | null {
  const entries = fs.readdirSync(patternDir);
  const found = entries.find((f) => f.endsWith("-pattern.html"));
  return found ? path.join(patternDir, found) : null;
}

function languageForPath(rel: string): string {
  const ext = path.extname(rel).toLowerCase();
  if (ext === ".css") return "css";
  if (ext === ".js") return "javascript";
  if (ext === ".html" || ext === ".htm") return "html";
  if (ext === ".svg") return "svg";
  if (ext === ".json") return "json";
  return "text";
}

function resolveRef(fromHtmlRel: string, href: string): string | null {
  if (!href || /^(https?:|\/\/|data:|mailto:)/i.test(href) || href.startsWith("#")) {
    return null;
  }
  const clean = href.replace(/^\.\//, "");
  const dir = path.posix.dirname(fromHtmlRel);
  const joined = dir === "." ? clean : path.posix.join(dir, clean);
  return path.posix.normalize(joined);
}

function collectExampleFiles(examplesDir: string, htmlRel: string): ApgExampleFile[] {
  const absHtml = path.join(examplesDir, ...htmlRel.split("/"));
  const html = fs.readFileSync(absHtml, "utf8");
  const $ = load(html);
  const refs = new Set<string>();
  refs.add(htmlRel);

  const addFromAttr = (v: string | undefined) => {
    const r = resolveRef(htmlRel, v ?? "");
    if (r) refs.add(r);
  };

  $('link[rel="stylesheet"]').each((_, el) => addFromAttr($(el).attr("href")));
  $("script[src]").each((_, el) => addFromAttr($(el).attr("src")));
  $("img[src]").each((_, el) => addFromAttr($(el).attr("src")));

  const files: ApgExampleFile[] = [];
  const sorted = [...refs].sort();

  for (const rel of sorted) {
    const abs = path.join(examplesDir, ...rel.split("/"));
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;

    if (!TEXT_EXT.test(rel)) {
      files.push({
        relativePath: rel,
        language: "binary",
        omitted: true,
        omitReason: "Non-text asset omitted from bundle (see live example URL for full package).",
      });
      continue;
    }

    const text = fs.readFileSync(abs, "utf8");
    files.push({
      relativePath: rel,
      language: languageForPath(rel),
      text,
    });
  }

  return files;
}

function patternToMarkdown(html: string): { title: string; markdown: string } {
  const $ = load(html);
  const title = $("main h1").first().text().trim() || "Pattern";
  $("script").remove();
  $("link[rel='stylesheet']").remove();
  const mainHtml = $("main").html() ?? "";
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  const markdown = td.turndown(mainHtml).trim();
  return { title, markdown };
}

function ingestPattern(patternsRoot: string, patternId: string): ApgPattern | null {
  const patternDir = path.join(patternsRoot, patternId);
  const ph = patternHtmlPath(patternDir);
  if (!ph) return null;

  const raw = fs.readFileSync(ph, "utf8");
  const { title, markdown } = patternToMarkdown(raw);

  const fm = `---\ntitle: ${JSON.stringify(title)}\nid: ${JSON.stringify(patternId)}\npatternDocUrl: ${JSON.stringify(`${APG_BASE}/patterns/${patternId}/`)}\n---\n\n`;
  fs.mkdirSync(PATTERNS_MD, { recursive: true });
  const mdPath = path.join(PATTERNS_MD, `${patternId}.md`);
  fs.writeFileSync(mdPath, fm + markdown + "\n", "utf8");

  const examplesDir = path.join(patternDir, "examples");
  const examples: ApgExampleSummary[] = [];

  if (fs.existsSync(examplesDir) && fs.statSync(examplesDir).isDirectory()) {
    const demoHtml = fs
      .readdirSync(examplesDir)
      .filter((f) => f.endsWith(".html"))
      .sort();

    for (const htmlFile of demoHtml) {
      const slug = path.basename(htmlFile, path.extname(htmlFile));
      const liveExampleUrl = `${APG_BASE}/patterns/${patternId}/examples/${slug}/`;
      const files = collectExampleFiles(examplesDir, htmlFile);

      const bundleRelativePath = path.posix.join("bundles", patternId, `${slug}.json`);
      const bundleDir = path.join(BUNDLES, patternId);
      fs.mkdirSync(bundleDir, { recursive: true });
      const bundle: ApgExampleBundle = { files };
      fs.writeFileSync(path.join(DATA, ...bundleRelativePath.split("/")), JSON.stringify(bundle, null, 2), "utf8");

      examples.push({ slug, liveExampleUrl, bundleRelativePath });
    }
  }

  return {
    id: patternId,
    title,
    markdownRelativePath: `patterns/${patternId}.md`,
    patternDocUrl: `${APG_BASE}/patterns/${patternId}/`,
    examples,
  };
}

function main(): void {
  const force = process.argv.includes("--force");
  ensureRepo(force);

  if (fs.existsSync(BUNDLES)) {
    fs.rmSync(BUNDLES, { recursive: true, force: true });
  }

  const patternsRoot = path.join(CACHE, "content", "patterns");
  const entries = fs
    .readdirSync(patternsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => name !== "common" && !name.startsWith("."));

  const patterns: ApgPattern[] = [];
  for (const id of entries.sort()) {
    const p = ingestPattern(patternsRoot, id);
    if (p) patterns.push(p);
  }

  const manifest: ApgManifest = {
    generatedAt: new Date().toISOString(),
    sourceRepo: REPO,
    sourceCommit: gitHead(),
    apgPatternsIndexUrl: INDEX_URL,
    patterns,
  };

  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log(
    `Wrote ${patterns.length} patterns to data/manifest.json (${manifest.sourceCommit.slice(0, 7)})`,
  );
}

main();
