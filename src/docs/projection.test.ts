import { describe, expect, it } from "vitest";

import {
  DocsProjectionError,
  extractMarkdownLinks,
  isInScope,
  projectDocs,
  type DocsSource,
} from "./projection";

function sourceFrom(files: Record<string, string>): DocsSource {
  return {
    listFiles: () => Object.keys(files),
    read: (relPath) => {
      if (!(relPath in files)) throw new Error(`missing fixture ${relPath}`);
      return files[relPath];
    },
  };
}

const FIXTURES: Record<string, string> = {
  "README.md": [
    "---",
    "title: Root Readme",
    "---",
    "",
    "# Root Readme",
    "",
    "[arch](docs/architecture/overview.md)",
    "[arch again](docs/architecture/overview.md)",
    "[agents](AGENTS.md)",
    "",
    "```md",
    "[fake](docs/nope.md)",
    "```",
  ].join("\n"),
  "docs/README.md": [
    "---",
    "title: Docs Index",
    "---",
    "",
    "[overview](architecture/overview.md)",
  ].join("\n"),
  "docs/architecture/overview.md": [
    "---",
    "title: Overview",
    "authority: architecture",
    "status: active",
    "updated: 2026-09-01",
    "---",
    "",
    "# Overview",
    "",
    "Intro paragraph for the excerpt.",
    "",
    "[back](../../README.md)",
    "[top](#intro)",
    "![pic](pic.png)",
  ].join("\n"),
  "docs/architecture/deep/dive.md": [
    "# Dive",
    "",
    "[up](../overview.md)",
  ].join("\n"),
};

describe("projectDocs — index derivation", () => {
  const result = projectDocs(sourceFrom(FIXTURES));

  it("derives routes, sections, titles, and sorted order", () => {
    expect(result.index.map((entry) => entry.route)).toEqual([
      "/docs/architecture/deep/dive",
      "/docs/architecture/overview",
      "/docs/index",
      "/docs/readme",
    ]);
    const readme = result.index.find((entry) => entry.relPath === "README.md");
    expect(readme?.section).toBe("root");
    expect(readme?.title).toBe("Root Readme");
    const docsIndex = result.index.find((entry) => entry.relPath === "docs/README.md");
    expect(docsIndex?.section).toBe("docs");
    const dive = result.index.find((entry) => entry.relPath === "docs/architecture/deep/dive.md");
    expect(dive?.section).toBe("architecture");
    // No frontmatter title: falls back to the first h1, not the stem.
    expect(dive?.title).toBe("Dive");
  });

  it("derives excerpts from the first prose paragraph, skipping headings", () => {
    const overview = result.pages.get(
      result.index.find((entry) => entry.relPath === "docs/architecture/overview.md")!.id
    );
    expect(overview?.excerpt).toBe("Intro paragraph for the excerpt.");
    expect(overview?.headings[0]).toEqual({ depth: 1, text: "Overview", id: "overview" });
  });

  it("serves the body verbatim with frontmatter stripped", () => {
    const overview = result.pages.get(
      result.index.find((entry) => entry.relPath === "docs/architecture/overview.md")!.id
    );
    expect(overview?.content.startsWith("# Overview")).toBe(true);
    expect(overview?.content).not.toContain("authority:");
  });
});

describe("projectDocs — graph derivation", () => {
  const result = projectDocs(sourceFrom(FIXTURES));
  const idOf = (relPath: string) =>
    result.index.find((entry) => entry.relPath === relPath)!.id;

  it("derives deduped edges from corpus links and drops out-of-scope targets", () => {
    const readme = idOf("README.md");
    const overview = idOf("docs/architecture/overview.md");
    const edgeKeys = (edges: { source: string; target: string }[]) =>
      edges.map((edge) => `${edge.source}->${edge.target}`).sort();
    expect(edgeKeys(result.graph.edges)).toEqual(
      edgeKeys([
        { source: readme, target: overview },
        { source: idOf("docs/README.md"), target: overview },
        { source: overview, target: readme },
        { source: idOf("docs/architecture/deep/dive.md"), target: overview },
      ])
    );
    expect(result.graph.totals).toEqual({ nodes: 4, edges: 4, droppedLinks: 1 });
  });

  it("computes degree from incident deduped edges and carries frontmatter metadata", () => {
    const overviewNode = result.graph.nodes.find(
      (node) => node.relPath === "docs/architecture/overview.md"
    );
    expect(overviewNode?.degree).toBe(4);
    expect(overviewNode?.authority).toBe("architecture");
    expect(overviewNode?.status).toBe("active");
    expect(overviewNode?.updated).toBe("2026-09-01");
    // A doc without authority frontmatter reports null, not a fallback string.
    const diveNode = result.graph.nodes.find(
      (node) => node.relPath === "docs/architecture/deep/dive.md"
    );
    expect(diveNode?.authority).toBe(null);
  });

  it("is deterministic: two runs produce identical JSON", () => {
    const first = JSON.stringify(projectDocs(sourceFrom(FIXTURES)).graph);
    const second = JSON.stringify(projectDocs(sourceFrom(FIXTURES)).graph);
    expect(second).toBe(first);
  });
});

describe("projectDocs — fail-closed paths", () => {
  it("throws on a route collision (docs/index.md vs docs/README.md)", () => {
    const colliding = { ...FIXTURES, "docs/index.md": "# Index\n" };
    expect(() => projectDocs(sourceFrom(colliding))).toThrow(DocsProjectionError);
    expect(() => projectDocs(sourceFrom(colliding))).toThrow(/route collision.*\/docs\/index/);
  });

  it("throws on an unreadable corpus file", () => {
    const broken: DocsSource = {
      listFiles: () => ["README.md"],
      read: () => {
        throw new Error("EACCES");
      },
    };
    expect(() => projectDocs(broken)).toThrow(/cannot read README.md/);
  });
});

describe("scope and link extraction units", () => {
  it("admits public markdown and excludes internal documents even when tracked", () => {
    expect(isInScope("README.md")).toBe(true);
    expect(isInScope("docs/a/b.md")).toBe(true);
    expect(isInScope("docs/README.md")).toBe(true);
    expect(isInScope("AGENTS.md")).toBe(false);
    expect(isInScope("CLAUDE.md")).toBe(false);
    expect(isInScope("docs/internal/x.md")).toBe(false);
    expect(isInScope("docs/internal/nested/x.md")).toBe(false);
    expect(isInScope("docs/internal-guide.md")).toBe(true);
    expect(isInScope("docs/img.png")).toBe(false);
    expect(isInScope("packages/ds-react/README.md")).toBe(false);
  });

  it("extracts links outside fences and skips images", () => {
    const links = extractMarkdownLinks(
      "a [x](b.md) c\n```\n[f](fenced.md)\n```\n![](img.md)\n[d](d.md \"title\")"
    );
    expect(links.map((link) => link.href)).toEqual(["b.md", "d.md"]);
  });
});

describe("projectDocs — internal corpus boundary", () => {
  it("omits internal pages and graph endpoints without reading their bodies", () => {
    const files = {
      ...FIXTURES,
      "docs/internal/adjudication.md": "# Private internal note\n[public](../README.md)",
    };
    const source = sourceFrom(files);
    const readPaths: string[] = [];
    const result = projectDocs({
      listFiles: source.listFiles,
      read: (relPath) => {
        readPaths.push(relPath);
        return source.read(relPath);
      },
    });
    expect(readPaths).toEqual(Object.keys(FIXTURES).sort());
    expect(result.index.map((entry) => entry.relPath).sort()).toEqual(Object.keys(FIXTURES).sort());
    expect([...result.pages.values()].map((page) => page.relPath)).toEqual(Object.keys(FIXTURES).sort());
    expect(result.graph.nodes.map((node) => node.relPath).sort()).toEqual(Object.keys(FIXTURES).sort());
    expect(result.graph).toEqual(projectDocs(sourceFrom(FIXTURES)).graph);
  });
});
