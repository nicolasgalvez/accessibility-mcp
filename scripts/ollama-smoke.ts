/**
 * Quick check that .env + Ollama + LangChain wiring works.
 * Usage: npm run ollama:smoke
 */
import { HumanMessage } from "@langchain/core/messages";
import { ensureOllamaModels } from "../src/ollama/ensure-models.ts";
import { createChatOllama } from "../src/ollama/langchain.ts";

await ensureOllamaModels();
const chat = createChatOllama();
const res = await chat.invoke([new HumanMessage("Reply with exactly: ok")]);
console.log("ChatOllama:", res.content);
