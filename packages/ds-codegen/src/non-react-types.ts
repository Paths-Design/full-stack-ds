/**
 * Shared React-type translation for non-React framework emitters.
 *
 * The IR carries TypeScript type strings authored against React conventions
 * (the contracts were originally written for the React implementation).
 * Vue / Angular / Lit / Svelte all need the same translation: strip the
 * `React.` namespace prefix and replace React-only type names with
 * framework-agnostic stand-ins so the generated source compiles without a
 * React dependency.
 *
 * Per-framework callers can extend the result with their own additional
 * substitutions, but the bulk of the rewrites is identical across the four,
 * which is why it lives here instead of being copied four times.
 */

/**
 * Replacement table applied in order. Each entry is `[pattern, replacement]`.
 * Patterns use single-level `<...>` matching (`[^>]+`), so nested generics
 * like `Omit<AllHTMLAttributes<X>, ...>` work because the inner is replaced
 * first and the outer keeps its valid shape.
 */
const REPLACEMENTS: Array<[RegExp, string]> = [
  // Common React node/element/component types — strip any generic argument
  // first so `ComponentType<{ ... }>` doesn't become `unknown<{ ... }>`.
  [/\bComponentType<[^>]*>/g, "unknown"],
  [/\bReactNode\b/g, "unknown"],
  [/\bReactElement\b/g, "unknown"],
  [/\bComponentType\b/g, "unknown"],

  // React refs — non-React frameworks use template/host bindings instead.
  [/\b(?:Mutable)?RefObject<[^>]+>/g, "unknown"],
  [/\bRef<[^>]+>/g, "unknown"],

  // React HTML-attribute helper — Omit<…, …> stays valid after this.
  [/\bAllHTMLAttributes<[^>]+>/g, "Record<string, unknown>"],
  [/\bHTMLAttributes<[^>]+>/g, "Record<string, unknown>"],
  [/\bHTMLAttributeAnchorTarget\b/g, "string"],

  // React event handlers → plain DOM-style callbacks.
  [
    /\b(?:Mouse|Keyboard|Change|Focus|Form)EventHandler(?:<[^>]*>)?/g,
    "(event: Event) => void",
  ],
  [/\bEventHandler<[^>]*>/g, "(event: Event) => void"],

  // React event types → bare DOM Event.
  [/\b(?:Mouse|Keyboard|Change|Focus|Form)Event\b/g, "Event"],
  [/\bSyntheticEvent(?:<[^>]*>)?/g, "Event"],

  // The DOM `Event` global is not generic. Some contracts type handlers as
  // `Event<HTMLInputElement>` — strip the bogus generic.
  [/\bEvent<[^>]+>/g, "Event"],
];

/**
 * Translate a TypeScript type string from React conventions to a form that
 * compiles in any non-React framework (Vue / Angular / Lit / Svelte).
 *
 * The function is purely textual: it does not parse the type. That is
 * sufficient for the prop-type strings the IR carries, which are
 * single-line and use straightforward generic syntax.
 */
export function translateNonReactType(typeStr: string): string {
  let result = typeStr.replace(/\bReact\./g, "");
  for (const [pattern, repl] of REPLACEMENTS) {
    result = result.replace(pattern, repl);
  }
  return result;
}

/**
 * Emit deduplicated `export type X = ...` declarations for every defined
 * type in the IR that is referenced by a styled prop, with alias bodies
 * passed through `translateNonReactType` so React-only identifiers don't
 * leak into the generated source. Returns lines (no trailing newline).
 *
 * Used by Vue / Angular / Lit emitters; Svelte's emitter inlines the same
 * shape but with `type` instead of `export type`.
 */
export function emitNonReactTypeAliases(
  ir: {
    styledProps: ReadonlyArray<{ name: string; typeRefs: readonly string[] }>;
    definedTypes: Record<
      string,
      { kind: string; values?: readonly string[]; alias?: string }
    >;
  },
  options: { keyword?: "export type" | "type" } = {},
): string[] {
  const keyword = options.keyword ?? "export type";
  const seen = new Set<string>();
  const lines: string[] = [];

  const emit = (ref: string): void => {
    if (seen.has(ref)) return;
    const def = ir.definedTypes[ref];
    if (!def) return;
    seen.add(ref);
    if (def.kind === "alias" && def.alias) {
      for (const dependency of Object.keys(ir.definedTypes)) {
        if (dependency !== ref && new RegExp(`\\b${dependency}\\b`).test(def.alias)) emit(dependency);
      }
    }
    if (def.kind === "union" && def.values) {
      lines.push(`${keyword} ${ref} = ${def.values.map((v) => `"${v}"`).join(" | ")};`);
    } else if (def.kind === "alias" && def.alias) {
      lines.push(`${keyword} ${ref} = ${translateNonReactType(def.alias)};`);
    }
  };
  for (const p of ir.styledProps) for (const ref of p.typeRefs) emit(ref);
  return lines;
}
