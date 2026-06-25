# Data pipeline

## 1. Ingest (`npm run ingest`)

- **Source:** shallow clone of [w3c/aria-practices](https://github.com/w3c/aria-practices) into `.cache/aria-practices` (or reuse existing).
- **Outputs:**
  - **`data/manifest.json`** — compact index: pattern ids, titles, example slugs, paths to Markdown and bundles.
  - **`data/patterns/<id>.md`** — pattern doc converted from `*-pattern.html` (Turndown + YAML frontmatter).
  - **`data/bundles/<pattern>/<example>.json`** — each demo HTML plus linked text assets (CSS/JS, etc.); binary files are listed with `omitted: true`.

**Commit:** `manifest.json`, `patterns/`, and `bundles/` are intended to be versioned so clones work without re-running ingest.

## 2. RAG index (`npm run rag:index`)

- **Requires:** `ingest` completed, `.env` with `OLLAMA_BASE_URL` and `OLLAMA_EMBEDDING_MODEL`, and Ollama reachable. Default embedding model in code is **`nomic-embed-text`** (good RAG quality vs speed); change **`OLLAMA_EMBEDDING_MODEL`** only with a matching **`npm run rag:index`** afterward.
- **Process:** Chunks pattern Markdown and condensed example text; calls **`OllamaEmbeddings.embedDocuments`** in batches; writes **`data/rag/chunks.json`** (embeddings + metadata).
- **Git:** **`data/rag/`** is listed in **`.gitignore`** — the index is large and model-dependent; regenerate per machine or CI as needed.

## 3. Optional override

- **`APG_MCP_DATA_DIR`** — absolute path to a directory that contains **`manifest.json`** (and the same relative layout for `patterns/`, `bundles/`, `rag/`). Loaded via `.env` through `loadEnv()` in `resolveDataDir()`.

## What is not in this repo

- **WCAG success criteria** as a full corpus — this project focuses on **APG** patterns from `aria-practices`.
- **Live W3C scraping** at runtime — everything is read from vendored files under `data/`.
