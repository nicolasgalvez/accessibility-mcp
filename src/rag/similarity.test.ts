import { describe, expect, it } from "vitest";
import type { RagChunk } from "./types.js";
import { cosineSimilarity, searchChunks } from "./similarity.js";

describe("cosineSimilarity", () => {
  it("returns 1 for identical unit vectors", () => {
    const a = [1, 0, 0];
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("returns 0 for length mismatch or empty", () => {
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe("searchChunks", () => {
  const chunks: RagChunk[] = [
    {
      id: "a",
      patternId: "foo",
      kind: "pattern",
      text: "x",
      embedding: [1, 0, 0],
    },
    {
      id: "b",
      patternId: "bar",
      kind: "pattern",
      text: "y",
      embedding: [0.9, 0.1, 0],
    },
    {
      id: "c",
      patternId: "baz",
      kind: "pattern",
      text: "z",
      embedding: [0, 1, 0],
    },
  ];

  it("orders by similarity to query", () => {
    const q = [1, 0, 0];
    const hits = searchChunks(chunks, q, 2);
    expect(hits).toHaveLength(2);
    expect(hits[0].patternId).toBe("foo");
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });
});
