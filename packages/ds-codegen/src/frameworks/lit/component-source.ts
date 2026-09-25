/**
 * Lit LitElement emission, IR-driven.
 *
 * Output shape (single TypeScript class file):
 *
 *   // @generated:start imports
 *   import { LitElement, html, css } from 'lit';
 *   import { property } from 'lit/decorators.js';
 *   import { classMap } from 'lit/directives/class-map.js';
 *   // @generated:end
 *   // @custom:start imports
 *   // @custom:end
 *
 *   // @generated:start types
 *   export type ButtonSize = 'small' | 'medium' | 'large';
 *   // @generated:end
 *   // @custom:start types
 *   // @custom:end
 *
 *   // @generated:start component
 *   export class ButtonElement extends LitElement { ... }
 *   customElements.define('fsds-button', ButtonElement);
 *   // @generated:end
 *   // @custom:start trailing
 *   // @custom:end
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
import {
  TABLE_COMPOSITION_TAGS,
  canonicalTsType,
  composeBindingProjectionExpression,
  composeChannelUpdateExpression,
  composeValueMapExpression,
  collectContentTransforms,
  isHighlightTransform,
  isMarkdownTransform,
  contentBindingOrTransformSource,
  NATIVE_FOCUSABLE_TAGS,
  compositeActivationMember,
  groupKeyboardActionsByPart,
  keyboardModeGateProps,
} from "../../ir.js";
import type { ContractTypeDef } from "../../contract.js";
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
import { toKebab } from "../../contract.js";
import { resolveComponentRefImports } from "../component-ref-imports.js";
import { litHighlightParts } from "../highlight-web-parts.js";
import { emitLitInlineCss, escapeCssForLitTemplate } from "../../css.js";
import {
  isCompoundStateContainer,
  isDisclosureContainer,
  getGroupHostOrnamentPart,
  getInteractiveItemPart,
  getMultipleItemPart,
  getRegionPart,
} from "../react/hook-source.js";
import {
  collectIconGlyphNodes,
  ICON_GLYPH_PATH_ATTRS,
  ICONOGRAPHY_MODULE,
  iconGlyphNameArg,
  iconGlyphPxExpr,
  iconGlyphSizeHintsLiteral,
} from "../icon-glyph.js";

/**
 * Build the `static override styles = css\`…\`;` line(s) for a Lit
 * component. Inlines the component's own CSS (slots + property
 * references) into the shadow root because shadow DOM cannot consume
 * a sibling `.css` file via `@import`.
 *
 * `extraHostRules` is appended after the inlined component CSS for
 * components whose host element needs structural styling beyond the
 * default `:host { display: contents; }` (e.g. TabsTab using
 * `display: inline-flex`).
 *
 * When the component has no generated CSS (helper-only classes like
 * the Stack passthrough), falls back to the bare host rule.
 */
function litStaticStylesLine(
  ir: ComponentIR,
  hostRule = ":host { display: contents; }",
  extraHostRules = "",
): string[] {
  const componentCss = emitLitInlineCss(ir);
  const hostBody = [hostRule, extraHostRules].filter((s) => s.trim()).join(" ");
  if (!componentCss) {
    return [`  static override styles = css\`${hostBody}\`;`];
  }
  const escaped = escapeCssForLitTemplate(componentCss);
  return [
    `  static override styles = css\``,
    `    ${hostBody}`,
    ...escaped.split("\n").map((line) => `    ${line}`.trimEnd()),
    `  \`;`,
  ];
}

/**
 * Map a TypeScript type string from React conventions to Lit-safe types via
 * the shared non-React translator. Lit components are plain DOM elements,
 * so React-specific types collapse to web-platform / `unknown` stand-ins.
 */
function litType(typeStr: string): string {
  return translateNonReactType(typeStr);
}

/**
 * Lower a framework-neutral PropTypeIR into a Lit/TS type expression. Reads the
 * structured `propType` (ref from `propType.to`, fallback via the legacy string
 * path on `propType.raw`, V1 kinds via the canonical string) so output is
 * byte-identical. (CODEGEN-PROP-TYPE-IR-PILOT-01, slice 2)
 */
function lowerLitPropType(pt: PropTypeIR): string {
  switch (pt.kind) {
    case "ref":
      return litType(pt.to);
    case "fallback":
      return litType(pt.raw);
    default:
      return litType(canonicalTsType(pt));
  }
}

/** Decorator-option classification from the neutral type (ref/fallback resolve via the existing path). */
function litPropertyTypeFromPropType(
  pt: PropTypeIR,
  definedTypes?: Record<string, ContractTypeDef>,
): LitPropertyDecorator {
  switch (pt.kind) {
    case "ref":
      return litPropertyType(pt.to, definedTypes);
    case "fallback":
      return litPropertyType(pt.raw, definedTypes);
    default:
      return litPropertyType(canonicalTsType(pt), definedTypes);
  }
}

/**
 * Apply a Lit-only type alias rename to a TypeScript type expression so that
 * property declarations reference the renamed alias. Word-boundary match
 * avoids touching substrings.
 */
function applyLitTypeRename(
  typeStr: string,
  rename: { from: string; to: string } | null,
): string {
  if (!rename) return typeStr;
  return typeStr.replace(new RegExp(`\\b${rename.from}\\b`, "g"), rename.to);
}

// Use the shared toKebab from contract.ts so Lit component-source kebabbing
// matches everywhere else (in particular the Lit test generator, which uses
// the same shared util via test-plan.ts). The previous local `toKebabCase`
// inserted a hyphen before *every* capital letter and produced names like
// `fsds-o-t-p` that didn't match `plan.testId` ("fsds-otp").
function toKebabCase(name: string): string {
  return toKebab(name);
}

/**
 * Build a Lit-template-safe accessor expression for an internal field bound
 * to a contract prop. Three rules:
 *   - Kebab-case prop → bracket access (`this["data-foo"]`).
 *   - Method-name collision (animate, scrollTo…) → renamed `_${name}` field
 *     emitted earlier to avoid shadowing the inherited Element method.
 *   - Normal camelCase → dot access (`this.foo`).
 */
function propAccessor(propName: string): string {
  if (propName.includes("-")) return `this["${propName}"]`;
  if (LIT_ELEMENT_METHOD_NAMES.has(propName)) return `this._${propName}`;
  return `this.${propName}`;
}

/**
 * Lower a `prop:X` reference to a Lit template expression. Post-V2
 * (BINDING-EXPRESSION-V2-01), iteration locals reach the emitter as
 * `iterationLocal`-kind bindings, never as `prop:` bindings — so this
 * always routes through `propAccessor` (which prefixes `this.` or
 * `this["..."]` for hyphenated names). The legacy
 * `iterationScope.has(propName)` shortcut is removed.
 *
 * FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: a `@property()` class-field
 * initializer (`x?: T = default`) applies its default ONLY at
 * construction — a later explicit `undefined` assignment does not
 * re-trigger it, so a bare `this.x` read downstream of construction can
 * observe `undefined` even though the contract declares a default. React
 * (parameter default), Vue (`withDefaults`), and Svelte (`export let`)
 * don't have this gap because their defaulting is parameter-evaluation,
 * not one-shot field initialization. When the resolved prop declares a
 * contract `defaultExpr`, wrap the read as `(this.x ?? default)` so every
 * downstream consumer of this accessor — conditional/predicate bindings,
 * class modifiers, future binding kinds — inherits parity by construction
 * instead of each call site re-deriving it. Props with no contract
 * default keep the bare read (never invent a default).
 */
function litPropAccessor(propName: string, ctx: LitRenderContext): string {
  return defaultAwareLitPropAccessor(propName, ctx.styledByName);
}

/**
 * Shared default-wrapping logic behind `litPropAccessor`, factored out so
 * the handful of call sites that only have `ir.styledProps` in scope
 * (class-modifier loops that run before a `LitRenderContext` exists) can
 * apply the identical defaulting rule without duplicating it or
 * threading a full render context through generation functions that
 * don't otherwise need one.
 */
function defaultAwareLitPropAccessor(
  propName: string,
  styledByName: ReadonlyMap<string, { type: string; defaultExpr?: string }>,
): string {
  const bare = propAccessor(propName);
  const defaultExpr = styledByName.get(propName)?.defaultExpr;
  return defaultExpr === undefined ? bare : `(${bare} ?? ${defaultExpr})`;
}

/**
 * Append a dotted property path to a base Lit template expression.
 * BINDING-EXPRESSION-V2-PATH-01: identical lowering across all five
 * frameworks because `.x.y` is template-agnostic syntax.
 */
function appendPath(base: string, path: readonly string[] | undefined): string {
  if (!path || path.length === 0) return base;
  return `${base}.${path.join(".")}`;
}

/**
 * Resolve an `iterationLocal`-kind binding to the Lit iteration
 * callback parameter name. Lit's emit wraps the iterated subtree in
 * `.map((item, index) => html\`...\`)` (array) or
 * `Array.from({ length: N }, (_, index) => html\`...\`)` (count) —
 * the bare identifier matches the iteration's declared `itemVar` /
 * `indexVar`.
 */
function litIterationLocalName(
  local: "index" | "item",
  ctx: LitRenderContext,
): string | null {
  const it = ctx.enclosingIteration;
  if (!it) return null;
  if (local === "index") return it.indexVar;
  return it.itemVar ?? null;
}

// ---------------------------------------------------------------------------
// Import block
// ---------------------------------------------------------------------------

function generateImports(ir: ComponentIR): string {
  const hasClassMap =
    ir.classRecipe.valueModifiers.length > 0 ||
    ir.classRecipe.booleanModifiers.length > 0;

  const litImports = ["LitElement", "html", "css"];
  const decorators = ["property"];
  const directives: string[] = [];

  if (hasClassMap) directives.push("classMap");

  const lines: string[] = [
    `import { ${litImports.join(", ")} } from 'lit';`,
    `import { ${decorators.join(", ")} } from 'lit/decorators.js';`,
  ];
  if (directives.length > 0) {
    lines.push(
      `import { ${directives.join(", ")} } from 'lit/directives/class-map.js';`,
    );
  }
  // Use a relative import to the primitives barrel rather than the
  // package self-reference: tsup/tsc can't resolve `@full-stack-ds/lit/
  // primitives` during the package's own DTS build, since the published
  // dist doesn't exist yet at that point.
  lines.push(
    `import { StackElement as _Stack } from '../../primitives/index.js';`,
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

/**
 * Lit element classes are named `${ir.name}Element`. Some contracts declare
 * a `definedTypes` alias with the same name (e.g. `ListElement` for the `as`
 * prop's union of "ul"/"ol"/"dl") — TypeScript then sees both the type alias
 * and the class in the same module and raises TS2300 duplicate identifier.
 *
 * For Lit only, the colliding alias is renamed `${ir.name}As` everywhere it
 * appears: in the alias declaration line itself, and in every `litType()`
 * lookup for prop types that reference it. The change is purely lexical
 * within the generated module — the contract is untouched, and other
 * framework emitters (Vue/Angular/Svelte) continue to use the original name.
 */
function litAliasRename(ir: ComponentIR): { from: string; to: string } | null {
  const collidingName = `${ir.name}Element`;
  if (ir.definedTypes[collidingName]) {
    return { from: collidingName, to: `${ir.name}As` };
  }
  return null;
}

function applyLitAliasRename(
  source: string,
  rename: { from: string; to: string } | null,
): string {
  if (!rename) return source;
  // Word-boundary replace to avoid mangling unrelated identifiers.
  const re = new RegExp(`\\b${rename.from}\\b`, "g");
  return source.replace(re, rename.to);
}

function generateTypes(ir: ComponentIR): string {
  const aliases = emitNonReactTypeAliases(ir).join("\n");
  return applyLitAliasRename(aliases, litAliasRename(ir));
}

// ---------------------------------------------------------------------------
// Class body
// ---------------------------------------------------------------------------

// Props that Lit handles natively or shouldn't become @property declarations.
// children → <slot>, className → React convention (class handled by classRecipe).
// id/title/lang/dir are inherited from HTMLElement with non-optional types
// — redeclaring them as `?:` triggers TS2416 (subtype conflict) and cascades
// into TS2345 on customElements.define(). Users still set them as attributes.
const LIT_SKIP_PROPS = new Set([
  "class",
  "style",
  "children",
  "className",
  "id",
  "title",
  "lang",
  "dir",
  "slot",
  "tabIndex",
  "draggable",
  "role",
]);

// `LitElement` inherits the `ARIAMixin` interface via `HTMLElement`. Every
// `aria-*` attribute has a corresponding camelCase IDL accessor typed
// `string | null` (NOT `string | undefined`, and NOT `boolean` — even
// boolean-shaped ARIA attrs like `aria-pressed` accept `"true"`/`"false"`/
// `"mixed"` strings at the DOM level). Declaring `@property() ariaLabel?:
// string` produces TS2416 because `string | undefined` isn't assignable to
// `string | null`. Emit ARIA props through the `override` path with
// `string | null` and `reflect: true` so the attribute round-trips to the
// DOM for assistive tech.
const ARIA_MIXIN_NAMES = new Set([
  "ariaActiveDescendant",
  "ariaAtomic",
  "ariaAutoComplete",
  "ariaBrailleLabel",
  "ariaBrailleRoleDescription",
  "ariaBusy",
  "ariaChecked",
  "ariaColCount",
  "ariaColIndex",
  "ariaColIndexText",
  "ariaColSpan",
  "ariaCurrent",
  "ariaDescription",
  "ariaDisabled",
  "ariaExpanded",
  "ariaHasPopup",
  "ariaHidden",
  "ariaInvalid",
  "ariaKeyShortcuts",
  "ariaLabel",
  "ariaLevel",
  "ariaLive",
  "ariaModal",
  "ariaMultiLine",
  "ariaMultiSelectable",
  "ariaOrientation",
  "ariaPlaceholder",
  "ariaPosInSet",
  "ariaPressed",
  "ariaReadOnly",
  "ariaRelevant",
  "ariaRequired",
  "ariaRoleDescription",
  "ariaRowCount",
  "ariaRowIndex",
  "ariaRowIndexText",
  "ariaRowSpan",
  "ariaSelected",
  "ariaSetSize",
  "ariaSort",
  "ariaValueMax",
  "ariaValueMin",
  "ariaValueNow",
  "ariaValueText",
]);

// `LitElement` (via `HTMLElement` / `Element`) exposes a handful of bare-name
// methods/accessors that contracts have historically used as prop names
// (`animate` on Skeleton). Declaring an `@property() animate?: string` shadows
// `Element.animate()` and breaks TypeScript subtyping. Treat the same way as
// ARIA props: emit through a kebab-attribute string property under a
// non-colliding internal field name (`_animate`).
const LIT_ELEMENT_METHOD_NAMES = new Set([
  "animate",
  "scroll",
  "scrollTo",
  "scrollBy",
  "scrollIntoView",
  "focus",
  "blur",
  "click",
]);

/**
 * Translate a camelCase ARIA prop name to its kebab-case HTML attribute name.
 * Single special-case: `ariaLabelledBy` → `aria-labelledby` (not `-labelled-by`).
 */
function ariaCamelToKebab(name: string): string {
  // Strip "aria" prefix, lowercase the rest with kebab insertion.
  const rest = name.slice(4);
  let out = "aria";
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (i === 0) {
      out += "-" + ch.toLowerCase();
    } else if (/[A-Z]/.test(ch)) {
      out += ch.toLowerCase();
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Decide how a contract-prop type should be reflected as a Lit
 * `@property()` decorator option. Three buckets:
 *
 *   - `null`: not a declarative property at all (event handlers,
 *     function-valued props). Caller should skip emitting an
 *     @property declaration entirely.
 *
 *   - `{ kind: "primitive", type: "Boolean" | "Number" | "String" }`:
 *     a primitive that Lit's built-in attribute<->property
 *     converter understands. Emit `@property({ type: <T> })`.
 *
 *   - `{ kind: "internal" }`: a complex type (array, object, union
 *     including object types, Date, etc.) that Lit's built-in
 *     converter doesn't handle. Emit `@property({ attribute: false })`
 *     so Lit does NOT try to reflect the value to an HTML attribute.
 *     Consumers set the property directly on the element instance.
 *
 * Source of truth: Lit's built-in attribute converter handles
 * Boolean/Number/String only (per the Lit 3 docs). Non-primitive
 * @property declarations without `attribute: false` produce
 * lit-analyzer warnings 'The built in converter doesn't handle the
 * property type X' (rules: incompatible-property-type +
 * no-incompatible-type-binding).
 */
type LitPropertyDecorator =
  | null
  | { kind: "primitive"; type: "Boolean" | "Number" | "String" }
  | { kind: "internal" };

function litPropertyType(
  rawType: string,
  definedTypes?: Record<string, ContractTypeDef>,
): LitPropertyDecorator {
  // Event handlers are not declarative Lit properties — skip them.
  if (
    rawType.includes("EventHandler") ||
    rawType.includes("=> void") ||
    rawType.includes("=> never") ||
    rawType.includes("Function")
  )
    return null;
  const t = litType(rawType);
  if (t === "boolean") return { kind: "primitive", type: "Boolean" };
  if (t === "number") return { kind: "primitive", type: "Number" };
  if (t === "string") return { kind: "primitive", type: "String" };
  // Named string-union aliases (e.g. `TabsAppearance = "underline" | "pills"`)
  // are attribute-reflectable as plain strings. Without this, declaring the
  // prop as `attribute: false` would decouple the HTML attribute from the
  // property and break `el.setAttribute("appearance", "pills")` usage.
  if (definedTypes) {
    const def = definedTypes[rawType];
    if (
      def?.kind === "union" &&
      Array.isArray(def.values) &&
      def.values.every((v) => typeof v === "string")
    ) {
      return { kind: "primitive", type: "String" };
    }
  }
  // Anything else — array, object, named interface, union of object
  // types, Date, etc. — is not attribute-reflectable via Lit's
  // built-in converter. Emit as an internal-only property.
  return { kind: "internal" };
}

/** Format the decorator options string for a LitPropertyDecorator. */
function litPropertyDecoratorOptions(spec: LitPropertyDecorator): string {
  if (spec === null) {
    throw new Error(
      "litPropertyDecoratorOptions called on a null spec; caller should have skipped emission.",
    );
  }
  if (spec.kind === "primitive") {
    return `{ type: ${spec.type} }`;
  }
  return `{ attribute: false }`;
}

function generatePropertyDeclarations(ir: ComponentIR): string[] {
  const lines: string[] = [];
  const declared = new Set<string>();
  const rename = litAliasRename(ir);

  for (const p of ir.styledProps) {
    if (LIT_SKIP_PROPS.has(p.name)) continue;
    if (ARIA_MIXIN_NAMES.has(p.name)) {
      lines.push(
        `  @property({ attribute: '${ariaCamelToKebab(p.name)}', reflect: true })`,
      );
      lines.push(`  override ${p.name}: string | null = null;`);
      declared.add(p.name);
      continue;
    }
    if (LIT_ELEMENT_METHOD_NAMES.has(p.name)) {
      // Rename the public field to `_<name>` and bind the kebab attribute
      // to it so it doesn't shadow the inherited Element method (animate,
      // scrollTo, etc.). Preserve the contract's type and default — the
      // field still drives BEM class output, and consumers set the attribute
      // by its kebab name, not via the JS field directly.
      const t = applyLitTypeRename(lowerLitPropType(p.propType), rename);
      const defaultPart =
        p.defaultExpr !== undefined ? ` = ${p.defaultExpr}` : "";
      lines.push(`  @property({ attribute: '${toKebab(p.name)}' })`);
      lines.push(`  _${p.name}?: ${t}${defaultPart};`);
      declared.add(p.name);
      continue;
    }
    const litPropType = litPropertyTypeFromPropType(p.propType, ir.definedTypes);
    const t = applyLitTypeRename(lowerLitPropType(p.propType), rename);
    const propName = p.name.includes("-") ? `"${p.name}"` : p.name;
    const defaultPart =
      p.defaultExpr !== undefined ? ` = ${p.defaultExpr}` : "";
    // litPropertyType returns null for function-typed and other non-
    // attribute-reflectable props. Emit them with `attribute: false`
    // rather than dropping them entirely — callbacks like onDismiss must
    // exist on the element class so consumers can set them via JS and so
    // event bindings in render (`@click=${this.onDismiss}`) typecheck.
    // Pre-IR-DOM-BINDING-CAPABILITY-01 these were silently dropped.
    const decoratorOptions =
      litPropType === null
        ? "{ attribute: false }"
        : litPropertyDecoratorOptions(litPropType);
    lines.push(`  @property(${decoratorOptions})`);
    lines.push(`  ${propName}?: ${t}${defaultPart};`);
    declared.add(p.name);
  }

  // Variant dimensions referenced in classMap but not in styledProps need
  // their own @property declarations so `this.<dim>` resolves on the element.
  for (const dim of Object.keys(ir.variants)) {
    if (declared.has(dim) || LIT_SKIP_PROPS.has(dim)) continue;
    lines.push(`  @property({ type: String })`);
    lines.push(`  ${dim}?: string;`);
    declared.add(dim);
  }

  return lines;
}

function generateClassMapObject(ir: ComponentIR): string {
  const { classRecipe } = ir;
  const entries: string[] = [];
  // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: class modifiers read the
  // raw @property field, so they need the same default-aware accessor as
  // `litPropAccessor` — see that function's doc comment.
  const styledByName = new Map(ir.styledProps.map((p) => [p.name, p]));

  entries.push(`      '${classRecipe.base}': true,`);

  for (const mod of classRecipe.valueModifiers) {
    const acc = defaultAwareLitPropAccessor(mod.propName, styledByName);
    entries.push(`      [\`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${acc}}\`]: !!${acc},`);
  }

  for (const mod of classRecipe.booleanModifiers) {
    const acc = defaultAwareLitPropAccessor(mod.propName, styledByName);
    entries.push(`      '${classRecipe.base}--${mod.safeName}': !!${acc},`);
  }

  return entries.join("\n");
}

/**
 * Emit an additional LitElement class for a compound part (e.g. ModalHeader,
 * ModalBody). Stateless wrapper: one BEM block class plus an optional
 * `as` / `variant` forwarded to <fsds-stack>.
 */
function generateCompoundPartClass(
  ir: ComponentIR,
  part: {
    name: string;
    semanticElement?: string;
    isExplicitSubcomponent?: true;
    layoutVariant?: string;
    nativeTag?: string;
  },
): string {
  const subName = `${ir.name}${part.name[0].toUpperCase()}${part.name.slice(1)}`;
  const className = `${subName}Element`;
  const elementName = `fsds-${toKebabCase(subName)}`;
  const cssClass = `${ir.cssPrefix}__${part.name}`;
  const renderedTag = part.isExplicitSubcomponent
    ? part.nativeTag ?? part.semanticElement
    : part.semanticElement;
  const asAttr =
    renderedTag && renderedTag !== "div"
      ? ` as="${renderedTag}"`
      : "";
  const variantAttr =
    part.layoutVariant === "horizontal" ? ` variant="horizontal"` : "";
  // LIT-HOST-LISTITEM-ROLE (see generateDomTreeClassBody): a compound part
  // whose semantic element is `li` has its host standing in for the list
  // item inside the consumer's list — same host-role compensation. Stamped
  // in connectedCallback, not the constructor (custom-elements spec).
  const hostRoleLines =
    renderedTag === "li"
      ? [
          `  override connectedCallback(): void {`,
          `    super.connectedCallback();`,
          `    this.setAttribute("role", "listitem");`,
          `  }`,
          ``,
        ]
      : [];

  return [
    `export class ${className} extends LitElement {`,
    ...litStaticStylesLine(ir),
    ``,
    ...hostRoleLines,
    `  override render() {`,
    `    return html\`<fsds-stack${asAttr}${variantAttr} class="${cssClass}"><slot></slot></fsds-stack>\`;`,
    `  }`,
    `}`,
    ``,
    `customElements.define('${elementName}', ${className});`,
  ].join("\n");
}

function generateClassBody(ir: ComponentIR): string {
  const lines: string[] = [];
  const elementName = `fsds-${toKebabCase(ir.name)}`;
  const className = `${ir.name}Element`;
  const asAttr = ir.root.element !== "div" ? ` as="${ir.root.element}"` : "";
  const hasClassMap =
    ir.classRecipe.valueModifiers.length > 0 ||
    ir.classRecipe.booleanModifiers.length > 0;

  lines.push(`export class ${className} extends LitElement {`);
  lines.push(...litStaticStylesLine(ir));
  lines.push(``);
  // Host attribute for audit/devtools (ICONOGRAPHY-TOKEN-DISCIPLINE-02 Phase 5).
  // Set in connectedCallback (NOT the constructor — the custom-elements spec
  // forbids attribute writes in the constructor) so it's on the host element,
  // visible from the light DOM outside the shadow root.
  lines.push(`  override connectedCallback(): void {`);
  lines.push(`    super.connectedCallback();`);
  lines.push(`    this.setAttribute("data-fsds-component", "${ir.cssPrefix}");`);
  if (ir.root.effectiveRole) {
    // The custom-element host is the public accessibility surface. Keeping
    // the role on an inner shadow node makes consumer aria-* attributes land
    // on a role-less host, where axe correctly reports aria-prohibited-attr.
    lines.push(`    if (!this.hasAttribute("role")) this.setAttribute("role", "${ir.root.effectiveRole}");`);
  }
  lines.push(`  }`);
  lines.push(``);

  const propLines = generatePropertyDeclarations(ir);
  if (propLines.length > 0) {
    lines.push(...propLines);
    lines.push(``);
  }

  lines.push(`  override render() {`);
  if (hasClassMap) {
    lines.push(`    const classes = {`);
    lines.push(generateClassMapObject(ir));
    lines.push(`    };`);
    lines.push(
      `    return html\`<fsds-stack${asAttr} data-fsds-box="" class=\${classMap(classes)}><slot></slot></fsds-stack>\`;`,
    );
  } else {
    lines.push(
      `    return html\`<fsds-stack${asAttr} data-fsds-box="" class="${ir.classRecipe.base}"><slot></slot></fsds-stack>\`;`,
    );
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`customElements.define('${elementName}', ${className});`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Compound-state-container component emitter (Tabs-shaped)
// ---------------------------------------------------------------------------

/**
 * Generate the Lit component source for a compound-state-container (Tabs).
 *
 * This emits four LitElement classes:
 *   - `<Name>Element` — root provider: holds the behavior, calls provideContext
 *   - `<Name>ListElement` — tablist host + keyboard handler
 *   - `<Name>TabElement` — single tab button, reads context, registers/unregisters
 *   - `<Name>PanelElement` — content panel, gated by activeTab
 */
function generateCompoundStateImports(ir: ComponentIR): string {
  const hasClassMap =
    ir.classRecipe.valueModifiers.length > 0 ||
    ir.classRecipe.booleanModifiers.length > 0;
  const lines: string[] = [
    `import { LitElement, html, css } from 'lit';`,
    `import { property } from 'lit/decorators.js';`,
  ];
  if (hasClassMap) {
    lines.push(`import { classMap } from 'lit/directives/class-map.js';`);
  }
  lines.push(
    `import { ${ir.name}Behavior } from './${ir.name}Behavior.js';`,
    `import {`,
    `  createCompoundContext,`,
    `  provideContext,`,
    `  ContextConsumerController,`,
    `} from '../../primitives/index.js';`,
  );
  return lines.join("\n");
}

function generateCompoundStateTypes(ir: ComponentIR): string {
  const lines: string[] = [];
  // Re-emit the orientation + activationMode type aliases.
  const aliases = emitNonReactTypeAliases(ir);
  if (aliases.length > 0) lines.push(aliases.join("\n"));

  // Context value interface.
  lines.push(``);
  lines.push(`export interface ${ir.name}ContextValue {`);
  lines.push(`  activeTab: string;`);
  lines.push(`  setActiveTab: (value: string) => void;`);
  lines.push(`  registerTab: (value: string) => void;`);
  lines.push(`  unregisterTab: (value: string) => void;`);
  lines.push(`  registeredTabs: string[];`);
  lines.push(`  idBase: string;`);
  lines.push(`  orientation: "horizontal" | "vertical";`);
  lines.push(`  activationMode: "automatic" | "manual";`);
  lines.push(`  loop: boolean;`);
  lines.push(`  unmountInactive: boolean;`);
  lines.push(`}`);

  // Context token (exported so sub-elements can import it).
  lines.push(``);
  lines.push(`const TABS_CTX = createCompoundContext<${ir.name}ContextValue>("${ir.name}");`);
  lines.push(`export { TABS_CTX };`);

  return lines.join("\n");
}

function generateCompoundStateRootClass(ir: ComponentIR): string {
  const className = `${ir.name}Element`;
  const elementName = `fsds-${toKebabCase(ir.name)}`;
  const cssBase = ir.classRecipe.base;

  const lines: string[] = [];
  lines.push(`export class ${className} extends LitElement {`);
  lines.push(...litStaticStylesLine(ir));
  lines.push(``);
  // Property declarations come from the IR so any variant added to the
  // contract (e.g. appearance) emits a real @property and lands in the
  // BEM class composition below. Hardcoding the prop list here would
  // silently drop new variants — see #20.
  const propLines = generatePropertyDeclarations(ir);
  // generatePropertyDeclarations skips function-typed props (channel
  // callbacks like onValueChange). For the compound-state-container
  // path, emit them explicitly so consumers can listen.
  const rename = litAliasRename(ir);
  const declaredNames = new Set(
    propLines
      .filter((line) => line.includes(":") && !line.startsWith("  @"))
      .map((line) => line.trim().match(/^([_a-zA-Z][\w]*)\??:/)?.[1] ?? "")
      .filter(Boolean),
  );
  const channelLines: string[] = [];
  for (const ch of ir.behavior.normalizedChannels) {
    if (declaredNames.has(ch.changeHandlerProp)) continue;
    const t = applyLitTypeRename(ch.valueType ?? "unknown", rename);
    channelLines.push(
      `  @property({ attribute: false }) ${ch.changeHandlerProp}?: (value: ${t}) => void;`,
    );
  }
  if (propLines.length > 0 || channelLines.length > 0) {
    lines.push(...propLines);
    lines.push(...channelLines);
    lines.push(``);
  }
  lines.push(`  private initializedBehavior?: ${ir.name}Behavior;`);
  lines.push(`  private get behavior(): ${ir.name}Behavior {`);
  if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir)) lines.push(`    const host = this;`);
  lines.push(`    return this.initializedBehavior ??= new ${ir.name}Behavior(this, {`);
  if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir)) lines.push(`    get containerEl() { return host.interactionPanel; },`);
    if (domHasKeyboardPanel(ir)) lines.push(`    get anchorEl() { return host.interactionAnchor; },`);
  lines.push(`    value: () => this.value,`);
  lines.push(`    defaultValue: this.defaultValue,`);
  lines.push(`    onValueChange: (v) => this.onValueChange?.(v),`);
  lines.push(`  });`);
  lines.push(`  }`);
  lines.push(``);
  // idBase: use attribute if supplied, otherwise use a stable element id (set lazily).
  lines.push(`  private _generatedIdBase: string | null = null;`);
  lines.push(``);
  lines.push(`  private get resolvedIdBase(): string {`);
  lines.push(`    if (this.idBase) return this.idBase;`);
  lines.push(`    if (!this._generatedIdBase) {`);
  lines.push(`      this._generatedIdBase = "fsds-tabs-" + Math.random().toString(36).slice(2, 8);`);
  lines.push(`    }`);
  lines.push(`    return this._generatedIdBase;`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override connectedCallback(): void {`);
  lines.push(`    super.connectedCallback();`);
  lines.push(`    this.setAttribute("data-fsds-component", "${ir.cssPrefix}");`);
  lines.push(`    // Sync the behavior's internal state from defaultValue if no controlled`);
  lines.push(`    // value was set. This handles the case where defaultValue is set after`);
  lines.push(`    // element construction (property set order issue with class fields).`);
  lines.push(`    if (this.value === undefined && this.defaultValue !== undefined) {`);
  lines.push(`      this.behavior.activeTabState["_internal"] = this.defaultValue;`);
  lines.push(`    }`);
  lines.push(`    this._provideCtx();`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override updated(): void {`);
  lines.push(`    this._provideCtx();`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  private _provideCtx(): void {`);
  lines.push(`    if (!this.isConnected) return;`);
  lines.push(`    provideContext(this, TABS_CTX.key, {`);
  lines.push(`      activeTab: this.behavior.activeTab,`);
  lines.push(`      setActiveTab: (v: string) => { this.behavior.setActiveTab(v); this._provideCtx(); },`);
  lines.push(`      registerTab: (v: string) => { this.behavior.registerTab(v); this._provideCtx(); },`);
  lines.push(`      unregisterTab: (v: string) => { this.behavior.unregisterTab(v); this._provideCtx(); },`);
  lines.push(`      registeredTabs: this.behavior.registeredTabs,`);
  lines.push(`      idBase: this.resolvedIdBase,`);
  lines.push(`      orientation: this.orientation ?? "horizontal",`);
  lines.push(`      activationMode: this.activationMode ?? "automatic",`);
  lines.push(`      loop: this.loop ?? true,`);
  lines.push(`      unmountInactive: this.unmountInactive ?? true,`);
  lines.push(`    });`);
  lines.push(`  }`);
  lines.push(``);
  // Class composition is derived from the IR's classRecipe so that any
  // variant declared in the contract (orientation, activationMode,
  // appearance, …) automatically appears in the rendered class list.
  const hasClassMap =
    ir.classRecipe.valueModifiers.length > 0 ||
    ir.classRecipe.booleanModifiers.length > 0;

  lines.push(`  override render() {`);
  if (hasClassMap) {
    lines.push(`    const classes = {`);
    lines.push(generateClassMapObject(ir));
    lines.push(`    };`);
    lines.push(
      `    return html\`<div data-fsds-box="" class=\${classMap(classes)}><slot></slot></div>\`;`,
    );
  } else {
    lines.push(
      `    return html\`<div data-fsds-box="" class="${cssBase}"><slot></slot></div>\`;`,
    );
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`customElements.define('${elementName}', ${className});`);

  return lines.join("\n");
}

function generateTabsListClass(ir: ComponentIR): string {
  const subName = `${ir.name}List`;
  const className = `${subName}Element`;
  const elementName = `fsds-${toKebabCase(subName)}`;
  const cssClass = `${ir.classRecipe.base}__list`;

  const lines: string[] = [];
  lines.push(`export class ${className} extends LitElement {`);
  lines.push(...litStaticStylesLine(ir));
  lines.push(``);
  lines.push(`  private _ctx = new ContextConsumerController(this, TABS_CTX);`);
  lines.push(``);
  lines.push(`  private _handleKeyDown = (e: KeyboardEvent): void => {`);
  lines.push(`    let ctx: ${ir.name}ContextValue;`);
  lines.push(`    try { ctx = this._ctx.value; } catch { return; }`);
  lines.push(`    const tabs = ctx.registeredTabs;`);
  lines.push(`    if (tabs.length === 0) return;`);
  lines.push(`    const currentIndex = tabs.indexOf(ctx.activeTab);`);
  lines.push(`    const isHorizontal = ctx.orientation !== "vertical";`);
  lines.push(`    let nextIndex = currentIndex;`);
  lines.push(`    if ((isHorizontal && e.key === "ArrowRight") || (!isHorizontal && e.key === "ArrowDown")) {`);
  lines.push(`      e.preventDefault();`);
  lines.push(`      nextIndex = ctx.loop ? (currentIndex + 1) % tabs.length : Math.min(currentIndex + 1, tabs.length - 1);`);
  lines.push(`    } else if ((isHorizontal && e.key === "ArrowLeft") || (!isHorizontal && e.key === "ArrowUp")) {`);
  lines.push(`      e.preventDefault();`);
  lines.push(`      nextIndex = ctx.loop ? (currentIndex - 1 + tabs.length) % tabs.length : Math.max(currentIndex - 1, 0);`);
  lines.push(`    } else if (e.key === "Home") {`);
  lines.push(`      e.preventDefault();`);
  lines.push(`      nextIndex = 0;`);
  lines.push(`    } else if (e.key === "End") {`);
  lines.push(`      e.preventDefault();`);
  lines.push(`      nextIndex = tabs.length - 1;`);
  lines.push(`    } else if (e.key === "Enter" || e.key === " ") {`);
  lines.push(`      if (ctx.activationMode === "manual") {`);
  lines.push(`        e.preventDefault();`);
  lines.push(`        // Find the currently focused tab host (it has data-value and role="tab").`);
  lines.push(`        const focusedTab = this.querySelector("[role=\\"tab\\"]:focus") as HTMLElement | null;`);
  lines.push(`        const val = focusedTab?.getAttribute("data-value");`);
  lines.push(`        if (val) ctx.setActiveTab(val);`);
  lines.push(`      }`);
  lines.push(`      return;`);
  lines.push(`    } else {`);
  lines.push(`      return;`);
  lines.push(`    }`);
  lines.push(`    const targetValue = tabs[nextIndex];`);
  lines.push(`    if (ctx.activationMode === "automatic") {`);
  lines.push(`      ctx.setActiveTab(targetValue);`);
  lines.push(`    }`);
  lines.push(`    // Focus the target tab host element (which now has role="tab" on the host).`);
  lines.push(`    const targetTabHost = this.querySelector(\`[data-value="\${targetValue}"]\`) as HTMLElement | null;`);
  lines.push(`    targetTabHost?.focus();`);
  lines.push(`  };`);
  lines.push(``);
  lines.push(`  override connectedCallback(): void {`);
  lines.push(`    super.connectedCallback();`);
  lines.push(`    this.setAttribute("data-fsds-component", "${ir.cssPrefix}");`);
  lines.push(`    this.addEventListener("keydown", this._handleKeyDown);`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override disconnectedCallback(): void {`);
  lines.push(`    this.removeEventListener("keydown", this._handleKeyDown);`);
  lines.push(`    super.disconnectedCallback();`);
  lines.push(`  }`);
  lines.push(``);
  // TABS-INDICATOR-REALIZATION-01: declared DOM realization of the
  // group-host ornament (e.g. Tabs's `indicator`) as a sibling of the
  // default slot. Visual treatment and motion live in the contract's
  // styles.json / Tabs.css. aria-hidden because it's a non-interactive
  // decoration that's announced via the active tab's aria-selected.
  const ornamentPart = getGroupHostOrnamentPart(ir);
  const ornamentMarkup = ornamentPart
    ? `<span class="${ir.classRecipe.base}__${ornamentPart.name}" aria-hidden="true"></span>`
    : "";

  lines.push(`  override render() {`);
  lines.push(`    let orientation = "horizontal";`);
  lines.push(`    try { orientation = this._ctx.value.orientation; } catch { /* no context yet */ }`);
  // The tablist is an interactive role hosting the delegated roving keydown
  // (connectedCallback addEventListener); it must be programmatically
  // focusable (APG) but stays out of tab order.
  lines.push(`    return html\`<div class="${cssClass}" role="tablist" tabindex="-1" aria-orientation="\${orientation}"><slot></slot>${ornamentMarkup}</div>\`;`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`customElements.define('${elementName}', ${className});`);

  return lines.join("\n");
}

function generateTabsTabClass(ir: ComponentIR): string {
  const subName = `${ir.name}Tab`;
  const className = `${subName}Element`;
  const elementName = `fsds-${toKebabCase(subName)}`;
  const cssClass = `${ir.classRecipe.base}__tab`;

  const lines: string[] = [];
  // The host element itself acts as the interactive tab: role, id, aria-* and
  // tabindex are set on the host so that aria-controls can reference the panel
  // id across the light DOM. Shadow DOM IDs are not visible to aria-controls.
  // The host renders only a <slot> — no nested interactive element.
  lines.push(`export class ${className} extends LitElement {`);
  lines.push(`  // Host element IS the tab — ARIA attrs on the host, slot-only shadow.`);
  lines.push(
    ...litStaticStylesLine(
      ir,
      ":host { display: inline-flex; cursor: pointer; }",
      ':host([disabled]), :host([aria-disabled="true"]) { cursor: not-allowed; pointer-events: none; }',
    ),
  );
  lines.push(``);
  lines.push(`  @property() value = "";`);
  lines.push(`  @property({ type: Boolean }) disabled?: boolean;`);
  lines.push(``);
  lines.push(`  private _ctx = new ContextConsumerController(this, TABS_CTX);`);
  lines.push(``);
  lines.push(`  private _onClick = (): void => { if (!this.disabled) { try { this._ctx.value.setActiveTab(this.value); } catch { /* no context */ } } };`);
  lines.push(``);
  lines.push(`  override connectedCallback(): void {`);
  lines.push(`    super.connectedCallback();`);
  lines.push(`    this.addEventListener("click", this._onClick);`);
  lines.push(`    // Register after the context is available (provider fires provideContext in connectedCallback).`);
  lines.push(`    // Use a microtask so the provider has connected first.`);
  lines.push(`    Promise.resolve().then(() => {`);
  lines.push(`      if (!this.isConnected) return;`);
  lines.push(`      try { this._ctx.value.registerTab(this.value); } catch { /* no context */ }`);
  lines.push(`    });`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override disconnectedCallback(): void {`);
  lines.push(`    this.removeEventListener("click", this._onClick);`);
  lines.push(`    try { this._ctx.value.unregisterTab(this.value); } catch { /* no context */ }`);
  lines.push(`    super.disconnectedCallback();`);
  lines.push(`  }`);
  lines.push(``);
  // Reflect ARIA and identity attrs onto the host element so aria-controls
  // can resolve the panel id across the light DOM boundary.
  // The HOST is the tab interactive element; shadow DOM renders only the slot.
  lines.push(`  private _updateHostAttrs(isActive: boolean, idBase: string): void {`);
  lines.push(`    this.setAttribute("role", "tab");`);
  lines.push(`    this.setAttribute("id", \`\${idBase}-tab-\${this.value}\`);`);
  lines.push(`    this.setAttribute("aria-controls", \`\${idBase}-panel-\${this.value}\`);`);
  lines.push(`    this.setAttribute("aria-selected", isActive ? "true" : "false");`);
  lines.push(`    this.setAttribute("tabindex", isActive ? "0" : "-1");`);
  lines.push(`    this.setAttribute("data-value", this.value);`);
  lines.push(`    if (this.disabled) this.setAttribute("aria-disabled", "true");`);
  lines.push(`    else this.removeAttribute("aria-disabled");`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override render() {`);
  lines.push(`    let isActive = false;`);
  lines.push(`    let idBase = "";`);
  lines.push(`    try {`);
  lines.push(`      const ctx = this._ctx.value;`);
  lines.push(`      isActive = ctx.activeTab === this.value;`);
  lines.push(`      idBase = ctx.idBase;`);
  lines.push(`    } catch { /* no context yet */ }`);
  lines.push(`    this._updateHostAttrs(isActive, idBase);`);
  lines.push(`    // Render slot only — host IS the interactive element, no nested button needed.`);
  lines.push(`    const cssClasses = [\`${cssClass}\`, isActive ? \`${cssClass}--active\` : ""].filter(Boolean).join(" ");`);
  lines.push(`    this.className = cssClasses;`);
  lines.push(`    return html\`<slot></slot>\`;`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`customElements.define('${elementName}', ${className});`);

  return lines.join("\n");
}

function generateTabsPanelClass(ir: ComponentIR): string {
  const subName = `${ir.name}Panel`;
  const className = `${subName}Element`;
  const elementName = `fsds-${toKebabCase(subName)}`;
  const cssClass = `${ir.classRecipe.base}__panel`;

  const lines: string[] = [];
  // Like TabsTab, put role/id/aria-labelledby/tabindex on the HOST element so
  // aria-labelledby can resolve the tab id across the light DOM boundary.
  lines.push(`export class ${className} extends LitElement {`);
  lines.push(
    ...litStaticStylesLine(
      ir,
      ":host { display: block; }",
      ":host([hidden]) { display: none !important; }",
    ),
  );
  lines.push(``);
  lines.push(`  @property() value = "";`);
  lines.push(``);
  lines.push(`  private _ctx = new ContextConsumerController(this, TABS_CTX);`);
  lines.push(``);
  lines.push(`  private _updateHostAttrs(isActive: boolean, unmountInactive: boolean, idBase: string): void {`);
  lines.push(`    this.setAttribute("role", "tabpanel");`);
  lines.push(`    this.setAttribute("id", \`\${idBase}-panel-\${this.value}\`);`);
  lines.push(`    this.setAttribute("aria-labelledby", \`\${idBase}-tab-\${this.value}\`);`);
  lines.push(`    this.setAttribute("tabindex", "0");`);
  lines.push(`    if (!unmountInactive) {`);
  lines.push(`      // Keep all panels in the DOM; toggle hidden attribute.`);
  lines.push(`      if (isActive) this.removeAttribute("hidden");`);
  lines.push(`      else this.setAttribute("hidden", "");`);
  lines.push(`    } else {`);
  lines.push(`      this.removeAttribute("hidden");`);
  lines.push(`    }`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override render() {`);
  lines.push(`    let isActive = false;`);
  lines.push(`    let unmountInactive = true;`);
  lines.push(`    let idBase = "";`);
  lines.push(`    try {`);
  lines.push(`      const ctx = this._ctx.value;`);
  lines.push(`      isActive = ctx.activeTab === this.value;`);
  lines.push(`      unmountInactive = ctx.unmountInactive;`);
  lines.push(`      idBase = ctx.idBase;`);
  lines.push(`    } catch { /* no context yet */ }`);
  lines.push(`    this._updateHostAttrs(isActive, unmountInactive, idBase);`);
  lines.push(`    if (unmountInactive && !isActive) return html\`\`;`);
  lines.push(`    return html\`<div class="${cssClass}"><slot></slot></div>\`;`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`customElements.define('${elementName}', ${className});`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Repeated-disclosure lowering (Accordion-shaped)
// ---------------------------------------------------------------------------

/** DFS for the DOM node whose part matches `partName`. */
function litFindDomNode(
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

function generateDisclosureContextTypesLit(ir: ComponentIR): string {
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "openness";
  const lines: string[] = [];
  const aliases = emitNonReactTypeAliases(ir);
  if (aliases.length > 0) lines.push(aliases.join("\n"));
  lines.push(``);
  lines.push(`export interface ${ir.name}ContextValue {`);
  lines.push(`  ${channelName}: string | string[];`);
  lines.push(`  toggleItem: (value: string) => void;`);
  lines.push(`  isItemOpen: (value: string) => boolean;`);
  lines.push(`  type: "single" | "multiple";`);
  lines.push(`  collapsible: boolean;`);
  lines.push(`  disabled: boolean;`);
  lines.push(`  idBase: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`const DISCLOSURE_CTX = createCompoundContext<${ir.name}ContextValue>("${ir.name}");`);
  lines.push(`export { DISCLOSURE_CTX };`);
  return lines.join("\n");
}

function generateDisclosureRootClass(ir: ComponentIR): string {
  const className = `${ir.name}Element`;
  const elementName = `fsds-${toKebabCase(ir.name)}`;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "openness";
  const setterName = `set${channelName[0].toUpperCase()}${channelName.slice(1)}`;
  const hasCollapsible = ir.styledProps.some((p) => p.name === "collapsible");
  const hasDisabled = ir.styledProps.some((p) => p.name === "disabled");
  const cssBase = ir.classRecipe.base;
  const hasClassMap =
    ir.classRecipe.valueModifiers.length > 0 ||
    ir.classRecipe.booleanModifiers.length > 0;

  const lines: string[] = [];
  lines.push(`export class ${className} extends LitElement {`);
  lines.push(...litStaticStylesLine(ir));
  lines.push(``);
  const propLines = generatePropertyDeclarations(ir);
  const rename = litAliasRename(ir);
  const declaredNames = new Set(
    propLines
      .filter((line) => line.includes(":") && !line.startsWith("  @"))
      .map((line) => line.trim().match(/^([_a-zA-Z][\w]*)\??:/)?.[1] ?? "")
      .filter(Boolean),
  );
  const channelLines: string[] = [];
  for (const ch of ir.behavior.normalizedChannels) {
    if (declaredNames.has(ch.changeHandlerProp)) continue;
    const t = applyLitTypeRename(ch.valueType ?? "unknown", rename);
    channelLines.push(
      `  @property({ attribute: false }) ${ch.changeHandlerProp}?: (value: ${t}) => void;`,
    );
  }
  if (propLines.length > 0 || channelLines.length > 0) {
    lines.push(...propLines);
    lines.push(...channelLines);
    lines.push(``);
  }
  lines.push(`  private initializedBehavior?: ${ir.name}Behavior;`);
  lines.push(`  private get behavior(): ${ir.name}Behavior {`);
  if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir)) lines.push(`    const host = this;`);
  lines.push(`    return this.initializedBehavior ??= new ${ir.name}Behavior(this, {`);
  if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir)) lines.push(`    get containerEl() { return host.interactionPanel; },`);
    if (domHasKeyboardPanel(ir)) lines.push(`    get anchorEl() { return host.interactionAnchor; },`);
  lines.push(`    value: () => this.value,`);
  lines.push(`    defaultValue: this.defaultValue,`);
  lines.push(`    onValueChange: (v) => this.onValueChange?.(v),`);
  lines.push(`  });`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  private _generatedIdBase: string | null = null;`);
  lines.push(`  private get resolvedIdBase(): string {`);
  lines.push(`    if (!this._generatedIdBase) {`);
  lines.push(`      this._generatedIdBase = "fsds-${toKebabCase(ir.name)}-" + Math.random().toString(36).slice(2, 8);`);
  lines.push(`    }`);
  lines.push(`    return this._generatedIdBase;`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  isItemOpen(itemValue: string): boolean {`);
  lines.push(`    const v = this.behavior.${channelName};`);
  lines.push(`    return Array.isArray(v) ? v.includes(itemValue) : v === itemValue;`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  toggleItem(itemValue: string): void {`);
  lines.push(`    const v = this.behavior.${channelName};`);
  lines.push(`    this.behavior.${setterName}(toggleInteractionItem(v, itemValue, (this.type ?? "single") === "multiple", ${hasCollapsible ? "Boolean(this.collapsible)" : "false"}));`);
  lines.push(`    this._provideCtx();`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  private _handleKeyDown = (e: KeyboardEvent): void => {`);
  lines.push(`    const key = e.key;`);
  lines.push(`    if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") return;`);
  lines.push(`    const triggers = Array.from(`);
  lines.push(`      this.querySelectorAll<HTMLElement>("[data-disclosure-trigger]"),`);
  lines.push(`    ).filter((el) => el.getAttribute("aria-disabled") !== "true");`);
  lines.push(`    if (triggers.length === 0) return;`);
  lines.push(`    const currentIndex = triggers.indexOf(document.activeElement as HTMLElement);`);
  lines.push(`    let nextIndex = currentIndex;`);
  lines.push(`    if (key === "ArrowDown") nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % triggers.length;`);
  lines.push(`    else if (key === "ArrowUp") nextIndex = currentIndex < 0 ? triggers.length - 1 : (currentIndex - 1 + triggers.length) % triggers.length;`);
  lines.push(`    else if (key === "Home") nextIndex = 0;`);
  lines.push(`    else nextIndex = triggers.length - 1;`);
  lines.push(`    e.preventDefault();`);
  lines.push(`    triggers[nextIndex]?.focus();`);
  lines.push(`  };`);
  lines.push(``);
  lines.push(`  override connectedCallback(): void {`);
  lines.push(`    super.connectedCallback();`);
  lines.push(`    this.setAttribute("data-fsds-component", "${ir.cssPrefix}");`);
  lines.push(`    this.addEventListener("keydown", this._handleKeyDown);`);
  lines.push(`    this._provideCtx();`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override disconnectedCallback(): void {`);
  lines.push(`    this.removeEventListener("keydown", this._handleKeyDown);`);
  lines.push(`    super.disconnectedCallback();`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override updated(): void {`);
  lines.push(`    this._provideCtx();`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  private _provideCtx(): void {`);
  lines.push(`    if (!this.isConnected) return;`);
  lines.push(`    provideContext(this, DISCLOSURE_CTX.key, {`);
  lines.push(`      ${channelName}: this.behavior.${channelName},`);
  lines.push(`      toggleItem: (v: string) => this.toggleItem(v),`);
  lines.push(`      isItemOpen: (v: string) => this.isItemOpen(v),`);
  lines.push(`      type: this.type ?? "single",`);
  lines.push(`      collapsible: ${hasCollapsible ? "this.collapsible ?? false" : "false"},`);
  lines.push(`      disabled: ${hasDisabled ? "this.disabled ?? false" : "false"},`);
  lines.push(`      idBase: this.resolvedIdBase,`);
  lines.push(`    });`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override render() {`);
  if (hasClassMap) {
    lines.push(`    const classes = {`);
    lines.push(generateClassMapObject(ir));
    lines.push(`    };`);
    lines.push(`    return html\`<div data-fsds-box="" class=\${classMap(classes)}><slot></slot></div>\`;`);
  } else {
    lines.push(`    return html\`<div data-fsds-box="" class="${cssBase}"><slot></slot></div>\`;`);
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`customElements.define('${elementName}', ${className});`);
  return lines.join("\n");
}

function generateDisclosureItemClass(ir: ComponentIR, multipleName: string): string {
  const subName = `${ir.name}${multipleName[0].toUpperCase()}${multipleName.slice(1)}`;
  const className = `${subName}Element`;
  const elementName = `fsds-${toKebabCase(subName)}`;
  const cssClass = `${ir.classRecipe.base}__${multipleName}`;
  return [
    `export class ${className} extends LitElement {`,
    ...litStaticStylesLine(ir, ":host { display: block; }"),
    ``,
    `  override render() {`,
    `    this.className = "${cssClass}";`,
    `    return html\`<slot></slot>\`;`,
    `  }`,
    `}`,
    ``,
    `customElements.define('${elementName}', ${className});`,
  ].join("\n");
}

function generateDisclosureTriggerClass(ir: ComponentIR, itemName: string, chevronNode: DomNodeIR | undefined): string {
  const subName = `${ir.name}${itemName[0].toUpperCase()}${itemName.slice(1)}`;
  const className = `${subName}Element`;
  const elementName = `fsds-${toKebabCase(subName)}`;
  const cssClass = `${ir.classRecipe.base}__${itemName}`;
  const chevronMarkup = chevronNode
    ? renderLitDomNode(
        chevronNode,
        {
          classRecipe: ir.classRecipe.base,
          channelByName: new Map(),
          styledByName: new Map(),
          isRoot: false,
        },
        0,
      )
    : "";
  const lines: string[] = [];
  // Host IS the interactive control (role=button on host, ARIA in light DOM so
  // aria-controls can reference the content id). Shadow renders slot + chevron.
  lines.push(`export class ${className} extends LitElement {`);
  lines.push(
    ...litStaticStylesLine(
      ir,
      ":host { display: block; cursor: pointer; }",
      ':host([aria-disabled="true"]) { cursor: not-allowed; pointer-events: none; }',
    ),
  );
  lines.push(``);
  lines.push(`  @property() value = "";`);
  lines.push(``);
  lines.push(`  private _ctx = new ContextConsumerController(this, DISCLOSURE_CTX);`);
  lines.push(``);
  lines.push(`  private _onActivate = (): void => {`);
  lines.push(`    try { this._ctx.value.toggleItem(this.value); } catch { /* no context */ }`);
  lines.push(`  };`);
  lines.push(``);
  lines.push(`  private _onKeyDown = (e: KeyboardEvent): void => {`);
  lines.push(`    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._onActivate(); }`);
  lines.push(`  };`);
  lines.push(``);
  lines.push(`  override connectedCallback(): void {`);
  lines.push(`    super.connectedCallback();`);
  lines.push(`    this.addEventListener("click", this._onActivate);`);
  lines.push(`    this.addEventListener("keydown", this._onKeyDown);`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override disconnectedCallback(): void {`);
  lines.push(`    this.removeEventListener("click", this._onActivate);`);
  lines.push(`    this.removeEventListener("keydown", this._onKeyDown);`);
  lines.push(`    super.disconnectedCallback();`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  private _updateHostAttrs(isOpen: boolean, idBase: string, disabled: boolean): void {`);
  lines.push(`    this.setAttribute("role", "button");`);
  lines.push(`    this.setAttribute("data-disclosure-trigger", "");`);
  lines.push(`    this.setAttribute("data-value", this.value);`);
  lines.push(`    this.setAttribute("id", \`\${idBase}-trigger-\${this.value}\`);`);
  lines.push(`    this.setAttribute("aria-controls", \`\${idBase}-content-\${this.value}\`);`);
  lines.push(`    this.setAttribute("aria-expanded", isOpen ? "true" : "false");`);
  lines.push(`    if (disabled) { this.setAttribute("aria-disabled", "true"); this.removeAttribute("tabindex"); }`);
  lines.push(`    else { this.removeAttribute("aria-disabled"); this.setAttribute("tabindex", "0"); }`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override render() {`);
  lines.push(`    let isOpen = false;`);
  lines.push(`    let idBase = "";`);
  lines.push(`    let disabled = false;`);
  lines.push(`    try {`);
  lines.push(`      const ctx = this._ctx.value;`);
  lines.push(`      isOpen = ctx.isItemOpen(this.value);`);
  lines.push(`      idBase = ctx.idBase;`);
  lines.push(`      disabled = ctx.disabled;`);
  lines.push(`    } catch { /* no context yet */ }`);
  lines.push(`    this._updateHostAttrs(isOpen, idBase, disabled);`);
  lines.push(`    this.className = ["${cssClass}", isOpen ? "${cssClass}--open" : ""].filter(Boolean).join(" ");`);
  lines.push(`    return html\`<slot></slot>${chevronMarkup}\`;`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`customElements.define('${elementName}', ${className});`);
  return lines.join("\n");
}

function generateDisclosureContentClass(ir: ComponentIR, regionName: string, innerPartName: string | undefined): string {
  const subName = `${ir.name}${regionName[0].toUpperCase()}${regionName.slice(1)}`;
  const className = `${subName}Element`;
  const elementName = `fsds-${toKebabCase(subName)}`;
  const cssClass = `${ir.classRecipe.base}__${regionName}`;
  const innerOpen = innerPartName ? `<div class="${ir.classRecipe.base}__${innerPartName}">` : "";
  const innerClose = innerPartName ? `</div>` : "";
  const lines: string[] = [];
  lines.push(`export class ${className} extends LitElement {`);
  lines.push(
    ...litStaticStylesLine(
      ir,
      ":host { display: block; }",
      ":host([hidden]) { display: none !important; }",
    ),
  );
  lines.push(``);
  lines.push(`  @property() value = "";`);
  lines.push(``);
  lines.push(`  private _ctx = new ContextConsumerController(this, DISCLOSURE_CTX);`);
  lines.push(``);
  lines.push(`  private _updateHostAttrs(isOpen: boolean, idBase: string): void {`);
  lines.push(`    this.setAttribute("role", "region");`);
  lines.push(`    this.setAttribute("id", \`\${idBase}-content-\${this.value}\`);`);
  lines.push(`    this.setAttribute("aria-labelledby", \`\${idBase}-trigger-\${this.value}\`);`);
  lines.push(`    if (isOpen) this.removeAttribute("hidden");`);
  lines.push(`    else this.setAttribute("hidden", "");`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  override render() {`);
  lines.push(`    let isOpen = false;`);
  lines.push(`    let idBase = "";`);
  lines.push(`    try {`);
  lines.push(`      const ctx = this._ctx.value;`);
  lines.push(`      isOpen = ctx.isItemOpen(this.value);`);
  lines.push(`      idBase = ctx.idBase;`);
  lines.push(`    } catch { /* no context yet */ }`);
  lines.push(`    this._updateHostAttrs(isOpen, idBase);`);
  lines.push(`    this.className = "${cssClass}";`);
  lines.push(`    return html\`${innerOpen}<slot></slot>${innerClose}\`;`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`customElements.define('${elementName}', ${className});`);
  return lines.join("\n");
}

function generateDisclosureStateSource(ir: ComponentIR): string {
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  const multiplePart = getMultipleItemPart(ir);
  let importsBody = generateCompoundStateImports(ir);
  importsBody += `\nimport { toggleInteractionItem } from "../../primitives/interaction.js";`;
  const typesBody = generateDisclosureContextTypesLit(ir);

  const itemNode = ir.dom && itemPart ? litFindDomNode(ir.dom, itemPart.name) : undefined;
  const chevronNode = itemNode?.children?.find(
    (c) => c.part !== undefined && c.tag !== "slot" && c.tag !== "children",
  );
  if (chevronNode?.componentRef) {
    importsBody += `\nimport '../${chevronNode.componentRef}/${chevronNode.componentRef}.js';`;
  }
  const innerNode = ir.dom && regionPart ? litFindDomNode(ir.dom, regionPart.name) : undefined;
  const innerPartName = innerNode?.children?.find(
    (c) => c.part !== undefined && c.tag !== "slot" && c.tag !== "children",
  )?.part;

  const componentBody = [
    generateDisclosureRootClass(ir),
    "",
    generateDisclosureItemClass(ir, multiplePart!.name),
    "",
    generateDisclosureTriggerClass(ir, itemPart!.name, chevronNode),
    "",
    generateDisclosureContentClass(ir, regionPart!.name, innerPartName),
  ].join("\n");

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
    { kind: "generated", id: "component", body: componentBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
  ];

  return renderSections(sections, "line");
}

function generateCompoundStateSource(ir: ComponentIR): string {
  const importsBody = generateCompoundStateImports(ir);
  const typesBody = generateCompoundStateTypes(ir);
  const componentBody = [
    generateCompoundStateRootClass(ir),
    "",
    generateTabsListClass(ir),
    "",
    generateTabsTabClass(ir),
    "",
    generateTabsPanelClass(ir),
  ].join("\n");

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
    { kind: "generated", id: "component", body: componentBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
  ];

  return renderSections(sections, "line");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Emit a Lit `LitElement` class source for a `ComponentIR`. The file is
 * partitioned with section markers so hand-authored additions survive
 * regeneration.
 */
export function generateLitComponentSource(ir: ComponentIR): string {
  // Compound-state-container components (Tabs-shaped) get a bespoke emitter
  // that produces four LitElement classes instead of the generic wrapper.
  if (isDisclosureContainer(ir)) {
    return generateDisclosureStateSource(ir);
  }
  if (isCompoundStateContainer(ir)) {
    return generateCompoundStateSource(ir);
  }

  const typesBody = generateTypes(ir);
  // Lit framework boundary: parts whose native realization is in the
  // HTML table content model set (TABLE_COMPOSITION_TAGS) CANNOT be
  // exported as autonomous custom elements. Autonomous custom elements
  // host themselves as their custom tag (`<fsds-table-row>`), and the
  // browser's table content parser hoists or discards foreign elements
  // inside <table>/<thead>/<tbody>/<tfoot>. Shipping
  // `customElements.define('fsds-table-row', ...)` would encode an
  // invalid table semantic. Instead, the root <fsds-table> shadow
  // template owns the full native table structure via anatomy.dom +
  // slots; consumers compose by placing native <tr>/<td>/<th>
  // elements into named slots.
  //
  // Doctrine: this filter is intentionally Lit-only. React/Vue/Svelte
  // emit native subcomponents (no custom-element constraint); Angular
  // uses attribute selectors that attach to native hosts. Lit alone
  // is forced to suppress subcomponent emission for these parts.
  const compoundClasses = ir.compoundParts
    .filter(
      (part) =>
        !(part.nativeTag && TABLE_COMPOSITION_TAGS.has(part.nativeTag)),
    )
    .map((part) => generateCompoundPartClass(ir, part))
    .join("\n\n");
  const highlightCandidate = ir.dom ? collectContentTransforms(ir.dom).find(isHighlightTransform) : undefined;
  const highlight = highlightCandidate?.linePart && highlightCandidate.gutterPart ? highlightCandidate : undefined;
  const componentBody =
    (highlight ? litHighlightParts(ir, highlight) + "\n\n" : "") +
    (ir.dom ? generateDomTreeClassBody(ir) : generateClassBody(ir)) +
    (compoundClasses ? "\n\n" + compoundClasses : "");

  // Imports depend on what the rendered class body actually references.
  // We conditionally emit directive imports only when at least one
  // rendered binding uses the directive. Mirrors the same pattern used
  // by `treeUsesNgIf` in the Angular emitter — only declare imports the
  // template actually consumes. IR-DOM-CSS-VAR-BINDING-01 adds the
  // `styleMap` directive for `cssVariableBindings` lowering.
  const usesIfDefined = componentBody.includes("ifDefined(");
  const usesStyleMap = componentBody.includes("styleMap(");
  const baseImports = ir.dom ? generateDomTreeImports(ir) : generateImports(ir);
  const directiveImports: string[] = [];
  if (usesIfDefined) {
    directiveImports.push(`import { ifDefined } from 'lit/directives/if-defined.js';`);
  }
  if (usesStyleMap) {
    directiveImports.push(`import { styleMap } from 'lit/directives/style-map.js';`);
  }
  const importsBody = directiveImports.length > 0
    ? `${baseImports}\n${directiveImports.join("\n")}`
    : baseImports;

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
    { kind: "generated", id: "component", body: componentBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
  ];

  return renderSections(sections, "line");
}

// ---------------------------------------------------------------------------
// DOM-tree-driven component (B.2c)
// ---------------------------------------------------------------------------

function generateDomTreeImports(ir: ComponentIR): string {
  const litImports = ["LitElement", "html", "css", "nothing"];
  // iconGlyph: a glyph node's <path> children render via the `svg` tagged
  // template, not `html` — an html-tagged SVG fragment does not render
  // inside an <svg> element in Lit's template model (ICON-CATALOG-RUNTIME-
  // DELIVERY-01). Structural — driven by IR `iconGlyph` facts.
  const hasIconGlyph = collectIconGlyphNodes(ir.dom).length > 0;
  if (hasIconGlyph) litImports.push("svg");
  // Selector-anchored root portal: `updated(changedProperties)` re-queries
  // the anchor whenever the step index or the steps array changes, so the
  // override needs the `PropertyValues` type.
  if (selectorAnchoredRootPortal(ir) !== null) {
    litImports.push("type PropertyValues");
  }
  const lines: string[] = [`import { ${litImports.join(", ")} } from 'lit';`];
  if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir)) lines.push(`import { ref } from 'lit/directives/ref.js';`);
  if (ir.interaction && ir.dom && ir.interaction.triggers.some(t => t.operation !== "select" && t.operation !== "toggle-item")) lines.push(`import { canActivateInteraction } from "../../primitives/interaction.js";`);
  // Always include `property`; add `state` when the dom tree has a children
  // guard so the private _hasChildren reactive field can be declared.
  const decorators = ["property"];
  if (ir.dom && treeHasChildrenGuard(ir.dom)) {
    decorators.push("state");
  }
  lines.push(`import { ${decorators.join(", ")} } from 'lit/decorators.js';`);
  // componentRef: side-effect import each referenced custom element so it
  // self-registers via customElements.define at module load (CODEGEN-
  // RECURSIVE-COMPOSITION-01). The template addresses it by its fsds-<kebab>
  // custom element name.
  for (const refImport of resolveComponentRefImports(ir.name, ir.dom, "lit")) {
    lines.push(`import '${refImport.specifier}';`);
  }
  if (ir.behavior.normalizedChannels.length > 0) {
    lines.push(`import { ${ir.name}Behavior } from './${ir.name}Behavior.js';`);
  }
  if (
    resolveSurfaceAutoDismiss(ir) &&
    ir.behavior.normalizedChannels.some((c) => c.valueType === "boolean")
  ) {
    lines.push(`import { AutoDismissController } from '../../primitives/index.js';`);
  }
  if (ir.dom && treeHasSlotGuard(ir.dom)) {
    lines.push(`import { SlotPresenceController } from '../../primitives/index.js';`);
  }
  // iconGlyph: import the catalog resolver from the committed package-root
  // module of @full-stack-ds/iconography (ICON-CATALOG-RUNTIME-DELIVERY-01).
  if (hasIconGlyph) {
    lines.push(`import { resolveIcon } from "${ICONOGRAPHY_MODULE}";`);
  }
  // content-transform: import the shared highlight tokenizer when the tree
  // carries a highlight fact (FEAT-CODEBLOCK-HIGHLIGHT-01). Structural —
  // driven by IR content-transform facts, never per-component name lore.
  if (ir.dom && collectContentTransforms(ir.dom).some((t) => t.transform === "highlight")) {
    lines.push(
      `import { prepareHighlightSource } from '../../primitives/highlight/tokenize.js';`,
    );
  }
  if (ir.dom && collectContentTransforms(ir.dom).some(isMarkdownTransform)) {
    lines.push(
      `import { parseMarkdown, type MarkdownBlock, type MarkdownMark } from '../../primitives/markdown/markdown.js';`,
    );
    lines.push(`import { type TemplateResult } from 'lit';`);
  }
  // Selector-anchored root portal (coachmark tour): the whole panel is
  // positioned against a page element resolved from the active step's
  // selector. Same primitive the anchored-presence content class uses
  // (surface-emit.ts), applied to the root host instead of a content part.
  if (selectorAnchoredRootPortal(ir) !== null) {
    lines.push(
      `import { AnchoredPositionController } from '../../primitives/surfaces/AnchoredPositionController.js';`,
    );
  }
  return lines.join("\n");
}

/** Walk a DomNodeIR tree and return true if any node has an `if: "slot:<name>"` guard. */
function treeHasSlotGuard(node: DomNodeIR): boolean {
  if (node.ifSlot !== undefined) return true;
  return node.children.some(treeHasSlotGuard);
}

/** Walk a DomNodeIR tree and return true if any node has ifProp === "children". */
function treeHasChildrenGuard(node: DomNodeIR): boolean {
  if (node.ifProp === "children") return true;
  return node.children.some(treeHasChildrenGuard);
}

function generateDomTreeClassBody(ir: ComponentIR): string {
  if (!ir.dom) throw new Error("generateDomTreeClassBody requires ir.dom");

  const className = `${ir.name}Element`;
  const elementName = `fsds-${toKebabCase(ir.name)}`;
  const channels = ir.behavior.normalizedChannels;
  const channelByName = new Map(channels.map((c) => [c.name, c]));
  const styledByName = new Map(ir.styledProps.map((p) => [p.name, p]));
  const hasBehavior = channels.length > 0;

  const overlayClickTrigger = ir.behavior.normalizedDismissalTriggers.find(
    (t) => t.event === "overlayClick",
  );
  const booleanChannel = channels.find((c) => c.valueType === "boolean");
  const hasOverlayClick = !!(
    overlayClickTrigger &&
    booleanChannel &&
    hasBehavior
  );
  // ICON-CATALOG-RUNTIME-DELIVERY-01: glyph nodes get a module-scope
  // size-hint const (when the glyph declares sizeHints) plus render()-local
  // consts resolving the catalog lookup, keyed by node identity so
  // `renderLitDomNode` can look them up when it reaches the glyph's `svg`
  // node. Collected before the class opens so the hints const can live at
  // module scope, mirroring the React emitter's placement.
  const iconGlyphNodes = collectIconGlyphNodes(ir.dom);
  const iconGlyphIdents = new Map<
    DomNodeIR,
    { glyphIdent: string; pxIdent: string | undefined }
  >();
  const iconGlyphRenderLocals = new Map<
    DomNodeIR,
    { pxExpr: string | undefined; nameAcc: string }
  >();
  const iconGlyphHintsLines: string[] = [];
  for (const { node, glyph, suffix } of iconGlyphNodes) {
    if (glyph.sizeHints) {
      iconGlyphHintsLines.push(
        `const ICON_GLYPH_SIZE_HINTS${suffix}: Record<string, number> = ` +
          `${iconGlyphSizeHintsLiteral(glyph.sizeHints)};`,
      );
      iconGlyphHintsLines.push(``);
    }
    const glyphIdent = `iconGlyph${suffix}`;
    const hintsIdent = glyph.sizeHints
      ? `ICON_GLYPH_SIZE_HINTS${suffix}`
      : undefined;
    // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: the Lit property is
    // optional-typed even when the contract declares a default (class-field
    // initializers only apply once, at construction — see
    // `litPropAccessor`), so a bare `this.size` index into
    // Record<string, number> both fails TS2538 AND, if defaulted with the
    // empty string instead of the contract default, silently misses the
    // hints map and falls through to the natural SVG size. Fall back to the
    // resolved prop's contract default (e.g. Icon's `size` default "md")
    // so undefined resolves to the same hint react's parameter default
    // resolves to; `""` only when the prop declares no contract default.
    const sizeDefaultExpr = styledByName.get(glyph.sizePropName ?? "")?.defaultExpr;
    const sizeAcc = glyph.sizePropName
      ? `(${propAccessor(glyph.sizePropName)} ?? ${sizeDefaultExpr ?? '""'})`
      : undefined;
    const pxExpr = iconGlyphPxExpr(glyph, sizeAcc, hintsIdent);
    const pxIdent = pxExpr === undefined ? undefined : `iconGlyphPx${suffix}`;
    iconGlyphIdents.set(node, { glyphIdent, pxIdent });
    iconGlyphRenderLocals.set(node, {
      pxExpr,
      nameAcc: propAccessor(glyph.namePropName),
    });
  }

  const ctx: LitRenderContext = {
    classRecipe: ir.classRecipe.base,
    channelByName,
    styledByName,
    isRoot: true,
    fieldAssociationControlSlug: ir.fieldAssociation?.provides?.controlSlug,
    idRefGatedSlots: collectLitIdRefGatedSlots(ir),
    autoDismissPause: Boolean(
      resolveSurfaceAutoDismiss(ir) &&
        channels.some((c) => c.valueType === "boolean"),
    ),
    hasOverlayClick,
    rootPolymorphicTag: ir.root.polymorphicTagProp,
    iconGlyphIdents: iconGlyphIdents.size > 0 ? iconGlyphIdents : undefined,
    // FEAT-A11Y-COMPOSITE-KEYBOARD-01: keyboard-action facts for the walker's
    // `@keydown` lowering and roving-item tabindex rules.
    keyboardActionsByPart: groupKeyboardActionsByPart(ir.keyboardActions),
    compositeItemPart: ir.behavior.focus?.strategy === "roving" ? ir.compositeControl?.part.name : undefined,
    compositeMemberExpr: compositeActivationMember(ir.compositeControl),
  };
  // Inject the contract's effective ARIA role onto the root node if the
  // contract didn't already pin one in `attrs.role`. Without this, components
  // that declare `a11y.role: "switch"` (ToggleSwitch) keep the implicit
  // `<button>` role, which makes `aria-checked` an axe-illegal attribute.
  // Mirrors how React's emitter spreads `role="switch"` onto the element.
  const rootForRender: DomNodeIR =
    ir.root.rootRole && !ir.dom.attrs["role"] && !ir.dom.bindings["role"]
      ? {
          ...ir.dom,
          attrs: { ...ir.dom.attrs, role: ir.root.rootRole },
        }
      : ir.dom;
  const template = renderLitDomNode(rootForRender, ctx, 0);
  const hasChildrenGuard = treeHasChildrenGuard(ir.dom);

  const lines: string[] = [];
  lines.push(...iconGlyphHintsLines);
  lines.push(`export class ${className} extends LitElement {`);
  lines.push(...litStaticStylesLine(ir));
  lines.push(``);

  // Property declarations for every styled prop
  const declared = new Set<string>();
  const rename = litAliasRename(ir);
  for (const p of ir.styledProps) {
    if (LIT_DOM_SKIP_PROPS.has(p.name)) continue;
    const decl = generateLitDomTreePropertyDecl(p, rename, ir.definedTypes);
    if (decl) {
      lines.push(decl);
      declared.add(p.name);
    }
  }
  for (const ch of channels) {
    if (declared.has(ch.changeHandlerProp)) continue;
    const t = applyLitTypeRename(ch.valueType ?? "unknown", rename);
    lines.push(
      `  @property({ attribute: false }) ${ch.changeHandlerProp}?: (value: ${t}) => void;`,
    );
    declared.add(ch.changeHandlerProp);
  }
  for (const dim of Object.keys(ir.variants)) {
    if (declared.has(dim) || LIT_DOM_SKIP_PROPS.has(dim)) continue;
    lines.push(`  @property() ${dim}?: string;`);
    declared.add(dim);
  }

  // `if: "slot:<name>"` guards read named-slot presence from a controller that
  // observes the host's light DOM (the guarded slot is absent while hidden, so
  // no slotchange can fire).
  if (treeHasSlotGuard(ir.dom)) {
    lines.push(``);
    lines.push(`  private readonly slotPresence = new SlotPresenceController(this);`);
  }

  // If any dom node uses `if: "children"`, emit a reactive boolean that tracks
  // slot content presence — mirrors Vue's $slots.default / Svelte's {#if children}.
  if (hasChildrenGuard) {
    lines.push(``);
    lines.push(
      `  // Tracks whether any content has been slotted in — used by the`,
    );
    lines.push(
      `  // conditional label wrapper (if: "children" in the contract dom tree).`,
    );
    lines.push(`  @state() private _hasChildren = false;`);
    lines.push(``);
    lines.push(`  override firstUpdated(): void {`);
    lines.push(
      `    const slot = this.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement | null;`,
    );
    lines.push(`    if (slot) {`);
    lines.push(
      `      const update = () => { this._hasChildren = slot.assignedNodes({ flatten: true }).some(node => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent !== "")); };`,
    );
    lines.push(`      slot.addEventListener('slotchange', update);`);
    lines.push(`      update();`);
    lines.push(`    }`);
    lines.push(`  }`);
  }

  if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir)) lines.push(`  private interactionPanel?: HTMLElement;`);
  if (domHasKeyboardPanel(ir)) lines.push(`  private interactionAnchor?: HTMLElement;`);
  if (hasBehavior) {
    lines.push(``);
    lines.push(`  private initializedBehavior?: ${ir.name}Behavior;`);
    lines.push(`  private get behavior(): ${ir.name}Behavior {`);
    if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir)) lines.push(`    const host = this;`);
    lines.push(`    return this.initializedBehavior ??= new ${ir.name}Behavior(this, {`);
    if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir)) lines.push(`    get containerEl() { return host.interactionPanel; },`);
    if (domHasKeyboardPanel(ir)) lines.push(`    get anchorEl() { return host.interactionAnchor; },`);
    for (const ch of channels) {
      lines.push(`    ${ch.valueProp}: () => this.${ch.valueProp},`);
      if (ch.defaultValueProp) {
        lines.push(`    ${ch.defaultValueProp}: this.${ch.defaultValueProp},`);
      }
      lines.push(
        `    ${ch.changeHandlerProp}: (v) => this.${ch.changeHandlerProp}?.(v),`,
      );
    }
    // Forward dismissal-trigger enabledBy props.
    for (const trigger of ir.behavior.normalizedDismissalTriggers) {
      if (!trigger.enabledByProp) continue;
      lines.push(
        `    ${trigger.enabledByProp}: this.${trigger.enabledByProp},`,
      );
    }
    // FEAT-A11Y-COMPOSITE-KEYBOARD-01: getter-shaped mode gates so the
    // keyboard select handler reads the live gate on every keydown.
    for (const gate of keyboardModeGateProps(ir)) {
      lines.push(`    ${gate}: () => this.${gate},`);
    }
    const modalityGate = ir.surface?.modalityGate;
    if (modalityGate) {
      lines.push(`    ${modalityGate.prop}: () => this.${modalityGate.prop},`);
    }
    lines.push(`  });`);
    lines.push(`  }`);
    // Ephemeral-surface auto-dismiss (WCAG 2.2.1). The controller re-syncs
    // on host updates; pause listeners land on the template root.
    const autoDismissPolicy = resolveSurfaceAutoDismiss(ir);
    const autoDismissChannel = autoDismissPolicy
      ? channels.find((c) => c.valueType === "boolean")
      : undefined;
    if (autoDismissPolicy && autoDismissChannel) {
      lines.push(
        ``,
        `  private autoDismiss = new AutoDismissController(this, {`,
        `    open: () => Boolean(this.behavior.${autoDismissChannel.name}),`,
        `    durationMs: () => this.${autoDismissPolicy.durationProp} === undefined ? ${autoDismissPolicy.defaultMs ?? "undefined"} : this.${autoDismissPolicy.durationProp},`,
        `    onDismiss: () => this.behavior.set${capitalizeLit(autoDismissChannel.name)}(false),`,
        `  });`,
      );
    }
  }

  // Event handler methods (Lit templates can host arrow fns inline, but
  // splitting them out makes the html template cleaner and easier to test).
  //
  // The handler reads the new value off the native DOM event. Type extraction:
  //   boolean → input.checked
  //   number  → Number(input.value)
  //   string  → input.value
  //   Date    → input.valueAsDate  (input[type=date|datetime-local|month|week])
  //
  // For value types that can't be read from a DOM input (Date[], custom shapes,
  // event-shaped channels), skip the handler emission entirely. The template
  // won't reference the handler, and consumers wire the state via
  // `el.behavior.set<Name>(...)` directly.
  for (const ch of channels) {
    const handlerName = `handle${capitalizeLit(ch.name)}Change`;
    const setter = `set${capitalizeLit(ch.name)}`;
    const handlerRef = `this.${handlerName}(e)`;
    if (!template.includes(handlerRef)) {
      // Handler is unreachable — skip to avoid emitting code that mistypes
      // the channel value (e.g. reading a string into a Date setter).
      continue;
    }
    const valueExpr = litChannelValueExtraction(ch.valueType ?? "unknown");
    if (valueExpr === null) {
      // Type isn't DOM-extractable; the template shouldn't have referenced
      // the handler in the first place. Surface the contradiction instead
      // of silently generating broken code.
      throw new Error(
        `Lit codegen: ${ir.name}.${ch.name} channel has valueType "${ch.valueType}" which can't be read from a DOM input, but the rendered template references handle${capitalizeLit(ch.name)}Change. Either change the contract's valueType to a DOM-extractable scalar (boolean/number/string/Date), or remove the @change binding from the contract.`,
      );
    }
    lines.push(``);
    lines.push(`  private ${handlerName}(event: Event): void {`);
    lines.push(`    this.behavior.${setter}(${valueExpr});`);
    lines.push(`  }`);
  }

  // FEAT-PORTAL-MECHANISM-CROSS-FRAMEWORK-01: full-overlay surfaces relocate
  // the HOST element itself into document.body. Moving the host (not its
  // light-DOM content) is the shadow-scope-preserving choice: the shadow root
  // and its constructable `static styles` travel with the element, so the
  // fixed overlay keeps every style while escaping any transform/overflow/
  // filter ancestor's containing block. IR-driven via `portalsRootToBody`.
  //
  // Selector-anchored root portal (coachmark / guided tour): the whole
  // panel also relocates to body via the exact same host-move machinery,
  // but is additionally positioned against a page element resolved from
  // the active step's CSS selector — see `selectorAnchor` wiring below.
  const selectorAnchor = selectorAnchoredRootPortal(ir);
  const rootPortal = portalsRootToBody(ir) || selectorAnchor !== null;
  const needsLifecycle = (hasOverlayClick && booleanChannel) || rootPortal;
  // LIT-HOST-LISTITEM-ROLE: an `li`-rooted component renders its list item
  // inside the shadow root, so the HOST element is what sits inside the
  // consumer's <ul> — and a custom element is not a valid list child. Stamp
  // role="listitem" on the host so the flattened tree reads ul > listitem
  // for assistive tech and axe's `list` rule. This is the structural fix the
  // scaffold-violation policy demands instead of suppressing the rule.
  // Light-DOM emitters render the native <li> directly and need no host
  // compensation.
  const needsHostListItemRole = ir.dom.tag === "li";

  if (hasOverlayClick && booleanChannel) {
    const setter = `set${capitalizeLit(booleanChannel.name)}`;
    const enabledProp = overlayClickTrigger?.enabledByProp;
    lines.push(``);
    lines.push(`  private _handleOverlayClick = (): void => {`);
    if (enabledProp) {
      lines.push(`    if (this.${enabledProp} !== false) {`);
      lines.push(`      this.behavior.${setter}(false);`);
      lines.push(`    }`);
    } else {
      lines.push(`    this.behavior.${setter}(false);`);
    }
    lines.push(`  };`);
  }

  if (rootPortal) {
    // Reentrancy state. `_moving` is true only during the synchronous
    // appendChild that relocates the host; it lets the transient
    // disconnectedCallback that appendChild fires distinguish itself from a
    // genuine teardown. `_portaled` records that the host now lives in body,
    // so the re-fired connectedCallback does not move it a second time.
    lines.push(``);
    lines.push(`  private _moving = false;`);
    lines.push(`  private _portaled = false;`);
    lines.push(`  private _portalOriginParent: Node | null = null;`);
    lines.push(`  private _portalOriginNext: Node | null = null;`);
  }

  // Selector-anchored root panel: the anchor is an arbitrary page element
  // resolved at runtime via `document.querySelector`, re-resolved whenever
  // the index channel or the selector-bearing array prop changes. The
  // AnchoredPositionController positions the HOST itself (content: () =>
  // this) — no separate content part, mirroring the compound anchored-
  // presence content class in surface-emit.ts but applied to the root.
  let selectorIdxChannel: NormalizedChannelIR | undefined;
  let selectorPropAcc: string | undefined;
  if (selectorAnchor) {
    selectorIdxChannel = channels.find(
      (c) => c.name === selectorAnchor.indexChannel,
    );
    if (!selectorIdxChannel) {
      throw new Error(
        `${ir.name}: surface.anchor.selector.indexChannel "${selectorAnchor.indexChannel}" has no matching channel in the IR.`,
      );
    }
    selectorPropAcc = defaultAwareLitPropAccessor(selectorAnchor.prop, styledByName);
    const placementProp = ir.surface?.positioning?.placementProp;
    const placementAcc = placementProp
      ? defaultAwareLitPropAccessor(placementProp, styledByName)
      : `"auto"`;
    const collision = ir.surface?.positioning?.collision ?? "flip-shift";
    lines.push(``);
    lines.push(`  private _anchorTargetEl: HTMLElement | null = null;`);
    lines.push(
      `  private _position = new AnchoredPositionController(this, {`,
    );
    lines.push(`    anchor: () => this._anchorTargetEl,`);
    lines.push(`    content: () => this,`);
    lines.push(`    open: () => true,`);
    lines.push(
      `    placement: () => (${placementAcc} as "top" | "bottom" | "left" | "right" | "auto"),`,
    );
    lines.push(`    collision: () => "${collision}",`);
    lines.push(`    onChange: () => this.requestUpdate(),`);
    lines.push(`  });`);
  }

  if (needsLifecycle) {
    lines.push(``);
    lines.push(`  override connectedCallback(): void {`);
    lines.push(`    super.connectedCallback();`);
    // Host attribute for audit/devtools (ICONOGRAPHY-TOKEN-DISCIPLINE-02 Phase 5).
    lines.push(`    this.setAttribute("data-fsds-component", "${ir.cssPrefix}");`);
    if (needsHostListItemRole) {
      lines.push(`    this.setAttribute("role", "listitem");`);
    }
    if (hasOverlayClick && booleanChannel) {
      lines.push(`    this.addEventListener('click', this._handleOverlayClick);`);
    }
    if (rootPortal) {
      lines.push(`    if (!this._portaled && typeof document !== "undefined" && this.parentNode && this.parentNode !== document.body) {`);
      lines.push(`      this._portalOriginParent = this.parentNode;`);
      lines.push(`      this._portalOriginNext = this.nextSibling;`);
      lines.push(`      this._portaled = true;`);
      lines.push(`      this._moving = true;`);
      lines.push(`      document.body.appendChild(this);`);
      lines.push(`      this._moving = false;`);
      lines.push(`    }`);
    }
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  override disconnectedCallback(): void {`);
    if (hasOverlayClick && booleanChannel) {
      lines.push(
        `    this.removeEventListener('click', this._handleOverlayClick);`,
      );
    }
    if (rootPortal) {
      // Skip the transient disconnect the relocation move triggers. On a real
      // teardown, restore the host to its recorded origin (when that origin is
      // still connected) so Lit's own removal targets the right place, then
      // clear the portaled flag.
      lines.push(`    if (!this._moving) {`);
      lines.push(`      if (this._portalOriginParent && this._portalOriginParent.isConnected) {`);
      lines.push(`        this._portalOriginParent.insertBefore(this, this._portalOriginNext);`);
      lines.push(`      }`);
      lines.push(`      this._portaled = false;`);
      lines.push(`      this._portalOriginParent = null;`);
      lines.push(`      this._portalOriginNext = null;`);
      lines.push(`    }`);
    }
    lines.push(`    super.disconnectedCallback();`);
    lines.push(`  }`);
  } else {
    // No portal/surface lifecycle — emit a minimal connectedCallback solely
    // for the host identification attribute (ICONOGRAPHY-TOKEN-DISCIPLINE-02
    // Phase 5). connectedCallback, not the constructor (the custom-elements
    // spec forbids attribute writes in the constructor).
    lines.push(``);
    lines.push(`  override connectedCallback(): void {`);
    lines.push(`    super.connectedCallback();`);
    lines.push(`    this.setAttribute("data-fsds-component", "${ir.cssPrefix}");`);
    if (needsHostListItemRole) {
      lines.push(`    this.setAttribute("role", "listitem");`);
    }
    lines.push(`  }`);
  }

  if (selectorAnchor && selectorIdxChannel && selectorPropAcc) {
    lines.push(``);
    lines.push(`  override willUpdate(_changedProperties: PropertyValues<this>): void {`);
    lines.push(
      `    // Re-query on every update pass — the anchor lives outside this`,
    );
    lines.push(
      `    // element's tree, so a per-property changed-set check can't see`,
    );
    lines.push(
      `    // mutations to the target page (only ${selectorIdxChannel.valueProp}/${selectorAnchor.prop} changes are`,
    );
    lines.push(
      `    // reactive triggers here, but re-resolving is cheap and idempotent).`,
    );
    lines.push(
      `    const selector = (${selectorPropAcc})[this.${selectorIdxChannel.valueProp} ?? 0]?.${selectorAnchor.path};`,
    );
    lines.push(
      `    this._anchorTargetEl = selector && typeof document !== "undefined" ? document.querySelector<HTMLElement>(selector) : null;`,
    );
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  override updated(changedProperties: PropertyValues<this>): void {`);
    lines.push(`    super.updated(changedProperties);`);
    lines.push(
      `    // A stale scheduled update landing after a genuine disconnect must`,
    );
    lines.push(
      `    // be a no-op — it must NOT resurrect inline positioning on an`,
    );
    lines.push(`    // element that has already torn down.`);
    lines.push(`    if (!this.isConnected) return;`);
    lines.push(`    const pos = this._position.state;`);
    lines.push(
      `    // The static :host rule is display: contents (no box), which would`,
    );
    lines.push(
      `    // make position: fixed a layout no-op. Give the host a real box`,
    );
    lines.push(`    // before applying fixed positioning.`);
    lines.push(`    this.style.display = "block";`);
    lines.push(`    this.style.position = "fixed";`);
    lines.push(`    this.style.top = \`\${pos.top}px\`;`);
    lines.push(`    this.style.left = \`\${pos.left}px\`;`);
    lines.push(`    this.style.visibility = pos.ready ? "visible" : "hidden";`);
    lines.push(`    this.setAttribute("data-placement", pos.placement);`);
    lines.push(`  }`);
  }

  // computeClasses() — analogous to React's classNames array / Vue's
  // computed `classNames` / Angular's classes() signal. Walks the BEM recipe
  // referencing instance state.
  const channelValueProps = new Set(channels.map((c) => c.valueProp));
  lines.push(``);
  lines.push(`  private computeClasses(): string {`);
  lines.push(`    return [`);
  lines.push(`      "${ir.classRecipe.base}",`);
  for (const mod of ir.classRecipe.valueModifiers) {
    // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: default-aware, see
    // `litPropAccessor`'s doc comment.
    const acc = defaultAwareLitPropAccessor(mod.propName, styledByName);
    lines.push(
      `      ${acc} ? \`${ir.classRecipe.base}--${mod.valuePrefix ?? ""}\${${acc}}\` : null,`,
    );
  }
  for (const mod of ir.classRecipe.booleanModifiers) {
    if (channelValueProps.has(mod.propName)) {
      // The behavior class exposes channel state via `get ${ch.name}()`,
      // not via valueProp — resolve channel by valueProp and use its name.
      const ch = channels.find((c) => c.valueProp === mod.propName)!;
      lines.push(
        `      this.behavior.${ch.name} ? "${ir.classRecipe.base}--${mod.safeName}" : null,`,
      );
    } else {
      lines.push(
        `      ${defaultAwareLitPropAccessor(mod.safeName, styledByName)} ? "${ir.classRecipe.base}--${mod.safeName}" : null,`,
      );
    }
  }
  lines.push(`    ].filter(Boolean).join(" ");`);
  lines.push(`  }`);

  lines.push(``);
  lines.push(`  override render() {`);
  // ICON-CATALOG-RUNTIME-DELIVERY-01: body consts for each glyph node —
  // the requested-pixel value (when the glyph has a size binding) and the
  // resolved catalog record. A miss (unknown icon name) leaves the glyph
  // const undefined and the render branch emits nothing. `Number.NaN`
  // deliberately matches no authored size, so resolveIcon falls back to
  // the smallest authored variant. Mirrors the React emitter's body consts.
  for (const { node, glyph } of iconGlyphNodes) {
    const entry = iconGlyphIdents.get(node);
    const locals = iconGlyphRenderLocals.get(node);
    if (!entry || !locals) continue;
    const { glyphIdent, pxIdent } = entry;
    if (pxIdent && locals.pxExpr !== undefined) {
      lines.push(`    const ${pxIdent} = ${locals.pxExpr};`);
    }
    const nameOptional =
      ir.styledProps.find((p) => p.name === glyph.namePropName)?.required ===
      false;
    lines.push(
      `    const ${glyphIdent} = resolveIcon(${iconGlyphNameArg(locals.nameAcc, nameOptional)}, ` +
        `${pxIdent ? `${pxIdent} ?? Number.NaN` : "Number.NaN"});`,
    );
  }
  lines.push(`    return html\`${template}\`;`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`customElements.define('${elementName}', ${className});`);
  lines.push(generateLitMarkdownHelpers(ir));
  return lines.join("\n");
}

/**
 * FEAT-MARKDOWN-CONTENT-TRANSFORM-01 — Lit lowering of the markdown
 * transform: module-scope recursive html`` render helpers. One transform
 * per tree (validated upstream); tags/classes/attrs come from the IR.
 */
function generateLitMarkdownHelpers(ir: ComponentIR): string {
  const transform = collectContentTransforms(ir.dom).find(isMarkdownTransform);
  if (!transform) return "";
  const prefix = ir.classRecipe.base;
  const b = transform.blockParts;
  const bt = transform.blockTags;
  const m = transform.markParts;
  const mt = transform.markTags;
  const blockClass = (part: string): string => `${prefix}__${part}`;
  return `
function renderMarkdownBlocks(source: string): TemplateResult[] {
  return parseMarkdown(source ?? "").map((block, blockIndex) =>
    renderMarkdownBlock(block, blockIndex),
  );
}

function renderMarkdownBlock(block: MarkdownBlock, key: number): TemplateResult {
  switch (block.kind) {
    case "heading":
      return html\`<${bt.heading} class="${blockClass(b.heading)}" data-block-kind="heading" data-block-kind-level=\${block.level}>\${block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}</${bt.heading}>\`;
    case "paragraph":
      return html\`<${bt.paragraph} class="${blockClass(b.paragraph)}" data-block-kind="paragraph">\${block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}</${bt.paragraph}>\`;
    case "list":
      return block.ordered
        ? html\`<${bt.orderedList} class="${blockClass(b.orderedList)}" data-block-kind="orderedList">\${block.items.map((item, itemIndex) => renderMarkdownBlock(item, itemIndex))}</${bt.orderedList}>\`
        : html\`<${bt.unorderedList} class="${blockClass(b.unorderedList)}" data-block-kind="unorderedList">\${block.items.map((item, itemIndex) => renderMarkdownBlock(item, itemIndex))}</${bt.unorderedList}>\`;
    case "listItem":
      return html\`<${bt.listItem} class="${blockClass(b.listItem)}" data-block-kind="listItem">\${block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}</${bt.listItem}>\`;
    case "codeBlock":
      return html\`<${bt.codeBlock} class="${blockClass(b.codeBlock)}" data-block-kind="codeBlock" data-language=\${block.language}>\${block.text}</${bt.codeBlock}>\`;
    case "blockquote":
      return html\`<${bt.blockquote} class="${blockClass(b.blockquote)}" data-block-kind="blockquote">\${block.children.map((mark, markIndex) => renderMarkdownMark(mark, markIndex))}</${bt.blockquote}>\`;
  }
}

function renderMarkdownMark(mark: MarkdownMark, key: number): TemplateResult {
  switch (mark.kind) {
    case "text":
      return html\`\${mark.text}\`;
    case "code":
      return html\`<${mt.code} class="${prefix}__${m.code}" data-mark-kind="code">\${mark.text}</${mt.code}>\`;
    case "emphasis":
      return html\`<${mt.emphasis} class="${prefix}__${m.emphasis}" data-mark-kind="emphasis">\${mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}</${mt.emphasis}>\`;
    case "strong":
      return html\`<${mt.strong} class="${prefix}__${m.strong}" data-mark-kind="strong">\${mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}</${mt.strong}>\`;
    case "link":
      return mark.href === null
        ? html\`\${mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}\`
        : html\`<${mt.link} class="${prefix}__${m.link}" data-mark-kind="link" href=\${mark.href}>\${mark.children.map((child, childIndex) => renderMarkdownMark(child, childIndex))}</${mt.link}>\`;
  }
}
`;
}

function generateLitDomTreePropertyDecl(
  p: {
    name: string;
    type: string;
    propType: PropTypeIR;
    defaultExpr?: string;
    required: boolean;
  },
  rename: { from: string; to: string } | null = null,
  definedTypes?: Record<string, ContractTypeDef>,
): string | null {
  // Function-typed props (callbacks like `onDismiss?: () => void`) need to
  // exist on the Lit element class so renderLitBinding can reference
  // `this.onDismiss` from `@click=${this.onDismiss}`. Without this they
  // were silently dropped — IR-DOM-BINDING-CAPABILITY-01 surfaced the gap
  // when Alert/AlertNotice tried to project a dismiss button.
  //
  // Always emit them as `@property({ attribute: false })`: function values
  // can never round-trip through HTML attributes, so attribute reflection
  // makes no sense, but the property still must be declared so consumer
  // code can set it via JS (`el.onDismiss = handler`) and so lit-analyzer
  // does not flag the render reference as an undeclared property access.
  // A function-typed prop arrives either as a structured `callback` (PropTypeIR
  // V2) or — for legacy/un-migrated members — as a `fallback` whose raw string
  // is a function type. Both must reflect `attribute: false`; a callback value
  // can never round-trip through an HTML attribute. (CODEGEN-PROP-TYPE-IR-
  // OBSERVED-TYPES-01: the V1-era assumption "functions only arrive as fallback"
  // no longer holds once callbacks are first-class.)
  const isFunctionType =
    p.propType.kind === "callback" ||
    (p.propType.kind === "fallback" &&
      (/=>\s*(void|never|[A-Za-z])/.test(p.propType.raw) ||
        /EventHandler/.test(p.propType.raw)));
  if (isFunctionType) {
    const propType = applyLitTypeRename(lowerLitPropType(p.propType), rename);
    const propName = p.name.includes("-") ? `"${p.name}"` : p.name;
    return `  @property({ attribute: false }) ${propName}?: ${propType};`;
  }
  if (ARIA_MIXIN_NAMES.has(p.name)) {
    return [
      `  @property({ attribute: '${ariaCamelToKebab(p.name)}', reflect: true })`,
      `  override ${p.name}: string | null = null;`,
    ].join("\n");
  }
  if (LIT_ELEMENT_METHOD_NAMES.has(p.name)) {
    const propType = applyLitTypeRename(lowerLitPropType(p.propType), rename);
    const defaultPart = p.defaultExpr !== undefined ? ` = ${p.defaultExpr}` : "";
    return [
      `  @property({ attribute: '${toKebab(p.name)}' })`,
      `  _${p.name}?: ${propType}${defaultPart};`,
    ].join("\n");
  }
  const propType = applyLitTypeRename(lowerLitPropType(p.propType), rename);
  const defaultPart = p.defaultExpr !== undefined ? ` = ${p.defaultExpr}` : "";
  // Use the same policy as the legacy emitter (litPropertyType +
  // litPropertyDecoratorOptions): primitives → `{ type: <T> }`,
  // anything else → `{ attribute: false }`. This is what lit-analyzer's
  // `no-incompatible-property-type` rule expects — Lit's built-in
  // attribute<->property converter handles only Boolean/Number/String.
  // When the prop name is kebab-case, the attribute name must be
  // explicit. `attribute: false` and `attribute: 'kebab-name'` are
  // mutually exclusive — when the type is non-primitive, prefer the
  // explicit kebab attribute mapping (consumer-set via setAttribute
  // is the consumer's intent for kebab-named props), but warn via
  // the type field that the converter isn't a fit. In practice
  // contracts don't combine kebab-case names with non-primitive
  // types today, so the conflict is theoretical.
  const spec = litPropertyTypeFromPropType(p.propType, definedTypes);
  const decoratorArgs: string[] = [];
  const hasKebabName = p.name.includes("-");
  if (spec !== null) {
    if (spec.kind === "primitive") {
      decoratorArgs.push(`type: ${spec.type}`);
    } else if (!hasKebabName) {
      decoratorArgs.push("attribute: false");
    }
  }
  if (hasKebabName) {
    decoratorArgs.push(`attribute: '${p.name}'`);
  }
  const decoratorBody =
    decoratorArgs.length > 0 ? `{ ${decoratorArgs.join(", ")} }` : "";
  const propName = p.name.includes("-") ? `"${p.name}"` : p.name;
  if (p.required && !p.defaultExpr) {
    return `  @property(${decoratorBody}) ${propName}!: ${propType};`;
  }
  return `  @property(${decoratorBody}) ${propName}?: ${propType}${defaultPart};`;
}

interface LitRenderContext {
  /** Ancestor pre elements preserve template formatting as literal text. */
  preformatted?: boolean;
  classRecipe: string;
  channelByName: Map<string, NormalizedChannelIR>;
  styledByName: Map<string, { type: string; defaultExpr?: string }>;
  isRoot: boolean;
  /**
   * Field-association control slug when this component PROVIDES field
   * association (FEAT-A11Y-LABEL-ID-ASSOCIATION-01). Lit cannot realize
   * the mechanism at all — its components render into shadow roots and
   * idrefs cannot cross the shadow boundary — so refs targeting this slug
   * (the label's `for`) are SKIPPED rather than emitted as dangling
   * references. Tracked as a platform limitation in the a11y rail ledger.
   */
  fieldAssociationControlSlug?: string;
  /**
   * Named slots whose presence gates a generated idref
   * (FEAT-A11Y-LABEL-ID-ASSOCIATION-01) — these emit @slotchange →
   * requestUpdate so the runtime querySelector guard stays current.
   */
  idRefGatedSlots?: Set<string>;
  /** When true, bind auto-dismiss pause listeners on the template root. */
  autoDismissPause?: boolean;
  hasOverlayClick?: boolean;
  rootPolymorphicTag?: {
    propName: string;
    defaultTag: string;
    allowedTags: string[];
  };
  /**
   * Identifier names introduced by enclosing iteration. After
   * BINDING-EXPRESSION-V2-01 the binding-side `prop:X` lowering no
   * longer consults this set — iteration locals reach the emitter as
   * `iterationLocal`-kind bindings and dispatch via
   * `ctx.enclosingIteration`. The set survives as the resolver for the
   * `if:` guard grammar (V2 did not migrate `if:`).
   */
  iterationScope?: Set<string>;
  /**
   * Nearest enclosing iteration directive. Resolution target for
   * `iterationLocal`-kind bindings.
   */
  enclosingIteration?: IterationIR;
  /**
   * Local identifiers for nodes carrying `iconGlyph`
   * (ICON-CATALOG-RUNTIME-DELIVERY-01), keyed by node identity. `glyphIdent`
   * names the `render()`-local const holding the `resolveIcon(...)` result;
   * `pxIdent` names the requested-pixel const (undefined when the glyph has
   * no size binding). Populated once at the root call from
   * `collectIconGlyphNodes`; empty when the tree has no glyph nodes.
   */
  iconGlyphIdents?: Map<DomNodeIR, { glyphIdent: string; pxIdent: string | undefined }>;
  /**
   * FEAT-A11Y-COMPOSITE-KEYBOARD-01: contract-declared keyboard actions,
   * grouped by hosting part. The walker emits one `@keydown` binding per
   * part onto the part's host node.
   */
  keyboardActionsByPart?: Map<string, KeyboardActionIR[]>;
  /** The part name owning the composite item set, when one exists. */
  compositeItemPart?: string;
  /** Activation member operand of the composite control (`item.value`). */
  compositeMemberExpr?: BindingExpression;
}

/**
 * FEAT-A11Y-LABEL-ID-ASSOCIATION-01 — Lit lowering of generated
 * relationship idref lists. Ids are shadow-root-scoped literals
 * (`<cssPrefix>-<slug>`); when clauses gate with `this.` accessors;
 * slotGate is not lowerable (see LitRenderContext.fieldAssociationControlSlug
 * doc for the shadow-boundary story).
 */
/** Slot names whose presence gates any idref (excluding provider-routed refs Lit skips). */
function collectLitIdRefGatedSlots(ir: ComponentIR): Set<string> {
  const gated = new Set<string>();
  const controlSlug = ir.fieldAssociation?.provides?.controlSlug;
  const walk = (node: DomNodeIR) => {
    for (const refAttr of node.idRefAttrs) {
      for (const ref of refAttr.refs) {
        if (ref.slug === controlSlug) continue;
        if (ref.slotGate) gated.add(ref.slotGate);
      }
    }
    node.children.forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  return gated;
}

function litIdRefGuardExpr(ref: IdRefIR): string | undefined {
  const conds: string[] = [];
  if (ref.slotGate) {
    // Slot presence is a RUNTIME light-DOM query in Lit (slotted children
    // are the host's own children). Gated slots emit @slotchange →
    // requestUpdate so the guard re-evaluates when content arrives late.
    conds.push(`this.querySelector('[slot="${ref.slotGate}"]') !== null`);
  }
  if (ref.when) {
    const accessor = propAccessor(ref.when.prop);
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

function litIdRefListExpr(
  refs: IdRefIR[],
  passthroughProp: string | undefined,
  cssPrefix: string,
): string {
  const idFor = (slug: string) => `'${cssPrefix}-${slug}'`;
  const parts = refs.map((ref) => {
    const guard = litIdRefGuardExpr(ref);
    return guard ? `${guard} ? ${idFor(ref.slug)} : null` : idFor(ref.slug);
  });
  if (passthroughProp) parts.push(propAccessor(passthroughProp));
  if (
    parts.length === 1 &&
    refs.length === 1 &&
    !refs[0].when &&
    !refs[0].slotGate &&
    !passthroughProp
  ) {
    return idFor(refs[0].slug);
  }
  return `[${parts.join(", ")}].filter(Boolean).join(' ') || undefined`;
}

/**
 * FEAT-A11Y-COMPOSITE-KEYBOARD-01: whether any node in the emitted tree
 * carries the `keyboardPanel` fact — the open action's post-open focus
 * target. Select has no focus container but still needs the interaction
 * panel ref + `containerEl` wiring, so the element-side gating conditions
 * consult this alongside `ir.interaction?.focusContainer`.
 */
function domHasKeyboardPanel(ir: ComponentIR): boolean {
  const walk = (node: DomNodeIR): boolean =>
    node.keyboardPanel === true || node.children.some(walk);
  return ir.dom ? walk(ir.dom) : false;
}

function renderLitDomNode(
  node: DomNodeIR,
  ctx: LitRenderContext,
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
      // A slot whose presence gates a generated idref re-renders the host
      // on assignment changes so the runtime querySelector guard
      // re-evaluates (FEAT-A11Y-LABEL-ID-ASSOCIATION-01).
      if (ctx.idRefGatedSlots?.has(node.slotName)) {
        return `${pad}<slot name="${node.slotName}" @slotchange=\${() => this.requestUpdate()}></slot>`;
      }
      return `${pad}<slot name="${node.slotName}"></slot>`;
    }
    return `${pad}<slot></slot>`;
  }

  // IR-DOM-ITERATE-CAPABILITY-01: extend iterationScope for this node
  // and every descendant when `iterate` is declared. Bindings resolve
  // `prop:item` / `prop:index` as bare locals from the map callback's
  // scope, not via `this.item`.
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
  if (node.focusContainer || node.keyboardPanel) attrs.push(`\${ref(element => { this.interactionPanel = element instanceof HTMLElement ? element : undefined; })}`);
  if (node.keyboardAnchor) attrs.push(`\${ref(element => { this.interactionAnchor = element instanceof HTMLElement ? element : undefined; })}`);
  const classParts: string[] = [];
  if (node.part) classParts.push(`'${ctx.classRecipe}__${node.part}'`);

  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === "class" || key === "className") {
      classParts.push(`'${value}'`);
      continue;
    }
    attrs.push(`${key}="${value.replace(/"/g, "&quot;")}"`);
  }

  // ICON-CATALOG-RUNTIME-DELIVERY-01: a glyph node's svg surface comes
  // from the resolved catalog record — data-fsds-icon + viewBox + width/
  // height attrs plus one <path> per glyph path record as the only
  // content, wrapped in a null-guard so an unknown icon name renders
  // nothing. iconGlyph is mutually exclusive with children/content/
  // iterate/componentRef/slot at IR-build, so this branch owns the full
  // node lowering and returns directly rather than falling through the
  // generic children/content/tag machinery below. Authored static attrs
  // (fill, xmlns — already folded into `attrs` above) are preserved.
  const iconGlyphEntry = ctx.iconGlyphIdents?.get(node);
  if (iconGlyphEntry) {
    const { glyphIdent, pxIdent } = iconGlyphEntry;
    const sizeExpr = pxIdent
      ? `${pxIdent} ?? ${glyphIdent}.size`
      : `${glyphIdent}.size`;
    const svgAttrs = [
      ...attrs,
      `data-fsds-icon=\${${glyphIdent}.name}`,
      `viewBox=\${${glyphIdent}.viewBox}`,
      `width=\${${sizeExpr}}`,
      `height=\${${sizeExpr}}`,
    ];
    const pathChildPad = " ".repeat(childIndent);
    const pathAttrExprs = ICON_GLYPH_PATH_ATTRS.map(
      ({ recordKey, svgAttr }) => `${svgAttr}=\${ifDefined(glyphPath.${recordKey})}`,
    ).join(" ");
    // SVG fragment children must be built with the `svg` tagged template,
    // not `html` — an html-tagged <path> fragment does not render inside
    // an <svg> element in Lit's template model.
    const pathsExpr =
      `\${${glyphIdent}.paths.map((glyphPath) => svg\`<path ${pathAttrExprs} />\`)}`;
    const svgBody = [
      `${pad}<${node.tag}${formatLitAttrs(svgAttrs)}>`,
      `${pathChildPad}${pathsExpr}`,
      `${pad}</${node.tag}>`,
    ].join(separator);
    return `${pad}\${${glyphIdent} ? svg\`${separator}${svgBody}${separator}${pad}\` : nothing}`;
  }

  // IR-DOM-BINDING-CAPABILITY-01: event bindings lower to Lit's
  // `@eventname=` syntax. Critically, event handlers are NOT wrapped in
  // ifDefined() — Lit invokes the bound expression once per render to
  // produce the listener; an undefined value installs no listener
  // (silent no-op), which is exactly the right behavior for optional
  // callback props. ifDefined() would wrap the listener-producing
  // function itself, breaking listener installation.
  for (const [eventName, expr] of Object.entries(node.events)) {
    const activation = eventName === "click" ? node.activation : undefined;
    const disclosure = activation?.channel;
    if (disclosure) {
      const next = activation!.operation === "toggle" ? `!this.behavior.${disclosure.name}` : String(activation!.operation === "open");
      attrs.push(`@click=\${(e: MouseEvent) => { if (canActivateInteraction(e, ${activation!.cancelNativeDefault})) this.behavior.set${capitalizeLit(disclosure.name)}(${next}); }}`);
      continue;
    }
    const rendered = renderLitEvent(eventName, expr, ctx, node.tag);
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: bind the realized keyboard actions onto
  // the declared `when` part's node. The handler ident is part-derived and
  // the co-located behavior emits its implementation from the same IR facts.
  // The composite item part's handler receives the item value exactly as the
  // item's click activation passes it, so pointer and keyboard commits stay
  // semantically identical.
  const isCompositeItem = ctx.compositeItemPart !== undefined && node.part === ctx.compositeItemPart;
  if (node.keyboardActions && node.keyboardActions.length > 0 && node.part) {
    const handlerIdent = `this.behavior.handle${capitalizeLit(node.part)}Keydown`;
    if (isCompositeItem && ctx.compositeMemberExpr) {
      const memberExpr = renderLitBindingValue(ctx.compositeMemberExpr, ctx);
      if (memberExpr !== null) {
        attrs.push(`@keydown=\${(e: KeyboardEvent) => ${handlerIdent}(e, ${memberExpr})}`);
      }
    } else {
      attrs.push(`@keydown=\${(e: KeyboardEvent) => ${handlerIdent}(e)}`);
    }
    // A keyboard host that is not natively focusable must become
    // programmatically focusable so the delegated keys can fire and the
    // a11y lint holds; -1 keeps it out of tab order.
    if (isCompositeItem || !NATIVE_FOCUSABLE_TAGS.has(node.tag)) {
      attrs.push(`tabindex="-1"`);
    }
  } else if (isCompositeItem) {
    // Composite roving item without its own keydown: still a roving focus
    // target — focusable for the roving focus path but out of tab order
    // (APG roving tabindex with DOM focus tracking).
    attrs.push(`tabindex="-1"`);
  }

  // componentRef: the IR classified each binding (prop vs host attr); the
  // emitter reads it instead of guessing (normal-form property 4).
  const litRefBindingByAttr = new Map(
    (node.componentInstance?.bindings ?? []).map((b) => [b.sourceAttr, b]),
  );
  for (const [key, expr] of Object.entries(node.bindings)) {
    // Dual-pathway dedup: parseDomNode mirrored `bindings.onX` into
    // `events.<x>` for back-compat. Skip the legacy attribute pass.
    if (/^on[A-Z]/.test(key)) {
      const evt = key.slice(2).toLowerCase();
      if (node.events[evt]) continue;
    }
    const rendered = renderLitBinding(
      key,
      expr,
      ctx,
      node.tag,
      litRefBindingByAttr.get(key),
    );
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: generated ids on relationship
  // targets and lowered idref attributes on sources. Lit ids are
  // shadow-root-scoped, so plain literals suffice (no instance
  // namespace). slotGate is not lowerable (slot contents are not
  // statically knowable) and refs targeting a consumer-slotted control
  // are skipped entirely — idrefs cannot cross the shadow boundary.
  if (node.generatedIdSlug !== undefined) {
    attrs.push(`id="${ctx.classRecipe}-${node.generatedIdSlug}"`);
  }
  for (const refAttr of node.idRefAttrs) {
    const refs = refAttr.refs.filter(
      (ref) => ref.slug !== ctx.fieldAssociationControlSlug,
    );
    if (refs.length === 0 && !refAttr.passthroughProp) continue;
    if (
      refs.length === 1 &&
      !refs[0].when &&
      !refs[0].slotGate &&
      !refAttr.passthroughProp
    ) {
      attrs.push(`${refAttr.attribute}="${ctx.classRecipe}-${refs[0].slug}"`);
      continue;
    }
    const expr = litIdRefListExpr(refs, refAttr.passthroughProp, ctx.classRecipe);
    attrs.push(`${refAttr.attribute}=\${ifDefined(${expr})}`);
  }

  // IR-DOM-CSS-VAR-BINDING-01: lower `cssVarBindings` to Lit's
  // `style=${styleMap({ '--fsds-foo': value })}` directive form.
  // styleMap accepts arbitrary string keys (including CSS custom
  // properties), and lit-analyzer types non-known property values as
  // `string | undefined`, so cast non-string sources with `String(...)`
  // to avoid no-incompatible-type-binding. The `styleMap` directive
  // import is conditionally injected by the imports-body scan
  // (`usesStyleMap`) so files that don't reference it stay clean.
  if (node.cssVarBindings.length > 0) {
    const entries: string[] = [];
    for (const { varName, value } of node.cssVarBindings) {
      const valueExpr = renderLitBindingValue(value, ctx);
      if (valueExpr === null) continue;
      // styleMap value slots are typed `string | undefined`. Prop and
      // channel sources may carry non-string types (number/boolean),
      // so coerce with String(). But a literal `String(undefined)`
      // serializes to the string "undefined", which styleMap then sets
      // as `--fsds-foo: undefined;` — a parseable but semantically
      // wrong CSS declaration that overrides the var() rule's
      // fallback. The runtime rail caught this on Progress (default
      // props have no `value`, so the inline emit produced
      // `--fsds-progress-fill-width: undefined`, blocking the CSS
      // rule's `var(..., 0)` fallback from resolving).
      //
      // Lowering becomes:
      //   <expr> === undefined ? undefined : String(<expr>)
      // — preserves styleMap's "omit when undefined" semantics while
      // satisfying lit-analyzer's `string | undefined` typing for
      // arbitrary custom-property slots. Iteration aliases (loop
      // locals) can't be undefined in the iterated scope, but using
      // a uniform expression keeps the emit branch-free.
      entries.push(
        `'${varName}': ${valueExpr} === undefined ? undefined : String(${valueExpr})`,
      );
    }
    if (entries.length > 0) {
      attrs.push(`style=\${styleMap({ ${entries.join(", ")} })}`);
    }
  }

  // DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01: propertyBindings
  // are DOM-property-only facts (e.g. `indeterminate`) with no HTML
  // attribute form. Unlike Vue/Svelte/Angular, Lit's compiler makes no
  // per-name decision at the `attr=`/`?attr=`/`.attr=` level — the prefix
  // IS the mechanism, chosen at template-authoring time (confirmed
  // against the installed lit-html package: the `.` prefix produces a
  // PropertyPart whose commit does `this.element[name] = value`, a real
  // property assignment). `renderLitBinding`'s existing `?attr=` branch
  // for boolean-typed `prop:` sources is wrong here (indeterminate has no
  // attribute to toggle), so this key always lowers via a dedicated
  // `.attr=${expr}` binding rather than reusing renderLitBinding's kind
  // dispatch.
  for (const [key, expr] of Object.entries(node.propertyBindings)) {
    const rendered = renderLitPropertyBinding(key, expr, ctx);
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // Tag channel-guarded subtrees with `data-fsds-channel-renders="${name}"`
  // so behavioral tests can assert that the channel state is reflected in
  // the rendered DOM, not just in the behavior controller. The attribute is
  // only emitted for channel-driven guards (not `children` slot guards or
  // arbitrary-prop guards), since those have different test semantics.
  if (node.ifProp && node.ifProp !== "children") {
    const matchingChannel = [...ctx.channelByName.values()].find(
      (c) => c.valueProp === node.ifProp || c.name === node.ifProp,
    );
    if (matchingChannel) {
      attrs.push(`data-fsds-channel-renders="${matchingChannel.name}"`);
    }
  }

  if (ctx.isRoot) {
    attrs.push(`data-fsds-box=""`);
    attrs.unshift(`class="\${this.computeClasses()}"`);
    if (ctx.autoDismissPause) {
      attrs.push(
        `@pointerenter=\${this.autoDismiss.pauseListeners.pointerenter}`,
        `@pointerleave=\${this.autoDismiss.pauseListeners.pointerleave}`,
        `@focusin=\${this.autoDismiss.pauseListeners.focusin}`,
        `@focusout=\${this.autoDismiss.pauseListeners.focusout}`,
      );
    }
  } else if (classParts.length > 0) {
    if (classParts.length === 1) {
      attrs.unshift(`class=\${${classParts[0]}}`);
    } else {
      attrs.unshift(`class=\${[${classParts.join(", ")}].join(' ')}`);
    }
  }

  if (!ctx.isRoot && ctx.hasOverlayClick && node.attrs["role"] === "dialog") {
    attrs.push(`@click=\${(e: Event) => e.stopPropagation()}`);
  }

  const childCtx: LitRenderContext = { ...ctx, isRoot: false, preformatted: compact };
  const renderedChildren = node.children.map((c) =>
    renderLitDomNode(c, childCtx, childIndent),
  );

  // IR-DOM-BINDING-CAPABILITY-01: content binding lowers to a `${...}`
  // interpolation as the element's child content. Lit's html`` tagged
  // template invokes the expression once per render; the result is
  // rendered as text or a nested template depending on its type
  // (Lit's renderer handles strings, nodes, and templates uniformly).
  // Mutually exclusive with children — parseDomNode rejects the
  // combination. Inline (no newline) because most content bindings are
  // short value interpolations, not block elements.
  //
  // FEAT-CODEBLOCK-HIGHLIGHT-01: a content transform instead maps the
  // shared tokenizer's stream to one `html` fragment per token — the
  // token part's class plus a `data-token` kind attribute, with
  // `${token.text}` interpolation (text-only children, so the source is
  // never interpreted as markup; Lit renders the returned array
  // natively). A declared gate degrades to the plain source expression.
  let contentInline: string | null = null;
  if (node.content) {
    if (isHighlightTransform(node.content)) {
      const transform = node.content;
      const sourceExpr = appendPath(
        litPropAccessor(transform.sourceProp, ctx),
        transform.source.path,
      );
      const languageExpr = appendPath(
        litPropAccessor(transform.languageProp, ctx),
        transform.language.path,
      );
      const gateExpr = transform.gate !== undefined
        ? appendPath(litPropAccessor(transform.gateProp ?? transform.gate.prop, ctx), transform.gate.path)
        : "true";
      const tokensExpr = transform.tokensProp ? litPropAccessor(transform.tokensProp, ctx) : "undefined";
      const prepared = `prepareHighlightSource(${sourceExpr}, ${languageExpr}, { tokens: ${tokensExpr}, highlight: ${gateExpr} })`;
      if (transform.linePart && transform.gutterPart) {
        const lineNumbersExpr = transform.lineNumbersProp ? litPropAccessor(transform.lineNumbersProp, ctx) : "false";
        contentInline = `\${${prepared}.lines.map((line) => html\`<fsds-${ctx.classRecipe}-line .number=\${line.number} ?show-line-numbers=\${${lineNumbersExpr}}>` +
          `\${line.tokens.map((token) => line.highlighted ? ` +
          `html\`<fsds-${ctx.classRecipe}-token .kind=\${token.kind} data-token=\${token.kind}>\${token.text}</fsds-${ctx.classRecipe}-token>\` : token.text)}` +
          `</fsds-${ctx.classRecipe}-line>\${line.ending}\`)}`;
      } else {
        contentInline = `\${${prepared}.lines.map((line) => line.tokens.map((token) => token.text).join('') + line.ending)}`;
      }
    } else if (isMarkdownTransform(node.content)) {
      // FEAT-MARKDOWN-CONTENT-TRANSFORM-01: the content is the structural
      // parse of the markdown source, rendered by the module-scope html``
      // helpers. A declared gate falls back to the plain source run.
      const transform = node.content;
      const sourceExpr = appendPath(
        litPropAccessor(transform.sourceProp, ctx),
        transform.source.path,
      );
      const treeCall = `renderMarkdownBlocks(${sourceExpr})`;
      if (transform.gate !== undefined) {
        const gateExpr = appendPath(
          litPropAccessor(transform.gateProp ?? transform.gate.prop, ctx),
          transform.gate.path,
        );
        contentInline = `\${${gateExpr} ? ${treeCall} : ${sourceExpr}}`;
      } else {
        contentInline = `\${${treeCall}}`;
      }
    } else {
      const contentExpr = renderLitContent(
        contentBindingOrTransformSource(node.content)!,
        ctx,
      );
      if (contentExpr !== null) contentInline = contentExpr;
    }
  }

  // componentRef: render the referenced custom element by its registered name
  // (`fsds-<kebab>`, matching how that component defines itself). A side-effect
  // import (added by the class-body generator) registers the element; bindings
  // use the property form for the custom element's @property fields, driven by
  // the IR's ComponentInstanceIR classification (see renderLitBinding's
  // refBinding path).
  const tag = node.componentRef
    ? `fsds-${toKebabCase(node.componentRef)}`
    : node.tag;

  const renderElementBody = (tagName: string): string => {
    const tagIsVoid = VOID_HTML_ELEMENTS_LIT.has(tagName);
    if (contentInline !== null && renderedChildren.length === 0) {
      return `${pad}<${tagName}${formatLitAttrs(attrs)}>${contentInline}</${tagName}>`;
    }
    if (renderedChildren.length === 0 && tagIsVoid) {
      return `${pad}<${tagName}${formatLitAttrs(attrs)} />`;
    }
    if (renderedChildren.length === 0) {
      return `${pad}<${tagName}${formatLitAttrs(attrs)}></${tagName}>`;
    }
    return [
      `${pad}<${tagName}${formatLitAttrs(attrs)}>`,
      ...renderedChildren,
      `${pad}</${tagName}>`,
    ].join(separator);
  };

  let body: string;
  if (ctx.isRoot && ctx.rootPolymorphicTag && !node.componentRef) {
    const nonDefaultBranches = ctx.rootPolymorphicTag.allowedTags
      .filter((tagName) => tagName !== ctx.rootPolymorphicTag!.defaultTag)
      .map((tagName) => {
        const branch = renderElementBody(tagName).trimStart();
        return `this.${ctx.rootPolymorphicTag!.propName} === "${tagName}" ? html\`${branch}\``;
      });
    const defaultBranch = `html\`${renderElementBody(ctx.rootPolymorphicTag.defaultTag).trimStart()}\``;
    body = `${pad}\${${[...nonDefaultBranches, defaultBranch].join(" : ")}}`;
  } else {
    body = renderElementBody(tag);
  }

  let withIfGuard = body;
  if (node.ifSlot) {
    const condition = `${node.ifNegated ? "!" : ""}this.slotPresence.has(${JSON.stringify(node.ifSlot)})`;
    withIfGuard = `${pad}\${${condition} ? html\`${separator}${body}${separator}${pad}\` : nothing}`;
  } else if (node.ifProp) {
    if (node.ifProp === "children") {
      // Guard the label wrapper on slot presence, mirroring Vue's `v-if="$slots.default"`
      // and Svelte's `{#if children}`. Lit doesn't expose a synchronous
      // "is anything slotted?" API, so we track it with a reactive `_hasChildren`
      // state property that gets flipped true/false via a `slotchange` listener
      // on the inner <slot>. The class body generator injects this property and
      // the handler when it detects any `if: "children"` node in the tree.
      withIfGuard = `\${${node.ifNegated ? "!" : ""}this._hasChildren ? html\`${separator}${body}${separator}${pad}\` : nothing}`;
    } else {
      // IR-DOM-ITERATE-CAPABILITY-01: iteration aliases match before
      // channel lookup. A guard `if: "item"` resolves to the bare
      // local introduced by the surrounding .map callback.
      const matchingChannel = [...ctx.channelByName.values()].find(
        (c) => c.valueProp === node.ifProp || c.name === node.ifProp,
      );
      const expr = ctx.iterationScope?.has(node.ifProp)
        ? node.ifProp
        : matchingChannel
          ? `this.behavior.${matchingChannel.name}`
          : `this.${node.ifProp}`;
      const condition = node.ifNegated ? `!${expr}` : expr;
      withIfGuard = `${pad}\${${condition} ? html\`${separator}${body}${separator}${pad}\` : nothing}`;
    }
  }

  // IR-DOM-ITERATE-CAPABILITY-01: iteration wrap as the outermost
  // layer. Lit's html-template arrays render natively, so a bare
  // `.map(...)` returning an array of html fragments works without
  // explicit `repeat()` directive (which would be needed only for
  // keyed reconciliation of reorderable lists — not relevant here
  // since iteration sources are count or non-reorderable arrays).
  //
  //   kind="array": ${items.map((item, index) => html`...`)}
  //   kind="count": ${Array.from({ length: count }, (_, index) => html`...`)}
  if (node.iteration) {
    const { kind, source, indexVar, itemVar } = node.iteration;
    const params = kind === "array" ? `${itemVar}, ${indexVar}` : `_, ${indexVar}`;
    // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: route iteration source
    // through the binding-value renderer. The previous bare `this.X`
    // happened to work for `prop:X` because Lit components expose props
    // as instance fields, but channel-driven sources should resolve to
    // `this.behavior.X` (the controllable-state value), not the raw
    // `@property` field. Going through `renderLitBindingValue` keeps
    // the dispatch source-uniform.
    const sourceExpr = renderLitBindingValue(source, ctx);
    if (sourceExpr === null) {
      throw new Error(
        `Lit emitter: iteration source could not be lowered (source kind=${source.kind})`,
      );
    }
    // FIX-COUNT-ITERATION-DEFAULT-THREADING-01 / FIX-UNDEFINED-PROP-
    // ACCESSOR-DEFAULTING-01: an array- or count-kind iteration source
    // that is a bare prop binding must fall back to the prop's CONTRACT
    // default when the prop resolves to `undefined` at runtime (parity
    // with react's parameter default / vue's withDefaults / svelte's
    // `export let`). Originally this call site applied its own `??
    // default` fallback on top of a bare `sourceExpr`; now that
    // `litPropAccessor` (reached via `renderLitBindingValue`) is itself
    // default-aware, `sourceExpr` already carries `(this.x ??
    // contractDefault)` for any prop with a declared default — stacking
    // a second `?? []` / `?? 0` here would be a TS2869 unreachable-branch
    // error (this exact defect broke `tsc` for Select.options/
    // Walkthrough.steps, both array-kind sources with contract array
    // defaults, during development). Only bare-prop sources with NO
    // contract default still need this call site's own fallback — the
    // accessor leaves those reads unwrapped.
    const sourceHasAccessorDefault =
      source.kind === "prop" &&
      ctx.styledByName.get(source.prop)?.defaultExpr !== undefined;
    const arrowSource =
      kind === "array"
        ? `(${sourceHasAccessorDefault ? sourceExpr : `${sourceExpr} ?? []`}).map((${params}) => html\`${separator}${withIfGuard}${separator}${pad}\`)`
        : `Array.from({ length: ${sourceHasAccessorDefault ? sourceExpr : `${sourceExpr} ?? 0`} }, (${params}) => html\`${separator}${withIfGuard}${separator}${pad}\`)`;
    return `${pad}\${${arrowSource}}`;
  }
  return withIfGuard;
}

// Attributes that should be bound as plain HTML attributes (no `.` prefix
// in Lit's html template), not DOM properties. Covers two cases:
//   1. `data-*` and `aria-*` — not real DOM properties on most elements
//   2. Native HTML attrs that have a read-only IDL property of the same name
//      (e.g. `HTMLLabelElement.form` returns the associated form *element*
//      and can't be assigned). The codegen doesn't know which root tag the
//      template emits at binding time, so we conservatively list common
//      readonly-IDL names here.
const LIT_READONLY_IDL_NAMES = new Set(["form", "labels", "list", "options"]);

function isAttributeOnlyBinding(attr: string): boolean {
  if (attr.startsWith("aria-") || attr.startsWith("data-")) return true;
  return LIT_READONLY_IDL_NAMES.has(attr);
}

/**
 * Lower a React-style camelCase contract binding key to its HTML-native DOM
 * attribute name for Lit templates. Lit (like Vue/Svelte) passes attribute
 * names through to the rendered HTML, so a `htmlFor` binding key would emit the
 * non-standard `htmlfor` attribute instead of the DOM `for` — breaking the
 * <label> for-association. Mirrors vueAttrName and the Svelte equivalent. The
 * value still reads from the `htmlFor` @property; only the emitted attribute
 * name is lowered. (className is handled separately by the class recipe.)
 */
function litDomAttrName(name: string): string {
  if (name === "htmlFor") return "for";
  return name;
}

const LIT_FORM_HOSTS = new Set(["input", "textarea", "select"]);

/**
 * Host-aware channel event lowering (FIX-CHANNEL-EVENT-LOWERING-001):
 * reading element state (.checked/.value) is only valid on form hosts.
 * A channel click on a button/div host toggles the boolean channel,
 * matching react/vue/svelte/react-native.
 */
function litChannelEventBinding(
  eventName: string,
  ch: NormalizedChannelIR,
  tag: string | undefined,
): string {
  if (ch.callbackKind === "event") {
    return `@${eventName}=\${(e: Event) => this.${ch.changeHandlerProp}?.(e)}`;
  }
  if (!LIT_FORM_HOSTS.has(tag ?? "") && ch.valueType === "boolean") {
    const setter = `set${capitalizeLit(ch.name)}`;
    return `@${eventName}=\${() => this.behavior.${setter}(!this.behavior.${ch.name})}`;
  }
  const handlerName = `handle${capitalizeLit(ch.name)}Change`;
  return `@${eventName}=\${(e: Event) => this.${handlerName}(e)}`;
}

function renderLitBinding(
  rawAttr: string,
  expr: BindingExpression,
  ctx: LitRenderContext,
  tag?: string,
  refBinding?: { kind: "prop" | "attribute"; targetProp?: string },
): string | null {
  const attr = litDomAttrName(rawAttr);
  switch (expr.kind) {
    case "valueMap": {
      const lowered = renderLitBindingValue(expr, ctx);
      if (lowered === null) return null;
      if (refBinding?.kind === "prop") return `.${attr}=\${${lowered}}`;
      return `${attr}=\${${lowered}}`;
    }
    case "prop": {
      const prop = ctx.styledByName.get(expr.prop);
      // BINDING-EXPRESSION-V2-PATH-01: when a path is present, the
      // projected field's type is unknown to the emitter — the
      // prop.type string describes only the root prop, not nested
      // members. Special-case coercions (boolean attribute binding,
      // ARIA string serialization, ARIA-mixin null coercion) are
      // only applied when the binding reads the raw prop. With a
      // path, fall through to the generic attribute binding with
      // ifDefined.
      const hasPath = expr.path !== undefined && expr.path.length > 0;
      const isBoolean = !hasPath && prop ? /\bboolean\b/.test(prop.type) : false;
      // ARIA-mixin props (`ariaLabel`, `ariaDescribedby`, etc.) are
      // declared as `string | null` because the underlying DOM IDL
      // (ARIAMixin) typing is `string | null`. Coerce null to
      // undefined before handing to `ifDefined` so a null value
      // omits the attribute rather than serializing as the literal
      // string "null". Other props are declared `T | undefined` and
      // need no coercion.
      //
      // Post-V2 (BINDING-EXPRESSION-V2-01): iteration locals never
      // reach this branch — they come in as `iterationLocal`-kind
      // bindings and are handled in the dedicated case below.
      const isAriaMixin = !hasPath && ARIA_MIXIN_NAMES.has(expr.prop);
      // FIX-LIT-PRIMARY-ATTR-DEFAULTING-01: this is the primary
      // attribute-binding path (every plain `attr=${this.x}` /
      // `?attr=${this.x}` / `.prop=${this.x}` emission in the
      // component's DOM tree routes through this case). It previously
      // read the bare `propAccessor`, so a prop with a contract
      // default silently lost that default here — the one shape
      // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01 didn't cover (that
      // fix wired conditional/predicate/class-modifier accessors, but
      // this case predates and bypasses `litPropAccessor`). React's
      // parity oracle (`renderReactBinding`, `case "prop"`) always
      // emits the bare destructured identifier, which is ALREADY
      // defaulted at the function-parameter level (`{ x = default }`)
      // for every sub-shape — plain attribute, boolean attribute, and
      // property (componentRef) binding alike. `defaultAwareLitPropAccessor`
      // is the Lit-side equivalent: wraps with `?? default` only when
      // the contract declares one, otherwise stays bare — so props
      // without a default see no behavior change.
      const rawAcc = appendPath(
        defaultAwareLitPropAccessor(expr.prop, ctx.styledByName),
        expr.path,
      );
      // ARIA-mixin null-coercion (`?? undefined`) is only meaningful when
      // the accessor can still observe `null` — an ARIA-mixin prop with a
      // contract default is already wrapped `(this.x ?? default)` by
      // `defaultAwareLitPropAccessor` above, which narrows the type to
      // non-nullish (the default is always a string), so appending
      // `?? undefined` would be dead code TS rejects as
      // "right operand of ?? is unreachable" (TS2869). No corpus ARIA-mixin
      // prop currently declares a contract default, but the gate keeps the
      // emitter correct if one is added.
      const hasDefault =
        ctx.styledByName.get(expr.prop)?.defaultExpr !== undefined;
      const acc =
        isAriaMixin && !hasDefault ? `${rawAcc} ?? undefined` : rawAcc;
      // Every styled prop is declared as `propName?: T` in the Lit
      // emitter (see generatePropertyDeclarations), so at the field
      // type level the value is always `T | undefined` regardless of
      // the IR `required` flag. Lit's `ifDefined` directive on an
      // attribute binding handles `undefined` correctly: it removes
      // the attribute when the value is undefined and sets it
      // otherwise. lit-analyzer's strict-typing rules require this
      // for any non-boolean attribute binding whose source can be
      // undefined (no-incompatible-type-binding).
      //
      // ARIA attributes are always string-valued at the DOM level
      // even when the contract types them as boolean (e.g.
      // `aria-pressed`). Emit a plain `attr=` binding that lets the
      // value coerce to "true"/"false" rather than `?attr=`
      // boolean-attribute presence/absence, which is structurally
      // wrong for ARIA semantics ("aria-pressed=false" is meaningful,
      // while `?aria-pressed=${false}` removes the attribute).
      // When the underlying prop is boolean, serialize as the
      // explicit `'true'`/`'false'` string the ARIA spec expects —
      // lit-analyzer's HTML data model types these attribute slots
      // as the strict union `"true" | "false" | undefined` and
      // refuses `boolean | undefined`. The ternary preserves
      // undefined so `ifDefined` can omit the attribute when unset.
      if (attr.startsWith("aria-")) {
        if (isBoolean) {
          return `${attr}=\${ifDefined(${rawAcc} === undefined ? undefined : (${rawAcc} ? 'true' : 'false'))}`;
        }
        return `${attr}=\${ifDefined(${acc})}`;
      }
      if (isBoolean) {
        // Boolean attrs → `?attr=` (Lit boolean attribute binding).
        // Coerce `undefined` to `false` so the type narrows to
        // `boolean` and lit-analyzer accepts it. Runtime semantics
        // are unchanged: undefined and false both produce attribute
        // absence in Lit's boolean-attribute binding.
        return `?${attr}=\${${hasDefault ? rawAcc : `${rawAcc} ?? false`}}`;
      }
      // componentRef: the IR classified this binding. kind:"prop" → the target
      // is a custom element with a `@property`-decorated field of this name;
      // set it via Lit's property-binding (`.prop=`) using the RESOLVED target
      // prop name, so the value reaches the reactive property. No `ifDefined`:
      // that directive only applies to ATTRIBUTE bindings (lit-analyzer errors
      // "has no effect here" on a property binding); a property accepts an
      // undefined value directly. kind:"attribute" → falls through to the
      // attribute-binding form below (host passthrough; ARIAMixin maps aria-*).
      if (refBinding?.kind === "prop") {
        return `.${refBinding.targetProp}=\${${acc}}`;
      }
      // Attribute binding for every other case. The previous default
      // emitted `.${attr}=` (DOM property binding), but Lit's
      // property-binding syntax sets `el[attr] = undefined` literally
      // when the value is undefined — lit-analyzer rejects this
      // because the underlying DOM IDL is typed `string`. Switching
      // to attribute binding with `ifDefined` is the canonical
      // lit-html idiom for optional values: attribute set when
      // defined, removed when undefined, with no DOM-property
      // assignment of undefined.
      return `${attr}=\${ifDefined(${acc})}`;
    }
    case "literal":
      return `${attr}="${expr.value.replace(/"/g, "&quot;")}"`;
    case "iterationLocal": {
      // The item exists, but a projected record field may be absent.
      // Omit absent attributes while preserving explicit false values;
      // property bindings still carry their native value unchanged.
      const name = litIterationLocalName(expr.local, ctx);
      if (!name) return null;
      const acc = appendPath(name, expr.path);
      if (isAttributeOnlyBinding(attr) || attr === "title") {
        const value = expr.path?.length ? `ifDefined(${acc})` : acc;
        return `${attr}=\${${value}}`;
      }
      return `.${attr}=\${${acc}}`;
    }
    case "projection": {
      const lowered = renderLitBindingValue(expr, ctx);
      if (lowered === null) return null;
      if (isAttributeOnlyBinding(attr) || attr.startsWith("aria-")) {
        return `${attr}=\${${lowered}}`;
      }
      return `.${attr}=\${${lowered}}`;
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") {
        // BINDING-EXPRESSION-V2-PATH-01: ch.valueType describes the
        // channel's value at the root; a path-projected field's type
        // is opaque to the emitter. Skip boolean-coercion shortcuts
        // when a path is present and emit a plain expression — the
        // type-checker on the consumer side handles shape.
        const hasPath = expr.path !== undefined && expr.path.length > 0;
        const channelAcc = appendPath(`this.behavior.${ch.name}`, expr.path);
        // ARIA attrs are always string-typed at the DOM. For boolean channels
        // (`aria-checked`, `aria-pressed`, `aria-selected`), serialize the
        // value as the explicit `"true"`/`"false"` string the ARIA spec
        // expects — `?aria-checked=` would collapse to attribute-presence
        // ("aria-checked=\"\"") which is structurally invalid, and plain
        // `aria-checked=${false}` would serialize as `aria-checked="false"`
        // (valid but axe correctly flags it when the role doesn't permit it).
        if (attr.startsWith("aria-")) {
          if (!hasPath && ch.valueType === "boolean") {
            return `${attr}=\${${channelAcc} ? 'true' : 'false'}`;
          }
          return `${attr}=\${${channelAcc}}`;
        }
        if (!hasPath && ch.valueType === "boolean") {
          return `?${attr}=\${${channelAcc}}`;
        }
        if (isAttributeOnlyBinding(attr)) {
          return `${attr}=\${${channelAcc}}`;
        }
        return `.${attr}=\${${channelAcc}}`;
      }
      if (expr.field === "defaultValue") {
        if (!ch.defaultValueProp) return null;
        if (isAttributeOnlyBinding(attr)) {
          return `${attr}=\${this.${ch.defaultValueProp}}`;
        }
        return `.${attr}=\${this.${ch.defaultValueProp}}`;
      }
      // onChange synthesis — bind to a method on the class.
      // Event-shaped channels pass the raw event to the consumer's
      // change handler property; consumer drives state externally.
      const eventName = mapJsxEventToLit(attr);
      return litChannelEventBinding(eventName, ch, tag);
    }
    case "channelCall": {
      // FEAT-BINDING-CALL-WITH-ARG-01: invoke the channel's setter WITH the
      // per-item payload. Emits `@click=${() => this.behavior.setSelection(item.value)}`.
      // The setter lives on `this.behavior`; the argument is a bare Lit
      // template expression (iteration locals resolve to the `.map()` alias).
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      const eventName = mapJsxEventToLit(attr);
      const setter = `set${capitalizeLit(ch.name)}`;
      const argExpr = renderLitBindingValue(expr.arg, ctx);
      if (argExpr === null) return null;
      return `@${eventName}=\${() => this.behavior.${setter}(${argExpr})}`;
    }
    case "channelUpdate": {
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: compose the next value inline and
      // pass it through the canonical `this.behavior.set<Channel>` setter.
      // Lit's `@event=${...}` position permits the full JS body, so no
      // synthesized method (unlike Angular).
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      const eventName = mapJsxEventToLit(attr);
      const setter = `this.behavior.set${capitalizeLit(ch.name)}`;
      const operands = expr.operands.map((o) => renderLitBindingValue(o, ctx));
      if (operands.some((o) => o === null)) return null;
      const body = composeChannelUpdateExpression(expr.op, {
        current: `this.behavior.${ch.name}`,
        setter,
        eventValue: "(e.target as HTMLInputElement).value",
        operands: operands as string[],
      });
      const param = expr.op === "setCharAt" ? "(e: Event)" : "()";
      return `@${eventName}=\${${param} => ${body}}`;
    }
    case "predicate": {
      // BINDING-EXPRESSION-V2-PREDICATE-01. Predicate result is
      // boolean. ARIA boolean attrs need the explicit `"true"`/`"false"`
      // string serialization Lit's templates use for boolean channels;
      // other attribute slots get the bare boolean.
      const lowered = renderLitPredicate(expr, ctx);
      if (lowered === null) return null;
      if (attr.startsWith("aria-")) {
        return `${attr}=\${(${lowered}) ? 'true' : 'false'}`;
      }
      if (isAttributeOnlyBinding(attr)) {
        return `${attr}=\${${lowered}}`;
      }
      return `.${attr}=\${${lowered}}`;
    }
    case "conditional": {
      const lowered = renderLitBindingValue(expr, ctx);
      if (lowered === null) return null;
      if (attr.startsWith("aria-")) {
        return `${attr}=\${${lowered}}`;
      }
      if (isAttributeOnlyBinding(attr)) {
        return `${attr}=\${${lowered}}`;
      }
      return `.${attr}=\${${lowered}}`;
    }
  }
}

/**
 * Lower a content binding to the bare Lit template expression that goes
 * inside `${...}` interpolation. For `prop:X` returns `this.X`; for
 * `literal:X` returns the JSON-quoted literal; for `channel:X.value`
 * returns `this.behavior.X`.
 */
function renderLitContent(
  expr: BindingExpression,
  ctx: LitRenderContext,
): string | null {
  switch (expr.kind) {
    case "prop":
      return `\${${appendPath(litPropAccessor(expr.prop, ctx), expr.path)}}`;
    case "literal":
      return expr.value.replace(/[<>&]/g, (c) =>
        c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
      );
    case "iterationLocal": {
      const name = litIterationLocalName(expr.local, ctx);
      return name ? `\${${appendPath(name, expr.path)}}` : null;
    }
    case "projection": {
      const lowered = renderLitBindingValue(expr, ctx);
      return lowered === null ? null : `\${${lowered}}`;
    }
    case "valueMap": {
      const lowered = renderLitBindingValue(expr, ctx);
      return lowered === null ? null : `\${${lowered}}`;
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") return `\${${appendPath(`this.behavior.${ch.name}`, expr.path)}}`;
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
      // BINDING-EXPRESSION-V2-PREDICATE-01: defensive (validator
      // rejects predicate in content position). Returns the boolean
      // expression wrapped in template interpolation.
      const lowered = renderLitPredicate(expr, ctx);
      return lowered === null ? null : `\${${lowered}}`;
    }
    case "conditional": {
      const lowered = renderLitBindingValue(expr, ctx);
      return lowered === null ? null : `\${${lowered}}`;
    }
  }
}

/**
 * Lower a predicate-kind binding to a Lit template-expression string
 * (no `${...}` scaffold). Operand accessors come from
 * `renderLitBindingValue`.
 */
function renderLitPredicate(
  expr: BindingExpression & { kind: "predicate" },
  ctx: LitRenderContext,
): string | null {
  const left = renderLitBindingValue(expr.left, ctx);
  const right = renderLitBindingValue(expr.right, ctx);
  if (left === null || right === null) return null;
  return loweredLitPredicate(expr.op, left, right);
}

function loweredLitPredicate(op: BindingPredicateOp, left: string, right: string): string {
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
 * Lower a BindingExpression to a bare TS expression usable inside a Lit
 * template's `${...}` interpolation (e.g. as an entry value in a
 * `styleMap({...})` directive). Distinct from `renderLitContent` because
 * the latter wraps prop/channel cases in their own `${...}` for embedding
 * directly into the `html\`...\`` text context, and HTML-escapes literals
 * — wrong for object-literal/JS-expression positions.
 */
function renderLitBindingValue(
  expr: BindingExpression,
  ctx: LitRenderContext,
): string | null {
  switch (expr.kind) {
    case "prop":
      return appendPath(litPropAccessor(expr.prop, ctx), expr.path);
    case "literal":
      return JSON.stringify(expr.value);
    case "iterationLocal": {
      const name = litIterationLocalName(expr.local, ctx);
      return name ? appendPath(name, expr.path) : null;
    }
    case "projection": {
      const source = renderLitBindingValue(expr.source, ctx);
      return source === null
        ? null
        : expr.op === "selectionLabel"
          ? composeBindingProjectionExpression(expr.op, source, renderLitBindingValue(expr.selection, ctx) ?? "undefined", renderLitBindingValue(expr.fallback, ctx) ?? "undefined")
          : composeBindingProjectionExpression(expr.op, source);
    }
    case "valueMap": {
      const source = renderLitBindingValue(expr.source, ctx);
      return source === null ? null : composeValueMapExpression(expr, source);
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") return appendPath(`this.behavior.${ch.name}`, expr.path);
      return null;
    }
    case "channelCall":
      // FEAT-BINDING-CALL-WITH-ARG-01: event-position only; produces a
      // handler, not a value. The IR rejects it in value positions.
      return null;
    case "channelUpdate":
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: event-position only; produces a
      // handler, not a value. The IR rejects it in value positions.
      return null;
    case "predicate":
      // BINDING-EXPRESSION-V2-PREDICATE-01.
      return renderLitPredicate(expr, ctx);
    case "conditional": {
      const condition = renderLitBindingValue(expr.condition, ctx);
      const whenTrue = renderLitBindingValue(expr.whenTrue, ctx);
      const whenFalse = renderLitBindingValue(expr.whenFalse, ctx);
      if (condition === null || whenTrue === null || whenFalse === null) return null;
      return `(${condition} ? ${whenTrue} : ${whenFalse})`;
    }
  }
}

/**
 * Lower a `propertyBindings` entry to Lit's `.attr=${expr}` PropertyPart
 * form — always a direct DOM-property assignment, never `?attr=`
 * (boolean-attribute toggle) or bare `attr=` (HTML attribute). Keys in
 * this bucket (DOM_PROPERTY_ONLY_KEYS in ir.ts) have no HTML attribute
 * reflection, so `?attr=`/`attr=` would be structurally wrong regardless
 * of the source expression's value type. `?? false` matches this file's
 * existing boolean-coercion idiom for the analogous `?attr=` case
 * (renderLitBinding's `isBoolean` branch): it keeps the DOM-side type a
 * plain `boolean` for lit-analyzer rather than assigning `undefined`
 * through the PropertyPart (which JS would coerce to `false` anyway).
 */
function renderLitPropertyBinding(
  attr: string,
  expr: BindingExpression,
  ctx: LitRenderContext,
): string | null {
  const lowered = renderLitBindingValue(expr, ctx);
  if (lowered === null) return null;
  return `.${attr}=\${${lowered} ?? false}`;
}

/**
 * Lower an entry from `node.events` into Lit's `@eventname=${...}` form.
 * For `prop:X` returns `@click=${this.X}` — NOT wrapped in ifDefined()
 * because Lit installs no listener when the value is undefined, which
 * is the correct behavior for optional callbacks. ifDefined() would
 * apply to attribute bindings, not event bindings.
 */
function renderLitEvent(
  eventName: string,
  expr: BindingExpression,
  ctx: LitRenderContext,
  tag?: string,
): string | null {
  switch (expr.kind) {
    case "prop":
      return `@${eventName}=\${${litPropAccessor(expr.prop, ctx)}}`;
    case "literal":
      // Rare. Inline as a string handler — would need eval at runtime;
      // emit verbatim and let the consumer catch authoring errors.
      return `@${eventName}="${expr.value.replace(/"/g, "&quot;")}"`;
    case "iterationLocal": {
      // Iteration locals are values, not callables. Drop the binding —
      // the IR validator would already reject a contract that routes
      // iter:index to an event.
      void ctx;
      return null;
    }
    case "projection":
      return null;
    case "valueMap":
      return null;
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      return litChannelEventBinding(eventName, ch, tag);
    }
    case "channelCall": {
      // FEAT-BINDING-CALL-WITH-ARG-01: delegate to the channelCall path in
      // renderLitBinding by re-deriving the synthetic JSX-attr name.
      const jsxAttr = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      return renderLitBinding(jsxAttr, expr, ctx, tag);
    }
    case "channelUpdate": {
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: delegate to renderLitBinding,
      // which emits the composed `@event=${(e) => this.behavior.setX(...)}` handler.
      const jsxAttr = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      return renderLitBinding(jsxAttr, expr, ctx, tag);
    }
    case "predicate":
      // BINDING-EXPRESSION-V2-PREDICATE-01: validator rejects this at
      // IR-build; the case keeps the switch exhaustive.
      return null;
    case "conditional":
      return null;
  }
}

function mapJsxEventToLit(attr: string): string {
  if (attr === "onChange") return "change";
  if (attr === "onClick") return "click";
  if (attr === "onInput") return "input";
  if (attr === "onKeyDown") return "keydown";
  if (attr === "onFocus") return "focus";
  if (attr === "onBlur") return "blur";
  if (attr.startsWith("on") && attr.length > 2) {
    return attr.slice(2).toLowerCase();
  }
  return attr;
}

function formatLitAttrs(attrs: string[]): string {
  if (attrs.length === 0) return "";
  return " " + attrs.join(" ");
}

function capitalizeLit(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * Map a channel's TypeScript value type to the DOM expression that reads the
 * post-change value off a native input element. Returns `null` when the type
 * isn't DOM-extractable from a single `<input>` (e.g. `Date[]` ranges,
 * complex object shapes) — the caller decides whether to skip emission or
 * surface an error.
 *
 * Supports:
 *   boolean        → input.checked      (checkbox-style)
 *   number         → Number(input.value)
 *   string         → input.value
 *   Date           → input.valueAsDate  (input[type=date|datetime-local|month|week])
 *   Date | null    → input.valueAsDate
 */
function litChannelValueExtraction(valueType: string): string | null {
  if (valueType === "boolean") {
    return `(event.target as HTMLInputElement).checked`;
  }
  if (valueType === "number") {
    return `Number((event.target as HTMLInputElement).value)`;
  }
  if (valueType === "string") {
    return `(event.target as HTMLInputElement).value`;
  }
  // Date or `Date | null` (but not `Date[]` or `Date | Date[] | null`).
  if (/^Date(\s*\|\s*null)?$/.test(valueType.trim())) {
    return `(event.target as HTMLInputElement).valueAsDate`;
  }
  return null;
}

const LIT_DOM_SKIP_PROPS = new Set([
  // HTMLElement built-ins that conflict with declared types
  "id",
  "title",
  "lang",
  "dir",
  "slot",
  "tabIndex",
  "draggable",
  "role",
  // class is the user's passthrough — handled separately in computeClasses
  "class",
  "style",
  "className",
  "children",
]);

const VOID_HTML_ELEMENTS_LIT = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);
