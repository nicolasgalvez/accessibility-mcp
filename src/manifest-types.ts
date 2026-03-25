export interface ApgExampleFile {
  relativePath: string;
  language: string;
  text?: string;
  omitted?: boolean;
  omitReason?: string;
}

/** On-disk bundle at `data/bundles/{patternId}/{slug}.json` */
export interface ApgExampleBundle {
  files: ApgExampleFile[];
}

export interface ApgExampleSummary {
  slug: string;
  liveExampleUrl: string;
  /** Relative to the `data/` directory, e.g. `bundles/carousel/carousel-1-prev-next.json` */
  bundleRelativePath: string;
}

export interface ApgPattern {
  id: string;
  title: string;
  markdownRelativePath: string;
  patternDocUrl: string;
  examples: ApgExampleSummary[];
}

export interface ApgManifest {
  generatedAt: string;
  sourceRepo: string;
  sourceCommit: string;
  apgPatternsIndexUrl: string;
  patterns: ApgPattern[];
}
