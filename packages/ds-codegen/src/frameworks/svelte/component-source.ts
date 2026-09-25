/**
 * Svelte 5 SFC emission, IR-driven.
 *
 * Output shape (single file component using runes):
 *
 *   <script lang="ts">
 *   // @generated:start imports
 *   import { Stack } from "@full-stack-ds/svelte/primitives";
 *   // @generated:end
 *   ...
 *   </script>
 *
 *   <Stack class={classes}>
 *     {@render children?.()}
 *   </Stack>
 *
 * The script block interior uses `renderSections` with `"line"` comment
 * style, matching the Vue emitter's approach. Template and style blocks
 * are single regions.
 */
import type {
  BindingExpression,
  BindingPredicateOp,
  ComponentIR,
  DomNodeIR,
  IdRefIR,
  IterationIR,
  KeyboardActionIR,
  NormalizedChannelIR,
  PropTypeIR,
} from "../../ir.js";
import { componentNeedsInstanceId } from "../../id-relationships.js";
import {
  hasChildrenPlaceholder,
  TABLE_COMPOSITION_TAGS,
  nativeTableAttrsFor,
  canonicalTsType,
  composeBindingProjectionExpression,
  composeChannelUpdateExpression,
  composeValueMapExpression,
  collectContentTransforms,
  isHighlightTransform,
  isMarkdownTransform,
  contentBindingOrTransformSource,
  groupKeyboardActionsByPart,
  compositeActivationMember,
  keyboardModeGateProps,
  NATIVE_FOCUSABLE_TAGS,
  type NativeTableAttr,
} from "../../ir.js";

/** Svelte prop TS type for a forwarded native table attribute (template `style` is a string). */
function svelteTableAttrType(attr: NativeTableAttr): string {
  switch (attr) {
    case "id":
    case "style":
      return "string";
    case "colSpan":
    case "rowSpan":
      return "number";
    case "scope":
      return '"col" | "row" | "colgroup" | "rowgroup"';
  }
}

/**
 * Svelte template attribute for a forwarded native table attribute. `id`,
 * `style`, `scope` use the `{name}` shorthand (var name === HTML attribute);
 * `colSpan`/`rowSpan` bind the lowercase HTML attribute to the camelCase var.
 */
function svelteTableAttrBinding(attr: NativeTableAttr): string {
  switch (attr) {
    case "colSpan":
      return "colspan={colSpan}";
    case "rowSpan":
      return "rowspan={rowSpan}";
    default:
      return `{${attr}}`; // id, style, scope
  }
}
import { emitNonReactTypeAliases, translateNonReactType } from "../../non-react-types.js";
import { resolveComponentRefImports } from "../component-ref-imports.js";
import { renderSections, type Section } from "../../preserve.js";
import {
  resolveSurfaceAutoDismiss,
  portalsRootToBody,
  selectorAnchoredRootPortal,
} from "../../semantics.js";
import { resolveEventValueStrategy } from "../../semantics.js";
import {
  isCompoundStateContainer,
  isDisclosureContainer,
  getInteractiveItemPart,
  getMultipleItemPart,
  getRegionPart,
  getGroupHostPart,
  getGroupHostOrnamentPart,
} from "../react/hook-source.js";
import {
  collectIconGlyphNodes,
  ICON_GLYPH_PATH_ATTRS,
  ICONOGRAPHY_MODULE,
  iconGlyphNameArg,
  iconGlyphPxExpr,
  iconGlyphSizeHintsLiteral,
} from "../icon-glyph.js";

// Props the Svelte emitter handles natively: `class` via `class: className`
// destructuring, `children` via `import('svelte').Snippet`, `style` passthrough.
// `className` is the React convention for `class`; we translate it to `class`.
const SVELTE_SKIP_PROPS = new Set(["class", "style", "className", "children"]);

/**
 * Emit a Svelte 5 Single File Component for a `ComponentIR`. The script
 * block is partitioned into the same marker regions React and Vue use
 * (imports/types/props/classes/trailing); template is a simple block.
 */
export function generateSvelteComponentSource(ir: ComponentIR): string {
  if (isDisclosureContainer(ir)) {
    return generateSvelteDisclosureStateRootSource(ir);
  }
  if (isCompoundStateContainer(ir)) {
    return generateSvelteCompoundStateRootSource(ir);
  }
  if (ir.dom) {
    return generateSvelteDomTreeComponentSource(ir);
  }
  // Relative import to the primitives barrel (not the package self-
  // reference) so svelte-package / svelte-check can resolve it during
  // the package's own build, before dist exists.
  const importsBody = `import { Stack } from "../../primitives/index.js";`;

  const typesBody = generateTypeAliases(ir);
  const propsBody = generatePropsBlock(ir);
  const classesBody = generateClassesDerived(ir);

  const blank = (): Section => ({ kind: "between", body: "" });
  const scriptSections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    ...(typesBody
      ? [
          { kind: "generated" as const, id: "types", body: typesBody },
          blank(),
          { kind: "custom" as const, id: "types", body: "" },
          blank(),
        ]
      : []),
    { kind: "generated", id: "props", body: propsBody },
    blank(),
    { kind: "generated", id: "classes", body: classesBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
  ];

  return [
    `<script lang="ts">`,
    renderSections(scriptSections, "line"),
    `</script>`,
    ``,
    generateTemplate(ir),
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

function generateTypeAliases(ir: ComponentIR): string {
  return emitNonReactTypeAliases({
    ...ir,
    styledProps: ir.styledProps.filter((prop) => !SVELTE_SKIP_PROPS.has(prop.name)),
  }, { keyword: "type" }).join("\n");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

function generatePropsBlock(ir: ComponentIR): string {
  const lines: string[] = [`interface Props {`];
  for (const p of ir.styledProps) {
    if (SVELTE_SKIP_PROPS.has(p.name)) continue;
    // A prop with a `defaultExpr` is effectively optional at the
    // call site even if the contract marks it required — the
    // component supplies the default in the `$props()` destructure.
    const optional = p.required && p.defaultExpr === undefined ? "" : "?";
    const propName = p.name.includes("-") ? `"${p.name}"` : p.name;
    lines.push(`  ${propName}${optional}: ${lowerSveltePropType(p.propType)};`);
  }
  for (const dim of Object.keys(ir.variants)) {
    if (!ir.styledProps.some((p) => p.name === dim)) {
      lines.push(`  ${dim}?: string;`);
    }
  }
  lines.push(`  class?: string;`);
  // Only expose a `children` snippet when the component actually renders
  // children — i.e. the dom tree has a `{ tag: "children" }` region,
  // OR the component uses the legacy no-dom-tree path (which always wraps
  // body in `<Stack>{@render children?.()}</Stack>`).
  const acceptsChildren = ir.dom ? hasChildrenPlaceholder(ir) : true;
  if (acceptsChildren) {
    lines.push(`  children?: import('svelte').Snippet;`);
  }
  // Named-slot snippets: each named `{ tag: "slot", name: X }` in the dom
  // tree becomes an optional Snippet-typed prop named X.
  for (const slotName of collectNamedSlots(ir)) {
    lines.push(`  ${slotName}?: import('svelte').Snippet;`);
  }
  lines.push(`}`);
  lines.push(``);

  const destructured = buildDestructure(ir);
  lines.push(`let { ${destructured} }: Props = $props();`);

  return lines.join("\n");
}

function collectNamedSlots(ir: ComponentIR): string[] {
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

function buildDestructure(ir: ComponentIR): string {
  const parts: string[] = [];
  for (const p of ir.styledProps) {
    if (SVELTE_SKIP_PROPS.has(p.name)) continue;
    // For hyphenated keys (e.g. "aria-label"), JS destructuring requires an
    // alias to a valid identifier. Use the IR's safeName ("ariaLabel").
    const key = p.name.includes("-") ? `"${p.name}": ${p.safeName}` : p.safeName;
    if (p.defaultExpr !== undefined) {
      parts.push(`${key} = ${p.defaultExpr}`);
    } else {
      parts.push(key);
    }
  }
  for (const dim of Object.keys(ir.variants)) {
    if (!ir.styledProps.some((p) => p.name === dim)) {
      parts.push(dim);
    }
  }
  parts.push(`class: className`);
  const acceptsChildren = ir.dom ? hasChildrenPlaceholder(ir) : true;
  if (acceptsChildren) {
    parts.push(`children`);
  }
  for (const slotName of collectNamedSlots(ir)) {
    parts.push(slotName);
  }
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Class recipe
// ---------------------------------------------------------------------------

function generateClassesDerived(ir: ComponentIR): string {
  const { classRecipe } = ir;
  const lines: string[] = [
    `const classes = $derived(`,
    `  [`,
    `    "${classRecipe.base}",`,
  ];

  for (const mod of classRecipe.valueModifiers) {
    // valueModifiers use ResolvedPropIR.safeName (camelCase via
    // toSafeIdentifier), which matches the destructured local name —
    // valid JS accessor.
    const accessor = mod.safeName;
    lines.push(
      `    ${accessor} ? \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${accessor}}\` : null,`,
    );
  }

  for (const mod of classRecipe.booleanModifiers) {
    // booleanModifiers' safeName is dash-stripped (e.g. "data-loading" →
    // "dataloading") because it doubles as the CSS-class fragment. That
    // is NOT the destructured local name — the local is camelCase
    // ("dataLoading"). Derive the JS accessor from propName here.
    const accessor = jsAccessorFor(mod.propName);
    lines.push(
      `    ${accessor} ? "${classRecipe.base}--${mod.safeName}" : null,`,
    );
  }

  lines.push(`    className,`);
  lines.push(`  ].filter(Boolean).join(" ")`);
  lines.push(`);`);
  return lines.join("\n");
}

/**
 * Convert a contract prop name to its JS-identifier form (matches the
 * destructured local in buildDestructure). Mirrors ir.ts toSafeIdentifier.
 *
 * Exported for unit testing — the booleanModifier safeName divergence
 * (CSS-class fragment vs JS identifier) is subtle enough that an explicit
 * regression test is warranted even though no current contract exercises
 * the hyphenated-state path.
 */
export function jsAccessorFor(propName: string): string {
  return propName.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Compound-state-container SFC emission (Tabs-shaped)
// ---------------------------------------------------------------------------

function sveltePascalCapitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * Emit the root provider SFC (e.g. Tabs.svelte) for a compound-state-container IR.
 * This component calls `useTabs`, provides context via `provideTabsContext`, and
 * renders a plain `<div>` wrapper that accepts children.
 */
function generateSvelteCompoundStateRootSource(ir: ComponentIR): string {
  const { name, cssPrefix } = ir;

  const importsBody = [
    `import { use${name}, provide${name}Context } from "./use${name}.svelte.js";`,
  ].join("\n");

  // Type aliases for variant props
  const typeLines: string[] = [];
  const emittedTypes = new Set<string>();
  for (const p of ir.styledProps) {
    if (SVELTE_SKIP_PROPS.has(p.name)) continue;
    for (const ref of p.typeRefs) {
      if (emittedTypes.has(ref)) continue;
      const def = ir.definedTypes[ref];
      if (!def) continue;
      if (def.kind === "union" && def.values) {
        typeLines.push(`type ${ref} = ${def.values.map((v) => `"${v}"`).join(" | ")};`);
        emittedTypes.add(ref);
      } else if (def.kind === "alias" && def.alias) {
        typeLines.push(`type ${ref} = ${svelteType(def.alias)};`);
        emittedTypes.add(ref);
      }
    }
  }
  const typesBody = typeLines.join("\n");

  // Props interface — styledProps already include value/defaultValue/onValueChange/idBase
  // for Tabs, so we just iterate them. Then add class, data-testid, children.
  const styledPropNames = new Set(ir.styledProps.map((p) => p.name));
  const channel = ir.behavior.normalizedChannels[0];

  const propsLines: string[] = [`interface Props {`];
  for (const p of ir.styledProps) {
    if (SVELTE_SKIP_PROPS.has(p.name)) continue;
    // A prop with a `defaultExpr` is effectively optional at the
    // call site even if the contract marks it required — the
    // component supplies the default in the `$props()` destructure.
    const optional = p.required && p.defaultExpr === undefined ? "" : "?";
    const propName = p.name.includes("-") ? `"${p.name}"` : p.name;
    propsLines.push(`  ${propName}${optional}: ${lowerSveltePropType(p.propType)};`);
  }
  propsLines.push(`  class?: string;`);
  propsLines.push(`  "data-testid"?: string;`);
  propsLines.push(`  children?: import('svelte').Snippet;`);
  propsLines.push(`}`);

  // Destructure — alias `idBase` to `idBaseProp` so we can pass it as a getter
  // to useTabs without Svelte warning about "references only capture initial value".
  const destructParts: string[] = [];
  for (const p of ir.styledProps) {
    if (SVELTE_SKIP_PROPS.has(p.name)) continue;
    const key = p.name.includes("-") ? `"${p.name}": ${p.safeName}` : p.safeName;
    if (p.name === "idBase") {
      destructParts.push(`idBase: idBaseProp`);
    } else if (p.defaultExpr !== undefined) {
      destructParts.push(`${key} = ${p.defaultExpr}`);
    } else {
      destructParts.push(key);
    }
  }
  destructParts.push(`class: className`);
  destructParts.push(`"data-testid": dataTestid`);
  destructParts.push(`children`);

  const propsBody = [
    propsLines.join("\n"),
    ``,
    `let {`,
    `  ${destructParts.join(",\n  ")},`,
    `}: Props = $props();`,
  ].join("\n");

  // Hook call — forward channel props as getters for reactivity
  const hookLines: string[] = [`const behavior = use${name}({`];
  if (channel) {
    const vAccessor = jsAccessorFor(channel.valueProp);
    hookLines.push(`  ${channel.valueProp}: () => ${vAccessor},`);
    if (channel.defaultValueProp) {
      const dvAccessor = jsAccessorFor(channel.defaultValueProp);
      hookLines.push(`  ${channel.defaultValueProp}: () => ${dvAccessor},`);
    }
    const cbAccessor = jsAccessorFor(channel.changeHandlerProp);
    hookLines.push(`  ${channel.changeHandlerProp}: () => ${cbAccessor},`);
  }
  // idBase: pass as getter so Svelte doesn't warn about capturing initial value.
  // idBaseProp is the destructured alias for the `idBase` styled prop.
  if (styledPropNames.has("idBase")) {
    hookLines.push(`  // idBase is stable after mount — use getter to avoid Svelte lint warning.`);
    hookLines.push(`  get idBase() { return idBaseProp; },`);
  }
  hookLines.push(`});`);
  hookLines.push(``);
  hookLines.push(`provide${name}Context({`);
  if (channel) {
    const channelName = channel.name;
    const setter = `set${sveltePascalCapitalize(channelName)}`;
    hookLines.push(`  get ${channelName}() { return behavior.${channelName}; },`);
    hookLines.push(`  ${setter}(v) { behavior.${setter}(v); },`);
  }
  hookLines.push(`  get registeredTabs() { return behavior.registeredTabs; },`);
  hookLines.push(`  registerTab(v) { behavior.registerTab(v); },`);
  hookLines.push(`  unregisterTab(v) { behavior.unregisterTab(v); },`);
  hookLines.push(`  idBase: behavior.idBase,`);

  // Forward orientation, activationMode, loop, unmountInactive via getters
  const styledNames = new Set(ir.styledProps.map((p) => p.name));
  if (styledNames.has("orientation")) {
    hookLines.push(`  get orientation() { return orientation ?? "horizontal"; },`);
  }
  if (styledNames.has("activationMode")) {
    hookLines.push(`  get activationMode() { return activationMode ?? "automatic"; },`);
  }
  if (styledNames.has("loop")) {
    hookLines.push(`  get loop() { return loop ?? true; },`);
  }
  if (styledNames.has("unmountInactive")) {
    hookLines.push(`  get unmountInactive() { return unmountInactive ?? true; },`);
  }
  hookLines.push(`});`);
  const hookBody = hookLines.join("\n");

  // Classes derived
  const classExprs: string[] = [`"${cssPrefix}"`];
  for (const mod of ir.classRecipe.valueModifiers) {
    classExprs.push(`${jsAccessorFor(mod.propName)} ? \`${cssPrefix}--${mod.valuePrefix ?? ""}\${${jsAccessorFor(mod.propName)}}\` : null`);
  }
  classExprs.push("className");
  const classesBody = [
    `const classes = $derived(`,
    `  [`,
    ...classExprs.map((e) => `    ${e},`),
    `  ].filter(Boolean).join(" ")`,
    `);`,
  ].join("\n");

  const blank = (): Section => ({ kind: "between", body: "" });
  const scriptSections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    ...(typesBody
      ? [
          { kind: "generated" as const, id: "types", body: typesBody },
          blank(),
          { kind: "custom" as const, id: "types", body: "" },
          blank(),
        ]
      : []),
    { kind: "generated", id: "props", body: propsBody },
    blank(),
    { kind: "generated", id: "hook", body: hookBody },
    blank(),
    { kind: "generated", id: "classes", body: classesBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
  ];

  return [
    `<script lang="ts">`,
    renderSections(scriptSections, "line"),
    `</script>`,
    ``,
    `<div data-fsds-component="${ir.cssPrefix}" data-fsds-box="" class={classes} data-testid={dataTestid}>`,
    `  {@render children?.()}`,
    `</div>`,
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Repeated-disclosure lowering (Accordion-shaped)
// ---------------------------------------------------------------------------

/** DFS for the DOM node whose part matches `partName`. */
function svelteFindDomNode(
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
function svelteFindParentOf(
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
 * Root provider SFC for a repeated-disclosure container (Accordion). Calls the
 * component's state hook, derives per-item toggle/open, provides disclosure
 * context, and hosts arrow-key navigation over the triggers.
 */
function generateSvelteDisclosureStateRootSource(ir: ComponentIR): string {
  const { name, cssPrefix } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "openness";
  const setter = `set${sveltePascalCapitalize(channelName)}`;
  const hasCollapsible = ir.styledProps.some((p) => p.name === "collapsible");
  const hasDisabled = ir.styledProps.some((p) => p.name === "disabled");

  const importsBody = [
    `import { toggleInteractionItem } from "../../primitives/interaction.js";`,
    `import { use${name}, provide${name}Context } from "./use${name}.svelte.js";`,
  ].join("\n");

  // Variant type aliases
  const typeLines: string[] = [];
  const emittedTypes = new Set<string>();
  for (const p of ir.styledProps) {
    if (SVELTE_SKIP_PROPS.has(p.name)) continue;
    for (const ref of p.typeRefs) {
      if (emittedTypes.has(ref)) continue;
      const def = ir.definedTypes[ref];
      if (!def) continue;
      if (def.kind === "union" && def.values) {
        typeLines.push(`type ${ref} = ${def.values.map((v) => `"${v}"`).join(" | ")};`);
        emittedTypes.add(ref);
      } else if (def.kind === "alias" && def.alias) {
        typeLines.push(`type ${ref} = ${svelteType(def.alias)};`);
        emittedTypes.add(ref);
      }
    }
  }
  const typesBody = typeLines.join("\n");

  const propsLines: string[] = [`interface Props {`];
  for (const p of ir.styledProps) {
    if (SVELTE_SKIP_PROPS.has(p.name)) continue;
    const optional = p.required && p.defaultExpr === undefined ? "" : "?";
    const propName = p.name.includes("-") ? `"${p.name}"` : p.name;
    propsLines.push(`  ${propName}${optional}: ${lowerSveltePropType(p.propType)};`);
  }
  propsLines.push(`  class?: string;`);
  propsLines.push(`  "data-testid"?: string;`);
  propsLines.push(`  children?: import('svelte').Snippet;`);
  propsLines.push(`}`);

  const destructParts: string[] = [];
  for (const p of ir.styledProps) {
    if (SVELTE_SKIP_PROPS.has(p.name)) continue;
    const key = p.name.includes("-") ? `"${p.name}": ${p.safeName}` : p.safeName;
    if (p.name === "idBase") {
      destructParts.push(`idBase: idBaseProp`);
    } else if (p.defaultExpr !== undefined) {
      destructParts.push(`${key} = ${p.defaultExpr}`);
    } else {
      destructParts.push(key);
    }
  }
  destructParts.push(`class: className`);
  destructParts.push(`"data-testid": dataTestid`);
  destructParts.push(`children`);

  const propsBody = [
    propsLines.join("\n"),
    ``,
    `let {`,
    `  ${destructParts.join(",\n  ")},`,
    `}: Props = $props();`,
  ].join("\n");

  const idCounterName = `_${name.toLowerCase()}IdCounter`;

  const hookLines: string[] = [];
  hookLines.push(`const behavior = use${name}({`);
  if (channel) {
    const vAccessor = jsAccessorFor(channel.valueProp);
    hookLines.push(`  ${channel.valueProp}: () => ${vAccessor},`);
    if (channel.defaultValueProp) {
      const dvAccessor = jsAccessorFor(channel.defaultValueProp);
      hookLines.push(`  ${channel.defaultValueProp}: () => ${dvAccessor},`);
    }
    const cbAccessor = jsAccessorFor(channel.changeHandlerProp);
    hookLines.push(`  ${channel.changeHandlerProp}: () => ${cbAccessor},`);
  }
  hookLines.push(`});`);
  hookLines.push(``);
  hookLines.push(`const idBase = \`${name.toLowerCase()}-\${++${idCounterName}}\`;`);
  hookLines.push(`let rootRef: HTMLElement | null = $state(null);`);
  hookLines.push(``);
  hookLines.push(`function isItemOpen(itemValue: string): boolean {`);
  hookLines.push(`  const v = behavior.${channelName};`);
  hookLines.push(`  return Array.isArray(v) ? v.includes(itemValue) : v === itemValue;`);
  hookLines.push(`}`);
  hookLines.push(``);
  hookLines.push(`function toggleItem(itemValue: string): void {`);
  hookLines.push(`  const v = behavior.${channelName};`);
  hookLines.push(`  behavior.${setter}(toggleInteractionItem(v, itemValue, type === "multiple", ${hasCollapsible ? "Boolean(collapsible)" : "false"}));`);
  hookLines.push(`}`);
  hookLines.push(``);
  hookLines.push(`function handleKeyDown(e: KeyboardEvent): void {`);
  hookLines.push(`  const key = e.key;`);
  hookLines.push(`  if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") {`);
  hookLines.push(`    return;`);
  hookLines.push(`  }`);
  hookLines.push(`  if (!rootRef) return;`);
  hookLines.push(`  const triggers = Array.from(`);
  hookLines.push(`    rootRef.querySelectorAll<HTMLButtonElement>("[data-disclosure-trigger]"),`);
  hookLines.push(`  ).filter((el) => !el.disabled);`);
  hookLines.push(`  if (triggers.length === 0) return;`);
  hookLines.push(`  const currentIndex = triggers.indexOf(document.activeElement as HTMLButtonElement);`);
  hookLines.push(`  let nextIndex = currentIndex;`);
  hookLines.push(`  if (key === "ArrowDown") {`);
  hookLines.push(`    nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % triggers.length;`);
  hookLines.push(`  } else if (key === "ArrowUp") {`);
  hookLines.push(`    nextIndex = currentIndex < 0 ? triggers.length - 1 : (currentIndex - 1 + triggers.length) % triggers.length;`);
  hookLines.push(`  } else if (key === "Home") {`);
  hookLines.push(`    nextIndex = 0;`);
  hookLines.push(`  } else {`);
  hookLines.push(`    nextIndex = triggers.length - 1;`);
  hookLines.push(`  }`);
  hookLines.push(`  e.preventDefault();`);
  hookLines.push(`  triggers[nextIndex]?.focus();`);
  hookLines.push(`}`);
  hookLines.push(``);
  hookLines.push(`provide${name}Context({`);
  hookLines.push(`  get ${channelName}() { return behavior.${channelName}; },`);
  hookLines.push(`  toggleItem,`);
  hookLines.push(`  isItemOpen,`);
  hookLines.push(`  get type() { return type ?? "single"; },`);
  hookLines.push(`  get collapsible() { return ${hasCollapsible ? "collapsible ?? false" : "false"}; },`);
  hookLines.push(`  get disabled() { return ${hasDisabled ? "disabled ?? false" : "false"}; },`);
  hookLines.push(`  idBase,`);
  hookLines.push(`});`);
  const hookBody = hookLines.join("\n");

  const classExprs: string[] = [`"${cssPrefix}"`];
  for (const mod of ir.classRecipe.valueModifiers) {
    classExprs.push(`${jsAccessorFor(mod.propName)} ? \`${cssPrefix}--${mod.valuePrefix ?? ""}\${${jsAccessorFor(mod.propName)}}\` : null`);
  }
  classExprs.push("className");
  const classesBody = [
    `const classes = $derived(`,
    `  [`,
    ...classExprs.map((e) => `    ${e},`),
    `  ].filter(Boolean).join(" ")`,
    `);`,
  ].join("\n");

  const counterPrelude = `let ${idCounterName} = 0;`;

  const blank = (): Section => ({ kind: "between", body: "" });
  const scriptSections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    { kind: "generated", id: "types", body: [counterPrelude, typesBody].filter((s) => s.length > 0).join("\n\n") },
    blank(),
    { kind: "custom", id: "types", body: "" },
    blank(),
    { kind: "generated", id: "props", body: propsBody },
    blank(),
    { kind: "generated", id: "hook", body: hookBody },
    blank(),
    { kind: "generated", id: "classes", body: classesBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
  ];

  return [
    `<script lang="ts">`,
    renderSections(scriptSections, "line"),
    `</script>`,
    ``,
    `<!-- svelte-ignore a11y_no_static_element_interactions -->`,
    `<div data-fsds-component="${ir.cssPrefix}" data-fsds-box="" bind:this={rootRef} class={classes} data-testid={dataTestid} onkeydown={handleKeyDown}>`,
    `  {@render children?.()}`,
    `</div>`,
    ``,
  ].join("\n");
}

/** Sub-component SFCs (Item/Trigger/Content) for a disclosure container. */
export function generateSvelteDisclosureStateParts(
  ir: ComponentIR,
): Array<{ name: string; content: string }> {
  if (!isDisclosureContainer(ir)) return [];
  const { name, cssPrefix } = ir;
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  const multiplePart = getMultipleItemPart(ir);
  if (!itemPart || !regionPart || !multiplePart || !ir.dom) return [];

  const itemNode = svelteFindDomNode(ir.dom, itemPart.name);
  const headerNode = svelteFindParentOf(ir.dom, itemPart.name);
  const headerPartName = headerNode?.part;
  const headerTag = headerNode?.tag ?? "div";
  const triggerTag = itemNode?.tag ?? "button";
  const chevronNode = itemNode?.children?.find(
    (c) => c.part !== undefined && c.tag !== "slot" && c.tag !== "children",
  );
  const innerNode = svelteFindDomNode(ir.dom, regionPart.name);
  const innerChild = innerNode?.children?.find(
    (c) => c.part !== undefined && c.tag !== "slot" && c.tag !== "children",
  );
  const innerPartName = innerChild?.part;
  const innerTag = innerChild?.tag ?? "div";

  const itemName = `${name}${sveltePascalCapitalize(multiplePart.name)}`;
  const triggerName = `${name}${sveltePascalCapitalize(itemPart.name)}`;
  const contentName = `${name}${sveltePascalCapitalize(regionPart.name)}`;

  const itemCssClass = `${cssPrefix}__${multiplePart.name}`;
  const triggerCssClass = `${cssPrefix}__${itemPart.name}`;
  const contentCssClass = `${cssPrefix}__${regionPart.name}`;

  // Item.svelte (passive wrapper)
  const itemSource = [
    `<script lang="ts">`,
    `// @generated:start imports`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start props`,
    `interface Props {`,
    `  class?: string;`,
    `  "data-testid"?: string;`,
    `  children?: import('svelte').Snippet;`,
    `}`,
    ``,
    `let { class: className, "data-testid": dataTestid, children }: Props = $props();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const classes = $derived(["${itemCssClass}", className].filter(Boolean).join(" "));`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<div class={classes} data-testid={dataTestid}>`,
    `  {@render children?.()}`,
    `</div>`,
    ``,
  ].join("\n");

  // Trigger.svelte
  const triggerLines: string[] = [];
  triggerLines.push(`<script lang="ts">`);
  triggerLines.push(`// @generated:start imports`);
  triggerLines.push(`import { use${name}Context } from "./use${name}.svelte.js";`);
  if (chevronNode?.componentRef) {
    triggerLines.push(
      `import ${chevronNode.componentRef} from "../${chevronNode.componentRef}/${chevronNode.componentRef}.svelte";`,
    );
  }
  triggerLines.push(`// @generated:end`);
  triggerLines.push(``);
  triggerLines.push(`// @custom:start imports`);
  triggerLines.push(``);
  triggerLines.push(`// @custom:end`);
  triggerLines.push(``);
  triggerLines.push(`// @generated:start props`);
  triggerLines.push(`interface Props {`);
  triggerLines.push(`  value: string;`);
  triggerLines.push(`  class?: string;`);
  triggerLines.push(`  "data-testid"?: string;`);
  triggerLines.push(`  children?: import('svelte').Snippet;`);
  triggerLines.push(`}`);
  triggerLines.push(``);
  triggerLines.push(`let { value, class: className, "data-testid": dataTestid, children }: Props = $props();`);
  triggerLines.push(`// @generated:end`);
  triggerLines.push(``);
  triggerLines.push(`// @generated:start classes`);
  triggerLines.push(`const ctx = use${name}Context();`);
  triggerLines.push(``);
  triggerLines.push(`const isOpen = $derived(ctx.isItemOpen(value));`);
  triggerLines.push(``);
  triggerLines.push(`const classes = $derived(`);
  triggerLines.push(`  [`);
  triggerLines.push(`    "${triggerCssClass}",`);
  triggerLines.push(`    isOpen && "${triggerCssClass}--open",`);
  triggerLines.push(`    className,`);
  triggerLines.push(`  ]`);
  triggerLines.push(`    .filter(Boolean)`);
  triggerLines.push(`    .join(" "),`);
  triggerLines.push(`);`);
  triggerLines.push(`// @generated:end`);
  triggerLines.push(``);
  triggerLines.push(`// @custom:start trailing`);
  triggerLines.push(``);
  triggerLines.push(`// @custom:end`);
  triggerLines.push(`</script>`);
  triggerLines.push(``);
  if (headerPartName) triggerLines.push(`<${headerTag} class="${cssPrefix}__${headerPartName}">`);
  triggerLines.push(`<${triggerTag}`);
  triggerLines.push(`  type="button"`);
  triggerLines.push(`  class={classes}`);
  triggerLines.push(`  data-disclosure-trigger=""`);
  triggerLines.push(`  data-value={value}`);
  triggerLines.push(`  id="{ctx.idBase}-trigger-{value}"`);
  triggerLines.push(`  aria-controls="{ctx.idBase}-content-{value}"`);
  triggerLines.push(`  aria-expanded={isOpen}`);
  triggerLines.push(`  disabled={ctx.disabled}`);
  triggerLines.push(`  data-testid={dataTestid}`);
  triggerLines.push(`  onclick={() => ctx.toggleItem(value)}`);
  triggerLines.push(`>`);
  triggerLines.push(`  {@render children?.()}`);
  if (chevronNode) {
    triggerLines.push(
      renderSvelteDomNode(
        chevronNode,
        {
          classRecipe: cssPrefix,
          channelByName: new Map(),
          hookVar: "ctx",
          isRoot: false,
        },
        2,
      ),
    );
  }
  triggerLines.push(`</${triggerTag}>`);
  if (headerPartName) triggerLines.push(`</${headerTag}>`);
  triggerLines.push(``);
  const triggerSource = triggerLines.join("\n");

  // Content.svelte
  const contentInner = innerPartName
    ? [
        `  <${innerTag} class="${cssPrefix}__${innerPartName}">`,
        `    {@render children?.()}`,
        `  </${innerTag}>`,
      ]
    : [`  {@render children?.()}`];
  const contentSource = [
    `<script lang="ts">`,
    `// @generated:start imports`,
    `import { use${name}Context } from "./use${name}.svelte.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start props`,
    `interface Props {`,
    `  value: string;`,
    `  class?: string;`,
    `  "data-testid"?: string;`,
    `  children?: import('svelte').Snippet;`,
    `}`,
    ``,
    `let { value, class: className, "data-testid": dataTestid, children }: Props = $props();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const ctx = use${name}Context();`,
    ``,
    `const isOpen = $derived(ctx.isItemOpen(value));`,
    ``,
    `const classes = $derived(["${contentCssClass}", className].filter(Boolean).join(" "));`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<div`,
    `  role="region"`,
    `  class={classes}`,
    `  id="{ctx.idBase}-content-{value}"`,
    `  aria-labelledby="{ctx.idBase}-trigger-{value}"`,
    `  hidden={!isOpen ? true : undefined}`,
    `  data-testid={dataTestid}`,
    `>`,
    ...contentInner,
    `</div>`,
    ``,
  ].join("\n");

  return [
    { name: itemName, content: itemSource },
    { name: triggerName, content: triggerSource },
    { name: contentName, content: contentSource },
  ];
}

/**
 * Returns the sub-component SFC sources (List, Tab, Panel) for a
 * compound-state-container IR. Each sub-component is wired via
 * setContext/getContext using the provider emitted in the root.
 *
 * Returns an array of `{ name, content }` matching the Vue emitter's shape
 * so `factory.ts` can emit them uniformly.
 */
export function generateSvelteCompoundStateParts(
  ir: ComponentIR,
): Array<{ name: string; content: string }> {
  if (!isCompoundStateContainer(ir) || isDisclosureContainer(ir)) return [];

  const { name, cssPrefix } = ir;
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  const groupPart = getGroupHostPart(ir);
  const ornamentPart = getGroupHostOrnamentPart(ir);

  if (!itemPart || !regionPart) return [];

  const listName = `${name}${sveltePascalCapitalize(groupPart?.name ?? "List")}`;
  const tabName = `${name}${sveltePascalCapitalize(itemPart.name)}`;
  const panelName = `${name}${sveltePascalCapitalize(regionPart.name)}`;

  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "activeTab";
  const setter = `set${sveltePascalCapitalize(channelName)}`;
  const listCssClass = `${cssPrefix}__${groupPart?.name ?? "list"}`;
  const tabCssClass = `${cssPrefix}__${itemPart.name}`;
  const panelCssClass = `${cssPrefix}__${regionPart.name}`;

  // -------------------------------------------------------------------------
  // TabsList.svelte
  // -------------------------------------------------------------------------
  const listSource = [
    `<script lang="ts">`,
    `// @generated:start imports`,
    `import { use${name}Context } from "./use${name}.svelte.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start props`,
    `interface Props {`,
    `  class?: string;`,
    `  "data-testid"?: string;`,
    `  children?: import('svelte').Snippet;`,
    `}`,
    ``,
    `let { class: className, "data-testid": dataTestid, children }: Props = $props();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const ctx = use${name}Context();`,
    ``,
    `const classes = $derived(["${listCssClass}", className].filter(Boolean).join(" "));`,
    `// @generated:end`,
    ``,
    `// @generated:start trailing`,
    `let listRef: HTMLElement | null = $state(null);`,
    ``,
    `function handleKeyDown(e: KeyboardEvent): void {`,
    `  const tabs = ctx.registeredTabs;`,
    `  if (tabs.length === 0) return;`,
    `  const currentIndex = tabs.indexOf(ctx.${channelName});`,
    `  const isHorizontal = ctx.orientation !== "vertical";`,
    `  let nextIndex = currentIndex;`,
    ``,
    `  if (`,
    `    (isHorizontal && e.key === "ArrowRight") ||`,
    `    (!isHorizontal && e.key === "ArrowDown")`,
    `  ) {`,
    `    e.preventDefault();`,
    `    nextIndex = ctx.loop`,
    `      ? (currentIndex + 1) % tabs.length`,
    `      : Math.min(currentIndex + 1, tabs.length - 1);`,
    `  } else if (`,
    `    (isHorizontal && e.key === "ArrowLeft") ||`,
    `    (!isHorizontal && e.key === "ArrowUp")`,
    `  ) {`,
    `    e.preventDefault();`,
    `    nextIndex = ctx.loop`,
    `      ? (currentIndex - 1 + tabs.length) % tabs.length`,
    `      : Math.max(currentIndex - 1, 0);`,
    `  } else if (e.key === "Home") {`,
    `    e.preventDefault();`,
    `    nextIndex = 0;`,
    `  } else if (e.key === "End") {`,
    `    e.preventDefault();`,
    `    nextIndex = tabs.length - 1;`,
    `  } else if (e.key === "Enter" || e.key === " ") {`,
    `    if (ctx.activationMode === "manual") {`,
    `      e.preventDefault();`,
    `      const focusedBtn = listRef?.querySelector<HTMLButtonElement>('[role="tab"]:focus');`,
    `      if (focusedBtn) {`,
    `        const val = focusedBtn.getAttribute("data-value");`,
    `        if (val) ctx.${setter}(val);`,
    `      }`,
    `    }`,
    `    return;`,
    `  } else {`,
    `    return;`,
    `  }`,
    ``,
    `  const targetValue = tabs[nextIndex];`,
    `  if (ctx.activationMode === "automatic") {`,
    `    ctx.${setter}(targetValue);`,
    `  }`,
    `  const btn = listRef?.querySelector<HTMLButtonElement>(`,
    `    \`[role="tab"][data-value="\${targetValue}"]\`,`,
    `  );`,
    `  btn?.focus();`,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<div`,
    `  bind:this={listRef}`,
    `  role="tablist"`,
    // The tablist is an interactive role hosting the delegated roving keydown;
    // it must be programmatically focusable (APG; svelte's
    // a11y_interactive_supports_focus) but stays out of tab order.
    `  tabindex="-1"`,
    `  class={classes}`,
    `  data-testid={dataTestid}`,
    `  aria-orientation={ctx.orientation}`,
    `  onkeydown={handleKeyDown}`,
    `>`,
    `  {@render children?.()}`,
    ...(ornamentPart
      ? [
          // TABS-INDICATOR-REALIZATION-01: declared DOM realization of the
          // group-host ornament (e.g. Tabs's `indicator`). Visual treatment
          // and motion live in the contract's styles.json / Tabs.css.
          `  <span class="${cssPrefix}__${ornamentPart.name}" aria-hidden="true"></span>`,
        ]
      : []),
    `</div>`,
    ``,
  ].join("\n");

  // -------------------------------------------------------------------------
  // TabsTab.svelte
  // -------------------------------------------------------------------------
  const tabSource = [
    `<script lang="ts">`,
    `// @generated:start imports`,
    `import { onMount, onDestroy } from "svelte";`,
    `import { use${name}Context } from "./use${name}.svelte.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start props`,
    `interface Props {`,
    `  value: string;`,
    `  disabled?: boolean;`,
    `  class?: string;`,
    `  "data-testid"?: string;`,
    `  children?: import('svelte').Snippet;`,
    `}`,
    ``,
    `let { value, disabled, class: className, "data-testid": dataTestid, children }: Props = $props();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const ctx = use${name}Context();`,
    ``,
    `const isActive = $derived(ctx.${channelName} === value);`,
    ``,
    `const classes = $derived(`,
    `  [`,
    `    "${tabCssClass}",`,
    `    isActive && "${tabCssClass}--active",`,
    `    className,`,
    `  ]`,
    `    .filter(Boolean)`,
    `    .join(" "),`,
    `);`,
    `// @generated:end`,
    ``,
    `// @generated:start trailing`,
    `onMount(() => {`,
    `  ctx.registerTab(value);`,
    `});`,
    ``,
    `onDestroy(() => {`,
    `  ctx.unregisterTab(value);`,
    `});`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<button`,
    `  role="tab"`,
    `  type="button"`,
    `  class={classes}`,
    `  data-value={value}`,
    `  data-testid={dataTestid}`,
    `  id="{ctx.idBase}-tab-{value}"`,
    `  aria-controls="{ctx.idBase}-panel-{value}"`,
    `  aria-selected={isActive}`,
    `  tabindex={isActive ? 0 : -1}`,
    `  {disabled}`,
    `  onclick={() => ctx.${setter}(value)}`,
    `>`,
    `  {@render children?.()}`,
    `</button>`,
    ``,
  ].join("\n");

  // -------------------------------------------------------------------------
  // TabsPanel.svelte
  // -------------------------------------------------------------------------
  const panelSource = [
    `<script lang="ts">`,
    `// @generated:start imports`,
    `import { use${name}Context } from "./use${name}.svelte.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start props`,
    `interface Props {`,
    `  value: string;`,
    `  class?: string;`,
    `  "data-testid"?: string;`,
    `  children?: import('svelte').Snippet;`,
    `}`,
    ``,
    `let { value, class: className, "data-testid": dataTestid, children }: Props = $props();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const ctx = use${name}Context();`,
    ``,
    `const isActive = $derived(ctx.${channelName} === value);`,
    ``,
    `const classes = $derived(["${panelCssClass}", className].filter(Boolean).join(" "));`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `{#if !ctx.unmountInactive || isActive}`,
    `<div`,
    `  role="tabpanel"`,
    `  class={classes}`,
    `  id="{ctx.idBase}-panel-{value}"`,
    `  aria-labelledby="{ctx.idBase}-tab-{value}"`,
    `  tabindex={0}`,
    `  data-testid={dataTestid}`,
    `  hidden={!isActive ? true : undefined}`,
    `>`,
    `  {@render children?.()}`,
    `</div>`,
    `{/if}`,
    ``,
  ].join("\n");

  return [
    { name: listName, content: listSource },
    { name: tabName, content: tabSource },
    { name: panelName, content: panelSource },
  ];
}

// ---------------------------------------------------------------------------
// Compound part SFC
// ---------------------------------------------------------------------------

/**
 * Emit a stateless compound-part SFC mirroring the React reference shape:
 *   <ComponentNamePartName> → <Stack as="header" class="component__part">
 *
 * One .svelte file per part because Svelte components are 1:1 with files.
 */
export function generateSvelteCompoundPartSource(
  cssPrefix: string,
  part: {
    name: string;
    semanticElement?: string;
    isExplicitSubcomponent?: true;
    layoutVariant?: string;
    nativeTag?: string;
  },
): string {
  const cssClass = `${cssPrefix}__${part.name}`;

  // Native-tag branch: emit native HTML element directly, no Stack.
  if (part.nativeTag && TABLE_COMPOSITION_TAGS.has(part.nativeTag)) {
    const tag = part.nativeTag;
    const attrs = nativeTableAttrsFor(tag);
    const attrPropLines = attrs.map((a) => `  ${a}?: ${svelteTableAttrType(a)};`);
    const destructured = ["class: className", `"data-testid": dataTestid`, "children", ...attrs];
    // Svelte omits an attribute whose bound value is undefined.
    const attrBindings = attrs
      .map((a) => ` ${svelteTableAttrBinding(a)}`)
      .join("");
    return [
      `<script lang="ts">`,
      `// @generated:start imports`,
      `// @generated:end`,
      ``,
      `// @custom:start imports`,
      ``,
      `// @custom:end`,
      ``,
      `// @generated:start props`,
      `interface Props {`,
      `  class?: string;`,
      `  "data-testid"?: string;`,
      `  children?: import('svelte').Snippet;`,
      ...attrPropLines,
      `}`,
      ``,
      `let { ${destructured.join(", ")} }: Props = $props();`,
      `// @generated:end`,
      ``,
      `// @generated:start classes`,
      `const classes = $derived(["${cssClass}", className].filter(Boolean).join(" "));`,
      `// @generated:end`,
      ``,
      `// @custom:start trailing`,
      ``,
      `// @custom:end`,
      `</script>`,
      ``,
      `<${tag} class={classes} data-testid={dataTestid}${attrBindings}>`,
      `  {@render children?.()}`,
      `</${tag}>`,
      ``,
    ].join("\n");
  }

  const renderedTag = part.isExplicitSubcomponent
    ? part.nativeTag ?? part.semanticElement
    : part.semanticElement;
  const asAttr =
    renderedTag && renderedTag !== "div"
      ? ` as="${renderedTag}"`
      : "";
  const variantAttr =
    part.layoutVariant === "horizontal" ? ` variant="horizontal"` : "";

  return [
    `<script lang="ts">`,
    `// @generated:start imports`,
    `import { Stack } from "../../primitives/index.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start props`,
    `interface Props {`,
    `  class?: string;`,
    `  "data-testid"?: string;`,
    `  children?: import('svelte').Snippet;`,
    `}`,
    ``,
    `let { class: className, "data-testid": dataTestid, children }: Props = $props();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const classes = $derived(["${cssClass}", className].filter(Boolean).join(" "));`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<Stack${asAttr}${variantAttr} class={classes} data-testid={dataTestid}>`,
    `  {@render children?.()}`,
    `</Stack>`,
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

function generateTemplate(ir: ComponentIR): string {
  const { root } = ir;
  const asAttr = root.element !== "div" ? ` as="${root.element}"` : "";
  const roleAttr = root.effectiveRole ? ` role="${root.effectiveRole}"` : "";

  return [
    `<Stack${asAttr}${roleAttr} data-fsds-component="${ir.cssPrefix}" data-fsds-box="" class={classes}>`,
    `  {@render children?.()}`,
    `</Stack>`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Type translation (TS subset → Svelte-safe TS)
// ---------------------------------------------------------------------------

/**
 * The IR carries TypeScript type strings authored against React conventions.
 * We coerce them via the shared non-React translator so Svelte SFCs compile
 * without a React dependency.
 */
function svelteType(typeStr: string): string {
  return translateNonReactType(typeStr);
}

/**
 * Lower a framework-neutral PropTypeIR into a Svelte/TS type expression. Reads
 * the structured `propType` (ref from `propType.to`, fallback via the legacy
 * string path on `propType.raw`, V1 kinds via the canonical string) so output is
 * byte-identical. (CODEGEN-PROP-TYPE-IR-PILOT-01, slice 2)
 */
function lowerSveltePropType(pt: PropTypeIR): string {
  switch (pt.kind) {
    case "ref":
      return svelteType(pt.to);
    case "fallback":
      return svelteType(pt.raw);
    default:
      return svelteType(canonicalTsType(pt));
  }
}

// ---------------------------------------------------------------------------
// DOM-tree-driven component source (B.2c)
// ---------------------------------------------------------------------------

function generateSvelteDomTreeComponentSource(ir: ComponentIR): string {
  if (!ir.dom) throw new Error("generateSvelteDomTreeComponentSource requires ir.dom");

  const channels = ir.behavior.normalizedChannels;
  const channelByName = new Map(channels.map((c) => [c.name, c]));
  const hasHook = channels.length > 0;
  const hookVar = "behavior";

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01 facts for this component.
  const needsInstanceId = componentNeedsInstanceId(ir);
  const assocProvides = ir.fieldAssociation?.provides;
  const assocConsumerPart = ir.fieldAssociation?.consumerPart;

  const importLines: string[] = [];
  if (ir.interaction && ir.dom && ir.interaction.triggers.some(t => t.operation !== "select" && t.operation !== "toggle-item")) importLines.push(`import { canActivateInteraction } from "../../primitives/interaction.js";`);
  if (hasHook) {
    importLines.push(`import { use${ir.name} } from "./use${ir.name}.svelte.js";`);
  }
  if (assocProvides) {
    importLines.push(
      `import { provideFieldAssociation } from "../../primitives/index.js";`,
    );
  }
  if (assocConsumerPart) {
    importLines.push(
      `import { useFieldAssociation } from "../../primitives/index.js";`,
    );
  }
  const autoDismissPolicy = resolveSurfaceAutoDismiss(ir);
  const autoDismissChannel =
    autoDismissPolicy && hasHook
      ? channels.find((c) => c.valueType === "boolean")
      : undefined;
  if (autoDismissPolicy && autoDismissChannel) {
    importLines.push(`import { createAutoDismiss } from "../../primitives/index.js";`);
  }
  // FEAT-PORTAL-MECHANISM-CROSS-FRAMEWORK-01: full-overlay surfaces relocate
  // their root into document.body via the `portal` Svelte action so the fixed
  // layer escapes any transform/overflow/filter ancestor's containing block.
  // IR-driven via `portalsRootToBody` — no component-name lore.
  // Selector-anchored root portal (coachmark / guided tour): the whole
  // panel mounts at body and is positioned against a page element resolved
  // from the active step's selector — same renderInPortal/use:portal
  // consumption, plus createAnchoredPosition wiring emitted below.
  const selectorAnchor = selectorAnchoredRootPortal(ir);
  const rootUsePortal = portalsRootToBody(ir) || selectorAnchor !== null;
  if (rootUsePortal) {
    importLines.push(`import { portal } from "../../primitives/index.js";`);
  }
  if (selectorAnchor) {
    importLines.push(
      `import { createAnchoredPosition, type AnchoredPlacement } from "../../primitives/surfaces/createAnchoredPosition.svelte.js";`,
    );
  }
  // componentRef: import each referenced component (CODEGEN-RECURSIVE-
  // COMPOSITION-01). A Svelte component is a default export from its .svelte
  // file; the imported identifier is usable as a capitalized tag in markup.
  for (const refImport of resolveComponentRefImports(ir.name, ir.dom, "svelte")) {
    importLines.push(
      `import ${refImport.identifier} from "${refImport.specifier}";`,
    );
  }
  // iconGlyph: import the catalog resolver from the committed package-root
  // module of @full-stack-ds/iconography (ICON-CATALOG-RUNTIME-DELIVERY-01).
  // Structural — driven by IR `iconGlyph` facts, never per-component lore.
  const iconGlyphNodes = collectIconGlyphNodes(ir.dom);
  if (iconGlyphNodes.length > 0) {
    importLines.push(`import { resolveIcon } from "${ICONOGRAPHY_MODULE}";`);
  }
  // content-transform: import the shared highlight tokenizer when the tree
  // carries a highlight fact (FEAT-CODEBLOCK-HIGHLIGHT-01). Structural —
  // driven by IR content-transform facts, never per-component name lore.
  if (collectContentTransforms(ir.dom).some((t) => t.transform === "highlight")) {
    importLines.push(
      `import { prepareHighlightSource } from "../../primitives/highlight/tokenize.js";`,
    );
    for (const transform of collectContentTransforms(ir.dom)) {
      if (transform.transform !== "highlight" || !transform.linePart || !transform.gutterPart) continue;
      importLines.push(`import ${ir.name}${capitalizeSvelte(transform.linePart)}Part from "./${ir.name}${capitalizeSvelte(transform.linePart)}.svelte";`);
      importLines.push(`import ${ir.name}${capitalizeSvelte(transform.tokenPart)}Part from "./${ir.name}${capitalizeSvelte(transform.tokenPart)}.svelte";`);
    }
  }
  if (collectContentTransforms(ir.dom).some(isMarkdownTransform)) {
    importLines.push(
      `import { parseMarkdown, type MarkdownBlock, type MarkdownMark } from "../../primitives/markdown/markdown.js";`,
    );
  }
  const importsBody = importLines.join("\n");

  const typesBody = generateTypeAliases(ir);
  const propsBody = generatePropsBlock(ir);

  const hookLines: string[] = [];
  if (hasHook) {
    hookLines.push(`const ${hookVar} = use${ir.name}({`);
    for (const ch of channels) {
      const accessor = jsAccessorFor(ch.valueProp);
      hookLines.push(`  ${ch.valueProp}: () => ${accessor},`);
      if (ch.defaultValueProp) {
        const defAccessor = jsAccessorFor(ch.defaultValueProp);
        hookLines.push(`  ${ch.defaultValueProp}: () => ${defAccessor},`);
      }
      const onChangeAccessor = jsAccessorFor(ch.changeHandlerProp);
      hookLines.push(`  ${ch.changeHandlerProp}: () => ${onChangeAccessor},`);
    }
    // Forward dismissal-trigger enabledBy props so the hook's createDismissal
    // call sees them. Forwarded as getters so prop updates flow through.
    for (const trigger of ir.behavior.normalizedDismissalTriggers) {
      if (!trigger.enabledByProp) continue;
      const accessor = jsAccessorFor(trigger.enabledByProp);
      hookLines.push(`  ${trigger.enabledByProp}: () => ${accessor},`);
    }
    // FEAT-A11Y-COMPOSITE-KEYBOARD-01: forward mode gates the keyboard
    // select behavior reads. Getter-shaped like every prop the hook takes.
    for (const gate of keyboardModeGateProps(ir)) {
      const accessor = jsAccessorFor(gate);
      hookLines.push(`  ${gate}: () => ${accessor},`);
    }
    const modalityGate = ir.surface?.modalityGate;
    if (modalityGate) {
      hookLines.push(`  ${modalityGate.prop}: () => ${jsAccessorFor(modalityGate.prop)},`);
    }
    hookLines.push(`});`);
  }
  // Ephemeral-surface auto-dismiss (WCAG 2.2.1). House style: the behavior
  // takes getters and the component drives reactivity with $effect calling
  // sync(); pause listeners land on the root element.
  if (autoDismissPolicy && autoDismissChannel) {
    const setter = `set${capitalizeSvelte(autoDismissChannel.name)}`;
    const durationAccessor = jsAccessorFor(autoDismissPolicy.durationProp);
    hookLines.push(
      ``,
      `const autoDismiss = createAutoDismiss({`,
      `  open: () => Boolean(${hookVar}.${autoDismissChannel.name}),`,
      `  durationMs: () => ${durationAccessor} === undefined ? ${autoDismissPolicy.defaultMs ?? "undefined"} : ${durationAccessor},`,
      `  onDismiss: () => ${hookVar}.${setter}(false),`,
      `});`,
      `$effect(() => {`,
      `  autoDismiss.sync();`,
      `  return () => autoDismiss.destroy();`,
      `});`,
    );
  }
  // Selector-anchored root panel: resolve the active element from the
  // indexed selector prop, then position the (portaled) root against it.
  // The anchor element lives outside the component's tree, so it is
  // re-queried whenever the index channel or the selector array changes.
  // `$effect` re-runs on either dependency (Svelte 5 auto-tracks reads
  // inside the callback); `open` is a constant getter — the root panel is
  // only rendered while a coachmark tour is active.
  const anchoredPositionLines: string[] = [];
  if (selectorAnchor) {
    const idxChannel = channels.find(
      (c) => c.name === selectorAnchor.indexChannel,
    );
    if (!idxChannel) {
      throw new Error(
        `${ir.name}: surface.anchor.selector.indexChannel "${selectorAnchor.indexChannel}" has no matching channel in the IR.`,
      );
    }
    const propAccessor = jsAccessorFor(selectorAnchor.prop);
    const placementProp = ir.surface?.positioning?.placementProp;
    const placementAccessor = placementProp
      ? jsAccessorFor(placementProp)
      : undefined;
    const collision = ir.surface?.positioning?.collision ?? "flip-shift";
    anchoredPositionLines.push(
      `let anchoredRootEl = $state<HTMLElement | null>(null);`,
      `let anchorTargetEl = $state<HTMLElement | null>(null);`,
      `$effect(() => {`,
      `  const selector = (${propAccessor} ?? [])[${hookVar}.${idxChannel.name}]?.${selectorAnchor.path};`,
      `  anchorTargetEl = selector ? document.querySelector<HTMLElement>(selector) : null;`,
      `});`,
      `const anchoredPosition = createAnchoredPosition({`,
      `  anchor: () => anchorTargetEl,`,
      `  content: () => anchoredRootEl,`,
      `  open: () => true,`,
      `  placement: () => (${placementAccessor ?? `"auto"`}) as AnchoredPlacement | "auto",`,
      `  collision: () => "${collision}",`,
      `});`,
    );
  }
  const anchoredPositionBody = anchoredPositionLines.join("\n");
  const hookBody = hookLines.join("\n");

  // ICON-CATALOG-RUNTIME-DELIVERY-01: glyph nodes get a size-hints const
  // (module-shape literal, scoped to the component instance like every
  // other Svelte 5 rune declaration in this file) plus a `$derived`
  // requested-pixel value and a `$derived` resolved catalog record. A miss
  // (unknown icon name) leaves `iconGlyph` undefined and the template's
  // `{#if}` guard renders nothing. `Number.NaN` deliberately matches no
  // authored size, so `resolveIcon` falls back to the smallest authored
  // variant.
  const iconGlyphLines: string[] = [];
  const iconGlyphIdents = new Map<
    DomNodeIR,
    { glyphIdent: string; pxIdent: string | undefined }
  >();
  for (const { node, glyph, suffix } of iconGlyphNodes) {
    const glyphIdent = `iconGlyph${suffix}`;
    const hintsIdent = glyph.sizeHints
      ? `ICON_GLYPH_SIZE_HINTS${suffix}`
      : undefined;
    if (glyph.sizeHints && hintsIdent) {
      iconGlyphLines.push(
        `const ${hintsIdent}: Record<string, number> = ` +
          `${iconGlyphSizeHintsLiteral(glyph.sizeHints)};`,
      );
    }
    const sizeAccessor = glyph.sizePropName
      ? jsAccessorFor(glyph.sizePropName)
      : undefined;
    const pxExpr = iconGlyphPxExpr(glyph, sizeAccessor, hintsIdent);
    const pxIdent = pxExpr === undefined ? undefined : `iconGlyphPx${suffix}`;
    if (pxIdent) {
      iconGlyphLines.push(`const ${pxIdent} = $derived(${pxExpr});`);
    }
    const nameAccessor = jsAccessorFor(glyph.namePropName);
    const nameOptional =
      ir.styledProps.find((p) => p.name === glyph.namePropName)?.required ===
      false;
    iconGlyphLines.push(
      `const ${glyphIdent} = $derived(resolveIcon(${iconGlyphNameArg(nameAccessor, nameOptional)}, ` +
        `${pxIdent ? `${pxIdent} ?? Number.NaN` : "Number.NaN"}));`,
    );
    iconGlyphIdents.set(node, { glyphIdent, pxIdent });
  }
  const iconGlyphBody = iconGlyphLines.join("\n");

  const classRecipe = ir.classRecipe;
  const channelValuePropSet = new Set(channels.map((c) => c.valueProp));
  const classExprs: string[] = [`"${classRecipe.base}"`];
  for (const mod of classRecipe.valueModifiers) {
    const accessor = jsAccessorFor(mod.propName);
    classExprs.push(
      `${accessor} ? \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${accessor}}\` : null`,
    );
  }
  for (const mod of classRecipe.booleanModifiers) {
    if (channelValuePropSet.has(mod.propName)) {
      // Hook return exposes channel state via getter `get <ch.name>()`,
      // not by valueProp — resolve channel by valueProp and use its name.
      const ch = channels.find((c) => c.valueProp === mod.propName)!;
      classExprs.push(
        `${hookVar}.${ch.name} ? "${classRecipe.base}--${mod.safeName}" : null`,
      );
    } else {
      const accessor = jsAccessorFor(mod.propName);
      classExprs.push(
        `${accessor} ? "${classRecipe.base}--${mod.safeName}" : null`,
      );
    }
  }
  classExprs.push("className");
  const classesBody = [
    `const classes = $derived(`,
    `  [`,
    ...classExprs.map((e) => `    ${e},`),
    `  ].filter(Boolean).join(" ")`,
    `);`,
  ].join("\n");

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01 script body: `$props.id()` instance
  // namespace, provider `$derived` value exposed through a context GETTER
  // (reads stay reactive), consumer injection.
  const fieldAssocLines: string[] = [];
  if (needsInstanceId) {
    fieldAssocLines.push(`const instanceId = $props.id();`);
  }
  if (assocProvides) {
    fieldAssocLines.push(
      `const fieldAssociationValue = $derived({`,
      `  controlId: ${svelteGeneratedIdExpr(assocProvides.controlSlug)},`,
      `  describedBy: ${svelteIdRefListExpr(assocProvides.describedBy, undefined)},`,
      `});`,
      `provideFieldAssociation(() => fieldAssociationValue);`,
    );
  }
  if (assocConsumerPart) {
    fieldAssocLines.push(`const fieldAssociation = useFieldAssociation();`);
  }
  const fieldAssocBody = fieldAssocLines.join("\n");

  const overlayClickTrigger = ir.behavior.normalizedDismissalTriggers.find(
    (t) => t.event === "overlayClick",
  );
  const booleanChannel = channels.find((c) => c.valueType === "boolean");
  const ctx: SvelteRenderContext = {
    classRecipe: classRecipe.base,
    componentName: ir.name,
    channelByName,
    hookVar,
    isRoot: true,
    cssPrefix: ir.cssPrefix,
    fieldAssociationConsumerPart: assocConsumerPart,
    rootUsePortal,
    rootSelectorAnchored: selectorAnchor !== null,
    autoDismissPause: Boolean(autoDismissPolicy && autoDismissChannel),
    rootRole: ir.root.rootRole,
    rootPolymorphicTag: ir.root.polymorphicTagProp,
    iconGlyphIdents,
    keyboardActionsByPart: groupKeyboardActionsByPart(ir.keyboardActions),
    compositeItemPart: ir.behavior.focus?.strategy === "roving" ? ir.compositeControl?.part.name : undefined,
    compositeMemberExpr: compositeActivationMember(ir.compositeControl),
    ...(overlayClickTrigger && booleanChannel
      ? {
          overlayClickSetter: `${hookVar}.set${capitalizeSvelte(booleanChannel.name)}`,
          overlayClickEnabledProp: overlayClickTrigger.enabledByProp,
          overlayClickTargetPart: overlayClickTrigger.targetPart,
        }
      : {}),
  };
  const templateInner = renderSvelteDomNode(ir.dom, ctx, 0);
  const markdownSnippetsBody = generateSvelteMarkdownSnippets(ir);

  const blank = (): Section => ({ kind: "between", body: "" });
  const scriptSections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    ...(typesBody
      ? [
          { kind: "generated" as const, id: "types", body: typesBody },
          blank(),
          { kind: "custom" as const, id: "types", body: "" },
          blank(),
        ]
      : []),
    { kind: "generated", id: "props", body: propsBody },
    blank(),
    ...(hookBody
      ? [
          { kind: "generated" as const, id: "hook", body: hookBody },
          blank(),
        ]
      : []),
    ...(anchoredPositionBody
      ? [
          {
            kind: "generated" as const,
            id: "anchoredPosition",
            body: anchoredPositionBody,
          },
          blank(),
        ]
      : []),
    ...(iconGlyphBody
      ? [
          { kind: "generated" as const, id: "iconGlyph", body: iconGlyphBody },
          blank(),
        ]
      : []),
    { kind: "generated", id: "classes", body: classesBody },
    blank(),
    ...(fieldAssocBody
      ? [
          {
            kind: "generated" as const,
            id: "fieldAssociation",
            body: fieldAssocBody,
          },
          blank(),
        ]
      : []),
    { kind: "custom", id: "trailing", body: "" },
  ];

  return [
    `<script lang="ts">`,
    renderSections(scriptSections, "line"),
    `</script>`,
    ``,
    templateInner,
    ``,
    ...(markdownSnippetsBody ? [markdownSnippetsBody, ``] : []),
  ].join("\n");
}

interface SvelteRenderContext {
  /** Ancestor pre elements preserve template formatting as literal text. */
  preformatted?: boolean;
  classRecipe: string;
  componentName?: string;
  channelByName: Map<string, NormalizedChannelIR>;
  hookVar: string;
  isRoot: boolean;
  /** Component cssPrefix for the root's data-fsds-component identification attr. */
  cssPrefix?: string;
  /** When true, attach `use:portal` to the root so it relocates to body. */
  rootUsePortal?: boolean;
  /**
   * Selector-anchored root panel (coachmark tour): the root binds the
   * measured ref, fixed-position style, and `data-placement` emitted by
   * the script's `createAnchoredPosition` block. Root-level only.
   */
  rootSelectorAnchored?: boolean;
  /**
   * Anatomy part that consumes ambient field association.
   */
  fieldAssociationConsumerPart?: string;
  /** When true, attach auto-dismiss pause listeners to the root element. */
  autoDismissPause?: boolean;
  // `a11y.role` from the contract — emitted on the root element when set.
  // React/Lit/Angular all forward this; Svelte was the odd one out and lost
  // the role attribute on dom-tree components.
  rootRole?: string;
  rootPolymorphicTag?: {
    propName: string;
    defaultTag: string;
  };
  overlayClickSetter?: string;
  overlayClickEnabledProp?: string;
  overlayClickTargetPart?: string;
  /**
   * Local identifiers for nodes carrying `iconGlyph`
   * (ICON-CATALOG-RUNTIME-DELIVERY-01), keyed by node identity.
   * `glyphIdent` names the `$derived` const holding the `resolveIcon(...)`
   * result; `pxIdent` names the `$derived` requested-pixel const (undefined
   * when the glyph has no size binding). Populated once at the root call
   * from `collectIconGlyphNodes`; empty when the tree has no glyph nodes.
   */
  iconGlyphIdents?: Map<DomNodeIR, { glyphIdent: string; pxIdent: string | undefined }>;
  /**
   * Identifier names introduced by enclosing `{#each}` iterations. After
   * BINDING-EXPRESSION-V2-01 the binding-side `prop:X` accessor no
   * longer consults this set — iteration locals reach the emitter as
   * `iterationLocal`-kind bindings and dispatch via
   * `ctx.enclosingIteration`. The set is retained as the `if:` guard's
   * resolver (V2 did not migrate `if:`).
   */
  iterationScope?: Set<string>;
  /**
   * Nearest enclosing iteration directive. Resolution target for
   * `iterationLocal`-kind bindings.
   */
  enclosingIteration?: IterationIR;
  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: realized keyboard actions keyed by the
  // hosting part, the composite item part, and the member expression the
  // item's click binding mutates — the walker lowers `onkeydown` bindings
  // and roving tabindex facts from these, exactly as the React walker does.
  keyboardActionsByPart?: Map<string, KeyboardActionIR[]>;
  compositeItemPart?: string;
  compositeMemberExpr?: BindingExpression;
}

/**
 * FEAT-A11Y-LABEL-ID-ASSOCIATION-01 — Svelte lowering of generated
 * relationship ids. Ids derive from the `$props.id()` instance namespace.
 * Slot gates are the bare snippet-prop identifiers (named slots ARE props
 * in Svelte 5), so presence checks are plain truthiness.
 */
function svelteGeneratedIdExpr(slug: string): string {
  return `\`\${instanceId}-${slug}\``;
}

function svelteIdRefGuardExpr(ref: IdRefIR): string | undefined {
  const conds: string[] = [];
  if (ref.slotGate) conds.push(jsAccessorFor(ref.slotGate));
  if (ref.when) {
    const accessor = jsAccessorFor(ref.when.prop);
    if (ref.when.op === "eq") {
      conds.push(
        `${accessor} ${ref.when.negated ? "!==" : "==="} '${ref.when.value}'`,
      );
    } else {
      conds.push(ref.when.negated ? `!${accessor}` : accessor);
    }
  }
  return conds.length > 0 ? conds.join(" && ") : undefined;
}

function svelteIdRefListExpr(
  refs: IdRefIR[],
  passthroughProp: string | undefined,
): string {
  if (refs.length === 0 && !passthroughProp) return "undefined";
  if (refs.length === 1 && !passthroughProp) {
    const guard = svelteIdRefGuardExpr(refs[0]);
    const id = svelteGeneratedIdExpr(refs[0].slug);
    return guard ? `${guard} ? ${id} : undefined` : id;
  }
  const parts = refs.map((ref) => {
    const guard = svelteIdRefGuardExpr(ref);
    const id = svelteGeneratedIdExpr(ref.slug);
    return guard ? `${guard} ? ${id} : null` : id;
  });
  if (passthroughProp) parts.push(jsAccessorFor(passthroughProp));
  return `[${parts.join(", ")}].filter(Boolean).join(' ') || undefined`;
}

function renderSvelteDomNode(
  node: DomNodeIR,
  ctx: SvelteRenderContext,
  indent: number,
): string {
  // HTML preformatted context must carry only authored content. Suppress
  // generator whitespace while leaving interpolated source values untouched.
  const compact = ctx.preformatted || node.tag === "pre";
  if (compact) indent = 0;
  const childIndent = compact ? 0 : indent + 2;
  const separator = compact ? "" : "\n";
  const pad = " ".repeat(indent);

  if (node.tag === "slot" || node.tag === "children") {
    if (node.slotName) {
      // Svelte 5: named slot maps to a Snippet-typed prop. Consumers pass
      // `<MyComponent {title}>` or via children-with-snippets syntax.
      return `${pad}{@render ${node.slotName}?.()}`;
    }
    return `${pad}{@render children?.()}`;
  }

  // IR-DOM-ITERATE-CAPABILITY-01: extend iterationScope for this node
  // and every descendant when `iterate` is declared. Bindings on the
  // iterated node and its subtree resolve `prop:item` / `prop:index`
  // as bare locals from the {#each} scope, not as destructured
  // component props.
  if (node.iteration) {
    const extendedScope = new Set(ctx.iterationScope ?? []);
    extendedScope.add(node.iteration.indexVar);
    if (node.iteration.itemVar !== undefined) {
      extendedScope.add(node.iteration.itemVar);
    }
    ctx = {
      ...ctx,
      iterationScope: extendedScope,
      enclosingIteration: node.iteration,
    };
  }

  const attrs: string[] = [];
  // focusContainer (trap/portal panels) and keyboardPanel (a keyboard `open`
  // realization's panel, FEAT-A11Y-COMPOSITE-KEYBOARD-01) both bind the
  // hook's panelRef so script-side focus can enter the revealed surface.
  if (node.focusContainer || node.keyboardPanel) attrs.push(`bind:this={${ctx.hookVar}.panelRef.el}`);
  if (node.keyboardAnchor) attrs.push(`bind:this={${ctx.hookVar}.anchorRef.el}`);
  const classParts: string[] = [];
  if (node.part) classParts.push(`'${ctx.classRecipe}__${node.part}'`);

  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === "class" || key === "className") {
      classParts.push(`'${value}'`);
      continue;
    }
    attrs.push(`${svelteAttrName(key)}="${escapeAttrValue(value)}"`);
  }

  // Some contract binding keys are not real HTML attributes but
  // DOM-property facades — `textContent` is the canonical example.
  // Svelte rejects `textContent={...}` as an attribute (svelte-check:
  // "textcontent" does not exist on HTMLProps); the idiomatic Svelte
  // emit is to render the value as a text child of the element.
  // Collect those bindings here and splice them into the body below.
  let textContentExpr: string | null = null;

  // IR-DOM-BINDING-CAPABILITY-01: the new `content` field is the
  // canonical inner-content binding. Surface it through the same
  // textContentExpr slot the legacy textContent path uses.
  if (node.content) {
    if (isHighlightTransform(node.content)) {
      // FEAT-CODEBLOCK-HIGHLIGHT-01: one span per token via {#each} over the
      // shared pure tokenizer; the gate prop (when declared) degrades to a
      // single plain text run of the source binding.
      const transform = node.content;
      const sourceExpr = appendPath(
        sveltePropAccessor(transform.sourceProp, ctx),
        transform.source.path,
      );
      const languageExpr = appendPath(
        sveltePropAccessor(transform.languageProp, ctx),
        transform.language.path,
      );
      const gateExpr = transform.gate !== undefined
        ? appendPath(sveltePropAccessor(transform.gateProp ?? "", ctx), transform.gate.path)
        : "true";
      const tokensExpr = transform.tokensProp ? sveltePropAccessor(transform.tokensProp, ctx) : "undefined";
      const prepared = `prepareHighlightSource(${sourceExpr}, ${languageExpr}, { tokens: ${tokensExpr}, highlight: ${gateExpr} })`;
      if (transform.linePart && transform.gutterPart) {
        textContentExpr =
          `{#each ${prepared}.lines as line (line.number)}` +
          `<${ctx.componentName}${capitalizeSvelte(transform.linePart)}Part number={line.number} ending={line.ending}>` +
          `{#each line.tokens as token}` +
          `{#if line.highlighted}` +
          `<${ctx.componentName}${capitalizeSvelte(transform.tokenPart)}Part kind={token.kind}>{token.text}</${ctx.componentName}${capitalizeSvelte(transform.tokenPart)}Part>` +
          `{:else}{token.text}{/if}{/each}</${ctx.componentName}${capitalizeSvelte(transform.linePart)}Part>{/each}`;
      } else {
        textContentExpr = `{#each ${prepared}.lines as line}{line.tokens.map((token) => token.text).join('') + line.ending}{/each}`;
      }
    } else if (isMarkdownTransform(node.content)) {
      // FEAT-MARKDOWN-CONTENT-TRANSFORM-01: the template iterates the
      // structural parse and renders through the recursive file-level
      // snippets; a declared gate falls back to the plain source run.
      const transform = node.content;
      const sourceExpr = appendPath(
        sveltePropAccessor(transform.sourceProp, ctx),
        transform.source.path,
      );
      const each =
        `{#each parseMarkdown(${sourceExpr} ?? "") as block, blockIndex}` +
        `{@render markdownBlock(block, blockIndex)}{/each}`;
      if (transform.gate !== undefined) {
        const gateExpr = appendPath(
          sveltePropAccessor(transform.gateProp ?? transform.gate.prop, ctx),
          transform.gate.path,
        );
        textContentExpr = `{#if ${gateExpr}}${each}{:else}{${sourceExpr}}{/if}`;
      } else {
        textContentExpr = each;
      }
    } else {
      textContentExpr = renderSvelteTextChildExpression(
        contentBindingOrTransformSource(node.content)!,
        ctx,
      );
    }
  }

  // IR-DOM-BINDING-CAPABILITY-01: event bindings lower to Svelte 5's
  // `onclick={...}` lowercased-attribute form (NOT the legacy Svelte 4
  // `on:click={...}` directive — this codebase uses Svelte 5 runes).
  //
  // componentRef: a Svelte 5 component event is a PROP, not a DOM listener, so
  // it must target the referenced component's handler prop name (`onClick`),
  // which the IR resolved in ComponentInstanceIR.events.targetHandlerProp. When
  // the target declares no handler prop, fall through to the DOM-event form.
  const refEventByName = new Map(
    (node.componentInstance?.events ?? []).map((e) => [e.name, e]),
  );
  for (const [eventName, expr] of Object.entries(node.events)) {
    const activation = eventName === "click" ? node.activation : undefined;
    const disclosure = activation?.channel;
    if (disclosure) {
      const next = activation!.operation === "toggle" ? `!${ctx.hookVar}.${disclosure.name}` : String(activation!.operation === "open");
      attrs.push(`onclick={(e) => { if (canActivateInteraction(e, ${activation!.cancelNativeDefault})) ${ctx.hookVar}.set${capitalizeSvelte(disclosure.name)}(${next}); }}`);
      continue;
    }
    const refEvent = refEventByName.get(eventName);
    if (refEvent?.targetHandlerProp) {
      const handlerExpr = renderSvelteEventHandlerExpr(expr, ctx);
      if (handlerExpr !== null) {
        attrs.push(`${refEvent.targetHandlerProp}={${handlerExpr}}`);
      }
      continue;
    }
    const rendered = renderSvelteEvent(eventName, expr, ctx, node.tag);
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: bind the realized keyboard actions onto
  // the declared `when` part's node. The handler ident is part-derived and
  // the co-located runes hook emits its implementation from the same IR
  // facts. The composite item part's handler receives the item value exactly
  // as the item's click activation passes it, so pointer and keyboard
  // commits stay semantically identical.
  const isCompositeItem = ctx.compositeItemPart !== undefined && node.part === ctx.compositeItemPart;
  if (node.keyboardActions && node.keyboardActions.length > 0 && node.part) {
    const handlerIdent = `${ctx.hookVar}.handle${capitalizeSvelte(node.part)}Keydown`;
    if (isCompositeItem && ctx.compositeMemberExpr) {
      const memberExpr = renderSvelteBindingValue(ctx.compositeMemberExpr, ctx);
      if (memberExpr !== null) {
        attrs.push(`onkeydown={(e) => ${handlerIdent}(e, ${memberExpr})}`);
      }
    } else {
      attrs.push(`onkeydown={${handlerIdent}}`);
    }
    // A keyboard host that is not natively focusable must become
    // programmatically focusable so the delegated keys can fire and Svelte's
    // a11y compiler checks hold; -1 keeps it out of tab order.
    if (isCompositeItem || !NATIVE_FOCUSABLE_TAGS.has(node.tag)) {
      attrs.push('tabindex="-1"');
    }
  } else if (isCompositeItem) {
    // Composite roving item without its own keydown: still a roving focus
    // target — focusable for the roving focus path but out of tab order
    // (APG roving tabindex with DOM focus tracking).
    attrs.push('tabindex="-1"');
  }

  for (const [key, expr] of Object.entries(node.bindings)) {
    if (key === "textContent" || key === "children") {
      if (textContentExpr === null) {
        textContentExpr = renderSvelteTextChildExpression(expr, ctx);
      }
      continue;
    }
    // Dual-pathway dedup for events.
    if (/^on[A-Z]/.test(key)) {
      const evt = key.slice(2).toLowerCase();
      if (node.events[evt]) continue;
    }
    const rendered = renderSvelteBinding(svelteAttrName(key), expr, ctx, node.tag);
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: generated per-instance id on
  // relationship targets, and the lowered idref attributes on sources.
  if (node.generatedIdSlug !== undefined) {
    attrs.push(`id={${svelteGeneratedIdExpr(node.generatedIdSlug)}}`);
  }
  for (const refAttr of node.idRefAttrs) {
    attrs.push(
      `${refAttr.attribute}={${svelteIdRefListExpr(refAttr.refs, refAttr.passthroughProp)}}`,
    );
  }

  // IR-DOM-CSS-VAR-BINDING-01: lower `cssVarBindings` to Svelte 5's
  // `style:--fsds-foo={expr}` directive form, one per binding. This
  // idiomatic form sets a single CSS custom property without touching
  // the rest of the element's inline style, and svelte-check accepts
  // arbitrary `--*` names. A literal `style` attr coexisting with
  // cssVarBindings is rejected by the IR builder.
  for (const { varName, value } of node.cssVarBindings) {
    const valueExpr = renderSvelteBindingValue(value, ctx);
    if (valueExpr === null) continue;
    attrs.push(`style:${varName}={${valueExpr}}`);
  }

  // DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01: propertyBindings
  // are DOM-property-only facts (e.g. `indeterminate`) with no HTML
  // attribute form. Svelte 5's compiler already resolves plain
  // `attr={expr}` to a direct property assignment (`el.indeterminate =
  // value`, not setAttribute) for any name in its own DOM_PROPERTIES
  // list — confirmed against the installed svelte package's
  // RegularElement transform (`is_dom_property` branch), which includes
  // `indeterminate` via DOM_BOOLEAN_ATTRIBUTES. No new syntax is needed:
  // reusing `renderSvelteBinding` is sufficient, the same mechanism
  // already proven live for `checked`/`disabled`/`value` above.
  for (const [key, expr] of Object.entries(node.propertyBindings)) {
    const rendered = renderSvelteBinding(key, expr, ctx, node.tag);
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // FIX-OVERLAY-CLICK-DISMISSAL-BINDING-01: the dismissal click binds on the
  // declared targetPart element (the full-cover overlay), never on the root —
  // the root is pointer-events:none under the overlay and can never be the
  // hit target. Only fire when the user clicked the overlay itself, not a
  // descendant — avoids needing a stopPropagation handler on the inner panel
  // (which would trip a11y_click_events_have_key_events on non-interactive
  // panel elements).
  if (
    ctx.overlayClickSetter &&
    node.part !== undefined &&
    node.part === ctx.overlayClickTargetPart
  ) {
    const enabledVar = ctx.overlayClickEnabledProp
      ? jsAccessorFor(ctx.overlayClickEnabledProp)
      : null;
    const guardExpr = enabledVar
      ? `${enabledVar} !== false && ${ctx.overlayClickSetter}(false)`
      : `${ctx.overlayClickSetter}(false)`;
    attrs.push(
      `onclick={(e) => { if (e.target === e.currentTarget) { ${guardExpr}; } }}`,
    );
  }

  if (
    ctx.fieldAssociationConsumerPart &&
    ctx.fieldAssociationConsumerPart === node.part
  ) {
    attrs.push(`id={fieldAssociation?.().controlId}`);
    attrs.push(`aria-describedby={fieldAssociation?.().describedBy}`);
  }

  if (ctx.isRoot) {
    attrs.unshift(`class={classes}`);
    if (ctx.cssPrefix) {
      attrs.push(`data-fsds-component="${ctx.cssPrefix}" data-fsds-box=""`);
    }
    if (ctx.rootUsePortal) {
      attrs.push(`use:portal={{ enabled: true }}`);
    }
    // Selector-anchored root: measured ref, fixed-position style computed
    // against the active step's page anchor, hidden until the first
    // measurement so the panel never flashes at (0,0).
    if (ctx.rootSelectorAnchored) {
      attrs.push(`bind:this={anchoredRootEl}`);
      attrs.push(`data-placement={anchoredPosition.state.placement}`);
      attrs.push(
        `style="position: fixed; top: {anchoredPosition.state.top}px; left: {anchoredPosition.state.left}px; visibility: {anchoredPosition.state.ready ? 'visible' : 'hidden'};"`,
      );
    }
    if (ctx.rootPolymorphicTag && !node.componentRef) {
      attrs.unshift(
        `this={${jsAccessorFor(ctx.rootPolymorphicTag.propName)} ?? "${ctx.rootPolymorphicTag.defaultTag}"}`,
      );
    }
    if (ctx.autoDismissPause) {
      attrs.push(
        `onpointerenter={autoDismiss.pauseListeners.onpointerenter}`,
        `onpointerleave={autoDismiss.pauseListeners.onpointerleave}`,
        `onfocusin={autoDismiss.pauseListeners.onfocusin}`,
        `onfocusout={autoDismiss.pauseListeners.onfocusout}`,
      );
    }
    // Only emit role if the anatomy.dom.attrs doesn't already declare one
    // (avoids duplicate `role="..."` when contract specifies both
    // a11y.role and an explicit attrs.role on the root node).
    if (ctx.rootRole && !("role" in node.attrs) && !("role" in node.bindings)) {
      attrs.push(`role="${ctx.rootRole}"`);
    }
  } else if (classParts.length > 0) {
    if (classParts.length === 1) {
      attrs.unshift(`class={${classParts[0]}}`);
    } else {
      attrs.unshift(`class={[${classParts.join(", ")}].join(' ')}`);
    }
  }

  const childCtx: SvelteRenderContext = {
    ...ctx,
    isRoot: false,
    preformatted: compact,
    rootUsePortal: false,
    rootSelectorAnchored: false,
    rootRole: undefined,
  };
  const renderedChildren = node.children.map((c) =>
    renderSvelteDomNode(c, childCtx, childIndent),
  );

  // componentRef: render the referenced component by its PascalCase name.
  // Svelte resolves a capitalized tag to an imported component; `attr={expr}`
  // bindings pass identically to a component prop or an HTML attribute.
  const tag =
    ctx.isRoot && ctx.rootPolymorphicTag && !node.componentRef
      ? "svelte:element"
      : node.componentRef ?? node.tag;
  const isVoidEl = node.componentRef
    ? true
    : VOID_HTML_ELEMENTS_SVELTE.has(tag);

  // ICON-CATALOG-RUNTIME-DELIVERY-01: a glyph node's svg surface comes from
  // the resolved catalog record — data-fsds-icon + viewBox + width/height
  // attrs here, one <path> per glyph path record via {#each} as the svg's
  // only content (the IR guarantees a glyph node has no other children),
  // and (below) an `{#if}` guard so an unknown icon name renders nothing.
  const iconGlyphEntry = ctx.iconGlyphIdents?.get(node);
  let iconGlyphEachLines: string[] | null = null;
  if (iconGlyphEntry) {
    const { glyphIdent, pxIdent } = iconGlyphEntry;
    attrs.push(`data-fsds-icon={${glyphIdent}.name}`);
    attrs.push(`viewBox={${glyphIdent}.viewBox}`);
    const sizeExpr = pxIdent
      ? `${pxIdent} ?? ${glyphIdent}.size`
      : `${glyphIdent}.size`;
    attrs.push(`width={${sizeExpr}}`);
    attrs.push(`height={${sizeExpr}}`);
    const childPad = " ".repeat(childIndent);
    const pathAttrs = ICON_GLYPH_PATH_ATTRS.map(
      ({ recordKey, svgAttr }) => `${svgAttr}={glyphPath.${recordKey}}`,
    ).join(" ");
    iconGlyphEachLines = [
      `${childPad}{#each ${glyphIdent}.paths as glyphPath, glyphIndex (glyphIndex)}`,
      `${compact ? "" : `${childPad}  `}<path ${pathAttrs} />`,
      `${childPad}{/each}`,
    ];
  }

  let body: string;
  if (iconGlyphEntry && iconGlyphEachLines) {
    // svg node with iconGlyph: the {#each} block is the only content —
    // never merged with textContent/renderedChildren (mutually exclusive
    // upstream in the IR builder).
    body = [
      `${pad}<${tag}${formatSvelteAttrs(attrs)}>`,
      ...iconGlyphEachLines,
      `${pad}</${tag}>`,
    ].join(separator);
  } else if (renderedChildren.length === 0 && isVoidEl) {
    body = `${pad}<${tag}${formatSvelteAttrs(attrs)} />`;
  } else if (renderedChildren.length === 0 && textContentExpr !== null) {
    // textContent binding without other children: inline the
    // expression as the element's text body.
    body = `${pad}<${tag}${formatSvelteAttrs(attrs)}>${textContentExpr}</${tag}>`;
  } else if (renderedChildren.length === 0) {
    body = `${pad}<${tag}${formatSvelteAttrs(attrs)}></${tag}>`;
  } else if (textContentExpr !== null) {
    // textContent + other children: text first, then children. The
    // contract treats textContent as the leading text node.
    body = [
      `${pad}<${tag}${formatSvelteAttrs(attrs)}>${textContentExpr}`,
      ...renderedChildren,
      `${pad}</${tag}>`,
    ].join(separator);
  } else {
    body = [
      `${pad}<${tag}${formatSvelteAttrs(attrs)}>`,
      ...renderedChildren,
      `${pad}</${tag}>`,
    ].join(separator);
  }

  // iconGlyph null-guard: an unknown icon name resolves to undefined and the
  // svg (whose attrs dereference the glyph record) must not render at all.
  if (iconGlyphEntry) {
    body = [`${pad}{#if ${iconGlyphEntry.glyphIdent}}`, body, `${pad}{/if}`].join(separator);
  }

  let withIfGuard = body;
  if (node.ifProp || node.ifSlot) {
    let expr: string;
    if (node.ifSlot) {
      // A named slot is a snippet prop of the same name.
      expr = node.ifSlot;
    } else if (node.ifProp === "children") {
      expr = "children";
    } else if (node.ifProp && ctx.iterationScope?.has(node.ifProp)) {
      // IR-DOM-ITERATE-CAPABILITY-01: bare iteration-alias reference.
      expr = node.ifProp;
    } else {
      const matchingChannel = [...ctx.channelByName.values()].find(
        (c) => c.valueProp === node.ifProp || c.name === node.ifProp,
      );
      expr = matchingChannel
        ? `${ctx.hookVar}.${matchingChannel.name}`
        : jsAccessorFor(node.ifProp!);
    }
    const condition = node.ifNegated ? `!${expr}` : expr;
    withIfGuard = [`${pad}{#if ${condition}}`, body, `${pad}{/if}`].join(separator);
  }

  // IR-DOM-ITERATE-CAPABILITY-01: apply the {#each} wrap as the
  // outermost layer. If-guard nests INSIDE the loop so each iteration
  // re-evaluates the guard against the per-iteration scope. Key the
  // iteration on `indexVar` — sufficient for the current contract
  // surface (count-iteration and non-reorderable arrays).
  //
  //   kind="array": {#each items as item, index (index)} ... {/each}
  //   kind="count": {#each Array(count) as _, index (index)} ... {/each}
  //
  // Svelte 5's destructure-in-{#each} accepts `_` as a discarded
  // item; Array(N) yields an iterable of length N with undefined slots,
  // giving 0-based index parity with the other frameworks.
  if (node.iteration) {
    const { kind, source, indexVar, itemVar } = node.iteration;
    // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: route iteration source
    // through the binding-value renderer for invariant consistency across
    // emitters. For Svelte the practical effect is small — `prop:X`
    // lowers to the same bare identifier the destructured `$props` exposes
    // — but channel-driven sources (`channel:X.value` → `${hookVar}.X`)
    // now resolve to the hook's controllable-state value rather than the
    // raw `$props` field.
    const sourceExpr = renderSvelteBindingValue(source, ctx);
    if (sourceExpr === null) {
      throw new Error(
        `Svelte emitter: iteration source could not be lowered (source kind=${source.kind})`,
      );
    }
    const head =
      kind === "array"
        ? `{#each (${sourceExpr} ?? []) as ${itemVar}, ${indexVar} (${indexVar})}`
        : `{#each Array(${sourceExpr}) as _, ${indexVar} (${indexVar})}`;
    return [`${pad}${head}`, withIfGuard, `${pad}{/each}`].join(separator);
  }
  return withIfGuard;
}

function escapeAttrValue(s: string): string {
  return s.replace(/"/g, "&quot;");
}

function formatSvelteAttrs(attrs: string[]): string {
  if (attrs.length === 0) return "";
  return " " + attrs.join(" ");
}

/**
 * Render a contract binding intended for an element's text content
 * as a Svelte template-text expression (e.g. `{summary}`). The
 * caller splices the result inside the open/close tags of the
 * owning element. Returns null for binding kinds that don't map to
 * text content (channels with no value field, etc.).
 */
/**
 * Lower a `prop:X` reference to a Svelte template accessor. When `X`
 * is an in-scope iteration alias (item/index introduced by an
 * enclosing `{#each}`), emit the bare identifier — `jsAccessorFor`
 * would camelCase-mangle a hyphenated alias name. For default alias
 * names (`item`, `index`) `jsAccessorFor` is a no-op, so this check is
 * defensive against future renames. IR-DOM-ITERATE-CAPABILITY-01.
 */
/**
 * FEAT-MARKDOWN-CONTENT-TRANSFORM-01 — Svelte lowering of the markdown
 * transform: file-level recursive snippets (Svelte 5's idiom for
 * recursive template structures). One transform per tree (validated
 * upstream); tags/classes/attrs come from the IR fact. Snippets are
 * hoisted, so mutual recursion between block and mark snippets compiles.
 */
function generateSvelteMarkdownSnippets(ir: ComponentIR): string {
  const transform = collectContentTransforms(ir.dom).find(isMarkdownTransform);
  if (!transform) return "";
  const prefix = ir.classRecipe.base;
  const b = transform.blockParts;
  const bt = transform.blockTags;
  const m = transform.markParts;
  const mt = transform.markTags;
  const blockClass = (part: string): string => `${prefix}__${part}`;
  const markChildren = (): string =>
    `{#each mark.children as child, childIndex}{@render markdownMark(child, childIndex)}{/each}`;
  const blockMarks = (): string =>
    `{#each block.children as mark, markIndex}{@render markdownMark(mark, markIndex)}{/each}`;
  const blockItems = (): string =>
    `{#each block.items as item, itemIndex}{@render markdownBlock(item, itemIndex)}{/each}`;
  return [
    `{#snippet markdownBlock(block: MarkdownBlock, blockIndex: number)}`,
    `  {#if block.kind === "heading"}`,
    `    <${bt.heading} class="${blockClass(b.heading)}" data-block-kind="heading" data-block-kind-level={block.level}>${blockMarks()}</${bt.heading}>`,
    `  {:else if block.kind === "paragraph"}`,
    `    <${bt.paragraph} class="${blockClass(b.paragraph)}" data-block-kind="paragraph">${blockMarks()}</${bt.paragraph}>`,
    `  {:else if block.kind === "list"}`,
    `    {#if block.ordered}`,
    `      <${bt.orderedList} class="${blockClass(b.orderedList)}" data-block-kind="orderedList">${blockItems()}</${bt.orderedList}>`,
    `    {:else}`,
    `      <${bt.unorderedList} class="${blockClass(b.unorderedList)}" data-block-kind="unorderedList">${blockItems()}</${bt.unorderedList}>`,
    `    {/if}`,
    `  {:else if block.kind === "listItem"}`,
    `    <${bt.listItem} class="${blockClass(b.listItem)}" data-block-kind="listItem">${blockMarks()}</${bt.listItem}>`,
    `  {:else if block.kind === "codeBlock"}`,
    `    <${bt.codeBlock} class="${blockClass(b.codeBlock)}" data-block-kind="codeBlock" data-language={block.language}>{block.text}</${bt.codeBlock}>`,
    `  {:else if block.kind === "blockquote"}`,
    `    <${bt.blockquote} class="${blockClass(b.blockquote)}" data-block-kind="blockquote">${blockMarks()}</${bt.blockquote}>`,
    `  {/if}`,
    `{/snippet}`,
    ``,
    `{#snippet markdownMark(mark: MarkdownMark, markIndex: number)}`,
    `  {#if mark.kind === "text"}`,
    `    {mark.text}`,
    `  {:else if mark.kind === "code"}`,
    `    <${mt.code} class="${prefix}__${m.code}" data-mark-kind="code">{mark.text}</${mt.code}>`,
    `  {:else if mark.kind === "emphasis"}`,
    `    <${mt.emphasis} class="${prefix}__${m.emphasis}" data-mark-kind="emphasis">${markChildren()}</${mt.emphasis}>`,
    `  {:else if mark.kind === "strong"}`,
    `    <${mt.strong} class="${prefix}__${m.strong}" data-mark-kind="strong">${markChildren()}</${mt.strong}>`,
    `  {:else if mark.kind === "link"}`,
    `    {#if mark.href === null}`,
    `      <span>${markChildren()}</span>`,
    `    {:else}`,
    `      <${mt.link} class="${prefix}__${m.link}" data-mark-kind="link" href={mark.href}>${markChildren()}</${mt.link}>`,
    `    {/if}`,
    `  {/if}`,
    `{/snippet}`,
  ].join("\n");
}

function sveltePropAccessor(propName: string, ctx: SvelteRenderContext): string {
  // Post-V2 (BINDING-EXPRESSION-V2-01): iteration locals reach the
  // emitter as `iterationLocal`-kind bindings, never as `prop:`
  // bindings — so a `prop:X` accessor here is always a real component
  // prop. The legacy `iterationScope.has(propName)` shortcut is
  // intentionally removed.
  void ctx;
  return jsAccessorFor(propName);
}

/**
 * Append a dotted property path to a base Svelte expression.
 * BINDING-EXPRESSION-V2-PATH-01.
 */
function appendPath(base: string, path: readonly string[] | undefined): string {
  if (!path || path.length === 0) return base;
  return `${base}.${path.join(".")}`;
}

/**
 * Resolve an `iterationLocal`-kind binding to the Svelte `{#each}`
 * scope variable name. Svelte emits
 * `{#each ... as item, index}` (array) or
 * `{#each ... as _, index}` (count) — the bare identifier matches the
 * iteration's declared `itemVar` / `indexVar`.
 */
function svelteIterationLocalName(
  local: "index" | "item",
  ctx: SvelteRenderContext,
): string | null {
  const it = ctx.enclosingIteration;
  if (!it) return null;
  if (local === "index") return it.indexVar;
  return it.itemVar ?? null;
}

function renderSvelteTextChildExpression(
  expr: BindingExpression,
  ctx: SvelteRenderContext,
): string | null {
  switch (expr.kind) {
    case "prop":
      return `{${appendPath(sveltePropAccessor(expr.prop, ctx), expr.path)}}`;
    case "literal":
      return escapeAttrValue(expr.value);
    case "iterationLocal": {
      const name = svelteIterationLocalName(expr.local, ctx);
      return name ? `{${appendPath(name, expr.path)}}` : null;
    }
    case "projection": {
      const lowered = renderSvelteBindingValue(expr, ctx);
      return lowered === null ? null : `{${lowered}}`;
    }
    case "valueMap": {
      const lowered = renderSvelteBindingValue(expr, ctx);
      return lowered === null ? null : `{${lowered}}`;
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") {
        return `{${appendPath(`${ctx.hookVar}.${ch.name}`, expr.path)}}`;
      }
      return null;
    }
    case "channelCall":
      // FEAT-BINDING-CALL-WITH-ARG-01: event-position only; rejected in
      // content position by the IR validator. Null keeps the switch exhaustive.
      return null;
    case "channelUpdate":
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: event-position only; rejected in
      // content position by the IR validator.
      return null;
    case "predicate": {
      // BINDING-EXPRESSION-V2-PREDICATE-01: defensive. Validator rejects
      // predicates in content position; this branch keeps the switch
      // exhaustive if a future site admits them.
      const lowered = renderSveltePredicate(expr, ctx);
      return lowered === null ? null : `{${lowered}}`;
    }
    case "conditional": {
      const lowered = renderSvelteBindingValue(expr, ctx);
      return lowered === null ? null : `{${lowered}}`;
    }
  }
}

/**
 * Lower a BindingExpression to a bare Svelte template expression (no
 * `attr={...}` scaffolding). Used by callers that splice the expression
 * into a surrounding template construct — `cssVarBindings` ->
 * `style:--fsds-foo={<expr>}`, future `{#each}` source expressions, etc.
 * Returns null for binding kinds that can't appear in an expression
 * position (e.g. channel events).
 */
function renderSvelteBindingValue(
  expr: BindingExpression,
  ctx: SvelteRenderContext,
): string | null {
  switch (expr.kind) {
    case "prop":
      return appendPath(sveltePropAccessor(expr.prop, ctx), expr.path);
    case "literal":
      return JSON.stringify(expr.value);
    case "iterationLocal": {
      const name = svelteIterationLocalName(expr.local, ctx);
      return name ? appendPath(name, expr.path) : null;
    }
    case "projection": {
      const source = renderSvelteBindingValue(expr.source, ctx);
      return source === null
        ? null
        : expr.op === "selectionLabel"
          ? composeBindingProjectionExpression(expr.op, source, renderSvelteBindingValue(expr.selection, ctx) ?? "undefined", renderSvelteBindingValue(expr.fallback, ctx) ?? "undefined")
          : composeBindingProjectionExpression(expr.op, source);
    }
    case "valueMap": {
      const source = renderSvelteBindingValue(expr.source, ctx);
      return source === null ? null : composeValueMapExpression(expr, source);
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") return appendPath(`${ctx.hookVar}.${ch.name}`, expr.path);
      if (expr.field === "defaultValue" && ch.defaultValueProp) {
        return jsAccessorFor(ch.defaultValueProp);
      }
      return null;
    }
    case "channelCall":
      // FEAT-BINDING-CALL-WITH-ARG-01: event-position only; produces a
      // `() => …` handler, not a value. The IR rejects it in value positions.
      return null;
    case "channelUpdate":
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: event-position only; produces a
      // handler, not a value. The IR rejects it in value positions.
      return null;
    case "predicate":
      // BINDING-EXPRESSION-V2-PREDICATE-01.
      return renderSveltePredicate(expr, ctx);
    case "conditional": {
      const condition = renderSvelteBindingValue(expr.condition, ctx);
      const whenTrue = renderSvelteBindingValue(expr.whenTrue, ctx);
      const whenFalse = renderSvelteBindingValue(expr.whenFalse, ctx);
      if (condition === null || whenTrue === null || whenFalse === null) return null;
      return `(${condition} ? ${whenTrue} : ${whenFalse})`;
    }
  }
}

/**
 * Lower a predicate-kind binding to a Svelte template expression
 * string (no `{ }` scaffold). Operand accessors come from
 * `renderSvelteBindingValue` so they pick up the idiomatic Svelte
 * shapes (`X` for props in legacy components, `hook.X` for channels,
 * iter locals introduced by `{#each}` scope).
 */
function renderSveltePredicate(
  expr: BindingExpression & { kind: "predicate" },
  ctx: SvelteRenderContext,
): string | null {
  const left = renderSvelteBindingValue(expr.left, ctx);
  const right = renderSvelteBindingValue(expr.right, ctx);
  if (left === null || right === null) return null;
  return loweredSveltePredicate(expr.op, left, right);
}

function loweredSveltePredicate(op: BindingPredicateOp, left: string, right: string): string {
  switch (op) {
    case "eq":
      return `(${left} === ${right})`;
    case "contains":
      return `((${left} ?? []).includes(${right}))`;
    case "memberOf":
      return `(Array.isArray(${right}) ? ${right}.includes(${left}) : ${left} === ${right})`;
  }
}

function renderSvelteBinding(
  attr: string,
  expr: BindingExpression,
  ctx: SvelteRenderContext,
  hostTag?: string,
): string | null {
  switch (expr.kind) {
    case "prop":
      return `${attr}={${appendPath(sveltePropAccessor(expr.prop, ctx), expr.path)}}`;
    case "literal":
      return `${attr}="${escapeAttrValue(expr.value)}"`;
    case "iterationLocal": {
      const name = svelteIterationLocalName(expr.local, ctx);
      return name ? `${attr}={${appendPath(name, expr.path)}}` : null;
    }
    case "projection": {
      const lowered = renderSvelteBindingValue(expr, ctx);
      return lowered === null ? null : `${attr}={${lowered}}`;
    }
    case "valueMap": {
      const lowered = renderSvelteBindingValue(expr, ctx);
      return lowered === null ? null : `${attr}={${lowered}}`;
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") {
        // ARIA-Booleanish coercion: aria-expanded / aria-pressed /
        // aria-selected / aria-checked / aria-busy / aria-current /
        // aria-disabled / aria-hidden / aria-grabbed accept
        // Booleanish | null | undefined in svelte-check's DOM
        // typings. When the channel valueType is not boolean (e.g.
        // Accordion's "openness" is string | string[]), passing the
        // raw value is admission-red. Coerce to Boolean so the
        // attribute reflects "truthy" — matching React's existing
        // emitter behavior.
        //
        // Note: ARIA coercion applies to the base channel value only.
        // When a path is present, the result is a projection of the
        // channel value — semantically a different type — and the
        // contract author has opted into emitting the projected value
        // directly. Coercion would silently mask shape mismatches.
        const base = appendPath(`${ctx.hookVar}.${ch.name}`, expr.path);
        if (
          (expr.path === undefined || expr.path.length === 0) &&
          ARIA_BOOLEANISH_ATTRS.has(attr) &&
          ch.valueType !== undefined &&
          ch.valueType !== "boolean"
        ) {
          return `${attr}={Boolean(${base})}`;
        }
        return `${attr}={${base}}`;
      }
      if (expr.field === "defaultValue") {
        if (!ch.defaultValueProp) return null;
        return `${attr}={${jsAccessorFor(ch.defaultValueProp)}}`;
      }
      // onChange synthesis. The framework-neutral fact "how does this
      // host expose the channel value to a DOM event listener" lives
      // in `resolveEventValueStrategy` in semantics.ts — see
      // docs/codegen-authority.md (ARCH-CODEGEN-AUTHORITY-001) for
      // why this is shared semantics, not a Svelte-emitter local.
      const eventName = mapJsxEventToSvelteAttr(attr);
      const strategy = resolveEventValueStrategy({
        hostTag: hostTag ?? "",
        channelValueType: ch.valueType,
        callbackKind: ch.callbackKind === "event" ? "event" : "value",
      });
      if (strategy === "event") {
        return `${eventName}={${jsAccessorFor(ch.changeHandlerProp)}}`;
      }
      const setter = `set${capitalizeSvelte(ch.name)}`;
      switch (strategy) {
        case "checked":
          return `${eventName}={(e) => ${ctx.hookVar}.${setter}((e.currentTarget as HTMLInputElement).checked)}`;
        case "numberValue":
          return `${eventName}={(e) => ${ctx.hookVar}.${setter}(Number((e.currentTarget as HTMLInputElement).value))}`;
        case "value": {
          // Form-control hosts have `.value` on HTMLInputElement;
          // non-form-control hosts shim via a structural type so the
          // emit stays admissible without claiming the host is an input.
          const isFormControl =
            ch.valueType === "string" || ch.valueType === "number"
              ? hostTag === "input" || hostTag === "select" || hostTag === "textarea"
              : false;
          if (!isFormControl) {
            return `${eventName}={(e) => ${ctx.hookVar}.${setter}((e.currentTarget as HTMLElement & { value?: string }).value ?? "")}`;
          }
          return `${eventName}={(e) => ${ctx.hookVar}.${setter}((e.currentTarget as HTMLInputElement).value)}`;
        }
        case "toggle":
          return `${eventName}={() => ${ctx.hookVar}.${setter}(!${ctx.hookVar}.${ch.name})}`;
      }
      // Exhaustive inner switch above; defensive return so eslint's
      // no-fallthrough rule sees a terminator before the next case.
      return null;
    }
    case "channelCall": {
      // FEAT-BINDING-CALL-WITH-ARG-01: invoke the channel's setter WITH the
      // per-item payload. Emits `onclick={() => hook.setSelection(item.value)}`.
      // The argument is a bare Svelte template expression so `iter:item.value`
      // resolves to the `{#each}` alias, matching the iteration lowering.
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      const eventName = mapJsxEventToSvelteAttr(attr);
      const setter = `set${capitalizeSvelte(ch.name)}`;
      const argExpr = renderSvelteBindingValue(expr.arg, ctx);
      if (argExpr === null) return null;
      return `${eventName}={() => ${ctx.hookVar}.${setter}(${argExpr})}`;
    }
    case "channelUpdate": {
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: compose the next value inline and
      // pass it through the canonical hook setter. Svelte template
      // expressions permit the full JS body, so no synthesized helper.
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      const eventName = mapJsxEventToSvelteAttr(attr);
      const setter = `set${capitalizeSvelte(ch.name)}`;
      const operands = expr.operands.map((o) => renderSvelteBindingValue(o, ctx));
      if (operands.some((o) => o === null)) return null;
      const body = composeChannelUpdateExpression(expr.op, {
        current: `${ctx.hookVar}.${ch.name}`,
        setter: `${ctx.hookVar}.${setter}`,
        eventValue: "(e.currentTarget as HTMLInputElement).value",
        operands: operands as string[],
      });
      const param = expr.op === "setCharAt" ? "(e)" : "()";
      return `${eventName}={${param} => ${body}}`;
    }
    case "predicate": {
      // BINDING-EXPRESSION-V2-PREDICATE-01: the predicate result is
      // always boolean, so no ARIA-Booleanish coercion is needed —
      // svelte-check accepts `boolean | undefined | null` for the
      // ARIA-Booleanish attribute slot.
      const lowered = renderSveltePredicate(expr, ctx);
      return lowered === null ? null : `${attr}={${lowered}}`;
    }
    case "conditional": {
      const lowered = renderSvelteBindingValue(expr, ctx);
      return lowered === null ? null : `${attr}={${lowered}}`;
    }
  }
}

/**
 * Translate React-style camelCase attribute names that aren't valid HTML
 * attributes into their HTML-native equivalents for Svelte templates.
 * Svelte 5 warns when invalid attribute names appear in templates (e.g.
 * `htmlFor` instead of `for`). Event handlers are translated separately
 * by `mapJsxEventToSvelteAttr` — this helper only handles non-event attrs.
 */
function svelteAttrName(name: string): string {
  if (name === "htmlFor") return "for";
  return name;
}

/**
 * Lower an entry from `node.events` (keyed by unprefixed event name like
 * `click`) into Svelte 5's `oneventname={...}` form. For `prop:X` returns
 * `onclick={X}`. Channel-routed events follow the existing channel
 * handling (using `resolveEventValueStrategy`) by delegating to the
 * synthetic JSX-attr name path in renderSvelteBinding.
 */
/**
 * Build the bare handler EXPRESSION for a componentRef event (no `onclick=`
 * wrapper) so it can be assigned to the target component's resolved handler
 * prop, e.g. `onClick={onDismiss}`. Only `prop:`/`channel:` handler sources
 * are meaningful here; other kinds return null (the caller drops the attr).
 */
function renderSvelteEventHandlerExpr(
  expr: BindingExpression,
  ctx: SvelteRenderContext,
): string | null {
  if (expr.kind === "prop") return sveltePropAccessor(expr.prop, ctx);
  return null;
}

function renderSvelteEvent(
  eventName: string,
  expr: BindingExpression,
  ctx: SvelteRenderContext,
  hostTag?: string,
): string | null {
  // Svelte 5: event attribute is the lowercased event name without
  // the `on:` directive prefix used by Svelte 4.
  const svelteEventAttr = `on${eventName}`;
  switch (expr.kind) {
    case "prop":
      return `${svelteEventAttr}={${sveltePropAccessor(expr.prop, ctx)}}`;
    case "literal":
      // Rare. Emit as a string handler — consumer-error territory.
      return `${svelteEventAttr}="${escapeAttrValue(expr.value)}"`;
    case "iterationLocal": {
      // Iteration locals are values, not handlers. Surface null so the
      // caller drops the attribute. Defensive — the IR validator would
      // already reject a contract that wires iter:index to an event.
      void ctx;
      return null;
    }
    case "projection":
      return null;
    case "valueMap":
      return null;
    case "channel": {
      // Delegate to the channel-onChange path in renderSvelteBinding by
      // re-deriving the synthetic JSX-attr name. resolveEventValueStrategy
      // there handles host-tag-specific value extraction.
      const jsxAttr = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      return renderSvelteBinding(jsxAttr, expr, ctx, hostTag);
    }
    case "channelCall": {
      // FEAT-BINDING-CALL-WITH-ARG-01: delegate to the channelCall path in
      // renderSvelteBinding (which emits the `() => hook.setX(arg)` handler).
      const jsxAttr = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      return renderSvelteBinding(jsxAttr, expr, ctx, hostTag);
    }
    case "channelUpdate": {
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: delegate to renderSvelteBinding,
      // which emits the composed `(e) => hook.setX(...)` handler.
      const jsxAttr = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      return renderSvelteBinding(jsxAttr, expr, ctx, hostTag);
    }
    case "predicate":
      // BINDING-EXPRESSION-V2-PREDICATE-01: predicates are boolean,
      // not callable. The IR validator rejects predicate-in-event at
      // build time; this case keeps the switch exhaustive.
      return null;
    case "conditional":
      return null;
  }
}

function mapJsxEventToSvelteAttr(attr: string): string {
  if (attr === "onChange") return "onchange";
  if (attr === "onClick") return "onclick";
  if (attr === "onInput") return "oninput";
  if (attr === "onKeyDown") return "onkeydown";
  if (attr === "onKeyUp") return "onkeyup";
  if (attr === "onFocus") return "onfocus";
  if (attr === "onBlur") return "onblur";
  if (attr.startsWith("on") && attr.length > 2) {
    return attr.toLowerCase();
  }
  return attr;
}

function capitalizeSvelte(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

const VOID_HTML_ELEMENTS_SVELTE = new Set([
  "area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "source", "track", "wbr",
]);

/**
 * ARIA attributes typed as `Booleanish | null | undefined` in
 * svelte-check's DOM typings. When a contract binds one of these
 * to a non-boolean channel value (e.g. Accordion's `openness`
 * channel is `string | string[]`), the Svelte emitter must coerce
 * the value with `Boolean(...)` so the resulting attribute passes
 * admission. Mirrors React's existing coercion behavior.
 */
const ARIA_BOOLEANISH_ATTRS = new Set([
  "aria-expanded",
  "aria-pressed",
  "aria-selected",
  "aria-checked",
  "aria-busy",
  "aria-disabled",
  "aria-hidden",
  "aria-grabbed",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-readonly",
  "aria-required",
]);
