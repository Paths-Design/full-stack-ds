import { sequenceConfig } from "../../sequence.js";
/**
 * Vue 3 SFC emission, IR-driven.
 *
 * Output shape (single file component):
 *
 *   <script setup lang="ts">
 *   import { computed } from "vue";
 *   import { Stack } from "../../primitives/index.js";
 *
 *   interface Props { ... }
 *   const props = withDefaults(defineProps<Props>(), { ... });
 *   const classNames = computed(() => [ ... ].filter(Boolean).join(" "));
 *   </script>
 *
 *   <template>
 *     <Stack :class="classNames" ...>
 *       <slot />
 *     </Stack>
 *   </template>
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
  TABLE_COMPOSITION_TAGS,
  NATIVE_FOCUSABLE_TAGS,
  nativeTableAttrsFor,
  canonicalTsType,
  composeBindingProjectionExpression,
  composeChannelUpdateExpression,
  composeValueMapExpression,
  collectContentTransforms,
  compositeActivationMember,
  groupKeyboardActionsByPart,
  isHighlightTransform,
  isMarkdownTransform,
  contentBindingOrTransformSource,
  keyboardModeGateProps,
  focusTargetProps,
  type NativeTableAttr,
} from "../../ir.js";

/** Vue prop TS type for a forwarded native table attribute (template `style` is a string). */
function vueTableAttrType(attr: NativeTableAttr): string {
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

/** Lowercase HTML attribute spelling used at the Vue template bind site. */
function vueTableAttrHtmlName(attr: NativeTableAttr): string {
  switch (attr) {
    case "colSpan":
      return "colspan";
    case "rowSpan":
      return "rowspan";
    default:
      return attr; // id, style, scope
  }
}
import {
  emitNonReactTypeAliases,
  translateNonReactType,
} from "../../non-react-types.js";
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
  getGroupHostOrnamentPart,
  getGroupHostPart,
  getInteractiveItemPart,
  getMultipleItemPart,
  getRegionPart,
  isCompoundStateContainer,
  isDisclosureContainer,
} from "../react/hook-source.js";

// Props handled natively by Vue: class via :class binding, style passthrough,
// children via <slot />, className is the React convention for class (skip it).
const VUE_SKIP_PROPS = new Set(["class", "style", "children", "className"]);

/**
 * Emit a Vue 3 Single File Component for a `ComponentIR`. The script
 * block is partitioned into the same marker regions React uses
 * (imports/types/component/trailing); template + style are simple
 * single-region blocks for now (template surface is small enough that
 * users override entire SFCs rather than splice template fragments).
 */
export function generateVueComponentSource(ir: ComponentIR): string {
  if (isDisclosureContainer(ir)) {
    return generateVueDisclosureStateRootSource(ir);
  }
  if (isCompoundStateContainer(ir)) {
    return generateVueCompoundStateRootSource(ir);
  }
  if (ir.dom) {
    return generateVueDomTreeComponentSource(ir);
  }
  const importsBody = [
    `import { computed } from "vue";`,
    `import { Stack } from "../../primitives/index.js";`,
  ].join("\n");

  const typesBody = emitNonReactTypeAliases(ir).join("\n");
  const propsInterfaceBody = generatePropsInterface(ir);
  const definePropsBody = generateDefineProps(ir);
  const classesBody = generateClassesComputed(ir);
  const eventHandlersBody = generateEventHandlers(ir);

  const blank = (): Section => ({ kind: "between", body: "" });
  const scriptSections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    { kind: "generated", id: "types", body: typesBody },
    blank(),
    { kind: "custom", id: "types", body: "" },
    blank(),
    { kind: "generated", id: "props", body: propsInterfaceBody },
    blank(),
    { kind: "generated", id: "defineProps", body: definePropsBody },
    blank(),
    { kind: "generated", id: "classes", body: classesBody },
    blank(),
    ...(eventHandlersBody
      ? [
          { kind: "generated" as const, id: "events", body: eventHandlersBody },
          blank(),
        ]
      : []),
    { kind: "custom", id: "trailing", body: "" },
  ];

  return [
    `<script setup lang="ts">`,
    renderSections(scriptSections, "line"),
    `</script>`,
    ``,
    generateTemplate(ir),
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Vue's `defineProps<Props>()` treats `?` as optional; required boolean props
 * (which are uncommon in design system APIs) need explicit `required: true`
 * but we follow the convention that all visual props are optional with sane
 * defaults. The helper therefore mirrors React's loose-typed component API.
 */
function generatePropsInterface(ir: ComponentIR): string {
  const propNames = new Set(ir.styledProps.map((p) => p.name));
  const lines: string[] = [`interface Props {`];
  for (const p of ir.styledProps) {
    if (VUE_SKIP_PROPS.has(p.name)) continue;
    // A prop with a `defaultExpr` is effectively optional at the
    // call site even if the contract marks it required — the
    // component supplies the default via `withDefaults`.
    const optional = p.required && p.defaultExpr === undefined ? "" : "?";
    const propName = vuePropKey(p.name);
    lines.push(`  ${propName}${optional}: ${lowerVuePropType(p.propType)};`);
  }
  for (const dim of Object.keys(ir.variants)) {
    if (!propNames.has(dim)) {
      lines.push(`  ${dim}?: string;`);
    }
  }
  // Mirror React's parity logic: every attribute the template binds must
  // appear in the Props interface. `children` is handled via <slot/> so we
  // don't declare it; `className` is React-only (Vue uses `class`).
  if (!propNames.has("class")) lines.push(`  class?: string;`);
  if (!propNames.has("data-testid")) lines.push(`  dataTestid?: string;`);
  lines.push(`}`);
  return lines.join("\n");
}

function generateDefineProps(ir: ComponentIR): string {
  const defaults = collectDefaults(ir);
  if (defaults.length === 0) {
    return `const props = defineProps<Props>();`;
  }
  const lines: string[] = [`const props = withDefaults(defineProps<Props>(), {`];
  for (const [name, value, needsFactory] of defaults) {
    const propKey = vuePropKey(name);
    // Vue's withDefaults requires a factory function whenever the prop type
    // covers non-primitive shapes — including `unknown`, which is what
    // ReactNode / ReactElement / etc. translate to. Wrap the literal value
    // so TS doesn't complain that the literal isn't a factory.
    const expr = needsFactory ? `() => (${value})` : value;
    lines.push(`  ${propKey}: ${expr},`);
  }
  lines.push(`});`);
  return lines.join("\n");
}

/**
 * Vue defaults need a factory wrapper whenever the prop type allows a
 * non-primitive value (object, array, function). Vue 3.4+ rejects bare
 * non-primitive literals in `withDefaults` to prevent accidental cross-
 * instance mutation; the runtime expects `() => value` so each instance
 * gets a fresh reference.
 *
 * - `unknown` covers ReactNode/ReactElement/arbitrary handler types.
 * - Array syntax (`T[]`, `Array<T>`, `ReadonlyArray<T>`, or any union
 *   that contains one of those) is the case Shuttle hit:
 *   `string[]` default `["a","b"]` must emit `() => (["a","b"])`.
 * - PRODUCTION-ARRAY-ITERATION-CONSUMER-01: extended to cover array
 *   types so production array consumers can declare runtime-seedable
 *   defaults.
 */
function defaultNeedsFactory(translatedType: string): boolean {
  if (/\bunknown\b/.test(translatedType)) return true;
  // Array literal syntax: `T[]` or a union containing it.
  if (/\[\]/.test(translatedType)) return true;
  // Generic array forms.
  if (/\b(Array|ReadonlyArray)</.test(translatedType)) return true;
  return false;
}

function collectDefaults(ir: ComponentIR): Array<[string, string, boolean]> {
  const out: Array<[string, string, boolean]> = [];
  for (const p of ir.styledProps) {
    if (VUE_SKIP_PROPS.has(p.name)) continue;
    if (p.defaultExpr !== undefined) {
      out.push([p.name, p.defaultExpr, defaultNeedsFactory(lowerVuePropType(p.propType))]);
      continue;
    }
    // VUE-FIRST-RENDER-CONTROLLABLE-DEFAULT-01.
    //
    // Source fact: Vue 3's runtime prop coercion for `Boolean`-typed
    // props turns an omitted prop into the literal value `false`, not
    // `undefined`. This is observable as `props.open === false` when
    // the consumer didn't pass `open` at all. Without a workaround,
    // the codegen's controllable-state path mistakes this `false` for
    // a controlled value of `false`, and the controllable-state
    // computed prefers it over the uncontrolled `defaultValue`. The
    // first-render result: `useControllableState({ controlled: () =>
    // props.open, defaultValue: true })` returns `false`.
    //
    // Applies by: prop type matches `\bboolean\b` (the prop is
    // declared as boolean-shaped) AND there is no contract default.
    // Setting `<name>: undefined` in `withDefaults` neutralizes the
    // Boolean coercion — Vue then leaves `props.<name>` as `undefined`
    // when the consumer omits it, which lets the controllable-state
    // fallback to the uncontrolled default fire correctly.
    //
    // Removable when: the Vue prop coercion behavior changes
    // (unlikely; it's a documented Vue contract), or the codegen
    // adopts a different controllable-state wiring that doesn't rely
    // on `undefined` to distinguish "consumer omitted" from "consumer
    // passed false".
    if (isBooleanShapedPropType(p.propType)) {
      out.push([p.name, "undefined", false]);
    }
  }
  return out;
}

/**
 * Detect whether a prop's TS type expression is a (possibly-optional)
 * boolean *value* shape — i.e. `boolean`, `boolean | undefined`,
 * `boolean | null`. Does NOT match function types that happen to
 * return boolean (e.g. `(o: SelectOption) => boolean`) — those are
 * not boolean-valued props and Vue's prop coercion does not apply to
 * function-typed props.
 *
 * Source fact: Vue's Boolean coercion only fires for props whose
 * runtime type entry is `{ type: Boolean }`. The codegen translates
 * a bare TS `boolean` to that runtime type; function types translate
 * to `{ type: Function }` (or are left unwrapped), which Vue does NOT
 * coerce on omission.
 */
function isBooleanShapedProp(type: string): boolean {
  const trimmed = type.trim();
  // Strip optional union pieces (`| undefined`, `| null`) for the
  // shape comparison.
  const stripped = trimmed
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s !== "undefined" && s !== "null")
    .join(" | ");
  return stripped === "boolean";
}

// ---------------------------------------------------------------------------
// Class recipe
// ---------------------------------------------------------------------------

function generateClassesComputed(ir: ComponentIR): string {
  const { classRecipe } = ir;
  const lines: string[] = [
    `const classNames = computed(() => [`,
    `  "${classRecipe.base}",`,
  ];

  for (const mod of classRecipe.valueModifiers) {
    const accessor = propAccessor(mod.propName);
    lines.push(
      `  ${accessor} ? \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${accessor}}\` : null,`,
    );
  }

  for (const mod of classRecipe.booleanModifiers) {
    const accessor = propAccessor(mod.propName);
    lines.push(`  ${accessor} ? "${classRecipe.base}--${mod.safeName}" : null,`);
  }

  // Forward the consumer-passed `class` prop so users can extend styling.
  // Matches React's `className && className` pattern in classRoot recipes.
  lines.push(`  props.class,`);

  lines.push(`].filter(Boolean).join(" "));`);
  return lines.join("\n");
}

/**
 * Vue normalizes declared prop keys to camelCase at runtime: a prop declared
 * as `"data-testid"` is stored under `props.dataTestid`, so a
 * `props['data-testid']` read is always undefined and the value is dropped.
 * Declare and read every hyphenated prop by its camelized key; a consumer's
 * hyphenated attribute (`data-testid="x"`) still resolves to it.
 */
function vuePropKey(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function propAccessor(propName: string): string {
  return `props.${vuePropKey(propName)}`;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function generateEventHandlers(ir: ComponentIR): string {
  const styledPropNames = new Set(ir.styledProps.map((prop) => prop.name));
  const styledPropsByName = new Map(ir.styledProps.map((prop) => [prop.name, prop]));
  const clickHandlers = new Map<string, string>();
  const changeHandlers = new Map<string, string>();
  const keydownHandlers = new Map<string, string>();

  if (styledPropNames.has("onClick")) clickHandlers.set("onClick", "event");
  if (styledPropNames.has("onKeyDown")) keydownHandlers.set("onKeyDown", "event");

  for (const channel of ir.behavior.normalizedChannels) {
    if (!styledPropNames.has(channel.changeHandlerProp)) continue;
    const propType = styledPropsByName.get(channel.changeHandlerProp)?.type ?? "";
    const argument = callbackArgument(propType, channel.valueType);
    if (channel.valueType === "boolean") {
      clickHandlers.set(channel.changeHandlerProp, argument);
    } else {
      changeHandlers.set(channel.changeHandlerProp, argument);
    }
  }

  const blocks: string[] = [];
  if (clickHandlers.size > 0) {
    blocks.push(generateEventHandler("handleRootClick", clickHandlers));
  }
  if (changeHandlers.size > 0) {
    blocks.push(generateEventHandler("handleRootChange", changeHandlers));
  }
  if (keydownHandlers.size > 0) {
    blocks.push(generateEventHandler("handleRootKeydown", keydownHandlers));
  }

  return blocks.join("\n\n");
}

function generateEventHandler(name: string, handlers: Map<string, string>): string {
  const lines = [`function ${name}(event: Event) {`];
  for (const [handler, argument] of handlers) {
    lines.push(`  ${propAccessor(handler)}?.(${argument});`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

function callbackArgument(propType: string, valueType: string | undefined): string {
  if (/\bEvent\b|EventHandler|ChangeEvent|MouseEvent|KeyboardEvent/.test(propType)) {
    return "event";
  }
  if (valueType === "boolean" || /\bboolean\b/.test(propType)) {
    return "true";
  }
  if (valueType === "number") return "0";
  // Array channel values (e.g. selection: string[], multi-select: string[]).
  // Returning a string literal here produces a type-mismatched demo handler:
  // `onValueChange?.("test")` where the signature expects string[]. Emit an
  // empty array so the demo matches the declared argument type. The handler
  // demonstrates the callback shape without mutating state.
  if (valueType && /\[\]$/.test(valueType)) return "[]";
  return `"test"`;
}

// ---------------------------------------------------------------------------
// Compound-part SFC
// ---------------------------------------------------------------------------

/**
 * Emit a compound-part SFC mirroring the React reference shape:
 *   <ComponentNamePartName> → <Stack as="header" class="component__part">
 *
 * Compound parts are stateless wrappers that contribute one BEM block
 * class. Each one is its own `.vue` file because Vue SFCs cannot hold
 * multiple components.
 */
export function generateVueCompoundPartSource(
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

  // Native-tag branch: emit the native HTML element directly with the
  // BEM class. No Stack import, no .stack class injection. See PartIR
  // doc in ir.ts for the realization rules.
  if (part.nativeTag && TABLE_COMPOSITION_TAGS.has(part.nativeTag)) {
    const tag = part.nativeTag;
    const attrs = nativeTableAttrsFor(tag);
    const attrPropLines = attrs.map((a) => `  ${a}?: ${vueTableAttrType(a)};`);
    // Bind each to its lowercase HTML attribute; Vue omits an attribute whose
    // bound value is undefined.
    const attrBindings = attrs
      .map((a) => ` :${vueTableAttrHtmlName(a)}="props.${a}"`)
      .join("");
    return [
      `<script setup lang="ts">`,
      `// @generated:start imports`,
      `import { computed } from "vue";`,
      `// @generated:end`,
      ``,
      `// @custom:start imports`,
      ``,
      `// @custom:end`,
      ``,
      `// @generated:start props`,
      `interface Props {`,
      `  class?: string;`,
      `  dataTestid?: string;`,
      ...attrPropLines,
      `}`,
      ``,
      `const props = defineProps<Props>();`,
      `// @generated:end`,
      ``,
      `// @generated:start classes`,
      `const classNames = computed(() =>`,
      `  ["${cssClass}", props.class].filter(Boolean).join(" "),`,
      `);`,
      `// @generated:end`,
      ``,
      `// @custom:start trailing`,
      ``,
      `// @custom:end`,
      `</script>`,
      ``,
      `<template>`,
      `  <${tag} :class="classNames" :data-testid="props.dataTestid"${attrBindings}>`,
      `    <slot />`,
      `  </${tag}>`,
      `</template>`,
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
    `<script setup lang="ts">`,
    `// @generated:start imports`,
    `import { computed } from "vue";`,
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
    `  dataTestid?: string;`,
    `}`,
    ``,
    `const props = defineProps<Props>();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const classNames = computed(() =>`,
    `  ["${cssClass}", props.class].filter(Boolean).join(" "),`,
    `);`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<template>`,
    `  <Stack${asAttr}${variantAttr} :class="classNames" :data-testid="props.dataTestid">`,
    `    <slot />`,
    `  </Stack>`,
    `</template>`,
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Compound-state-container (Tabs-shaped) SFC generation
// ---------------------------------------------------------------------------

/**
 * Returns the root SFC source (Tabs.vue) for a compound-state-container IR.
 * This is the component that:
 *   - Calls useTabs() to get reactive state
 *   - Calls provideTabsContext() to share state with all sub-components
 *   - Renders a plain <div> wrapper with BEM classes
 */
function generateVueCompoundStateRootSource(ir: ComponentIR): string {
  const { name, classRecipe } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "activeTab";

  const importsBody = [
    `import { computed } from "vue";`,
    `import { use${name}, provide${name}Context } from "./use${name}.js";`,
  ].join("\n");

  const typesBody = emitNonReactTypeAliases(ir).join("\n");

  // Build Props interface — same as the standard path but without class logic
  const propNames = new Set(ir.styledProps.map((p) => p.name));
  const propsLines: string[] = [`interface Props {`];
  for (const p of ir.styledProps) {
    if (VUE_SKIP_PROPS.has(p.name)) continue;
    // A prop with a `defaultExpr` is effectively optional at the
    // call site even if the contract marks it required — the
    // component supplies the default via `withDefaults`.
    const optional = p.required && p.defaultExpr === undefined ? "" : "?";
    const propKey = vuePropKey(p.name);
    propsLines.push(`  ${propKey}${optional}: ${lowerVuePropType(p.propType)};`);
  }
  for (const dim of Object.keys(ir.variants)) {
    if (!propNames.has(dim)) propsLines.push(`  ${dim}?: string;`);
  }
  // idBase and other compound-specific props not in styledProps
  if (!propNames.has("idBase")) propsLines.push(`  idBase?: string;`);
  if (!propNames.has("unmountInactive")) propsLines.push(`  unmountInactive?: boolean;`);
  if (!propNames.has("class")) propsLines.push(`  class?: string;`);
  if (!propNames.has("data-testid")) propsLines.push(`  dataTestid?: string;`);
  propsLines.push(`}`);
  const propsInterfaceBody = propsLines.join("\n");

  // Collect defaults
  const defaults: Array<[string, string]> = [];
  for (const p of ir.styledProps) {
    if (p.defaultExpr === undefined) continue;
    if (VUE_SKIP_PROPS.has(p.name)) continue;
    defaults.push([p.name, p.defaultExpr]);
  }
  // Standard defaults for Tabs-specific props
  if (!ir.styledProps.find(p => p.name === "unmountInactive" && p.defaultExpr)) {
    defaults.push(["unmountInactive", "true"]);
  }
  const definePropsBody =
    defaults.length === 0
      ? `const props = defineProps<Props>();`
      : [
          `const props = withDefaults(defineProps<Props>(), {`,
          ...defaults.map(([k, v]) => `  ${vuePropKey(k)}: ${v},`),
          `});`,
        ].join("\n");

  // Hook call
  const hookLines: string[] = [];
  hookLines.push(`const { ${channelName}, set${capitalize(channelName)}, registeredTabs, registerTab, unregisterTab, idBase } = use${name}({`);
  if (channel) {
    hookLines.push(`  ${channel.valueProp}: () => props.${propAccess(channel.valueProp)},`);
    if (channel.defaultValueProp) {
      hookLines.push(`  ${channel.defaultValueProp}: props.${propAccess(channel.defaultValueProp)},`);
    }
    hookLines.push(`  ${channel.changeHandlerProp}: props.${propAccess(channel.changeHandlerProp)},`);
  }
  hookLines.push(`  idBase: props.idBase,`);
  hookLines.push(`});`);
  hookLines.push(``);
  hookLines.push(`provide${name}Context({`);
  hookLines.push(`  ${channelName},`);
  hookLines.push(`  set${capitalize(channelName)},`);
  hookLines.push(`  registeredTabs,`);
  hookLines.push(`  registerTab,`);
  hookLines.push(`  unregisterTab,`);
  hookLines.push(`  idBase,`);
  hookLines.push(`  get orientation() { return props.orientation ?? "horizontal"; },`);
  hookLines.push(`  get activationMode() { return props.activationMode ?? "automatic"; },`);
  hookLines.push(`  get loop() { return props.loop ?? true; },`);
  hookLines.push(`  get unmountInactive() { return props.unmountInactive ?? true; },`);
  hookLines.push(`});`);
  const hookBody = hookLines.join("\n");

  // Class recipe
  const classExprs: string[] = [`"${classRecipe.base}"`];
  for (const mod of classRecipe.valueModifiers) {
    classExprs.push(`props.${mod.propName} ? \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${props.${mod.propName}}\` : null`);
  }
  classExprs.push(`props.class`);
  const classesBody = [
    `const classNames = computed(() => [`,
    ...classExprs.map(e => `  ${e},`),
    `].filter(Boolean).join(" "));`,
  ].join("\n");

  const blank = (): Section => ({ kind: "between", body: "" });
  const scriptSections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    { kind: "generated", id: "types", body: typesBody },
    blank(),
    { kind: "custom", id: "types", body: "" },
    blank(),
    { kind: "generated", id: "props", body: propsInterfaceBody },
    blank(),
    { kind: "generated", id: "defineProps", body: definePropsBody },
    blank(),
    { kind: "generated", id: "hook", body: hookBody },
    blank(),
    { kind: "generated", id: "classes", body: classesBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
  ];

  const templateBody = [
    `<template>`,
    `  <div data-fsds-component="${ir.cssPrefix}" data-fsds-box="" :class="classNames" :data-testid="props.dataTestid">`,
    `    <slot />`,
    `  </div>`,
    `</template>`,
  ].join("\n");

  return [
    `<script setup lang="ts">`,
    renderSections(scriptSections, "line"),
    `</script>`,
    ``,
    templateBody,
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Repeated-disclosure lowering (Accordion-shaped)
// ---------------------------------------------------------------------------

/** DFS for the DOM node whose part matches `partName`. */
function vueFindDomNode(
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
function vueFindParentOf(
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
 * Root SFC for a repeated-disclosure container (Accordion). Owns the openness
 * channel via the composable, derives per-item open/toggle, provides the
 * disclosure context, and hosts arrow-key navigation over the triggers.
 */
function generateVueDisclosureStateRootSource(ir: ComponentIR): string {
  const { name, classRecipe } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "openness";
  const setter = `set${capitalize(channelName)}`;
  const hasCollapsible = ir.styledProps.some((p) => p.name === "collapsible");
  const hasDisabled = ir.styledProps.some((p) => p.name === "disabled");

  const importsBody = [
    `import { toggleInteractionItem } from "../../primitives/interaction.js";`,
    `import { computed, ref } from "vue";`,
    `import { use${name}, provide${name}Context } from "./use${name}.js";`,
  ].join("\n");

  const typesBody = emitNonReactTypeAliases(ir).join("\n");

  const propNames = new Set(ir.styledProps.map((p) => p.name));
  const propsLines: string[] = [`interface Props {`];
  for (const p of ir.styledProps) {
    if (VUE_SKIP_PROPS.has(p.name)) continue;
    const optional = p.required && p.defaultExpr === undefined ? "" : "?";
    const propKey = vuePropKey(p.name);
    propsLines.push(`  ${propKey}${optional}: ${lowerVuePropType(p.propType)};`);
  }
  for (const dim of Object.keys(ir.variants)) {
    if (!propNames.has(dim)) propsLines.push(`  ${dim}?: string;`);
  }
  if (!propNames.has("idBase")) propsLines.push(`  idBase?: string;`);
  if (!propNames.has("class")) propsLines.push(`  class?: string;`);
  if (!propNames.has("data-testid")) propsLines.push(`  dataTestid?: string;`);
  propsLines.push(`}`);
  const propsInterfaceBody = propsLines.join("\n");

  const defaults: Array<[string, string]> = [];
  for (const p of ir.styledProps) {
    if (p.defaultExpr === undefined) continue;
    if (VUE_SKIP_PROPS.has(p.name)) continue;
    defaults.push([p.name, p.defaultExpr]);
  }
  const definePropsBody =
    defaults.length === 0
      ? `const props = defineProps<Props>();`
      : [
          `const props = withDefaults(defineProps<Props>(), {`,
          ...defaults.map(([k, v]) => `  ${vuePropKey(k)}: ${v},`),
          `});`,
        ].join("\n");

  const idCounterName = `_${name.toLowerCase()}IdCounter`;

  const hookLines: string[] = [];
  hookLines.push(`const { ${channelName}, ${setter} } = use${name}({`);
  if (channel) {
    hookLines.push(`  ${channel.valueProp}: () => props.${propAccess(channel.valueProp)},`);
    if (channel.defaultValueProp) {
      hookLines.push(`  ${channel.defaultValueProp}: props.${propAccess(channel.defaultValueProp)},`);
    }
    hookLines.push(`  ${channel.changeHandlerProp}: props.${propAccess(channel.changeHandlerProp)},`);
  }
  hookLines.push(`});`);
  hookLines.push(``);
  hookLines.push(`const idBase = props.idBase ?? \`${name.toLowerCase()}-\${++${idCounterName}}\`;`);
  hookLines.push(`const rootRef = ref<HTMLElement | null>(null);`);
  hookLines.push(``);
  hookLines.push(`function isItemOpen(itemValue: string): boolean {`);
  hookLines.push(`  const v = ${channelName}.value;`);
  hookLines.push(`  return Array.isArray(v) ? v.includes(itemValue) : v === itemValue;`);
  hookLines.push(`}`);
  hookLines.push(``);
  hookLines.push(`function toggleItem(itemValue: string): void {`);
  hookLines.push(`  const v = ${channelName}.value;`);
  hookLines.push(`  ${setter}(toggleInteractionItem(v, itemValue, props.type === "multiple", ${hasCollapsible ? "Boolean(props.collapsible)" : "false"}));`);
  hookLines.push(`}`);
  hookLines.push(``);
  hookLines.push(`function handleKeyDown(e: KeyboardEvent): void {`);
  hookLines.push(`  const key = e.key;`);
  hookLines.push(`  if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") {`);
  hookLines.push(`    return;`);
  hookLines.push(`  }`);
  hookLines.push(`  const root = rootRef.value;`);
  hookLines.push(`  if (!root) return;`);
  hookLines.push(`  const triggers = Array.from(`);
  hookLines.push(`    root.querySelectorAll<HTMLButtonElement>("[data-disclosure-trigger]"),`);
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
  hookLines.push(`  ${channelName},`);
  hookLines.push(`  toggleItem,`);
  hookLines.push(`  isItemOpen,`);
  hookLines.push(`  get type() { return props.type ?? "single"; },`);
  hookLines.push(`  get collapsible() { return ${hasCollapsible ? "props.collapsible ?? false" : "false"}; },`);
  hookLines.push(`  get disabled() { return ${hasDisabled ? "props.disabled ?? false" : "false"}; },`);
  hookLines.push(`  idBase,`);
  hookLines.push(`});`);
  const hookBody = hookLines.join("\n");

  const classExprs: string[] = [`"${classRecipe.base}"`];
  for (const mod of classRecipe.valueModifiers) {
    classExprs.push(`props.${mod.propName} ? \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${props.${mod.propName}}\` : null`);
  }
  classExprs.push(`props.class`);
  const classesBody = [
    `const classNames = computed(() => [`,
    ...classExprs.map((e) => `  ${e},`),
    `].filter(Boolean).join(" "));`,
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
    { kind: "generated", id: "props", body: propsInterfaceBody },
    blank(),
    { kind: "generated", id: "defineProps", body: definePropsBody },
    blank(),
    { kind: "generated", id: "hook", body: hookBody },
    blank(),
    { kind: "generated", id: "classes", body: classesBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
  ];

  const templateBody = [
    `<template>`,
    `  <div`,
    `    data-fsds-component="${ir.cssPrefix}" data-fsds-box=""`,
    `    ref="rootRef"`,
    `    :class="classNames"`,
    `    :data-testid="props.dataTestid"`,
    `    @keydown="handleKeyDown"`,
    `  >`,
    `    <slot />`,
    `  </div>`,
    `</template>`,
  ].join("\n");

  return [
    `<script setup lang="ts">`,
    renderSections(scriptSections, "line"),
    `</script>`,
    ``,
    templateBody,
    ``,
  ].join("\n");
}

/**
 * Sub-component SFCs for a disclosure container: Item (passive wrapper),
 * Trigger (button binding aria-expanded + toggle), Content (region).
 */
export function generateVueDisclosureStateParts(
  ir: ComponentIR,
): Array<{ name: string; content: string }> {
  if (!isDisclosureContainer(ir)) return [];
  const { name, cssPrefix } = ir;
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  const multiplePart = getMultipleItemPart(ir);
  if (!itemPart || !regionPart || !multiplePart || !ir.dom) return [];

  const itemNode = vueFindDomNode(ir.dom, itemPart.name);
  const headerNode = vueFindParentOf(ir.dom, itemPart.name);
  const headerPartName = headerNode?.part;
  const headerTag = headerNode?.tag ?? "div";
  const triggerTag = itemNode?.tag ?? "button";
  const chevronNode = itemNode?.children?.find(
    (c) => c.part !== undefined && c.tag !== "slot" && c.tag !== "children",
  );
  const innerNode = vueFindDomNode(ir.dom, regionPart.name);
  const innerChild = innerNode?.children?.find(
    (c) => c.part !== undefined && c.tag !== "slot" && c.tag !== "children",
  );
  const innerPartName = innerChild?.part;
  const innerTag = innerChild?.tag ?? "div";

  const itemName = `${name}${capitalize(multiplePart.name)}`;
  const triggerName = `${name}${capitalize(itemPart.name)}`;
  const contentName = `${name}${capitalize(regionPart.name)}`;

  const itemCssClass = `${cssPrefix}__${multiplePart.name}`;
  const triggerCssClass = `${cssPrefix}__${itemPart.name}`;
  const contentCssClass = `${cssPrefix}__${regionPart.name}`;

  // Item.vue (passive wrapper)
  const itemSource = [
    `<script setup lang="ts">`,
    `// @generated:start imports`,
    `import { computed } from "vue";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start props`,
    `interface Props {`,
    `  class?: string;`,
    `  dataTestid?: string;`,
    `}`,
    ``,
    `const props = defineProps<Props>();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const classNames = computed(() =>`,
    `  ["${itemCssClass}", props.class].filter(Boolean).join(" "),`,
    `);`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<template>`,
    `  <div :class="classNames" :data-testid="props.dataTestid">`,
    `    <slot />`,
    `  </div>`,
    `</template>`,
    ``,
  ].join("\n");

  // Trigger.vue
  const triggerOpenLines = headerPartName
    ? [`  <${headerTag} class="${cssPrefix}__${headerPartName}">`]
    : [];
  const triggerCloseLines = headerPartName ? [`  </${headerTag}>`] : [];
  const triggerIndent = headerPartName ? "    " : "  ";
  const triggerInner: string[] = [];
  triggerInner.push(`${triggerIndent}<${triggerTag}`);
  triggerInner.push(`${triggerIndent}  type="button"`);
  triggerInner.push(`${triggerIndent}  :class="classNames"`);
  triggerInner.push(`${triggerIndent}  data-disclosure-trigger`);
  triggerInner.push(`${triggerIndent}  :data-value="props.value"`);
  triggerInner.push(`${triggerIndent}  :id="\`\${ctx.idBase}-trigger-\${props.value}\`"`);
  triggerInner.push(`${triggerIndent}  :aria-controls="\`\${ctx.idBase}-content-\${props.value}\`"`);
  triggerInner.push(`${triggerIndent}  :aria-expanded="isOpen"`);
  triggerInner.push(`${triggerIndent}  :disabled="ctx.disabled"`);
  triggerInner.push(`${triggerIndent}  :data-testid="props.dataTestid"`);
  triggerInner.push(`${triggerIndent}  @click="ctx.toggleItem(props.value)"`);
  triggerInner.push(`${triggerIndent}>`);
  triggerInner.push(`${triggerIndent}  <slot />`);
  if (chevronNode) {
    triggerInner.push(
      renderVueDomNode(
        chevronNode,
        { classRecipe: cssPrefix, channelByName: new Map(), isRoot: false },
        triggerIndent.length + 2,
      ),
    );
  }
  triggerInner.push(`${triggerIndent}</${triggerTag}>`);

  const triggerSource = [
    `<script setup lang="ts">`,
    `// @generated:start imports`,
    `import { computed } from "vue";`,
    `import { use${name}Context } from "./use${name}.js";`,
    ...(chevronNode?.componentRef
      ? [`import ${chevronNode.componentRef} from "../${chevronNode.componentRef}/${chevronNode.componentRef}.vue";`]
      : []),
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
    `  dataTestid?: string;`,
    `}`,
    ``,
    `const props = defineProps<Props>();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const ctx = use${name}Context();`,
    ``,
    `const isOpen = computed(() => ctx.isItemOpen(props.value));`,
    ``,
    `const classNames = computed(() =>`,
    `  [`,
    `    "${triggerCssClass}",`,
    `    isOpen.value && "${triggerCssClass}--open",`,
    `    props.class,`,
    `  ]`,
    `    .filter(Boolean)`,
    `    .join(" "),`,
    `);`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<template>`,
    ...triggerOpenLines,
    ...triggerInner,
    ...triggerCloseLines,
    `</template>`,
    ``,
  ].join("\n");

  // Content.vue
  const contentInnerLines = innerPartName
    ? [
        `    <${innerTag} class="${cssPrefix}__${innerPartName}">`,
        `      <slot />`,
        `    </${innerTag}>`,
      ]
    : [`    <slot />`];
  const contentSource = [
    `<script setup lang="ts">`,
    `// @generated:start imports`,
    `import { computed } from "vue";`,
    `import { use${name}Context } from "./use${name}.js";`,
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
    `  dataTestid?: string;`,
    `}`,
    ``,
    `const props = defineProps<Props>();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const ctx = use${name}Context();`,
    ``,
    `const isOpen = computed(() => ctx.isItemOpen(props.value));`,
    ``,
    `const classNames = computed(() =>`,
    `  ["${contentCssClass}", props.class].filter(Boolean).join(" "),`,
    `);`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<template>`,
    `  <div`,
    `    role="region"`,
    `    :class="classNames"`,
    `    :id="\`\${ctx.idBase}-content-\${props.value}\`"`,
    `    :aria-labelledby="\`\${ctx.idBase}-trigger-\${props.value}\`"`,
    `    :hidden="!isOpen ? true : undefined"`,
    `    :data-testid="props.dataTestid"`,
    `  >`,
    ...contentInnerLines,
    `  </div>`,
    `</template>`,
    ``,
  ].join("\n");

  return [
    { name: itemName, content: itemSource },
    { name: triggerName, content: triggerSource },
    { name: contentName, content: contentSource },
  ];
}

/**
 * Returns a map of { relativePath: content } for the four SFC files
 * emitted for a compound-state-container component (Tabs.vue, TabsList.vue,
 * TabsTab.vue, TabsPanel.vue).
 *
 * The main Tabs.vue is handled by generateVueComponentSource; this function
 * returns the sub-component files.
 */
export function generateVueCompoundStateParts(
  ir: ComponentIR,
): Array<{ name: string; content: string }> {
  if (!isCompoundStateContainer(ir) || isDisclosureContainer(ir)) return [];

  const { name, cssPrefix } = ir;
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  const groupPart = getGroupHostPart(ir);
  const ornamentPart = getGroupHostOrnamentPart(ir);

  if (!itemPart || !regionPart) return [];

  const listName = `${name}${capitalize(groupPart?.name ?? "List")}`;
  const tabName = `${name}${capitalize(itemPart.name)}`;
  const panelName = `${name}${capitalize(regionPart.name)}`;

  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "activeTab";
  const listCssClass = `${cssPrefix}__${groupPart?.name ?? "list"}`;
  const tabCssClass = `${cssPrefix}__${itemPart.name}`;
  const panelCssClass = `${cssPrefix}__${regionPart.name}`;

  // ---------------------------------------------------------------------------
  // TabsList.vue
  // ---------------------------------------------------------------------------
  const listSource = [
    `<script setup lang="ts">`,
    `// @generated:start imports`,
    `import { ref, computed } from "vue";`,
    `import { use${name}Context } from "./use${name}.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start props`,
    `interface Props {`,
    `  class?: string;`,
    `  dataTestid?: string;`,
    `}`,
    ``,
    `const props = defineProps<Props>();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const classNames = computed(() =>`,
    `  ["${listCssClass}", props.class].filter(Boolean).join(" "),`,
    `);`,
    `// @generated:end`,
    ``,
    `// @generated:start trailing`,
    `const ctx = use${name}Context();`,
    ``,
    `const listRef = ref<HTMLElement | null>(null);`,
    ``,
    `function handleKeyDown(e: KeyboardEvent): void {`,
    `  const tabs = ctx.registeredTabs.value;`,
    `  if (tabs.length === 0) return;`,
    `  const currentIndex = tabs.indexOf(ctx.${channelName}.value);`,
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
    `      const focusedBtn = listRef.value?.querySelector<HTMLButtonElement>("[role=\\"tab\\"]:focus");`,
    `      if (focusedBtn) {`,
    `        const val = focusedBtn.getAttribute("data-value");`,
    `        if (val) ctx.set${capitalize(channelName)}(val);`,
    `      }`,
    `    }`,
    `    return;`,
    `  } else {`,
    `    return;`,
    `  }`,
    ``,
    `  const targetValue = tabs[nextIndex];`,
    `  if (ctx.activationMode === "automatic") {`,
    `    ctx.set${capitalize(channelName)}(targetValue);`,
    `  }`,
    `  const btn = listRef.value?.querySelector<HTMLButtonElement>(`,
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
    `<template>`,
    `  <div`,
    `    ref="listRef"`,
    `    role="tablist"`,
    // The tablist is an interactive role hosting the delegated roving keydown;
    // it must be programmatically focusable (APG) but stays out of tab order.
    `    tabindex="-1"`,
    `    :class="classNames"`,
    `    :data-testid="props.dataTestid"`,
    `    :aria-orientation="ctx.orientation"`,
    `    @keydown="handleKeyDown"`,
    `  >`,
    `    <slot />`,
    ...(ornamentPart
      ? [
          // TABS-INDICATOR-REALIZATION-01: declared DOM realization of the
          // group-host ornament (e.g. Tabs's `indicator`). Visual treatment
          // and motion live in the contract's styles.json / Tabs.css.
          `    <span :class="'${cssPrefix}__${ornamentPart.name}'" aria-hidden="true"></span>`,
        ]
      : []),
    `  </div>`,
    `</template>`,
    ``,
  ].join("\n");

  // ---------------------------------------------------------------------------
  // TabsTab.vue
  // ---------------------------------------------------------------------------
  const tabSource = [
    `<script setup lang="ts">`,
    `// @generated:start imports`,
    `import { computed, onMounted, onUnmounted } from "vue";`,
    `import { use${name}Context } from "./use${name}.js";`,
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
    `  dataTestid?: string;`,
    `}`,
    ``,
    `const props = defineProps<Props>();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const ctx = use${name}Context();`,
    ``,
    `const isActive = computed(() => ctx.${channelName}.value === props.value);`,
    ``,
    `const classNames = computed(() =>`,
    `  [`,
    `    "${tabCssClass}",`,
    `    isActive.value && "${tabCssClass}--active",`,
    `    props.class,`,
    `  ]`,
    `    .filter(Boolean)`,
    `    .join(" "),`,
    `);`,
    `// @generated:end`,
    ``,
    `// @generated:start trailing`,
    `onMounted(() => {`,
    `  ctx.registerTab(props.value);`,
    `});`,
    ``,
    `onUnmounted(() => {`,
    `  ctx.unregisterTab(props.value);`,
    `});`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<template>`,
    `  <button`,
    `    role="tab"`,
    `    type="button"`,
    `    :class="classNames"`,
    `    :data-value="props.value"`,
    `    :data-testid="props.dataTestid"`,
    `    :id="\`\${ctx.idBase}-tab-\${props.value}\`"`,
    `    :aria-controls="\`\${ctx.idBase}-panel-\${props.value}\`"`,
    `    :aria-selected="isActive"`,
    `    :tabindex="isActive ? 0 : -1"`,
    `    :disabled="props.disabled"`,
    `    @click="ctx.set${capitalize(channelName)}(props.value)"`,
    `  >`,
    `    <slot />`,
    `  </button>`,
    `</template>`,
    ``,
  ].join("\n");

  // ---------------------------------------------------------------------------
  // TabsPanel.vue
  // ---------------------------------------------------------------------------
  const panelSource = [
    `<script setup lang="ts">`,
    `// @generated:start imports`,
    `import { computed } from "vue";`,
    `import { use${name}Context } from "./use${name}.js";`,
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
    `  dataTestid?: string;`,
    `}`,
    ``,
    `const props = defineProps<Props>();`,
    `// @generated:end`,
    ``,
    `// @generated:start classes`,
    `const ctx = use${name}Context();`,
    ``,
    `const isActive = computed(() => ctx.${channelName}.value === props.value);`,
    ``,
    `const classNames = computed(() =>`,
    `  ["${panelCssClass}", props.class].filter(Boolean).join(" "),`,
    `);`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    `</script>`,
    ``,
    `<template>`,
    `  <div`,
    `    v-if="!ctx.unmountInactive || isActive"`,
    `    role="tabpanel"`,
    `    :class="classNames"`,
    `    :id="\`\${ctx.idBase}-panel-\${props.value}\`"`,
    `    :aria-labelledby="\`\${ctx.idBase}-tab-\${props.value}\`"`,
    `    :tabindex="0"`,
    `    :data-testid="props.dataTestid"`,
    `    :hidden="!isActive ? true : undefined"`,
    `  >`,
    `    <slot />`,
    `  </div>`,
    `</template>`,
    ``,
  ].join("\n");

  return [
    { name: listName, content: listSource },
    { name: tabName, content: tabSource },
    { name: panelName, content: panelSource },
  ];
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

function generateTemplate(ir: ComponentIR): string {
  const { root } = ir;
  const asAttr = root.element !== "div" ? ` as="${root.element}"` : "";
  const roleAttr = root.effectiveRole ? ` role="${root.effectiveRole}"` : "";
  const propAttrs = generateTemplatePropAttrs(ir);
  const eventAttrs = generateTemplateEventAttrs(ir);
  // data-testid is universally bound on the root, in parallel with React
  // (which writes `data-testid={testId}` unconditionally). The Props
  // interface declares it via generatePropsInterface; keep them in sync.
  const styledNames = new Set(ir.styledProps.map((p) => p.name));
  const testIdAttr = styledNames.has("data-testid")
    ? ""
    : ` :data-testid="props.dataTestid"`;

  return [
    `<template>`,
    `  <Stack${asAttr}${roleAttr}${propAttrs}${eventAttrs}${testIdAttr} data-fsds-component="${ir.cssPrefix}" data-fsds-box="" :class="classNames">`,
    `    <slot />`,
    `  </Stack>`,
    `</template>`,
  ].join("\n");
}

function generateTemplatePropAttrs(ir: ComponentIR): string {
  const attrs: string[] = [];
  for (const prop of ir.styledProps) {
    if (
      prop.name.startsWith("aria-") ||
      prop.name === "data-testid" ||
      prop.name === "id" ||
      prop.name === "tabIndex" ||
      prop.name === "disabled" ||
      prop.name === "type"
    ) {
      attrs.push(` :${prop.name}="${propAccessor(prop.name)}"`);
    }
  }
  return attrs.join("");
}

function generateTemplateEventAttrs(ir: ComponentIR): string {
  const styledPropNames = new Set(ir.styledProps.map((prop) => prop.name));
  const hasClick =
    styledPropNames.has("onClick") ||
    ir.behavior.normalizedChannels.some(
      (channel) =>
        channel.valueType === "boolean" &&
        styledPropNames.has(channel.changeHandlerProp),
    );
  const hasChange = ir.behavior.normalizedChannels.some(
    (channel) =>
      channel.valueType !== "boolean" &&
      styledPropNames.has(channel.changeHandlerProp),
  );
  const hasKeydown = styledPropNames.has("onKeyDown");
  const attrs: string[] = [];
  if (hasClick) attrs.push(` @click="handleRootClick"`);
  if (hasChange) attrs.push(` @change="handleRootChange"`);
  if (hasKeydown) attrs.push(` @keydown="handleRootKeydown"`);
  return attrs.join("");
}

// ---------------------------------------------------------------------------
// Type translation (TS subset → TS as Vue understands it)
// ---------------------------------------------------------------------------

/**
 * The IR carries TypeScript type strings authored against React conventions.
 * Vue needs the same syntactic types but without React namespace shorthand.
 * Delegates to the shared non-React translator so all four frameworks stay
 * in lockstep.
 */
function vueType(typeStr: string): string {
  return translateNonReactType(typeStr);
}

/**
 * Lower a framework-neutral PropTypeIR into a Vue/TS type expression. Reads the
 * structured `propType` — `ref` realizes from `propType.to`, `fallback` keeps the
 * legacy string path on `propType.raw`, and the V1 kinds realize their canonical
 * string through the existing `vueType` so output is byte-identical.
 * (CODEGEN-PROP-TYPE-IR-PILOT-01, slice 2)
 */
function lowerVuePropType(pt: PropTypeIR): string {
  switch (pt.kind) {
    case "ref":
      return vueType(pt.to);
    case "fallback":
      return vueType(pt.raw);
    default:
      return vueType(canonicalTsType(pt));
  }
}

/** Boolean-shape classification from the neutral type (fallback delegates to the string check). */
function isBooleanShapedPropType(pt: PropTypeIR): boolean {
  if (pt.kind === "boolean") return true;
  if (pt.kind === "fallback") return isBooleanShapedProp(pt.raw);
  return false;
}

// ---------------------------------------------------------------------------
// DOM-tree-driven component source (B.2c)
// ---------------------------------------------------------------------------

/**
 * Generate a Vue 3 SFC that renders the contract's `dom` tree. Native
 * HTML elements with `:` and `@` bindings; consumer-provided children land
 * at the `tag: "slot"` / `tag: "children"` region via `<slot />`.
 * Calls the generated `useX` composable in script setup, exposing
 * channel state to the template via reactive bindings.
 *
 * Unlike the legacy path, no `<Stack>` wrapper — the contract's `tag` IS
 * the rendered root.
 */
function generateVueDomTreeComponentSource(ir: ComponentIR): string {
  if (!ir.dom) throw new Error("generateVueDomTreeComponentSource requires ir.dom");

  const channels = ir.behavior.normalizedChannels;
  const channelByName = new Map(channels.map((c) => [c.name, c]));
  const hasHook = channels.length > 0;

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: generated relationship ids need a
  // per-instance namespace (Vue 3.5 `useId`), the provider side reads slot
  // presence in script scope (`useSlots`), and provider/consumer wire the
  // field-association primitive.
  const needsInstanceId = componentNeedsInstanceId(ir);
  const assocProvides = ir.fieldAssociation?.provides;
  const assocConsumerPart = ir.fieldAssociation?.consumerPart;
  const providerNeedsSlots =
    assocProvides !== undefined &&
    assocProvides.describedBy.some((ref) => ref.slotGate !== undefined);

  // Selector-anchored root portal (coachmark / guided tour): the whole
  // panel mounts at document.body and is positioned against a page element
  // resolved from the active step's CSS selector. Purely IR-driven via
  // `selectorAnchoredRootPortal` — no component-name lore. Mirrors the
  // react reference lowering's fact-consumption shape; the reactive
  // machinery below is Vue-idiomatic (getters + `shallowRef` +
  // post-flush `watchEffect` instead of `useState`/`useEffect`).
  const selectorAnchor = selectorAnchoredRootPortal(ir);

  const vueCoreImports = ["computed"];
  if (needsInstanceId) vueCoreImports.push("useId");
  if (providerNeedsSlots) vueCoreImports.push("useSlots");
  if (selectorAnchor) {
    vueCoreImports.push("shallowRef");
    vueCoreImports.push("watchEffect");
    vueCoreImports.push("type ComponentPublicInstance");
  }
  const importLines = [
    `import { ${vueCoreImports.sort().join(", ")} } from "vue";`,
  ];
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
  if (hasHook) importLines.push(`import { use${ir.name} } from "./use${ir.name}.js";`);
  const autoDismissPolicy = resolveSurfaceAutoDismiss(ir);
  const autoDismissChannel =
    autoDismissPolicy && hasHook
      ? channels.find((c) => c.valueType === "boolean")
      : undefined;
  if (autoDismissPolicy && autoDismissChannel) {
    importLines.push(`import { useAutoDismiss } from "../../primitives/index.js";`);
  }
  if (selectorAnchor) {
    importLines.push(
      `import { useAnchoredPosition } from "../../primitives/surfaces/useAnchoredPosition.js";`,
    );
  }
  // componentRef: import each referenced component (CODEGEN-RECURSIVE-
  // COMPOSITION-01). `<script setup>` makes the named import available to
  // the template by its PascalCase identifier.
  for (const refImport of resolveComponentRefImports(ir.name, ir.dom, "vue")) {
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
      importLines.push(`import ${ir.name}${capitalize(transform.linePart)}Part from "./${ir.name}${capitalize(transform.linePart)}.vue";`);
      importLines.push(`import ${ir.name}${capitalize(transform.tokenPart)}Part from "./${ir.name}${capitalize(transform.tokenPart)}.vue";`);
    }
  }
  if (collectContentTransforms(ir.dom).some(isMarkdownTransform)) {
    importLines.push(
      `import { parseMarkdown, type MarkdownBlock, type MarkdownMark } from "../../primitives/markdown/markdown.js";`,
    );
    importLines.push(`import { h, Fragment, defineComponent, type VNode } from "vue";`);
  }
  if (ir.interaction && ir.dom && ir.interaction.triggers.some(t => t.operation !== "select" && t.operation !== "toggle-item")) importLines.push(`import { canActivateInteraction } from "../../primitives/interaction.js";`);
  if (ir.motion.sequence) importLines.push(`import { useSequence } from "../../primitives/hooks/useSequence.js";`);
  const importsBody = importLines.join("\n");

  const typesBody = emitNonReactTypeAliases(ir).join("\n");
  const propsInterfaceBody = generatePropsInterface(ir);
  const definePropsBody = generateDefineProps(ir);

  // Build the hook call. Vue's primitives expect getter-shaped controlled
  // values (`() => boolean | undefined`), and value-shaped onChange.
  //
  // We assign the hook result to a single `behavior` variable rather than
  // destructuring — destructuring would create top-level locals (e.g. `open`)
  // that collide with same-named props in template scope, and Vue's template
  // identifier resolution prefers the prop in that case (silently rendering
  // stale data). `behavior.open` is unambiguous.
  const hookLines: string[] = [];
  if (hasHook) {
    hookLines.push(`const behavior = use${ir.name}({`);
    for (const ch of channels) {
      hookLines.push(`  ${ch.valueProp}: () => props.${propAccess(ch.valueProp)},`);
      if (ch.defaultValueProp) {
        hookLines.push(`  ${ch.defaultValueProp}: props.${propAccess(ch.defaultValueProp)},`);
      }
      hookLines.push(`  ${ch.changeHandlerProp}: props.${propAccess(ch.changeHandlerProp)},`);
    }
    for (const trigger of ir.behavior.normalizedDismissalTriggers) {
      if (!trigger.enabledByProp) continue;
      hookLines.push(`  ${trigger.enabledByProp}: props.${propAccess(trigger.enabledByProp)},`);
    }
    // FEAT-A11Y-COMPOSITE-KEYBOARD-01: forward the mode gates the keyboard
    // select behavior reads, getter-shaped like every other option.
    for (const gate of keyboardModeGateProps(ir)) {
      hookLines.push(`  ${gate}: () => props.${propAccess(gate)},`);
    }
    for (const { prop } of focusTargetProps(ir)) {
      hookLines.push(`  ${prop}: () => props.${propAccess(prop)},`);
    }
    const modalityGate = ir.surface?.modalityGate;
    if (modalityGate) {
      hookLines.push(`  ${modalityGate.prop}: () => props.${propAccess(modalityGate.prop)},`);
    }
    hookLines.push(`});`);
  }
  if (domHasKeyboardPanel(ir)) hookLines.push(`function bindInteractionAnchor(element: unknown): void { behavior.anchorRef.value = element instanceof HTMLElement ? element : null; }`);
  if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir)) hookLines.push(`function bindInteractionPanel(element: unknown): void { behavior.panelRef.value = element instanceof HTMLElement ? element : null; }`);
  // Ephemeral-surface auto-dismiss (WCAG 2.2.1: pause listeners land on the
  // root via v-on). The presence budget flows from the *.timing.auto-dismiss
  // token (generation-resolved default) with the duration prop as override.
  if (autoDismissPolicy && autoDismissChannel) {
    hookLines.push(
      ``,
      `const autoDismiss = useAutoDismiss({`,
      `  open: () => Boolean(behavior.${autoDismissChannel.name}.value),`,
      `  durationMs: () => props.${autoDismissPolicy.durationProp} === undefined ? ${autoDismissPolicy.defaultMs ?? "undefined"} : props.${autoDismissPolicy.durationProp},`,
      ...(ir.motion.countdown ? [`    reducedMotionSteps: ${ir.motion.countdown.reducedMotion.steps},`] : []),
      `  onDismiss: () => behavior.set${capitalize(autoDismissChannel.name)}(false),`,
      `});`,
    );
  }
  if (ir.motion.sequence) {
    const seq = ir.motion.sequence;
    hookLines.push(`const sequence = useSequence(${sequenceConfig(seq, ir.cssPrefix)}, () => ({`,
      `  index: behavior.${seq.channel}.value, labels: props.${seq.itemsProp}, autoPlay: props.${seq.timing.autoPlayProp},`,
      `  durationMs: props.${seq.timing.durationProp} === undefined ? ${seq.timing.defaultMs} : props.${seq.timing.durationProp},`,
      `  onIndexChange: behavior.set${capitalize(seq.channel)},`, `}));`);
  }
  const hookBody = hookLines.join("\n");

  // FEAT-MARKDOWN-CONTENT-TRANSFORM-01 — Vue lowering of the markdown
  // transform: local render functions plus a functional tree component
  // (the idiomatic Vue shape for recursive structures without extra
  // files). Tags/classes/attrs come from the IR fact; the template
  // mounts <MarkdownTree />.
  const markdownHelpersBody = generateVueMarkdownHelpers(ir).join("\n");

  // Selector-anchored root panel: resolve the active element from the
  // indexed selector prop, then position the (teleported) root against it.
  // The anchor element lives outside the component's tree and must be
  // queried AFTER the surrounding tree is in the document: a `computed`
  // here first evaluates while the app tree is still detached (Vue inserts
  // the root only at the end of mount), caches the null querySelector
  // result, and never re-runs because its reactive deps (index/steps)
  // haven't changed — the panel stays hidden forever (caught by the
  // real-Chromium walkthrough proof; jsdom and unit suites stayed green).
  // A post-flush watchEffect writing into a shallowRef is the Vue
  // equivalent of react's useEffect + useState pair: first run lands after
  // mount, and it still re-runs on index/steps changes.
  let anchoredPositionBody = "";
  if (selectorAnchor) {
    const idxChannel = channels.find(
      (c) => c.name === selectorAnchor.indexChannel,
    );
    if (!idxChannel) {
      throw new Error(
        `${ir.name}: surface.anchor.selector.indexChannel "${selectorAnchor.indexChannel}" has no matching channel in the IR.`,
      );
    }
    const idxExpr = `behavior.${idxChannel.name}.value`;
    const propExpr = `props.${propAccess(selectorAnchor.prop)}`;
    const placementProp = ir.surface?.positioning?.placementProp;
    const collision = ir.surface?.positioning?.collision ?? "flip-shift";
    const placementExpr = placementProp
      ? `props.${propAccess(placementProp)}`
      : `"auto"`;
    anchoredPositionBody = [
      `const anchoredRootEl = shallowRef<HTMLElement | null>(null);`,
      `function setAnchoredRootEl(el: Element | ComponentPublicInstance | null): void {`,
      `  anchoredRootEl.value = el instanceof HTMLElement ? el : null;`,
      `}`,
      `const anchorTargetEl = shallowRef<HTMLElement | null>(null);`,
      `watchEffect(`,
      `  () => {`,
      `    const selector = (${propExpr} ?? [])[${idxExpr}]?.${selectorAnchor.path};`,
      `    anchorTargetEl.value = selector ? document.querySelector<HTMLElement>(selector) : null;`,
      `  },`,
      `  { flush: "post" },`,
      `);`,
      `const anchoredPosition = useAnchoredPosition({`,
      `  anchor: () => anchorTargetEl.value,`,
      `  content: () => anchoredRootEl.value,`,
      `  open: () => true,`,
      `  placement: () => ${placementExpr},`,
      `  collision: () => "${collision}",`,
      `});`,
    ].join("\n");
  }

  // Compute classNames from BEM recipe. State props that are channel-driven
  // reference the hook-resolved value (as a Ref, so `.value`).
  const classRecipe = ir.classRecipe;
  const channelValuePropSet = new Set(channels.map((c) => c.valueProp));
  const classExprs: string[] = [`"${classRecipe.base}"`];
  for (const mod of classRecipe.valueModifiers) {
    classExprs.push(
      `props.${mod.propName} ? \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${props.${mod.propName}}\` : null`,
    );
  }
  const channelNamesSet = new Set(channels.map((c) => c.name));
  for (const mod of classRecipe.booleanModifiers) {
    if (channelValuePropSet.has(mod.propName)) {
      // Match by valueProp: find the channel by valueProp and reference
      // its hook-resolved name on the behavior object.
      const ch = channels.find((c) => c.valueProp === mod.propName)!;
      classExprs.push(
        `behavior.${ch.name}.value ? "${classRecipe.base}--${mod.safeName}" : null`,
      );
    } else if (channelNamesSet.has(mod.propName)) {
      classExprs.push(
        `behavior.${mod.propName}.value ? "${classRecipe.base}--${mod.safeName}" : null`,
      );
    } else {
      classExprs.push(
        `props.${mod.safeName} ? "${classRecipe.base}--${mod.safeName}" : null`,
      );
    }
  }
  const classesBody = [
    `const classNames = computed(() => [`,
    ...classExprs.map((e) => `  ${e},`),
    `  props.class,`,
    `].filter(Boolean).join(" "));`,
  ].join("\n");

  // ICON-CATALOG-RUNTIME-DELIVERY-01: glyph nodes get a module-scope
  // size-hints const plus a pair of `computed()` values resolving the
  // catalog lookup. Vue idiom: reactive values are `computed(() => ...)`
  // refs, dereferenced with `.value` in script and auto-unwrapped in the
  // template. A miss (unknown icon name) leaves `iconGlyph.value`
  // undefined and the render branch's `v-if` emits nothing. `Number.NaN`
  // deliberately matches no authored size, so resolveIcon falls back to
  // the smallest authored variant.
  const iconGlyphIdents = new Map<
    DomNodeIR,
    { glyphIdent: string; pxIdent: string | undefined }
  >();
  const iconGlyphLines: string[] = [];
  for (const { node, glyph, suffix } of iconGlyphNodes) {
    const hintsIdent = glyph.sizeHints
      ? `ICON_GLYPH_SIZE_HINTS${suffix}`
      : undefined;
    if (hintsIdent) {
      iconGlyphLines.push(
        `const ${hintsIdent}: Record<string, number> = ` +
          `${iconGlyphSizeHintsLiteral(glyph.sizeHints!)};`,
      );
    }
    const sizeAccessor = glyph.sizePropName
      ? `props.${propAccess(glyph.sizePropName)}`
      : undefined;
    const pxExpr = iconGlyphPxExpr(glyph, sizeAccessor, hintsIdent);
    const glyphIdent = `iconGlyph${suffix}`;
    const pxIdent = pxExpr === undefined ? undefined : `iconGlyphPx${suffix}`;
    if (pxIdent) {
      iconGlyphLines.push(`const ${pxIdent} = computed(() => ${pxExpr});`);
    }
    const nameOptional =
      ir.styledProps.find((p) => p.name === glyph.namePropName)?.required ===
      false;
    iconGlyphLines.push(
      `const ${glyphIdent} = computed(() => resolveIcon(` +
        `${iconGlyphNameArg(`props.${propAccess(glyph.namePropName)}`, nameOptional)}, ` +
        `${pxIdent ? `${pxIdent}.value ?? Number.NaN` : "Number.NaN"}));`,
    );
    iconGlyphIdents.set(node, { glyphIdent, pxIdent });
  }
  const iconGlyphBody = iconGlyphLines.join("\n");

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01 script body: instance-id namespace,
  // provider value (computed so slot/status changes re-derive), consumer
  // injection.
  const fieldAssocLines: string[] = [];
  if (needsInstanceId) fieldAssocLines.push(`const instanceId = useId();`);
  if (providerNeedsSlots) fieldAssocLines.push(`const slots = useSlots();`);
  if (assocProvides) {
    fieldAssocLines.push(
      `const fieldAssociationValue = computed(() => ({`,
      `  controlId: ${vueGeneratedIdExpr(assocProvides.controlSlug)},`,
      `  describedBy: ${vueIdRefListExpr(assocProvides.describedBy, undefined, "script")},`,
      `}));`,
      `provideFieldAssociation(fieldAssociationValue);`,
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
  const ctx: VueRenderContext = {
    classRecipe: classRecipe.base,
    componentName: ir.name,
    channelByName,
    isRoot: true,
    cssPrefix: ir.cssPrefix,
    countdownPart: ir.motion.countdown?.target.name,
    sequence: Boolean(ir.motion.sequence),
    autoDismissPause: Boolean(autoDismissPolicy && autoDismissChannel),
    rootRole: ir.root.rootRole,
    rootPolymorphicTag: ir.root.polymorphicTagProp,
    iconGlyphIdents,
    fieldAssociationConsumerPart: assocConsumerPart,
    rootSelectorAnchored: selectorAnchor !== null,
    // FEAT-A11Y-COMPOSITE-KEYBOARD-01: keyboard-action facts for the walker's
    // `@keydown` lowering and roving-item tabindex rules.
    keyboardActionsByPart: groupKeyboardActionsByPart(ir.keyboardActions),
    compositeItemPart: ir.behavior.focus?.strategy === "roving" ? ir.compositeControl?.part.name : undefined,
    compositeMemberExpr: compositeActivationMember(ir.compositeControl),
    ...(overlayClickTrigger && booleanChannel
      ? {
          overlayClickSetter: `behavior.set${capitalize(booleanChannel.name)}`,
          overlayClickEnabledProp: overlayClickTrigger.enabledByProp,
          overlayClickTargetPart: overlayClickTrigger.targetPart,
        }
      : {}),
  };
  const templateInner = renderVueDomNode(ir.dom, ctx, 2);
  // FEAT-PORTAL-MECHANISM-CROSS-FRAMEWORK-01: full-overlay surfaces
  // (Dialog/Sheet/Toast/Command) portal their root to document.body so a
  // fixed layer escapes any transform/overflow/filter ancestor's containing
  // block. Vue's native idiom is `<Teleport to="body">`, which requires no
  // primitive import and is SSR-safe (Teleport defers to client on hydration).
  // Purely IR-driven via `portalsRootToBody` — no component-name lore. The
  // teleported subtree carries the full root markup, so backdrop-self-click
  // dismissal and every panel-containment check still resolve against the
  // moved nodes (their refs point at the same elements).
  // Selector-anchored root portal (coachmark / guided tour): the whole
  // panel also portals to body — same renderInPortal-shaped consumption via
  // Teleport, plus the anchoredPosition wiring above driving fixed-position
  // styling in the template.
  const wrapRootInPortal = portalsRootToBody(ir) || selectorAnchor !== null;
  const templateBodyLines = wrapRootInPortal
    ? [
        `<template>`,
        `  <Teleport to="body">`,
        templateInner
          .split("\n")
          .map((line) => (line.length > 0 ? `  ${line}` : line))
          .join("\n"),
        `  </Teleport>`,
        `</template>`,
      ]
    : [`<template>`, templateInner, `</template>`];
  const templateBody = templateBodyLines.join("\n");

  const blank = (): Section => ({ kind: "between", body: "" });
  const scriptSections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    { kind: "generated", id: "types", body: typesBody },
    blank(),
    { kind: "custom", id: "types", body: "" },
    blank(),
    { kind: "generated", id: "props", body: propsInterfaceBody },
    blank(),
    { kind: "generated", id: "defineProps", body: definePropsBody },
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
    ...(markdownHelpersBody
      ? [
          {
            kind: "generated" as const,
            id: "markdownHelpers",
            body: markdownHelpersBody,
          },
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
    ...(iconGlyphBody
      ? [
          { kind: "generated" as const, id: "iconGlyph", body: iconGlyphBody },
          blank(),
        ]
      : []),
    { kind: "custom", id: "trailing", body: "" },
  ];

  return [
    `<script setup lang="ts">`,
    renderSections(scriptSections, "line"),
    `</script>`,
    ``,
    templateBody,
    ``,
  ].join("\n");
}

interface VueRenderContext {
  /** Ancestor pre elements preserve template formatting as literal text. */
  preformatted?: boolean;
  classRecipe: string;
  componentName?: string;
  channelByName: Map<string, NormalizedChannelIR>;
  isRoot: boolean;
  /** Component cssPrefix for the root's data-fsds-component identification attr. */
  cssPrefix?: string;
  /** When true, bind the auto-dismiss pause listeners on the root via v-on. */
  sequence?: boolean;
  autoDismissPause?: boolean;
  countdownPart?: string;
  overlayClickSetter?: string;
  overlayClickEnabledProp?: string;
  overlayClickTargetPart?: string;
  /**
   * Effective ARIA role to emit on the root unless the dom tree already
   * declares one. Parity with React's `ReactRenderContext.rootRole`.
   */
  rootRole?: string;
  rootPolymorphicTag?: {
    propName: string;
    defaultTag: string;
  };
  /**
   * Anatomy part that consumes ambient field association.
   */
  fieldAssociationConsumerPart?: string;
  /**
   * Selector-anchored root panel: the root element gets the anchored
   * position wiring (`:ref`, fixed-position `:style`, `:data-placement`)
   * emitted by the script's `anchoredPosition` block. Root-level only.
   */
  rootSelectorAnchored?: boolean;
  /**
   * Identifier names that resolve as iteration aliases (item/index
   * variables introduced by an enclosing `iterate` directive). After
   * BINDING-EXPRESSION-V2-01, binding-side references to these locals
   * are carried as `iterationLocal`-kind bindings and dispatched via
   * `ctx.enclosingIteration`. `iterationScope` survives only as the
   * resolver for the `if:` guard grammar, which still permits
   * `if: "<iterationLocal>"` to mean "render only when truthy in the
   * loop iteration." See `renderVueDomNode` `if:` branch.
   */
  iterationScope?: Set<string>;
  /**
   * Nearest enclosing iteration directive, or `undefined` at the top
   * level. Lookup target for `iterationLocal`-kind bindings.
   */
  enclosingIteration?: IterationIR;
  /**
   * Local identifiers for nodes carrying `iconGlyph`
   * (ICON-CATALOG-RUNTIME-DELIVERY-01), keyed by node identity.
   * `glyphIdent` names the `computed()` ref holding the `resolveIcon(...)`
   * result; `pxIdent` names the requested-pixel `computed()` ref
   * (undefined when the glyph has no size binding). Populated once at the
   * root call from `collectIconGlyphNodes`; empty when the tree has no
   * glyph nodes.
   */
  iconGlyphIdents?: Map<DomNodeIR, { glyphIdent: string; pxIdent: string | undefined }>;
  /**
   * FEAT-A11Y-COMPOSITE-KEYBOARD-01: realized keyboard actions keyed by the
   * declared `when` part. The walker lowers one `@keydown` binding per
   * hosting part; the co-located composable emits the implementation from
   * the same IR facts.
   */
  keyboardActionsByPart?: Map<string, KeyboardActionIR[]>;
  /** The composite control's item part, when the IR declares one. */
  compositeItemPart?: string;
  /** Binding expression the item's click activation passes as the value. */
  compositeMemberExpr?: BindingExpression;
}

/**
 * FEAT-A11Y-LABEL-ID-ASSOCIATION-01 — Vue lowering of generated
 * relationship ids. Ids derive from the single `useId()` namespace
 * (`instanceId` script const) so refs and targets can never drift.
 * Expressions are emitted in two scopes: "template" (attribute bindings,
 * `$slots`, single-quoted literals — the attr value is double-quoted) and
 * "script" (the provider's computed, `slots` from `useSlots()`).
 */
function vueGeneratedIdExpr(slug: string): string {
  return `\`\${instanceId}-${slug}\``;
}

function vueIdRefGuardExpr(
  ref: IdRefIR,
  scope: "script" | "template",
): string | undefined {
  const conds: string[] = [];
  if (ref.slotGate) {
    conds.push(
      scope === "script" ? `slots.${ref.slotGate}` : `$slots.${ref.slotGate}`,
    );
  }
  if (ref.when) {
    const accessor = `props.${propAccess(ref.when.prop)}`;
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

function vueIdRefListExpr(
  refs: IdRefIR[],
  passthroughProp: string | undefined,
  scope: "script" | "template",
): string {
  if (refs.length === 0 && !passthroughProp) return "undefined";
  if (refs.length === 1 && !passthroughProp) {
    const guard = vueIdRefGuardExpr(refs[0], scope);
    const id = vueGeneratedIdExpr(refs[0].slug);
    return guard ? `${guard} ? ${id} : undefined` : id;
  }
  const parts = refs.map((ref) => {
    const guard = vueIdRefGuardExpr(ref, scope);
    const id = vueGeneratedIdExpr(ref.slug);
    return guard ? `${guard} ? ${id} : null` : id;
  });
  if (passthroughProp) parts.push(`props.${propAccess(passthroughProp)}`);
  return `[${parts.join(", ")}].filter(Boolean).join(' ') || undefined`;
}

/**
 * FEAT-A11Y-COMPOSITE-KEYBOARD-01: whether any DOM node carries the
 * `keyboardPanel` fact — those nodes need `bindInteractionPanel` even when
 * the IR declares no focusContainer (the anchor-toggle open path).
 */
function domHasKeyboardPanel(ir: ComponentIR): boolean {
  const walk = (node: DomNodeIR): boolean =>
    node.keyboardPanel === true || node.children.some(walk);
  return ir.dom ? walk(ir.dom) : false;
}

function renderVueDomNode(
  node: DomNodeIR,
  ctx: VueRenderContext,
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
      return `${pad}<slot name="${node.slotName}" />`;
    }
    return `${pad}<slot />`;
  }

  // IR-DOM-ITERATE-CAPABILITY-01 / BINDING-EXPRESSION-V2-01: when this
  // node declares iteration, set `enclosingIteration` so any
  // `iterationLocal` bindings on this node/descendants resolve to the
  // correct lexical name. Continue to extend the legacy `iterationScope`
  // identifier set for the `if:` guard grammar (V2 did not migrate `if:`).
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
  // action's post-open focus target) both receive the interaction panel ref.
  if (node.focusContainer || node.keyboardPanel) attrs.push(`:ref="bindInteractionPanel"`);
  if (node.keyboardAnchor) attrs.push(`:ref="bindInteractionAnchor"`);
  const classParts: string[] = [];
  if (ctx.countdownPart && node.part === ctx.countdownPart) attrs.push(`hidden`);
  if (ctx.countdownPart && node.part === ctx.countdownPart) attrs.push(`:ref="autoDismiss.bindProgress"`);
  if (node.part) classParts.push(`'${ctx.classRecipe}__${node.part}'`);

  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === "class" || key === "className") {
      classParts.push(`'${value}'`);
      continue;
    }
    attrs.push(`${vueAttrName(key)}="${escapeAttrString(value)}"`);
  }

  // textContent bindings render as a `{{ ... }}` interpolation inside the
  // element body, not as a template attribute.
  const textChildren: string[] = [];

  // IR-DOM-BINDING-CAPABILITY-01: the new `content` field is the
  // canonical inner-content binding. Lower via the same Vue
  // interpolation path the legacy textContent uses.
  if (node.content) {
    if (isHighlightTransform(node.content)) {
      // FEAT-CODEBLOCK-HIGHLIGHT-01: one span per token via v-for over the
      // shared pure tokenizer; the gate prop (when declared) degrades to a
      // single plain interpolation of the source binding.
      const transform = node.content;
      const sourceExpr = appendPath(
        vuePropAccessor(transform.sourceProp, ctx),
        transform.source.path,
      );
      const languageExpr = appendPath(
        vuePropAccessor(transform.languageProp, ctx),
        transform.language.path,
      );
      const gateExpr = transform.gate !== undefined
        ? appendPath(vuePropAccessor(transform.gateProp ?? "", ctx), transform.gate.path)
        : "true";
      const tokensExpr = transform.tokensProp ? vuePropAccessor(transform.tokensProp, ctx) : "undefined";
      const prepared = `prepareHighlightSource(${sourceExpr}, ${languageExpr}, { tokens: ${tokensExpr}, highlight: ${gateExpr} })`;
      if (transform.linePart && transform.gutterPart) {
        textChildren.push(
          `<${ctx.componentName}${capitalize(transform.linePart)}Part v-for="line in ${prepared}.lines" :key="line.number" :number="line.number" :ending="line.ending">` +
          `<template v-for="(token, tokenIndex) in line.tokens" :key="tokenIndex">` +
          `<${ctx.componentName}${capitalize(transform.tokenPart)}Part v-if="line.highlighted" :kind="token.kind">{{ token.text }}</${ctx.componentName}${capitalize(transform.tokenPart)}Part>` +
          `<template v-else>{{ token.text }}</template></template></${ctx.componentName}${capitalize(transform.linePart)}Part>`,
        );
      } else {
        textChildren.push(`<span v-for="line in ${prepared}.lines" :key="line.number">{{ line.tokens.map((token) => token.text).join('') + line.ending }}</span>`);
      }
    } else if (isMarkdownTransform(node.content)) {
      // FEAT-MARKDOWN-CONTENT-TRANSFORM-01: the template mounts the local
      // functional tree component; a declared gate falls back to the plain
      // source interpolation.
      const transform = node.content;
      const sourceExpr = appendPath(
        vuePropAccessor(transform.sourceProp, ctx),
        transform.source.path,
      );
      if (transform.gate !== undefined) {
        const gateExpr = appendPath(
          vuePropAccessor(transform.gateProp ?? transform.gate.prop, ctx),
          transform.gate.path,
        );
        textChildren.push(
          `<template v-if="${gateExpr}"><MarkdownTree /></template>` +
            `<template v-else>{{ ${sourceExpr} }}</template>`,
        );
      } else {
        textChildren.push(`<MarkdownTree />`);
      }
    } else {
      const interpolated = renderVueTextContent(
        contentBindingOrTransformSource(node.content)!,
        ctx,
      );
      if (interpolated !== null) textChildren.push(interpolated);
    }
  }

  // IR-DOM-BINDING-CAPABILITY-01: event bindings lower to Vue's
  // `@eventname="..."` syntax. For `prop:X` emit `@click="props.X?.()"`
  // — the optional-chain call invokes the prop when set and is a silent
  // no-op when undefined. Channel events delegate to the existing
  // channel-handler logic.
  for (const [eventName, expr] of Object.entries(node.events)) {
    const activation = eventName === "click" ? node.activation : undefined;
    const disclosure = activation?.channel;
    if (disclosure) {
      const next = activation!.operation === "toggle" ? `!behavior.${disclosure.name}.value` : String(activation!.operation === "open");
      attrs.push(`@click="(e: MouseEvent) => { if (canActivateInteraction(e, ${activation!.cancelNativeDefault})) behavior.set${capitalize(disclosure.name)}(${next}); }"`);
      continue;
    }
    const rendered = renderVueEvent(eventName, expr, ctx);
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: bind the realized keyboard actions onto
  // the declared `when` part's node. The handler ident is part-derived and
  // the co-located composable emits its implementation from the same IR
  // facts. The composite item part's handler receives the item value exactly
  // as the item's click activation passes it, so pointer and keyboard
  // commits stay semantically identical.
  const isCompositeItem = ctx.compositeItemPart !== undefined && node.part === ctx.compositeItemPart;
  if (node.keyboardActions && node.keyboardActions.length > 0 && node.part) {
    const handlerIdent = `behavior.handle${capitalize(node.part)}Keydown`;
    if (isCompositeItem && ctx.compositeMemberExpr) {
      const memberExpr = renderVueBindingValue(ctx.compositeMemberExpr, ctx);
      if (memberExpr !== null) {
        attrs.push(`@keydown="(e) => ${handlerIdent}(e, ${memberExpr})"`);
      }
    } else {
      attrs.push(`@keydown="${handlerIdent}"`);
    }
    // A keyboard host that is not natively focusable must become
    // programmatically focusable so the delegated keys can fire and the
    // vue a11y lint holds; -1 keeps it out of tab order.
    if (isCompositeItem || !NATIVE_FOCUSABLE_TAGS.has(node.tag)) {
      attrs.push(`tabindex="-1"`);
    }
  } else if (isCompositeItem) {
    // Composite roving item without its own keydown: still a roving focus
    // target — focusable for the roving focus path but out of tab order
    // (APG roving tabindex with DOM focus tracking).
    attrs.push(`tabindex="-1"`);
  }

  for (const [key, expr] of Object.entries(node.bindings)) {
    if (key === "textContent" || key === "children") {
      if (!node.content) {
        const interpolated = renderVueTextContent(expr, ctx);
        if (interpolated !== null) textChildren.push(interpolated);
      }
      continue;
    }
    // Dual-pathway dedup for events.
    if (/^on[A-Z]/.test(key)) {
      const evt = key.slice(2).toLowerCase();
      if (node.events[evt]) continue;
    }
    const rendered = renderVueBinding(vueAttrName(key), expr, ctx);
    if (rendered === null) continue;
    // ARIA boolean-ish attributes have type `Booleanish`. Boolean sources
    // pass through; non-boolean sources need explicit string coercion to
    // produce "true"/"false" for screen readers and to satisfy
    // axe/aria-valid-attr-value. Skip the wrap when the source is a known
    // boolean channel — Vue auto-stringifies primitives at render time.
    if (ARIA_BOOLEAN_ATTRS_VUE.has(key)) {
      const sourceType =
        expr.kind === "channel"
          ? ctx.channelByName.get(expr.channel)?.valueType
          : undefined;
      if (sourceType !== "boolean" && sourceType !== undefined) {
        attrs.push(rewriteAriaBoolean(rendered, key));
        continue;
      }
    }
    attrs.push(rendered);
  }

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: generated per-instance id on
  // relationship targets, and the lowered idref attributes on sources.
  if (node.generatedIdSlug !== undefined) {
    attrs.push(`:id="${vueGeneratedIdExpr(node.generatedIdSlug)}"`);
  }
  for (const refAttr of node.idRefAttrs) {
    attrs.push(
      `:${refAttr.attribute}="${vueIdRefListExpr(refAttr.refs, refAttr.passthroughProp, "template")}"`,
    );
  }

  // IR-DOM-CSS-VAR-BINDING-01: lower `cssVarBindings` to a single Vue
  // `:style="{ '--fsds-foo': expr, ... }"` binding. Vue's template parser
  // accepts string-quoted keys with hyphens in object literal style
  // bindings, so the custom-property names go through as written. A
  // literal `style` attr coexisting with cssVarBindings is rejected by
  // the IR builder, so the object can be built fresh here.
  if (node.cssVarBindings.length > 0) {
    const entries: string[] = [];
    for (const { varName, value } of node.cssVarBindings) {
      const valueExpr = renderVueBindingValue(value, ctx);
      if (valueExpr === null) continue;
      entries.push(`'${varName}': ${valueExpr}`);
    }
    if (entries.length > 0) {
      attrs.push(`:style="{ ${entries.join(", ")} }"`);
    }
  }

  // DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01: propertyBindings
  // are DOM-property-only facts (e.g. `indeterminate`) with no HTML
  // attribute form. Vue's bare `:key="expr"` v-bind already sets a DOM
  // property directly (not via setAttribute) for any key that resolves
  // true via `shouldSetAsProp`'s `key in el` fallthrough — the same
  // mechanism already proven live for `:checked`/`:value`/`:selected`
  // above via `renderVueBinding`. No new syntax is needed: reusing
  // `renderVueBinding` is sufficient because `indeterminate` is a real
  // IDL property on HTMLInputElement with no attribute reflection, so
  // Vue's runtime-dom patchProp routes it through patchDOMProp
  // unconditionally (confirmed against the installed
  // @vue/runtime-dom package's shouldSetAsProp).
  for (const [key, expr] of Object.entries(node.propertyBindings)) {
    const rendered = renderVueBinding(key, expr, ctx);
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // ICON-CATALOG-RUNTIME-DELIVERY-01: a glyph node's svg surface comes from
  // the resolved catalog record — data-fsds-icon + viewBox + width/height
  // attrs here, one <path> per glyph path record as the only content, and a
  // `v-if` null-guard so an unknown icon name renders nothing.
  const iconGlyphEntry = ctx.iconGlyphIdents?.get(node);
  const iconGlyphChildLines: string[] = [];
  if (iconGlyphEntry) {
    const { glyphIdent, pxIdent } = iconGlyphEntry;
    attrs.push(`:data-fsds-icon="${glyphIdent}.name"`);
    attrs.push(`:viewBox="${glyphIdent}.viewBox"`);
    const sizeExpr = pxIdent
      ? `${pxIdent} ?? ${glyphIdent}.size`
      : `${glyphIdent}.size`;
    attrs.push(`:width="${sizeExpr}"`);
    attrs.push(`:height="${sizeExpr}"`);
    const childPad = " ".repeat(childIndent);
    const pathAttrs = ICON_GLYPH_PATH_ATTRS.map(
      ({ recordKey, svgAttr }) => `:${svgAttr}="glyphPath.${recordKey}"`,
    ).join(" ");
    iconGlyphChildLines.push(
      `${childPad}<path v-for="(glyphPath, glyphIndex) in ${glyphIdent}.paths" :key="glyphIndex" ${pathAttrs} />`,
    );
  }

  // FIX-OVERLAY-CLICK-DISMISSAL-BINDING-01: the dismissal click binds on the
  // declared targetPart element (the full-cover overlay), never on the root —
  // the root is pointer-events:none under the overlay and can never be the
  // hit target. `.self` fires only when the click target is the overlay
  // itself, not a descendant — avoids a click handler on the inner
  // non-interactive panel (a11y lint).
  if (
    ctx.overlayClickSetter &&
    node.part !== undefined &&
    node.part === ctx.overlayClickTargetPart
  ) {
    const guardExpr = ctx.overlayClickEnabledProp
      ? `props.${propAccess(ctx.overlayClickEnabledProp)} !== false && ${ctx.overlayClickSetter}(false)`
      : `${ctx.overlayClickSetter}(false)`;
    attrs.push(`@click.self="${guardExpr}"`);
  }

  if (
    ctx.fieldAssociationConsumerPart &&
    ctx.fieldAssociationConsumerPart === node.part
  ) {
    // Template scope auto-unwraps the injected ComputedRef (top-level
    // script-setup binding), so the accessor is `.controlId`, not
    // `.value.controlId`.
    attrs.push(`:id="fieldAssociation?.controlId"`);
    attrs.push(`:aria-describedby="fieldAssociation?.describedBy"`);
  }

  if (ctx.isRoot) {
    if (classParts.length > 0) {
      // The root node's BEM class is included in `classNames` (computed).
      // The dom-tree's root part class is the same as classRecipe.base, so
      // we don't double-emit.
      attrs.unshift(`:class="classNames"`);
    } else {
      attrs.unshift(`:class="classNames"`);
    }
    // Apply contract-declared a11y.role on the root unless the dom tree
    // already set `attrs.role` (consumed above into `attrs`).
    if (ctx.rootRole && !node.attrs["role"] && !node.bindings["role"]) {
      attrs.push(`role="${ctx.rootRole}"`);
    }
    attrs.push(`:data-testid="props.dataTestid"`);
    if (ctx.cssPrefix) {
      attrs.push(`data-fsds-component="${ctx.cssPrefix}" data-fsds-box=""`);
    }
    // Selector-anchored root: fixed-position style computed against the
    // active step's page anchor, hidden until the first measurement so the
    // panel never flashes at (0,0).
    if (ctx.rootSelectorAnchored) {
      attrs.push(`:ref="setAnchoredRootEl"`);
      attrs.push(`:data-placement="anchoredPosition.placement"`);
      attrs.push(
        `:style="{ position: 'fixed', top: \`\${anchoredPosition.top}px\`, left: \`\${anchoredPosition.left}px\`, visibility: anchoredPosition.ready ? 'visible' : 'hidden' }"`,
      );
    }
    if (ctx.sequence) attrs.push(`:ref="sequence.bindRoot"`);
    if (ctx.autoDismissPause) {
      attrs.push(`v-on="autoDismiss.pauseListeners"`);
    }
    if (ctx.rootPolymorphicTag && !node.componentRef) {
      attrs.unshift(
        `:is="props.${propAccess(ctx.rootPolymorphicTag.propName)} ?? '${ctx.rootPolymorphicTag.defaultTag}'"`,
      );
    }
  } else if (classParts.length > 0) {
    attrs.unshift(`:class="${classPartsExprVue(classParts)}"`);
  }

  const ifGuard = node.ifProp;
  if (node.ifSlot) {
    const expr = `$slots.${node.ifSlot}`;
    attrs.unshift(`v-if="${node.ifNegated ? `!${expr}` : expr}"`);
  } else if (ifGuard) {
    let expr: string;
    if (ifGuard === "children") {
      expr = "$slots.default";
    } else if (ctx.iterationScope?.has(ifGuard)) {
      // IR-DOM-ITERATE-CAPABILITY-01: if-guard resolves against the
      // iteration scope when the guard name matches an in-scope alias
      // (e.g. `if: "item"`). Bare identifier preserves Vue's v-for
      // template scope.
      expr = ifGuard;
    } else {
      const matchingChannel = [...ctx.channelByName.values()].find(
        (c) => c.valueProp === ifGuard || c.name === ifGuard,
      );
      // Reference behavior.<channelName>.value to avoid prop-name collision —
      // a top-level local `open` would be shadowed by props.open in templates.
      expr = matchingChannel
        ? `behavior.${matchingChannel.name}.value`
        : `props.${propAccess(ifGuard)}`;
    }
    const finalExpr = node.ifNegated ? `!${expr}` : expr;
    attrs.unshift(`v-if="${finalExpr}"`);
  } else if (iconGlyphEntry) {
    // iconGlyph null-guard: an unknown icon name resolves the computed ref
    // to undefined and the svg (whose attrs dereference the glyph record)
    // must not render at all. `iconGlyph` bindings and `if:` guards are
    // mutually exclusive on the same node upstream, so this is a plain
    // `else` — no coexistence case to reconcile.
    attrs.unshift(`v-if="${iconGlyphEntry.glyphIdent}"`);
  }

  // IR-DOM-ITERATE-CAPABILITY-01: when iteration is set without an
  // if-guard, push v-for + :key onto the element's own attrs. Cleanest
  // emit — no <template> wrapper needed because there's no v-if to
  // race against the v-for scope.
  //
  // v-for syntax by source kind:
  //   - kind="array": v-for="(item, index) in source"
  //   - kind="count": v-for="(_, index) in Array(source)"  (0-based.
  //     Vue's numeric form `v-for="i in N"` is 1-indexed, which would
  //     disagree with React/Svelte/Lit semantics; Array(N) yields
  //     {length: N} so v-for over it produces (undefined, 0..N-1).)
  const iter = node.iteration;
  // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: route iteration source through
  // the binding-value renderer. Bare `sourceProp` failed for any prop
  // accessed via `props.X` instead of a bare identifier (Vue 3 `<script
  // setup>` doesn't auto-expose `defineProps` returns as bare locals).
  // The value renderer handles `prop:X` → `props.X` and
  // `channel:X.value` → `behavior.X.value`.
  const iterSourceExpr = iter
    ? renderVueBindingValue(iter.source, ctx)
    : null;
  if (iter && iterSourceExpr === null) {
    throw new Error(
      `Vue emitter: iteration source could not be lowered (source kind=${iter.source.kind})`,
    );
  }
  const vForExpr = iter && iterSourceExpr
    ? iter.kind === "array"
      ? `(${iter.itemVar}, ${iter.indexVar}) in (${iterSourceExpr} ?? [])`
      : `(_, ${iter.indexVar}) in Array(${iterSourceExpr})`
    : null;
  if (iter && !ifGuard) {
    attrs.unshift(`:key="${iter.indexVar}"`);
    attrs.unshift(`v-for="${vForExpr}"`);
  }

  const childCtx: VueRenderContext = { ...ctx, isRoot: false, preformatted: compact };
  const renderedChildren = node.children.map((c) =>
    renderVueDomNode(c, childCtx, childIndent),
  );

  const textChildLines = textChildren.map(
    (tc) => `${" ".repeat(childIndent)}${tc}`,
  );
  const allChildren = [
    ...textChildLines,
    ...renderedChildren,
    ...iconGlyphChildLines,
  ];

  // componentRef: render the referenced component by its PascalCase name.
  // Vue SFC templates resolve a PascalCase tag to the imported component;
  // `:attr` bindings pass identically to a component prop or an HTML attr.
  const tag =
    ctx.isRoot && ctx.rootPolymorphicTag && !node.componentRef
      ? "component"
      : node.componentRef ?? node.tag;
  // A childless componentRef self-closes (`<Image ... />`); `node.tag` is ""
  // for a componentRef so the void-element set never matches it.
  const isVoidEl = node.componentRef
    ? true
    : VOID_HTML_ELEMENTS_VUE.has(tag);

  let body: string;
  if (allChildren.length === 0 && isVoidEl) {
    body = `${pad}<${tag}${formatVueAttrs(attrs)} />`;
  } else if (allChildren.length === 0) {
    body = `${pad}<${tag}${formatVueAttrs(attrs)}></${tag}>`;
  } else {
    body = [
      `${pad}<${tag}${formatVueAttrs(attrs)}>`,
      ...allChildren,
      `${pad}</${tag}>`,
    ].join(separator);
  }

  // IR-DOM-ITERATE-CAPABILITY-01: when iteration AND if-guard coexist,
  // Vue 3 evaluates v-if BEFORE v-for on the same element, which would
  // un-scope the alias used by v-if. Wrap with <template v-for> so the
  // loop's scope is introduced before v-if sees it. :key goes on the
  // template (Vue requires :key on the v-for element).
  if (iter && ifGuard) {
    return [
      `${pad}<template v-for="${vForExpr}" :key="${iter.indexVar}">`,
      (compact ? body : body.replace(/^/gm, "  ")),
      `${pad}</template>`,
    ].join(separator);
  }
  return body;
}

/**
 * Render a textContent binding as a Vue `{{ ... }}` interpolation. Mirrors
 * the React side's child-text rendering: the binding becomes the element's
 * body, not an attribute.
 */
/**
 * Lower a `prop:X` reference to a Vue template expression. When `X` is
 * an in-scope iteration alias (item/index introduced by an enclosing
 * `v-for`), emit the bare identifier — Vue's `v-for` introduces those
 * names as bare locals in the template scope and `props.X` would
 * resolve against component props instead. Otherwise emit the
 * `props.X` accessor as today. IR-DOM-ITERATE-CAPABILITY-01.
 */
/**
 * FEAT-MARKDOWN-CONTENT-TRANSFORM-01 — Vue lowering of the markdown
 * transform: local render functions plus a functional tree component
 * (`<MarkdownTree />` in the template — the idiomatic Vue shape for
 * recursive structures without extra SFC files). One transform per tree
 * (validated upstream); tags/classes/attrs come from the IR fact.
 */
function generateVueMarkdownHelpers(ir: ComponentIR): string[] {
  const transform = collectContentTransforms(ir.dom).find(isMarkdownTransform);
  if (!transform) return [];
  const prefix = ir.classRecipe.base;
  const b = transform.blockParts;
  const bt = transform.blockTags;
  const m = transform.markParts;
  const mt = transform.markTags;
  const blockClass = (part: string): string => `${prefix}__${part}`;
  return [
    `function renderMarkdownBlock(block: MarkdownBlock): VNode {`,
    `  switch (block.kind) {`,
    `    case "heading":`,
    `      return h("${bt.heading}", { class: "${blockClass(b.heading)}", "data-block-kind": "heading", "data-block-kind-level": block.level }, block.children.map(renderMarkdownMark));`,
    `    case "paragraph":`,
    `      return h("${bt.paragraph}", { class: "${blockClass(b.paragraph)}", "data-block-kind": "paragraph" }, block.children.map(renderMarkdownMark));`,
    `    case "list":`,
    `      return block.ordered`,
    `        ? h("${bt.orderedList}", { class: "${blockClass(b.orderedList)}", "data-block-kind": "orderedList" }, block.items.map(renderMarkdownBlock))`,
    `        : h("${bt.unorderedList}", { class: "${blockClass(b.unorderedList)}", "data-block-kind": "unorderedList" }, block.items.map(renderMarkdownBlock));`,
    `    case "listItem":`,
    `      return h("${bt.listItem}", { class: "${blockClass(b.listItem)}", "data-block-kind": "listItem" }, block.children.map(renderMarkdownMark));`,
    `    case "codeBlock":`,
    `      return h("${bt.codeBlock}", { class: "${blockClass(b.codeBlock)}", "data-block-kind": "codeBlock", "data-language": block.language }, block.text);`,
    `    case "blockquote":`,
    `      return h("${bt.blockquote}", { class: "${blockClass(b.blockquote)}", "data-block-kind": "blockquote" }, block.children.map(renderMarkdownMark));`,
    `  }`,
    `}`,
    ``,
    `function renderMarkdownMark(mark: MarkdownMark): VNode {`,
    `  switch (mark.kind) {`,
    `    case "text":`,
    `      return h("span", mark.text);`,
    `    case "code":`,
    `      return h("${mt.code}", { class: "${prefix}__${m.code}", "data-mark-kind": "code" }, mark.text);`,
    `    case "emphasis":`,
    `      return h("${mt.emphasis}", { class: "${prefix}__${m.emphasis}", "data-mark-kind": "emphasis" }, mark.children.map(renderMarkdownMark));`,
    `    case "strong":`,
    `      return h("${mt.strong}", { class: "${prefix}__${m.strong}", "data-mark-kind": "strong" }, mark.children.map(renderMarkdownMark));`,
    `    case "link":`,
    `      return mark.href === null`,
    `        ? h("span", mark.children.map(renderMarkdownMark))`,
    `        : h("${mt.link}", { class: "${prefix}__${m.link}", "data-mark-kind": "link", href: mark.href }, mark.children.map(renderMarkdownMark));`,
    `  }`,
    `}`,
    ``,
    `// A defineComponent-wrapped local component is the unambiguous Vue`,
    `// shape for template-mounted recursive render trees.`,
    `const MarkdownTree = defineComponent({`,
    `  setup: () => () => h(Fragment, null, parseMarkdown(props.${propAccess(transform.sourceProp)} ?? "").map(renderMarkdownBlock)),`,
    `});`,
  ];
}

function vuePropAccessor(propName: string, ctx: VueRenderContext): string {
  // Post-V2 (BINDING-EXPRESSION-V2-01): iteration locals reach the
  // emitter as `iterationLocal`-kind bindings, never as `prop:`
  // bindings — so a `prop:X` accessor is always a real component-prop
  // lookup. The legacy `iterationScope.has(propName)` shortcut is
  // intentionally removed. If you reach this with `propName` matching
  // an iteration local, the IR-build normalization in
  // `promoteIterationLocalsInTree` failed and the bug is upstream.
  void ctx;
  return `props.${propAccess(propName)}`;
}

/**
 * Append a dotted property path to a base Vue template accessor.
 * BINDING-EXPRESSION-V2-PATH-01: identical lowering across all five
 * frameworks because `.x.y` is template-agnostic syntax.
 */
function appendPath(base: string, path: readonly string[] | undefined): string {
  if (!path || path.length === 0) return base;
  return `${base}.${path.join(".")}`;
}

/**
 * Resolve an `iterationLocal`-kind binding to the Vue v-for callback
 * parameter name introduced by the enclosing iteration. The v-for emit
 * writes `v-for="(item, index) in count"` (count) or
 * `v-for="(item, index) in arr"` (array), so the bare identifier
 * matches the iteration's declared `itemVar` / `indexVar`. Returns
 * `null` defensively if the validator missed an out-of-scope reference.
 */
function vueIterationLocalName(
  local: "index" | "item",
  ctx: VueRenderContext,
): string | null {
  const it = ctx.enclosingIteration;
  if (!it) return null;
  if (local === "index") return it.indexVar;
  return it.itemVar ?? null;
}

function renderVueTextContent(
  expr: BindingExpression,
  ctx: VueRenderContext,
): string | null {
  switch (expr.kind) {
    case "prop":
      return `{{ ${appendPath(vuePropAccessor(expr.prop, ctx), expr.path)} }}`;
    case "literal":
      return escapeAttrString(expr.value);
    case "iterationLocal": {
      const name = vueIterationLocalName(expr.local, ctx);
      return name ? `{{ ${appendPath(name, expr.path)} }}` : null;
    }
    case "projection": {
      const lowered = renderVueBindingValue(expr, ctx);
      return lowered === null ? null : `{{ ${lowered} }}`;
    }
    case "valueMap": {
      const lowered = renderVueBindingValue(expr, ctx);
      return lowered === null ? null : `{{ ${lowered} }}`;
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") return `{{ ${appendPath(`behavior.${ch.name}.value`, expr.path)} }}`;
      if (expr.field === "defaultValue" && ch.defaultValueProp) {
        return `{{ props.${propAccess(ch.defaultValueProp)} }}`;
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
      // BINDING-EXPRESSION-V2-PREDICATE-01: defensive. The IR validator
      // rejects predicates in content position; this branch keeps the
      // exhaustive switch from falling through if a future site admits
      // predicate-valued text.
      const lowered = renderVuePredicate(expr, ctx);
      return lowered === null ? null : `{{ ${lowered} }}`;
    }
    case "conditional": {
      const lowered = renderVueBindingValue(expr, ctx);
      return lowered === null ? null : `{{ ${lowered} }}`;
    }
  }
}

function classPartsExprVue(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  return `[${parts.join(", ")}]`;
}

function formatVueAttrs(attrs: string[]): string {
  if (attrs.length === 0) return "";
  return " " + attrs.join(" ");
}

function escapeAttrString(s: string): string {
  return s.replace(/"/g, "&quot;");
}

function singleQuotedJsString(s: string): string {
  return `'${s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")}'`;
}

/**
 * Map a binding expression into a Vue template attribute. Channel onChange
 * handlers become `@change="(e) => setX((e.target as HTMLInputElement).checked)"`
 * etc., based on the channel's value type.
 */
function renderVueBinding(
  attr: string,
  expr: BindingExpression,
  ctx: VueRenderContext,
): string | null {
  switch (expr.kind) {
    case "prop":
      return `:${attr}="${appendPath(vuePropAccessor(expr.prop, ctx), expr.path)}"`;
    case "literal":
      return `${attr}="${escapeAttrString(expr.value)}"`;
    case "iterationLocal": {
      const name = vueIterationLocalName(expr.local, ctx);
      return name ? `:${attr}="${appendPath(name, expr.path)}"` : null;
    }
    case "projection": {
      const lowered = renderVueBindingValue(expr, ctx);
      return lowered === null ? null : `:${attr}="${lowered}"`;
    }
    case "valueMap": {
      const lowered = renderVueBindingValue(expr, ctx);
      return lowered === null ? null : `:${attr}="${lowered}"`;
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") {
        // Reference behavior.<name>.value — Vue's auto-unwrap only kicks in
        // for top-level refs in template scope. For nested property access
        // we must explicitly read .value to satisfy strict typecheck.
        return `:${attr}="${appendPath(`behavior.${ch.name}.value`, expr.path)}"`;
      }
      if (expr.field === "defaultValue") {
        if (!ch.defaultValueProp) return null;
        return `:${attr}="props.${propAccess(ch.defaultValueProp)}"`;
      }
      // Event handler synthesis. Value-bearing `input` / `change` events
      // unwrap the DOM event based on valueType. For activation events
      // (`onClick` → `@click`, etc.), boolean channels toggle; other
      // valueTypes pass through the current value (no DOM payload).
      // Event-shaped channels skip unwrapping entirely.
      const eventName = mapJsxEventToVue(attr);
      if (ch.callbackKind === "event") {
        return `@${eventName}="props.${propAccess(ch.changeHandlerProp)}"`;
      }
      const setter = `behavior.set${capitalize(ch.name)}`;
      const isValueEvent = attr === "onChange" || attr === "onInput";
      if (isValueEvent) {
        if (ch.valueType === "boolean") {
          return `@${eventName}="(e) => ${setter}((e.target as HTMLInputElement).checked)"`;
        }
        if (ch.valueType === "number") {
          return `@${eventName}="(e) => ${setter}(Number((e.target as HTMLInputElement).value))"`;
        }
        if (ch.valueType === "string" || ch.valueType === undefined) {
          return `@${eventName}="(e) => ${setter}((e.target as HTMLInputElement).value)"`;
        }
        return `@${eventName}="(e) => ${setter}(e as unknown as ${ch.valueType})"`;
      }
      if (ch.valueType === "boolean") {
        return `@${eventName}="() => ${setter}(!behavior.${ch.name}.value)"`;
      }
      return `@${eventName}="() => ${setter}(behavior.${ch.name}.value)"`;
    }
    case "channelCall": {
      // FEAT-BINDING-CALL-WITH-ARG-01: invoke the channel's setter WITH the
      // per-item payload. Emits `@click="() => behavior.setSelection(item.value)"`.
      // The argument is rendered as a bare Vue template expression so
      // `iter:item.value` picks up the v-for alias, matching the iteration
      // lowering conventions the other cases use.
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      const eventName = mapJsxEventToVue(attr);
      const setter = `behavior.set${capitalize(ch.name)}`;
      const argExpr = renderVueBindingValue(expr.arg, ctx);
      if (argExpr === null) return null;
      return `@${eventName}="() => ${setter}(${argExpr})"`;
    }
    case "channelUpdate": {
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: compose the next value inline and
      // pass it through the canonical setter. Vue template expressions permit
      // the full JS body (arrows/spread/filter), so no synthesized helper.
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      const eventName = mapJsxEventToVue(attr);
      const setter = `behavior.set${capitalize(ch.name)}`;
      const operands = expr.operands.map((o) => renderVueBindingValue(o, ctx));
      if (operands.some((o) => o === null)) return null;
      const body = composeChannelUpdateExpression(expr.op, {
        current: `behavior.${ch.name}.value`,
        setter,
        eventValue: "(e.target as HTMLInputElement).value",
        operands: operands as string[],
      });
      const param = expr.op === "setCharAt" ? "(e)" : "()";
      return `@${eventName}="${param} => ${body}"`;
    }
    case "predicate": {
      // BINDING-EXPRESSION-V2-PREDICATE-01. `lowered` is already a valid
      // Vue template-expression string (comparison operators, prop
      // accessors, JSON.stringify'd literals with real embedded quotes) —
      // NOT HTML text. escapeAttrString would corrupt embedded `"` (e.g.
      // from a literal operand) into `&quot;`, which Vue's expression
      // parser reads as literal entity characters, not a quote — breaking
      // the expression. The outer `:attr="..."` delimiter is parsed by
      // Vue's own template compiler, same as the unescaped channel/prop
      // branches above (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-
      // INDETERMINATE-01 found this via Checkbox's aria-checked, the
      // first conditional binding with a literal string operand used in
      // attribute position).
      const lowered = renderVuePredicate(expr, ctx);
      return lowered === null ? null : `:${attr}="${lowered}"`;
    }
    case "conditional": {
      const lowered = renderVueBindingValue(expr, ctx);
      return lowered === null ? null : `:${attr}="${lowered}"`;
    }
  }
}

/**
 * Lower a predicate-kind binding to a Vue template-expression string
 * (the bare comparison without the `:attr=` scaffold). Operand
 * accessors come from `renderVueBindingValue` so they pick up the
 * idiomatic Vue prefixes (`props.X`, `behavior.X.value`, iter locals).
 */
function renderVuePredicate(
  expr: BindingExpression & { kind: "predicate" },
  ctx: VueRenderContext,
): string | null {
  const left = renderVueBindingValue(expr.left, ctx);
  const right = renderVueBindingValue(expr.right, ctx);
  if (left === null || right === null) return null;
  return loweredVuePredicate(expr.op, left, right);
}

function loweredVuePredicate(op: BindingPredicateOp, left: string, right: string): string {
  switch (op) {
    case "eq":
      return `(${left} === ${right})`;
    case "contains":
      return `((${left} ?? []).includes(${right}))`;
    case "memberOf":
      return `(Array.isArray(${right}) ? ${right}.includes(${left}) : ${left} === ${right})`;
  }
}

/**
 * Lower a BindingExpression to a bare Vue template expression (no `:attr=`
 * scaffolding). Used by callers that splice the expression into a
 * surrounding template construct — `cssVarBindings` -> `:style="{ key: <expr> }"`,
 * and any future v-for / inline calc context. Returns null for binding
 * kinds that can't appear in an expression position (e.g. channel events).
 */
function renderVueBindingValue(
  expr: BindingExpression,
  ctx: VueRenderContext,
): string | null {
  switch (expr.kind) {
    case "prop":
      return appendPath(vuePropAccessor(expr.prop, ctx), expr.path);
    case "literal":
      return singleQuotedJsString(expr.value);
    case "iterationLocal": {
      const name = vueIterationLocalName(expr.local, ctx);
      return name ? appendPath(name, expr.path) : null;
    }
    case "projection": {
      const source = renderVueBindingValue(expr.source, ctx);
      return source === null
        ? null
        : expr.op === "selectionLabel"
          ? composeBindingProjectionExpression(expr.op, source, renderVueBindingValue(expr.selection, ctx) ?? "undefined", renderVueBindingValue(expr.fallback, ctx) ?? "undefined")
          : composeBindingProjectionExpression(expr.op, source);
    }
    case "valueMap": {
      const source = renderVueBindingValue(expr.source, ctx);
      return source === null
        ? null
        : composeValueMapExpression(expr, source, singleQuotedJsString);
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") return appendPath(`behavior.${ch.name}.value`, expr.path);
      if (expr.field === "defaultValue" && ch.defaultValueProp) {
        return `props.${propAccess(ch.defaultValueProp)}`;
      }
      return null;
    }
    case "channelCall":
      // FEAT-BINDING-CALL-WITH-ARG-01: event-position only; it produces a
      // `() => …` handler, not a value. The IR rejects it in value positions.
      return null;
    case "channelUpdate":
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: event-position only; produces a
      // handler, not a value. The IR rejects it in value positions.
      return null;
    case "predicate":
      // BINDING-EXPRESSION-V2-PREDICATE-01: value-position predicate.
      // The IR-build validator rejects predicate-kind expressions in
      // content/events/iterate.source/cssVarBindings, so this branch is
      // defensive — if a future site admits predicates in value
      // position, the lowering shape is already correct here.
      return renderVuePredicate(expr, ctx);
    case "conditional": {
      const condition = renderVueBindingValue(expr.condition, ctx);
      const whenTrue = renderVueBindingValue(expr.whenTrue, ctx);
      const whenFalse = renderVueBindingValue(expr.whenFalse, ctx);
      if (condition === null || whenTrue === null || whenFalse === null) return null;
      return `(${condition} ? ${whenTrue} : ${whenFalse})`;
    }
  }
}

/**
 * Translate React-style camelCase attribute names to their HTML-native
 * equivalents for Vue templates. Vue passes attribute names through to the
 * rendered HTML, so `htmlFor` would emit a literal `htmlFor="..."` attribute
 * (invalid HTML). Event handlers are translated separately by
 * `mapJsxEventToVue` — this helper only handles non-event attrs.
 */
function vueAttrName(name: string): string {
  if (name === "htmlFor") return "for";
  return name;
}

/**
 * Lower an entry from `node.events` into Vue's `@eventname="..."` form.
 * For `prop:X` returns `@click="props.X?.()"` — the optional-chain
 * invokes the callback when set and is a silent no-op when undefined.
 * Channel events delegate to the channel-handler logic in
 * renderVueBinding by re-deriving the synthetic JSX-attr name.
 */
function renderVueEvent(
  eventName: string,
  expr: BindingExpression,
  ctx: VueRenderContext,
): string | null {
  switch (expr.kind) {
    case "prop":
      return `@${eventName}="${vuePropAccessor(expr.prop, ctx)}?.()"`;
    case "literal":
      // Rare. Inline as a string handler.
      return `@${eventName}="${escapeAttrString(expr.value)}"`;
    case "iterationLocal": {
      // Iteration locals (index/item) are values, not callables. An
      // event-handler binding to an iteration local doesn't make sense;
      // surface as a null so the caller (`renderVueDomNode`) drops the
      // attribute and the IR-build validator can be extended later if a
      // contract author tries this.
      void ctx;
      return null;
    }
    case "projection":
      return null;
    case "valueMap":
      return null;
    case "channel": {
      const jsxAttr = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      return renderVueBinding(jsxAttr, expr, ctx);
    }
    case "channelCall": {
      // FEAT-BINDING-CALL-WITH-ARG-01: delegate to renderVueBinding (which
      // emits the `@event="() => behavior.setX(arg)"` handler), reconstructing
      // the synthetic JSX-attr name the same way the channel case does.
      const jsxAttr = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      return renderVueBinding(jsxAttr, expr, ctx);
    }
    case "channelUpdate": {
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: delegate to renderVueBinding, which
      // emits the composed `@event="(e) => behavior.setX(...)"` handler.
      const jsxAttr = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      return renderVueBinding(jsxAttr, expr, ctx);
    }
    case "predicate":
      // BINDING-EXPRESSION-V2-PREDICATE-01: validator rejects this at
      // IR-build; the case keeps the switch exhaustive.
      return null;
    case "conditional":
      return null;
  }
}

function mapJsxEventToVue(attr: string): string {
  if (attr === "onChange") return "change";
  if (attr === "onClick") return "click";
  if (attr === "onInput") return "input";
  if (attr === "onKeyDown") return "keydown";
  if (attr === "onKeyUp") return "keyup";
  if (attr === "onFocus") return "focus";
  if (attr === "onBlur") return "blur";
  if (attr.startsWith("on") && attr.length > 2) {
    return attr.slice(2).toLowerCase();
  }
  return attr;
}

/** Vue prop access helper: the camelized key Vue stores the prop under. */
function propAccess(name: string): string {
  if (!name) return "";
  return vuePropKey(name);
}

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

const VOID_HTML_ELEMENTS_VUE = new Set([
  "area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "source", "track", "wbr",
]);

const ARIA_BOOLEAN_ATTRS_VUE = new Set([
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

/**
 * If `rendered` is a bound template attribute for an ARIA boolean-ish
 * attribute (`:aria-selected="behavior.value.value"`), rewrite its
 * expression to coerce to Vue's Booleanish union: the binding becomes a
 * ternary that yields `undefined` when the source is undefined (so Vue
 * omits the attribute), `"true"` for truthy, `"false"` for falsy.
 * Static literal attrs and non-aria-boolean bindings pass through.
 */
function rewriteAriaBoolean(rendered: string, key: string): string {
  if (!ARIA_BOOLEAN_ATTRS_VUE.has(key)) return rendered;
  const boundMatch = rendered.match(/^:([a-z-]+)="(.+)"$/);
  if (boundMatch) {
    const expr = boundMatch[2];
    // `expr === undefined ? undefined : Boolean(expr)` — preserves the
    // attribute-omission behavior for undefined while coercing to boolean
    // for any other value. Vue's Booleanish accepts boolean directly.
    return `:${boundMatch[1]}="${expr} === undefined ? undefined : Boolean(${expr})"`;
  }
  return rendered;
}
