import fs from "node:fs";
import path from "node:path";
import type { ApgExampleBundle, ApgManifest, ApgPattern } from "./manifest-types.js";

export class ApgStore {
  readonly manifest: ApgManifest;
  /** Root `data/` directory (manifest, patterns, bundles, rag). */
  readonly dataDir: string;
  private readonly byId: Map<string, ApgPattern>;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    const raw = fs.readFileSync(path.join(dataDir, "manifest.json"), "utf8");
    this.manifest = JSON.parse(raw) as ApgManifest;
    this.byId = new Map(this.manifest.patterns.map((p) => [p.id, p]));
  }

  getPattern(id: string): ApgPattern | undefined {
    return this.byId.get(id);
  }

  readPatternMarkdown(id: string): string | null {
    const p = this.byId.get(id);
    if (!p) return null;
    const fp = path.join(this.dataDir, p.markdownRelativePath);
    if (!fs.existsSync(fp)) return null;
    return fs.readFileSync(fp, "utf8");
  }

  readExampleBundle(patternId: string, slug: string): ApgExampleBundle | null {
    const p = this.byId.get(patternId);
    if (!p) return null;
    const ex = p.examples.find((e) => e.slug === slug);
    if (!ex) return null;
    const fp = path.join(this.dataDir, ex.bundleRelativePath);
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, "utf8");
    return JSON.parse(raw) as ApgExampleBundle;
  }

  bundleToMarkdown(patternId: string, slug: string, bundle: ApgExampleBundle): string {
    const p = this.byId.get(patternId);
    const live = p?.examples.find((e) => e.slug === slug)?.liveExampleUrl;
    const lines: string[] = [
      `# APG example: ${patternId} / ${slug}`,
      "",
      live ? `Live reference: ${live}` : "",
      "",
    ].filter(Boolean);

    for (const f of bundle.files) {
      lines.push(`## ${f.relativePath}`, "");
      if (f.omitted) {
        lines.push(`_(${f.omitReason ?? "Omitted"})_`, "");
        continue;
      }
      lines.push("```" + (f.language === "javascript" ? "js" : f.language), f.text ?? "", "```", "");
    }

    return lines.join("\n");
  }
}
