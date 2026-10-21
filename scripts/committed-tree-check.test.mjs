#!/usr/bin/env node
/**
 * Tests for the committed-tree check (GOVERNED-CI-DRIFT-ROOTS-01).
 *
 * Every case runs the real script in a throwaway git repository, so a pass is
 * evidence about what git reports, not about a stubbed path list.
 *
 * Run: node --test scripts/committed-tree-check.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "committed-tree-check.mjs");
const HOOK = join(dirname(fileURLToPath(import.meta.url)), "..", ".githooks", "pre-push");
const ZERO = "0".repeat(40);

function git(repo, ...args) {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

function write(repo, path, contents) {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), contents);
}

/** A repository with a committed generated file under packages/ and a doc outside it. */
function repository(t) {
  const repo = mkdtempSync(join(tmpdir(), "committed-tree-check-"));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  git(repo, "init", "-q", "-b", "main");
  git(repo, "config", "user.name", "Test");
  git(repo, "config", "user.email", "test@example.com");
  write(repo, ".gitignore", "dist/\n");
  write(repo, "packages/ds-unity/Runtime/Components/Button.cs", "class Button {}\n");
  write(repo, "packages/ds-react/src/components/Button/Button.tsx", "export {};\n");
  write(repo, "docs/guide.md", "# Guide\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "initial");
  return repo;
}

function check(repo, ...args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: repo, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test("a regeneration that matches the commit passes", (t) => {
  const repo = repository(t);
  const result = check(repo, "generated");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /packages\/ matches HEAD/);
});

test("a changed byte in any package fails and names the file, not only the framework src trees", (t) => {
  const repo = repository(t);
  write(repo, "packages/ds-unity/Runtime/Components/Button.cs", "class Button { int x; }\n");
  const result = check(repo, "generated");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /1 path\(s\) under packages\/ differ from HEAD/);
  assert.match(result.stderr, /^ {2}M {2}packages\/ds-unity\/Runtime\/Components\/Button\.cs$/m);
});

test("a staged but uncommitted change fails: the check compares the commit, not the index", (t) => {
  const repo = repository(t);
  write(repo, "packages/ds-react/src/components/Button/Button.tsx", "export const x = 1;\n");
  git(repo, "add", "-A");
  const result = check(repo, "generated");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /M {2}packages\/ds-react\/src\/components\/Button\/Button\.tsx/);
});

test("an untracked generated file fails, and an ignored one does not", (t) => {
  const repo = repository(t);
  write(repo, "packages/ds-react/dist/index.js", "ignored build output\n");
  write(repo, "packages/ds-react/src/components/Chip/Chip.tsx", "export {};\n");
  const result = check(repo, "generated");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /1 path\(s\)/);
  assert.match(result.stderr, /\?\? packages\/ds-react\/src\/components\/Chip\/Chip\.tsx/);
  assert.doesNotMatch(result.stderr, /dist/);
});

test("a deleted committed file fails", (t) => {
  const repo = repository(t);
  rmSync(join(repo, "packages/ds-unity/Runtime/Components/Button.cs"));
  const result = check(repo, "generated");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /D {2}packages\/ds-unity\/Runtime\/Components\/Button\.cs/);
});

test("the generated check is bounded to packages/; the push check is not", (t) => {
  const repo = repository(t);
  write(repo, "docs/guide.md", "# Guide, edited\n");
  assert.equal(check(repo, "generated").status, 0);
  const pushed = check(repo, "pushed", "HEAD");
  assert.equal(pushed.status, 1);
  assert.match(pushed.stderr, /M {2}docs\/guide\.md/);
});

test("--against compares a revision other than HEAD", (t) => {
  const repo = repository(t);
  const first = git(repo, "rev-parse", "HEAD");
  write(repo, "packages/ds-unity/Runtime/Components/Button.cs", "class Button { int y; }\n");
  git(repo, "commit", "-q", "-am", "second");
  assert.equal(check(repo, "generated").status, 0);
  const against = check(repo, "generated", "--against", first);
  assert.equal(against.status, 1);
  assert.match(against.stderr, /Button\.cs/);
});

test("pushed: a tree equal to the pushed commit passes; a tree carrying later work fails", (t) => {
  const repo = repository(t);
  const pushedTip = git(repo, "rev-parse", "HEAD");
  write(repo, "docs/guide.md", "# Guide, next commit\n");
  git(repo, "commit", "-q", "-am", "unpushed follow-up");
  const head = git(repo, "rev-parse", "HEAD");
  assert.equal(check(repo, "pushed", head).status, 0);
  const stale = check(repo, "pushed", pushedTip);
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, new RegExp(`differs from the commit being pushed \\(${pushedTip}\\)`));
  assert.match(stale.stderr, /M {2}docs\/guide\.md/);
});

test("pushed: an untracked, non-ignored file anywhere refuses the push and is named", (t) => {
  const repo = repository(t);
  write(repo, "packages/ds-react/src/primitives/message-format.d.ts", "export {};\n");
  const result = check(repo, "pushed", "HEAD");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\?\? packages\/ds-react\/src\/primitives\/message-format\.d\.ts/);
  assert.match(result.stderr, /Commit or remove these files/);
});

test("a path containing spaces is named exactly", (t) => {
  const repo = repository(t);
  write(repo, "packages/ds-figma-plugin/src/generated/a b.json", "{}\n");
  const result = check(repo, "generated");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\?\? packages\/ds-figma-plugin\/src\/generated\/a b\.json$/m);
});

test("an unknown revision fails closed with exit 2, never as clean", (t) => {
  const repo = repository(t);
  const result = check(repo, "pushed", "0123456789abcdef0123456789abcdef01234567");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /does not name a commit/);
});

/**
 * Runs the real pre-push hook in a repository that carries the check script.
 * Only the hook's first step is under test: a refusal ends the hook there, and
 * a pass reaches the classifier contract, which this repository lacks.
 */
function prePush(repo, updates) {
  const input = updates.map(([ref, sha]) => `${ref} ${sha} ${ref} ${ZERO}`).join("\n") + "\n";
  return spawnSync("bash", [HOOK, "origin", "https://example.invalid/repo.git"], { cwd: repo, input, encoding: "utf8" });
}

function hookRepository(t) {
  const repo = repository(t);
  write(repo, "scripts/committed-tree-check.mjs", readFileSync(SCRIPT, "utf8"));
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "carry the check");
  return repo;
}

test("pre-push compares every pushed tip with the working tree, whichever ref comes first", (t) => {
  const repo = hookRepository(t);
  const checkedOut = git(repo, "rev-parse", "HEAD");
  git(repo, "checkout", "-q", "-b", "other");
  write(repo, "docs/guide.md", "# Guide, on another branch\n");
  git(repo, "commit", "-q", "-am", "other branch");
  const other = git(repo, "rev-parse", "HEAD");
  git(repo, "checkout", "-q", "main");
  for (const updates of [
    [["refs/heads/main", checkedOut], ["refs/heads/other", other]],
    [["refs/heads/other", other], ["refs/heads/main", checkedOut]],
  ]) {
    const result = prePush(repo, updates);
    assert.equal(result.status, 1, `order ${updates.map(([ref]) => ref).join(", ")}`);
    assert.match(result.stderr, new RegExp(`differs from the commit being pushed \\(${other}\\)`));
    assert.match(result.stderr, /M {2}docs\/guide\.md/);
  }
});

test("pre-push passes the tree check when every pushed tip matches the working tree", (t) => {
  const repo = hookRepository(t);
  const head = git(repo, "rev-parse", "HEAD");
  const result = prePush(repo, [["refs/heads/main", head], ["refs/heads/mirror", head]]);
  assert.doesNotMatch(result.stderr, /differs from the commit being pushed/);
  assert.equal(result.stdout.match(/committed-tree-check: the working tree matches/g)?.length, 2);
});

test("a usage error exits 2", (t) => {
  const repo = repository(t);
  for (const args of [[], ["pushed"], ["generated", "--against"], ["generated", "HEAD"], ["other", "HEAD"]]) {
    const result = check(repo, ...args);
    assert.equal(result.status, 2, `args ${JSON.stringify(args)}`);
    assert.match(result.stderr, /^usage:/);
  }
});
