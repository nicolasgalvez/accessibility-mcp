import { z } from "zod";
import { loadEnv } from "./load-env.js";

const schema = z.object({
  /**
   * Default API base from `OLLAMA_BASE_URL`. Used when chat/embedding URLs are unset;
   * also the fallback for any code that needs a single “primary” host.
   */
  baseUrl: z.string().url(),
  /** Chat requests go here (defaults to `baseUrl`). */
  chatBaseUrl: z.string().url(),
  /** Embedding requests go here (defaults to `baseUrl`). */
  embeddingBaseUrl: z.string().url(),
  /** Chat model for LangChain `ChatOllama` */
  chatModel: z.string().min(1),
  /** Embedding model for LangChain `OllamaEmbeddings` (RAG / similarity) */
  embeddingModel: z.string().min(1),
});

export type OllamaConfig = z.infer<typeof schema>;

/** Sensible defaults for local RAG: strong retrieval + capable chat. Override via `.env`. */
const defaults = {
  baseUrl: "http://127.0.0.1:11434",
  chatModel: "llama3.1:8b",
  embeddingModel: "nomic-embed-text",
} as const;

/**
 * Reads Ollama settings from the environment (after `.env` is loaded).
 * Uses defaults only when a variable is unset or empty.
 */
export function getOllamaConfig(): OllamaConfig {
  loadEnv();
  const pick = (key: string, fallback: string) => {
    const v = process.env[key]?.trim();
    return v && v.length > 0 ? v : fallback;
  };
  const baseUrl = pick("OLLAMA_BASE_URL", defaults.baseUrl);
  return schema.parse({
    baseUrl,
    chatBaseUrl: pick("OLLAMA_CHAT_BASE_URL", baseUrl),
    embeddingBaseUrl: pick("OLLAMA_EMBEDDING_BASE_URL", baseUrl),
    chatModel: pick("OLLAMA_CHAT_MODEL", defaults.chatModel),
    embeddingModel: pick("OLLAMA_EMBEDDING_MODEL", defaults.embeddingModel),
  });
}
