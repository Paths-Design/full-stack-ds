/** The token generator's explicit theme-root grammar, not an arbitrary CSS cascade. */
export type TokenTheme = "light" | "dark";
export interface ThemeDeclarations { light: Map<string, string>; dark: Map<string, string> }
export interface BrandDeclarations extends ThemeDeclarations { id: string }
export interface TokenCssScopes {
  base: ThemeDeclarations;
  defaults: ThemeDeclarations;
  brands: BrandDeclarations[];
}

const themes = (): ThemeDeclarations => ({ light: new Map(), dark: new Map() });
function fail(detail: string): never { throw new Error(`UNITY_USS_TOKEN_CSS_UNSUPPORTED: ${detail}`); }
const normalized = (value: string): string => value.replace(/\s+/g, " ").replace(/,\s*/g, ",").trim();

/** Delimiters inside strings or function arguments are data. */
function delimiter(text: string, start: number, stops: string): number {
  let quote = "", depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i]!;
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (depth === 0 && stops.includes(c)) return i;
    if (c === "(") depth++;
    else if (c === ")" && --depth < 0) fail("unbalanced function");
  }
  if (quote || depth) fail("unterminated string or function");
  return text.length;
}

function withoutComments(text: string): string {
  let out = "", quote = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quote) { out += c; if (c === "\\") out += text[++i] ?? ""; else if (c === quote) quote = ""; }
    else if (c === '"' || c === "'") { quote = c; out += c; }
    else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      if (end < 0) fail("unterminated comment");
      i = end + 1; out += " ";
    } else out += c;
  }
  if (quote) fail("unterminated string");
  return out;
}

interface Rule { selector: string; body?: string }
function rules(text: string): Rule[] {
  const out: Rule[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const end = delimiter(text, cursor, ";{}");
    const selector = normalized(text.slice(cursor, end));
    if (!selector) { if (end === text.length) break; fail("empty rule"); }
    if (end === text.length) fail(`unterminated rule ${selector}`);
    if (text[end] === ";") { out.push({ selector }); cursor = end + 1; continue; }
    if (text[end] !== "{") fail(`unmatched closing brace after ${selector}`);
    let close = end + 1, depth = 1;
    while (depth) {
      close = delimiter(text, close, "{}");
      if (close === text.length) fail(`unclosed rule ${selector}`);
      depth += text[close] === "{" ? 1 : -1;
      close++;
    }
    out.push({ selector, body: text.slice(end + 1, close - 1) });
    cursor = close;
  }
  return out;
}

function declarations(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (let cursor = 0; cursor < text.length;) {
    const end = delimiter(text, cursor, ";");
    const entry = text.slice(cursor, end).trim();
    cursor = end + 1;
    if (!entry) continue;
    const colon = delimiter(entry, 0, ":");
    const name = entry.slice(0, colon).trim(), value = entry.slice(colon + 1).trim();
    if (colon === entry.length || !/^--fsds-[A-Za-z0-9_-]+$/.test(name) || /!important\s*$/i.test(value)) fail(`declaration ${entry}`);
    if (out.has(name)) fail(`duplicate declaration ${name}`);
    out.set(name, value);
  }
  return out;
}

const themeSelector = (theme: TokenTheme): string => `.${theme},[data-theme="${theme}"]`;
const brandSelector = (id: string, theme: TokenTheme): string => [
  `.${theme}[data-brand="${id}"]`, `.${theme} [data-brand="${id}"]`,
  `[data-theme="${theme}"][data-brand="${id}"]`, `[data-theme="${theme}"] [data-brand="${id}"]`,
].join(",");
const componentThemeSelector = (id: string, theme: TokenTheme): string =>
  `.${theme}[data-brand="${id}"],[data-theme="${theme}"][data-brand="${id}"]`;

/**
 * Preserve core/semantic alias edges and explicit theme/brand precedence.
 * Media duplicates and component descendants must agree with the generator's
 * root declarations. Density selection and arbitrary descendant inheritance
 * are separate inputs from the native Theme root API.
 */
export function parseTokenCss(css: string): TokenCssScopes {
  const core = new Map<string, string>(), semantic = new Map<string, string>();
  const theme = themes(), defaults = themes();
  const brands = new Map<string, BrandDeclarations>();
  const brand = (id: string): BrandDeclarations => {
    if (!brands.has(id)) brands.set(id, { id, ...themes() });
    return brands.get(id)!;
  };
  const checks: { actual: Map<string, string>; expected: () => Map<string, string>; selector: string; subset?: boolean }[] = [];
  const mediaModes = new Map<string, ThemeDeclarations>();
  const lightGuards = new Set<string>();
  const seenLayers: string[] = [];
  for (const layer of rules(withoutComments(css))) {
    if (layer.body === undefined) {
      if (layer.selector !== "@layer core,semantic,components,theme,brand,density") fail(layer.selector);
      continue;
    }
    const name = /^@layer (core|semantic|theme|brand|density)$/.exec(layer.selector)?.[1];
    if (!name || seenLayers.includes(name)) fail(layer.selector);
    seenLayers.push(name);
    if (name === "density") continue; // This API selects no data-density scope.
    const visit = (body: string, media = false): void => {
      for (const rule of rules(body)) {
        if (rule.body === undefined) fail(rule.selector);
        if (rule.selector.startsWith("@")) {
          if (media || rule.selector !== "@media (prefers-color-scheme: dark)" || !["theme", "brand"].includes(name)) fail(rule.selector);
          visit(rule.body!, true); continue;
        }
        const values = declarations(rule.body!);
        if (name === "core" || name === "semantic") {
          if (rule.selector !== ":root" || media) fail(rule.selector);
          for (const [key, value] of values) (name === "core" ? core : semantic).set(key, value);
          continue;
        }
        if (name === "theme") {
          const mode: TokenTheme | undefined = rule.selector === themeSelector("light") ? "light"
            : rule.selector === themeSelector("dark") || (media && rule.selector === ":root") ? "dark" : undefined;
          if (!mode) fail(rule.selector);
          if (media && rule.selector === ":root" && values.size) mediaModes.set("theme", theme);
          if (media && mode === "light") lightGuards.add("theme");
          if (media) checks.push({ actual: values, expected: () => theme[mode], selector: rule.selector });
          else for (const [key, value] of values) theme[mode].set(key, value);
          continue;
        }
        // Descendant blocks repeat component-token defaults; they do not
        // declare values on the native theme root itself.
        const descendant = / \.[a-z][a-z0-9-]*(?:,|$)/.test(rule.selector);
        const rootSelector = descendant ? rule.selector.replace(/ \.[a-z][a-z0-9-]*(?=,|$)/g, "") : rule.selector;
        const id = /\[data-brand="([A-Za-z0-9_-]+)"\]/.exec(rootSelector)?.[1];
        if (id) {
          const bare = `[data-brand="${id}"]`;
          const mode: TokenTheme | undefined = rootSelector === bare ? (media ? "dark" : "light")
            : rootSelector === brandSelector(id, "light") || descendant && rootSelector === componentThemeSelector(id, "light") ? "light"
            : rootSelector === brandSelector(id, "dark") || descendant && rootSelector === componentThemeSelector(id, "dark") ? "dark" : undefined;
          if (!mode) fail(rule.selector);
          const target = brand(id)[mode];
          if (!descendant && media && mode === "dark" && values.size) mediaModes.set(`brand:${id}`, brand(id));
          if (!descendant && !media && rootSelector === brandSelector(id, "light")) lightGuards.add(`brand:${id}`);
          if (descendant || media || rootSelector === brandSelector(id, "light")) checks.push({ actual: values, expected: () => target, selector: rule.selector, subset: descendant });
          else for (const [key, value] of values) target.set(key, value);
          continue;
        }
        const defaultMode: TokenTheme | undefined = rootSelector === ":where(:root)" ? (media ? "dark" : "light")
          : rootSelector === `:where(${themeSelector("light")})` ? "light"
          : rootSelector === `:where(${themeSelector("dark")})` ? "dark"
          : descendant && rootSelector === ":where(:root:not([data-brand]))" ? (media ? "dark" : "light")
          : descendant && rootSelector === ':where(:root:not([data-brand]):is(.light,[data-theme="light"]))' ? "light"
          : descendant && rootSelector === ':where(:root:not([data-brand]):is(.dark,[data-theme="dark"]))' ? "dark" : undefined;
        if (!defaultMode) fail(rule.selector);
        if (!descendant && media && rule.selector === ":where(:root)" && values.size) mediaModes.set("default", defaults);
        if (!descendant && media && defaultMode === "light") lightGuards.add("default");
        if (media || descendant) checks.push({ actual: values, expected: () => defaults[defaultMode], selector: rule.selector, subset: descendant });
        else for (const [key, value] of values) defaults[defaultMode].set(key, value);
      }
    };
    visit(layer.body);
  }
  const order = ["core", "semantic", "theme", "brand", "density"];
  if (seenLayers.some((name, i) => i > 0 && order.indexOf(name) < order.indexOf(seenLayers[i - 1]!))) fail("layer order");
  for (const check of checks) {
    const expected = check.expected();
    if ((!check.subset && check.actual.size !== expected.size) || [...check.actual].some(([key, value]) => expected.get(key) !== value)) fail(`divergent duplicate ${check.selector}`);
  }
  for (const [mode, definitions] of mediaModes) {
    if (!lightGuards.has(mode) || [...definitions.dark.keys()].some(name => !definitions.light.has(name))) fail(`missing explicit-light guard for ${mode}`);
  }
  const common = [...core, ...semantic];
  return { base: { light: new Map([...common, ...theme.light]), dark: new Map([...common, ...theme.dark]) }, defaults, brands: [...brands.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}

export type ScalarResolution = { kind: "scalar"; value: string } | { kind: "missing" } | { kind: "unsupported" };
export type TokenLookup = (name: string) => { kind: "value"; value: string } | { kind: "missing" } | { kind: "unsupported" };

/** Missing values permit fallbacks; present unsupported values and cycles do not. */
export function resolveTokenScalar(value: string, lookup: TokenLookup, scalar: (value: string) => string | undefined, seen = new Set<string>()): ScalarResolution {
  const raw = value.trim();
  if (raw.startsWith("var(")) {
    let end: number;
    try {
      end = delimiter(raw, 4, ",)");
      if (delimiter(raw, 0, ";") !== raw.length) return { kind: "unsupported" };
    }
    catch { return { kind: "unsupported" }; }
    const name = raw.slice(4, end).trim();
    if (!/^--[A-Za-z0-9_-]+$/.test(name) || raw.at(-1) !== ")") return { kind: "unsupported" };
    const target = lookup(name);
    if (target.kind === "unsupported" || seen.has(name)) return { kind: "unsupported" };
    const resolved = target.kind === "missing" ? target : resolveTokenScalar(target.value, lookup, scalar, new Set([...seen, name]));
    return resolved.kind === "missing" && raw[end] === ","
      ? resolveTokenScalar(raw.slice(end + 1, -1), lookup, scalar, seen) : resolved;
  }
  if (/var\s*\(/i.test(raw)) return { kind: "unsupported" };
  const result = scalar(raw);
  return result === undefined ? { kind: "unsupported" } : { kind: "scalar", value: result };
}
