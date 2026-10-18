import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { sourceManifest } from "./source-manifest.mjs";

const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const fixture = t => {
  const root = mkdtempSync(join(tmpdir(), "fsds-source-manifest-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

test("regular files bind exact bytes and missing tracked paths remain explicit", t => {
  const root = fixture(t);
  const bytes = Buffer.from([0, 255, 10, 13]);
  writeFileSync(join(root, "source.bin"), bytes);
  assert.deepEqual(sourceManifest(["source.bin", "deleted.txt"], root), [
    { file: "source.bin", kind: "file", sha256: digest(bytes) },
    { file: "deleted.txt", kind: "missing", sha256: null },
  ]);
  writeFileSync(join(root, "source.bin"), "changed");
  assert.deepEqual(sourceManifest(["source.bin"], root), [
    { file: "source.bin", kind: "file", sha256: digest("changed") },
  ]);
  assert.deepEqual(sourceManifest([], root), []);
});

test("file, directory and dangling symlinks bind target text without reading targets", t => {
  const root = fixture(t);
  writeFileSync(join(root, "source.txt"), "original content");
  mkdirSync(join(root, "build"));
  symlinkSync("source.txt", join(root, "file-link"));
  symlinkSync("build", join(root, "debug"));
  symlinkSync("absent", join(root, "dangling"));
  const files = ["file-link", "debug", "dangling"];
  const expected = [
    { file: "file-link", kind: "symlink", sha256: digest("source.txt") },
    { file: "debug", kind: "symlink", sha256: digest("build") },
    { file: "dangling", kind: "symlink", sha256: digest("absent") },
  ];
  assert.deepEqual(sourceManifest(files, root), expected);
  writeFileSync(join(root, "source.txt"), "changed target content");
  rmSync(join(root, "build"), { recursive: true });
  assert.deepEqual(sourceManifest(files, root), expected);
  unlinkSync(join(root, "file-link"));
  symlinkSync("absent", join(root, "file-link"));
  assert.deepEqual(sourceManifest(["file-link"], root), [
    { file: "file-link", kind: "symlink", sha256: digest("absent") },
  ]);
});

test("symlink target hashes preserve non-UTF-8 bytes", t => {
  const root = fixture(t);
  const target = Buffer.from([0x66, 0x80, 0xff]);
  symlinkSync(target, join(root, "raw-link"));
  assert.deepEqual(sourceManifest(["raw-link"], root), [
    { file: "raw-link", kind: "symlink", sha256: digest(target) },
  ]);
});

test("directories and unexpected filesystem errors fail instead of disappearing", t => {
  const root = fixture(t);
  mkdirSync(join(root, "directory"));
  assert.throws(() => sourceManifest(["directory"], root), /Unsupported source manifest entry: directory/);
  writeFileSync(join(root, "file"), "content");
  assert.throws(() => sourceManifest(["file/child"], root), { code: "ENOTDIR" });
});
