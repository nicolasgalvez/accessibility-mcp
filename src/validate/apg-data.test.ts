import { describe, expect, it } from "vitest";
import { validateRagIndex } from "./apg-data.js";
import type { RagIndexFile } from "../rag/types.js";

describe("validateRagIndex", () => {
  it("passes for a minimal consistent index", () => {
    const idx: RagIndexFile = {
      version: 1,
      embeddingModel: "test",
      generatedAt: new Date().toISOString(),
      chunkCount: 2,
      chunks: [
        {
          id: "a",
          patternId: "foo",
          kind: "pattern",
          text: "hello",
          embedding: [1, 0, 0],
        },
        {
          id: "b",
          patternId: "bar",
          kind: "pattern",
          text: "world",
          embedding: [0, 1, 0],
        },
      ],
    };
    const issues = validateRagIndex(idx);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("errors on chunkCount mismatch", () => {
    const idx: RagIndexFile = {
      version: 1,
      embeddingModel: "test",
      generatedAt: "",
      chunkCount: 99,
      chunks: [
        {
          id: "a",
          patternId: "foo",
          kind: "pattern",
          text: "x",
          embedding: [1],
        },
      ],
    };
    const issues = validateRagIndex(idx);
    expect(issues.some((i) => i.message.includes("chunkCount"))).toBe(true);
  });
});
