import { FastMCP, UserError } from "fastmcp";
import { z } from "zod";
import { ApgStore } from "./apg-store.js";
import { createOllamaEmbeddings } from "./ollama/langchain.js";
import { getOllamaConfig } from "./config/ollama.js";
import { loadRagIndex } from "./rag/index-io.js";
import { searchChunks } from "./rag/similarity.js";

export function createApgServer(dataDir: string): FastMCP {
  const store = new ApgStore(dataDir);

  const server = new FastMCP({
    name: "wai-aria-apg-patterns",
    version: "1.0.0",
    instructions: [
      "WAI-ARIA Authoring Practices Guide (APG) patterns: requirements, keyboard behavior, roles, and official example source.",
      "Data is vendored from https://github.com/w3c/aria-practices (see manifest sourceCommit).",
      "Published site index: " + store.manifest.apgPatternsIndexUrl,
      "Use apg_list_patterns to discover ids, apg_get_pattern for the Markdown spec, apg_get_example for HTML/CSS/JS bundles.",
      "Use apg_semantic_search for natural-language RAG over pattern docs + example sources (requires npm run rag:index).",
      "Resources: apg://manifest, apg://pattern/{patternId}, apg://example/{patternId}/{slug}",
    ].join("\n"),
  });

  server.addTool({
    name: "apg_meta",
    description: "APG dataset metadata: source commit, when generated, and link to the patterns index.",
    parameters: z.object({}),
    execute: async () =>
      JSON.stringify(
        {
          apgPatternsIndexUrl: store.manifest.apgPatternsIndexUrl,
          sourceRepo: store.manifest.sourceRepo,
          sourceCommit: store.manifest.sourceCommit,
          generatedAt: store.manifest.generatedAt,
          patternCount: store.manifest.patterns.length,
        },
        null,
        2,
      ),
    annotations: { readOnlyHint: true, openWorldHint: false },
  });

  server.addTool({
    name: "apg_list_patterns",
    description:
      "List all APG pattern ids and titles. Optional filter matches id or title (case-insensitive substring).",
    parameters: z.object({
      query: z
        .string()
        .optional()
        .describe("Optional substring filter on pattern id or title"),
    }),
    execute: async (args) => {
      const q = args.query?.trim().toLowerCase();
      const rows = store.manifest.patterns
        .filter((p) => {
          if (!q) return true;
          return p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
        })
        .map((p) => ({
          id: p.id,
          title: p.title,
          patternDocUrl: p.patternDocUrl,
          exampleSlugs: p.examples.map((e) => e.slug),
        }));
      return JSON.stringify(rows, null, 2);
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  });

  server.addTool({
    name: "apg_get_pattern",
    description:
      "Full pattern documentation as Markdown (requirements, keyboard, ARIA, etc.) plus example summaries with live URLs.",
    parameters: z.object({
      patternId: z.string().describe("Pattern folder id, e.g. carousel, dialog-modal"),
      includeMarkdown: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include the full Markdown body; if false, return metadata and example list only"),
    }),
    execute: async (args) => {
      const p = store.getPattern(args.patternId);
      if (!p) {
        throw new UserError(`Unknown patternId: ${args.patternId}`);
      }
      const md = args.includeMarkdown ? store.readPatternMarkdown(args.patternId) : null;
      return JSON.stringify(
        {
          id: p.id,
          title: p.title,
          patternDocUrl: p.patternDocUrl,
          markdownRelativePath: p.markdownRelativePath,
          markdown: md ?? undefined,
          examples: p.examples.map((e) => ({
            slug: e.slug,
            liveExampleUrl: e.liveExampleUrl,
          })),
        },
        null,
        2,
      );
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  });

  server.addTool({
    name: "apg_get_example",
    description:
      "Official example source for one APG demo: HTML plus linked CSS/JS (and placeholders for binary assets).",
    parameters: z.object({
      patternId: z.string(),
      exampleSlug: z
        .string()
        .describe("Example id, e.g. carousel-1-prev-next (see apg_get_pattern / apg_list_patterns)"),
      format: z
        .enum(["json", "markdown"])
        .optional()
        .default("json")
        .describe("json: structured files array; markdown: one fenced block per file"),
    }),
    execute: async (args) => {
      const bundle = store.readExampleBundle(args.patternId, args.exampleSlug);
      if (!bundle) {
        throw new UserError(`No example ${args.exampleSlug} for pattern ${args.patternId}`);
      }
      if (args.format === "markdown") {
        return store.bundleToMarkdown(args.patternId, args.exampleSlug, bundle);
      }
      return JSON.stringify(
        {
          patternId: args.patternId,
          exampleSlug: args.exampleSlug,
          liveExampleUrl: store.getPattern(args.patternId)?.examples.find((e) => e.slug === args.exampleSlug)
            ?.liveExampleUrl,
          files: bundle.files,
        },
        null,
        2,
      );
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  });

  server.addTool({
    name: "apg_semantic_search",
    description:
      "RAG: natural-language search over APG pattern Markdown and example source text. Returns the most similar chunks with patternId (and example slug when applicable). Follow up with apg_get_pattern / apg_get_example for full docs. Requires a pre-built index from `npm run rag:index`.",
    parameters: z.object({
      query: z.string().min(1).describe("Natural-language question or keywords"),
      k: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .default(5)
        .describe("Number of chunks to return"),
      maxCharsPerHit: z
        .number()
        .int()
        .min(200)
        .max(8000)
        .optional()
        .default(2000)
        .describe("Truncate each hit text to this many characters"),
    }),
    execute: async (args) => {
      const idx = loadRagIndex(store.dataDir);
      if (!idx?.chunks.length) {
        throw new UserError(
          "No embedding index found. From the package root run: npm run rag:index (after npm run ingest). Requires Ollama and OLLAMA_EMBEDDING_MODEL.",
        );
      }
      const runtimeModel = getOllamaConfig().embeddingModel;
      const modelMismatch = idx.embeddingModel !== runtimeModel;
      const embeddings = createOllamaEmbeddings();
      const qv = await embeddings.embedQuery(args.query);
      const hits = searchChunks(idx.chunks, qv, args.k);
      return JSON.stringify(
        {
          query: args.query,
          indexGeneratedAt: idx.generatedAt,
          indexEmbeddingModel: idx.embeddingModel,
          runtimeEmbeddingModel: runtimeModel,
          modelMismatchWarning:
            modelMismatch
              ? `Index was built with "${idx.embeddingModel}" but OLLAMA_EMBEDDING_MODEL is "${runtimeModel}". Re-run npm run rag:index for best results.`
              : undefined,
          hits: hits.map((h) => ({
            id: h.id,
            patternId: h.patternId,
            kind: h.kind,
            exampleSlug: h.exampleSlug,
            score: Math.round(h.score * 10000) / 10000,
            text: h.text.length > args.maxCharsPerHit ? `${h.text.slice(0, args.maxCharsPerHit)}…` : h.text,
          })),
        },
        null,
        2,
      );
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  });

  server.addResource({
    uri: "apg://manifest",
    name: "apg_manifest",
    mimeType: "application/json",
    description: "Compact APG pattern index (ids, titles, example slugs, bundle paths).",
    load: async () => ({
      text: JSON.stringify(store.manifest, null, 2),
    }),
  });

  server.addResourceTemplate({
    uriTemplate: "apg://pattern/{patternId}",
    name: "apg_pattern_markdown",
    mimeType: "text/markdown",
    arguments: [{ name: "patternId", description: "Pattern id (directory name under APG patterns)", required: true }],
    description: "Pattern documentation as Markdown (same body as apg_get_pattern).",
    load: async (args) => {
      const md = store.readPatternMarkdown(args.patternId);
      if (!md) {
        throw new UserError(`Unknown pattern: ${args.patternId}`);
      }
      return { text: md };
    },
  });

  server.addResourceTemplate({
    uriTemplate: "apg://example/{patternId}/{slug}",
    name: "apg_example_bundle",
    mimeType: "text/markdown",
    arguments: [
      { name: "patternId", description: "Pattern id", required: true },
      { name: "slug", description: "Example slug (HTML basename without .html)", required: true },
    ],
    description: "Example sources as Markdown with fenced code blocks per file.",
    load: async (args) => {
      const bundle = store.readExampleBundle(args.patternId, args.slug);
      if (!bundle) {
        throw new UserError(`Unknown example ${args.patternId}/${args.slug}`);
      }
      return {
        text: store.bundleToMarkdown(args.patternId, args.slug, bundle),
      };
    },
  });

  return server;
}
