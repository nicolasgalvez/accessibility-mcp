# accessibility-mcp

A [Model Context Protocol](https://modelcontextprotocol.io/) server (built with [FastMCP](https://www.npmjs.com/package/fastmcp)) that exposes **WAI-ARIA Authoring Practices Guide (APG)** patterns: narrative requirements, keyboard/ARIA guidance as Markdown, **official example source** (HTML, CSS, JS) from [w3c/aria-practices](https://github.com/w3c/aria-practices), and **RAG** via **Ollama** + LangChain.js (`apg_semantic_search`; the chunk index is prebuilt in **`data/rag/chunks.json`** for releases).

This is **APG** (widget patterns), not the full WCAG spec. For WCAG success criteria text, use W3C’s WCAG materials separately; APG is the right source for patterns like [Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/examples/carousel-1-prev-next/) and the [patterns index](https://www.w3.org/WAI/ARIA/apg/patterns/).

**Codebase documentation:** [docs/README.md](docs/README.md) (architecture, data pipeline, MCP tools).

**Tests:** `npm test` runs unit tests plus an **MCP stdio integration** check (`src/mcp-stdio.integration.test.ts`): builds **`dist/cli.js`**, spawns the server with **`@modelcontextprotocol/sdk`**, completes the initialize handshake, and **`callTool(apg_meta)`** — this matches what Claude Code uses at the protocol level. **Manual:** `npm run mcp:try` (see [Try tools without Claude](#try-tools-without-claude-cli)).

**Claude Code CLI (optional):** the real **`claude -p`** binary can drive the same server with **`--mcp-config`** + **`--strict-mcp-config`** (see [headless / `-p`](https://docs.claude.com/en/docs/claude-code/headless)). Uses your **normal Claude Code login** (same as the REPL)—no **`ANTHROPIC_API_KEY`** required unless you use **`--bare`** (API-key-only / CI). To smoke-test end-to-end:

```bash
CLAUDE_CODE_MCP_SMOKE=1 npm run test:claude-mcp
```

Exits **0** with a skip message if **`CLAUDE_CODE_MCP_SMOKE`** is unset (default in CI).

**Data / RAG quality:** `npm run validate:data` (structure checks; no Ollama). **`npm run eval:rag`** runs a labeled benchmark and writes **`reports/rag-eval.html`** (bar chart of top-1 scores + MRR / Hit@k). There is no training **loss** curve—embeddings are frozen; see [docs/evaluation.md](docs/evaluation.md).

## Dataset

- **`npm run ingest`** — shallow-clones `w3c/aria-practices` into `.cache/`, writes:
  - `data/manifest.json` — compact index (ids, titles, example slugs, bundle paths)
  - `data/patterns/<id>.md` — pattern doc as Markdown (from `*-pattern.html`)
  - `data/bundles/<id>/<example>.json` — referenced HTML/CSS/JS per demo (binary assets listed but omitted)
- **`npm run rag:index`** — (after ingest + `.env`) calls **Ollama** embeddings and writes **`data/rag/chunks.json`**: chunked pattern docs plus one combined text blob per example (HTML/CSS/JS). Maintainers run this before releases; **re-run** after ingest or when you change **`OLLAMA_EMBEDDING_MODEL`**.
- Vendored **`data/`** (including **`data/rag/chunks.json`**) is **committed** and **published** so end users are not required to ingest or index locally.

## Usage

```bash
npm install
npm run ingest   # refresh from GitHub (re-run when you want newer APG)
npm run rag:index # rebuild RAG index (maintainers / custom models; shipped index in releases)
npm run build
npm start        # stdio MCP server
```

### npx (after publish to npm)

```bash
npx -y accessibility-mcp
```

After the package is on npm, most clients can use **`command` + `args`** with `npx` / `-y` / `accessibility-mcp` instead of a local `node` path.

### Publishing (npm tarball)

The package ships **`dist/`**, **`data/manifest.json`**, **`data/patterns/`**, **`data/bundles/`**, and **`data/rag/chunks.json`** (see **`files`** in `package.json`). That last file is the **precomputed embedding index** so installers do **not** need to run **`npm run rag:index`** themselves.

**Runtime note:** **`apg_semantic_search`** still uses **Ollama** to embed the **user query** at request time (the index only stores chunk vectors). Point **`OLLAMA_EMBEDDING_*`** at the **same embedding model** the index was built with (see `embeddingModel` inside `chunks.json`). Users without Ollama can set **`OLLAMA_SKIP_PULL=1`** and use the non-RAG tools only.

**Before `npm publish`:**

1. **`npm run ingest`** — refresh APG text and bundles.
2. **`npm run rag:index`** — rebuild **`data/rag/chunks.json`** (needs Ollama once, on the maintainer machine).
3. **`npm test`** (optional but recommended).
4. **`npm publish`** — **`prepack`** runs **`npm run build`**.

Inspect the tarball: **`npm pack --dry-run`**.

### MCP Inspector (dev)

The [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) is a dev dependency. After **`npm run build`**:

```bash
npm run mcp:inspect
```

Opens a local web UI to exercise tools and resources against **`node dist/cli.js`** (Ollama runs on first connect like **`npm start`**).

### Try tools without Claude (CLI)

**`npm run mcp:try`** runs a tiny [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) client that spawns **`dist/cli.js`**, completes the handshake, and calls a tool (same mechanism as the integration test).

```bash
npm run build
npm run mcp:try -- --list
npm run mcp:try
npm run mcp:try -- apg_list_patterns '{"query":"carousel"}'
```

See **`scripts/mcp-client-demo.ts`**. **`apg_semantic_search`** still needs a reachable Ollama embedding endpoint at call time.

### Environment (`.env`)

At startup the server loads **`.env`** from the **package root** (same folder as `package.json`). Copy **`.env.example`** → **`.env`** and adjust.

| Variable                        | Purpose                                                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`OLLAMA_BASE_URL`**           | Default Ollama HTTP API root, e.g. `http://127.0.0.1:11434` (no trailing slash). Use your LAN IP if Ollama runs on another machine. Used for chat and embeddings when the overrides below are unset. |
| **`OLLAMA_CHAT_BASE_URL`**      | Optional. Chat-only host (e.g. a GPU box). Defaults to **`OLLAMA_BASE_URL`**.                                                                                                                        |
| **`OLLAMA_EMBEDDING_BASE_URL`** | Optional. Embeddings-only host. Defaults to **`OLLAMA_BASE_URL`**. Set both overrides to split chat vs embed across two servers.                                                                     |
| **`OLLAMA_CHAT_MODEL`**         | Chat model id (default **`llama3.1:8b`**). Pick any [Ollama library](https://ollama.com/library) model you have pulled.                                                                              |
| **`OLLAMA_EMBEDDING_MODEL`**    | Embedding model for RAG (default **`nomic-embed-text`**). **Re-run `npm run rag:index`** after changing it so vectors match.                                                                         |
| **`OLLAMA_SKIP_PULL`**          | If `1` / `true` / `yes`, **does not contact Ollama at startup** (skips model checks and pulls).                                                                                                      |
| **`OLLAMA_VERBOSE`**            | If `1` / `true` / `yes`, log extra Ollama status to **stderr** (default: quiet).                                                                                                                     |
| **`APG_MCP_DATA_DIR`**          | Optional. Directory that contains **`manifest.json`** (defaults to `data/` next to `dist/`).                                                                                                         |

The MCP **stdio handshake** runs first; **Ollama** model checks and pulls run **after** that (async). If Ollama is unreachable, APG list/read tools still work; RAG needs Ollama when invoked.

### Without Ollama (no local LLM)

Listing patterns, reading specs, and fetching example sources use **only** the bundled **`data/`** files—**no** model and **no** network at query time.

1. Install [Node.js](https://nodejs.org/) 20+.
2. Run the server from the published package, e.g. **`npx -y accessibility-mcp`** (after you publish), or **`node dist/cli.js`** from a git checkout after **`npm install`** + **`npm run build`**.
3. Optionally set **`OLLAMA_SKIP_PULL=1`** so startup never contacts Ollama (otherwise unreachable Ollama only logs a warning by default).

Do **not** rely on **`apg_semantic_search`** without Ollama: it needs a running embedding endpoint at call time. Ignore that tool or expect errors if invoked.

**Ollama + LangChain.js** helpers (for RAG scripts or future MCP tools):

- `loadEnv()` — load `.env` explicitly (also runs via `getOllamaConfig()` / `resolveDataDir()`).
- `getOllamaConfig()` — parsed `{ baseUrl, chatBaseUrl, embeddingBaseUrl, chatModel, embeddingModel }`.
- `ensureOllamaModels()` — `GET /api/tags` + `POST /api/pull` for missing models (same as MCP startup).
- `createChatOllama()` / `createOllamaEmbeddings()` — `@langchain/ollama` instances using those settings.

```ts
import { createChatOllama, createOllamaEmbeddings } from "accessibility-mcp";
```

The **`apg_semantic_search`** tool calls **Ollama** at query time (embed query → cosine similarity vs `data/rag/chunks.json`). **`npm run rag:index`** builds that index with **`createOllamaEmbeddings()`**.

**Sanity check** (requires Ollama reachable at `OLLAMA_CHAT_BASE_URL` or `OLLAMA_BASE_URL` with `OLLAMA_CHAT_MODEL` pulled):

```bash
cp .env.example .env   # then edit if needed
npm run ollama:smoke
```

---

## IDE and agent setup

MCP wiring differs by product: some use a top-level **`mcpServers`** object; **VS Code** uses **`servers`** inside `mcp.json`. Below, replace `/absolute/path/to/accessibility-mcp` with your clone (or use `npx` once published).

Use an **absolute** path to **`dist/cli.js`** in **`args`** (or **`npx -y accessibility-mcp`**). A relative path like **`dist/cli.js`** is resolved from the client’s workspace and usually fails outside this repo.

### Shared snippets

**Stdio via local build** (`mcpServers` shape — Cursor, Claude Desktop, Claude Code, Gemini CLI):

```json
{
  "mcpServers": {
    "apg-patterns": {
      "command": "node",
      "args": ["/absolute/path/to/accessibility-mcp/dist/cli.js"]
    }
  }
}
```

**Stdio via npx** (after npm publish):

```json
{
  "mcpServers": {
    "apg-patterns": {
      "command": "npx",
      "args": ["-y", "accessibility-mcp"]
    }
  }
}
```

**Custom data directory** (any client that supports `env` on the server process):

```json
{
  "mcpServers": {
    "apg-patterns": {
      "command": "node",
      "args": ["/absolute/path/to/accessibility-mcp/dist/cli.js"],
      "env": {
        "APG_MCP_DATA_DIR": "/absolute/path/to/accessibility-mcp/data"
      }
    }
  }
}
```

### Visual Studio Code (GitHub Copilot agent / MCP)

VS Code stores MCP config in **`mcp.json`** using a **`servers`** object (not `mcpServers`). See [Add and manage MCP servers in VS Code](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) and the [MCP configuration reference](https://code.visualstudio.com/docs/copilot/reference/mcp-configuration).

- **Workspace:** `.vscode/mcp.json`
- **User:** Command Palette → **MCP: Open User Configuration**

Example (local checkout):

```json
{
  "servers": {
    "apg-patterns": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/accessibility-mcp/dist/cli.js"]
    }
  }
}
```

Example (npx, after publish):

```json
{
  "servers": {
    "apg-patterns": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "accessibility-mcp"]
    }
  }
}
```

You can also use **MCP: Add Server** in the Command Palette or install from the Extensions view (`@mcp` gallery) if this server is listed there.

### Cursor

Cursor merges MCP config from:

- **Project:** `.cursor/mcp.json`
- **Global:** `~/.cursor/mcp.json` (project entries override global)

Use the **`mcpServers`** JSON shape from the shared snippets above. See [Model Context Protocol (MCP) | Cursor Docs](https://docs.cursor.com/context/model-context-protocol). Restart Cursor after changes if tools do not appear.

### Claude Desktop

Edit the Claude desktop config file and merge under **`mcpServers`**:

| OS      | Typical path                                                      |
| ------- | ----------------------------------------------------------------- |
| macOS   | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json`                     |
| Linux   | `~/.config/Claude/claude_desktop_config.json`                     |

Use the shared **`mcpServers`** snippet. Restart Claude Desktop after saving.

### Claude Code

Claude Code supports project **`.mcp.json`**, local entries in **`~/.claude.json`**, and **user** scope; stdio servers use **`command` + `args`** like other clients. See [Connect Claude Code to tools via MCP](https://docs.claude.com/en/docs/claude-code/mcp).

**Prerequisites:** `npm install`, `npm run build`, and a **`.env`** next to `package.json` (or pass Ollama settings with repeated `--env KEY=value`; the server also loads **`.env`** from the package root automatically).

Put options (**`--transport`**, **`--scope`**, **`--env`**) **before** the server name; use **`--`** before the process to spawn ([documented ordering](https://docs.claude.com/en/docs/claude-code/mcp#option-3-add-a-local-stdio-server)).

**Local / project** (from this repo; records a **relative** `dist/cli.js` — only works when that workspace is this package):

```bash
cd /absolute/path/to/accessibility-mcp
claude mcp add --transport stdio apg-patterns -- node dist/cli.js
```

```bash
claude mcp add --transport stdio apg-patterns --scope project -- node dist/cli.js
```

**User scope** (recommended — works from any folder; use your real path):

```bash
claude mcp add --transport stdio apg-patterns --scope user -- node /absolute/path/to/accessibility-mcp/dist/cli.js
```

**After publish to npm:**

```bash
claude mcp add --transport stdio apg-patterns -- npx -y accessibility-mcp
```

Then **`claude mcp list`** or **`/mcp`** in Claude Code to confirm. If the server won’t start, check that **`args`** points at the built **`cli.js`**. **`npm test`** and **`npm run mcp:try`** exercise the server without the Claude UI.

### Gemini CLI

Configure **`mcpServers`** in Gemini CLI settings. User vs project scope:

- **User:** `~/.gemini/settings.json`
- **Project:** `.gemini/settings.json` in the repo

Details: [MCP servers with the Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html).

CLI (stdio; user scope — writes `~/.gemini/settings.json`):

```bash
gemini mcp add --scope user apg-patterns node /absolute/path/to/accessibility-mcp/dist/cli.js
```

Use **`--scope project`** to write `.gemini/settings.json` instead. Run **`gemini mcp add --help`** for flags (`-e` for `env`, `--trust`, etc.).

### OpenAI Codex (CLI and IDE extension)

Codex stores MCP servers in **`config.toml`**, default **`~/.codex/config.toml`**, or project **`.codex/config.toml`** on trusted projects. CLI and IDE share this file. See [Model Context Protocol – Codex](https://developers.openai.com/codex/mcp).

**TOML example (stdio):**

```toml
[mcp_servers.apg-patterns]
command = "node"
args = ["/absolute/path/to/accessibility-mcp/dist/cli.js"]
```

**CLI:**

```bash
codex mcp add apg-patterns -- node /absolute/path/to/accessibility-mcp/dist/cli.js
```

### Other editors

- **Windsurf / JetBrains / etc.:** If the product documents MCP stdio support, reuse the same **`command` / `args`** as above; the wrapper key name may differ—check that product’s MCP docs.
- **VS Code discovery:** With **`chat.mcp.discovery.enabled`**, VS Code can pick up MCP definitions from some other apps (e.g. Claude Desktop). See the [VS Code MCP article](https://code.visualstudio.com/docs/copilot/chat/mcp-servers#_automatically-discover-mcp-servers).

## Tools

| Tool                  | Purpose                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apg_meta`            | Source commit, generation time, patterns index URL                                                                                                 |
| `apg_list_patterns`   | All pattern ids/titles; optional `query` filter                                                                                                    |
| `apg_get_pattern`     | Markdown spec + example list (`patternId`, optional `includeMarkdown`)                                                                             |
| `apg_get_example`     | Example sources (`patternId`, `exampleSlug`, `format`: json \| markdown)                                                                           |
| `apg_semantic_search` | RAG: natural-language search (`query`, optional `k`, `maxCharsPerHit`); needs **`data/rag/chunks.json`** (shipped) + **Ollama** to embed the query |

## Resources

- `apg://manifest` — full manifest JSON
- `apg://pattern/{patternId}` — pattern Markdown
- `apg://example/{patternId}/{slug}` — example sources as Markdown

## License

ISC (this package). APG content is W3C documentation; see [W3C document license](https://www.w3.org/copyright/document-license/).
