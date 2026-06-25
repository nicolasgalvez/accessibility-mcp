import { describe, expect, it } from "vitest";
import { chunkMarkdown, stripFrontmatter } from "./chunk-md.js";

describe("stripFrontmatter", () => {
  it("removes YAML frontmatter", () => {
    const md = '---\ntitle: "Foo"\nid: bar\n---\n\n## Body\n\nHello';
    expect(stripFrontmatter(md)).toContain("## Body");
    expect(stripFrontmatter(md)).not.toContain("title:");
  });

  it("returns input when no frontmatter", () => {
    expect(stripFrontmatter("# Hi")).toBe("# Hi");
  });
});

describe("chunkMarkdown", () => {
  it("splits on level-2 headings", () => {
    const md = "## A\n\nalpha\n\n## B\n\nbeta";
    const chunks = chunkMarkdown(md, 500);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.some((c) => c.includes("alpha"))).toBe(true);
    expect(chunks.some((c) => c.includes("beta"))).toBe(true);
  });

  it("returns empty for blank body after frontmatter strip", () => {
    expect(chunkMarkdown("---\nx: y\n---\n\n")).toEqual([]);
  });
});
