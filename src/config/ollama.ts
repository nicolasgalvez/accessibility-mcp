import { z } from "zod";
import { loadEnv } from "./load-env.js";

const schema = z.object({
  /** Ollama API base, e.g. http://192.168.1.69:11434 */
  baseUrl: z.string().url(),
  /** Chat model for LangChain `ChatOllama` */
  chatModel: z.string().min(1),
  /** Embedding model for LangChain `OllamaEmbeddings` (RAG / similarity) */
  embeddingModel: z.string().min(1),
});

export type OllamaConfig = z.infer<typeof schema>;

const defaults = {
  baseUrl: "http://127.0.0.1:11434",
  chatModel: "llama3.2",
  embeddingModel: "mxbai-embed-large",
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
  return schema.parse({
    baseUrl: pick("OLLAMA_BASE_URL", defaults.baseUrl),
    chatModel: pick("OLLAMA_CHAT_MODEL", defaults.chatModel),
    embeddingModel: pick("OLLAMA_EMBEDDING_MODEL", defaults.embeddingModel),
  });
}
