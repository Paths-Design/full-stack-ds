/**
 * Package source trees hold sources, not compiled declarations of them
 * (SVELTE-PACKAGE-DTS-SCOPE-01).
 *
 * A `.d.ts` beside a same-named `.ts`/`.tsx`/`.mts` is compiler output. Nothing
 * resolves it (TypeScript and Vite pick the source), nothing regenerates it, so
 * it drifts from the source it describes, and lint reads it as hand-written
 * code. svelte-package once wrote these into packages/ds-react/src: the Svelte
 * tests import ds-react's shared contracts, and TypeScript writes the
 * declaration of a file outside rootDir beside its source.
 *
 * The scan reads the filesystem, not the index, so an untracked stray left by a
 * local build fails here too, naming the file.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts"];
const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist"]);

function sourceRoots(): string[] {
  const packages = join(REPO_ROOT, "packages");
  const roots = readdirSync(packages, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packages, entry.name, "src"));
  return [join(REPO_ROOT, "src"), ...roots].filter((root) => existsSync(root));
}

function shadowingDeclarations(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name) && !entry.name.startsWith(".")) {
        shadowingDeclarations(path, found);
      }
    } else if (entry.name.endsWith(".d.ts")) {
      const stem = path.slice(0, -".d.ts".length);
      if (SOURCE_EXTENSIONS.some((extension) => existsSync(stem + extension))) {
        found.push(relative(REPO_ROOT, path));
      }
    }
  }
  return found;
}

describe("package source trees", () => {
  it("hold no compiled declaration beside the source it was compiled from", () => {
    const roots = sourceRoots();
    expect(roots).toContain(join(REPO_ROOT, "packages", "ds-react", "src"));
    expect(roots.flatMap((root) => shadowingDeclarations(root))).toEqual([]);
  });
});
