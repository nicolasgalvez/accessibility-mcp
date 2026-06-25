import { getOllamaConfig } from "../config/ollama.js";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

type TagsResponse = { models?: { name: string }[] };

function rethrowFetchFailure(
  baseUrl: string,
  url: string,
  err: unknown,
): never {
  const root = normalizeBaseUrl(baseUrl);
  const detail =
    err instanceof Error
      ? err.cause instanceof Error
        ? `${err.message} (${err.cause.message})`
        : err.message
      : String(err);
  throw new Error(`Cannot reach Ollama at ${root} (request ${url}): ${detail}`);
}

async function fetchLocalModelNames(baseUrl: string): Promise<string[]> {
  const url = `${normalizeBaseUrl(baseUrl)}/api/tags`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    rethrowFetchFailure(baseUrl, url, e);
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      `Ollama ${url} failed (${res.status}): ${t || res.statusText}`,
    );
  }
  const data = (await res.json()) as TagsResponse;
  return (data.models ?? []).map((m) => m.name);
}

/** True if a local tag matches the requested model (with or without :tag). */
export function modelIsPresent(localNames: string[], want: string): boolean {
  const base = want.includes(":") ? want.slice(0, want.indexOf(":")) : want;
  return localNames.some((n) => {
    if (n === want) return true;
    const nb = n.includes(":") ? n.slice(0, n.indexOf(":")) : n;
    return nb === base;
  });
}

/**
 * Pull a model using Ollama HTTP API (streaming NDJSON).
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export async function pullModel(
  baseUrl: string,
  name: string,
  log: (message: string) => void,
): Promise<void> {
  const url = `${normalizeBaseUrl(baseUrl)}/api/pull`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stream: true }),
    });
  } catch (e) {
    rethrowFetchFailure(baseUrl, url, e);
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      `Ollama pull ${name} failed (${res.status}): ${t || res.statusText}`,
    );
  }
  if (!res.body) {
    throw new Error(`Ollama pull ${name}: empty response body`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let obj: { status?: string; error?: string };
      try {
        obj = JSON.parse(trimmed) as { status?: string; error?: string };
      } catch {
        continue;
      }
      if (obj.error) {
        throw new Error(`Ollama pull ${name}: ${obj.error}`);
      }
      if (obj.status) {
        log(obj.status);
      }
    }
  }

  if (buffer.trim()) {
    try {
      const obj = JSON.parse(buffer.trim()) as {
        status?: string;
        error?: string;
      };
      if (obj.error) throw new Error(`Ollama pull ${name}: ${obj.error}`);
      if (obj.status) log(obj.status);
    } catch (e) {
      if (e instanceof SyntaxError) return;
      throw e;
    }
  }
}

function shouldSkipPull(): boolean {
  const v = process.env.OLLAMA_SKIP_PULL?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** When false, routine lines are not sent to stderr — Claude Code logs any stderr as "error" in mcp-logs JSONL. */
function ollamaVerbose(): boolean {
  const v = process.env.OLLAMA_VERBOSE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Ensures chat and embedding models from config exist locally; pulls missing ones via `/api/pull`.
 * Logs to `log` (default **stderr** via `console.error`) so MCP **stdout** stays clean for JSON-RPC.
 * Routine success is silent unless **`OLLAMA_VERBOSE=1`** (avoids false `"error"` lines in Claude Code MCP logs).
 */
export async function ensureOllamaModels(
  log: (message: string) => void = (m) => console.error(`[ollama] ${m}`),
): Promise<void> {
  if (shouldSkipPull()) {
    if (ollamaVerbose()) {
      log("OLLAMA_SKIP_PULL set — skipping model pull");
    }
    return;
  }

  const cfg = getOllamaConfig();
  const pairs: { baseUrl: string; model: string }[] = [
    { baseUrl: cfg.chatBaseUrl, model: cfg.chatModel },
    { baseUrl: cfg.embeddingBaseUrl, model: cfg.embeddingModel },
  ];
  const seen = new Set<string>();
  for (const { baseUrl, model } of pairs) {
    const key = `${normalizeBaseUrl(baseUrl)}\0${model}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let local = await fetchLocalModelNames(baseUrl);
    if (modelIsPresent(local, model)) {
      if (ollamaVerbose()) {
        log(`model ready: ${model} @ ${normalizeBaseUrl(baseUrl)}`);
      }
      continue;
    }
    log(
      `pulling model: ${model} @ ${normalizeBaseUrl(baseUrl)} (this may take a while)…`,
    );
    await pullModel(baseUrl, model, log);
    log(`pull complete: ${model}`);
    local = await fetchLocalModelNames(baseUrl);
    if (!modelIsPresent(local, model)) {
      throw new Error(
        `Ollama pull finished but model still missing: ${model} @ ${normalizeBaseUrl(baseUrl)}`,
      );
    }
  }
}
