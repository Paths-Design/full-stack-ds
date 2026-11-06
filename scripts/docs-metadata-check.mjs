#!/usr/bin/env node
/** Enforce the tracked-document metadata contract in docs/document_governance.md. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const AUTHORITIES = new Set([
  "canonical", "policy", "architecture", "adr", "spec", "roadmap",
  "reference", "working", "ephemeral",
]);
const STATUSES = new Set([
  "draft", "active", "implemented", "proven", "superseded", "archived",
]);
const LOCAL_AUTHORITIES = new Set(["roadmap", "working", "ephemeral"]);
const GOVERNING_AUTHORITIES = new Set(["canonical", "architecture", "adr", "spec"]);
const REQUIRED_FIELDS = ["doc_id", "authority", "status", "title", "owner", "updated"];
const nonemptyString = (value) => typeof value === "string" && value.trim().length > 0;
const nonemptyList = (value) => Array.isArray(value) && value.length > 0 && value.every(nonemptyString);

/** The caller supplies only tracked paths; local notes are deliberately outside this contract. */
export function checkDocument(path, text) {
  if (!path.startsWith("docs/") || !path.endsWith(".md")) return [];
  // Internal output is contributor-local, even when its basename is README.md.
  if (path.startsWith("docs/internal/")) {
    return ["tracked document belongs on a durable docs/ surface; docs/internal/ is machine-local"];
  }
  if (path.startsWith("docs/archive/") || path.split("/").at(-1) === "README.md") return [];

  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) return ["missing YAML frontmatter block"];
  let metadata;
  try {
    // JSON_SCHEMA preserves ISO dates as strings, matching the authored metadata contract.
    metadata = yaml.load(frontmatter[1], { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    return [`invalid YAML frontmatter: ${error.reason ?? error.message}`];
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return ["frontmatter must be a YAML mapping"];
  }

  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!nonemptyString(metadata[field])) errors.push(`${field} must be a nonempty string`);
  }
  if (!AUTHORITIES.has(metadata.authority)) errors.push("authority is not a documented authority value");
  if (!STATUSES.has(metadata.status)) errors.push("status is not a documented lifecycle value");
  if (nonemptyString(metadata.updated)) {
    const parsed = Date.parse(metadata.updated);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.updated) || !Number.isFinite(parsed) ||
        new Date(parsed).toISOString().slice(0, 10) !== metadata.updated) {
      errors.push("updated must be a valid ISO date (YYYY-MM-DD)");
    }
  }
  if (LOCAL_AUTHORITIES.has(metadata.authority)) {
    errors.push(`${metadata.authority} authority belongs in untracked docs/internal/`);
  }
  if (GOVERNING_AUTHORITIES.has(metadata.authority) && !nonemptyList(metadata.governs)) {
    errors.push("governs must be a nonempty list of paths for this authority");
  }
  if (["implemented", "proven"].includes(metadata.status) && !nonemptyString(metadata.verified_at_commit)) {
    errors.push("verified_at_commit is required for implemented/proven documents");
  }
  if (metadata.status === "superseded" && !nonemptyString(metadata.superseded_by)) {
    errors.push("superseded_by is required for superseded documents");
  }
  if (metadata.authority === "roadmap" && !nonemptyList(metadata.caws_specs)) {
    errors.push("caws_specs must be a nonempty list for roadmap documents");
  }
  return errors;
}

export function checkRepository(repoRoot) {
  const paths = execFileSync("git", ["ls-files", "-z", "--", "docs/**/*.md", "docs/*.md"], {
    cwd: repoRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  }).split("\0").filter(Boolean);
  const errors = [];
  for (const path of paths) {
    try {
      for (const message of checkDocument(path, readFileSync(resolve(repoRoot, path), "utf8"))) {
        errors.push(`${path}: ${message}`);
      }
    } catch (error) {
      errors.push(`${path}: could not read tracked document: ${error.message}`);
    }
  }
  return { checked: paths.length, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkRepository(process.cwd());
    if (result.errors.length > 0) {
      console.error(`docs-metadata-check: ${result.errors.length} violation(s):\n${result.errors.join("\n")}`);
      process.exitCode = 1;
    } else {
      console.log(`docs-metadata-check: OK — ${result.checked} tracked docs satisfy metadata/location rules.`);
    }
  } catch (error) {
    console.error(`docs-metadata-check: could not enumerate tracked documents: ${error.message}`);
    process.exitCode = 2;
  }
}
