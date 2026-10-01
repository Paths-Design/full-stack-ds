import { buildCensus } from "./scripts/showcase-census";
import { buildDesignBindings } from './packages/ds-codegen/src/design-properties';
import type { ComponentContract as CodegenContract } from './packages/ds-codegen/src/contract';
import { readFile, readdir } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import type { Plugin } from "vite";
import type {
  ActivityEvent,
  BrandTokenSet,
  ComponentBundle,
  ComponentContract,
  ComponentSources,
  FoundationToken,
  Framework,
  PrimitiveBundle,
  SourceFile,
  UsageLine,
} from "./src/types/data";
import { buildBoxModelSurface } from "./material-surface";
import { deriveUsageComposition } from "./packages/ds-codegen/src/usage-composition";

/**
 * Parse a `<Name>.usage.jsonl` file. One example per line; blank lines are
 * skipped. Malformed lines are dropped (the codegen's validator is the
 * authoritative gate — by the time the showcase reads these files in dev,
 * the gate has already filtered out bad input upstream).
 */
function parseUsageJsonl(text: string): UsageLine[] {
  const out: UsageLine[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    try {
      out.push(JSON.parse(line) as UsageLine);
    } catch {
      // Skip; validator surfaces malformed lines elsewhere.
    }
  }
  return out;
}

const FRAMEWORKS: Framework[] = ["react", "vue", "svelte", "angular", "lit"];

const FRAMEWORK_FILE_PATTERNS: Record<Framework, (name: string) => string[]> = {
  react: (n) => [`${n}.tsx`, `use${n}.ts`],
  vue: (n) => [`${n}.vue`],
  svelte: (n) => [`${n}.svelte`],
  angular: (n) => [`${n}.component.ts`],
  lit: (n) => [`${n}.ts`],
};

const PRIMITIVE_FILES: Record<Framework, string[]> = {
  react: ["stack.tsx", "stack.css", "index.ts"],
  vue: ["Stack.vue", "index.ts"],
  svelte: ["Stack.svelte", "index.ts"],
  angular: ["Stack.component.ts", "index.ts"],
  lit: ["Stack.ts", "index.ts"],
};

const VIRTUAL_ID = "virtual:fsds/data";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

// Local alias kept for readability — the public type's ComponentSources is
// the same shape as the historical ComponentSourceSlot.
type ComponentSourceSlot = ComponentSources;

async function safeRead(p: string): Promise<string | null> {
  try {
    return await readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function tryFile(dir: string, name: string): Promise<SourceFile | undefined> {
  const full = path.join(dir, name);
  const code = await safeRead(full);
  if (code === null) return undefined;
  return { filename: name, code };
}

// Sibling-file extensions we expect to find inside a component directory.
// Compound-part SFCs, behavior hooks, and the root component all match one of
// these. Tests and CSS are excluded — CSS is gathered separately, tests aren't
// needed in the preview iframe.
const SIBLING_EXTS = new Set([".ts", ".tsx", ".vue", ".svelte"]);

/**
 * Heuristic: which file is the *root* component for this framework?
 * The bundle plugin already knows the canonical root pattern per framework
 * (FRAMEWORK_FILE_PATTERNS[fw](name)[0]). We match against that.
 */
function isRootComponentFilename(framework: Framework, componentName: string, filename: string): boolean {
  const patterns = FRAMEWORK_FILE_PATTERNS[framework](componentName);
  return filename === patterns[0];
}

/**
 * Heuristic: is this filename a behavior hook?
 * - React/Vue: `use<Name>.ts`
 * - Svelte: `use<Name>.svelte.ts`
 * - Angular: `use<Name>.ts`
 * - Lit: `<Name>Behavior.ts`
 */
function isHookFilename(componentName: string, filename: string): boolean {
  return (
    filename === `use${componentName}.ts` ||
    filename === `use${componentName}.svelte.ts` ||
    filename === `${componentName}Behavior.ts`
  );
}

async function gatherComponentSources(rootDir: string, componentName: string): Promise<ComponentBundle["sources"]> {
  const sources: ComponentBundle["sources"] = {};
  for (const fw of FRAMEWORKS) {
    const compDir = path.join(rootDir, "packages", `ds-${fw}`, "src", "components", componentName);
    if (!existsSync(compDir)) continue;

    const entries = await readdir(compDir, { withFileTypes: true });
    const slot: ComponentSourceSlot = { siblings: [] };

    for (const entry of entries) {
      if (entry.isDirectory()) continue;
      const filename = entry.name;
      if (filename.endsWith(".css")) {
        // Inline the .tokens.css sibling into <Component>.css so the
        // preview iframe sees both halves of the two-hop indirection
        // (TOKENS-WORKSTREAM-STEP-06A-III). The .css file has an
        // `@import "./<Component>.tokens.css";` line at the top; the
        // iframe inlines CSS text without a base URL, so that import
        // would fail. Resolving it here gives the iframe a single
        // self-contained stylesheet.
        if (filename === `${componentName}.css`) {
          const file = await tryFile(compDir, filename);
          if (file) {
            const tokens = await tryFile(compDir, `${componentName}.tokens.css`);
            const boxModel = await tryFile(path.join(compDir, "../../primitives"), "box-model.css");
            const consumerCode = file.code.replace(/@import\s+["']\.\.\/\.\.\/primitives\/box-model\.css["'];?\s*\n?/, "");
            if (tokens) {
              slot.css = {
                ...file,
                code: `${boxModel?.code ?? ""}\n${tokens.code}\n${consumerCode.replace(
                  new RegExp(`@import\\s+["']\\./${componentName}\\.tokens\\.css["'];?\\s*\\n?`),
                  "",
                )}`,
              };
            } else {
              slot.css = file;
            }
          }
        }
        continue;
      }
      // Skip test files and .test.ts/.spec.ts even if they live at the dir root.
      if (filename.endsWith(".test.ts") || filename.endsWith(".spec.ts")) continue;
      const ext = path.extname(filename);
      if (!SIBLING_EXTS.has(ext)) continue;

      const file = await tryFile(compDir, filename);
      if (!file) continue;
      slot.siblings.push(file);
      if (isRootComponentFilename(fw, componentName, filename)) {
        slot.component = file;
      } else if (isHookFilename(componentName, filename)) {
        slot.hook = file;
      }
    }

    // Stable sort by filename so consumers (and snapshots) see a deterministic
    // order regardless of underlying fs.readdir ordering.
    slot.siblings.sort((a, b) => a.filename.localeCompare(b.filename));

    if (slot.component || slot.css || slot.siblings.length > 0) {
      sources[fw] = slot;
    }
  }
  return sources;
}

async function gatherPrimitiveSources(rootDir: string): Promise<PrimitiveBundle["sources"]> {
  const sources: PrimitiveBundle["sources"] = {};
  for (const fw of FRAMEWORKS) {
    const dir = path.join(rootDir, "packages", `ds-${fw}`, "src", "primitives");
    if (!existsSync(dir)) continue;
    const files: SourceFile[] = [];
    for (const f of PRIMITIVE_FILES[fw]) {
      const sf = await tryFile(dir, f);
      if (sf) files.push(sf);
    }
    if (files.length > 0) sources[fw] = files;
  }
  return sources;
}

/**
 * A leaf in a tokens JSON is any object with `$value` (it may also have
 * `$type`, `$description`, `$extensions`). Branches are recursed into.
 */
type RawTokenNode = Record<string, unknown>;

function isTokenLeaf(node: unknown): node is RawTokenNode {
  return (
    typeof node === "object" &&
    node !== null &&
    Object.prototype.hasOwnProperty.call(node, "$value")
  );
}

function stringifyValue(value: unknown): { value?: string; valueByMode?: { light?: string; dark?: string } } {
  if (value == null) return {};
  if (typeof value === "string" || typeof value === "number") {
    return { value: String(value) };
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Resolved tokens may carry { light, dark } objects for mode-aware values.
    if ("light" in obj || "dark" in obj) {
      const light = obj.light != null ? String(obj.light) : undefined;
      const dark = obj.dark != null ? String(obj.dark) : undefined;
      return { value: light ?? dark, valueByMode: { light, dark } };
    }
    // W3C color object — fall back to JSON so the page can at least show it.
    return { value: JSON.stringify(obj) };
  }
  return { value: String(value) };
}

function flattenTokens(
  layer: FoundationToken["layer"],
  root: unknown,
  prefix: string[] = [],
): FoundationToken[] {
  const out: FoundationToken[] = [];
  if (!root || typeof root !== "object") return out;
  for (const [key, value] of Object.entries(root as Record<string, unknown>)) {
    if (key.startsWith("$")) continue; // group-level metadata; skip
    if (isTokenLeaf(value)) {
      const leaf = value as RawTokenNode;
      const { value: rendered, valueByMode } = stringifyValue(leaf.$value);
      const entry: FoundationToken = {
        layer,
        path: [...prefix, key].join("."),
      };
      if (typeof leaf.$type === "string") entry.type = leaf.$type;
      if (typeof leaf.$description === "string") entry.description = leaf.$description;
      if (rendered !== undefined) entry.value = rendered;
      if (valueByMode && (valueByMode.light || valueByMode.dark)) entry.valueByMode = valueByMode;
      if (leaf.$extensions && typeof leaf.$extensions === "object") {
        entry.extensions = leaf.$extensions as Record<string, unknown>;
      }
      out.push(entry);
      continue;
    }
    if (value && typeof value === "object") {
      out.push(...flattenTokens(layer, value, [...prefix, key]));
    }
  }
  return out;
}

async function loadFoundationTokens(rootDir: string): Promise<FoundationToken[]> {
  const resolvedPath = path.join(rootDir, "packages", "ds-tokens", "generated", "resolved.tokens.json");
  const text = await safeRead(resolvedPath);
  if (!text) return [];
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return [];
  }
  const out: FoundationToken[] = [];
  if (parsed.core) out.push(...flattenTokens("core", parsed.core));
  if (parsed.semantic) out.push(...flattenTokens("semantic", parsed.semantic));
  return out.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer === "core" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
}

async function loadBrandTokens(rootDir: string): Promise<BrandTokenSet[]> {
  const brandsDir = path.join(rootDir, "packages", "ds-tokens", "src", "brands");
  if (!existsSync(brandsDir)) return [];
  const entries = await readdir(brandsDir, { withFileTypes: true });
  const sets: BrandTokenSet[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".tokens.json")) continue;
    const id = e.name.replace(/\.tokens\.json$/, "");
    const text = await safeRead(path.join(brandsDir, e.name));
    if (!text) continue;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      continue;
    }
    const meta = (parsed.$brand ?? {}) as Record<string, unknown>;
    // Strip $brand and $schema from the root before flattening so the meta
    // block doesn't leak into the token list.
    const { $brand: _b, $schema: _s, ...rest } = parsed;
    void _b; void _s;
    const tokens = flattenTokens("brand", rest);
    sets.push({
      id,
      name: typeof meta.name === "string" ? meta.name : id,
      description: typeof meta.description === "string" ? meta.description : undefined,
      accent: typeof meta.accent === "string" ? meta.accent : undefined,
      density: typeof meta.density === "string" ? meta.density : undefined,
      tokens: tokens.sort((a, b) => a.path.localeCompare(b.path)),
    });
  }
  // Surface `default` first, then alphabetical.
  return sets.sort((a, b) => {
    if (a.id === "default") return -1;
    if (b.id === "default") return 1;
    return a.id.localeCompare(b.id);
  });
}

function inferLayerOrder(layer: string): number {
  switch (layer) {
    case "primitive":
      return 0;
    case "compound":
      return 1;
    case "composer":
      return 2;
    case "assembly":
      return 3;
    default:
      return 4;
  }
}

export async function buildBundle(rootDir: string) {
  const contractsDir = path.join(rootDir, "packages", "ds-contracts");
  const componentsDir = path.join(contractsDir, "components");
  // Each component lives in components/<Name>/ with <Name>.contract.json,
  // <Name>.tokens.json, and <Name>.usage.jsonl as sidecars. Walk the folder
  // list (not a flat *.contract.json glob) so missing sidecars are
  // distinguishable from missing folders.
  const componentFolders = existsSync(componentsDir)
    ? (await readdir(componentsDir, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];

  const schemaText = await safeRead(path.join(contractsDir, "component.contract.schema.json"));
  const schema = schemaText ? JSON.parse(schemaText) : null;

  // Token surface comes from @full-stack-ds/tokens now — single generated CSS
  // file with @layer core/semantic/theme/brand/density. vars.css stays under
  // ds-contracts/tokens/ because it carries scroll-driven animation primitives
  // (--cursor-*, --mouse-*) and Next.js font CSS-var bridges, not design tokens.
  const tokensDir = path.join(rootDir, "packages", "ds-tokens", "generated");
  const runtimeVarsDir = path.join(contractsDir, "tokens");
  const tokensCss = [
    await safeRead(path.join(tokensDir, "tokens.css")),
    await safeRead(path.join(runtimeVarsDir, "vars.css")),
  ]
    .filter((s): s is string => Boolean(s))
    .join("\n");

  const components: ComponentBundle[] = [];
  for (const folder of componentFolders) {
    const contractFile = `${folder}.contract.json`;
    const full = path.join(componentsDir, folder, contractFile);
    const text = await safeRead(full);
    if (!text) continue;
    let contract: ComponentContract;
    try {
      // JSON.parse returns unknown shape; we cast to ComponentContract because
      // contracts are schema-validated upstream by codegen. The shape is the
      // contract's job to maintain — if a contract is malformed, the
      // validator catches it before this code path runs.
      contract = JSON.parse(text) as ComponentContract;
    } catch {
      continue;
    }
    const name = contract.name ?? folder;
    const sources = await gatherComponentSources(rootDir, name);

    // Tokens sidecar: optional. Attached to the contract object so downstream
    // consumers (showcase, codegen) can read contract.tokens as they always have.
    const tokensSidecarPath = path.join(componentsDir, folder, `${folder}.tokens.json`);
    const tokensText = await safeRead(tokensSidecarPath);
    if (tokensText) {
      try {
        (contract as { tokens?: unknown }).tokens = JSON.parse(tokensText);
      } catch {
        // Schema validator catches malformed sidecars upstream; ignore here.
      }
    }

    const stylesText = await safeRead(path.join(componentsDir, folder, `${folder}.styles.json`));
    const designBindings = buildDesignBindings({
      ...(contract as unknown as CodegenContract),
      styles: stylesText ? JSON.parse(stylesText) : {},
    });

    // Usage sidecar: optional JSONL of curated composition examples.
    const usagePath = path.join(componentsDir, folder, `${folder}.usage.jsonl`);
    const usageText = await safeRead(usagePath);
    const usage = usageText ? parseUsageJsonl(usageText) : [];

    // Normalized box-model material surface: the codegen merge (primitive <
    // morphology profile < authored sidecar) with provenance per slot. The
    // editor reads this, never raw sidecar presence.
    const boxModelSurface = buildBoxModelSurface(
      contract.tokens,
      contract.morphology,
    );

    components.push({
      name,
      contract,
      contractPath: path.relative(rootDir, full),
      sources,
      usage,
      usageComposition: deriveUsageComposition(contract as never),
      boxModelSurface,
      designBindings,
    });
  }

  components.sort((a, b) => {
    const la = inferLayerOrder(a.contract.layer ?? "");
    const lb = inferLayerOrder(b.contract.layer ?? "");
    if (la !== lb) return la - lb;
    return a.name.localeCompare(b.name);
  });

  const stackContractPath = path.join(contractsDir, "primitives", "Stack.primitive.json");
  const stackContractText = await safeRead(stackContractPath);
  const stackContract = stackContractText ? JSON.parse(stackContractText) : null;
  const primitives: PrimitiveBundle[] = [
    {
      name: "Stack",
      contract: stackContract,
      sources: await gatherPrimitiveSources(rootDir),
    },
  ];

  const [foundationTokens, brandTokens] = await Promise.all([
    loadFoundationTokens(rootDir),
    loadBrandTokens(rootDir),
  ]);

  const census = await buildCensus(rootDir, components, foundationTokens.length);
  const activity = buildActivity(rootDir);

  return {
    components,
    primitives,
    schema,
    tokensCss,
    foundationTokens,
    brandTokens,
    census,
    activity,
    generatedAt: Date.now(),
  };
}

/**
 * Build-time activity feed: recent commits and CAWS spec events, newest
 * first. Never throws - a shallow clone or missing git simply yields the
 * spec-derived events alone. This is real repo data, not a fixture: the
 * Activity view renders whatever actually happened.
 */
export function buildActivity(rootDir: string, limit = 24): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  try {
    const specsDir = path.join(rootDir, ".caws", "specs");
    for (const file of readdirSync(specsDir)) {
      if (!file.endsWith(".yaml")) continue;
      const raw = readFileSync(path.join(specsDir, file), "utf8");
      const id = file.replace(/\.yaml$/, "");
      const title = raw.match(/^title:\s*['"]?([^'"\n]+)['"]?\s*$/m)?.[1] ?? id;
      const updated = raw.match(/^updated_at:\s*['"]?([^'"\n]+)['"]?\s*$/m)?.[1];
      const ts = updated ? Date.parse(updated) : NaN;
      if (Number.isNaN(ts)) continue;
      events.push({
        id: `spec:${id}`,
        kind: "spec",
        title,
        author: "caws",
        timestamp: new Date(ts).toISOString(),
        stats: { commits: 1, replies: 0, reposts: 0 },
      });
    }
  } catch {
    // no specs dir - spec events skipped
  }

  try {
    const git = execSync(
      `git log --no-decorate -n ${limit} --date=iso-strict --pretty=format:%H%x1f%ad%x1f%an%x1f%s`,
      { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    for (const line of git.split("\n")) {
      const [hash, date, author, subject] = line.split("\x1f");
      if (!hash || !date) continue;
      events.push({
        id: `commit:${hash}`,
        kind: "commit",
        title: subject ?? "",
        author: author ?? "unknown",
        timestamp: new Date(date).toISOString(),
        stats: { commits: 1, replies: 0, reposts: 0 },
      });
    }
  } catch {
    // git unavailable (or not a repo) - commit events skipped
  }

  return events
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export default function fsdsDataPlugin(): Plugin {
  let rootDir = process.cwd();

  return {
    name: "fsds-data",
    enforce: "pre",
    configResolved(cfg) {
      rootDir = cfg.root;
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    async load(id) {
      if (id !== RESOLVED_ID) return null;
      const bundle = await buildBundle(rootDir);
      return `export default ${JSON.stringify(bundle)};\n`;
    },
    handleHotUpdate(ctx) {
      if (!/packages\/(ds-contracts|ds-react|ds-vue|ds-svelte|ds-angular|ds-lit|ds-tokens)\//.test(ctx.file)) {
        return;
      }
      const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) {
        ctx.server.moduleGraph.invalidateModule(mod);
        ctx.server.ws.send({ type: "full-reload" });
      }
    },
  };
}
