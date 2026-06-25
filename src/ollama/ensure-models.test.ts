import { describe, expect, it } from "vitest";
import { modelIsPresent } from "./ensure-models.js";

describe("modelIsPresent", () => {
  it("matches bare name to latest tag", () => {
    const local = ["llama3.2:latest", "mxbai-embed-large:latest"];
    expect(modelIsPresent(local, "llama3.2")).toBe(true);
    expect(modelIsPresent(local, "mxbai-embed-large")).toBe(true);
  });

  it("matches exact tag", () => {
    expect(modelIsPresent(["foo:bar"], "foo:bar")).toBe(true);
  });

  it("returns false when missing", () => {
    expect(modelIsPresent(["a:latest"], "b")).toBe(false);
  });
});
