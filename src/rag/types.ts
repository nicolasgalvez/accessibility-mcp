export type RagChunkKind = "pattern" | "example";

export interface RagChunk {
  id: string;
  patternId: string;
  kind: RagChunkKind;
  /** Set when kind === "example" */
  exampleSlug?: string;
  text: string;
  embedding: number[];
}

export interface RagIndexFile {
  version: 1;
  embeddingModel: string;
  sourceCommit?: string;
  generatedAt: string;
  chunkCount: number;
  chunks: RagChunk[];
}

export interface RagSearchHit {
  id: string;
  patternId: string;
  kind: RagChunkKind;
  exampleSlug?: string;
  score: number;
  text: string;
}
