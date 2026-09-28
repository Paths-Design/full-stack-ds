/**
 * Normalized view of a component contract JSON file (validated separately via Ajv).
 */

/**
 * One parameter of a `callback` PropTypeIR (PropTypeIR V2). Mirrors a TS
 * function parameter: a name, a (recursive) PropTypeIR, and optionality.
 */
export interface PropCallbackParam {
  name: string;
  type: AuthoredPropType;
  optional?: boolean;
}

/**
 * Framework-neutral structured prop type, authored on `designed`/`constrained`
 * members. When present it supersedes the legacy TS-string `type` as the
 * agnostic source the IR normalizes and emitters lower.
 *
 * V1 (the closed pilot vocabulary, CODEGEN-PROP-TYPE-IR-PILOT-01):
 *   string | number | boolean | enum | node | ref
 * V2 (observed-corpus extension, CODEGEN-PROP-TYPE-IR-OBSERVED-TYPES-01):
 *   callback | array | union | literal | void | promise
 *
 * V2 adds exactly the shapes the real corpus uses (function/collection/union
 * props on controlled components). It deliberately does NOT add an inline
 * anonymous-object kind — named object-ish types stay `ref` to a contract
 * alias; a genuinely anonymous object type remains a declared residual.
 * See docs/a2ui-projection.md.
 */
export type AuthoredPropType =
  // --- V1 ---
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'enum'; values: string[] }
  | { kind: 'node'; of?: 'content' | 'icon' }
  | { kind: 'ref'; to: string }
  // --- V2 (observed-corpus extension) ---
  | { kind: 'callback'; params: PropCallbackParam[]; returns: AuthoredPropType }
  | { kind: 'array'; items: AuthoredPropType }
  | { kind: 'union'; of: AuthoredPropType[] }
  | { kind: 'literal'; value: string | number | boolean | null }
  | { kind: 'void' }
  | { kind: 'promise'; of: AuthoredPropType };

export interface StyledPropMember {
  name: string;
  /**
   * Legacy TypeScript type string (the React-first source). Optional now that
   * `designed`/`constrained` members may author a structured `propType` instead.
   * Exactly one of `type` / `propType` is present (schema-enforced).
   */
  type?: string;
  /** Structured, framework-neutral type. Present on migrated members. */
  propType?: AuthoredPropType;
  description?: string;
  required?: boolean;
  default?: unknown;
  /** A2UI disambiguation hint for ReactNode-typed props. */
  nodeKind?: 'node-ref' | 'icon-ref';
}

export interface ContractTypeDef {
  kind: string;
  values?: string[];
  alias?: string;
}

export interface ContractChannel {
  description?: string;
  value: string;
  defaultValue?: string;
  onChange: string;
  valueType?: string;
  /**
   * Shape of the change-handler callback. "value" (default) means the
   * handler receives the channel value directly; "event" means the
   * handler receives a framework-native event object. Declared by the
   * contract so the IR does not have to infer this from React/DOM
   * type-name heuristics — see ir.ts `buildChannelsIR`.
   */
  callbackKind?: "value" | "event";
  enabledBy?: string;
  notes?: string;
  omitWhen?: string;
}

export interface ContractEventPayloadField {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
}

export interface ContractEventSignature {
  description?: string;
  emittedVia?: string[];
  payload?: ContractEventPayloadField[];
  returns?: string;
  cancelable?: boolean;
  triggeredBy?: string[];
}

export type StateCategory =
  | "interaction"
  | "availability"
  | "selection"
  | "validation"
  | "data"
  | "visibility"
  | "motion"
  | "presentation";

/**
 * Neutral state-surface effect — what the active state DOES, independent of any
 * target (Figma/CSS) language. Lets the planner stop guessing restyle-vs-toggle
 * from category.
 */
export type StateEffect = "restyle" | "overlay" | "metadata" | "channel";

export interface ContractStateDimension {
  description?: string;
  /** Semantic domain of this axis. Cardinality derives from values.length. */
  category: StateCategory;
  values: string[];
  /** Base/absence value; excluded from the derived flat selector list. */
  initial?: string;
  /** Intra-dimension mutual exclusion. Defaults to true. */
  exclusive?: boolean;
  /** Cross-dimension suppression (e.g. availability=disabled masks interaction). */
  suppresses?: { categories?: StateCategory[]; names?: string[] };
  /** ARIA projection; values authored because semantic values can't be fabricated. */
  a11y?: { attribute: string; values?: Record<string, string | boolean> };
  /** Value-level derivation override, keyed by dimension value. */
  derivesFrom?: Record<
    string,
    { selector?: string; attr?: string; channel?: string; prop?: string }
  >;
  /** Neutral state-surface effect for the whole dimension. */
  effect?: StateEffect;
  /** Value-level effect override, keyed by dimension value (overrides `effect`). */
  valueEffects?: Record<string, StateEffect>;
}

/**
 * Closed vocabulary of native-primitive intents a part may collapse into.
 * Seeded with only the intents actually consumed by emitters; widen in
 * lockstep with new emitter mappings.
 *
 * - `native-toggle-affordance`: collapses to a native on/off control
 *   (SwiftUI Toggle, Android Switch) — see Switch.
 * - `native-disclosure`: collapses to a native disclosure primitive that
 *   holds both the summary/trigger and the collapsible content (SwiftUI
 *   DisclosureGroup, Android expandable) — see Details. The C1 candidate
 *   from MOBILE-COLLAPSE-INTENT-TRIAGE-01.
 */
export type ContractCollapseIntent =
  | 'native-toggle-affordance'
  | 'native-disclosure';

export interface ContractPartDetails {
  description?: string;
  /**
   * Native HTML tag this part is realized as. When set on a part whose
   * tag is in the table composition set (TABLE_COMPOSITION_TAGS in ir.ts),
   * the codegen emits the native element directly (no Stack wrapper).
   * When the part also appears in anatomy.dom, the two tag declarations
   * must agree — the IR builder throws on disagreement.
   *
   * Source fact: contract-authored native realization. Avoids coupling
   * realization to global name-based classifiers (the legacy
   * COMPOUND_PARTS set in semantics.ts), which would bleed into other
   * components that happen to share part names.
   */
  tag?: string;
  /**
   * Reference to another design-system component this part is realized as,
   * in `fsds.<Name>` form (e.g. `"fsds.Input"`). When set, the part is
   * lowered by-reference: emitters import the referenced component and emit
   * a component-instance element rather than a native `tag` or Stack wrapper.
   * Mutually exclusive with `tag` (the contract schema rejects both on one
   * part). The referenced component's `layer` must be lower-or-equal to this
   * component's — enforced by the layer-ordering validator.
   */
  componentRef?: string;
  /**
   * True when this part is a separately consumable compound subcomponent
   * rather than a node owned by the root anatomy.dom tree. This is the
   * contract-authored replacement for adding more names to the legacy global
   * COMPOUND_PARTS classifier.
   */
  subcomponent?: boolean;
  role?: string;
  multiple?: boolean;
  focusable?: boolean | 'roving';
  interactive?: boolean;
  portalTarget?: boolean;
  aria?: { role?: string; attributes?: string[] };
  /**
   * Declares that this part's purpose is fully served by a target's native
   * primitive on platforms that ship one. Emitters consult a per-target
   * intent→primitive table; targets without a mapping render the full
   * multi-part anatomy. Web emitters ignore this field.
   */
  collapsibleTo?: ContractCollapseIntent;
}

/**
 * Single DOM node in a contract's `anatomy.dom` tree. Mirrors the shape
 * of a rendered HTML element with optional attribute and event bindings.
 *
 * Special tag values:
 * - `"slot"` — placeholder where consumer-provided children render. In
 *   React/Vue/Angular this becomes `{children}` / `<slot />` / `<ng-content>`;
 *   in Svelte it becomes `{@render children?.()}`. Lit emits `<slot></slot>`.
 * - `"children"` — alias for `"slot"`. Either may be used.
 *
 * Binding expressions (string form, parsed by the IR builder):
 * - `"prop:<name>"` — read a top-level prop value.
 * - `"channel:<name>.value"` — read the channel's current value.
 * - `"channel:<name>.onChange"` — invoke the channel's setter from a DOM event.
 *   Each framework wraps native events idiomatically (e.g. React's onChange
 *   handler reads `event.target.checked` for boolean channels).
 * - `"channel:<name>.defaultValue"` — read the uncontrolled initial value.
 * - `"literal:<text>"` — emit the text verbatim (rare; usually use `attrs`).
 */
export interface ContractDomNode {
  /**
   * HTML tag name, or the special `"slot"` / `"children"` sentinel where
   * consumer-provided content renders. Optional only because a node may
   * instead declare `componentRef` (exactly one of the two is required —
   * enforced by the schema's `oneOf`). The IR builder normalizes a
   * componentRef node to `tag: ""` and carries the component name separately.
   */
  tag?: string;
  /**
   * Reference to another design-system component this node renders, in
   * `fsds.<Name>` form (e.g. `"fsds.Button"`). Mutually exclusive with `tag`.
   * When set, the IR carries the bare component name on `DomNodeIR.componentRef`
   * and emitters take the by-reference component-instance path (import + emit
   * `<Name .../>`). The referenced component's `layer` must be lower-or-equal
   * to this component's, enforced by the layer-ordering validator.
   */
  componentRef?: string;
  /**
   * Named-slot identifier — only meaningful when `tag === "slot"`. Maps to
   * framework idioms: Vue/Lit `<slot name="<name>">`, React `slots.<name>`,
   * Svelte `{@render <name>?.()}`, Angular `<ng-content select="[slot=<name>]">`.
   * Absent means the slot is the default/unnamed slot.
   */
  name?: string;
  /**
   * Optional reference to an `anatomy.parts` entry. The framework emitter
   * derives a BEM `__part` class from this name.
   */
  part?: string;
  /** Static attribute values that appear verbatim in the rendered output. */
  attrs?: Record<string, string>;
  /**
   * Dynamic attribute bindings. Keyed by attribute name (e.g. `aria-label`,
   * `disabled`, `src`). Lower to framework-idiomatic attribute syntax
   * (React JSX prop, Vue `:attr="..."`, Angular `[attr]="..."`, Lit
   * `?attr=${...}`, Svelte `attr={...}`).
   *
   * Event handlers and content/children do NOT belong here — use the
   * sibling `events` and `content` fields. Older contracts that smuggled
   * `onClick` or `children` through `bindings` were never portable: they
   * happened to work on React/Vue (because JSX/Vue accept arbitrary
   * props) but Angular's template parser and Lit's binding model reject
   * them. Authoring them as separate fields gives each emitter the
   * information it needs to lower into the right idiom.
   */
  bindings?: Record<string, string | ContractValueMapBinding>;
  /**
   * DOM-property-only bindings, keyed by property name (e.g.
   * `"indeterminate"`). For facts with no HTML attribute equivalent at
   * all — a JS-only DOM property that must be set imperatively
   * (`el.indeterminate = true`), never via an HTML attribute or any
   * framework's template-attribute binding syntax. Distinct from
   * `bindings` because every attribute-binding lowering (JSX prop, Vue
   * `:attr`, Angular `[attr]`, Lit `?attr=`, Svelte `attr=`) writes an
   * HTML *attribute* — the wrong mechanism here. Each emitter instead
   * applies these via its ref/lifecycle idiom (e.g. React `useRef` +
   * `useEffect`). `bindings.indeterminate` hard-fails at IR-build,
   * redirecting authors here (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-
   * INDETERMINATE-01) — the same "wrong bag, hard fail" pattern
   * `bindings.onX`/`bindings.children` already use for events/content.
   */
  properties?: Record<string, string>;
  /**
   * Event bindings keyed by *unprefixed* event name (`"click"`, `"input"`,
   * `"change"`, ...). Each emitter lowers to its framework idiom:
   *   React  → `onClick={prop}`
   *   Vue    → `@click="prop?.()"`
   *   Svelte → `on:click={prop}`
   *   Angular→ `(click)="prop && prop()"`
   *   Lit    → `@click=${this.prop}`
   * Values use the same expression grammar or finite value maps as `bindings`.
   * Channel value strategies for event handlers reuse the existing
   * `channel:<name>.onChange` semantics.
   */
  events?: Record<string, string>;
  /**
   * Inner content: either a single binding-expression string or a
   * content-transform directive (FEAT-CODEBLOCK-HIGHLIGHT-01). String form:
   * emitters lower to the framework's
   * "render this value as the element's content" idiom:
   *   React  → `<span>{prop}</span>`
   *   Vue    → `<span>{{ prop }}</span>` (interpolation; safe for ReactNode-typed props that resolve to renderable values)
   *   Svelte → `<span>{prop}</span>`
   *   Angular→ `<span>{{ prop }}</span>`
   *   Lit    → `<span>${this.prop}</span>`
   * Object form: the content is PRODUCED by the named transform applied to
   * the source prop — see `ContractContentTransform` / `ContentTransformIR`.
   * Mutually exclusive with `children` on the same node: if you want a
   * prop's value to appear *between* other children, wrap it in its own
   * `tag: "span" content: "prop:..."` child.
   */
  content?: string | ContractContentTransform;
  /**
   * Optional child nodes. Empty/absent for leaf elements. Mutually
   * exclusive with `content` on the same node — see `content` field.
   */
  children?: ContractDomNode[];
  /**
   * Render guard. Two shapes:
   * - `"<prop>"`  — render only when the named prop is truthy
   * - `"!<prop>"` — render only when the named prop is FALSY (e.g. for
   *   fallback elements that show when an optional input is absent)
   * - `"children"` — special: render only when consumer-provided
   *   children exist.
   */
  if?: string;
  /**
   * Iteration directive — renders this node N times, driven by a prop.
   * Index-keyed iteration only; not suitable for sortable/reorderable lists.
   * See `IterationIR` in `ir.ts` for the resolved form.
   */
  iterate?: ContractDomNodeIterate;
  /**
   * CSS custom-property bindings on this element's runtime `style` attribute.
   * Keys must match `--fsds-<component>-<name>` (validated at IR-build).
   * Values use the same `prop:`/`channel:`/`literal:` grammar as `bindings`.
   * Lowers to framework-idiomatic style bindings (React/Vue/Lit object-style;
   * Svelte `style:--x={v}`; Angular `[style.--x]`). Mutually exclusive with
   * a literal `style` attribute on the same node.
   */
  cssVariableBindings?: Record<string, string | ContractValueMapBinding>;
  /**
   * Icon-catalog glyph rendering directive — renders this `svg` node's
   * viewBox and `<path>` children from `@full-stack-ds/iconography`, looked
   * up at runtime by the bound name prop. Only valid on `tag: "svg"`;
   * mutually exclusive with `children`, `content`, and `iterate`. See
   * `IconGlyphIR` in `ir.ts` for the resolved form.
   */
  iconGlyph?: ContractDomNodeIconGlyph;
}

/**
 * A closed, declarative value projection for component composition. The
 * contract maps an enumerable source prop to literal target values; emitters
 * lower the normalized IR generically and never learn the host component's
 * name. `fallback` is required when the source domain cannot be enumerated.
 */
export interface ContractValueMapBinding {
  kind: 'map';
  source: string;
  values: Record<string, string>;
  fallback?: string;
}

/**
 * Icon-catalog glyph directive on an `svg` DOM node. Authored under
 * `anatomy.dom[].iconGlyph` in the contract; parsed into `IconGlyphIR` by
 * the IR builder.
 */
export interface ContractDomNodeIconGlyph {
  /** Binding naming the string prop carrying the canonical icon name, e.g. `"prop:name"`. */
  nameFrom: string;
  /**
   * Binding naming the prop carrying the requested size. Mapped through
   * `sizeHints` to pixels when hints are present; used as a raw pixel number
   * otherwise.
   */
  sizeFrom?: string;
  /** Map from size-prop enum values to pixel sizes, e.g. `{ "sm": 16, "md": 20 }`. */
  sizeHints?: Record<string, number>;
}

/**
 * Iteration directive on a DOM node. Authored under
 * `anatomy.dom[].iterate` in the contract; parsed into `IterationIR` by the
 * IR builder.
 */
export interface ContractDomNodeIterate {
  /** Binding expression naming the iteration source prop. e.g. `"prop:length"`. */
  source: string;
  /** `"count"` for N-copy iteration over a number prop; `"array"` for per-item iteration. */
  kind: 'count' | 'array';
  /** Render-context variable name for the loop index. Defaults to `"index"`. */
  indexVar?: string;
  /** Render-context variable name for the current item (kind=array only). Defaults to `"item"`. */
  itemVar?: string;
  /** TypeScript type of each item. Required when kind=array. */
  itemType?: string;
}

/**
 * Content-transform directive on a DOM node (FEAT-CODEBLOCK-HIGHLIGHT-01).
 * Authored as the object form of `anatomy.dom[].content`; parsed into
 * `ContentTransformIR` by the IR builder. The node's inner content is
 * produced by the named transform applied to the source prop, never by
 * projecting a binding verbatim.
 */
/**
 * Highlight transform: the source string splits into syntax tokens via the
 * shared pure tokenizer; one span per token (the `tokenPart` part class plus
 * a `data-token` kind attribute). Text-only by construction.
 */
export interface ContractHighlightTransform {
  transform: 'highlight';
  /** Binding naming the string prop carrying the literal source text, e.g. `"prop:code"`. */
  source: string;
  /** Binding naming the string prop carrying the declared language, e.g. `"prop:language"`. */
  language?: string;
  /** Binding naming the boolean prop gating the transform, e.g. `"prop:highlight"`. */
  gate?: string;
  /** Optional lossless token stream and line-number display bindings. */
  tokens?: string;
  lineNumbers?: string;
  /** anatomy part realized as one span per token. */
  tokenPart: string;
  linePart?: string;
  gutterPart?: string;
}

/**
 * Markdown transform (FEAT-MARKDOWN-CONTENT-TRANSFORM-01): the node's
 * content is the structural parse of the markdown source prop. Closed
 * vocabularies: every block kind and mark kind maps to a declared anatomy
 * part whose tag matches the kind's DOM contract. Text is literal by
 * construction; link hrefs are protocol-sanitized at parse time.
 */
export interface ContractMarkdownTransform {
  transform: 'markdown';
  /** Binding naming the string prop carrying the markdown source, e.g. `"prop:content"`. */
  source: string;
  /** Binding naming the boolean prop gating the transform. */
  gate?: string;
  /** Block vocabulary — kind to anatomy part. Total: every closed kind maps. */
  blockParts: {
    heading: string;
    paragraph: string;
    unorderedList: string;
    orderedList: string;
    listItem: string;
    codeBlock: string;
    blockquote: string;
  };
  /** Inline-mark vocabulary — kind to anatomy part (span-family tags, multiple). */
  markParts: {
    emphasis: string;
    strong: string;
    code: string;
    link: string;
  };
}

export type ContractContentTransform =
  | ContractHighlightTransform
  | ContractMarkdownTransform;

/**
 * Resolution for a single slot in `<Name>.tokens.json` — either a graph-backed
 * `resolvesTo` + `fallback` pair, or an intentional `literal` hardcode.
 *
 * No `property` field: slots are pure indirection; which CSS property reads
 * which slot is the concern of `<Name>.styles.json`.
 */
export interface TokenResolution {
  /** Dotted path into the global token graph (e.g. `semantic.color.background.tertiary`). */
  resolvesTo?: string;
  /** Hardcoded fallback used as the second argument to `var()`. */
  fallback?: string;
  /** Intentional literal value, mutually exclusive with `resolvesTo`+`fallback`. */
  literal?: string;
  /** Token tier; defaults to `semantic`. */
  layer?: 'core' | 'semantic' | 'brand' | 'density';
}

/**
 * Targets a styleEntry literal can render to. Defaults to all three when
 * omitted on a `resolvesTo` entry; required on `literal` entries.
 */
export type StylePlatform = 'web' | 'ios' | 'android';

/**
 * Resolution for a single CSS declaration inside a styles.json selector
 * block. Either references a slot / global token (`resolvesTo`) or carries
 * an intentional literal (`literal` + `platforms`).
 */
export interface StyleEntry {
  /** An independently settable, initially unset component design property. */
  design?: { property: string; slot: string };
  /**
   * Dotted path. If the first segment matches the contract's `cssPrefix`,
   * the path refers to a slot declared in this contract's tokens.json
   * (component-local). Otherwise the path refers to the global token graph
   * (`core.*` / `semantic.*`) — only legal when authored by the IR as a
   * direct global passthrough; the validator catches improper uses.
   */
  resolvesTo?: string;
  /**
   * Consumer-site fallback for `var(--ref, fallback)`. REQUIRED when
   * `resolvesTo` is present — enforced by validateContractFallbackCompleteness
   * ([FALLBACK_MISSING]). The variant/state scope does not inherit the slot's
   * own fallback from tokens.json once the slot is re-pointed, so the fallback
   * must be repeated here. The value should be the real resolved literal from
   * the composed token graph (so the component renders identically with the
   * token sheet loaded or absent).
   */
  fallback?: string;
  /** Hardcoded CSS value, emitted verbatim when the build target is in `platforms`. */
  literal?: string;
  /** Build targets that honor this entry. Required on `literal`, optional on `resolvesTo`. */
  platforms?: StylePlatform[];
}

// ---------------------------------------------------------------------------
// Behavior contract types — previously `unknown` in ComponentContract.
// ---------------------------------------------------------------------------

/** One named animated transition the component performs. */
export interface ContractMotionTransition {
  name: string;
  description?: string;
  /** Event or state change that starts it, e.g. `openness=closed→open`. */
  trigger?: string;
  /** CSS properties animated, e.g. `["opacity", "transform"]`. */
  properties?: string[];
  /** Token reference driving the duration. */
  duration?: string;
  /** Token reference driving the easing. */
  easing?: string;
  phase?: 'enter' | 'exit' | 'move' | 'attention';
}

/**
 * Motion contract.
 *
 * Was `motion?: unknown` — declared by 12 contracts and read by nothing, so
 * `reducedMotion: "respect"` was a promise the pipeline had no way to keep.
 * `reducedMotion` is now lowered (see `buildMotion` in ir.ts and the
 * reduced-motion block in css.ts). `transitions` is still NOT a codegen input:
 * realizing a `trigger` like `openness=closed→open` means inferring which
 * selector represents that state, which is unsolved and is exactly where
 * per-component emitter lore would accumulate. It is typed here so the
 * motion-realization rail can derive obligations from it.
 */
export interface ContractMotionCountdown {
  target: { part: string };
  driver: { kind: "budget"; source: "surface.autoDismiss" };
  effect: "remaining-width";
  reducedMotion: { kind: "steps"; steps: number };
}

/** A finite, circular content sequence. Children of viewport are the slides. */
export interface ContractSequence {
  labels: { start: string; stop: string; item: string };
  channel: string;
  itemsProp: string;
  viewport: string;
  previous: string;
  next: string;
  rotation: string;
  picker: string;
  timing: { durationProp: string; autoPlayProp: string; durationToken: string };
}
export interface ContractMotionProgress {
  target: { part: string };
  driver: { kind: "budget"; source: "sequence.advance" };
  effect: "elapsed-width" | "elapsed-ring";
  reducedMotion: { kind: "steps"; steps: number };
}
export interface ContractSequenceTransition {
  target: { part: string; scope: "children" };
  driver: { kind: "channel"; source: "sequence.index" };
  effect: "slide-inline";
  durationToken: string;
  easingToken: string;
  size: { referenceWidth: number; minMultiplier: number; maxMultiplier: number };
  reducedMotion: "instant";
}
export interface ContractMotion {
  sequenceTransition?: ContractSequenceTransition;
  countdown?: ContractMotionCountdown;
  progress?: ContractMotionProgress[];
  description?: string;
  transitions?: ContractMotionTransition[];
  /** Executable repeating effects; currently lowered by the shared web CSS backend. */
  loops?: ContractMotionLoop[];
  /**
   * `respect` honors `prefers-reduced-motion`; `disable` always skips;
   * `reduce` uses shorter variants; `ignore` does not adapt.
   */
  reducedMotion?: 'respect' | 'disable' | 'reduce' | 'ignore';
  reducedMotionStrategy?: string;
}

/** A bounded repeating-motion vocabulary. Rotation values are degrees. */
export interface ContractMotionLoop {
  name: string;
  target: { part: string };
  driver: { kind: "repeat" };
  when?: { variant: string; equals: string };
  effect: {
    kind: "opacity" | "rotation";
    keyframes: Array<{ offset: number; value: number }>;
  };
  timing: {
    duration: { token: string; multiplier?: number };
    easing: { token: string } | { cubicBezier: [number, number, number, number] };
  };
  /** Static value in the effect's units; never inferred from the final frame. */
  reducedMotion: { value: number };
}

/**
 * Closed realization vocabulary for structured `a11y.keyboard` entries
 * (FEAT-A11Y-COMPOSITE-KEYBOARD-01). An entry carrying `behavior` is lowered
 * by the Semantic IR into an emitted keydown realization on the `when` part's
 * node; the op sequences derive only from declared facts (channels,
 * compositeControl, focus strategy/orientation/wrap, dismissal, returnFocus).
 * Entries without `behavior` are declaration-only — realized by native host
 * semantics (e.g. `button` Enter/Space) or a behavior primitive (e.g.
 * dismissal Escape) — and the a11y-realization audit classifies them as such.
 */
export type KeyboardBehavior =
  | "open"
  | "select"
  | "roving-next"
  | "roving-prev"
  | "roving-first"
  | "roving-last";

export interface ContractFocus {
  description?: string;
  /** `trap` for modal-class containers, `roving` for menus/lists, `auto` defers to the platform. */
  strategy?: 'trap' | 'roving' | 'auto' | 'manual' | 'none';
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Anatomy part name receiving initial focus, or `prop:<name>` to source from a prop. */
  initialFocus?: string;
  /** Where focus returns when the component closes/unmounts. */
  returnFocus?: string;
  /** Whether roving navigation wraps at the ends. */
  wrap?: boolean;
  /** Whether body scroll is locked while the component is mounted/open. */
  scrollLock?: boolean;
}

export interface ContractPortal {
  enabled?: boolean;
  /** Default DOM mount point (e.g. `body`, `<element-id>`). */
  defaultTarget?: string;
  /** Prop name allowing the consumer to override the mount point. */
  targetProp?: string;
  positioning?: 'anchored' | 'centered' | 'fixed' | 'none';
  layering?: 'modal' | 'popover' | 'tooltip' | 'menu' | 'toast' | 'none';
  backdrop?: boolean;
  collision?: 'flip' | 'shift' | 'flip-shift' | 'none';
}

/**
 * Target-neutral text-overflow intent. Distinct from any DOM-realization
 * mechanism (existing anatomy.dom cssVariableBindings for line-clamp) — this
 * is the semantic fact; DOM targets additionally lower it through the css var
 * (both coexist, see ir.ts buildTextOverflowIR).
 */
export interface ContractTextOverflow {
  description?: string;
  /** Only `line-clamp` is modeled today; other overflow families are reserved. */
  kind: 'line-clamp';
  /** The prop supplying the line count, as `prop:<name>`. Must be the SAME
   * prop an existing cssVariableBindings line-clamp realization already reads. */
  line: string;
}

export type DismissalEvent =
  | 'escape'
  | 'overlayClick'
  | 'outsideClick'
  | 'blur'
  | 'routeChange'
  | 'triggerReclick'
  | 'userDismiss'
  | 'selection';

export interface ContractDismissalTrigger {
  event: DismissalEvent;
  /** Prop whose truthy value enables this trigger; absent means always-on. */
  enabledBy?: string;
  defaultEnabled?: boolean;
  /**
   * Anatomy part that owns this trigger's interaction. Required for
   * `overlayClick`: the dismissal click binds on this element because the
   * root is pointer-events:none under a full-cover overlay and can never be
   * the hit target (FIX-OVERLAY-CLICK-DISMISSAL-BINDING-01).
   */
  targetPart?: string;
  description?: string;
}

export interface ContractDismissal {
  triggers?: ContractDismissalTrigger[];
}

/**
 * Presence-surface family (see docs/architecture/presence-surfaces.md).
 * Semantic classifier + controller-selection descriptor. Coordinates
 * anatomy part roles with presence, modality, anchoring, positioning,
 * and dismissal mode list. Does NOT duplicate the existing portal,
 * dismissal, or focus blocks — those remain the detailed policy knobs.
 */
export type ContractSurfaceKind =
  | 'tooltip'
  | 'popover'
  | 'dialog'
  | 'menu'
  | 'select'
  | 'toast'
  | 'coachmark'
  | 'sheet';

export type ContractSurfacePresence = 'ephemeral' | 'persistent';

export type ContractSurfaceModality = 'blocking' | 'non-blocking';

export type ContractSurfaceAnchorRelation =
  | 'describedby'
  | 'controls-expanded'
  | 'labelledby'
  | 'activedescendant'
  | 'none';

export type ContractSurfacePositioningStrategy =
  | 'anchored'
  | 'centered'
  | 'viewport-edge'
  | 'fullscreen'
  | 'inline';

export type ContractSurfaceCollision = 'none' | 'flip' | 'shift' | 'flip-shift';

export type ContractSurfaceDismissalMode =
  | 'escape'
  | 'outside-click'
  | 'blur'
  | 'pointer-leave'
  | 'close-button'
  | 'timeout';

export type ContractSurfaceOpenTrigger = 'hover' | 'focus' | 'click';

export interface ContractSurfacePartAnchor {
  part: string;
  relation: ContractSurfaceAnchorRelation;
}

/**
 * Selector-sourced anchor: the anchor element lives outside the component's
 * own tree and is resolved from the page at runtime via a CSS selector
 * carried in a prop (guided tours / coachmarks: Walkthrough's
 * steps[].anchor). `prop` names an array-typed prop, `path` the member of
 * each element that carries the selector string, `indexChannel` the channel
 * whose value indexes the active element. Selector-anchored surfaces open
 * programmatically, so openTriggers stays optional for them.
 */
export interface ContractSurfaceSelectorAnchor {
  selector: {
    prop: string;
    path: string;
    indexChannel: string;
  };
}

export type ContractSurfaceAnchor =
  | ContractSurfacePartAnchor
  | ContractSurfaceSelectorAnchor;

export interface ContractSurfaceContent {
  part: string;
  interactive: boolean;
}

export interface ContractSurfacePositioning {
  strategy: ContractSurfacePositioningStrategy;
  placementProp?: string;
  collision?: ContractSurfaceCollision;
}

export interface ContractSurfaceTiming {
  openDelayProp?: string;
  closeDelayProp?: string;
  autoDismissProp?: string;
}

export interface ContractSurface {
  kind: ContractSurfaceKind;
  presence: ContractSurfacePresence;
  modality: ContractSurfaceModality;
  /**
   * Boolean prop that downgrades a blocking surface to non-blocking when
   * false: the focus trap and scroll lock stay inactive. Requires
   * `modality: 'blocking'`.
   */
  modalityProp?: string;
  anchor?: ContractSurfaceAnchor;
  content?: ContractSurfaceContent;
  positioning?: ContractSurfacePositioning;
  dismissal?: ContractSurfaceDismissalMode[];
  /**
   * Anchor-element interactions that open the surface. Required by IR
   * validation when kind === 'tooltip' OR positioning.strategy === 'anchored';
   * otherwise optional. Surfaces like Toast (viewport-edge) and centered
   * Dialog have no anchor-driven open trigger and omit this field.
   */
  openTriggers?: ContractSurfaceOpenTrigger[];
  timing?: ContractSurfaceTiming;
}

export interface ContractFormSerialization {
  valueType: string;
  valueSource: string;
  omitWhen?: 'unchecked' | 'empty' | 'disabled' | 'never';
  multiple?: boolean;
}

export interface ContractFormValidity {
  model?: 'native' | 'props' | 'hybrid';
  invalidProp?: string;
  errorMessageProp?: string;
  errorSurface?: 'aria-describedby' | 'aria-errormessage' | 'live-region' | 'none';
  ariaAttributes?: string[];
}

export interface ContractFormLabeling {
  strategy?: 'associated-label' | 'self-labeling' | 'wrapped-label';
  required?: boolean;
  via?: string[];
}

export interface ContractFormAutofill {
  autocomplete?: string;
  hints?: string[];
}

export interface ContractFormPropRef {
  prop: string;
  description?: string;
  constraintValidation?: boolean;
}

export interface ContractForm {
  participates: boolean;
  inputType?:
    | 'text' | 'number' | 'email' | 'password' | 'search' | 'tel' | 'url'
    | 'date' | 'time' | 'datetime-local' | 'month' | 'week' | 'color'
    | 'file' | 'checkbox' | 'radio' | 'select' | 'hidden' | 'combobox' | 'custom';
  name?: ContractFormPropRef;
  formProp?: ContractFormPropRef;
  required?: ContractFormPropRef;
  serialization?: ContractFormSerialization;
  validity?: ContractFormValidity;
  labeling?: ContractFormLabeling;
  autofill?: ContractFormAutofill;
}

/**
 * Interactive control capability, separate from native form serialization.
 * `form` answers whether/how a value enters FormData; this block identifies
 * the rendered control, its value channel, and its commit timing.
 */
export interface ContractFormControl {
  part: string;
  channel: string;
  valueModel: 'text' | 'boolean';
  commit: 'input' | 'change' | 'activation';
}

/**
 * Repeated-item control capability. Unlike `formControl`, the rendered part
 * is a template instantiated by an enclosing iteration and the update needs
 * an item/index payload from that iteration.
 */
export interface ContractCompositeControl {
  part: string;
  channel: string;
  interactionModel: 'collection-selection' | 'segmented-text';
  commit: 'input' | 'change' | 'activation';
  /** Closed BindingExpression grammar; arbitrary executable code is rejected. */
  update: string;
}

/**
 * Geometry / default-affordance axis (MORPHOLOGY-GEOMETRY-PROFILE-01). Closed
 * enum mirroring `component.contract.schema.json#/properties/morphology`. When
 * present, selects a StyleProfile (box-model.ts#STYLE_PROFILES) layered BETWEEN
 * the BoxModel primitive defaults and the component token sidecar — the sidecar
 * still wins. Absent => the legacy two-way primitive-under-sidecar merge and no
 * structural CSS, so unclassified components are byte-unchanged. Distinct from
 * the behavioral `category` axis: morphology drives box-model geometry only.
 */
export type ContractMorphology =
  | "fixed-square"
  | "content-inline"
  | "identity-inline"
  | "linear-meter"
  | "loading-block"
  | "replaced-media";

/** State, invoking hosts and content presence, independent of geometry. */
export interface ContractInteraction {
  channel: string;
  content: string;
  presence: "hidden" | "unmount" | "clamp";
  triggers: Array<{ part: string; operation: "toggle" | "open" | "close" | "select" | "toggle-item" }>;
  disabledProp?: string;
}

export interface ComponentContract {
  name: string;
  layer?: string;
  cssPrefix?: string;
  /** See {@link ContractMorphology}. Optional; absent keeps legacy geometry. */
  morphology?: ContractMorphology;
  /** Anatomy as a flat name list, or the richer object form with optional `details` per part. */
  anatomy?:
    | string[]
    | {
        parts: string[];
        description?: string;
        details?: Record<string, ContractPartDetails>;
        /**
         * Optional explicit DOM tree describing how anatomy parts compose
         * into rendered elements with attribute and event bindings. When
         * present, framework component-source emitters walk this tree to
         * produce idiomatic templates (JSX / SFC / html`/ component
         * template / Svelte block). When absent, emitters fall back to the
         * existing single-root-with-slot output. See ContractDomNode.
         */
        dom?: ContractDomNode;
      };
  props?: {
    styled?: { description?: string; members?: StyledPropMember[] };
    hook?: { description?: string; members?: StyledPropMember[] };
    [key: string]: { description?: string; members?: StyledPropMember[] } | undefined;
  };
  types?: Record<string, ContractTypeDef>;
  channels?: Record<string, ContractChannel>;
  dataModel?: {
    entities?: Record<string, { description?: string; fields: Record<string, string> }>;
    semantics?: Record<string, string>;
  };
  variants?: Record<string, string[]>;
  /** States as orthogonal dimensions (axes). Object-only — the legacy flat list form was removed. */
  states?: { dimensions: Record<string, ContractStateDimension>; description?: string };
  tokens?: Record<string, TokenResolution>;
  styles?: Record<string, Record<string, StyleEntry>>;
  keyframes?: Record<string, Record<string, Record<string, string>>>;
  events?: Record<string, ContractEventSignature>;
  /**
   * Named slot anchors keyed by slot name (schema-validated; typed here so
   * governed consumers can read it without casts — FEAT-SLOT-REQUIRED-USAGE-BINDING-01).
   * `required` carries two senses distinguished by part ownership: for
   * consumer-supplied regions (anatomy.dom named slots, public subcomponents)
   * it means every valid composition must supply the region — enforced
   * against curated usage frames by the usage audit; for component-owned
   * anchors it means the anchor is guaranteed present in rendered output.
   * The `root` entry anchors the host itself.
   */
  slots?: Record<string, { required: boolean; selector?: string }>;
  stateMachine?: {
    description?: string;
    transitions?: Array<{
      /**
       * Trigger name. Semantic validation (Rule 6b in validation/semantic.ts,
       * FEAT-STATEMACHINE-TRIGGER-BINDING-01) requires it to resolve to a
       * declared referent: a channels key, an events key, a prop name, a
       * dismissal.triggers[].event, an a11y.keyboard[].id, a
       * "<part>.<verb>" form whose part is in anatomy.parts, or a member of
       * the closed DOM platform set. `from`/`to` are separately bound to
       * states.dimensions by Rule 6.
       */
      event: string;
      from?: string;
      to: string;
      guard?: string;
      effect?: string;
      description?: string;
    }>;
  };
  form?: ContractForm;
  interaction?: ContractInteraction;
  formControl?: ContractFormControl;
  compositeControl?: ContractCompositeControl;
  motion?: ContractMotion;
  sequence?: ContractSequence;
  focus?: ContractFocus;
  portal?: ContractPortal;
  textOverflow?: ContractTextOverflow;
  dismissal?: ContractDismissal;
  surface?: ContractSurface;
  relationships?: Array<{
    from: string;
    to: string;
    attribute: string;
    when?: string;
    description?: string;
  }>;
  /**
   * Field-association participation (FEAT-A11Y-LABEL-ID-ASSOCIATION-01).
   * `"control"` declares that this component is a form control that, when
   * rendered inside a field composer's control slot, consumes the ambient
   * field-association context (generated control id + aria-describedby ids)
   * and binds them onto its root element. The provider side is derived from
   * `relationships[]` whose target part hosts a consumer slot — see
   * `resolveIdRelationships` in ir.ts.
   */
  fieldAssociation?: "control";
  a11y?: {
    role?: string;
    labeling?: string[];
    keyboard?: Array<
      | string
      | {
          key: string;
          action: string;
          when?: string;
          mode?: string;
          /**
           * Stable interaction identifier (FEAT-STATEMACHINE-TRIGGER-BINDING-01).
           * Several physical keys may share one id when they name the same
           * semantic trigger (ArrowRight and ArrowDown are both "arrow.next").
           * stateMachine transition events resolve against these ids.
           */
          id?: string;
          /**
           * Closed realization vocabulary (FEAT-A11Y-COMPOSITE-KEYBOARD-01).
           * When present, the Semantic IR lowers this entry into an emitted
           * keydown realization on the `when` part's node in every web
           * framework; when absent, the entry is declaration-only (realized
           * by native semantics or a primitive, e.g. dismissal Escape).
           */
          behavior?: KeyboardBehavior;
        }
    >;
    screenReader?: string[];
    /**
     * Typed unresolved ARIA-obligation acknowledgements. The contract-side
     * a11y validator (A11Y-CONTRACT-OBLIGATION-VALIDATOR-01) walks
     * `anatomy.dom` and asserts that every static role with a required
     * ARIA state has it declared (as attr or binding). When a contract
     * cannot yet truthfully declare the required state — e.g. because
     * the underlying selection model needs a grammar that hasn't landed
     * — it acknowledges the gap here with a typed reason, and the
     * validator degrades to an advisory diagnostic instead of failing.
     *
     * Each entry is point-in-time documentation of a real technical
     * blocker; the reason should cite the slice/issue that would
     * unblock the fix. This is not a silencer for arbitrary a11y
     * complaints — it's the explicit "we know, this is held until X"
     * channel.
     */
    obligations?: {
      suppress?: Array<{
        /** ARIA role the suppression applies to (e.g. "option"). */
        role: string;
        /** Required attribute the contract cannot yet provide (e.g. "aria-selected"). */
        attr: string;
        /** Why the obligation can't be met today + what would unblock it. */
        reason: string;
      }>;
    };
  };
  usage?: { example?: string; hookExample?: string };
  a2ui?: {
    category: string;
    usageHints?: string[];
    children?: {
      allowed: boolean;
      slot?: string;
      accepts?: string[];
      min?: number;
      max?: number;
    };
  };
  codegen?: { tests?: boolean };
}

/** PascalCase to kebab-case */
export function toKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function getParts(anatomy: ComponentContract["anatomy"]): string[] {
  if (!anatomy) return [];
  if (Array.isArray(anatomy)) return anatomy;
  return anatomy.parts || [];
}

export function getPartDetails(
  anatomy: ComponentContract["anatomy"],
): Record<string, ContractPartDetails> {
  if (!anatomy || Array.isArray(anatomy)) return {};
  return anatomy.details || {};
}

export function getStyledProps(contract: ComponentContract): StyledPropMember[] {
  return contract.props?.styled?.members || [];
}

/**
 * The component's consumer-facing prop surface as the union of the durable
 * buckets — `designed` + `constrained` + legacy `styled` — deduped by name
 * (first wins; designed > constrained > styled). This is the non-breaking
 * sourcing path (CODEGEN-PROP-TYPE-IR-PILOT-01): contracts migrated to the
 * six-bucket form expose props via `designed`/`constrained`; unmigrated
 * contracts keep exposing them via legacy `styled`. The IR normalizes every
 * member (structured `propType` or legacy `type`) into PropTypeIR downstream.
 */
export function getPropMembers(contract: ComponentContract): StyledPropMember[] {
  const props = contract.props ?? {};
  const ordered = [
    ...(props.designed?.members ?? []),
    ...(props.constrained?.members ?? []),
    ...(props.styled?.members ?? []),
  ];
  const byName = new Map<string, StyledPropMember>();
  for (const m of ordered) {
    if (m && typeof m.name === 'string' && !byName.has(m.name)) byName.set(m.name, m);
  }
  return [...byName.values()];
}

export function getCssPrefix(contract: ComponentContract): string {
  return contract.cssPrefix || toKebab(contract.name);
}

/**
 * Normalized view of a contract's `states` field.
 *
 * States are authored as orthogonal dimensions (the object-only form). The
 * shared codegen pipeline still needs a flat list of *active* selector keys
 * (for CSS modifier emission and React boolean-prop class recipes); that
 * `flat` list is a downstream-derived projection, never an authoring form.
 * Emitters that care about the underlying axes read `dimensions` directly.
 */
export interface NormalizedStates {
  /**
   * Flat union of every *non-initial* state value across every dimension,
   * deduplicated and first-seen-ordered. Each dimension's `initial` value is
   * the base/absence state and is excluded — dimension defaults (rest,
   * enabled, unchecked, …) must never emit a selector or a boolean modifier.
   * Empty when the contract omits states.
   */
  flat: string[];
  /**
   * The dimensional form. `null` only when the contract omits states entirely.
   */
  dimensions: Record<string, ContractStateDimension> | null;
}

export function normalizeStates(
  states: ComponentContract["states"],
): NormalizedStates {
  if (!states) return { flat: [], dimensions: null };
  const dims = states.dimensions;
  const flat: string[] = [];
  for (const dim of Object.values(dims)) {
    for (const v of dim.values) {
      // The initial (base/absence) value is the un-modified state — it carries
      // no selector and no boolean modifier, so it stays out of the flat list.
      if (dim.initial !== undefined && v === dim.initial) continue;
      // Channel-driven values are surfaced through their channel (data-state /
      // aria-*), not as a CSS modifier class, so they also stay out of `flat`.
      if (dim.derivesFrom?.[v]?.channel) continue;
      flat.push(v);
    }
  }
  return { flat: dedupe(flat), dimensions: dims };
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
