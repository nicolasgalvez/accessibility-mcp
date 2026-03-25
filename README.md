# accessibility-mcp

A [Model Context Protocol](https://modelcontextprotocol.io/) server (built with [FastMCP](https://www.npmjs.com/package/fastmcp)) that exposes **WAI-ARIA Authoring Practices Guide (APG)** patterns: narrative requirements, keyboard/ARIA guidance as Markdown, **official example source** (HTML, CSS, JS) from [w3c/aria-practices](https://github.com/w3c/aria-practices), and **optional RAG** via **Ollama** + LangChain.js (`apg_semantic_search` after `npm run rag:index`).

This is **APG** (widget patterns), not the full WCAG spec. For WCAG success criteria text, use W3C’s WCAG materials separately; APG is the right source for patterns like [Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/examples/carousel-1-prev-next/) and the [patterns index](https://www.w3.org/WAI/ARIA/apg/patterns/).

## Dataset

- **`npm run ingest`** — shallow-clones `w3c/aria-practices` into `.cache/`, writes:
  - `data/manifest.json` — compact index (ids, titles, example slugs, bundle paths)
  - `data/patterns/<id>.md` — pattern doc as Markdown (from `*-pattern.html`)
  - `data/bundles/<id>/<example>.json` — referenced HTML/CSS/JS per demo (binary assets listed but omitted)
- **`npm run rag:index`** — (after ingest + `.env`) calls **Ollama** embeddings and writes **`data/rag/chunks.json`**: chunked pattern docs plus one combined text blob per example (HTML/CSS/JS). Re-run after ingest or when you change `OLLAMA_EMBEDDING_MODEL`.
- Vendored `data/` is intended to be **committed** (or published in the npm package) so the server works without a network. The RAG file can be large; commit or regenerate per machine.

## Usage

```bash
npm install
npm run ingest   # refresh from GitHub (re-run when you want newer APG)
npm run rag:index # build embeddings (needs Ollama + OLLAMA_EMBEDDING_MODEL)
npm run build
npm start        # stdio MCP server
```

### npx (after publish to npm)

```bash
npx -y accessibility-mcp
```

After the package is on npm, most clients can use **`command` + `args`** with `npx` / `-y` / `accessibility-mcp` instead of a local `node` path.

### Environment (`.env`)

At startup the server loads **`.env`** from the **package root** (same folder as `package.json`). Copy **`.env.example`** → **`.env`** and adjust.

| Variable | Purpose |
|----------|---------|
| **`OLLAMA_BASE_URL`** | Ollama HTTP API root, e.g. `http://192.168.1.69:11434` (no trailing slash). |
| **`OLLAMA_CHAT_MODEL`** | Model id for LangChain.js [`ChatOllama`](https://www.npmjs.com/package/@langchain/ollama) (`@langchain/ollama`). |
| **`OLLAMA_EMBEDDING_MODEL`** | Model id for [`OllamaEmbeddings`](https://www.npmjs.com/package/@langchain/ollama) (RAG / similarity). |
| **`OLLAMA_SKIP_PULL`** | If `1` / `true` / `yes`, skips **`/api/pull`** on startup (models must already exist on the server). |
| **`APG_MCP_DATA_DIR`** | Optional. Directory that contains **`manifest.json`** (defaults to `data/` next to `dist/`). |

On **`npm start`**, the CLI calls Ollama **`GET /api/tags`** then **`POST /api/pull`** (streaming) for any configured chat/embedding model that is not already present. Progress lines go to **stderr** only so **stdout** stays valid for MCP stdio.

**Ollama + LangChain.js** helpers (for RAG scripts or future MCP tools):

- `loadEnv()` — load `.env` explicitly (also runs via `getOllamaConfig()` / `resolveDataDir()`).
- `getOllamaConfig()` — parsed `{ baseUrl, chatModel, embeddingModel }`.
- `ensureOllamaModels()` — `GET /api/tags` + `POST /api/pull` for missing models (same as MCP startup).
- `createChatOllama()` / `createOllamaEmbeddings()` — `@langchain/ollama` instances using those settings.

```ts
import { createChatOllama, createOllamaEmbeddings } from "accessibility-mcp";
```

The **`apg_semantic_search`** tool calls **Ollama** at query time (embed query → cosine similarity vs `data/rag/chunks.json`). **`npm run rag:index`** builds that index with **`createOllamaEmbeddings()`**.

**Sanity check** (requires Ollama reachable at `OLLAMA_BASE_URL` with `OLLAMA_CHAT_MODEL` pulled):

```bash
cp .env.example .env   # then edit if needed
npm run ollama:smoke
```

---

## IDE and agent setup

MCP wiring differs by product: some use a top-level **`mcpServers`** object; **VS Code** uses **`servers`** inside `mcp.json`. Below, replace `/absolute/path/to/accessibility-mcp` with your clone (or use `npx` once published).

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

| OS | Typical path |
|----|----------------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

Use the shared **`mcpServers`** snippet. Restart Claude Desktop after saving.

### Claude Code

Claude Code supports project **`.mcp.json`**, user **`~/.claude/settings.json`**, and other scopes; stdio servers use the same **`mcpServers`** structure. See [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp) and [Claude Code settings](https://code.claude.com/docs/en/settings).

CLI (stdio server):

```bash
claude mcp add apg-patterns -- node /absolute/path/to/accessibility-mcp/dist/cli.js
```

(or with `npx` after publish: `claude mcp add apg-patterns -- npx -y accessibility-mcp`)

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

| Tool | Purpose |
|------|--------|
| `apg_meta` | Source commit, generation time, patterns index URL |
| `apg_list_patterns` | All pattern ids/titles; optional `query` filter |
| `apg_get_pattern` | Markdown spec + example list (`patternId`, optional `includeMarkdown`) |
| `apg_get_example` | Example sources (`patternId`, `exampleSlug`, `format`: json \| markdown) |
| `apg_semantic_search` | RAG: natural-language search (`query`, optional `k`, `maxCharsPerHit`); needs **`npm run rag:index`** |

## Resources

- `apg://manifest` — full manifest JSON  
- `apg://pattern/{patternId}` — pattern Markdown  
- `apg://example/{patternId}/{slug}` — example sources as Markdown  

## License

ISC (this package). APG content is W3C documentation; see [W3C document license](https://www.w3.org/copyright/document-license/).
