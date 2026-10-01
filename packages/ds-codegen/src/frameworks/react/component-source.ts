import { pagedBindingExpression } from "../../paging.js";
import { sequenceConfig, sequencePresentation } from "../../sequence.js";
/**
 * React-specific component source emission.
 *
 * Consumes the framework-neutral `ComponentIR`. Anything not React-specific
 * (anatomy, class recipe, root semantics, prop list) flows from the IR; only
 * concerns particular to React (`React.*` namespacing, JSX shape, `as` prop
 * mapping) live here.
 *
 * Output is partitioned into named regions via `preserve.ts`. Codegen owns
 * `@generated:*` regions; users own `@custom:*` regions and they survive
 * regeneration.
 */
import type {
  BindingExpression,
  BindingPredicateOp,
  ComponentIR,
  DomNodeIR,
  IdRefConditionIR,
  IdRefIR,
  IterationIR,
  KeyboardActionIR,
  NormalizedChannelIR,
  PartIR,
  PropTypeIR,
} from "../../ir.js";
import { componentNeedsInstanceId } from "../../id-relationships.js";
import {
  hasChildrenPlaceholder,
  TABLE_COMPOSITION_TAGS,
  nativeTableAttrsFor,
  composeBindingProjectionExpression,
  composeChannelUpdateExpression,
  composeValueMapExpression,
  collectContentTransforms,
  isHighlightTransform,
  isMarkdownTransform,
  contentBindingOrTransformSource,
  keyboardModeGateProps,
  focusTargetProps,
  groupKeyboardActionsByPart,
  compositeActivationMember,
  keyboardHandlerParts,
  NATIVE_FOCUSABLE_TAGS,
  type NativeTableAttr,
} from "../../ir.js";
import { renderSections, type Section } from "../../preserve.js";
import {
  resolveSurfaceAutoDismiss,
  portalsRootToBody,
  selectorAnchoredRootPortal,
} from "../../semantics.js";
import { resolveComponentRefImports } from "../component-ref-imports.js";
import {
  collectIconGlyphNodes,
  ICON_GLYPH_PATH_ATTRS,
  ICONOGRAPHY_MODULE,
  iconGlyphNameArg,
  iconGlyphPxExpr,
  iconGlyphSizeHintsLiteral,
} from "../icon-glyph.js";
import {
  getGroupHostPart,
  getGroupHostOrnamentPart,
  getInteractiveItemPart,
  getMultipleItemPart,
  getRegionPart,
  isCompoundStateContainer,
  isDisclosureContainer,
} from "./hook-source.js";
import {
  generateReactSurfaceComponentSource,
  isSurfaceComponent,
} from "./surface-emit.js";

/**
 * Generate the full React TSX source for a component IR.
 *
 * Emits regions, in order:
 *   `imports`         (gen)
 *   `imports`         (cust, empty default)
 *   `types`           (gen — type aliases from contract.types)
 *   `types`           (cust, empty default)
 *   `props`           (gen — the Props interface)
 *   `subcomponents`   (gen — compound part components, may be empty)
 *   `component`       (gen — the root component function)
 *   `trailing`        (cust — for wrappers/overrides; empty default)
 */
export function generateReactComponentSource(
  ir: ComponentIR,
  stackImportPath: string,
): string {
  // Presence-surface family path (Tooltip in F-2A; Popover/Menu/... later).
  // Forward-facing replacement for ir.dom + compound-state-container paths
  // for the anchored-surface kinds — no hybrid output.
  if (isSurfaceComponent(ir)) {
    return generateReactSurfaceComponentSource(ir);
  }
  const isCompound = isCompoundStateContainer(ir);
  const reactTypeImports = collectReactImports(ir);

  // Generate body sections BEFORE the import header so the body-scanner
  // below can detect identifiers (`CSSProperties`) that appear only in
  // generated output, not in styled prop types. Mirrors the Lit emitter's
  // `usesIfDefined` pattern (line 1031).
  const typesBody = generateTypes(ir).trimEnd();
  const propsBody = generatePropsInterface(ir);

  const isDisclosure = isCompound && isDisclosureContainer(ir);
  let subcomponentsBody: string;
  if (isDisclosure) {
    subcomponentsBody = generateDisclosureStateSubcomponents(ir);
  } else if (isCompound) {
    subcomponentsBody = generateCompoundStateSubcomponents(ir);
  } else {
    subcomponentsBody = ir.compoundParts
      .map((part) =>
        [
          generateSubComponentProps(ir.name, part),
          "",
          generateSubComponent(ir.name, ir.cssPrefix, part),
        ].join("\n"),
      )
      .join("\n\n");
  }
  const highlightPresentation = collectContentTransforms(ir.dom).find(
    (transform) => transform.transform === "highlight" && transform.linePart && transform.gutterPart,
  );
  if (highlightPresentation && highlightPresentation.transform === "highlight") {
    const lineName = `${ir.name}Line`;
    const tokenName = `${ir.name}Token`;
    subcomponentsBody += `\n\nexport interface ${lineName}Props { number: number; children?: ReactNode; ending?: string; className?: string }\n` +
      `export function ${lineName}({ number, children, ending = "", className }: ${lineName}Props) {\n` +
      `  return <span className={["${ir.classRecipe.base}__${highlightPresentation.linePart}", className].filter(Boolean).join(" ")}><span className="${ir.classRecipe.base}__${highlightPresentation.gutterPart}" data-line={number} aria-hidden="true" />{children}{ending}</span>;\n}\n\n` +
      `export interface ${tokenName}Props { kind: ${ir.name}TokenType; children?: ReactNode; className?: string }\n` +
      `export function ${tokenName}({ kind, children, className }: ${tokenName}Props) {\n` +
      `  return <span className={["${ir.classRecipe.base}__${highlightPresentation.tokenPart}", className].filter(Boolean).join(" ")} data-token={kind}>{children}</span>;\n}`;
  }

  const componentBody = generateRootComponent(ir);

  // IR-DOM-CSS-VAR-BINDING-01: cssVarBindings emit `as CSSProperties`.
  // Scan the rendered body for the identifier so we add the type import
  // only when it's actually referenced. `collectReactImports` doesn't see
  // body identifiers — it only scans styled prop types and defined types
  // — so we patch the list here.
  const bodyHaystack = `${subcomponentsBody}\n${componentBody}`;
  const needsCssProperties =
    /\bCSSProperties\b/.test(bodyHaystack) &&
    !reactTypeImports.includes("type CSSProperties");
  const finalReactTypeImports = needsCssProperties
    ? [...reactTypeImports, "type CSSProperties"].sort()
    : reactTypeImports;
  // DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01: generateDomTreeRootComponent
  // emits `useRef`/`useEffect` calls for propertyBindings nodes, but that
  // decision is data-driven deep inside the tree walk — scanning the
  // rendered body (same technique as needsCssProperties above) is simpler
  // than threading a boolean back out through the call chain.
  const needsPropertyBindingHooks =
    !isCompound && /\buseRef</.test(bodyHaystack);
  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: generated relationship ids emit
  // `useId()` in the body (same body-scan technique as needsCssProperties).
  // The disclosure/compound paths already import useId unconditionally.
  const needsUseIdHook =
    !isCompound && !isDisclosure && /\buseId\(\)/.test(bodyHaystack);
  // Selector-anchored root panel (coachmark tour): the body emits
  // useState/useEffect anchor-resolution wiring plus a useAnchoredPosition
  // call (same body-scan technique as needsCssProperties).
  const needsAnchoredHooks =
    !isCompound && /\buseAnchoredPosition\(/.test(bodyHaystack);
  // Same scan for the field-association provider's memoized context value.
  const needsUseMemoHook =
    !isCompound && !isDisclosure && /\buseMemo\(/.test(bodyHaystack);

  const importLines: string[] = [];
  if (bodyHaystack.includes("canActivateInteraction(")) importLines.push(`import { canActivateInteraction } from "../../primitives/interaction.js";`);
  if (isCompound) importLines.push(`import { InteractionHost, type InteractionHostProps } from "../../primitives/InteractionHost";`);
  if (isDisclosure) {
    importLines.push(`import { toggleInteractionItem } from "../../primitives/interaction.js";`);
    // Repeated-disclosure container: arrow-key host (KeyboardEvent, useRef,
    // useCallback), generated id namespace (useId). No register effect, so no
    // useEffect. Context is provided via createCompoundContext (below).
    const runtimeHooks = ["useCallback", "useId", "useRef"];
    const disclosureTypeImports = finalReactTypeImports.includes("type KeyboardEvent")
      ? finalReactTypeImports
      : [...finalReactTypeImports, "type KeyboardEvent"];
    const allReactImports = [...disclosureTypeImports, ...runtimeHooks].sort();
    importLines.push(`import { ${allReactImports.join(", ")} } from "react";`);
  } else if (isCompound) {
    // For compound-state-container, we need both type imports and runtime hooks.
    // Also need KeyboardEvent type for the keyboard handler in TabsList.
    const runtimeHooks = ["useCallback", "useEffect", "useRef"];
    // Add KeyboardEvent type if not already in the list
    const compoundTypeImports = finalReactTypeImports.includes("type KeyboardEvent")
      ? finalReactTypeImports
      : [...finalReactTypeImports, "type KeyboardEvent"];
    const allReactImports = [...compoundTypeImports, ...runtimeHooks].sort();
    importLines.push(`import { ${allReactImports.join(", ")} } from "react";`);
  } else {
    // Collect the runtime hooks the body actually references, then merge
    // with the type imports. The hook set stays empty for plain components
    // so their import line stays byte-identical (no re-sort).
    const runtimeHooks = new Set<string>();
    if (needsPropertyBindingHooks) {
      runtimeHooks.add("useEffect");
      runtimeHooks.add("useRef");
    }
    if (needsUseIdHook) runtimeHooks.add("useId");
    if (needsUseMemoHook) runtimeHooks.add("useMemo");
    if (needsAnchoredHooks) {
      runtimeHooks.add("useEffect");
      runtimeHooks.add("useState");
    }
    if (runtimeHooks.size === 0) {
      importLines.push(`import { ${finalReactTypeImports.join(", ")} } from "react";`);
    } else {
      const allReactImports = [...finalReactTypeImports, ...runtimeHooks].sort();
      importLines.push(`import { ${allReactImports.join(", ")} } from "react";`);
    }
  }
  // Stack is needed for legacy single-root output, DOM-tree roots that can be
  // polymorphically hosted by Stack, and compound parts (ModalHeader etc.
  // still use <Stack as="header"> regardless of whether the parent has a dom
  // tree). Compound-state-container components use plain HTML elements (div,
  // button) so Stack is not needed.
  //
  // Native-table-tag exception: when all compound parts have a nativeTag
  // in TABLE_COMPOSITION_TAGS, the emitter renders native elements
  // directly (no Stack), so the Stack import is omitted to avoid an
  // unused-import warning. Root DOM trees also stay raw when their root is a
  // native table-composition tag.
  const allCompoundPartsNative =
    ir.compoundParts.length > 0 &&
    ir.compoundParts.every(
      (p) => p.nativeTag !== undefined && TABLE_COMPOSITION_TAGS.has(p.nativeTag),
    );
  const needsStackImport =
    !isCompound &&
    (reactDomRootUsesStack(ir) ||
      (!allCompoundPartsNative && (!ir.dom || ir.compoundParts.length > 0)));
  if (needsStackImport) {
    importLines.push(`import { Stack } from "${stackImportPath}";`);
  }
  // componentRef: import each referenced design-system component by relative
  // sibling path (CODEGEN-RECURSIVE-COMPOSITION-01). Structural — driven by
  // IR `componentRef` facts, never per-component name lore.
  for (const refImport of resolveComponentRefImports(ir.name, ir.dom, "react")) {
    importLines.push(
      `import { ${refImport.identifier} } from "${refImport.specifier}";`,
    );
  }
  // iconGlyph: import the catalog resolver from the committed package-root
  // module of @full-stack-ds/iconography (ICON-CATALOG-RUNTIME-DELIVERY-01).
  // Structural — driven by IR `iconGlyph` facts, never per-component lore.
  if (collectIconGlyphNodes(ir.dom).length > 0) {
    importLines.push(`import { resolveIcon } from "${ICONOGRAPHY_MODULE}";`);
  }
  // content-transform: import the shared highlight tokenizer when the tree
  // carries a highlight fact (FEAT-CODEBLOCK-HIGHLIGHT-01). Structural —
  // driven by IR content-transform facts, never per-component name lore.
  if (collectContentTransforms(ir.dom).some(isMarkdownTransform)) {
    importLines.push(
      `import { parseMarkdown, type MarkdownBlock, type MarkdownMark } from "../../primitives/markdown/markdown";`,
    );
    importLines.push(`import { Fragment } from "react";`);
  }
  if (collectContentTransforms(ir.dom).some((t) => t.transform === "highlight")) {
    importLines.push(
      `import { prepareHighlightSource } from "../../primitives/highlight/tokenize";`,
    );
  }
  if (needsAnchoredHooks) {
    importLines.push(
      `import { useAnchoredPosition } from "../../primitives/surfaces/useAnchoredPosition";`,
    );
  }
  if (isCompound || (ir.dom && ir.behavior.normalizedChannels.length > 0)) {
    importLines.push(`import { use${ir.name} } from "./use${ir.name}";`);
  }
  if (isCompound) {
    importLines.push(`import { createCompoundContext } from "../../primitives/hooks";`);
  }
  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: field-association primitive imports,
  // body-scan driven like the react-hook imports above.
  const fieldAssocImports: string[] = [];
  if (/\bFieldAssociationContext\b/.test(bodyHaystack)) {
    fieldAssocImports.push("FieldAssociationContext");
  }
  if (/\buseFieldAssociation\(/.test(bodyHaystack)) {
    fieldAssocImports.push("useFieldAssociation");
  }
  if (fieldAssocImports.length > 0) {
    importLines.push(
      `import { ${fieldAssocImports.join(", ")} } from "../../primitives/hooks";`,
    );
  }
  if (ir.pagedSet) importLines.push(`import { usePagedSet } from "../../primitives/hooks/usePaging.js";`);
  if (ir.motion.sequence) importLines.push(`import { useSequence } from "../../primitives/hooks/useSequence.js";`);
  if (resolveSurfaceAutoDismiss(ir) && ir.behavior.normalizedChannels.some((c) => c.valueType === "boolean")) {
    importLines.push(`import { useAutoDismiss } from "../../primitives/hooks";`);
  }
  importLines.push(`import "./${ir.name}.css";`);
  const importsBody = importLines.join("\n");

  const markdownHelpersBody = generateReactMarkdownHelpers(ir);
  const blank = (): Section => ({ kind: "between", body: "" });
  const sections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    { kind: "generated", id: "types", body: typesBody },
    blank(),
    { kind: "custom", id: "types", body: "" },
    blank(),
    { kind: "generated", id: "props", body: propsBody },
    blank(),
    { kind: "generated", id: "subcomponents", body: subcomponentsBody + markdownHelpersBody },
    blank(),
    { kind: "generated", id: "component", body: componentBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
    { kind: "between", body: "" },
  ];

  return renderSections(sections, "line");
}

// ---------------------------------------------------------------------------
// Type resolution (React-specific)
// ---------------------------------------------------------------------------

/**
 * React-DOM type identifiers the generator knows how to import. Each is
 * imported as `type X` from `"react"` when it appears anywhere in the IR's
 * emitted text (styled prop types, defined-type values/aliases). The
 * generator never emits the `React.X` namespace form — bare identifiers
 * with a matching `import type` line are unambiguous and avoid the
 * "React is not defined" pitfall when the JSX runtime doesn't expose a
 * global namespace.
 */
const REACT_TYPE_IDENTIFIERS = [
  // Common
  "ReactNode",
  "ReactElement",
  "ComponentType",
  "CSSProperties",
  "Ref",
  "RefObject",
  "MutableRefObject",
  "ForwardedRef",
  // Synthetic events
  "SyntheticEvent",
  "MouseEvent",
  "KeyboardEvent",
  "ChangeEvent",
  "FocusEvent",
  "FormEvent",
  "TouchEvent",
  "PointerEvent",
  "DragEvent",
  "ClipboardEvent",
  "AnimationEvent",
  "TransitionEvent",
  // Event handlers
  "MouseEventHandler",
  "KeyboardEventHandler",
  "ChangeEventHandler",
  "FocusEventHandler",
  "FormEventHandler",
  "TouchEventHandler",
  "PointerEventHandler",
  "DragEventHandler",
  "ClipboardEventHandler",
  "EventHandler",
  // Attribute interfaces
  "AllHTMLAttributes",
  "HTMLAttributes",
  "AnchorHTMLAttributes",
  "BlockquoteHTMLAttributes",
  "ButtonHTMLAttributes",
  "DetailsHTMLAttributes",
  "DialogHTMLAttributes",
  "FormHTMLAttributes",
  "ImgHTMLAttributes",
  "InputHTMLAttributes",
  "LabelHTMLAttributes",
  "OlHTMLAttributes",
  "OptionHTMLAttributes",
  "SelectHTMLAttributes",
  "TableHTMLAttributes",
  "TdHTMLAttributes",
  "TextareaHTMLAttributes",
  "ThHTMLAttributes",
  "TimeHTMLAttributes",
  "AriaAttributes",
] as const;

/** Word-boundary regex for "X is referenced in this text" detection. */
function identifierRegex(name: string): RegExp {
  return new RegExp(`(?<![.\\w])${name}(?![\\w])`, "g");
}

/**
 * Map an HTML tag (as it appears in the contract's `anatomy.dom.tag`) to the
 * React HTMLAttributes interface that types the matching DOM element's full
 * raw-attribute surface. The emitted Props interface extends an `Omit<>` of
 * this type so consumers can pass standard DOM attrs (`onClick`, `id`, raw
 * `aria-*`, etc.) without the codegen having to re-list every one of them.
 *
 * Branches on tag, not component name — fits the codegen authority doctrine
 * (docs/codegen-authority.md). Tags missing from this map fall back to the
 * generic `HTMLAttributes<HTMLElement>` form.
 *
 * Pairs are written as `[reactInterfaceName, elementInterfaceName]` so
 * the emitted text reads `ButtonHTMLAttributes<HTMLButtonElement>`.
 */
const HOST_TAG_TO_REACT_ATTRS: Record<string, [string, string]> = {
  a: ["AnchorHTMLAttributes", "HTMLAnchorElement"],
  article: ["HTMLAttributes", "HTMLElement"],
  blockquote: ["BlockquoteHTMLAttributes", "HTMLQuoteElement"],
  button: ["ButtonHTMLAttributes", "HTMLButtonElement"],
  details: ["DetailsHTMLAttributes", "HTMLDetailsElement"],
  div: ["HTMLAttributes", "HTMLDivElement"],
  form: ["FormHTMLAttributes", "HTMLFormElement"],
  hr: ["HTMLAttributes", "HTMLHRElement"],
  img: ["ImgHTMLAttributes", "HTMLImageElement"],
  input: ["InputHTMLAttributes", "HTMLInputElement"],
  label: ["LabelHTMLAttributes", "HTMLLabelElement"],
  nav: ["HTMLAttributes", "HTMLElement"],
  ol: ["OlHTMLAttributes", "HTMLOListElement"],
  option: ["OptionHTMLAttributes", "HTMLOptionElement"],
  p: ["HTMLAttributes", "HTMLParagraphElement"],
  section: ["HTMLAttributes", "HTMLElement"],
  select: ["SelectHTMLAttributes", "HTMLSelectElement"],
  span: ["HTMLAttributes", "HTMLSpanElement"],
  summary: ["HTMLAttributes", "HTMLElement"],
  table: ["TableHTMLAttributes", "HTMLTableElement"],
  tbody: ["HTMLAttributes", "HTMLTableSectionElement"],
  td: ["TdHTMLAttributes", "HTMLTableCellElement"],
  textarea: ["TextareaHTMLAttributes", "HTMLTextAreaElement"],
  th: ["ThHTMLAttributes", "HTMLTableCellElement"],
  time: ["TimeHTMLAttributes", "HTMLTimeElement"],
  tr: ["HTMLAttributes", "HTMLTableRowElement"],
  ul: ["HTMLAttributes", "HTMLUListElement"],
  // dialog has DialogHTMLAttributes but consumers typically use it as a
  // controlled overlay; project's Dialog has its own surface so we don't
  // currently route the contract `dialog` tag through here.
};


/**
 * Strip a leading `React.` namespace prefix from any reference to a known
 * React DOM identifier. The contract data may carry `React.MouseEventHandler`
 * for historical reasons; we accept it but emit bare `MouseEventHandler`
 * with an explicit `import type` line.
 */
function stripReactNamespace(typeStr: string): string {
  let result = typeStr;
  for (const name of REACT_TYPE_IDENTIFIERS) {
    result = result.replace(new RegExp(`(?<![.\\w])React\\.${name}\\b`, "g"), name);
  }
  return result;
}

/**
 * Resolve a contract type string for emission. The generator never emits
 * `React.X` namespace references — those are stripped — and types defined
 * in the contract's own `types` block are left as bare identifiers.
 */
function resolveReactType(typeStr: string, ir: ComponentIR): string {
  if (ir.definedTypes[typeStr]) return typeStr;
  return stripReactNamespace(typeStr);
}

/**
 * Lower a framework-neutral PropTypeIR into a React/TS type expression. The
 * emitter lowers from the structured type — it does NOT re-parse the legacy
 * `type` string for migrated props. `ref` resolves the named alias and
 * `fallback` (legacy, un-migrated members) delegate to resolveReactType, which
 * reproduces the prior behavior exactly — so migrating a contract to PropTypeIR
 * yields byte-identical React output. (CODEGEN-PROP-TYPE-IR-PILOT-01)
 */
function lowerReactPropType(pt: PropTypeIR, ir: ComponentIR): string {
  switch (pt.kind) {
    case "string":
    case "number":
    case "boolean":
      return pt.kind;
    case "enum":
      // Double-quoted to match the corpus generated-TS convention (and
      // canonicalTsType) — CODEGEN-PROP-TYPE-IR-OBSERVED-TYPES-01 A2.
      return pt.values.map((v) => JSON.stringify(v)).join(" | ");
    case "node":
      return "ReactNode";
    case "ref":
      return resolveReactType(pt.to, ir);
    case "fallback":
      return resolveReactType(pt.raw, ir);
    // --- V2 (observed-corpus extension). Recurses through lowerReactPropType so
    // nested refs keep React's resolution/namespace-stripping. ---
    case "void":
      return "void";
    case "literal":
      return pt.value === null
        ? "null"
        : typeof pt.value === "string"
          ? JSON.stringify(pt.value)
          : String(pt.value);
    case "array": {
      const inner = lowerReactPropType(pt.items, ir);
      return pt.items.kind === "union" || pt.items.kind === "callback" ? `(${inner})[]` : `${inner}[]`;
    }
    case "promise":
      return `Promise<${lowerReactPropType(pt.of, ir)}>`;
    case "callback":
      return `(${pt.params
        .map((p) => `${p.name}${p.optional ? "?" : ""}: ${lowerReactPropType(p.type, ir)}`)
        .join(", ")}) => ${lowerReactPropType(pt.returns, ir)}`;
    case "union":
      return pt.of
        .map((m) => (m.kind === "callback" ? `(${lowerReactPropType(m, ir)})` : lowerReactPropType(m, ir)))
        .join(" | ");
  }
}

/**
 * Build the `import type { ... } from "react"` identifier list by scanning
 * every text source the generator will emit (styled prop types, defined
 * types' values/aliases). `ReactNode` is always included because the props
 * interface adds `children?: ReactNode` by default.
 */
function collectReactImports(ir: ComponentIR): string[] {
  const imports = new Set<string>(["ReactNode"]);
  const sources: string[] = [];

  for (const p of ir.styledProps) sources.push(stripReactNamespace(p.type));

  for (const def of Object.values(ir.definedTypes)) {
    if (def.alias) sources.push(stripReactNamespace(def.alias));
    if (def.values) sources.push(def.values.join(" "));
  }

  // The props interface may extend `XxxHTMLAttributes<HTMLXxxElement>` based
  // on the contract's root dom tag. Surface that interface name here so the
  // import scanner picks it up. The DOM element name (`HTMLButtonElement`,
  // etc.) is part of TypeScript's lib.dom — globally available, no import
  // needed.
  const hostTag = ir.dom?.tag;
  if (hostTag) {
    const mapped = HOST_TAG_TO_REACT_ATTRS[hostTag];
    if (mapped) sources.push(mapped[0]);
  }

  const haystack = sources.join(" ");
  for (const name of REACT_TYPE_IDENTIFIERS) {
    if (identifierRegex(name).test(haystack)) imports.add(name);
  }

  return [...imports]
    .sort()
    .map((name) => `type ${name}`);
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/**
 * Emit type alias declarations from the contract's `types` block.
 *
 * Unresolved type references are surfaced by the CLI through
 * `ir.unresolvedTypeRefs` (warning by default; failure under
 * `--strict-types`). A missing type is a contract authoring error.
 */
function generateTypes(ir: ComponentIR): string {
  const lines: string[] = [];
  for (const [name, def] of Object.entries(ir.definedTypes)) {
    if (def.kind === "union" && def.values) {
      lines.push(
        `export type ${name} = ${def.values.map((v) => `"${v}"`).join(" | ")};`,
      );
    } else if (def.kind === "alias" && def.alias) {
      lines.push(`export type ${name} = ${stripReactNamespace(def.alias)};`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * When the contract's root dom tag is a known HTML element, build an
 * `extends Omit<XxxHTMLAttributes<HTMLXxxElement>, "...">` clause so the
 * emitted props interface inherits the host element's full raw-attribute
 * surface (onClick, id, raw aria-*, etc.).
 *
 * The Omit list scrubs every prop name the codegen will re-declare in the
 * interface body — preventing TS "Subsequent property declarations must
 * have the same type" errors when the contract intentionally narrows a
 * field (e.g. `type: ButtonType` narrowing the React `type` string union).
 *
 * Returns `null` when the component has no dom tree or the root tag is not
 * registered in HOST_TAG_TO_REACT_ATTRS — the caller falls back to a plain
 * `interface XProps {` line.
 */
function buildHostAttrsExtendsClause(
  ir: ComponentIR,
  propNames: ReadonlySet<string>,
): string | null {
  const hostTag = ir.dom?.tag;
  if (!hostTag) return null;
  const mapped = HOST_TAG_TO_REACT_ATTRS[hostTag];
  if (!mapped) return null;
  const [reactInterface, elementInterface] = mapped;

  const omit = new Set<string>();
  for (const p of ir.styledProps) omit.add(p.name);
  for (const dim of Object.keys(ir.variants)) {
    if (!propNames.has(dim)) omit.add(dim);
  }
  omit.add("className");
  omit.add("data-testid");
  // `children` is always re-declared by the props interface when the
  // component renders children, with type `ReactNode`. React's
  // HTMLAttributes also declares `children?: ReactNode`, so the types
  // match — but omit it anyway for consistency, so the interface body
  // is the single source of truth for that field.
  omit.add("children");

  const omitKeys = [...omit]
    .sort()
    .map((k) => `"${k}"`)
    .join(" | ");
  return `Omit<${reactInterface}<${elementInterface}>, ${omitKeys}>`;
}

function generatePropsInterface(ir: ComponentIR): string {
  const propNames = new Set(ir.styledProps.map((p) => p.name));
  const lines: string[] = [];

  const extendsClause = buildHostAttrsExtendsClause(ir, propNames);
  lines.push(
    extendsClause
      ? `export interface ${ir.name}Props extends ${extendsClause} {`
      : `export interface ${ir.name}Props {`,
  );

  for (const p of ir.styledProps) {
    // A prop with a `defaultExpr` is effectively optional at the call
    // site even if the contract marks it `required: true` — the
    // generated component supplies the default. Make the TS prop
    // optional so consumers (including this contract's own generated
    // tests) can omit the prop. BINDING-EXPRESSION-V2-PREDICATE-01
    // surfaced this when Select gained an `options` default: tests
    // that previously had to pass `options={[]}` can now omit it.
    const optional = p.required && p.defaultExpr === undefined ? "" : "?";
    const propName = p.name.includes("-") ? `"${p.name}"` : p.name;
    const tsType = lowerReactPropType(p.propType, ir);
    lines.push(`  ${propName}${optional}: ${tsType};`);
  }

  for (const dim of Object.keys(ir.variants)) {
    if (!propNames.has(dim)) {
      lines.push(`  ${dim}?: string;`);
    }
  }
  if (!propNames.has("className")) lines.push(`  className?: string;`);
  if (!propNames.has("data-testid")) lines.push(`  "data-testid"?: string;`);
  // Only expose a `children` prop when the component actually renders
  // children. For dom-tree components, that means a `{ tag: "children" }`
  // region in the contract. For legacy no-dom-tree components, the
  // emitter always wraps the body in `<Stack>{children}</Stack>`, so they
  // always accept children. Visual leaf components (e.g. <Image>, <Spinner>)
  // get a clean API with no dead prop.
  const componentAcceptsChildren = ir.dom ? hasChildrenPlaceholder(ir) : true;
  if (!propNames.has("children") && componentAcceptsChildren) {
    lines.push(`  children?: ReactNode;`);
  }

  // Named slots from the dom tree → `slots` prop with each named slot as
  // an optional ReactNode. Consumers pass `<MyComponent slots={{ title: ... }}>`.
  const namedSlots = collectReactNamedSlots(ir);
  if (namedSlots.length > 0) {
    lines.push(`  slots?: {`);
    for (const slot of namedSlots) {
      lines.push(`    ${slot}?: ReactNode;`);
    }
    lines.push(`  };`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

function collectReactNamedSlots(ir: ComponentIR): string[] {
  if (!ir.dom) return [];
  const names: string[] = [];
  const stack = [ir.dom];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.tag === "slot" && node.slotName && !names.includes(node.slotName)) {
      names.push(node.slotName);
    }
    if (node.children) stack.push(...node.children);
  }
  return names.sort();
}

/**
 * React TS type for a forwarded native table attribute. `style` resolves to
 * `CSSProperties` (the body-scanner in generateReactComponentSource adds the
 * import when this identifier appears); the others are their HTML-native shapes.
 */
function reactTableAttrType(attr: NativeTableAttr): string {
  switch (attr) {
    case "id":
      return "string";
    case "style":
      return "CSSProperties";
    case "colSpan":
    case "rowSpan":
      return "number";
    case "scope":
      return '"col" | "row" | "colgroup" | "rowgroup"';
  }
}

function generateSubComponentProps(name: string, part: PartIR): string {
  const subName = `${name}${capitalize(part.name)}`;
  const lines = [
    `export interface ${subName}Props {`,
    `  children?: ReactNode;`,
    `  className?: string;`,
    `  "data-testid"?: string;`,
  ];
  // Native table cells/headers forward the HTML attributes a real data table
  // needs (colSpan/rowSpan/scope) plus the global id/style — keyed by tag in
  // the IR so no per-component lore lives here. JSX prop names equal the IR
  // names (colSpan, rowSpan, scope, id, style).
  for (const attr of nativeTableAttrsFor(part.nativeTag)) {
    lines.push(`  ${attr}?: ${reactTableAttrType(attr)};`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

function generateSubComponent(
  name: string,
  prefix: string,
  part: PartIR,
): string {
  const subName = `${name}${capitalize(part.name)}`;
  const cssClass = `${prefix}__${part.name}`;

  // Native-tag branch: when the contract declares the part's native tag
  // via anatomy.details.<part>.tag (or anatomy.dom) AND that tag is in
  // the HTML table content model set, emit the native element directly.
  // No Stack wrapper, no .stack class injection, no layout-primitive
  // semantics imposed on a native table section/row/cell.
  if (part.nativeTag && TABLE_COMPOSITION_TAGS.has(part.nativeTag)) {
    const tag = part.nativeTag;
    const attrs = nativeTableAttrsFor(tag);
    const destructure = [
      `  children,`,
      `  className,`,
      `  "data-testid": testId,`,
      ...attrs.map((a) => `  ${a},`),
    ];
    // JSX attribute names equal the IR names; React drops any whose value is
    // undefined, so forwarding all of them is safe even when the consumer set
    // none.
    const jsxAttrs = [
      `className={classNames}`,
      `data-testid={testId}`,
      ...attrs.map((a) => `${a}={${a}}`),
    ].join(" ");
    return [
      `export function ${subName}({`,
      ...destructure,
      `}: ${subName}Props) {`,
      `  const classNames = ["${cssClass}", className].filter(Boolean).join(" ");`,
      `  return (`,
      `    <${tag} ${jsxAttrs}>`,
      `      {children}`,
      `    </${tag}>`,
      `  );`,
      `}`,
    ].join("\n");
  }

  const asElement = part.isExplicitSubcomponent
    ? part.nativeTag ?? part.semanticElement
    : part.semanticElement;
  const asProp = asElement && asElement !== "div" ? ` as="${asElement}"` : "";
  const layoutProp =
    part.layoutVariant === "horizontal" ? ` variant="horizontal"` : "";

  return [
    `export function ${subName}({`,
    `  children,`,
    `  className,`,
    `  "data-testid": testId,`,
    `}: ${subName}Props) {`,
    `  const classNames = ["${cssClass}", className].filter(Boolean).join(" ");`,
    `  return (`,
    `    <Stack${asProp}${layoutProp} className={classNames} data-testid={testId}>`,
    `      {children}`,
    `    </Stack>`,
    `  );`,
    `}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Compound-state-container (Tabs-shaped) sub-component generation
// ---------------------------------------------------------------------------

/**
 * Generates context type, context creation, and the three sub-components
 * (List, Tab, Panel) for a compound-state-container component like Tabs.
 *
 * The context is created at module level so all sub-components can share it
 * without re-creating on each render.
 */
function generateCompoundStateSubcomponents(ir: ComponentIR): string {
  const name = ir.name;
  const prefix = ir.cssPrefix;
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  const groupPart = getGroupHostPart(ir);

  if (!itemPart || !regionPart) return "";

  // Derive sub-component names
  const listName = `${name}${capitalize(groupPart?.name ?? "List")}`;
  const tabName = `${name}${capitalize(itemPart.name)}`;
  const panelName = `${name}${capitalize(regionPart.name)}`;

  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "activeTab";
  const setterName = `set${capitalize(channelName)}`;

  // Focus strategy from the contract
  const orientation = "orientation";

  const lines: string[] = [];

  // ---------------------------------------------------------------------------
  // Context type and creation
  // ---------------------------------------------------------------------------
  lines.push(`export interface ${name}ContextValue {`);
  lines.push(`  ${channelName}: string;`);
  lines.push(`  ${setterName}: (value: string) => void;`);
  lines.push(`  registerTab: (value: string) => void;`);
  lines.push(`  unregisterTab: (value: string) => void;`);
  lines.push(`  registeredTabs: string[];`);
  lines.push(`  idBase: string;`);
  lines.push(`  ${orientation}: "horizontal" | "vertical";`);
  lines.push(`  activationMode: "automatic" | "manual";`);
  lines.push(`  loop: boolean;`);
  lines.push(`  unmountInactive: boolean;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(
    `const [${name}ContextProvider, use${name}Context] = createCompoundContext<${name}ContextValue>("${name}");`,
  );
  lines.push(`export { use${name}Context };`);
  lines.push(``);

  // ---------------------------------------------------------------------------
  // List sub-component (keyboard host)
  // ---------------------------------------------------------------------------
  lines.push(`export interface ${listName}Props {`);
  lines.push(`  children?: type ReactNode;`.replace("type ReactNode", "ReactNode"));
  lines.push(`  className?: string;`);
  lines.push(`  "data-testid"?: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function ${listName}({`);
  lines.push(`  children,`);
  lines.push(`  className,`);
  lines.push(`  "data-testid": testId,`);
  lines.push(`}: ${listName}Props) {`);
  lines.push(`  const ctx = use${name}Context();`);
  lines.push(`  const listRef = useRef<HTMLDivElement>(null);`);
  lines.push(`  const classNames = ["${prefix}__${groupPart?.name ?? "list"}", className].filter(Boolean).join(" ");`);
  lines.push(``);
  lines.push(`  const handleKeyDown = useCallback(`);
  lines.push(`    (e: KeyboardEvent<HTMLDivElement>) => {`);
  lines.push(`      const tabs = ctx.registeredTabs;`);
  lines.push(`      if (tabs.length === 0) return;`);
  lines.push(`      const currentIndex = tabs.indexOf(ctx.${channelName});`);
  lines.push(`      const isHorizontal = ctx.${orientation} !== "vertical";`);
  lines.push(`      let nextIndex = currentIndex;`);
  lines.push(`      if (`);
  lines.push(`        (isHorizontal && e.key === "ArrowRight") ||`);
  lines.push(`        (!isHorizontal && e.key === "ArrowDown")`);
  lines.push(`      ) {`);
  lines.push(`        e.preventDefault();`);
  lines.push(`        nextIndex = ctx.loop`);
  lines.push(`          ? (currentIndex + 1) % tabs.length`);
  lines.push(`          : Math.min(currentIndex + 1, tabs.length - 1);`);
  lines.push(`      } else if (`);
  lines.push(`        (isHorizontal && e.key === "ArrowLeft") ||`);
  lines.push(`        (!isHorizontal && e.key === "ArrowUp")`);
  lines.push(`      ) {`);
  lines.push(`        e.preventDefault();`);
  lines.push(`        nextIndex = ctx.loop`);
  lines.push(`          ? (currentIndex - 1 + tabs.length) % tabs.length`);
  lines.push(`          : Math.max(currentIndex - 1, 0);`);
  lines.push(`      } else if (e.key === "Home") {`);
  lines.push(`        e.preventDefault();`);
  lines.push(`        nextIndex = 0;`);
  lines.push(`      } else if (e.key === "End") {`);
  lines.push(`        e.preventDefault();`);
  lines.push(`        nextIndex = tabs.length - 1;`);
  lines.push(`      } else if (e.key === "Enter" || e.key === " ") {`);
  lines.push(`        if (ctx.activationMode === "manual") {`);
  lines.push(`          e.preventDefault();`);
  lines.push(`          const focusedBtn = listRef.current?.querySelector<HTMLButtonElement>("[role=\\"tab\\"]:focus");`);
  lines.push(`          if (focusedBtn) {`);
  lines.push(`            const val = focusedBtn.getAttribute("data-value");`);
  lines.push(`            if (val) ctx.${setterName}(val);`);
  lines.push(`          }`);
  lines.push(`        }`);
  lines.push(`        return;`);
  lines.push(`      } else {`);
  lines.push(`        return;`);
  lines.push(`      }`);
  lines.push(`      const targetValue = tabs[nextIndex];`);
  lines.push(`      if (ctx.activationMode === "automatic") {`);
  lines.push(`        ctx.${setterName}(targetValue);`);
  lines.push(`      }`);
  lines.push(`      // Move focus to the target tab button`);
  lines.push(`      const btn = listRef.current?.querySelector<HTMLButtonElement>(`);
  lines.push(`        \`[role="tab"][data-value="\${targetValue}"]\`,`);
  lines.push(`      );`);
  lines.push(`      btn?.focus();`);
  lines.push(`    },`);
  lines.push(`    [ctx],`);
  lines.push(`  );`);
  lines.push(``);
  // TABS-INDICATOR-REALIZATION-01: when the contract declares a singleton
  // ornament part (e.g. `indicator`) as a direct child of the group host
  // in anatomy.dom, render it as a sibling of the consumer's children
  // inside the group container. Declared-DOM-realization only — the
  // ornament's visual treatment, motion, and (eventual) measured
  // positioning live in styles.json / Tabs.css and are NOT redesigned
  // here. aria-hidden because it's a non-interactive decoration.
  const ornamentPart = getGroupHostOrnamentPart(ir);

  lines.push(`  return (`);
  lines.push(`    <div`);
  lines.push(`      ref={listRef}`);
  lines.push(`      role="tablist"`);
  // The tablist is an interactive role hosting the delegated roving keydown;
  // it must be programmatically focusable (APG) but stays out of tab order.
  lines.push(`      tabIndex={-1}`);
  lines.push(`      className={classNames}`);
  lines.push(`      data-testid={testId}`);
  lines.push(`      onKeyDown={handleKeyDown}`);
  lines.push(`      aria-orientation={ctx.${orientation}}`);
  lines.push(`    >`);
  lines.push(`      {children}`);
  if (ornamentPart) {
    lines.push(
      `      <span className="${prefix}__${ornamentPart.name}" aria-hidden="true" />`,
    );
  }
  lines.push(`    </div>`);
  lines.push(`  );`);
  lines.push(`}`);
  lines.push(``);

  // ---------------------------------------------------------------------------
  // Tab sub-component (interactive item)
  // ---------------------------------------------------------------------------
  lines.push(`export interface ${tabName}Props extends Omit<InteractionHostProps, "value"> {`);
  lines.push(`  value: string;`);
  lines.push(`  disabled?: boolean;`);
  lines.push(`  children?: ReactNode;`);
  lines.push(`  className?: string;`);
  lines.push(`  "data-testid"?: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function ${tabName}({`);
  lines.push(`  value,`);
  lines.push(`  disabled,`);
  lines.push(`  children,`);
  lines.push(`  asChild,`);

  lines.push(`  className,`);
  lines.push(`  "data-testid": testId,`);
  lines.push(`  ...hostProps
}: ${tabName}Props) {`);
  lines.push(`  const ctx = use${name}Context();`);
  lines.push(`  const isActive = ctx.${channelName} === value;`);
  lines.push(`  const classNames = [`);
  lines.push(`    "${prefix}__${itemPart.name}",`);
  lines.push(`    isActive && "${prefix}__${itemPart.name}--active",`);
  lines.push(`    className,`);
  lines.push(`  ].filter(Boolean).join(" ");`);
  lines.push(``);
  lines.push(`  // Self-register on mount, unregister on unmount`);
  lines.push(`  const { registerTab, unregisterTab } = ctx;`);
  lines.push(`  // Use a ref so the cleanup closure always references the current value`);
  lines.push(`  const valueRef = useRef(value);`);
  lines.push(`  valueRef.current = value;`);
  lines.push(`  useEffect(() => {`);
  lines.push(`    registerTab(valueRef.current);`);
  lines.push(`    return () => unregisterTab(valueRef.current);`);
  lines.push(`  }, [registerTab, unregisterTab]);`);
  lines.push(``);
  lines.push(`  return (`);
  lines.push(`    <InteractionHost {...hostProps} asChild={asChild}`);
  lines.push(`      role="tab"`);
  lines.push(`      type="button"`);
  lines.push(`      className={classNames}`);
  lines.push(`      data-value={value}`);
  lines.push(`      data-testid={testId}`);
  lines.push(`      id={\`\${ctx.idBase}-tab-\${value}\`}`);
  lines.push(`      aria-controls={\`\${ctx.idBase}-panel-\${value}\`}`);
  lines.push(`      aria-selected={isActive}`);
  lines.push(`      tabIndex={isActive ? 0 : -1}`);
  lines.push(`      disabled={disabled}`);
  lines.push(`      onActivate={() => ctx.${setterName}(value)}`);
  lines.push(`    >`);
  lines.push(`      {children}`);
  lines.push(`    </InteractionHost>`);
  lines.push(`  );`);
  lines.push(`}`);
  lines.push(``);

  // ---------------------------------------------------------------------------
  // Panel sub-component (region)
  // ---------------------------------------------------------------------------
  lines.push(`export interface ${panelName}Props {`);
  lines.push(`  value: string;`);
  lines.push(`  children?: ReactNode;`);
  lines.push(`  className?: string;`);
  lines.push(`  "data-testid"?: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function ${panelName}({`);
  lines.push(`  value,`);
  lines.push(`  children,`);
  lines.push(`  className,`);
  lines.push(`  "data-testid": testId,`);
  lines.push(`}: ${panelName}Props) {`);
  lines.push(`  const ctx = use${name}Context();`);
  lines.push(`  const isActive = ctx.${channelName} === value;`);
  lines.push(`  const classNames = ["${prefix}__${regionPart.name}", className].filter(Boolean).join(" ");`);
  lines.push(``);
  lines.push(`  if (ctx.unmountInactive && !isActive) return null;`);
  lines.push(``);
  lines.push(`  return (`);
  lines.push(`    <div`);
  lines.push(`      role="tabpanel"`);
  lines.push(`      className={classNames}`);
  lines.push(`      id={\`\${ctx.idBase}-panel-\${value}\`}`);
  lines.push(`      aria-labelledby={\`\${ctx.idBase}-tab-\${value}\`}`);
  lines.push(`      tabIndex={0}`);
  lines.push(`      data-testid={testId}`);
  lines.push(`      hidden={!isActive ? true : undefined}`);
  lines.push(`    >`);
  lines.push(`      {children}`);
  lines.push(`    </div>`);
  lines.push(`  );`);
  lines.push(`}`);

  return lines.join("\n");
}

/**
 * Generate the repeated-disclosure subcomponents (Accordion-shaped): a shared
 * context plus item/trigger/content sub-components. Distinct from the
 * tab-selection generators — no `role="tab"`, no roving single-selection, no
 * register/unregister. ARIA is contract-derived: the trigger binds
 * `aria-expanded` (the discriminator in `isDisclosureContainer`), the region
 * gets `role="region"` + `aria-labelledby`. Names and BEM classes come from
 * the resolved parts, never from a component-name literal.
 */
function generateDisclosureStateSubcomponents(ir: ComponentIR): string {
  const name = ir.name;
  const prefix = ir.cssPrefix;
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  const multiplePart = getMultipleItemPart(ir);
  if (!itemPart || !regionPart || !multiplePart) return "";

  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "openness";

  // Header wrapper (the interactive item's DOM parent, e.g. Accordion `header`)
  // and chevron ornament (a non-interactive sibling inside the trigger) are
  // discovered from anatomy.dom so no per-component lore is needed.
  const itemNode = ir.dom
    ? findDisclosureNode(ir.dom, itemPart.name)
    : undefined;
  const headerNode = ir.dom
    ? findDisclosureParentOf(ir.dom, itemPart.name)
    : undefined;
  const headerPartName = headerNode?.part;
  const headerTag = headerNode?.tag ?? "div";
  const chevronNode = itemNode?.children?.find(
    (c) => c.part !== undefined && c.tag !== "slot" && c.tag !== "children",
  );
  const innerNode = ir.dom
    ? findDisclosureNode(ir.dom, regionPart.name)
    : undefined;
  const innerChild = innerNode?.children?.find(
    (c) => c.part !== undefined && c.tag !== "slot" && c.tag !== "children",
  );
  const innerPartName = innerChild?.part;
  const innerTag = innerChild?.tag ?? "div";
  const triggerTag = itemNode?.tag ?? "button";

  const hasDisabled = ir.styledProps.some((p) => p.name === "disabled");

  const lines: string[] = [];

  // Context ------------------------------------------------------------------
  lines.push(`export interface ${name}ContextValue {`);
  lines.push(`  ${channelName}: string | string[];`);
  lines.push(`  toggleItem: (value: string) => void;`);
  lines.push(`  isItemOpen: (value: string) => boolean;`);
  lines.push(`  type: "single" | "multiple";`);
  lines.push(`  collapsible: boolean;`);
  lines.push(`  disabled: boolean;`);
  lines.push(`  idBase: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(
    `const [${name}ContextProvider, use${name}Context] = createCompoundContext<${name}ContextValue>("${name}");`,
  );
  lines.push(`export { use${name}Context };`);
  lines.push(``);

  // Item wrapper -------------------------------------------------------------
  const itemName = `${name}${capitalize(multiplePart.name)}`;
  lines.push(`export interface ${itemName}Props {`);
  lines.push(`  children?: ReactNode;`);
  lines.push(`  className?: string;`);
  lines.push(`  "data-testid"?: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function ${itemName}({`);
  lines.push(`  children,`);
  lines.push(`  className,`);
  lines.push(`  "data-testid": testId,`);
  lines.push(`}: ${itemName}Props) {`);
  lines.push(`  const classNames = ["${prefix}__${multiplePart.name}", className].filter(Boolean).join(" ");`);
  lines.push(`  return (`);
  lines.push(`    <div className={classNames} data-testid={testId}>`);
  lines.push(`      {children}`);
  lines.push(`    </div>`);
  lines.push(`  );`);
  lines.push(`}`);
  lines.push(``);

  // Trigger ------------------------------------------------------------------
  const triggerName = `${name}${capitalize(itemPart.name)}`;
  lines.push(`export interface ${triggerName}Props extends Omit<InteractionHostProps, "value"> {`);
  lines.push(`  value: string;`);
  lines.push(`  children?: ReactNode;`);
  lines.push(`  className?: string;`);
  lines.push(`  "data-testid"?: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function ${triggerName}({`);
  lines.push(`  value,`);
  lines.push(`  children,`);
  lines.push(`  asChild,`);

  lines.push(`  className,`);
  lines.push(`  "data-testid": testId,`);
  lines.push(`  ...hostProps
}: ${triggerName}Props) {`);
  lines.push(`  const ctx = use${name}Context();`);
  lines.push(`  const isOpen = ctx.isItemOpen(value);`);
  lines.push(`  const classNames = [`);
  lines.push(`    "${prefix}__${itemPart.name}",`);
  lines.push(`    isOpen && "${prefix}__${itemPart.name}--open",`);
  lines.push(`    className,`);
  lines.push(`  ].filter(Boolean).join(" ");`);
  lines.push(``);
  lines.push(`  return (`);
  if (headerPartName) {
    lines.push(`    <${headerTag} className="${prefix}__${headerPartName}">`);
  }
  const triggerIndent = headerPartName ? "      " : "    ";
  lines.push(`${triggerIndent}<InteractionHost as="${triggerTag}" {...hostProps} asChild={asChild}`);
  lines.push(`${triggerIndent}  type="button"`);
  lines.push(`${triggerIndent}  className={classNames}`);
  lines.push(`${triggerIndent}  data-disclosure-trigger=""`);
  lines.push(`${triggerIndent}  data-value={value}`);
  lines.push(`${triggerIndent}  id={\`\${ctx.idBase}-trigger-\${value}\`}`);
  lines.push(`${triggerIndent}  aria-controls={\`\${ctx.idBase}-content-\${value}\`}`);
  lines.push(`${triggerIndent}  aria-expanded={isOpen}`);
  if (hasDisabled) lines.push(`${triggerIndent}  disabled={ctx.disabled}`);
  lines.push(`${triggerIndent}  data-testid={testId}`);
  lines.push(`${triggerIndent}  onActivate={() => ctx.toggleItem(value)}`);
  lines.push(`${triggerIndent}>`);
  lines.push(`${triggerIndent}  {children}`);
  if (chevronNode) {
    lines.push(`${triggerIndent}  {!asChild && (`);
    lines.push(
      renderReactDomNode(
        chevronNode,
        { classRecipe: prefix, channelByName: new Map(), isRoot: false },
        triggerIndent.length + 2,
      ),
    );
    lines.push(`${triggerIndent}  )}`);
  }
  lines.push(`${triggerIndent}</InteractionHost>`);
  if (headerPartName) {
    lines.push(`    </${headerTag}>`);
  }
  lines.push(`  );`);
  lines.push(`}`);
  lines.push(``);

  // Content region -----------------------------------------------------------
  const contentName = `${name}${capitalize(regionPart.name)}`;
  lines.push(`export interface ${contentName}Props {`);
  lines.push(`  value: string;`);
  lines.push(`  children?: ReactNode;`);
  lines.push(`  className?: string;`);
  lines.push(`  "data-testid"?: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function ${contentName}({`);
  lines.push(`  value,`);
  lines.push(`  children,`);
  lines.push(`  className,`);
  lines.push(`  "data-testid": testId,`);
  lines.push(`}: ${contentName}Props) {`);
  lines.push(`  const ctx = use${name}Context();`);
  lines.push(`  const isOpen = ctx.isItemOpen(value);`);
  lines.push(`  const classNames = ["${prefix}__${regionPart.name}", className].filter(Boolean).join(" ");`);
  lines.push(``);
  lines.push(`  return (`);
  lines.push(`    <div`);
  lines.push(`      role="region"`);
  lines.push(`      className={classNames}`);
  lines.push(`      id={\`\${ctx.idBase}-content-\${value}\`}`);
  lines.push(`      aria-labelledby={\`\${ctx.idBase}-trigger-\${value}\`}`);
  lines.push(`      hidden={!isOpen ? true : undefined}`);
  lines.push(`      data-testid={testId}`);
  lines.push(`    >`);
  if (innerPartName) {
    lines.push(`      <${innerTag} className="${prefix}__${innerPartName}">`);
    lines.push(`        {children}`);
    lines.push(`      </${innerTag}>`);
  } else {
    lines.push(`      {children}`);
  }
  lines.push(`    </div>`);
  lines.push(`  );`);
  lines.push(`}`);

  return lines.join("\n");
}

/** DFS for the DOM node whose part matches `partName` (disclosure lowering). */
function findDisclosureNode(
  root: NonNullable<ComponentIR["dom"]>,
  partName: string,
): NonNullable<ComponentIR["dom"]> | undefined {
  const stack: NonNullable<ComponentIR["dom"]>[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.part === partName) return node;
    if (node.children) stack.push(...node.children);
  }
  return undefined;
}

/** Returns the DOM node whose direct child has `part === partName`. */
function findDisclosureParentOf(
  root: NonNullable<ComponentIR["dom"]>,
  partName: string,
): NonNullable<ComponentIR["dom"]> | undefined {
  const stack: NonNullable<ComponentIR["dom"]>[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.children?.some((c) => c.part === partName)) return node;
    if (node.children) stack.push(...node.children);
  }
  return undefined;
}

/**
 * Root component for a repeated-disclosure container (Accordion). Owns the
 * shared channel via the component's state hook, derives per-item open/closed,
 * exposes toggle + arrow-key navigation, and provides the disclosure context.
 */
function generateDisclosureStateRootComponent(ir: ComponentIR): string {
  const { name, classRecipe } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "openness";
  const setterName = `set${capitalize(channelName)}`;

  const propByName = new Map(ir.styledProps.map((p) => [p.name, p]));
  const destructured: string[] = [];
  const handled = new Set<string>();
  const classExprs: string[] = [`"${classRecipe.base}"`];

  if (channel) {
    destructured.push(`${channel.valueProp}: controlled${capitalize(channel.valueProp)}`);
    handled.add(channel.valueProp);
    if (channel.defaultValueProp) {
      destructured.push(channel.defaultValueProp);
      handled.add(channel.defaultValueProp);
    }
    destructured.push(channel.changeHandlerProp);
    handled.add(channel.changeHandlerProp);
  }

  for (const mod of classRecipe.valueModifiers) {
    if (handled.has(mod.propName)) continue;
    const resolved = propByName.get(mod.propName);
    const def = resolved?.defaultExpr ?? mod.defaultExpr;
    destructured.push(def ? `${mod.propName} = ${def}` : mod.propName);
    classExprs.push(`${mod.safeName} && \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${mod.safeName}}\``);
    handled.add(mod.propName);
  }

  const hasDisabled = ir.styledProps.some((p) => p.name === "disabled");
  const hasCollapsible = ir.styledProps.some((p) => p.name === "collapsible");
  if (hasDisabled && !handled.has("disabled")) {
    destructured.push("disabled");
    handled.add("disabled");
    classExprs.push(`disabled && "${classRecipe.base}--disabled"`);
  }
  if (!handled.has("className")) {
    destructured.push("className");
    handled.add("className");
  }
  destructured.push('"data-testid": testId');
  destructured.push("children");
  if (hasCollapsible && !handled.has("collapsible")) {
    destructured.push("collapsible = false");
    handled.add("collapsible");
  }
  destructured.push("...rest");
  classExprs.push("className");

  const controlledAlias = `controlled${capitalize(channel?.valueProp ?? "value")}`;

  const lines: string[] = [];
  lines.push(`export function ${name}({`);
  lines.push(`  ${destructured.join(",\n  ")}`);
  lines.push(`}: ${name}Props) {`);
  lines.push(`  const rootRef = useRef<HTMLDivElement>(null);`);
  lines.push(`  const { ${channelName}, ${setterName} } = use${name}({`);
  if (channel) {
    lines.push(`    ${channel.valueProp}: ${controlledAlias},`);
    if (channel.defaultValueProp) lines.push(`    ${channel.defaultValueProp},`);
    lines.push(`    ${channel.changeHandlerProp},`);
  }
  lines.push(`  });`);
  lines.push(`  const idBase = useId();`);
  lines.push(``);
  lines.push(`  const isItemOpen = useCallback(`);
  lines.push(`    (itemValue: string) =>`);
  lines.push(`      Array.isArray(${channelName})`);
  lines.push(`        ? ${channelName}.includes(itemValue)`);
  lines.push(`        : ${channelName} === itemValue,`);
  lines.push(`    [${channelName}],`);
  lines.push(`  );`);
  lines.push(``);
  lines.push(`  const toggleItem = useCallback(`);
  lines.push(`    (itemValue: string) => {`);
  lines.push(`      ${setterName}(toggleInteractionItem(${channelName}, itemValue, type === "multiple", ${hasCollapsible ? "Boolean(collapsible)" : "false"}));`);
  lines.push(`    },`);
  lines.push(`    [${channelName}, ${setterName}, type${hasCollapsible ? ", collapsible" : ""}],`);
  lines.push(`  );`);
  lines.push(``);
  lines.push(`  const handleKeyDown = useCallback(`);
  lines.push(`    (e: KeyboardEvent<HTMLDivElement>) => {`);
  lines.push(`      const key = e.key;`);
  lines.push(`      if (`);
  lines.push(`        key !== "ArrowDown" &&`);
  lines.push(`        key !== "ArrowUp" &&`);
  lines.push(`        key !== "Home" &&`);
  lines.push(`        key !== "End"`);
  lines.push(`      ) {`);
  lines.push(`        return;`);
  lines.push(`      }`);
  lines.push(`      const root = rootRef.current;`);
  lines.push(`      if (!root) return;`);
  lines.push(`      const triggers = Array.from(`);
  lines.push(`        root.querySelectorAll<HTMLButtonElement>("[data-disclosure-trigger]"),`);
  lines.push(`      ).filter((el) => !el.disabled);`);
  lines.push(`      if (triggers.length === 0) return;`);
  lines.push(`      const currentIndex = triggers.indexOf(`);
  lines.push(`        document.activeElement as HTMLButtonElement,`);
  lines.push(`      );`);
  lines.push(`      let nextIndex = currentIndex;`);
  lines.push(`      if (key === "ArrowDown") {`);
  lines.push(`        nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % triggers.length;`);
  lines.push(`      } else if (key === "ArrowUp") {`);
  lines.push(`        nextIndex =`);
  lines.push(`          currentIndex < 0`);
  lines.push(`            ? triggers.length - 1`);
  lines.push(`            : (currentIndex - 1 + triggers.length) % triggers.length;`);
  lines.push(`      } else if (key === "Home") {`);
  lines.push(`        nextIndex = 0;`);
  lines.push(`      } else {`);
  lines.push(`        nextIndex = triggers.length - 1;`);
  lines.push(`      }`);
  lines.push(`      e.preventDefault();`);
  lines.push(`      triggers[nextIndex]?.focus();`);
  lines.push(`    },`);
  lines.push(`    [],`);
  lines.push(`  );`);
  lines.push(``);
  lines.push(`  const classNames = [`);
  for (const expr of classExprs) lines.push(`    ${expr},`);
  lines.push(`  ]`);
  lines.push(`    .filter(Boolean)`);
  lines.push(`    .join(" ");`);
  lines.push(``);
  lines.push(`  return (`);
  lines.push(`    <${name}ContextProvider`);
  lines.push(`      value={{`);
  lines.push(`        ${channelName},`);
  lines.push(`        toggleItem,`);
  lines.push(`        isItemOpen,`);
  lines.push(`        type: type ?? "single",`);
  lines.push(`        collapsible: ${hasCollapsible ? "collapsible ?? false" : "false"},`);
  lines.push(`        disabled: ${hasDisabled ? "disabled ?? false" : "false"},`);
  lines.push(`        idBase,`);
  lines.push(`      }}`);
  lines.push(`    >`);
  lines.push(`      <div`);
  lines.push(`        ref={rootRef}`);
  lines.push(`        className={classNames}`);
  lines.push(`        data-testid={testId}`);
  lines.push(`        data-fsds-component="${ir.cssPrefix}" data-fsds-box=""`);
  lines.push(`        onKeyDown={handleKeyDown}`);
  lines.push(`        {...rest}`);
  lines.push(`      >`);
  lines.push(`        {children}`);
  lines.push(`      </div>`);
  lines.push(`    </${name}ContextProvider>`);
  lines.push(`  );`);
  lines.push(`}`);
  return lines.join("\n");
}

/**
 * Generate the root component for a compound-state-container (Tabs-shaped)
 * component. Wraps children in the compound context provider, wires the hook,
 * and handles variant CSS classes.
 */
function generateCompoundStateRootComponent(ir: ComponentIR): string {
  const { name, classRecipe } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "activeTab";
  const setterName = `set${capitalize(channelName)}`;

  // Build the destructured props list with defaults
  const propByName = new Map(ir.styledProps.map((p) => [p.name, p]));
  const destructured: string[] = [];
  const handled = new Set<string>();
  const classExprs: string[] = [`"${classRecipe.base}"`];

  // Channel props first
  if (channel) {
    destructured.push(`${channel.valueProp}: controlled${capitalize(channel.valueProp)}`);
    handled.add(channel.valueProp);
    if (channel.defaultValueProp) {
      destructured.push(channel.defaultValueProp);
      handled.add(channel.defaultValueProp);
    }
    destructured.push(channel.changeHandlerProp);
    handled.add(channel.changeHandlerProp);
  }

  // Variant modifier props with defaults
  for (const mod of classRecipe.valueModifiers) {
    if (handled.has(mod.propName)) continue;
    const resolved = propByName.get(mod.propName);
    const def = resolved?.defaultExpr ?? mod.defaultExpr;
    const aliased = mod.propName;
    destructured.push(def ? `${aliased} = ${def}` : aliased);
    classExprs.push(`${mod.safeName} && \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${mod.safeName}}\``);
    handled.add(mod.propName);
  }

  // Remaining props
  const remainingProps = ["loop", "unmountInactive", "idBase"];
  for (const pname of remainingProps) {
    if (handled.has(pname)) continue;
    const p = propByName.get(pname);
    if (!p) continue;
    const def = p.defaultExpr;
    destructured.push(def ? `${pname} = ${def}` : pname);
    handled.add(pname);
  }

  if (!handled.has("className")) {
    destructured.push("className");
    handled.add("className");
  }
  destructured.push('"data-testid": testId');
  destructured.push("children");
  destructured.push("...rest");

  classExprs.push("className");

  const hookResultParts = [channelName, setterName, "registeredTabs", "registerTab", "unregisterTab", "idBase: resolvedIdBase"];
  const controlledAlias = `controlled${capitalize(channel?.valueProp ?? "value")}`;

  const lines: string[] = [];
  lines.push(`export function ${name}({`);
  lines.push(`  ${destructured.join(",\n  ")}`);
  lines.push(`}: ${name}Props) {`);
  lines.push(`  const { ${hookResultParts.join(", ")} } = use${name}({`);
  if (channel) {
    lines.push(`    ${channel.valueProp}: ${controlledAlias},`);
    if (channel.defaultValueProp) lines.push(`    ${channel.defaultValueProp},`);
    lines.push(`    ${channel.changeHandlerProp},`);
  }
  lines.push(`    idBase,`);
  lines.push(`  });`);
  lines.push(``);
  lines.push(`  const classNames = [`);
  for (const expr of classExprs) lines.push(`    ${expr},`);
  lines.push(`  ]`);
  lines.push(`    .filter(Boolean)`);
  lines.push(`    .join(" ");`);
  lines.push(``);
  lines.push(`  return (`);
  lines.push(`    <${name}ContextProvider`);
  lines.push(`      value={{`);
  lines.push(`        ${channelName},`);
  lines.push(`        ${setterName},`);
  lines.push(`        registeredTabs,`);
  lines.push(`        registerTab,`);
  lines.push(`        unregisterTab,`);
  lines.push(`        idBase: resolvedIdBase,`);
  lines.push(`        orientation: orientation ?? "horizontal",`);
  lines.push(`        activationMode: activationMode ?? "automatic",`);
  lines.push(`        loop: loop ?? true,`);
  lines.push(`        unmountInactive: unmountInactive ?? true,`);
  lines.push(`      }}`);
  lines.push(`    >`);
  lines.push(`      <div`);
  lines.push(`        className={classNames}`);
  lines.push(`        data-testid={testId}`);
  lines.push(`        data-fsds-component="${ir.cssPrefix}" data-fsds-box=""`);
  lines.push(`        {...rest}`);
  lines.push(`      >`);
  lines.push(`        {children}`);
  lines.push(`      </div>`);
  lines.push(`    </${name}ContextProvider>`);
  lines.push(`  );`);
  lines.push(`}`);
  return lines.join("\n");
}

function generateRootComponent(ir: ComponentIR): string {
  if (isDisclosureContainer(ir)) {
    return generateDisclosureStateRootComponent(ir);
  }
  if (isCompoundStateContainer(ir)) {
    return generateCompoundStateRootComponent(ir);
  }
  if (ir.dom) {
    return generateDomTreeRootComponent(ir);
  }
  const { name, classRecipe, root } = ir;

  // A prop is "destructured" once, in a stable order matching the historical
  // generator: value-modifier props first (with defaults), then className,
  // testid, children, ...rest.
  const destructured: string[] = [];
  const classExprs: string[] = [`"${classRecipe.base}"`];
  const handled = new Set<string>();

  // Map prop name to ResolvedPropIR for fast lookup.
  const propByName = new Map(ir.styledProps.map((p) => [p.name, p]));

  for (const mod of classRecipe.valueModifiers) {
    const resolved = propByName.get(mod.propName);
    const aliased = mod.propName.includes("-")
      ? `"${mod.propName}": ${mod.safeName}`
      : mod.propName;
    const def = resolved?.defaultExpr ?? mod.defaultExpr;
    destructured.push(def ? `${aliased} = ${def}` : aliased);
    classExprs.push(
      `${mod.safeName} && \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${mod.safeName}}\``,
    );
    handled.add(mod.propName);
  }

  for (const mod of classRecipe.booleanModifiers) {
    if (handled.has(mod.propName)) continue;
    destructured.push(mod.propName);
    classExprs.push(
      `${mod.safeName} && "${classRecipe.base}--${mod.safeName}"`,
    );
    handled.add(mod.propName);
  }

  if (!handled.has("className")) destructured.push("className");
  destructured.push('"data-testid": testId');
  // Legacy no-dom-tree path always wraps in <Stack>{children}</Stack>, so
  // children is part of the API regardless of contract placement.
  if (!handled.has("children")) destructured.push("children");
  handled.add("className");
  handled.add("data-testid");
  handled.add("children");

  // Consume any remaining contract-declared styled props out of the param
  // before `...rest` so they don't leak into <Stack {...rest}>, which has
  // its own typed Props (e.g. `variant?: "vertical" | "horizontal"`)
  // that would conflict with component-specific shapes (Indicator's
  // `variant?: IndicatorVariant`, ListItem's `variant?: "single" | ...`,
  // etc.).
  for (const p of ir.styledProps) {
    if (handled.has(p.name)) continue;
    const aliased = p.name.includes("-")
      ? `"${p.name}": ${p.safeName}`
      : p.safeName;
    const def = p.defaultExpr;
    destructured.push(def ? `${aliased} = ${def}` : aliased);
    handled.add(p.name);
  }

  classExprs.push("className");
  // If the dom tree references named slots, destructure `slots` so the
  // template can read `{slots?.title}` etc.
  if (collectReactNamedSlots(ir).length > 0) {
    destructured.push("slots");
  }
  destructured.push("...rest");

  const asProp = root.element !== "div" ? `as="${root.element}"` : "";
  const roleProp = root.effectiveRole ? `role="${root.effectiveRole}"` : "";

  const jsxAttrs: string[] = [];
  if (asProp) jsxAttrs.push(`      ${asProp}`);
  if (roleProp) jsxAttrs.push(`      ${roleProp}`);
  jsxAttrs.push(`      className={classNames}`);
  jsxAttrs.push(`      data-testid={testId}`);
  jsxAttrs.push(`      data-fsds-component="${ir.cssPrefix}" data-fsds-box=""`);
  jsxAttrs.push(`      {...rest}`);

  const lines: string[] = [];
  lines.push(`export function ${name}({`);
  lines.push(`  ${destructured.join(",\n  ")}`);
  lines.push(`}: ${name}Props) {`);
  lines.push(`  const classNames = [`);
  for (const expr of classExprs) lines.push(`    ${expr},`);
  lines.push(`  ]`);
  lines.push(`    .filter(Boolean)`);
  lines.push(`    .join(" ");`);
  lines.push(``);
  lines.push(`  return (`);
  lines.push(`    <Stack`);
  lines.push(jsxAttrs.join("\n"));
  lines.push(`    >`);
  lines.push(`      {children}`);
  lines.push(`    </Stack>`);
  lines.push(`  );`);
  lines.push(`}`);
  return lines.join("\n");
}

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * FIX-PORTAL-CONSUMPTION-01. Wrap a rendered root JSX tree in the hook's
 * `renderInPortal(...)` helper when the component portals its root to the
 * document body; otherwise return the tree unchanged (byte-stable for every
 * non-portaling component). `renderInPortal` is a plain function returning a
 * ReactNode, so the JSX callsite reads `renderInPortal(<Tree />)`.
 */
function wrapReactPortal(treeJsx: string, wrap: boolean): string {
  if (!wrap) return treeJsx;
  // The tree body already carries its own leading indentation; nest it one
  // level deeper inside the `renderInPortal(` call and close on its own line.
  const nested = treeJsx
    .split("\n")
    .map((line) => (line.length > 0 ? `  ${line}` : line))
    .join("\n");
  return `    renderInPortal(\n${nested}\n    )`;
}

// ---------------------------------------------------------------------------
// DOM-tree-driven component (B.2c)
// ---------------------------------------------------------------------------

/** Returns true if any node in the dom tree has the given role attribute. */
/**
 * DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01. Walks the tree once
 * to find every node carrying `propertyBindings` (DOM-property-only facts,
 * e.g. `indeterminate`, that must be set via `el.<key> = value` — no JSX
 * attribute can express these). Each entry gets a stable ref name derived
 * from `part` (falling back to `tag` for an unpartnamed node — anatomy parts
 * are the author-facing identifier and are unique per contract; there is no
 * currently-known case of two property-binding nodes sharing a part name,
 * but the walk does not assume uniqueness beyond what `part`/`tag` already
 * provide).
 */
interface PropertyBindingNode {
  node: DomNodeIR;
  refName: string;
}

function collectPropertyBindingNodes(
  node: DomNodeIR | null | undefined,
): PropertyBindingNode[] {
  if (!node) return [];
  const own: PropertyBindingNode[] =
    Object.keys(node.propertyBindings).length > 0
      ? [{ node, refName: `${node.part ?? node.tag}Ref` }]
      : [];
  return own.concat(node.children.flatMap(collectPropertyBindingNodes));
}

/** True if the node, or any node in its subtree, is a native table-composition
 *  tag (table/thead/tbody/tfoot/tr/th/td/caption). A Table root is `<div>`
 *  wrapping a `<table>`, so the table-ness lives in the children, not the root
 *  tag — checking only the root tag would miss it. */
function domTreeHasTableComposition(node: DomNodeIR | null | undefined): boolean {
  if (!node) return false;
  if (TABLE_COMPOSITION_TAGS.has(node.tag)) return true;
  return node.children.some(domTreeHasTableComposition);
}

function reactDomRootUsesStack(ir: ComponentIR): boolean {
  // A DOM-tree root is polymorphically hosted by <Stack as="..."> EXCEPT when it
  // realizes a native HTML table: a <table> (or any table-composition tag) in
  // the tree must render as raw elements so the browser's table content model is
  // preserved — Stack cannot host `<tr>`/`<td>` semantics. The root tag is the
  // wrapper `<div>`, so the table can be a descendant, not the root itself.
  return Boolean(ir.dom && !domTreeHasTableComposition(ir.dom));
}

/**
 * FEAT-A11Y-LABEL-ID-ASSOCIATION-01 — React lowering of generated
 * relationship ids. Every id derives from the single `useId()` namespace so
 * refs and targets can never drift apart.
 */
function reactGeneratedIdExpr(slug: string): string {
  return `\`\${instanceId}-${slug}\``;
}

function reactIdRefCondExpr(cond: IdRefConditionIR): string {
  if (cond.op === "eq") {
    return `${cond.prop} ${cond.negated ? "!==" : "==="} ${JSON.stringify(cond.value)}`;
  }
  return cond.negated ? `!${cond.prop}` : cond.prop;
}

/** Combined guard for one ref: slot presence ANDed with the when clause. */
function reactIdRefGuardExpr(ref: IdRefIR): string | undefined {
  const conds: string[] = [];
  if (ref.slotGate) conds.push(`slots?.${ref.slotGate}`);
  if (ref.when) conds.push(reactIdRefCondExpr(ref.when));
  return conds.length > 0 ? conds.join(" && ") : undefined;
}

/**
 * Joined idref-list expression: each active ref's generated id plus the
 * optional passthrough prop, space-joined; `undefined` (attribute omitted)
 * when nothing applies. Collapses to simpler forms for the single-ref
 * cases.
 */
function reactIdRefListExpr(
  refs: IdRefIR[],
  passthroughProp: string | undefined,
): string {
  if (refs.length === 0 && !passthroughProp) return "undefined";
  if (refs.length === 1 && !passthroughProp) {
    const guard = reactIdRefGuardExpr(refs[0]);
    const id = reactGeneratedIdExpr(refs[0].slug);
    return guard ? `${guard} ? ${id} : undefined` : id;
  }
  const parts = refs.map((ref) => {
    const guard = reactIdRefGuardExpr(ref);
    const id = reactGeneratedIdExpr(ref.slug);
    return guard ? `${guard} ? ${id} : null` : id;
  });
  if (passthroughProp) parts.push(passthroughProp);
  return `[${parts.join(", ")}].filter(Boolean).join(" ") || undefined`;
}

/**
 * Wrap the rendered tree in the field-association provider when the IR
 * carries provider facts (composer side). The provider sits INSIDE any
 * portal wrapper — React context propagates through portals either way,
 * and keeping it adjacent to the tree keeps the portal lowering untouched.
 */
function wrapReactFieldAssociationProvider(
  treeJsx: string,
  ir: ComponentIR,
): string {
  if (!ir.fieldAssociation?.provides) return treeJsx;
  const indented = treeJsx
    .split("\n")
    .map((line) => (line.length > 0 ? `  ${line}` : line))
    .join("\n");
  return [
    `  <FieldAssociationContext.Provider value={fieldAssociationValue}>`,
    indented,
    `  </FieldAssociationContext.Provider>`,
  ].join("\n");
}

/**
 * Generate a React component that renders the contract's `dom` tree. Native
 * HTML elements with attribute and event bindings; consumer-provided children
 * land at the `tag: "slot"` / `tag: "children"` region. Unlike the
 * legacy path, this does not wrap in `<Stack>` — `dom.tag` is the rendered
 * root, matching the contract's intent.
 *
 * Relies on the generated `useX` hook for channel state (the channel hook
 * composes `useControllableState` and any other primitives).
 */
function generateDomTreeRootComponent(ir: ComponentIR): string {
  if (!ir.dom) throw new Error("generateDomTreeRootComponent requires ir.dom");

  const { name, classRecipe } = ir;
  const propByName = new Map(ir.styledProps.map((p) => [p.name, p]));
  const channels = ir.behavior.normalizedChannels;
  const channelByName = new Map(channels.map((c) => [c.name, c]));
  const channelValueProps = new Set(channels.map((c) => c.valueProp));

  const controlledAliasFor = (propName: string): string =>
    `controlled${capitalize(propName)}`;

  // Process channels FIRST so the controlled-value props get renamed to
  // `controlled<Name>`. This avoids collision with the same-named binding
  // returned by the hook (`useSwitch` returns `{ checked, setChecked }`).
  const destructured: string[] = [];
  const handled = new Set<string>();
  const classExprs: string[] = [`"${classRecipe.base}"`];

  for (const ch of channels) {
    const alias = controlledAliasFor(ch.valueProp);
    destructured.push(`${ch.valueProp}: ${alias}`);
    handled.add(ch.valueProp);
    if (ch.defaultValueProp) {
      // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: include the channel's
      // declared `default` (if any) in the destructure so contracts can
      // seed the demo with a non-empty starting value. Necessary for
      // Shuttle to render its initial selection without a controlled
      // `value` prop in the preview pipeline.
      const dvProp = propByName.get(ch.defaultValueProp);
      const def = dvProp?.defaultExpr;
      destructured.push(def ? `${ch.defaultValueProp} = ${def}` : ch.defaultValueProp);
      handled.add(ch.defaultValueProp);
    }
    destructured.push(ch.changeHandlerProp);
    handled.add(ch.changeHandlerProp);
  }

  for (const mod of classRecipe.valueModifiers) {
    if (handled.has(mod.propName)) continue;
    const resolved = propByName.get(mod.propName);
    const aliased = mod.propName.includes("-")
      ? `"${mod.propName}": ${mod.safeName}`
      : mod.propName;
    const def = resolved?.defaultExpr ?? mod.defaultExpr;
    destructured.push(def ? `${aliased} = ${def}` : aliased);
    classExprs.push(
      `${mod.safeName} && \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${mod.safeName}}\``,
    );
    handled.add(mod.propName);
  }

  const channelNamesEarly = new Set(channels.map((c) => c.name));
  const channelByValueProp = new Map(channels.map((c) => [c.valueProp, c]));
  for (const mod of classRecipe.booleanModifiers) {
    // When the boolean-modifier name matches a channel value-prop, the class
    // is driven by the HOOK-RESOLVED value (which reflects controlled +
    // uncontrolled state) rather than the prop directly. The prop itself is
    // typically destructured as `controlled<Name>`, so we must reference the
    // channel NAME (which the hook returns and the component destructures).
    if (channelValueProps.has(mod.propName)) {
      const channelName = channelByValueProp.get(mod.propName)?.name;
      const ref = channelName ?? mod.propName;
      classExprs.push(`${ref} && "${classRecipe.base}--${mod.safeName}"`);
      continue;
    }
    // When the modifier name matches a channel NAME (e.g. Modal's `open`
    // is a channel name with valueProp `isOpen`), reference the hook return.
    if (channelNamesEarly.has(mod.propName)) {
      classExprs.push(
        `${mod.propName} && "${classRecipe.base}--${mod.safeName}"`,
      );
      continue;
    }
    if (handled.has(mod.propName)) continue;
    destructured.push(mod.propName);
    classExprs.push(
      `${mod.safeName} && "${classRecipe.base}--${mod.safeName}"`,
    );
    handled.add(mod.propName);
  }

  if (!handled.has("className")) {
    destructured.push("className");
    handled.add("className");
  }
  destructured.push('"data-testid": testId');
  handled.add("data-testid");
  if (!handled.has("children") && hasChildrenPlaceholder(ir)) {
    destructured.push("children");
    handled.add("children");
  }

  // Pass through any remaining contract-declared props before ...rest so they
  // don't unexpectedly leak into the root element via spread.
  const channelNames = new Set(channels.map((c) => c.name));
  for (const p of ir.styledProps) {
    if (handled.has(p.name)) continue;
    // Don't destructure props whose name collides with a channel name —
    // the hook return will shadow them. Modal has both `open` (v2 prop)
    // and a channel named `open` whose valueProp is `isOpen`.
    if (channelNames.has(p.name)) continue;
    const aliased = p.name.includes("-")
      ? `"${p.name}": ${p.safeName}`
      : p.safeName;
    const def = p.defaultExpr;
    destructured.push(def ? `${aliased} = ${def}` : aliased);
    handled.add(p.name);
  }

  classExprs.push("className");
  // If the dom tree references named slots, destructure `slots` so the
  // template can read `{slots?.title}` etc.
  if (collectReactNamedSlots(ir).length > 0) {
    destructured.push("slots");
  }
  destructured.push("...rest");

  // Build the hook call. The hook returns `{ <name>: <value>, set<Name>: ... }`
  // for each channel (per the per-framework hook-source.ts).
  const hookResultParts: string[] = [];
  if (ir.interaction?.focusContainer) hookResultParts.push("panelRef");
  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: an `open` realization marks a panel
  // node (`keyboardPanel`) for the panelRef binding, so the hook's panel
  // ref must reach component scope. attachKeyboardActions guarantees the
  // mark exists whenever an open action does.
  if (ir.keyboardActions.some((action) => action.op === "open")) {
    hookResultParts.push("panelRef", "anchorRef");
  }
  for (const ch of channels) {
    hookResultParts.push(ch.name);
    hookResultParts.push(`set${capitalize(ch.name)}`);
  }
  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: the hook emits one keydown handler per
  // hosting part; the template binds them on the declared nodes.
  for (const part of keyboardHandlerParts(ir)) {
    hookResultParts.push(`handle${capitalize(part)}Keydown`);
  }

  // FIX-PORTAL-CONSUMPTION-01: full-overlay surfaces (Dialog centered,
  // Sheet/Toast viewport-edge) consume the hook's `renderInPortal` helper so
  // the fixed root layer mounts at the document body, escaping ancestor
  // stacking contexts. Purely IR-driven via `portalsRootToBody` — no
  // component-name lore. Anchored/inline surfaces (Select, Walkthrough) and
  // portal-less contracts return false and render inline unchanged.
  // Selector-anchored root portal (coachmark / guided tour): the whole
  // panel mounts at body and is positioned against a page element resolved
  // from the active step's selector — same renderInPortal consumption, plus
  // useAnchoredPosition wiring emitted below.
  const selectorAnchor = selectorAnchoredRootPortal(ir);
  const wrapRootInPortal = portalsRootToBody(ir) || selectorAnchor !== null;
  if (wrapRootInPortal) {
    hookResultParts.push("renderInPortal");
  }

  const hookOptionsLines: string[] = [];
  for (const ch of channels) {
    const controlledAlias = controlledAliasFor(ch.valueProp);
    hookOptionsLines.push(`    ${ch.valueProp}: ${controlledAlias}`);
    if (ch.defaultValueProp) {
      hookOptionsLines.push(`    ${ch.defaultValueProp}`);
    }
    hookOptionsLines.push(`    ${ch.changeHandlerProp}`);
  }
  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: forward the keyboard select mode gates
  // so the hook's keydown handler evaluates the same gate as the item click.
  for (const gateProp of keyboardModeGateProps(ir)) {
    const safe = ir.styledProps.find((p) => p.name === gateProp)?.safeName ?? gateProp;
    hookOptionsLines.push(
      gateProp === safe ? `    ${safe}` : `    ${gateProp}: ${safe}`,
    );
  }
  // The modality gate decides whether the hook's focus trap and scroll lock
  // engage (surface.modalityProp).
  for (const { prop } of focusTargetProps(ir)) {
    hookOptionsLines.push(`    ${prop}`);
  }
  const modalityGate = ir.surface?.modalityGate;
  if (modalityGate) {
    const safe =
      ir.styledProps.find((p) => p.name === modalityGate.prop)?.safeName ??
      modalityGate.prop;
    hookOptionsLines.push(
      modalityGate.prop === safe
        ? `    ${safe}`
        : `    ${modalityGate.prop}: ${safe}`,
    );
  }
  // Forward dismissal-trigger enabledBy props (closeOnEscape, etc.) to the
  // generated hook so its useDismissal call sees the user's settings.
  for (const trigger of ir.behavior.normalizedDismissalTriggers) {
    if (!trigger.enabledByProp) continue;
    if (!handled.has(trigger.enabledByProp)) {
      // Destructure the prop too if not already done.
      const aliased = trigger.enabledByProp;
      destructured.push(aliased);
      handled.add(aliased);
    }
    hookOptionsLines.push(`    ${trigger.enabledByProp}`);
  }

  // ICON-CATALOG-RUNTIME-DELIVERY-01: glyph nodes get module-scope size-hint
  // maps plus body consts resolving the catalog lookup. Collected before the
  // function opens so the hints const can live at module scope.
  const iconGlyphNodes = collectIconGlyphNodes(ir.dom);

  const lines: string[] = [];
  for (const { glyph, suffix } of iconGlyphNodes) {
    if (glyph.sizeHints) {
      lines.push(
        `const ICON_GLYPH_SIZE_HINTS${suffix}: Record<string, number> = ` +
          `${iconGlyphSizeHintsLiteral(glyph.sizeHints)};`,
      );
      lines.push(``);
    }
  }
  lines.push(`export function ${name}({`);
  lines.push(`  ${destructured.join(",\n  ")}`);
  lines.push(`}: ${name}Props) {`);
  if (channels.length > 0) {
    lines.push(`  const { ${hookResultParts.join(", ")} } = use${name}({`);
    lines.push(hookOptionsLines.join(",\n") + ",");
    lines.push(`  });`);
    lines.push(``);
  }
  // Selector-anchored root panel: resolve the active element from the
  // indexed selector prop, then position the (portaled) root against it.
  // The anchor element lives outside the component's tree, so it is
  // re-queried whenever the index channel or the selector array changes.
  if (selectorAnchor) {
    const idxChannel = channels.find(
      (c) => c.name === selectorAnchor.indexChannel,
    );
    if (!idxChannel) {
      throw new Error(
        `${name}: surface.anchor.selector.indexChannel "${selectorAnchor.indexChannel}" has no matching channel in the IR.`,
      );
    }
    const propIdent =
      ir.styledProps.find((p) => p.name === selectorAnchor.prop)?.safeName ??
      selectorAnchor.prop;
    const placementProp = ir.surface?.positioning?.placementProp;
    const collision = ir.surface?.positioning?.collision ?? "flip-shift";
    lines.push(
      `  const [anchoredRootEl, setAnchoredRootEl] = useState<HTMLElement | null>(null);`,
      `  const [anchorTargetEl, setAnchorTargetEl] = useState<HTMLElement | null>(null);`,
      `  useEffect(() => {`,
      `    const selector = (${propIdent} ?? [])[${idxChannel.name}]?.${selectorAnchor.path};`,
      `    setAnchorTargetEl(selector ? document.querySelector<HTMLElement>(selector) : null);`,
      `  }, [${idxChannel.name}, ${propIdent}]);`,
      `  const anchoredPosition = useAnchoredPosition({`,
      `    anchor: anchorTargetEl,`,
      `    content: anchoredRootEl,`,
      `    open: true,`,
      `    placement: ${placementProp ?? `"auto"`},`,
      `    collision: "${collision}",`,
      `  });`,
      ``,
    );
  }
  if (ir.pagedSet) {
    const page = ir.pagedSet;
    lines.push(`  const pagedSet = usePagedSet({ index: ${page.channel}, items: ${page.itemsProp},`,
      `    count: ${page.countProp ?? "undefined"}, disabled: ${page.disabledProp ?? "false"}, onIndexChange: set${capitalize(page.channel)} });`);
  }
  // Ephemeral-surface auto-dismiss: the presence budget flows from the
  // *.timing.auto-dismiss token (generation-resolved default) with the
  // contract's duration prop as the consumer override; pause props land on
  // the root element (WCAG 2.2.1 Timing Adjustable).
  if (ir.motion.sequence) {
    const seq = ir.motion.sequence;
    lines.push(`  const sequence = useSequence(${sequenceConfig(seq, ir.cssPrefix)}, {`,
      `    index: ${seq.channel}, labels: ${seq.itemsProp}, autoPlay: ${seq.timing.autoPlayProp},`,
      `    presentation: ${sequencePresentation(seq, prop => prop)},`,
      `    durationMs: ${seq.timing.durationProp} === undefined ? ${seq.timing.defaultMs} : ${seq.timing.durationProp},`,
      `    onIndexChange: set${capitalize(seq.channel)},`, `  });`);
  }
  const autoDismissPolicy = resolveSurfaceAutoDismiss(ir);
  const autoDismissChannel = autoDismissPolicy
    ? channels.find((c) => c.valueType === "boolean")
    : undefined;
  if (autoDismissPolicy && autoDismissChannel) {
    lines.push(
      `  const autoDismiss = useAutoDismiss({`,
      `    open: Boolean(${autoDismissChannel.name}),`,
      `    durationMs: ${autoDismissPolicy.durationProp} === undefined ? ${autoDismissPolicy.defaultMs ?? "undefined"} : ${autoDismissPolicy.durationProp},`,
      ...(ir.motion.countdown ? [`    reducedMotionSteps: ${ir.motion.countdown.reducedMotion.steps},`] : []),
      `    onDismiss: () => set${capitalize(autoDismissChannel.name)}(false),`,
      `  });`,
      `  const autoDismissPauseProps = autoDismiss.getPauseProps();`,
      ``,
    );
  }
  lines.push(`  const classNames = [`);
  for (const expr of classExprs) lines.push(`    ${expr},`);
  lines.push(`  ]`);
  lines.push(`    .filter(Boolean)`);
  lines.push(`    .join(" ");`);
  lines.push(``);

  // Overlay-click dismissal: find the trigger and the boolean channel's setter.
  const overlayClickTrigger = ir.behavior.normalizedDismissalTriggers.find(
    (t) => t.event === "overlayClick",
  );
  const booleanChannel = channels.find((c) => c.valueType === "boolean");
  const overlayClickSetter = overlayClickTrigger && booleanChannel
    ? `set${capitalize(booleanChannel.name)}`
    : undefined;

  // Polymorphic-root prop: when the contract declares a styled prop whose
  // union type is HTML tag names, emit a `const As = as ?? "<default>"` line
  // and pass the alias through the render context so the root tag becomes
  // `<As ...>` instead of the literal `<ul>`.
  const polyTag = ir.root.polymorphicTagProp;
  let rootTagOverride: string | undefined;
  if (polyTag) {
    // Capitalized JSX identifier (React treats lowercase identifiers as
    // intrinsic tags). For an `as` prop, this becomes `As`.
    rootTagOverride = capitalize(polyTag.propName);
    lines.push(
      `  const ${rootTagOverride} = ${polyTag.propName} ?? "${polyTag.defaultTag}";`,
    );
    lines.push(``);
  }

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: per-instance id namespace for
  // generated relationship ids, the field-association consumer hook, and
  // the provider value (composer side). Emitted only when the IR carries
  // the facts — components without lowered relationships get zero new
  // output.
  if (componentNeedsInstanceId(ir)) {
    lines.push(`  const instanceId = useId();`);
    lines.push(``);
  }
  if (ir.fieldAssociation?.consumerPart) {
    lines.push(`  const fieldAssociation = useFieldAssociation();`);
    lines.push(``);
  }
  if (ir.fieldAssociation?.provides) {
    const provides = ir.fieldAssociation.provides;
    // Memoized so the context value is referentially stable across
    // unrelated provider re-renders — the deps are exactly the inputs the
    // value expressions read (instance namespace, gating slots, when props).
    const deps = ["instanceId"];
    for (const ref of provides.describedBy) {
      if (ref.slotGate) deps.push(`slots?.${ref.slotGate}`);
      if (ref.when) deps.push(ref.when.prop);
    }
    lines.push(`  const fieldAssociationValue = useMemo(`);
    lines.push(`    () => ({`);
    lines.push(
      `      controlId: ${reactGeneratedIdExpr(provides.controlSlug)},`,
    );
    lines.push(
      `      describedBy: ${reactIdRefListExpr(provides.describedBy, undefined)},`,
    );
    lines.push(`    }),`);
    lines.push(`    [${[...new Set(deps)].join(", ")}],`);
    lines.push(`  );`);
    lines.push(``);
  }

  // DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01: for each node
  // carrying propertyBindings, declare a ref + a useEffect that applies the
  // DOM-property-only fact imperatively (`el.<key> = value`) on mount and
  // whenever the source value changes. No JSX attribute can express these
  // (indeterminate has no HTML attribute form at all), so this is emitted
  // ONLY when the tree actually has a property-binding node — components
  // without one get zero new output, preserving byte-stability elsewhere.
  const propertyBindingNodes = collectPropertyBindingNodes(ir.dom);
  const propertyBindingRefs = new Map(
    propertyBindingNodes.map(({ node, refName }) => [node, refName]),
  );
  for (const { node, refName } of propertyBindingNodes) {
    // Element-specific type (HTMLInputElement for <input>, ...) so
    // `refName.current.indeterminate` typechecks below — a bare
    // `HTMLElement` has no `.indeterminate`. Falls back to the generic
    // interface for a tag not in the map, matching HOST_TAG_TO_REACT_ATTRS'
    // own documented fallback.
    const elementType = HOST_TAG_TO_REACT_ATTRS[node.tag]?.[1] ?? "HTMLElement";
    lines.push(`  const ${refName} = useRef<${elementType}>(null);`);
  }

  // Body consts for each glyph node: the requested-pixel value (when the
  // glyph has a size binding) and the resolved catalog record. A miss
  // (unknown icon name) leaves the const undefined and the render branch
  // emits nothing. `Number.NaN` deliberately matches no authored size, so
  // resolveIcon falls back to the smallest authored variant.
  const iconGlyphIdents = new Map<
    DomNodeIR,
    { glyphIdent: string; pxIdent: string | undefined }
  >();
  for (const { node, glyph, suffix } of iconGlyphNodes) {
    const glyphIdent = `iconGlyph${suffix}`;
    const hintsIdent = glyph.sizeHints
      ? `ICON_GLYPH_SIZE_HINTS${suffix}`
      : undefined;
    const pxExpr = iconGlyphPxExpr(glyph, glyph.sizePropName, hintsIdent);
    const pxIdent = pxExpr === undefined ? undefined : `iconGlyphPx${suffix}`;
    if (pxIdent) {
      lines.push(`  const ${pxIdent} = ${pxExpr};`);
    }
    const nameOptional =
      ir.styledProps.find((p) => p.name === glyph.namePropName)?.required ===
      false;
    lines.push(
      `  const ${glyphIdent} = resolveIcon(${iconGlyphNameArg(glyph.namePropName, nameOptional)}, ` +
        `${pxIdent ? `${pxIdent} ?? Number.NaN` : "Number.NaN"});`,
    );
    iconGlyphIdents.set(node, { glyphIdent, pxIdent });
  }
  if (iconGlyphNodes.length > 0) {
    lines.push(``);
  }

  const renderCtx: ReactRenderContext = {
    classRecipe: classRecipe.base,
    componentName: ir.name,
    channelByName,
    isRoot: true,
    cssPrefix: ir.cssPrefix,
    useStackRoot: reactDomRootUsesStack(ir),
    countdownPart: ir.motion.countdown?.target.name,
    sequence: Boolean(ir.motion.sequence),
    autoDismissPause: Boolean(autoDismissPolicy && autoDismissChannel),
    overlayClickSetter,
    overlayClickEnabledProp: overlayClickTrigger?.enabledByProp,
    overlayClickTargetPart: overlayClickTrigger?.targetPart,
    rootRole: ir.root.rootRole,
    rootTagOverride,
    propertyBindingRefs,
    iconGlyphIdents,
    fieldAssociationConsumerPart: ir.fieldAssociation?.consumerPart,
    formControlPart: ir.formControl?.part.name,
    formControlEvent: ir.formControl?.event,
    formControlCommit: ir.formControl?.commit,
    rootSelectorAnchored: selectorAnchor !== null,
    keyboardActionsByPart: groupKeyboardActionsByPart(ir.keyboardActions),
    compositeItemPart: ir.behavior.focus?.strategy === "roving" ? ir.compositeControl?.part.name : undefined,
    compositeMemberExpr: compositeActivationMember(ir.compositeControl),
  };
  for (const { node, refName } of propertyBindingNodes) {
    const assignments = Object.entries(node.propertyBindings)
      .map(([key, expr]) => {
        const valueExpr = renderReactBinding(key, expr, renderCtx);
        if (valueExpr === null) return null;
        // DOM_PROPERTY_ONLY_KEYS_COERCION: the source prop is typically
        // optional (`boolean | undefined`) while the target DOM property is
        // a plain `boolean` (HTMLInputElement.indeterminate has no
        // undefined state) — coerce so the assignment typechecks. Keyed by
        // property name since a future DOM-property-only key might target
        // a non-boolean DOM property with different coercion needs; this is
        // NOT a Checkbox-name branch (`indeterminate` is the fact name, not
        // a component check).
        const coerced = key === "indeterminate" ? `Boolean(${valueExpr})` : valueExpr;
        return `      ${refName}.current.${key} = ${coerced};`;
      })
      .filter((line): line is string => line !== null);
    if (assignments.length === 0) continue;
    lines.push(`  useEffect(() => {`);
    lines.push(`    if (${refName}.current) {`);
    lines.push(...assignments);
    lines.push(`    }`);
    const deps = Object.values(node.propertyBindings)
      .map((expr) => renderReactBinding("propertyBindingDep", expr, renderCtx))
      .filter((dep): dep is string => dep !== null);
    lines.push(`  }, [${deps.join(", ")}]);`);
  }
  if (propertyBindingNodes.length > 0) lines.push(``);

  // When the root has an if-guard, render the conditional at the return
  // level (cleaner than wrapping in `()` braces inside `return (...)`).
  if (ir.dom.ifProp) {
    let guard: string;
    if (ir.dom.ifProp === "children") {
      guard = "children";
    } else {
      const matchingChannel = [...channelByName.values()].find(
        (c) => c.valueProp === ir.dom!.ifProp || c.name === ir.dom!.ifProp,
      );
      guard = matchingChannel ? matchingChannel.name : ir.dom.ifProp;
    }
    // Render the body without the if-guard (we handle it at this level).
    const unguarded: DomNodeIR = { ...ir.dom, ifProp: undefined, ifNegated: false };
    const treeJsx = wrapReactFieldAssociationProvider(
      renderReactDomNode(unguarded, renderCtx, 4),
      ir,
    );
    // ifNegated flips the early-return: with !src, render when src is falsy.
    const returnNullWhen = ir.dom.ifNegated ? guard : `!${guard}`;
    lines.push(`  if (${returnNullWhen}) return null;`);
    lines.push(`  return (`);
    lines.push(wrapReactPortal(treeJsx, wrapRootInPortal));
    lines.push(`  );`);
  } else {
    const treeJsx = wrapReactFieldAssociationProvider(
      renderReactDomNode(ir.dom, renderCtx, 2),
      ir,
    );
    lines.push(`  return (`);
    lines.push(wrapReactPortal(treeJsx, wrapRootInPortal));
    lines.push(`  );`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

interface ReactRenderContext {
  classRecipe: string;
  componentName?: string;
  channelByName: Map<string, NormalizedChannelIR>;
  isRoot: boolean;
  /**
   * Component cssPrefix (e.g. "button"), carried so the root element can emit
   * `data-fsds-component="<cssPrefix>"` for audit/devtools discoverability.
   * Set once at the root call; unused on child nodes.
   */
  cssPrefix?: string;
  /** Render the root DOM node through <Stack as="..."> without imposing layout. */
  useStackRoot?: boolean;
  /** When true, spread the auto-dismiss pause props onto the root element. */
  sequence?: boolean;
  autoDismissPause?: boolean;
  countdownPart?: string;
  /** When set, emit onClick to dismiss the overlay on the targetPart click. */
  overlayClickSetter?: string;
  /** Prop name that controls whether overlay click dismissal is enabled. */
  overlayClickEnabledProp?: string;
  /**
   * Anatomy part carrying the overlay-click dismissal handler. The root is
   * pointer-events:none under a full-cover overlay and can never be the hit
   * target, so the handler binds on the declared part instead
   * (FIX-OVERLAY-CLICK-DISMISSAL-BINDING-01).
   */
  overlayClickTargetPart?: string;
  /**
   * Effective ARIA role to emit on the root node, when the contract's
   * `a11y.role` differs from the element's implicit role and the dom tree
   * doesn't already declare `attrs.role`. Mirrors the legacy non-dom path
   * which always emits `role={effectiveRole}` on the root.
   */
  rootRole?: string;
  /**
   * When set on the root-level call, the outermost element's tag is rendered
   * as this JSX identifier (e.g. `As`) instead of the literal node.tag. Used
   * to realize a contract-declared polymorphic-as prop. Inner recursive calls
   * MUST clear this — only the root node should use it.
   */
  rootTagOverride?: string;
  /**
   * Ref variable names for nodes carrying `propertyBindings`
   * (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01), keyed by node
   * identity. `renderReactDomNode` looks up the current node here to decide
   * whether to attach `ref={...}`. Populated once at the root call from
   * `collectPropertyBindingNodes`; empty when the tree has no
   * property-binding nodes.
   */
  propertyBindingRefs?: Map<DomNodeIR, string>;
  /**
   * Local identifiers for nodes carrying `iconGlyph`
   * (ICON-CATALOG-RUNTIME-DELIVERY-01), keyed by node identity.
   * `glyphIdent` names the body const holding the `resolveIcon(...)`
   * result; `pxIdent` names the requested-pixel const (undefined when the
   * glyph has no size binding). Populated once at the root call from
   * `collectIconGlyphNodes`; empty when the tree has no glyph nodes.
   */
  iconGlyphIdents?: Map<DomNodeIR, { glyphIdent: string; pxIdent: string | undefined }>;
  /**
   * Anatomy part that consumes ambient field association. Targeting the
   * declared control part keeps compound controls from binding idrefs to a
   * non-labelable wrapper root.
   */
  fieldAssociationConsumerPart?: string;
  /**
   * Form-control event identity. React's idiomatic text-entry notification is
   * `onChange` even when the contract's semantic commit is per-input; keeping
   * the originating part/event in context lets this target spell that one
   * semantic fact idiomatically without rewriting unrelated authored input
   * events.
   */
  formControlPart?: string;
  formControlEvent?: "input" | "change" | "click";
  formControlCommit?: "input" | "change" | "activation";
  /**
   * Selector-anchored root panel: the root element gets the anchored
   * position wiring (ref, fixed-position style, data-placement) emitted by
   * the body's useAnchoredPosition block. Root-level only.
   */
  rootSelectorAnchored?: boolean;
  /**
   * Nearest enclosing iteration directive, or `undefined` at the top
   * level. After BINDING-EXPRESSION-V2-01 the IR carries
   * `iterationLocal`-kind bindings directly, and the emitter resolves
   * each `{ kind: "iterationLocal", local: "index"|"item" }` to the
   * iteration's declared `indexVar` / `itemVar`. The previous
   * `iterationScope: Set<string>` (a flat set of identifier names) was
   * never read by the React emitter — React destructures all props at
   * the top of the function body and the iteration callback parameter
   * naturally shadows the destructured prop. The field still exists so
   * the V2 lowering can look up declared variable names without
   * branching on identifier coincidence.
   */
  enclosingIteration?: IterationIR;
  /**
   * Keyboard realizations keyed by hosting part
   * (FEAT-A11Y-COMPOSITE-KEYBOARD-01). Nodes whose `part` owns actions bind
   * `onKeyDown` to the part-derived handler ident the co-located hook emits;
   * the composite item part additionally receives `tabIndex={-1}` (roving
   * focus target, out of tab order).
   */
  keyboardActionsByPart?: Map<string, KeyboardActionIR[]>;
  /** Composite item part name; its nodes are roving focus targets. */
  compositeItemPart?: string;
  /**
   * Value expression of the composite item's activation member (the operand
   * the item's click binding uses, e.g. Select's `iter:item.value`), rendered
   * through the same binding lowering so the keydown handler receives the
   * identical value the click handler would.
   */
  compositeMemberExpr?: BindingExpression;
}

/**
 * Recursive React JSX emitter for `DomNodeIR`. Indentation is parameter-passed
 * so output stays formatted; final line counts include each sub-tree's own
 * indentation.
 */
/**
 * FEAT-MARKDOWN-CONTENT-TRANSFORM-01 — React lowering of the markdown
 * transform: module-scope recursive render helpers. One transform per
 * tree (validated upstream); every element tag, part class, and data
 * attribute comes from the IR fact — never a component name.
 */
function generateReactMarkdownHelpers(ir: ComponentIR): string {
  const transform = collectContentTransforms(ir.dom).find(isMarkdownTransform);
  if (!transform) return "";
  const prefix = ir.classRecipe.base;
  const b = transform.blockParts;
  const bt = transform.blockTags;
  const m = transform.markParts;
  const mt = transform.markTags;
  const blockClass = (kind: string): string => `${prefix}__${kind}`;
  return `
function renderMarkdownBlocks(source: string): React.ReactNode[] {
  return parseMarkdown(source ?? "").map((block, blockIndex) =>
    renderMarkdownBlock(block, blockIndex),
  );
}

function renderMarkdownBlock(block: MarkdownBlock, key: React.Key): React.ReactNode {
  switch (block.kind) {
    case "heading":
      return (
        <${bt.heading} key={key} className="${blockClass(b.heading)}" data-block-kind="heading" data-level={block.level}>
          {block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}
        </${bt.heading}>
      );
    case "paragraph":
      return (
        <${bt.paragraph} key={key} className="${blockClass(b.paragraph)}" data-block-kind="paragraph">
          {block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}
        </${bt.paragraph}>
      );
    case "list":
      return block.ordered ? (
        <${bt.orderedList} key={key} className="${blockClass(b.orderedList)}" data-block-kind="orderedList">
          {block.items.map((item, itemIndex) => renderMarkdownBlock(item, itemIndex))}
        </${bt.orderedList}>
      ) : (
        <${bt.unorderedList} key={key} className="${blockClass(b.unorderedList)}" data-block-kind="unorderedList">
          {block.items.map((item, itemIndex) => renderMarkdownBlock(item, itemIndex))}
        </${bt.unorderedList}>
      );
    case "listItem":
      return (
        <${bt.listItem} key={key} className="${blockClass(b.listItem)}" data-block-kind="listItem">
          {block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}
        </${bt.listItem}>
      );
    case "codeBlock":
      return (
        <${bt.codeBlock} key={key} className="${blockClass(b.codeBlock)}" data-block-kind="codeBlock" data-language={block.language}>
          {block.text}
        </${bt.codeBlock}>
      );
    case "blockquote":
      return (
        <${bt.blockquote} key={key} className="${blockClass(b.blockquote)}" data-block-kind="blockquote">
          {block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}
        </${bt.blockquote}>
      );
  }
}

function renderMarkdownMark(mark: MarkdownMark, key: React.Key): React.ReactNode {
  switch (mark.kind) {
    case "text":
      return <Fragment key={key}>{mark.text}</Fragment>;
    case "code":
      return (
        <${mt.code} key={key} className="${prefix}__${m.code}" data-mark-kind="code">{mark.text}</${mt.code}>
      );
    case "emphasis":
      return (
        <${mt.emphasis} key={key} className="${prefix}__${m.emphasis}" data-mark-kind="emphasis">
          {mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}
        </${mt.emphasis}>
      );
    case "strong":
      return (
        <${mt.strong} key={key} className="${prefix}__${m.strong}" data-mark-kind="strong">
          {mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}
        </${mt.strong}>
      );
    case "link":
      return mark.href === null ? (
        <Fragment key={key}>
          {mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}
        </Fragment>
      ) : (
        <${mt.link} key={key} className="${prefix}__${m.link}" data-mark-kind="link" href={mark.href}>
          {mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}
        </${mt.link}>
      );
  }
}
`;
}

function renderReactDomNode(
  node: DomNodeIR,
  ctx: ReactRenderContext,
  indent: number,
): string {
  const pad = " ".repeat(indent);

  // Slot / children placement
  if (node.tag === "slot" || node.tag === "children") {
    if (node.slotName) {
      // Named slots are exposed via the `slots` prop on the React API:
      //   <MyComponent slots={{ title: <h2>Hello</h2> }} />
      return `${pad}{slots?.${node.slotName}}`;
    }
    return `${pad}{children}`;
  }

  // IR-DOM-ITERATE-CAPABILITY-01 / BINDING-EXPRESSION-V2-01: when this
  // node declares `iterate`, set the enclosing-iteration context so that
  // any `iterationLocal`-kind bindings on this node and its descendants
  // can resolve to the correct lexical variable name. React's emit shape
  // wraps the iterated subtree in `Array.from(...).map((item, index) =>
  // (...))` — so the callback parameter names match the iteration's
  // declared `indexVar` / `itemVar`.
  if (node.iteration) {
    ctx = { ...ctx, enclosingIteration: node.iteration };
  }

  // Build attribute list. Order: static attrs, then bound attrs, then class, then root-only data-testid + ...rest.
  const attrs: string[] = [];
  const classParts: string[] = [];

  if (ctx.countdownPart && node.part === ctx.countdownPart) attrs.push(`hidden`);
  if (ctx.countdownPart && node.part === ctx.countdownPart) attrs.push(`ref={autoDismiss.bindProgress}`);
  if (node.part) classParts.push(`"${ctx.classRecipe}__${node.part}"`);

  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === "class" || key === "className") {
      classParts.push(`"${value}"`);
      continue;
    }
    const jsxKey = jsxAttrName(key);
    // Numeric JSX attributes need expression syntax (`tabIndex={-1}`),
    // not string syntax (`tabIndex="-1"`).
    if (NUMERIC_JSX_ATTRS.has(jsxKey) && /^-?\d+$/.test(value)) {
      attrs.push(`${jsxKey}={${value}}`);
    } else {
      attrs.push(`${jsxKey}="${escapeJsxString(value)}"`);
    }
  }

  // Text-content bindings render as a child node, not a JSX attribute —
  // React does not have a `textContent` prop. We collect them here and
  // splice them into the child render below.
  const textChildren: string[] = [];

  // IR-DOM-BINDING-CAPABILITY-01: the new `content` field is the canonical
  // location for an inner-content binding. Lower it to a JSX child
  // expression. We thread it through `renderReactBinding` with the
  // synthetic attr name "textContent" so channel/literal handling
  // mirrors the legacy textContent path; the result is unwrapped as a
  // child instead of an attribute. The legacy `bindings.textContent` /
  // `bindings.children` paths below still feed this collection for
  // backward compatibility until parseDomNode drops the dual-pathway
  // retention.
  if (node.content) {
    if (isHighlightTransform(node.content)) {
      // FEAT-CODEBLOCK-HIGHLIGHT-01: the content is produced by the shared
      // pure tokenizer — one span per token carrying the tokenPart class and
      // a data-token kind attribute, text children only. The gate prop (when
      // declared) falls back to a single plain run of the source binding.
      const transform = node.content;
      const sourceExpr =
        renderReactBinding("textContent", transform.source, ctx) ??
        transform.sourceProp;
      const languageExpr =
        renderReactBinding("textContent", transform.language, ctx) ??
        transform.languageProp;
      const gateExpr = transform.gate !== undefined
        ? (renderReactBinding("textContent", transform.gate, ctx) ?? transform.gateProp)
        : "true";
      const tokensExpr = transform.tokensProp ?? "undefined";
      const prepared = `prepareHighlightSource(${sourceExpr}, ${languageExpr}, { tokens: ${tokensExpr}, highlight: ${gateExpr} })`;
      if (transform.linePart && transform.gutterPart) {
        const lineName = `${ctx.componentName}Line`;
        const tokenName = `${ctx.componentName}Token`;
        textChildren.push(
          `{${prepared}.lines.map((line) => (` +
          `<${lineName} key={line.number} number={line.number} ending={line.ending}>` +
          `{line.tokens.map((token, tokenIndex) => line.highlighted ? (` +
          `<${tokenName} key={tokenIndex} kind={token.kind}>{token.text}</${tokenName}>` +
          `) : token.text)}</${lineName}>))}`,
        );
      } else {
        textChildren.push(`{${prepared}.lines.flatMap((line) => [...line.tokens.map((token) => token.text), line.ending])}`);
      }
    } else if (isMarkdownTransform(node.content)) {
      // FEAT-MARKDOWN-CONTENT-TRANSFORM-01: the content is the structural
      // parse of the markdown source — block elements and inline marks
      // lowered by the module-scope render helpers below. A declared gate
      // falls back to a single plain run of the source binding.
      const transform = node.content;
      const sourceExpr =
        renderReactBinding("textContent", transform.source, ctx) ??
        transform.sourceProp;
      const tree = `renderMarkdownBlocks(${sourceExpr})`;
      if (transform.gate !== undefined) {
        const gateExpr =
          renderReactBinding("textContent", transform.gate, ctx) ??
          transform.gateProp;
        textChildren.push(`{${gateExpr} ? (${tree}) : (${sourceExpr})}`);
      } else {
        textChildren.push(`{${tree}}`);
      }
    } else {
      const contentExpr = renderReactBinding(
        "textContent",
        contentBindingOrTransformSource(node.content)!,
        ctx,
      );
      if (contentExpr !== null) {
        textChildren.push(`{${contentExpr}}`);
      }
    }
  }

  // IR-DOM-BINDING-CAPABILITY-01: the new `events` field is the canonical
  // location for event-handler bindings. Lower each to a React-style
  // `onCamelCaseEvent={expr}` JSX prop. Channel value strategies for
  // event handlers reuse the existing onChange/onClick logic in
  // `renderReactBinding` — we re-derive the synthetic JSX attribute name
  // (`onClick`, `onInput`, ...) and pass it through so that branch fires
  // for channel-routed events too. Legacy `bindings.onX` paths feed
  // through the attribute loop below until the retention drops.
  for (const [eventName, expr] of Object.entries(node.events)) {
    const activation = eventName === "click" ? node.activation : undefined;
    const disclosure = activation?.channel;
    if (disclosure) {
      const next = activation!.operation === "toggle" ? `!${disclosure.name}` : String(activation!.operation === "open");
      attrs.push(`onClick={(e) => { if (canActivateInteraction(e, ${activation!.cancelNativeDefault})) set${capitalize(disclosure.name)}(${next}); }}`);
      continue;
    }
    const reactEventName =
      ctx.formControlPart === node.part &&
      ctx.formControlEvent === eventName &&
      ctx.formControlCommit === "input"
        ? "change"
        : eventName;
    const jsxEventProp = ({ keydown: "onKeyDown", keyup: "onKeyUp", focusin: "onFocus", focusout: "onBlur" } as Record<string, string>)[reactEventName]
      ?? "on" + reactEventName.charAt(0).toUpperCase() + reactEventName.slice(1);
    const valueExpr = renderReactBinding(jsxEventProp, expr, ctx);
    if (valueExpr === null) continue;
    attrs.push(`${jsxEventProp}={${valueExpr}}`);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: bind the realized keyboard actions onto
  // the declared `when` part's node. The handler ident is part-derived and
  // the co-located hook emits its implementation from the same IR facts. The
  // composite item part's handler receives the item value exactly as the
  // item's click activation passes it, so pointer and keyboard commits stay
  // semantically identical.
  const isCompositeItem = ctx.compositeItemPart !== undefined && node.part === ctx.compositeItemPart;
  if (node.keyboardActions && node.keyboardActions.length > 0 && node.part) {
    const handlerIdent = `handle${capitalize(node.part)}Keydown`;
    if (isCompositeItem && ctx.compositeMemberExpr) {
      const memberExpr = renderReactBinding(
        "compositeItemValue",
        ctx.compositeMemberExpr,
        ctx,
      );
      if (memberExpr !== null) {
        attrs.push(`onKeyDown={(event) => ${handlerIdent}(event, ${memberExpr})}`);
      }
    } else {
      attrs.push(`onKeyDown={${handlerIdent}}`);
    }
    // A keyboard host that is not natively focusable must become
    // programmatically focusable so the delegated keys can fire and svelte's
    // a11y compiler checks hold; -1 keeps it out of tab order.
    if (isCompositeItem || !NATIVE_FOCUSABLE_TAGS.has(node.tag)) {
      attrs.push("tabIndex={-1}");
    }
  } else if (isCompositeItem) {
    // Composite roving item without its own keydown: still a roving focus
    // target — focusable for the roving focus path but out of tab order
    // (APG roving tabindex with DOM focus tracking).
    attrs.push("tabIndex={-1}");
  }

  for (const [key, expr] of Object.entries(node.bindings)) {
    // Dual-pathway retention dedup: when parseDomNode mirrored a legacy
    // `bindings.onX` entry into `events.<x>`, the canonical `events` loop
    // above already emitted it. Skip the legacy attribute pass to avoid
    // double-emit. (Step 4C drops the retention entirely.)
    if (/^on[A-Z]/.test(key)) {
      const eventName = key.slice(2).toLowerCase();
      if (node.events[eventName]) continue;
    }
    const valueExpr = renderReactBinding(key, expr, ctx);
    if (valueExpr === null) continue; // skip unsupported
    if (key === "textContent" || key === "children") {
      // Dual-pathway retention: if the new `content` field is already set,
      // it took precedence above and this legacy entry would double-emit.
      if (!node.content) {
        textChildren.push(`{${valueExpr}}`);
      }
      continue;
    }
    const jsxKey = jsxAttrName(key);
    // React's DOM types model aria-checked as Booleanish (`boolean | "true"
    // | "false"`) — a known gap against the real ARIA spec, which also
    // allows the tri-state "mixed" value. A conditional binding whose
    // true-branch is the literal "mixed" (the DOM-PROPERTY-REFLECTION-IR-
    // CHECKBOX-INDETERMINATE-01 aria-checked pattern) needs its own cast,
    // distinct from the general Booleanish coercion below: `as "true" |
    // "false"` would be actively wrong here (it would stringify "mixed"
    // through `String()`, corrupting it), so this checks for the literal
    // "mixed" branch specifically and casts to the real (wider) ARIA type.
    if (
      jsxKey === "aria-checked" &&
      expr.kind === "conditional" &&
      ((expr.whenTrue.kind === "literal" && expr.whenTrue.value === "mixed") ||
        (expr.whenFalse.kind === "literal" && expr.whenFalse.value === "mixed"))
    ) {
      attrs.push(`${jsxKey}={${valueExpr} as "mixed" | "true" | "false" | boolean}`);
      continue;
    }
    // ARIA boolean-ish attributes have React type `Booleanish` (`boolean |
    // "true" | "false"`). Three cases:
    //   1. Boolean prop or boolean channel — pass through. React accepts
    //      `boolean | undefined` for Booleanish, and a missing prop simply
    //      omits the attr at render time.
    //   2. Non-boolean channel bound to a boolean-ish attr — coerce via
    //      `String(...) as "true" | "false"`. This is a contract smell
    //      (the channel's domain doesn't match the attribute's domain)
    //      but the cast preserves correctness for callers that pass valid
    //      values.
    //   3. Prop binding with non-boolean type (rare) — same as case 2.
    if (ARIA_BOOLEAN_ATTRS.has(jsxKey)) {
      const sourceType = inferBindingValueType(expr, ctx);
      if (sourceType === "boolean" || sourceType === undefined) {
        attrs.push(`${jsxKey}={${valueExpr}}`);
      } else {
        // Non-boolean channel coerced to Booleanish via String(). Use a
        // ternary so an undefined channel value renders no attribute
        // (React omits attrs with `undefined`), rather than the literal
        // string "undefined" which axe correctly flags as invalid.
        attrs.push(
          `${jsxKey}={${valueExpr} !== undefined ? (String(${valueExpr}) as "true" | "false") : undefined}`,
        );
      }
      continue;
    }
    // Numeric JSX attributes (e.g. aria-valuemin) typed as `number` reject
    // a string literal. When the binding is a literal that parses as a
    // number, emit the unquoted form so React sees a number.
    if (
      NUMERIC_JSX_ATTRS.has(jsxKey) &&
      expr.kind === "literal" &&
      /^-?\d+$/.test(expr.value)
    ) {
      attrs.push(`${jsxKey}={${expr.value}}`);
      continue;
    }
    attrs.push(`${jsxKey}={${valueExpr}}`);
  }

  if (node.focusContainer || node.keyboardPanel) attrs.push(`ref={panelRef}`);
  if (node.keyboardAnchor) attrs.push(`ref={element => { anchorRef.current = element; }}`);

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: generated per-instance id on
  // relationship targets, and the lowered idref attributes on sources.
  if (node.generatedIdSlug !== undefined) {
    attrs.push(`id={${reactGeneratedIdExpr(node.generatedIdSlug)}}`);
  }
  for (const refAttr of node.idRefAttrs) {
    attrs.push(
      `${jsxAttrName(refAttr.attribute)}={${reactIdRefListExpr(refAttr.refs, refAttr.passthroughProp)}}`,
    );
  }

  // IR-DOM-CSS-VAR-BINDING-01: lower `cssVarBindings` to a React inline
  // style prop. Each entry becomes a property on a `CSSProperties` object
  // literal whose key is the literal `--fsds-<prefix>-<name>` custom-
  // property name. React's `CSSProperties` type has an index signature
  // for known CSS properties but not for arbitrary custom-property
  // strings, so we assert through `CSSProperties` to satisfy strict
  // type-checking. The identifier scanner in `collectReactImports` will
  // pick up `CSSProperties` automatically because it's listed in
  // `REACT_TYPE_IDENTIFIERS`. A literal `style` attr coexisting with
  // cssVarBindings is rejected by the IR builder, so we can build the
  // object fresh here.
  let rootCssVarStyle: string | undefined;
  if (node.cssVarBindings.length > 0) {
    const entries: string[] = [];
    for (const { varName, value } of node.cssVarBindings) {
      const valueExpr = renderReactBinding("style", value, ctx);
      if (valueExpr === null) continue;
      entries.push(`"${varName}": ${valueExpr}`);
    }
    if (entries.length > 0) {
      if (ctx.isRoot) {
        // Preserve generated bindings when the consumer supplies style; its
        // individual values win. Emit after the rest spread to avoid erasure.
        rootCssVarStyle = `style={{ ${entries.join(", ")}, ...rest.style } as CSSProperties}`;
      } else {
        attrs.push(`style={{ ${entries.join(", ")} } as CSSProperties}`);
      }
    }
  }

  // FIX-OVERLAY-CLICK-DISMISSAL-BINDING-01: the dismissal click binds on the
  // declared targetPart element (the full-cover overlay), never on the root —
  // the root is pointer-events:none under the overlay and can never be the
  // hit target. `e.target === e.currentTarget` keeps clicks on overlay
  // descendants inert without a stopPropagation handler on the inner
  // non-interactive panel (a11y click-without-key lint).
  if (
    ctx.overlayClickSetter &&
    node.part !== undefined &&
    node.part === ctx.overlayClickTargetPart
  ) {
    const guard = ctx.overlayClickEnabledProp
      ? `${ctx.overlayClickEnabledProp} ? `
      : "";
    const tail = ctx.overlayClickEnabledProp ? " : undefined" : "";
    attrs.push(
      `onClick={${guard}(e) => { if (e.target === e.currentTarget) ${ctx.overlayClickSetter}(false); }${tail}}`,
    );
  }

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: bind the ambient association to the
  // actual control part, which may be nested below the component root.
  if (
    ctx.fieldAssociationConsumerPart &&
    ctx.fieldAssociationConsumerPart === node.part
  ) {
    attrs.push(`id={fieldAssociation?.controlId}`);
    attrs.push(`aria-describedby={fieldAssociation?.describedBy}`);
  }

  if (ctx.isRoot) {
    if (classParts.length > 0) {
      attrs.unshift(`className={\`${classRootClassExpr(classParts)}\`}`);
    } else {
      attrs.unshift(`className={classNames}`);
    }
    // Apply contract-declared a11y.role on the root unless the dom tree
    // already set `attrs.role` (which is consumed in the loop above and
    // would already appear in `attrs`).
    if (ctx.rootRole && !node.attrs["role"] && !node.bindings["role"]) {
      attrs.push(`role="${ctx.rootRole}"`);
    }
    attrs.push(`data-testid={testId}`);
    // Identification attribute for audit/devtools (ICONOGRAPHY-TOKEN-DISCIPLINE-02
    // Phase 5). NOT a CSS selector hook — does not change cascade behavior.
    if (ctx.cssPrefix) {
      attrs.push(`data-fsds-component="${ctx.cssPrefix}" data-fsds-box=""`);
    }
    if (ctx.sequence) attrs.push(`ref={sequence.bindRoot}`);
    if (ctx.autoDismissPause) {
      attrs.push(`{...autoDismissPauseProps}`);
    }
    // Selector-anchored root: fixed-position style computed against the
    // active step's page anchor, hidden until the first measurement so the
    // panel never flashes at (0,0).
    if (ctx.rootSelectorAnchored) {
      // Stack's ref prop is Ref<Element>; narrow to HTMLElement for the
      // positioning primitive (a non-HTML root can't be positioned anyway).
      attrs.push(
        `ref={(el) => setAnchoredRootEl(el instanceof HTMLElement ? el : null)}`,
      );
      attrs.push(`data-placement={anchoredPosition.placement}`);
      attrs.push(
        `style={{ position: "fixed", top: \`\${anchoredPosition.top}px\`, left: \`\${anchoredPosition.left}px\`, visibility: anchoredPosition.ready ? "visible" : "hidden" }}`,
      );
    }
    attrs.push(`{...rest}`);
    if (rootCssVarStyle) attrs.push(rootCssVarStyle);
  } else if (classParts.length > 0) {
    attrs.unshift(`className=${classPartsExpr(classParts)}`);
  }

  // IR-DOM-ITERATE-CAPABILITY-01: when this node is iterated, React needs
  // a `key` on the element so the reconciler can identify items across
  // renders. We use the iteration index — sufficient for the current
  // contract surface where iteration source props (count/array prop) are
  // not reorderable lists, and where contracts cannot declare a
  // per-item key strategy. If/when reorderable iteration becomes a
  // real requirement we'd add `keyExpression` to IterationIR and lower
  // it here.
  if (node.iteration) {
    attrs.push(`key={${node.iteration.indexVar}}`);
  }

  // DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01: attach the ref the
  // root-level useEffect prelude declared for this node's propertyBindings.
  const propertyBindingRef = ctx.propertyBindingRefs?.get(node);
  if (propertyBindingRef) {
    attrs.push(`ref={${propertyBindingRef}}`);
  }

  // Children rendering
  const childCtx: ReactRenderContext = { ...ctx, isRoot: false };
  const renderedChildren = node.children.map((c) =>
    renderReactDomNode(c, childCtx, indent + 2),
  );

  // ICON-CATALOG-RUNTIME-DELIVERY-01: a glyph node's svg surface comes from
  // the resolved catalog record — data-fsds-icon + viewBox + width/height
  // attrs here, one <path> per glyph path record as the only children, and
  // (below, once `body` is built) a null-guard so an unknown icon name
  // renders nothing.
  const iconGlyphEntry = ctx.iconGlyphIdents?.get(node);
  const iconGlyphChildLines: string[] = [];
  if (iconGlyphEntry) {
    const { glyphIdent, pxIdent } = iconGlyphEntry;
    attrs.push(`data-fsds-icon={${glyphIdent}.name}`);
    attrs.push(`viewBox={${glyphIdent}.viewBox}`);
    const sizeExpr = pxIdent
      ? `${pxIdent} ?? ${glyphIdent}.size`
      : `${glyphIdent}.size`;
    attrs.push(`width={${sizeExpr}}`);
    attrs.push(`height={${sizeExpr}}`);
    const childPad = " ".repeat(indent + 2);
    const pathAttrs = ICON_GLYPH_PATH_ATTRS.map(
      ({ recordKey, reactProp }) => `${reactProp}={glyphPath.${recordKey}}`,
    ).join(" ");
    iconGlyphChildLines.push(
      `${childPad}{${glyphIdent}.paths.map((glyphPath, glyphIndex) => (`,
      `${childPad}  <path key={glyphIndex} ${pathAttrs} />`,
      `${childPad}))}`,
    );
  }

  // Inline text from textContent bindings precedes any child elements.
  // Indent matches child indent so the source reads consistently.
  const textChildLines = textChildren.map((tc) => `${" ".repeat(indent + 2)}${tc}`);
  const allChildren = [
    ...textChildLines,
    ...renderedChildren,
    ...(iconGlyphChildLines.length > 0 ? [iconGlyphChildLines.join("\n")] : []),
  ];

  // Self-closing vs open tag.
  // componentRef: this node renders a referenced design-system component by
  // its (PascalCase) name. JSX treats the capitalized identifier as a
  // component, so `<Image src={...} />` resolves to the imported `Image`.
  // The referenced component is never Stack-wrapped — it owns its own root.
  // When emitting the root node and the contract declared a polymorphic root
  // prop, swap the literal HTML tag for the JSX variable identifier. Inner
  // calls (isRoot=false) ignore the override.
  const tag = node.componentRef
    ? node.componentRef
    : ctx.isRoot && ctx.rootTagOverride
      ? ctx.rootTagOverride
      : node.tag;
  const useStackRoot = ctx.isRoot && ctx.useStackRoot && !node.componentRef;
  if (useStackRoot) {
    if (ctx.rootTagOverride) {
      attrs.unshift(`as={${ctx.rootTagOverride}}`);
    } else if (node.tag !== "div") {
      attrs.unshift(`as="${node.tag}"`);
    }
    attrs.unshift(`layout="native"`);
  }
  const emittedTag = useStackRoot ? "Stack" : tag;
  // A childless componentRef self-closes (`<Image .../>`), like a void
  // element; `node.tag` is "" for a componentRef so the VOID set never
  // matches it directly.
  const isVoidEl = node.componentRef
    ? true
    : VOID_HTML_ELEMENTS.has(node.tag);

  let body: string;
  if (allChildren.length === 0 && (isVoidEl || useStackRoot)) {
    body = `${pad}<${emittedTag}${formatAttrs(attrs)} />`;
  } else if (allChildren.length === 0) {
    body = `${pad}<${emittedTag}${formatAttrs(attrs)} />`;
  } else {
    body = [
      `${pad}<${emittedTag}${formatAttrs(attrs)}>`,
      ...allChildren,
      `${pad}</${emittedTag}>`,
    ].join("\n");
  }

  // iconGlyph null-guard: an unknown icon name resolves to undefined and the
  // svg (whose attrs dereference the glyph record) must not render at all.
  if (iconGlyphEntry) {
    body = `${pad}{${iconGlyphEntry.glyphIdent} ? (\n${body.replace(/^/gm, "  ")}\n${pad}) : null}`;
  }

  // if-guard: wrap in a JSX expression. When the guard prop matches a
  // channel value-prop, reference the hook-resolved value (which reflects
  // controlled + uncontrolled state) rather than the controlled prop alone.
  // Doctrine: when a node has BOTH `iterate` and `if`, the if-guard nests
  // INSIDE the loop (each iteration re-evaluates the guard against the
  // per-iteration scope). See IR-DOM-ITERATE-CAPABILITY-01.
  let withIfGuard = body;
  if (node.ifProp || node.ifSlot) {
    let guard: string;
    if (node.ifSlot) {
      guard = `slots?.${node.ifSlot}`;
    } else if (node.ifProp === "children") {
      guard = "children";
    } else {
      const matchingChannel = [...ctx.channelByName.values()].find(
        (c) => c.valueProp === node.ifProp || c.name === node.ifProp,
      );
      guard = matchingChannel ? matchingChannel.name : node.ifProp!;
    }
    const condition = node.ifNegated ? `!${guard}` : guard;
    // A ternary, not `&&`. React renders a falsy NUMBER as text, so
    // `{lines && <div/>}` with `lines={0}` paints a stray "0" — the other four
    // web frameworks' conditionals discard falsy values instead. Skeleton's
    // `if: "lines"` is the corpus's first numeric guard; the ternary is
    // equivalent for boolean and string guards and correct for numeric ones.
    withIfGuard = `${pad}{${condition} ? (\n${body.replace(/^/gm, "  ")}\n${pad}) : null}`;
  }

  // IR-DOM-ITERATE-CAPABILITY-01: iteration wrap is the outermost layer
  // — runs N times and produces an array of rendered (or falsy when an
  // inner if-guard rejects) elements. React handles arrays of elements
  // (and false values) natively. Stable iteration source (count number
  // or array prop) means an index-based key is sufficient.
  if (node.iteration) {
    const { kind, source, indexVar, itemVar } = node.iteration;
    const innerBody = node.ifProp || node.ifSlot ? withIfGuard : body;
    // For multi-line bodies the inner JSX needs to live inside a
    // parenthesized return expression in the arrow function.
    const isMultiLine = innerBody.includes("\n");
    const arrow = (params: string) =>
      isMultiLine
        ? `(${params}) => (\n${innerBody.replace(/^/gm, "  ")}\n${pad})`
        : `(${params}) => ${innerBody.trimStart()}`;
    // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: route the iteration source
    // through the same binding-value renderer that handles `prop:` /
    // `channel:` resolution for any other binding. The previous bare
    // `${sourceProp}` emit failed for channel-driven prop sources because
    // React destructures the channel value-prop under a `controlledX`
    // alias. Going through `renderReactBinding` resolves `channel:X.value`
    // to the channel's runtime identifier (e.g. `selection`) and `prop:X`
    // to whatever the destructured local is.
    const sourceExpr = renderReactBinding("__iter_source__", source, ctx);
    if (sourceExpr === null) {
      // Should never fire — `parseIterate` only accepts `prop:` and
      // `channel:X.value`, both of which the value renderer handles.
      throw new Error(
        `React emitter: iteration source could not be lowered ` +
        `(source kind=${source.kind})`,
      );
    }
    if (kind === "count") {
      return `${pad}{Array.from({ length: ${sourceExpr} }, ${arrow(`_, ${indexVar}`)})}`;
    }
    // kind === "array" — guard the source with `?? []` so an undefined
    // value (controllable-state with no controlled and no defaultValue)
    // renders zero items rather than throwing a TypeError. Lit's count
    // emit already does the analogous `?? 0` guard; this is the array
    // counterpart.
    return `${pad}{(${sourceExpr} ?? []).map(${arrow(`${itemVar}, ${indexVar}`)})}`;
  }

  return withIfGuard;
}

/**
 * Build the root className JSX expression. For the root node, the class
 * recipe (variant + boolean modifiers) is computed in `classNames`. We
 * concatenate the per-part class with `classNames` so the root carries both
 * its BEM block class AND any modifier classes.
 */
function classRootClassExpr(_parts: string[]): string {
  // Note: we always emit the user's `className` via the existing
  // `classNames` concatenation. The dom-tree's part class for the root is
  // already included in classRecipe.base, so we don't double-emit it.
  return `\${classNames}`;
}

function classPartsExpr(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  return `[${parts.join(", ")}].filter(Boolean).join(" ")`;
}

function formatAttrs(attrs: string[]): string {
  if (attrs.length === 0) return "";
  return " " + attrs.join(" ");
}

/**
 * Convert HTML attribute name to JSX attribute name. JSX uses camelCase for
 * most attributes but a few special cases (`for` → `htmlFor`, `class` →
 * `className`) need explicit handling.
 */
function jsxAttrName(name: string): string {
  if (name === "for") return "htmlFor";
  if (name === "class") return "className";
  if (name === "stroke-linecap") return "strokeLinecap";
  if (name === "stroke-dasharray") return "strokeDasharray";
  if (name === "tabindex") return "tabIndex";
  if (name === "readonly") return "readOnly";
  if (name === "maxlength") return "maxLength";
  if (name === "minlength") return "minLength";
  if (name === "autocomplete") return "autoComplete";
  if (name === "autofocus") return "autoFocus";
  if (name === "contenteditable") return "contentEditable";
  if (name === "datetime") return "dateTime";
  if (name === "spellcheck") return "spellCheck";
  if (name === "inputmode") return "inputMode";
  if (name === "enterkeyhint") return "enterKeyHint";
  if (name === "crossorigin") return "crossOrigin";
  if (name === "formaction") return "formAction";
  if (name === "formenctype") return "formEncType";
  if (name === "formmethod") return "formMethod";
  if (name === "formnovalidate") return "formNoValidate";
  if (name === "formtarget") return "formTarget";
  // ARIA / data attributes pass through as-is.
  if (name.startsWith("aria-") || name.startsWith("data-")) return name;
  return name;
}

function escapeJsxString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Infer the runtime type of a binding expression's resolved value, so the
 * emitter can decide whether an ARIA boolean-ish attribute needs coercion.
 * Returns `"boolean"` for boolean prop/channel sources, the channel's
 * declared `valueType` for non-boolean channels, and `undefined` for prop
 * bindings whose typed prop the caller can't introspect (in which case the
 * emitter pass-through assumes the prop type is correct).
 */
function inferBindingValueType(
  expr: BindingExpression,
  ctx: ReactRenderContext,
): string | undefined {
  if (expr.kind === "channel") {
    return ctx.channelByName.get(expr.channel)?.valueType;
  }
  if (expr.kind === "prop") {
    // No introspection of styled prop types in this context — caller
    // contract is that prop types match the attribute they're bound to.
    return undefined;
  }
  if (expr.kind === "iterationLocal") {
    // `iter:index` is always `number`. `iter:item`'s type lives on the
    // iteration's `itemType` but pinning it here would couple the value
    // walker to iteration kind details — emitters never currently need
    // the item type for value inference (string-attr coercion etc.), so
    // leave undefined and let the framework's type checker enforce
    // shape against the iteration callback parameter's typed signature.
    return expr.local === "index" ? "number" : undefined;
  }
  if (expr.kind === "projection") return expr.op === "selectionLabel" ? "string" : "number";
  if (expr.kind === "predicate") {
    // BINDING-EXPRESSION-V2-PREDICATE-01: every predicate operator
    // (`eq`, `contains`, `memberOf`) evaluates to a boolean.
    return "boolean";
  }
  if (expr.kind === "conditional") {
    return inferBindingValueType(expr.whenTrue, ctx) ?? inferBindingValueType(expr.whenFalse, ctx);
  }
  if (expr.kind === "valueMap") return "string";
  return undefined;
}

/**
 * Map a binding expression into a React JSX expression value. Channel
 * onChange handlers are wrapped to extract the value from the DOM event in
 * a shape that depends on (a) the host JSX attribute name and (b) the
 * channel's value type. `onChange` reads `e.target.{checked,value}`; other
 * event handlers (e.g. `onClick`) cannot — for a boolean channel wired to a
 * click, we emit a toggle callback; for other valueTypes wired to a click,
 * we pass through the current value.
 */
function renderReactBinding(
  attr: string,
  expr: BindingExpression,
  ctx: ReactRenderContext,
): string | null {
  switch (expr.kind) {
    case "paged": return pagedBindingExpression(expr, "pagedSet", expr.arg ? renderReactBinding(attr, expr.arg, ctx) ?? "undefined" : undefined);
    case "prop": {
      const base = expr.prop.includes("-") ? toCamelCase(expr.prop) : expr.prop;
      return appendPath(base, expr.path);
    }
    case "literal":
      return JSON.stringify(expr.value);
    case "iterationLocal": {
      // Resolve the local role to the iteration's declared variable name.
      // The iteration's `.map((item, index) => ...)` callback introduces
      // `indexVar` and `itemVar` as in-scope lexical names; emitting the
      // bare identifier is correct because React JSX is JS — no template
      // accessor wrapping needed.
      const it = ctx.enclosingIteration;
      if (!it) return null; // validator catches this; defensive.
      const base = expr.local === "index" ? it.indexVar : (it.itemVar ?? "item");
      return appendPath(base, expr.path);
    }
    case "projection": {
      const source = renderReactBinding("__projection_source__", expr.source, ctx);
      return source === null
        ? null
        : expr.op === "selectionLabel"
          ? composeBindingProjectionExpression(expr.op, source, renderReactBinding("__projection_operand__", expr.selection, ctx) ?? "undefined", renderReactBinding("__projection_operand__", expr.fallback, ctx) ?? "undefined")
          : composeBindingProjectionExpression(expr.op, source);
    }
    case "valueMap": {
      const source = renderReactBinding(attr, expr.source, ctx);
      return source === null ? null : composeValueMapExpression(expr, source);
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.forwardValue) return expr.forwardValue === "sequence" ? "sequence.requestIndex" : expr.forwardValue === "pagedSet" ? "pagedSet.request" : `set${capitalize(ch.name)}`;
      if (expr.field === "value") return appendPath(ch.name, expr.path);
      if (expr.field === "defaultValue") {
        if (!ch.defaultValueProp) return null;
        return ch.defaultValueProp;
      }
      // Event-shaped channels skip unwrapping — the consumer's handler
      // receives the raw DOM event and is responsible for state updates.
      if (ch.callbackKind === "event") {
        return ch.changeHandlerProp;
      }
      const setter = `set${capitalize(ch.name)}`;
      const isValueEvent = attr === "onChange" || attr === "onInput";
      // Value-bearing events read e.target.{checked,value} based on valueType.
      // Which event commits is already normalized by FormControlIR.
      if (isValueEvent) {
        if (ch.valueType === "boolean") {
          return `(e) => ${setter}((e.currentTarget as HTMLInputElement).checked)`;
        }
        if (ch.valueType === "number") {
          return `(e) => ${setter}(Number((e.currentTarget as HTMLInputElement).value))`;
        }
        if (ch.valueType === "string" || ch.valueType === undefined) {
          return `(e) => ${setter}((e.currentTarget as HTMLInputElement).value)`;
        }
        return `(e) => ${setter}(e as unknown as ${ch.valueType})`;
      }
      // Non-change events (onClick, onPointerDown, etc.): for boolean
      // channels, emit a toggle using the current closure value. The
      // generated hook setter is typed `(next: T) => void` (no updater
      // form), so we read the channel value from scope. For other
      // valueTypes, the click event carries no payload — pass the current
      // channel value through (no-op write; uncommon).
      if (ch.valueType === "boolean") {
        return `() => ${setter}(!${ch.name})`;
      }
      return `() => ${setter}(${ch.name})`;
    }
    case "channelCall": {
      // FEAT-BINDING-CALL-WITH-ARG-01: invoke the channel's setter WITH the
      // per-item payload. The setter is the `set<Channel>` closure the hook
      // returns; the argument goes through the same walker (path-aware) so
      // `iter:item.value` lowers to the in-scope `item.value`. This replaces
      // the self-assign no-op a bare non-boolean channel-click produced.
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      const setter = `set${capitalize(ch.name)}`;
      const argExpr = renderReactBinding("__channel_call_arg__", expr.arg, ctx);
      if (argExpr === null) return null;
      return `() => ${setter}(${argExpr})`;
    }
    case "channelUpdate": {
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: compose the next channel value
      // from the current value + payload/operands, then pass it through the
      // canonical setter. React allows the full JS body inline, so no
      // synthesized helper is needed (unlike Angular). setCharAt needs the
      // event; toggleMembership does not.
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      const setter = `set${capitalize(ch.name)}`;
      const operands = expr.operands.map((o) =>
        renderReactBinding("__channel_update_operand__", o, ctx),
      );
      if (operands.some((o) => o === null)) return null;
      const body = composeChannelUpdateExpression(expr.op, {
        current: ch.name,
        setter,
        // `onInput`'s SyntheticEvent types `target` as the loose `EventTarget`
        // (no `.value`); `currentTarget` is typed as the bound element and
        // carries `.value`. (`onChange`'s target IS narrowed, but this wire is
        // `onInput` — see OTP's `input` event.)
        eventValue: "e.currentTarget.value",
        operands: operands as string[],
      });
      const param = expr.op === "setCharAt" ? "(e)" : "()";
      return `${param} => ${body}`;
    }
    case "predicate": {
      // BINDING-EXPRESSION-V2-PREDICATE-01: lower each operator to the
      // canonical JS form. Operand expressions go through the same
      // `renderReactBinding` walker (with a non-attribute synthetic
      // attribute name) so they get path-aware accessor handling. The
      // outer caller wraps the resulting boolean expression for ARIA
      // serialization where required.
      const left = renderReactBinding("__predicate_operand__", expr.left, ctx);
      const right = renderReactBinding("__predicate_operand__", expr.right, ctx);
      if (left === null || right === null) return null;
      return loweredPredicate(expr.op, left, right);
    }
    case "conditional": {
      const condition = renderReactBinding("__conditional_condition__", expr.condition, ctx);
      const whenTrue = renderReactBinding("__conditional_true__", expr.whenTrue, ctx);
      const whenFalse = renderReactBinding("__conditional_false__", expr.whenFalse, ctx);
      if (condition === null || whenTrue === null || whenFalse === null) return null;
      return `(${condition} ? ${whenTrue} : ${whenFalse})`;
    }
  }
}

/**
 * Lower a closed BindingPredicateOp to its JS expression form. Identical
 * across all five frameworks because the operators are JS-native; what
 * differs is each framework's operand-accessor string (e.g. React's bare
 * `selection`, Vue's `behavior.selection.value`, Lit's `this.behavior.X`).
 * Wrapping each operator's output in parentheses keeps composition safe
 * if a future grammar admits boolean combinators (which this slice does
 * not).
 */
function loweredPredicate(op: BindingPredicateOp, left: string, right: string): string {
  switch (op) {
    case "eq":
      // L === R
      return `(${left} === ${right})`;
    case "contains":
      // C.includes(I), guarded by `?? []` so an undefined collection
      // renders false rather than throwing. First operand is the
      // collection; second is the item.
      return `((${left} ?? []).includes(${right}))`;
    case "memberOf":
      // Union-aware membership: `Array.isArray(S) ? S.includes(X) : X === S`.
      // First operand is the candidate; second is the scalar-or-collection.
      // This is the truthful expansion for channels typed `T | T[]` like
      // Select's `value: string | string[]` — preserves the public
      // contract shape without sneaking a narrowing into the codegen.
      return `(Array.isArray(${right}) ? ${right}.includes(${left}) : ${left} === ${right})`;
  }
}

/**
 * Append a dotted property path to a base accessor. `base + ""` is `base`;
 * `base + ["a", "b"]` is `base.a.b`. Identical lowering for all five
 * frameworks (React JSX, Vue/Angular `{{ }}`, Svelte `{}`, Lit `${ }`) —
 * the `.x.y` syntax is template-agnostic.
 */
function appendPath(base: string, path: readonly string[] | undefined): string {
  if (!path || path.length === 0) return base;
  return `${base}.${path.join(".")}`;
}

function toCamelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

const VOID_HTML_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "source", "track", "wbr",
]);

/**
 * ARIA attributes whose React type is `Booleanish` (`boolean | "true" | "false"`).
 * Channel-bound or comparison-derived values do not satisfy that union
 * automatically, so the emitter wraps the rendered value in `String(...)`
 * — `String(true) === "true"`, which Booleanish accepts.
 */
const ARIA_BOOLEAN_ATTRS = new Set([
  "aria-selected",
  "aria-pressed",
  "aria-expanded",
  "aria-checked",
  "aria-busy",
  "aria-disabled",
  "aria-hidden",
  "aria-readonly",
  "aria-required",
  "aria-modal",
  "aria-multiselectable",
  "aria-haspopup",
  "aria-invalid",
  "aria-current",
  "aria-grabbed",
]);

const NUMERIC_JSX_ATTRS = new Set([
  "tabIndex", "maxLength", "minLength", "size", "rowSpan", "colSpan",
  "min", "max", "step", "rows", "cols", "span", "start",
  "aria-valuemin", "aria-valuemax", "aria-valuenow",
  "aria-level", "aria-posinset", "aria-setsize",
  "aria-colcount", "aria-colindex", "aria-colspan",
  "aria-rowcount", "aria-rowindex", "aria-rowspan",
]);
