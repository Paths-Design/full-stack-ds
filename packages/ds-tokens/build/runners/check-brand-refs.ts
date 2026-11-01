#!/usr/bin/env node
/**
 * Brand reference verifier.
 *
 * The token build deliberately skips reference validation inside brand files
 * (see global.ts loadBrandTokens — comment block around line 620): brand
 * overrides land in a separate cascade layer with a local `definedVars` set
 * that doesn't include the full core/semantic graph, so the normal
 * validator can't enforce cross-tier refs at build time. The cost is that a
 * brand file can name `{color.palette.cobalt.500}` (which doesn't exist)
 * and the build still succeeds — the missing var just silently doesn't
 * apply.
 *
 * This runner closes that hole offline. It:
 *   1. Loads the composed core+semantic graph from generated/composed.tokens.json
 *   2. Flattens it to a Set of valid token paths (only nodes with $type)
 *   3. Walks every src/brands/*.tokens.json (skipping files starting with _)
 *      and collects every {ref.path} from $value strings and from the
 *      design-paths $extensions (fsds.light, fsds.dark, design.paths.*)
 *   4. Reports any references that don't resolve to a valid token, grouped
 *      by brand, with suggested nearest-match paths
 *
 * Exit code: 0 if every brand ref resolves, 1 if any are missing,
 * 2 if the composed graph hasn't been built yet.
 *
 * Usage:
 *   pnpm tokens:check-brand-refs           # human-readable report
 *   pnpm tokens:check-brand-refs --json    # JSON for downstream tooling
 */

import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../core/index.js";
import { collectValidPaths, resolveBrandReference } from "../lib/brand-reference.js";
export { collectValidPaths } from "../lib/brand-reference.js";

export interface UnresolvedRef {
  brand: string;
  file: string;
  tokenPath: string[];        // path inside the brand file (e.g. ["color","foreground","accent"])
  source: "$value" | string;  // "$value" or an $extensions key like "fsds.dark"
  ref: string;                // the bare path, no braces
  suggestions: string[];      // up to 3 closest matches in the composed graph
}

export interface Report {
  brand: string;
  file: string;
  refsChecked: number;
  unresolved: UnresolvedRef[];
}

const REF_RE = /^\{([a-zA-Z][a-zA-Z0-9._-]*)\}$/;
const INLINE_REF_RE = /\{([a-zA-Z][a-zA-Z0-9._-]*)\}/g;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Walk a brand file and collect every {ref} from $value and from the
 * extension paths we care about (light/dark variants).
 *
 * Brand files don't carry the layer prefix — the build resolves
 * "{color.palette.red.500}" against the implicit "core." root. The
 * composed graph IS rooted at "core.*" / "semantic.*", so we need to try
 * both forms when checking each ref.
 */
export function collectRefsFromBrandFile(
  node: unknown,
  filePath: string,
  brand: string,
  validPaths: Set<string>,
  pathSoFar: string[],
  out: UnresolvedRef[],
  counter: { value: number },
): void {
  if (!isPlainObject(node)) return;

  // Leaf token: has $value (and usually $type).
  if ("$value" in node || "$type" in node) {
    // Check $value
    if (typeof node.$value === "string") {
      const m = REF_RE.exec(node.$value.trim());
      if (m) {
        counter.value += 1;
        const ref = m[1];
        if (!resolvesAgainstGraph(ref, validPaths)) {
          out.push({
            brand,
            file: filePath,
            tokenPath: pathSoFar,
            source: "$value",
            ref,
            suggestions: nearestMatches(ref, validPaths),
          });
        }
      }
      // Note: brand files might also embed inline refs inside other
      // strings (e.g. composite tokens), but in practice $value for color
      // and dimension tokens is always a plain reference. We handle the
      // composite case via the generic walk below.
    }

    // Check $extensions for design-paths style refs
    if (isPlainObject(node.$extensions)) {
      for (const [extKey, extValue] of Object.entries(node.$extensions)) {
        if (typeof extValue !== "string") continue;
        // Only count refs in keys that look like resolvable paths.
        // We accept either fsds.* (this project) or design.paths.* (DTCG-ish convention).
        if (!extKey.startsWith("fsds.") && !extKey.startsWith("design.paths.")) {
          continue;
        }
        const m = REF_RE.exec(extValue.trim());
        if (!m) continue;
        counter.value += 1;
        const ref = m[1];
        if (!resolvesAgainstGraph(ref, validPaths)) {
          out.push({
            brand,
            file: filePath,
            tokenPath: pathSoFar,
            source: extKey,
            ref,
            suggestions: nearestMatches(ref, validPaths),
          });
        }
      }
    }

    // Recurse into nested children too — composite tokens can hold refs
    // inside { fontFamily: "{...}", ... } values.
    if (isPlainObject(node.$value)) {
      for (const [key, value] of Object.entries(node.$value)) {
        if (typeof value !== "string") continue;
        let m: RegExpExecArray | null;
        INLINE_REF_RE.lastIndex = 0;
        while ((m = INLINE_REF_RE.exec(value)) !== null) {
          counter.value += 1;
          const ref = m[1];
          if (!resolvesAgainstGraph(ref, validPaths)) {
            out.push({
              brand,
              file: filePath,
              tokenPath: [...pathSoFar, "$value", key],
              source: "$value",
              ref,
              suggestions: nearestMatches(ref, validPaths),
            });
          }
        }
      }
    }

    return;
  }

  // Group node: recurse, skipping $-prefixed keys (metadata like $brand).
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    collectRefsFromBrandFile(value, filePath, brand, validPaths, [...pathSoFar, key], out, counter);
  }
}

/**
 * Brand $value refs come unprefixed (e.g. "{color.palette.red.500}"). The
 * composed graph is rooted under "core" and "semantic". A bare ref counts
 * as resolved if either the prefixed form or the literal form exists.
 */
export function resolvesAgainstGraph(ref: string, validPaths: Set<string>): boolean {
  return resolveBrandReference(ref, validPaths) !== undefined;
}

/**
 * Suggest near-matches for a missing ref. Strategy: rank every valid path
 * by how many trailing path segments match the requested ref, then by
 * Levenshtein distance on the final segment. Cheap, no deps, good enough
 * to spot mass-renames.
 */
export function nearestMatches(ref: string, validPaths: Set<string>): string[] {
  const refSegs = ref.split(".");
  const refLast = refSegs[refSegs.length - 1];
  const scored: Array<{ path: string; score: number }> = [];

  for (const candidate of validPaths) {
    const candSegs = candidate.split(".");
    // Strip core./semantic. prefix when comparing (brand refs are unprefixed).
    const compareSegs = candSegs[0] === "core" || candSegs[0] === "semantic"
      ? candSegs.slice(1)
      : candSegs;

    // Reward trailing segment matches heavily.
    let trailingMatches = 0;
    for (let i = 1; i <= Math.min(compareSegs.length, refSegs.length); i++) {
      if (compareSegs[compareSegs.length - i] === refSegs[refSegs.length - i]) {
        trailingMatches += 1;
      } else {
        break;
      }
    }

    // Edit distance on the final segment as a tiebreaker.
    const candLast = compareSegs[compareSegs.length - 1] ?? "";
    const editDist = levenshtein(refLast, candLast);

    // Lower score = better. Trailing matches contribute negatively, edit distance positively.
    const score = -trailingMatches * 10 + editDist;
    scored.push({ path: candidate, score });
  }

  scored.sort((a, b) => a.score - b.score);
  // Only keep results that have at least one trailing segment match OR
  // a small edit distance — otherwise the "suggestion" is noise.
  const filtered = scored.filter((s, idx) => {
    if (idx >= 30) return false;
    return s.score < 0 || s.score <= 3;
  });
  return filtered.slice(0, 3).map((s) => s.path);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[a.length][b.length];
}

export function formatReport(reports: Report[], totals: { refs: number; unresolved: number }): string {
  const lines: string[] = [];
  lines.push("");
  lines.push("=".repeat(64));
  lines.push(" Brand reference verifier");
  lines.push("=".repeat(64));
  lines.push("");

  for (const report of reports) {
    const status = report.unresolved.length === 0 ? "OK" : "MISS";
    lines.push(
      `[${status}] ${report.brand.padEnd(12)} ${report.refsChecked} refs checked, ${report.unresolved.length} unresolved`,
    );
  }

  lines.push("");
  lines.push("-".repeat(64));
  lines.push(` Total: ${totals.refs} refs across ${reports.length} brand(s), ${totals.unresolved} unresolved`);
  lines.push("-".repeat(64));

  const brandsWithIssues = reports.filter((r) => r.unresolved.length > 0);
  if (brandsWithIssues.length === 0) {
    lines.push("");
    lines.push(" All brand references resolve against the composed token graph.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("");
  for (const report of brandsWithIssues) {
    lines.push("");
    lines.push(`### ${report.brand}`);
    lines.push(`   ${report.file}`);
    lines.push("");

    // Group by ref for compactness — if the same missing ref appears for
    // light + dark + base in 12 places, show it once with the call sites.
    const byRef = new Map<string, UnresolvedRef[]>();
    for (const u of report.unresolved) {
      const list = byRef.get(u.ref) ?? [];
      list.push(u);
      byRef.set(u.ref, list);
    }
    const refs = Array.from(byRef.keys()).sort();

    for (const ref of refs) {
      const occurrences = byRef.get(ref)!;
      lines.push(`   - {${ref}}  (${occurrences.length} occurrence${occurrences.length === 1 ? "" : "s"})`);
      // Show up to 4 call sites
      for (const occ of occurrences.slice(0, 4)) {
        lines.push(`       at ${occ.tokenPath.join(".")}  via ${occ.source}`);
      }
      if (occurrences.length > 4) {
        lines.push(`       ... and ${occurrences.length - 4} more`);
      }
      const sample = occurrences[0];
      if (sample.suggestions.length > 0) {
        lines.push(`       suggest: ${sample.suggestions.map((s) => `{${s}}`).join("  ")}`);
      } else {
        lines.push(`       suggest: (no close match in composed graph)`);
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");

  if (!fs.existsSync(PATHS.tokens)) {
    console.error(`[brand-refs] composed.tokens.json not found at ${PATHS.tokens}`);
    console.error(`[brand-refs] Run \`pnpm tokens:build\` first.`);
    process.exit(2);
  }

  const composed = JSON.parse(fs.readFileSync(PATHS.tokens, "utf-8"));
  const validPaths = collectValidPaths(composed);

  const brandsDir = PATHS.brandsDir;
  if (!fs.existsSync(brandsDir)) {
    console.error(`[brand-refs] No brands directory at ${brandsDir}`);
    process.exit(2);
  }

  const brandFiles = fs
    .readdirSync(brandsDir)
    .filter((f) => f.endsWith(".tokens.json") && !f.startsWith("_"))
    .sort();

  const reports: Report[] = [];
  let totalRefs = 0;
  let totalUnresolved = 0;

  for (const file of brandFiles) {
    const filePath = path.join(brandsDir, file);
    const relPath = path.relative(process.cwd(), filePath);
    const brand = file.replace(".tokens.json", "");
    const brandData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const unresolved: UnresolvedRef[] = [];
    const counter = { value: 0 };
    collectRefsFromBrandFile(brandData, relPath, brand, validPaths, [], unresolved, counter);

    reports.push({
      brand,
      file: relPath,
      refsChecked: counter.value,
      unresolved,
    });
    totalRefs += counter.value;
    totalUnresolved += unresolved.length;
  }

  if (asJson) {
    console.log(JSON.stringify({ reports, totalRefs, totalUnresolved, validPathCount: validPaths.size }, null, 2));
  } else {
    console.log(formatReport(reports, { refs: totalRefs, unresolved: totalUnresolved }));
  }

  process.exit(totalUnresolved === 0 ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[brand-refs] runner crashed:", err);
    process.exit(2);
  });
}
