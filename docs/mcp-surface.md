# MCP surface

## Tools

| Name                  | Description                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `apg_meta`            | Manifest metadata: `sourceCommit`, `generatedAt`, patterns index URL                             |
| `apg_list_patterns`   | All patterns; optional `query` substring filter                                                  |
| `apg_get_pattern`     | Full pattern markdown + example list (`patternId`, `includeMarkdown`)                            |
| `apg_get_example`     | Example bundle as JSON or markdown (`patternId`, `exampleSlug`, `format`)                        |
| `apg_semantic_search` | RAG: embed query, cosine similarity over `data/rag/chunks.json` (`query`, `k`, `maxCharsPerHit`) |

**`apg_semantic_search`** fails with a clear error if the RAG index is missing — run **`npm run rag:index`** after ingest.

## Resources

| URI pattern                        | Content                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `apg://manifest`                   | Full `manifest.json` as JSON text                    |
| `apg://pattern/{patternId}`        | Pattern Markdown                                     |
| `apg://example/{patternId}/{slug}` | Example sources as Markdown (fenced blocks per file) |

## Stdio and logging

- The MCP protocol uses **stdin/stdout**. Any diagnostic output must use **stderr** (e.g. Ollama pull progress in `ensureOllamaModels`).
- Do not log to `stdout` from the server after the MCP transport is active.

## Ollama on startup

- By default, **`ensureOllamaModels()`** ensures **`OLLAMA_CHAT_MODEL`** and **`OLLAMA_EMBEDDING_MODEL`** exist locally (HTTP API).
- Set **`OLLAMA_SKIP_PULL`** to skip pulls in environments where models are preinstalled.
