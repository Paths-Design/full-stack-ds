import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { checkDocument, checkRepository } from "./docs-metadata-check.mjs";

function document(overrides = {}) {
  const fields = { doc_id: "REF-FIXTURE", authority: "reference", status: "active", title: "Fixture", owner: "@owner", updated: "2026-11-05", ...overrides };
  return `---\n${Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n# Fixture\n`;
}
const check = (text) => checkDocument("docs/fixture.md", text);

test("active references and declared governing scopes pass", () => {
  assert.deepEqual(check(document()), []);
  assert.deepEqual(check(document({ authority: "architecture", governs: ["src/**"] })), []);
  assert.deepEqual(check(document({ status: "archived" })), []);
});

test("missing blocks, malformed YAML and non-mapping blocks fail", () => {
  assert.deepEqual(check("# Fixture\n"), ["missing YAML frontmatter block"]);
  assert.match(check("---\ntitle: Unquoted: colon\n---\n")[0], /^invalid YAML frontmatter:/);
  assert.deepEqual(check("---\n- item\n---\n"), ["frontmatter must be a YAML mapping"]);
  assert.deepEqual(check("---\nnull\n---\n"), ["frontmatter must be a YAML mapping"]);
});

test("every required field rejects missing, empty and non-string values", () => {
  for (const field of ["doc_id", "authority", "status", "title", "owner", "updated"]) {
    for (const value of [undefined, " ", 42, null]) {
      assert.ok(check(document({ [field]: value })).includes(`${field} must be a nonempty string`), `${field}: ${JSON.stringify(value)}`);
    }
  }
});

test("unknown enums and invalid calendar dates fail", () => {
  assert.ok(check(document({ authority: "approved" })).includes("authority is not a documented authority value"));
  assert.ok(check(document({ status: "done" })).includes("status is not a documented lifecycle value"));
  for (const updated of ["yesterday", "2026-02-30", "2026-11-05T00:00:00Z"]) {
    assert.ok(check(document({ updated })).includes("updated must be a valid ISO date (YYYY-MM-DD)"));
  }
});

test("governing authorities require a real list, including ADRs", () => {
  for (const authority of ["canonical", "architecture", "adr", "spec"]) {
    for (const governs of [undefined, [], { modules: ["src/**"] }, [""]]) {
      assert.ok(check(document({ authority, governs })).includes("governs must be a nonempty list of paths for this authority"));
    }
    assert.deepEqual(check(document({ authority, governs: ["src/**"] })), []);
  }
});

test("verified and superseded statuses retain their conditional obligations", () => {
  for (const status of ["implemented", "proven"]) {
    assert.deepEqual(check(document({ status })), ["verified_at_commit is required for implemented/proven documents"]);
    assert.deepEqual(check(document({ status, verified_at_commit: "abc1234" })), []);
  }
  assert.deepEqual(check(document({ status: "superseded" })), ["superseded_by is required for superseded documents"]);
  assert.deepEqual(check(document({ status: "superseded", superseded_by: "REF-REPLACEMENT" })), []);
});

test("ephemeral authorities and tracked internal paths cannot become durable docs", () => {
  for (const authority of ["roadmap", "working", "ephemeral"]) {
    assert.ok(check(document({ authority })).includes(`${authority} authority belongs in untracked docs/internal/`));
  }
  assert.ok(check(document({ authority: "roadmap" })).includes("caws_specs must be a nonempty list for roadmap documents"));
  assert.deepEqual(check(document({ authority: "roadmap", caws_specs: ["WORK-01"] })), ["roadmap authority belongs in untracked docs/internal/"]);
  for (const path of ["docs/internal/record.md", "docs/internal/audit/README.md"]) {
    assert.deepEqual(checkDocument(path, "# Local\n"), ["tracked document belongs on a durable docs/ surface; docs/internal/ is machine-local"]);
  }
});

test("README and archive exemptions do not extend outside their documented paths", () => {
  for (const path of ["README.md", "examples/example.md", "docs/README.md", "docs/audit/README.md", "docs/archive/history.md"]) {
    assert.deepEqual(checkDocument(path, "# Exempt\n"), []);
  }
  assert.deepEqual(checkDocument("docs/archive-like/history.md", "# Governed\n"), ["missing YAML frontmatter block"]);
});

test("real git discovery includes tracked ignored docs and excludes local scratch", () => {
  const root = mkdtempSync(join(tmpdir(), "docs-metadata-"));
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" });
  try {
    git("init", "--quiet");
    write(".gitignore", "docs/internal/\n");
    write("docs/fixture.md", document());
    write("docs/internal/local.md", "# Local scratch\n");
    write("docs/untracked.md", "# Untracked\n");
    git("add", ".gitignore", "docs/fixture.md");
    assert.deepEqual(checkRepository(root), { checked: 1, errors: [] });
    git("add", "--force", "docs/internal/local.md");
    assert.deepEqual(checkRepository(root), { checked: 2, errors: ["docs/internal/local.md: tracked document belongs on a durable docs/ surface; docs/internal/ is machine-local"] });
    git("rm", "--cached", "--force", "docs/internal/local.md");
    write("docs/fixture.md", "# Missing metadata\n");
    const script = fileURLToPath(new URL("./docs-metadata-check.mjs", import.meta.url));
    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /docs\/fixture\.md: missing YAML frontmatter block/);
    write("docs/fixture.md", document());
    const passed = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
    assert.equal(passed.status, 0);
    assert.match(passed.stdout, /1 tracked docs satisfy metadata\/location rules/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
