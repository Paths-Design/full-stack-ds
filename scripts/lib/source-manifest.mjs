import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readlinkSync } from "node:fs";
import { resolve } from "node:path";

const digest = bytes => createHash("sha256").update(bytes).digest("hex");

// Bind working-tree entries without traversing symlinks, including dangling ones.
// Like Git's symlink blobs, a symlink digest covers the target text itself.
export function sourceManifest(files, root = ".") {
  return files.map(file => {
    const absolute = resolve(root, file);
    let entry;
    try {
      entry = lstatSync(absolute);
    } catch (error) {
      if (error.code === "ENOENT") return { file, kind: "missing", sha256: null };
      throw error;
    }
    if (entry.isSymbolicLink()) {
      return { file, kind: "symlink", sha256: digest(readlinkSync(absolute, { encoding: "buffer" })) };
    }
    if (entry.isFile()) return { file, kind: "file", sha256: digest(readFileSync(absolute)) };
    throw new Error(`Unsupported source manifest entry: ${file} (expected a file or symlink)`);
  });
}
