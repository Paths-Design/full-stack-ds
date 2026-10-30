#!/usr/bin/env node
/**
 * Committed-tree check — one implementation of "the bytes on disk are the
 * bytes in the commit", shared by CI and the pre-push hook
 * (GOVERNED-CI-DRIFT-ROOTS-01).
 *
 *   node scripts/committed-tree-check.mjs generated [--against <rev>]
 *     After regeneration: nothing under packages/ differs from <rev>
 *     (default HEAD) and no untracked, non-ignored file appeared there. The
 *     generator writes from several code paths (components, barrels,
 *     primitives, runtimes, glyphs, descriptors) into every target package, so
 *     the check covers the whole tree rather than a list of roots that has to
 *     follow each new writer.
 *
 *   node scripts/committed-tree-check.mjs pushed <rev>
 *     Before the pre-push gates: the whole working tree equals <rev>. The gates
 *     read the working tree while the push publishes <rev>, so any difference
 *     (a tracked edit, staged or not, or an untracked file lint and tests
 *     would read) makes their verdict about bytes the push does not carry.
 *
 * Exit 0 when the trees match, 1 with the differing paths, 2 on a usage or git
 * error (fail closed: an unreadable revision never reads as clean).
 */
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const GENERATED_PATHSPEC = "packages";
const LISTED = 50;

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${(result.stderr || result.error?.message || "").trim()}`);
  }
  return result.stdout;
}

/** Paths differing from `rev` under `pathspec` (all paths when omitted), with git's status letter. */
export function differingPaths(rev, pathspec) {
  const scope = pathspec ? ["--", pathspec] : ["--"];
  if (spawnSync("git", ["rev-parse", "--verify", "--quiet", `${rev}^{commit}`]).status !== 0) {
    throw new Error(`${rev} does not name a commit`);
  }
  const tracked = git(["diff", "--name-status", "--no-renames", "-z", rev, ...scope]).split("\0");
  const found = new Map();
  for (let i = 0; i + 1 < tracked.length; i += 2) {
    if (tracked[i]) found.set(tracked[i + 1], tracked[i]);
  }
  for (const path of git(["ls-files", "--others", "--exclude-standard", "-z", ...scope]).split("\0")) {
    if (path) found.set(path, "??");
  }
  return [...found].map(([path, status]) => ({ path, status })).sort((a, b) => a.path.localeCompare(b.path));
}

function report(lines, paths) {
  for (const line of lines) console.error(line);
  for (const { path, status } of paths.slice(0, LISTED)) console.error(`  ${status.padEnd(2)} ${path}`);
  if (paths.length > LISTED) console.error(`  … and ${paths.length - LISTED} more`);
}

function main(argv) {
  const [mode, ...rest] = argv;
  let rev;
  if (mode === "generated") {
    if (rest.length === 0) rev = "HEAD";
    else if (rest.length === 2 && rest[0] === "--against") rev = rest[1];
  } else if (mode === "pushed" && rest.length === 1) {
    rev = rest[0];
  }
  if (!rev) {
    console.error("usage: committed-tree-check.mjs generated [--against <rev>] | pushed <rev>");
    return 2;
  }

  let paths;
  try {
    paths = differingPaths(rev, mode === "generated" ? GENERATED_PATHSPEC : undefined);
  } catch (error) {
    console.error(`committed-tree-check: ${error.message}`);
    return 2;
  }

  if (paths.length === 0) {
    console.log(
      mode === "generated"
        ? `committed-tree-check: packages/ matches ${rev} — no changed or untracked file`
        : `committed-tree-check: the working tree matches ${rev}`,
    );
    return 0;
  }
  if (mode === "generated") {
    report(
      [
        `committed-tree-check: ${paths.length} path(s) under packages/ differ from ${rev} after regeneration.`,
        "The commit does not carry the generator's output: regenerate, commit the result, and push again.",
      ],
      paths,
    );
  } else {
    report(
      [
        `committed-tree-check: the working tree differs from the commit being pushed (${rev}) in ${paths.length} path(s).`,
        "The pre-push gates read the working tree, so they would judge bytes this push does not carry.",
        "Commit or remove these files, or push from a checkout that matches the commit.",
      ],
      paths,
    );
  }
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
