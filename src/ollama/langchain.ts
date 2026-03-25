import { ChatOllama, type ChatOllamaInput, OllamaEmbeddings, type OllamaEmbeddingsParams } from "@langchain/ollama";
import { getOllamaConfig } from "../config/ollama.js";

/**
 * `ChatOllama` using `OLLAMA_BASE_URL` and `OLLAMA_CHAT_MODEL` from `.env`.
 */
export function createChatOllama(overrides?: Partial<ChatOllamaInput>): ChatOllama {
  const c = getOllamaConfig();
  return new ChatOllama({
    baseUrl: c.baseUrl,
    model: c.chatModel,
    ...overrides,
  });
}

/**
 * `OllamaEmbeddings` using `OLLAMA_BASE_URL` and `OLLAMA_EMBEDDING_MODEL` from `.env`.
 */
export function createOllamaEmbeddings(overrides?: Partial<OllamaEmbeddingsParams>): OllamaEmbeddings {
  const c = getOllamaConfig();
  return new OllamaEmbeddings({
    baseUrl: c.baseUrl,
    model: c.embeddingModel,
    ...overrides,
  });
}
