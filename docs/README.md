# accessibility-mcp — documentation

This folder describes how the **accessibility-mcp** codebase is organized and how to work with it. The root [README.md](../README.md) is the quick-start for users; these pages go deeper into structure and behavior.

| Doc                               | Contents                                                                |
| --------------------------------- | ----------------------------------------------------------------------- |
| [Architecture](architecture.md)   | Runtime flow, main modules, dependencies                                |
| [Data pipeline](data-pipeline.md) | `ingest`, `data/` layout, RAG index, what is gitignored                 |
| [MCP surface](mcp-surface.md)     | Tools, resources, stdio and Ollama startup                              |
| [Evaluation](evaluation.md)       | Data validation, RAG benchmark, reports (why there is no training loss) |

## Testing

| Command        | What runs                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`npm test`** | Vitest: chunking, cosine similarity / `searchChunks`, `modelIsPresent`, `validateRagIndex`, MCP stdio smoke (no Ollama required for the default suite) |

For **live** embedding quality against Ollama and **`data/rag/chunks.json`**, use **`npm run eval:rag`** (see [Evaluation](evaluation.md)).

## Tech stack

- **Runtime:** Node.js 20+ (ESM, TypeScript compiled to `dist/`).
- **MCP:** [FastMCP](https://www.npmjs.com/package/fastmcp) over **stdio** by default.
- **APG source:** [w3c/aria-practices](https://github.com/w3c/aria-practices) (not the full WCAG spec).
- **RAG:** [LangChain.js](https://www.npmjs.com/package/@langchain/ollama) + **Ollama** embeddings; index is generated offline (`npm run rag:index`).

## Repository map

```
accessibility-mcp/
├── src/              # TypeScript source
├── scripts/          # ingest, RAG indexing, smoke tests (tsx)
├── data/             # Vendored APG snapshot (after ingest)
├── dist/             # Build output (gitignored)
├── docs/             # This documentation
└── .env              # Local Ollama + paths (gitignored)
```
