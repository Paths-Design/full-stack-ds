import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { splitFrontmatter, frontmatterScalar } from "./frontmatter";
import { docsRouteFromRelPath, slugify } from "./routing";
import type {
  DocsGraphEdge,
  DocsGraphNode,
  DocsIndexEntry,
  DocsPage,
  DocsProjection,
} from "./types";

/**
 * The docs-site projection: tracked markdown corpus in, typed JSON payloads
 * out. Everything the site shows — index, page bodies, and the dependency
 * graph — derives mechanically from `git ls-files` + frontmatter + parsed
 * relative links. Nothing is hand-maintained, so nothing can drift stale.
 *
 * The public corpus consists of git-tracked markdown, excluding docs/internal/
 * even when authored audit notes there remain tracked. Untracked machine-local
 * state and internal bodies never enter a payload. A brand-new public file
 * appears after `git add -N`; tracking alone does not admit internal documents.
 *
 * Pure with respect to I/O via DocsSource so tests inject fixtures; the git
 * implementation is one small adapter. Deterministic by construction: sorted
 * walks, no timestamps.
 */

export class DocsProjectionError extends Error {
  constructor(message: string) {
    super(`docs projection: ${message}`);
    this.name = "DocsProjectionError";
  }
}

export interface DocsSource {
  /** Repo-relative posix paths of in-scope corpus files, any order. */
  listFiles(): string[];
  read(relPath: string): string;
}

const SCOPE_ROOT_FILES = new Set(["README.md"]);

export function isInScope(relPath: string): boolean {
  return SCOPE_ROOT_FILES.has(relPath) || (
    relPath.startsWith("docs/") &&
    !relPath.startsWith("docs/internal/") &&
    relPath.endsWith(".md")
  );
}

/** Git-backed source: public tracked docs/ markdown plus the root README. */
export function gitDocsSource(repoRoot: string): DocsSource {
  return {
    listFiles() {
      const out = execFileSync(
        "git",
        ["ls-files", "-z", "--", "README.md", "docs"],
        { cwd: repoRoot, encoding: "utf8" }
      );
      return out.split("\0").filter((file) => file.length > 0 && isInScope(file));
    },
    read(relPath) {
      return readFileSync(path.join(repoRoot, relPath), "utf8");
    },
  };
}

function pageId(relPath: string): string {
  return createHash("sha1").update(relPath).digest("hex").slice(0, 16);
}

function deriveSection(relPath: string): string {
  if (!relPath.includes("/")) return "root";
  const underDocs = relPath.replace(/^docs\//, "");
  const slash = underDocs.indexOf("/");
  return slash === -1 ? "docs" : underDocs.slice(0, slash);
}

function deriveTitle(frontmatterTitle: string | null, body: string, relPath: string): string {
  if (frontmatterTitle !== null && frontmatterTitle.trim().length > 0) {
    return frontmatterTitle.trim();
  }
  const heading = /^#\s+(.+)$/m.exec(body);
  if (heading) return heading[1].replace(/\s+#+$/, "").trim();
  const stem = path.basename(relPath, ".md");
  return stem.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveExcerpt(body: string): string {
  const paragraph = (
    body.split(/\n\s*\n/).find((part) => {
      const candidate = part.trim();
      return candidate.length > 0 && !candidate.startsWith("#") && !candidate.startsWith("```");
    }) ?? ""
  ).trim();
  return paragraph.replace(/\s+/g, " ").slice(0, 220);
}

function deriveHeadings(body: string) {
  const headings: DocsPage["headings"] = [];
  for (const match of body.matchAll(/^(#{1,4})\s+(.+)$/gm)) {
    const text = match[2].replace(/\s+#+$/, "").trim();
    headings.push({
      depth: match[1].length as 1 | 2 | 3 | 4,
      text,
      id: slugify(text),
    });
  }
  return headings;
}

const MARKDOWN_LINK = /(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/**
 * Resolve a link target against the source doc's directory; null when the
 * href is not an in-corpus relative markdown link (external, anchor-only,
 * non-md, or escaping the repo root).
 */
function resolveLinkTarget(href: string, sourceRelPath: string): string | null {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#") ||
    href.startsWith("/")
  ) {
    return null;
  }
  const pathPart = href.split("#", 1)[0];
  if (!pathPart.endsWith(".md")) return null;

  const dirParts = sourceRelPath.split("/");
  dirParts.pop();
  // Seed with the source doc's directory so relative hrefs resolve from
  // where the author wrote them, not from the repo root.
  const resolved: string[] = dirParts.filter((part) => part.length > 0);
  for (const part of pathPart.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (resolved.length === 0) return null; // escapes repo root — not corpus
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }
  const rel = resolved.join("/");
  return rel.length > 0 ? rel : null;
}

/** Relative markdown links outside fenced code regions. */
export function extractMarkdownLinks(body: string): { href: string; line: number }[] {
  const links: { href: string; line: number }[] = [];
  let inFence = false;
  body.replace(/\r\n/g, "\n").split("\n").forEach((line, lineIndex) => {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    for (const match of line.matchAll(MARKDOWN_LINK)) {
      links.push({ href: match[1], line: lineIndex + 1 });
    }
  });
  return links;
}

/**
 * Project the corpus. Throws DocsProjectionError on route/id collisions and
 * unreadable files — fail-closed, never a silently empty site.
 */
export function projectDocs(source: DocsSource): DocsProjection {
  const files = source.listFiles().filter(isInScope).sort();
  const pages = new Map<string, DocsPage>();
  const routes = new Map<string, string>();

  for (const relPath of files) {
    let raw: string;
    try {
      raw = source.read(relPath);
    } catch (error) {
      throw new DocsProjectionError(`cannot read ${relPath}: ${String(error)}`);
    }
    const { fields, body } = splitFrontmatter(raw);
    const id = pageId(relPath);
    if (pages.has(id)) {
      throw new DocsProjectionError(`duplicate corpus file listing for ${relPath}`);
    }
    const route = docsRouteFromRelPath(relPath);
    const existing = routes.get(route);
    if (existing !== undefined) {
      throw new DocsProjectionError(
        `route collision: ${relPath} and ${existing} both map to ${route}`
      );
    }
    routes.set(route, relPath);

    const title = deriveTitle(frontmatterScalar(fields, "title"), body, relPath);
    pages.set(id, {
      id,
      relPath,
      route,
      title,
      section: deriveSection(relPath),
      excerpt: deriveExcerpt(body),
      dataPath: `/docs-data/pages/${id}.json`,
      frontmatter: fields,
      headings: deriveHeadings(body),
      content: body,
    });
  }

  // Graph: nodes from the index; edges from resolved in-corpus links.
  const nodes: DocsGraphNode[] = [];
  const edges: DocsGraphEdge[] = [];
  const byRelPath = new Map<string, string>();
  for (const page of pages.values()) {
    byRelPath.set(page.relPath, page.id);
  }
  let droppedLinks = 0;
  const seenEdges = new Set<string>();
  for (const page of [...pages.values()].sort((a, b) => a.relPath.localeCompare(b.relPath))) {
    for (const link of extractMarkdownLinks(page.content)) {
      const targetRel = resolveLinkTarget(link.href, page.relPath);
      if (targetRel === null) continue;
      const targetId = byRelPath.get(targetRel);
      if (targetId === undefined) {
        // Resolves as a relative .md path but is not a corpus node: either
        // tracked-but-out-of-scope (e.g. AGENTS.md) or untracked — the link
        // gate owns resolvability; we only report the drop.
        droppedLinks += 1;
        continue;
      }
      const key = `${page.id}->${targetId}`;
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      edges.push({ source: page.id, target: targetId });
    }
  }
  edges.sort((a, b) =>
    a.source === b.source ? a.target.localeCompare(b.target) : a.source.localeCompare(b.source)
  );
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  for (const page of [...pages.values()].sort((a, b) => a.route.localeCompare(b.route))) {
    nodes.push({
      id: page.id,
      relPath: page.relPath,
      route: page.route,
      title: page.title,
      section: page.section,
      authority: frontmatterScalar(page.frontmatter, "authority"),
      status: frontmatterScalar(page.frontmatter, "status"),
      updated: frontmatterScalar(page.frontmatter, "updated"),
      degree: degree.get(page.id) ?? 0,
    });
  }

  const index: DocsIndexEntry[] = nodes
    .map((node) => {
      const page = pages.get(node.id);
      if (page === undefined) throw new DocsProjectionError(`missing page for ${node.id}`);
      return {
        id: page.id,
        relPath: page.relPath,
        route: page.route,
        title: page.title,
        section: page.section,
        excerpt: page.excerpt,
        dataPath: page.dataPath,
      };
    });

  return {
    index,
    pages,
    graph: {
      totals: { nodes: nodes.length, edges: edges.length, droppedLinks },
      nodes,
      edges,
    },
  };
}
