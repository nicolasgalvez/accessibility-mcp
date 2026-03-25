/** Remove YAML frontmatter from pattern Markdown files. */
export function stripFrontmatter(md: string): string {
  if (!md.startsWith("---\n")) return md;
  const end = md.indexOf("\n---\n", 4);
  if (end === -1) return md;
  return md.slice(end + 5);
}

/**
 * Split pattern docs into chunks: prefer `##` sections, then paragraphs under a max size.
 */
export function chunkMarkdown(md: string, maxChars = 1400): string[] {
  const body = stripFrontmatter(md).trim();
  if (!body) return [];

  const sections = body.split(/\n(?=## )/);
  const out: string[] = [];

  for (const sec of sections) {
    const s = sec.trim();
    if (!s) continue;
    if (s.length <= maxChars) {
      out.push(s);
      continue;
    }
    let cur = "";
    const paras = s.split(/\n\n+/);
    for (const p of paras) {
      const add = cur ? `${cur}\n\n${p}` : p;
      if (add.length <= maxChars) {
        cur = add;
      } else {
        if (cur.trim()) out.push(cur.trim());
        if (p.length <= maxChars) {
          cur = p;
        } else {
          for (let i = 0; i < p.length; i += maxChars) {
            const slice = p.slice(i, i + maxChars).trim();
            if (slice) out.push(slice);
          }
          cur = "";
        }
      }
    }
    if (cur.trim()) out.push(cur.trim());
  }

  return out;
}
