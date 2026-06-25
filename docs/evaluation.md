# Evaluation and data validity

## Training “loss”

This project uses **frozen** embedding weights from **Ollama** (`embedQuery` / `embedDocuments`). There is **no training loop** in this repo, so there is **no loss curve** to plot. Quality is measured with **retrieval metrics** and **score distributions** instead.

## Commands

| Command                     | Needs Ollama? | Needs `data/rag/chunks.json`?         | Output                                           |
| --------------------------- | ------------- | ------------------------------------- | ------------------------------------------------ |
| **`npm run validate:data`** | No            | Optional (validates index if present) | Exits non-zero on structural errors              |
| **`npm run eval:rag`**      | Yes           | Yes                                   | `reports/rag-eval.json`, `reports/rag-eval.html` |

### `validate:data`

- Confirms **`manifest.json`** lines up with **`data/patterns/*.md`** and **`data/bundles/**`\*\*.
- If **`data/rag/chunks.json`** exists, checks **chunk count**, **embedding dimensions**, **finite** values, and non-empty **text** / **patternId**.

### `eval:rag`

1. Runs the same structural checks.
2. Loads **`benchmarks/rag-retrieval.json`** (hand-labeled queries → expected pattern ids).
3. For each query: **embed** → **cosine search** over chunks → records **Hit@1**, **Hit@5**, **reciprocal rank** (for **MRR**), and **top-1 cosine score**.
4. Writes **`reports/rag-eval.json`** (machine-readable) and **`reports/rag-eval.html`** (bar chart of top-1 scores + table).

**Interpretation**

- **MRR** (mean reciprocal rank): higher is better (1.0 = every query’s first relevant chunk is rank 1).
- **Hit@k**: fraction of queries where an expected **patternId** appears in the top **k** chunk results.
- **Top-1 cosine**: similarity between the query embedding and the retrieved chunk; low values across the board may mean a model/index mismatch or weak queries.

## Extending the benchmark

Edit **`benchmarks/rag-retrieval.json`**: add `queries` with stable **`id`**, natural-language **`query`**, and **`expectedPatternIds`** (folder names under APG patterns, e.g. `carousel`, `dialog-modal`). Re-run **`npm run eval:rag`** after changing the index or embedding model.

## Related

- Automated tests: **`npm test`** — see [docs/README.md](README.md#testing).
