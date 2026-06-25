import {
  ChatOllama,
  type ChatOllamaInput,
  OllamaEmbeddings,
  type OllamaEmbeddingsParams,
} from "@langchain/ollama";
import { getOllamaConfig } from "../config/ollama.js";

/**
 * `ChatOllama` using `OLLAMA_CHAT_BASE_URL` (or `OLLAMA_BASE_URL`) and `OLLAMA_CHAT_MODEL` from `.env`.
 */
export function createChatOllama(
  overrides?: Partial<ChatOllamaInput>,
): ChatOllama {
  const c = getOllamaConfig();
  return new ChatOllama({
    baseUrl: c.chatBaseUrl,
    model: c.chatModel,
    ...overrides,
  });
}

/**
 * `OllamaEmbeddings` using `OLLAMA_EMBEDDING_BASE_URL` (or `OLLAMA_BASE_URL`) and `OLLAMA_EMBEDDING_MODEL` from `.env`.
 */
export function createOllamaEmbeddings(
  overrides?: Partial<OllamaEmbeddingsParams>,
): OllamaEmbeddings {
  const c = getOllamaConfig();
  return new OllamaEmbeddings({
    baseUrl: c.embeddingBaseUrl,
    model: c.embeddingModel,
    /** Fits inputs to the model context when the server supports it (avoids 400 on long chunks). */
    truncate: true,
    ...overrides,
  });
}
