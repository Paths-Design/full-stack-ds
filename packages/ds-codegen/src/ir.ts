import { buildDesignBindings, type DesignBindingIR } from './design-properties.js';
import { buildInteractionIR, type InteractionIR, type ActivationIR } from "./interaction.js";
/**
 * Component IR: the framework-neutral derivation of a validated contract.
 *
 * The IR is built once per contract by `buildComponentIR`. Emitters consume
 * the IR rather than the raw contract so that:
 *
 *   1. Per-target code stays free of contract field interpretation; adding
 *      Vue/Lit/Svelte does not require duplicating semantics like "which
 *      props become BEM value modifiers" or "which role is implicit on the
 *      chosen root element".
 *   2. Diagnostics (e.g. unresolved type references) are computed in one
 *      place and surfaced to the CLI, not buried in target-specific output.
 *   3. CSS, class recipes, and a11y facts are stable across targets — only
 *      surface syntax differs.
 */

import type {
  ComponentContract,
  ContractChannel,
  ContractCollapseIntent,
  ContractDismissal,
  ContractDismissalTrigger,
  ContractDomNode,
  ContractValueMapBinding,
  ContractEventPayloadField,
  ContractContentTransform,
  ContractEventSignature,
  ContractFocus,
  ContractForm,
  ContractPartDetails,
  ContractPortal,
  ContractSurfaceAnchorRelation,
  ContractSurfaceCollision,
  ContractSurfaceDismissalMode,
  ContractSurfaceKind,
  ContractSurfaceModality,
  ContractSurfaceOpenTrigger,
  ContractSurfacePositioningStrategy,
  ContractSurfacePresence,
  ContractTypeDef,
  AuthoredPropType,
  StyledPropMember,
  StyleEntry,
  StylePlatform,
  TokenResolution,
  NormalizedStates,
} from "./contract.js";
import {
  getCssPrefix,
  getPartDetails,
  getParts,
  getPropMembers,
  normalizeStates,
} from "./contract.js";
import {
  IMPLICIT_ROLES_BY_ELEMENT,
  ROOT_ONLY_PARTS,
  SEMANTIC_ELEMENTS,
  getRootElement,
  resolveSurfaceAttachment,
  type SurfaceAttachment,
  isCompoundPart,
} from "./semantics.js";
import { resolveStyleProfile } from "./box-model.js";
import { resolveIdRelationships } from "./id-relationships.js";
import { tokenSlug } from "./token-path.js";
import { buildSequence, type SequenceIR } from "./sequence.js";
import { buildMotionCountdown, type MotionCountdownIR } from "./motion-countdown.js";
import { buildMotionLoops, type MotionLoopIR } from "./motion-loops.js";

// ---------------------------------------------------------------------------
// IR types
// ---------------------------------------------------------------------------

export interface PartIR {
  name: string;
  /** The HTML element this part maps to, when a known semantic is recognized. */
  semanticElement: string | undefined;
  /** True when the codegen treats this part as a separate sub-component. */
  isCompound: boolean;
  /** True only when `anatomy.details.<part>.subcomponent` opted in explicitly. */
  isExplicitSubcomponent?: true;
  /** True when the part is rendered only as part of the root render tree. */
  isRootOnly: boolean;
  /** Optional layout hint used by emitters for horizontal vs vertical stacks. */
  layoutVariant?: "horizontal" | "vertical";
  /**
   * Native HTML tag declared by the contract for this part. Derivation order:
   *
   *   1. `anatomy.details[name].tag` if present (primary authority).
   *   2. `anatomy.dom` node tag if the part appears in the dom tree
   *      (secondary; equality with details.tag is validated upstream).
   *   3. undefined — emitters fall back to `semanticElement` /
   *      `SEMANTIC_ELEMENTS` behavior.
   *
   * Emitters consult `nativeTag` when deciding whether to wrap a compound
   * subcomponent in Stack vs render the native tag directly. When the tag
   * is in `TABLE_COMPOSITION_TAGS` (table, thead, tbody, tfoot, tr, th, td,
   * caption), the subcomponent emits the native element directly:
   *   - React/Vue/Svelte: <tag className="...">{children}</tag>, no Stack.
   *   - Angular: attribute selector (e.g. tr[fsdsTableRow]); host element
   *     IS the native tag, supplied by the consumer's template.
   *   - Lit: NOT registered as a sub-element custom element (autonomous
   *     custom elements cannot be valid native table children); the root
   *     Lit class owns the full native template via shadow-DOM slots.
   *
   * An explicitly declared subcomponent also carries its non-`div` nativeTag
   * through Stack's polymorphic `as` input. Legacy name-classified compound
   * parts retain their established `semanticElement`; their contract tag did
   * not historically govern the wrapper and changing that is a separate
   * semantic migration with authored runtime witnesses of its own.
   */
  nativeTag?: string;
  /**
   * Bare component name (e.g. `"Input"`) when this part is realized as another
   * design-system component, derived from `anatomy.details[name].componentRef:
   * "fsds.<Name>"` (the `fsds.` prefix is stripped). When set, the part is
   * lowered by-reference: emitters import the referenced component and emit a
   * component-instance element rather than a native tag or Stack wrapper.
   * Mutually exclusive with `nativeTag` (the contract schema rejects a part
   * that declares both `tag` and `componentRef`).
   */
  componentRef?: string;
  /**
   * Per-part metadata copied verbatim from `contract.anatomy.details[name]`.
   * Emitters read `details.role`, `details.interactive`, `details.focusable`,
   * `details.aria` etc. to wire up compound-part behavior (e.g. Tabs's tab
   * registers with a context, panel renders conditionally, list hosts the
   * keyboard handler). Absent for components whose contract doesn't declare
   * per-part metadata.
   */
  details?: ContractPartDetails;
}

/**
 * Tags that participate in the HTML table content model. Subcomponents
 * whose `nativeTag` is in this set render the native element directly
 * (no Stack wrapper) per the table realization doctrine. Scoped
 * intentionally to the table set — extending to other native elements
 * (list/select/details) is a separate slice
 * (CODEGEN-NATIVE-LEAF-EXTENSION-LIST-01 etc.).
 *
 * Source fact: HTML5 table content model.
 * Applies by: tag (not component name).
 * Removable when: never (HTML spec constant).
 */
export const TABLE_COMPOSITION_TAGS: ReadonlySet<string> = new Set([
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
]);

/**
 * Native HTML attributes a table-composition *subcomponent* forwards onto the
 * element it owns, keyed by tag. The native-realization subcomponents that own
 * their element (React's `TableCell`, Vue's `TableCell.vue`, Svelte's
 * `TableCell.svelte`) do NOT extend an HTMLAttributes base or spread `...rest`,
 * so without this fact a consumer who needs `colspan`/`id`/`scope` is forced
 * back to raw `<table>` markup — the exact regression CODEGEN-TABLE-CELL-
 * ATTRIBUTES-01 / SHOWCASE-CONSUMPTION-03 close. Two families:
 *
 *   - Global (every table tag): `id`, `style`. `id` carries the CSS `:target`
 *     and aria anchoring a row needs (the TokensView token explorer highlights
 *     `tr:target`); `style` is the CSSOM escape hatch every HTML element takes.
 *   - Cell content-model: `th`/`td` carry `colSpan`/`rowSpan` (spanning); `th`
 *     additionally carries `scope` (header→cell association direction).
 *
 * The IR owns WHICH attributes a tag forwards (the durable HTML fact). Each
 * emitter lowers them to idiomatic prop names + types — React `colSpan?: number`
 * / `style?: CSSProperties` vs template `colspan` / `style?: string`. Keyed by
 * tag, never by component name: no per-component emitter lore. The other two
 * targets satisfy the same consumer capability *structurally* and so consult no
 * prop list — Angular's attribute directive sits on the consumer's own `<td>`
 * (native attrs pass through), and Lit's consumer authors raw light-DOM cells
 * projected through the shadow `<slot>`.
 *
 * Names are the JSX/camelCase spelling (`colSpan`, `rowSpan`); template emitters
 * map to the lowercase HTML attribute (`colspan`, `rowspan`) at the bind site.
 *
 * Source fact: HTML5 table content model + global HTML attributes.
 * Applies by: tag. Removable when: never (HTML spec constant).
 */
export type NativeTableAttr = "id" | "style" | "colSpan" | "rowSpan" | "scope";

export function nativeTableAttrsFor(tag: string | undefined): NativeTableAttr[] {
  if (tag === undefined || !TABLE_COMPOSITION_TAGS.has(tag)) return [];
  const attrs: NativeTableAttr[] = ["id", "style"];
  if (tag === "th" || tag === "td") attrs.push("colSpan", "rowSpan");
  if (tag === "th") attrs.push("scope");
  return attrs;
}

/**
 * Parsed binding expression. The contract author writes a string form
 * (`"prop:disabled"`, `"channel:checked.value"`, `"channel:checked.onChange"`,
 * `"iter:index"`, `"iter:item"`) which the IR builder normalizes into this
 * discriminated union so emitters don't reparse.
 *
 * `iterationLocal` carries the semantic *role* of the iteration variable —
 * either the loop index or the current item — not its emitted lexical name.
 * Emitters resolve the role to whatever `indexVar` / `itemVar` the enclosing
 * `IterationIR` declared (`index` by default; contract authors can override).
 * This is what stops the V1 grammar from lying about iteration locals: a
 * contract author who wrote `prop:index` was previously relying on the
 * emitter to silently decide whether `index` meant "the component prop named
 * index" or "the loop-callback parameter named index", with the answer
 * depending on whether the binding sat inside an iteration scope. With
 * `iterationLocal`, that resolution lives in the IR build, not in five
 * separately-duplicated emitter heuristics.
 *
 * `path` is an optional dotted projection appended to `prop`/`channel`/
 * `iterationLocal` roots, e.g. `"iter:item.value"` parses to
 * `{ kind: "iterationLocal", local: "item", path: ["value"] }`. The grammar
 * is bounded to object-field reads (BINDING-EXPRESSION-V2-PATH-01):
 *   - No transforms (`upper`, `length`, ...)
 *   - No comparisons (`===`, `==`)
 *   - No optional chaining (`?.`)
 *   - No array indexing (`[0]`)
 *   - No function calls (`()`)
 *   - No boolean / arithmetic expressions
 *   - No set-membership / contains predicates
 *   - No fallback expressions (`?? x`)
 * Each segment must match `[A-Za-z_$][\w$]*`. `literal:` carries no path.
 * Paths on `channel:` apply *after* the field, so the only well-formed
 * channel-with-path is `channel:X.value.<seg>(.<seg>)*` (paths on
 * `.onChange`/`.defaultValue` are syntactically rejected — they're
 * callbacks/defaults, not value-shaped reads).
 *
 * Out of scope this slice: `iterate.source` paths (the iteration root must
 * still be `prop:X` or `channel:X.value` with no tail).
 *
 * `predicate` is a closed boolean-shaped binding form
 * (BINDING-EXPRESSION-V2-PREDICATE-01). It carries an operator name and two
 * operand sub-expressions, each itself a value-shaped `BindingExpression`.
 * The grammar is *closed* — there is a finite set of operators, no
 * arbitrary JS, no nested predicates, no boolean composition. Operators:
 *
 *   - `eq(L, R)`         — `L === R`. Use when both operands are scalar.
 *   - `contains(C, I)`   — `C.includes(I)`. Use when `C` is array-shaped
 *                          and the comparison is set membership.
 *   - `memberOf(X, S)`   — adapts to `S`'s runtime shape:
 *                          `Array.isArray(S) ? S.includes(X) : X === S`.
 *                          Use when the channel/prop declares a `T | T[]`
 *                          union (e.g. Select's `value: string | string[]`).
 *
 * Predicates are only legal in boolean attribute-binding contexts in this
 * slice (the canonical witness is `aria-selected`). They are rejected in
 * `content`, `events`, and `iterate.source` — those positions consume
 * value-shaped expressions, not boolean ones. Predicates may not nest:
 * the operand positions must be value-shaped (`prop`, `channel`, `literal`,
 * `iterationLocal`), never another `predicate`. Boolean composition
 * (AND / OR / NOT) and arbitrary comparison operators are explicitly held
 * for a future grammar extension.
 *
 * `channelCall` is a closed *event-position* form
 * (FEAT-BINDING-CALL-WITH-ARG-01). It carries a channel name and ONE
 * argument sub-expression, and lowers to an invocation of that channel's
 * setter/onChange WITH the argument:
 *
 *   channel:selection.onChange(iter:item.value)  →  () => setSelection(item.value)
 *
 * This is the one form that closes the "wire an event to a setter WITH a
 * per-item payload" gap the bare `channel:X.onChange` (no-arg) form could
 * not express — the non-boolean channel-click synthesis previously emitted
 * a self-assignment no-op `() => setSelection(selection)`. The grammar stays
 * *closed*: the argument position admits ONLY value-shaped payload kinds
 * (`iterationLocal` — with an optional object-field path like
 * `iter:item.value`, `prop` — with an optional path, or `literal`). It
 * rejects `channel`, `predicate`, `conditional`, and a nested `channelCall`
 * — there is no arbitrary-expression escape hatch. `channelCall` is legal
 * ONLY in `events` positions (it produces a `() => …` handler, not a value);
 * it is rejected in `bindings`, `properties`, `content`, `iterate.source`,
 * and `cssVariableBindings`, and may not appear as a predicate/conditional
 * operand.
 *
 * `channelUpdate` is a closed *event-position* form
 * (FEAT-CHANNEL-UPDATE-OPERATIONS-01). It closes the gap `channelCall`
 * could not: interactions whose NEXT channel value composes the CURRENT
 * value with an event payload or an iteration local — a single-argument
 * replace is not enough. Syntax:
 *
 *   channel:X.onChange:<op>(<operand>, …)
 *
 * where `<op>` is drawn from a CLOSED, finite vocabulary of NAMED update
 * operations with fixed semantics (`BindingUpdateOp`). There is
 * deliberately NO expression language and NO escape hatch: an operation is
 * admitted ONLY because a corpus consumer needs it, and each operand is a
 * value-shaped payload (`iterationLocal`, `prop`, `literal`) — never a
 * channel, predicate, conditional, or nested call. The two operations:
 *
 *   - `setCharAt(<index>)` — string channel. Sets the character at
 *     `<index>` (an iteration local, e.g. `iter:index`) to the LAST
 *     character of the native input event's payload (`e.target.value`),
 *     preserving every other position:
 *       next = value.slice(0, i) + char + value.slice(i + 1)
 *     Witness: OTP per-field entry (`channel:value.onChange:setCharAt(iter:index)`).
 *     Non-claim: multi-character paste distribution across fields is OUT of
 *     scope — a field briefly holding >1 char takes only the last character.
 *
 *   - `toggleMembership(<member>, <modeGate>)` — array-capable channel
 *     (valueType declares a `T[]` arm, e.g. Select's `string | string[]`).
 *     `<modeGate>` is a boolean prop: when FALSE the operation REPLACES
 *     (single-select semantics, byte-behaviourally identical to the prior
 *     `channelCall` replace); when TRUE it toggles `<member>`'s membership
 *     in the selection array (add if absent, remove if present):
 *       next = isMulti
 *         ? (arr.includes(m) ? arr.filter(x => x !== m) : [...arr, m])
 *         : m
 *     Witness: Select multiple mode
 *     (`channel:selection.onChange:toggleMembership(iter:item.value, prop:multiple)`).
 *     The mode dispatch lives in the operation lowering, keyed on the
 *     contract-authored `<modeGate>` prop — NOT on a component-name literal
 *     in any emitter.
 *
 * Like `channelCall`, `channelUpdate` is legal ONLY in `events` positions
 * (it produces a `() => …` handler). Every emitter lowers it to a
 * synthesized in-component helper (the `usesMemberOf` / count-iteration
 * precedent) invoked from the wire — the composed next value is computed and
 * passed through the SAME canonical channel setter the other wires use,
 * never a direct write to internal state. Adding a third operation requires
 * extending `BindingUpdateOp`, the parser arity/type checks, and the helper
 * synthesis in all five emitters — the grammar is the contract.
 */
export type BindingExpression =
  | { kind: "prop"; prop: string; path?: string[] }
  | { kind: "channel"; channel: string; field: "value" | "onChange" | "defaultValue"; path?: string[] }
  | { kind: "literal"; value: string }
  | { kind: "iterationLocal"; local: "index" | "item"; path?: string[] }
  | {
      /** Closed, value-shaped projection over a binding source. */
      kind: "projection";
      op: "dateDayOfMonth";
      source: BindingExpression;
    }
  | {
      /** Labels of selected values in option order; unknown values use fallback. */
      kind: "projection";
      op: "selectionLabel";
      source: BindingExpression;
      selection: BindingExpression;
      fallback: BindingExpression;
    }
  | {
      /** Contract-authored literal projection, generic across components. */
      kind: "valueMap";
      source: BindingExpression;
      values: Record<string, string>;
      fallback?: string;
    }
  | {
      kind: "conditional";
      condition: BindingExpression;
      whenTrue: BindingExpression;
      whenFalse: BindingExpression;
    }
  | {
      kind: "predicate";
      op: BindingPredicateOp;
      left: BindingExpression;
      right: BindingExpression;
    }
  | {
      kind: "channelCall";
      channel: string;
      /**
       * The setter/onChange invocation argument. Restricted at parse time to
       * value-shaped payload kinds (`iterationLocal`, `prop`, `literal`) — a
       * closed argument grammar with no escape hatch. Never `channel`,
       * `predicate`, `conditional`, or a nested `channelCall`.
       */
      arg: BindingExpression;
    }
  | {
      /**
       * FEAT-CHANNEL-UPDATE-OPERATIONS-01. A named, closed-vocabulary update
       * operation that composes the channel's CURRENT value with an event
       * payload / iteration local. Event-position only.
       */
      kind: "channelUpdate";
      channel: string;
      op: BindingUpdateOp;
      /**
       * Operation operands, each a value-shaped payload kind
       * (`iterationLocal`, `prop`, `literal`) — same closed set as a
       * `channelCall` argument. Arity and per-operand meaning are fixed by
       * `op`: `setCharAt` takes `[index]`; `toggleMembership` takes
       * `[member, modeGate]`.
       */
      operands: BindingExpression[];
    };

/**
 * The `prop`-kind member of `BindingExpression`. Directives that admit only
 * bare prop references (content-transform inputs, `iconGlyph` fields) are
 * typed with this extraction so accessing `.prop`/`.path` needs no further
 * narrowing — the parser already guarantees the kind at construction time.
 */
export type PropBindingExpression = Extract<BindingExpression, { kind: "prop" }>;

/** Lower a normalized value map once a backend has rendered its source. */
export function composeValueMapExpression(
  binding: Extract<BindingExpression, { kind: "valueMap" }>,
  sourceExpression: string,
  renderLiteral: (value: string) => string = JSON.stringify,
): string {
  const entries = Object.entries(binding.values);
  if (entries.length === 0) {
    return binding.fallback === undefined
      ? '""'
      : renderLiteral(binding.fallback);
  }
  const fallback = binding.fallback;
  const hasFallback = fallback !== undefined;
  const terminal = fallback !== undefined
    ? renderLiteral(fallback)
    : renderLiteral(entries[entries.length - 1][1]);
  const cases = hasFallback ? entries : entries.slice(0, -1);
  return cases.reduceRight(
    (otherwise, [sourceValue, targetValue]) =>
      `(${sourceExpression} === ${renderLiteral(sourceValue)} ? ` +
      `${renderLiteral(targetValue)} : ${otherwise})`,
    terminal,
  );
}

/** Lower the closed projection vocabulary after a backend renders its source. */
export function composeBindingProjectionExpression(
  op: Extract<BindingExpression, { kind: "projection" }>['op'],
  sourceExpression: string,
  selectionExpression?: string,
  fallbackExpression?: string,
): string {
  switch (op) {
    case "selectionLabel":
      if (selectionExpression === undefined || fallbackExpression === undefined) {
        throw new Error("selectionLabel requires selection and fallback operands");
      }
      return `((${sourceExpression} || []).filter(option => (Array.isArray(${selectionExpression}) ? ${selectionExpression} : [${selectionExpression}]).includes(option.value)).map(option => option.label).join(', ') || ${fallbackExpression})`;
    case "dateDayOfMonth":
      return `${sourceExpression}.getDate()`;
  }
}

/**
 * Closed set of named channel-update operations
 * (FEAT-CHANNEL-UPDATE-OPERATIONS-01). Each has fixed semantics documented
 * on the `BindingExpression` doctrine comment above and is admitted only
 * because a corpus consumer needs it. Adding one requires extending this
 * union AND the parser arity/type checks AND the helper synthesis in every
 * emitter — there is no arbitrary-expression escape hatch.
 *
 *   - `setCharAt`        — string channel; set char at an index to the last
 *                          char of the native input payload (OTP).
 *   - `toggleMembership` — array-capable channel; mode-gated replace-or-toggle
 *                          of a member value (Select multiple).
 */
export type BindingUpdateOp = "setCharAt" | "toggleMembership";

/**
 * Closed set of predicate operators (BINDING-EXPRESSION-V2-PREDICATE-01).
 * Adding a new operator requires extending this type AND the lowering in
 * every framework emitter. There is intentionally no escape hatch for
 * arbitrary expressions — the grammar is the contract.
 */
export type BindingPredicateOp = "eq" | "contains" | "memberOf";

/**
 * Iteration directive on a `DomNodeIR`. Resolved from the contract's
 * `anatomy.dom[].iterate` block. When set on a node, framework emitters
 * render that node and its subtree N times — once per item (kind=array) or
 * N copies (kind=count).
 *
 * `indexVar` and `itemVar` name render-context variables that nested
 * `bindings`/`attrs`/`content` expressions can reference via the
 * `iterationLocal` binding kind. Contract authors do not name the variables
 * directly in their bindings — they write `iter:index` / `iter:item` and the
 * IR resolves the role to whichever lexical name this iteration declared.
 */
export interface IterationIR {
  kind: "count" | "array";
  /** Always normalized to `{ kind: "prop" }`; the source-prop name is on `sourceProp`. */
  source: BindingExpression;
  /** Extracted prop name (mirror of `source.prop`) for fast emitter access. */
  sourceProp: string;
  /** Render-context variable name for the zero-based loop index. */
  indexVar: string;
  /** Render-context variable name for the current item (kind="array" only). */
  itemVar?: string;
  /** TypeScript type of each item (kind="array" only). */
  itemType?: string;
}

/**
 * Icon-catalog glyph directive on an `svg` DomNodeIR. Resolved from the
 * contract's `anatomy.dom[].iconGlyph` block.
 *
 * Emitters lower this to: import `resolveIcon` from
 * `@full-stack-ds/iconography` (a real package specifier, not a relative
 * path), resolve the glyph from the bound name/size props, stamp
 * `data-fsds-icon="<name>"` + the resolved `viewBox`/`width`/`height` on the
 * svg, and render one `<path>` element per glyph path record. When the
 * catalog lookup misses, the svg is not rendered at all.
 *
 * This is deliberately NOT an `IterationIR`: iteration sources are
 * schema-restricted to bare `prop:`/`channel:` bindings, and a catalog
 * lookup keyed by a prop value is a different fact — adding a lookup form
 * to the iteration grammar would open the escape hatch the binding grammar
 * intentionally lacks.
 */
export interface IconGlyphIR {
  /** Always `{ kind: "prop" }`; the prop carrying the canonical icon name. */
  nameFrom: BindingExpression;
  /** Extracted prop name (mirror of `nameFrom.prop`) for fast emitter access. */
  namePropName: string;
  /** Always `{ kind: "prop" }` when present; the prop carrying the requested size. */
  sizeFrom: BindingExpression | undefined;
  /** Extracted prop name (mirror of `sizeFrom.prop`). */
  sizePropName: string | undefined;
  /**
   * Map from size-prop enum values to pixel sizes (e.g. `{ sm: 16, md: 20 }`).
   * When present, emitters map the size prop through it; when absent, the
   * size prop's value is used as a pixel number directly.
   */
  sizeHints: Record<string, number> | undefined;
}

/**
 * Content-transform directive on a DomNodeIR (FEAT-CODEBLOCK-HIGHLIGHT-01).
 * Resolved from the object form of the contract's `anatomy.dom[].content`
 * field. The node's inner content is PRODUCED by the named transform
 * applied to a source prop — it is not the projection of a binding.
 *
 * One transform is admitted today:
 *
 *   - `highlight` — splits the source string into syntax tokens with the
 *     shared pure tokenizer (emitted byte-identical into every web
 *     framework package at `primitives/highlight/tokenize.ts`) and renders
 *     one span per token carrying the `tokenPart` part class plus a
 *     `data-token="<kind>"` attribute. Token spans hold TEXT children only,
 *     so the source is never interpreted as markup. When `gate` is present
 *     and falsy the node degrades to a single plain text run of the source
 *     binding. Targets that do not realize the transform (non-web) degrade
 *     to plain rendering of the source binding.
 *
 * Emitters lower this fact generically — branching on the host component's
 * name is forbidden (the no-component-name-lore doctrine). Adding a second
 * transform requires extending the contract schema's closed set, this IR
 * type, and every emitter's lowering.
 */
export interface HighlightTransformIR {
  /** Transform name; closed set (schema-enforced). */
  transform: "highlight";
  /** Always `{ kind: "prop" }`; the string prop carrying the literal source text. */
  source: PropBindingExpression;
  /** Extracted prop name (mirror of `source.prop`) for fast emitter access. */
  sourceProp: string;
  /** Always `{ kind: "prop" }`; the string prop carrying the declared language. */
  language: PropBindingExpression;
  /** Extracted prop name (mirror of `language.prop`). */
  languageProp: string;
  /**
   * Always `{ kind: "prop" }` when present; the boolean prop enabling the
   * transform. Undefined means the transform is unconditional.
   */
  gate: PropBindingExpression | undefined;
  /** Extracted prop name (mirror of `gate.prop`). */
  gateProp: string | undefined;
  /** anatomy.parts entry realized as one span per token (tag `span`, multiple). */
  tokenPart: string;
  /** Optional prop bindings for consumer tokens and line presentation. */
  tokens: PropBindingExpression | undefined;
  tokensProp: string | undefined;
  lineNumbers: PropBindingExpression | undefined;
  lineNumbersProp: string | undefined;
  linePart: string | undefined;
  gutterPart: string | undefined;
}

/**
 * Markdown content-transform fact (FEAT-MARKDOWN-CONTENT-TRANSFORM-01).
 * The node's content is the STRUCTURAL parse of the markdown source prop:
 * block elements and inline marks realized from the anatomy parts named in
 * `blockParts`/`markParts`. Closed vocabularies — every kind maps to a
 * declared part whose tag matches the kind's DOM contract (enforced in
 * `validateDomNode` via MARKDOWN_BLOCK_TAGS / MARKDOWN_MARK_TAGS). Text is
 * literal by construction; unsafe link hrefs degrade to literal text at
 * parse time. The second admitted transform is the grammar-generalization
 * proof: no emitter branches on a component name to lower either fact.
 */
export interface MarkdownTransformIR {
  transform: "markdown";
  /** Always `{ kind: "prop" }`; the string prop carrying the markdown source. */
  source: PropBindingExpression;
  /** Extracted prop name (mirror of `source.prop`). */
  sourceProp: string;
  /** Boolean enabling prop when declared; undefined means unconditional. */
  gate: PropBindingExpression | undefined;
  /** Extracted prop name (mirror of `gate.prop`). */
  gateProp: string | undefined;
  /** Block vocabulary — closed kind set to anatomy part names. */
  blockParts: MarkdownBlockParts;
  /** Inline-mark vocabulary — closed kind set to anatomy part names. */
  markParts: MarkdownMarkParts;
  /**
   * Realized element tag per block kind, resolved from anatomy details at
   * IR build — emitters consume IR facts only, never raw anatomy.
   */
  blockTags: Record<keyof MarkdownBlockParts, string>;
  /** Realized element tag per mark kind, resolved from anatomy details. */
  markTags: Record<keyof MarkdownMarkParts, string>;
}

/** Closed block vocabulary of the markdown transform (schema-enforced keys). */
export interface MarkdownBlockParts {
  heading: string;
  paragraph: string;
  unorderedList: string;
  orderedList: string;
  listItem: string;
  codeBlock: string;
  blockquote: string;
}

/** Closed inline-mark vocabulary of the markdown transform. */
export interface MarkdownMarkParts {
  emphasis: string;
  strong: string;
  code: string;
  link: string;
}

export type ContentTransformIR = HighlightTransformIR | MarkdownTransformIR;

/**
 * DOM contract of the markdown vocabularies: each kind's realized part must
 * carry one of its admitted tags. Framework-neutral fact — the markdown DOM
 * is part of the transform's contract, not per-emitter lore.
 */
export const MARKDOWN_BLOCK_TAGS: Readonly<
  Record<keyof MarkdownBlockParts, readonly string[]>
> = {
  heading: ["h1", "h2", "h3", "h4", "h5", "h6"],
  paragraph: ["p"],
  unorderedList: ["ul"],
  orderedList: ["ol"],
  listItem: ["li"],
  codeBlock: ["pre"],
  blockquote: ["blockquote"],
};

export const MARKDOWN_MARK_TAGS: Readonly<
  Record<keyof MarkdownMarkParts, readonly string[]>
> = {
  emphasis: ["em"],
  strong: ["strong"],
  code: ["code"],
  link: ["a"],
};

/** Type guard separating any transform fact from a plain content binding. */
export function isContentTransform(
  content: BindingExpression | ContentTransformIR | undefined,
): content is ContentTransformIR {
  if (content === undefined) return false;
  const transform = (content as ContentTransformIR).transform;
  return transform === "highlight" || transform === "markdown";
}

/** Narrow to the highlight transform (the tokenizer-backed inline form). */
export function isHighlightTransform(
  content: BindingExpression | ContentTransformIR | undefined,
): content is HighlightTransformIR {
  return content !== undefined && (content as ContentTransformIR).transform === "highlight";
}

/** Narrow to the markdown transform (the structural block form). */
export function isMarkdownTransform(
  content: BindingExpression | ContentTransformIR | undefined,
): content is MarkdownTransformIR {
  return content !== undefined && (content as ContentTransformIR).transform === "markdown";
}

/**
 * The binding a target renders when it does not realize a content
 * transform: the transform's source prop (plain text of the markdown or
 * code source), or the binding itself when it is not a transform. Shared
 * by every degrading target — one authority for the degradation rule.
 */
export function contentBindingOrTransformSource(
  content: BindingExpression | ContentTransformIR | undefined,
): BindingExpression | undefined {
  if (content === undefined) return undefined;
  return isContentTransform(content) ? content.source : content;
}

/**
 * Collect every content-transform fact in a dom tree (depth-first,
 * document order). Emitters use this to decide whether a shared
 * transform runtime must be imported — a component-level fact derived
 * from the tree, never from a component-name literal.
 */
export function collectContentTransforms(
  node: DomNodeIR | undefined,
): ContentTransformIR[] {
  const found: ContentTransformIR[] = [];
  const walk = (current: DomNodeIR): void => {
    if (isContentTransform(current.content)) found.push(current.content);
    for (const child of current.children) walk(child);
  };
  if (node) walk(node);
  return found;
}

/**
 * One CSS custom-property binding on a DOM node's runtime `style` attribute.
 * Authored under `anatomy.dom[].cssVariableBindings` in the contract:
 *   { "--fsds-progress-fill-width": "prop:value" }
 *
 * Names are validated against `^--fsds-<cssPrefix>(-[a-z0-9]+)+$` at
 * IR-build time. The contract-wide `cssPrefix` is derived from the
 * component name (see `getCssPrefix`) and namespaces design-system surface
 * away from consumer CSS variables.
 */
export interface CssVarBindingIR {
  /** Full CSS custom-property name, including the --fsds- prefix. */
  varName: string;
  /** Binding expression resolved from the prop:/channel:/literal: grammar. */
  value: BindingExpression;
}

/**
 * Condition gating an id reference (FEAT-A11Y-LABEL-ID-ASSOCIATION-01).
 * Resolved from a `relationships[].when` clause of the closed grammar
 * `<prop>=<value>` / `<prop>!=<value>`, or from the target node's own
 * `ifProp` render guard (an idref must never point at an element the same
 * guard removed from the tree).
 *
 * Lowering per op:
 *   - `truthy`: `<prop>` (from `=true`, or an ifProp guard); `negated`
 *     inverts (`!=true` / `=false`).
 *   - `eq`: `<prop> === "<value>"`; `negated` inverts (`!=`).
 */
export interface IdRefConditionIR {
  prop: string;
  op: "truthy" | "eq";
  /** Comparison literal — only for op "eq". */
  value?: string;
  negated: boolean;
}

/**
 * One id reference inside a generated idref attribute. `slug` names the
 * target anatomy part; every emitter derives the concrete id the same way it
 * derives the target element's `id` attribute (`${instanceId}-${slug}` where
 * instance ids are required, or a shadow-root-scoped literal in Lit), so the
 * reference and the id can never drift apart.
 */
export interface IdRefIR {
  slug: string;
  when?: IdRefConditionIR;
  /**
   * Named slot whose PRESENCE gates this ref — set when the target part's
   * semantic content is a consumer slot (TextField's label wrapper). An
   * idref to an empty naming element is worse than no idref (axe
   * `label-title-only`), so frameworks that can test slot presence emit
   * the ref conditionally: React `slots?.x`, Vue `$slots.x`, Svelte
   * snippet props (static), Lit via a runtime light-DOM query plus
   * @slotchange re-render. Angular cannot (projected-content presence is
   * not statically knowable) and emits unconditionally — no worse than
   * the pre-lowering state, documented divergence. ANDed with `when`
   * where both are set.
   */
  slotGate?: string;
}

/**
 * A generated idref attribute on a `from`-side relationship node
 * (FEAT-A11Y-LABEL-ID-ASSOCIATION-01). Lowered by every web emitter as the
 * space-joined list of each active ref's id, merged with the passthrough
 * prop when the contract also exposes a consumer-facing idref prop (e.g.
 * TextField's `ariaDescribedby`). An attribute whose refs are all inactive
 * and whose passthrough is unset must not be emitted at all (no empty
 * `aria-describedby=""`).
 */
export interface IdRefAttrIR {
  /** Attribute to emit: "for" | "aria-labelledby" | "aria-describedby". */
  attribute: string;
  refs: IdRefIR[];
  /** Consumer prop whose value is appended to the generated id list. */
  passthroughProp?: string;
}

/**
 * Field-association facts (FEAT-A11Y-LABEL-ID-ASSOCIATION-01) — the
 * cross-component mechanism behind a composer's `for`/`aria-describedby`
 * relationships whose target element is CONSUMER-SLOTTED (Field's control
 * slot). A `for` cannot point at the slot's wrapper div (labels must
 * reference a labelable element), so the composer instead PROVIDES the
 * generated control id + describedby ids through each framework's ambient
 * context idiom, and participating controls (contract `fieldAssociation:
 * "control"`) consume them onto their root element. Lit is excluded: its
 * components render into shadow roots and idrefs cannot cross the shadow
 * boundary, so no provider/consumer is emitted there.
 */
export interface FieldAssociationProviderIR {
  /** Slug of the slotted control's generated id (used by the label's `for`). */
  controlSlug: string;
  /** Ids delivered to the control's aria-describedby, each optionally gated. */
  describedBy: IdRefIR[];
}

export interface FieldAssociationIR {
  provides?: FieldAssociationProviderIR;
  /** Target part when this control consumes ambient field association. */
  consumerPart: string | undefined;
}

export interface FormControlIR {
  /** Rendered anatomy part that owns interaction and field association. */
  part: PartIR;
  /** Normalized controlled/uncontrolled value channel. */
  channel: NormalizedChannelIR;
  valueModel: "text" | "boolean";
  commit: "input" | "change" | "activation";
  /** Web DOM event derived from commit semantics and injected on `part`. */
  event: "input" | "change" | "click";
}

export interface CompositeControlIR {
  /** Repeated anatomy part instantiated by an enclosing iteration. */
  part: PartIR;
  channel: NormalizedChannelIR;
  interactionModel: "collection-selection" | "segmented-text";
  commit: "input" | "change" | "activation";
  event: "input" | "change" | "click";
  update: Extract<BindingExpression, { kind: "channelCall" | "channelUpdate" }>;
}

/**
 * Closed keyboard-realization vocabulary (FEAT-A11Y-COMPOSITE-KEYBOARD-01) —
 * mirrors `ContractKeyboardBehavior` from contract.ts.
 */
export type KeyboardActionOp =
  | "open"
  | "select"
  | "roving-next"
  | "roving-prev"
  | "roving-first"
  | "roving-last";

/**
 * One realized keyboard interaction (FEAT-A11Y-COMPOSITE-KEYBOARD-01),
 * derived from a structured `a11y.keyboard` entry that declares `behavior`.
 * Framework emitters bind a keydown realization on the `when` part's rendered
 * node and lower the op sequence from declared facts only. Entries without
 * `behavior` produce no fact — they are realized by native host semantics or
 * a behavior primitive.
 */
export interface KeyboardActionIR {
  /** Anatomy part whose rendered node hosts the keydown binding. */
  part: string;
  /** Declared key (e.g. `"ArrowDown"`). */
  key: string;
  /** Realization op. */
  op: KeyboardActionOp;
}

/**
 * A node in the rendered DOM tree, derived from `contract.anatomy.dom`.
 * Optional — components without a `dom` block on their contract continue to
 * emit single-root output. When present, framework component-source emitters
 * walk the tree and produce idiomatic output:
 *
 * - React: JSX (`<label className="..."><input onChange={...}/></label>`)
 * - Vue: SFC `<template>` with `@change="..."` and `<slot />`
 * - Svelte: `.svelte` block with `onchange={...}` and `{@render children?.()}`
 * - Angular: component template string with `(change)="..."` and `<ng-content>`
 * - Lit: tagged `html` template with `@change=${...}` and `<slot></slot>`
 *
 * Slot/children placement: `tag === "slot"` or `tag === "children"` marks the
 * node as an insertion point for consumer-provided content. Each framework chooses
 * its idiomatic representation.
 */
export interface DomNodeIR {
  /** Normalized host activation; emitters only lower framework syntax. */
  activation?: ActivationIR;
  /** Bind the rendered content host to the focus-scope behavior. */
  focusContainer?: boolean;
  /**
   * Keyboard realizations hosted on this node (FEAT-A11Y-COMPOSITE-KEYBOARD-01)
   * — attached post-build to the node whose `part` matches each action's
   * declared `when` scope. Emitters bind a keydown on this element and lower
   * each op from IR facts.
   */
  keyboardActions?: KeyboardActionIR[];
  /**
   * FEAT-A11Y-COMPOSITE-KEYBOARD-01: this node is the panel surface of a
   * keyboard `open` realization — the template binds the hook's `panelRef`
   * here so the post-open focus can query inside the revealed panel.
   */
  keyboardPanel?: boolean;
  /** Invoking host for a keyboard-open action; carries the return-focus ref. */
  keyboardAnchor?: boolean;
  /** HTML tag, or `"slot"`/`"children"` insertion point. */
  tag: string;
  /**
   * Bare component name (e.g. `"Button"`, `"Input"`) when this node renders
   * another design-system component by reference rather than a native tag.
   * Derived from the contract's `componentRef: "fsds.<Name>"` (the `fsds.`
   * prefix is stripped). When set, `tag` is the empty string and emitters
   * take the component-instance path: import the referenced component by
   * relative sibling path and emit `<Name .../>`. Undefined for native-tag
   * and slot/children nodes — the discriminator is `componentRef !== undefined`,
   * a fourth case alongside `tag === "slot" | "children" | <html>`.
   */
  componentRef: string | undefined;
  /**
   * Resolved by-reference composition fact. Present only when `componentRef`
   * is set AND the IR builder was given the contract corpus (`allContracts`).
   * Carries the target's resolved layer and each binding/attr already
   * CLASSIFIED against the target's prop surface, so emitters do last-mile
   * syntax only and never re-interpret the contract (normal-form property 4).
   * Undefined when the corpus was not supplied — emitters then fall back to
   * the bare-name path using the raw `bindings`/`attrs`/`events` fields.
   */
  componentInstance?: ComponentInstanceIR;
  /**
   * Named-slot identifier — only set when `tag === "slot"` and the contract
   * declared a `name` for the slot. Each framework emitter maps this to its
   * idiom (Vue/Lit `<slot name=...>`, React `slots.<name>`, etc.). Absent
   * means the slot is the default/unnamed slot.
   */
  slotName: string | undefined;
  /** Reference to `anatomy.parts` entry; emitters derive the `__part` BEM class. */
  part: string | undefined;
  /** Static attribute values (e.g. `{ type: "checkbox", "aria-hidden": "true" }`). */
  attrs: Record<string, string>;
  /**
   * Dynamic *attribute* bindings keyed by attribute name (`aria-label`,
   * `disabled`, `src`). Each emitter lowers to its attribute syntax.
   * Events and content are deliberately NOT mixed in here — see `events`
   * and `content` fields. The old practice of writing `bindings.onClick`
   * or `bindings.children` was never portable across all five emitters.
   */
  bindings: Record<string, BindingExpression>;
  /**
   * DOM-property-only bindings keyed by property name (`indeterminate`, ...).
   * For facts with no HTML attribute equivalent — a JS-only DOM property
   * that must be set imperatively (`el.indeterminate = true`), never via an
   * HTML attribute or any framework's template-attribute binding syntax.
   * Distinct from `bindings` for the same reason `events` is distinct: every
   * attribute-binding lowering writes an HTML attribute, which is the wrong
   * mechanism here. `bindings.indeterminate` hard-fails at IR-build,
   * redirecting authors here (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-
   * INDETERMINATE-01).
   */
  propertyBindings: Record<string, BindingExpression>;
  /**
   * Event bindings keyed by unprefixed event name (`click`, `input`,
   * `change`, ...). Emitters lower per framework idiom. Distinct from
   * attribute bindings because every framework spells events differently
   * (React `onX`, Vue `@x`, Svelte `on:x`, Angular `(x)`, Lit `@x`) and
   * because Angular's template parser actively rejects event-shaped
   * attribute bindings.
   */
  events: Record<string, BindingExpression>;
  /**
   * Single inner-content binding, or a content-transform directive. When a
   * binding, the element renders the resolved value as its content
   * (interpolation/expression, not a `children`-prop attribute). When a
   * transform, the element's content is PRODUCED by the named transform
   * applied to the source prop (see `ContentTransformIR`) — emitters lower
   * the fact generically and never branch on the host component's name.
   * Mutually exclusive with `children` on the same node — `parseDomNode`
   * rejects nodes that set both.
   */
  content: BindingExpression | ContentTransformIR | undefined;
  children: DomNodeIR[];
  /** Prop guard. `"children"` is special: renders only when consumer-provided children exist. */
  ifProp: string | undefined;
  /** When true, the guard fires when `ifProp` is FALSY (i.e. `if: "!src"`). Emitters render `!prop && ...`. */
  ifNegated: boolean;
  /**
   * Named-slot presence guard (`if: "slot:<name>"`): the node renders only
   * when the consumer fills that named slot. The named-slot sibling of
   * `ifProp: "children"`; the slot must sit inside the guarded subtree
   * (validated at IR build). `ifNegated` inverts it. Mutually exclusive
   * with `ifProp`.
   */
  ifSlot?: string;
  /**
   * Iteration directive. When set, the framework emitter wraps this node and
   * its subtree in its idiomatic iteration construct (React `Array.from(...).map`,
   * Vue `v-for`, Svelte `{#each}`, Angular `*ngFor`, Lit `repeat()`/`.map`).
   * `undefined` means render once (the default).
   */
  iteration: IterationIR | undefined;
  /**
   * CSS custom-property bindings. Empty array when no `cssVariableBindings`
   * block is authored on the contract node. Order preserved from the
   * contract for deterministic emission.
   */
  cssVarBindings: CssVarBindingIR[];
  /**
   * Icon-catalog glyph directive. When set (only legal on `tag: "svg"`),
   * the framework emitter renders this node's viewBox and `<path>` children
   * from the `@full-stack-ds/iconography` catalog, looked up at runtime by
   * the bound name/size props. `undefined` for every non-icon node.
   */
  iconGlyph: IconGlyphIR | undefined;
  /**
   * When set, this element carries a generated per-instance id
   * (`${instanceId}-${slug}`; shadow-root-scoped literal in Lit) because it
   * is the target of a lowered `relationships[]` idref
   * (FEAT-A11Y-LABEL-ID-ASSOCIATION-01). Set by `resolveIdRelationships`,
   * never authored directly.
   */
  generatedIdSlug: string | undefined;
  /**
   * Generated idref attributes for lowered `relationships[]` where this
   * element is the `from` side. Set by `resolveIdRelationships`. Empty for
   * nodes with no lowered relationships.
   */
  idRefAttrs: IdRefAttrIR[];
}

/**
 * How a binding/attr on a `componentRef` node reaches the referenced component,
 * decided ONCE in the IR by classifying against the target's prop surface.
 * Emitters read `kind` and pick syntax; they never re-derive this.
 *
 *  - `prop`: the target contract declares a matching prop → emit as a component
 *    prop (React `prop={}`, Vue `:prop`, Svelte `prop={}`, Angular `[prop]`,
 *    Lit `.prop=`, RN `prop={}`). `targetProp` is the resolved prop name.
 *  - `attribute`: no matching prop, but a valid host attribute (e.g. `data-*`)
 *    → pass through as an attribute on the underlying element (Angular
 *    `[attr.x]`, Lit `x=`, React/Vue/Svelte/RN as a literal-named prop/attr).
 */
export interface ResolvedRefBinding {
  kind: "prop" | "attribute";
  /** Resolved target prop name when `kind === "prop"` (e.g. "ariaLabel"). */
  targetProp?: string;
  /** Contract-authored source name (e.g. "aria-label", "data-id", "src"). */
  sourceAttr: string;
  /** The binding expression (absent for static attrs — see ResolvedRefAttr). */
  expr: BindingExpression;
}

/** A static attribute on a componentRef node, classified like a binding. */
export interface ResolvedRefAttr {
  kind: "prop" | "attribute";
  targetProp?: string;
  sourceAttr: string;
  value: string;
}

/** An event handler bound on a componentRef node. The IR resolves the event
 *  to the target's HANDLER PROP when the target declares one (e.g. event
 *  `click` → target prop `onClick`), so emitters that treat a component event
 *  as a prop (Svelte 5 `onClick={}`) target the right name. When the target
 *  declares no matching handler prop, `targetHandlerProp` is undefined and the
 *  emitter falls back to its DOM-event idiom (Vue/Lit `@click` listen on the
 *  element; React `onClick` passes through). */
export interface ResolvedRefEvent {
  /** Unprefixed event name (`click`, `change`). */
  name: string;
  /** The target's handler prop for this event (`onClick` for `click`), when
   *  the target contract declares it. Undefined otherwise. */
  targetHandlerProp?: string;
  expr: BindingExpression;
}

/**
 * Resolved by-reference composition fact (CODEGEN-RECURSIVE-COMPOSITION-01).
 * The IR's single source of truth for "this node renders component X" — what
 * every emitter consumes instead of re-deriving import + binding semantics.
 * Additive, modeled on `TokenFactIR`; the FIRST cross-contract fact in the IR.
 */
export interface ComponentInstanceIR {
  /** Bare referenced component name, e.g. "Image", "Button". */
  ref: string;
  /** Resolved layer of the target, from its contract (as-declared). */
  targetLayer: ComponentContract["layer"];
  /** Dynamic bindings, each classified against the target's prop surface. */
  bindings: ResolvedRefBinding[];
  /** Static attrs, each classified against the target's prop surface. */
  attrs: ResolvedRefAttr[];
  /** Event handlers — component callbacks, not prop-classified. */
  events: ResolvedRefEvent[];
}

/**
 * Framework-neutral prop type the IR owns and emitters LOWER (they must not
 * re-parse the legacy `type` string for migrated props). The authorable kinds
 * (mirrors `AuthoredPropType`): V1 — string/number/boolean/enum/node/ref; V2 —
 * callback/array/union/literal/void/promise. `fallback` is the normalization
 * escape hatch for legacy `styled` members (and genuinely anonymous object
 * types) whose TS-string type is not modeled — it is explicitly marked, never
 * silently treated as a clean neutral kind. See CODEGEN-PROP-TYPE-IR-PILOT-01
 * (V1) and CODEGEN-PROP-TYPE-IR-OBSERVED-TYPES-01 (V2).
 */
export type PropTypeIR = AuthoredPropType | { kind: "fallback"; raw: string };

export interface ResolvedPropIR {
  /** Original prop name as authored. */
  name: string;
  /** Identifier-safe name (kebab-case prop names get camelCased for binding). */
  safeName: string;
  /**
   * Canonical TypeScript type expression. For migrated props it is DERIVED from
   * `propType`; for legacy `styled` props it is the authored string. Retained so
   * back-compat consumers (import scanners, type-ref extraction, and not-yet-
   * migrated emitters) keep working unchanged during the migration.
   */
  type: string;
  /** Type alias names referenced by this prop's type expression. */
  typeRefs: string[];
  required: boolean;
  description?: string;
  /** Default literal as a code expression, e.g. `"primary"` or `false`. */
  defaultExpr?: string;
  nodeKind?: StyledPropMember["nodeKind"];
  /**
   * The framework-neutral type. Emitters migrated to PropTypeIR lower from this;
   * un-migrated emitters may still read `type` (kept canonical) until they move.
   */
  propType: PropTypeIR;
}

/**
 * Normalize an authored prop member into PropTypeIR: structured `propType` wins;
 * otherwise the legacy TS-string `type` becomes an explicit `fallback` (never a
 * silent clean kind — satisfies the "out-of-V1 is fallback/residual" invariant).
 */
export function normalizePropType(member: {
  propType?: AuthoredPropType;
  type?: string;
}): PropTypeIR {
  if (member.propType) return member.propType;
  return { kind: "fallback", raw: typeof member.type === "string" ? member.type : "unknown" };
}

/**
 * Derive the canonical TypeScript type string for a PropTypeIR.
 *
 * This is the SINGLE point where a structured propType becomes generated bytes:
 * `ResolvedPropIR.type` is set from this, every emitter lowers from that string,
 * and `extractTypeRefs` parses it for imports. So byte-identity of the migration
 * reduces to: this function reproduces the legacy authored type string exactly.
 * V2 kinds (callback/array/union/literal/void/promise) are lowered to match the
 * observed corpus signatures; `enum` emits DOUBLE-quoted unions to match the
 * generated-TS convention (the corpus has no single-quoted inline unions).
 */
export function canonicalTsType(pt: PropTypeIR): string {
  switch (pt.kind) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "enum":
      return pt.values.map((v) => JSON.stringify(v)).join(" | ");
    case "node":
      return "ReactNode";
    case "ref":
      return pt.to;
    case "fallback":
      return pt.raw;
    // --- V2 (observed-corpus extension) ---
    case "void":
      return "void";
    case "literal":
      return pt.value === null
        ? "null"
        : typeof pt.value === "string"
          ? JSON.stringify(pt.value)
          : String(pt.value);
    case "array":
      return `${parenForArrayItem(pt.items)}[]`;
    case "promise":
      return `Promise<${canonicalTsType(pt.of)}>`;
    case "callback":
      return `(${pt.params
        .map((p) => `${p.name}${p.optional ? "?" : ""}: ${canonicalTsType(p.type)}`)
        .join(", ")}) => ${canonicalTsType(pt.returns)}`;
    case "union":
      return pt.of.map((m) => parenForUnionMember(m)).join(" | ");
  }
}

/**
 * A union member that is a function type needs parens to bind correctly in a
 * union (`((x) => y) | z`), matching how such types are authored in the corpus.
 */
function parenForUnionMember(pt: PropTypeIR): string {
  const s = canonicalTsType(pt);
  return pt.kind === "callback" ? `(${s})` : s;
}

/**
 * An array element that is a union or function type needs parens before `[]`
 * (`(A | B)[]`, `((x) => y)[]`); simple element types do not.
 */
function parenForArrayItem(pt: PropTypeIR): string {
  const s = canonicalTsType(pt);
  return pt.kind === "union" || pt.kind === "callback" ? `(${s})` : s;
}

/** Back-compat nodeKind hint: from a structured `node` type, else the legacy field. */
function nodeKindForPropType(
  pt: PropTypeIR,
  legacy: StyledPropMember["nodeKind"],
): StyledPropMember["nodeKind"] {
  if (pt.kind === "node") return pt.of === "icon" ? "icon-ref" : "node-ref";
  return legacy;
}

/**
 * Class recipe: the purely declarative description of how prop values turn
 * into BEM modifier class names. Emitters convert this into framework syntax.
 */
export interface ClassRecipeIR {
  /** Always present; the root BEM class. */
  base: string;
  /**
   * Props whose *value* becomes the modifier suffix:
   *   class = `${base}--${valuePrefix}${value}` when `value` is truthy.
   *
   * `valuePrefix` is normally absent (the class is `${base}--${value}`). It is
   * set ONLY when the axis collides with another variant axis in the same
   * component — i.e. they share at least one value, so a bare `${base}--sm`
   * could not tell which axis it came from. For a colliding axis the prefix is
   * `${propName}-` (e.g. `size-`), making the class `${base}--size-${value}`,
   * which disambiguates it. Non-colliding axes leave `valuePrefix` undefined,
   * so their emitted bytes are unchanged. See `computeTaintedAxes`.
   */
  valueModifiers: Array<{
    propName: string;
    safeName: string;
    /** Default expression, copied from the resolved prop when present. */
    defaultExpr?: string;
    /**
     * `${propName}-` when this axis collides with another variant axis in the
     * same component; otherwise undefined (legacy `${base}--${value}` shape).
     */
    valuePrefix?: string;
  }>;
  /**
   * Props whose *presence* (truthy boolean) adds a fixed modifier class:
   *   class = `${base}--${propName}` when `propName` is truthy.
   */
  booleanModifiers: Array<{
    propName: string;
    safeName: string;
  }>;
}

export interface CssBlockIR {
  selector: string;
  declarations: Record<string, string>;
  /**
   * Non-declaration lines (e.g. token reference comments) emitted inside
   * the block, after declarations, in stable order.
   */
  comments?: string[];
}

export interface KeyframeIR {
  name: string;
  frames: Array<{
    selector: string;
    declarations: Record<string, string>;
  }>;
}

/**
 * Motion facts (RAIL-REDUCED-MOTION-01).
 *
 * `honorsReducedMotion` is OPT-OUT, not opt-in: it is true unless the contract
 * explicitly says `ignore`. Keying it on `reducedMotion === "respect"` was the
 * obvious reading and it is wrong, because it makes an accessibility baseline
 * depend on remembering to ask for it. The corpus shows what that costs — the
 * four components that animate hardest (Button, Details, Skeleton, Spinner)
 * declare no `motion` block at all, so an opt-in rule would leave every one of
 * them moving for a user who asked the OS for stillness, while the three that
 * happened to declare `respect` got covered. The schema already calls `ignore`
 * "strongly discouraged", which is the contract saying the default is to
 * honour; this encodes that rather than restating it in prose.
 *
 * `reducedMotion: null` means undeclared — kept distinct from `respect` so the
 * motion rail can tell "chose to honour" from "never said", even though both
 * lower identically.
 *
 * `transitions` is carried for the rail, NOT for emission — see
 * `ContractMotion` on why a `trigger` cannot be lowered yet.
 */
export interface MotionIR {
  sequence: SequenceIR | null;
  countdown: MotionCountdownIR | null;
  loops: MotionLoopIR[];
  honorsReducedMotion: boolean;
  reducedMotion: 'respect' | 'disable' | 'reduce' | 'ignore' | null;
  transitions: Array<{
    name: string;
    /** Authored text retained verbatim for migration/diagnostics; NOT a bound driver. */
    trigger: string | null;
    /** Status of this declaration, independent of animation authored in styles/keyframes. */
    realization: 'declaration-only';
    phase: 'enter' | 'exit' | 'move' | 'attention' | null;
    properties: string[];
    durationRef: string | null;
    easingRef: string | null;
  }>;
}

/**
 * A substrate-neutral typed token fact (FEAT-MOBILE-IR-001, Phase 0.2).
 *
 * Non-DOM emitters (SwiftUI, Compose, RN) need token VALUES, not CSS
 * declaration strings. Before this surface existed, the SwiftUI emitter mined
 * values out of `cssBlocks` declaration strings by regexing the `var(--ref,
 * 48px)` fallback (see the now-removed `findSizeToken`/`parsePxFallback`).
 * `tokenFacts` exposes the same data the contract's `tokens` sidecar already
 * carries, in typed form, so a consumer never parses CSS to learn a value.
 *
 * This is a pure projection of `contract.tokens`: no I/O, no clock, no
 * randomness, so regeneration stays byte-deterministic. It is purely
 * ADDITIVE — web emitters keep reading `cssBlocks`, so their output is
 * unchanged.
 */
export interface TokenFactIR {
  /** Slot path as authored in the sidecar, e.g. `switch.size.md.track.width`. */
  name: string;
  /** CSS custom-property name this slot renders to, e.g. `--fsds-switch-size-md-track-width`. */
  cssVar: string;
  /**
   * Coarse category derived from the slot PATH structure (the segment after
   * the component slug, e.g. `size`, `color`, `box-model`). Never derived from
   * the component name — `name.split(".")[1]` is path structure, not lore.
   */
  category: string;
  /** Token tier / provenance, defaulting to `semantic` per TokenResolution. */
  layer: "core" | "semantic" | "brand" | "density";
  /**
   * Source kind. Today only `tokens-sidecar`; recorded so a consumer never
   * has to assume where a fact came from (and so CSS is never treated as the
   * authority).
   */
  source: "tokens-sidecar";
  /** Dotted path into the global token graph this slot resolves to, when ref-backed. */
  resolvesTo?: string;
  /**
   * The concrete value when available — the `var()` fallback for ref-backed
   * slots, or the verbatim value for `literal` slots. This is the field that
   * replaces CSS-string mining (e.g. `"48px"`).
   */
  rawValue?: string;
  /** True when this slot is an intentional literal rather than a graph ref. */
  isLiteral: boolean;
}

/**
 * One component-local token definition at a scope. This is the typed
 * counterpart to `<Component>.tokens.css`: web lowers it to custom-property
 * declarations; native targets lower it to theme-resolved JS values.
 */
export interface TokenScopeValueIR {
  /** Component-local slot path, e.g. `switch.color.track.background`. */
  name: string;
  /** CSS custom-property name for the same slot, e.g. `--fsds-switch-color-track-background`. */
  cssVar: string;
  /** Selector whose scope owns this value in the web token artifact. */
  selector: string;
  /** Stable scope key for non-CSS consumers (`root`, `checked`, `size_sm`, etc.). */
  scope: string;
  layer: "core" | "semantic" | "brand" | "density";
  source: "tokens-sidecar" | "styles-sidecar";
  resolvesTo?: string;
  rawValue?: string;
  isLiteral: boolean;
}

export interface TokenScopeIR {
  selector: string;
  scope: string;
  values: TokenScopeValueIR[];
}

/** Platform-scoped root clipping. Unsupported requests survive normalization
 * so an emitter can reject them rather than treat them as absent.
 */
export type RootClippingIR = Partial<Record<StylePlatform,
  { mode: "visible" | "hidden" } | { mode: "unsupported"; declaration: string }
>>;

function buildRootClipping(contract: ComponentContract): RootClippingIR {
  const result: RootClippingIR = {};
  for (const platform of ["web", "ios", "android"] as const) {
    for (const property of ["overflow", "overflow-x", "overflow-y"]) {
      const entry = contract.styles?.root?.[property];
      if (!entry || (entry.platforms && !entry.platforms.includes(platform))) continue;
      const value = entry.literal?.trim();
      result[platform] = property === "overflow" && (value === "visible" || value === "hidden")
        ? { mode: value }
        : { mode: "unsupported", declaration: `${property}: ${entry.resolvesTo ?? value}` };
    }
  }
  return result;
}

/** Static root clipping support boundary for native consumers. */
export function nativeRootClipping(ir: ComponentIR, platform: "ios" | "android"): "visible" | "hidden" | undefined {
  const fact = ir.rootClipping[platform];
  if (fact?.mode === "unsupported") {
    throw new Error(`[NATIVE_ROOT_CLIPPING_UNSUPPORTED] ${ir.name} (${platform}) root ${fact.declaration}; supported: literal overflow visible or hidden`);
  }
  return fact?.mode;
}

export interface RootSemanticsIR {
  /** Resolved root HTML element for the component. */
  element: string;
  /** Role explicitly declared on the contract. */
  explicitRole: string | undefined;
  /** Role implied by the chosen root element (e.g. button -> "button"). */
  implicitRole: string | undefined;
  /**
   * The role emitters should render, after eliding implicit/none/compound.
   * `undefined` when no role attribute is needed.
   */
  effectiveRole: string | undefined;
  /**
   * Role attribute to synthesize on the rendered DOM root. This is narrower
   * than `effectiveRole`: when `anatomy.dom` already assigns that role to an
   * authored node (including an inner dialog panel), the authored node owns
   * it and this field is undefined so emitters cannot duplicate the role on
   * the outer layout host.
   */
  rootRole: string | undefined;
  /** Required labeling attributes from the contract. */
  labeling: string[];
  /** Keyboard interactions declared in the a11y block. */
  keyboard: NonNullable<ComponentContract["a11y"]>["keyboard"];
  /**
   * When set, the root tag is driven at runtime by a styled prop whose value
   * is one of the allowed HTML tag names. Derived when a styled prop's type
   * is a `union` alias and every value is a recognized HTML tag name (so
   * `as: "ul" | "ol" | "dl"` qualifies but `variant: "primary" | "ghost"`
   * does not).
   *
   * Emitters consume this to render a polymorphic root element (React:
   * `const RootTag = as ?? "<default>"; <RootTag>`; Vue: `<component :is>`;
   * etc.) instead of a hardcoded tag from `element`.
   */
  polymorphicTagProp:
    | {
        /** Styled prop name driving the root tag. */
        propName: string;
        /** HTML tags allowed by the prop's union type. */
        allowedTags: string[];
        /** Default tag (from `element`) used when the prop is undefined. */
        defaultTag: string;
      }
    | undefined;
}

export interface UnresolvedTypeRefIR {
  /** The unknown type identifier referenced by a prop. */
  ref: string;
  /** Comma-separated prop names that reference this type. */
  fromProps: string[];
}

/**
 * One ARIA-obligation gap acknowledged by the contract via
 * `a11y.obligations.suppress`. Carried on the IR so downstream tooling
 * (admission rail, doc generator, future audit pipelines) can inspect
 * the gap without re-parsing the contract.
 *
 * A11Y-CONTRACT-OBLIGATION-VALIDATOR-01: the obligation walker throws
 * when it finds a static role with a missing required ARIA attribute
 * AND no matching suppression entry. When a matching suppression is
 * found, the entry is recorded here instead — the IR builds normally,
 * but the gap remains visible.
 */
export interface A11yObligationIR {
  /** ARIA role from the offending DOM node (matched against the obligation table). */
  role: string;
  /** Required attribute that was not provided as a static attr or binding. */
  attr: string;
  /** The contract author's documented reason for the suppression. */
  reason: string;
  /** Part name (from anatomy.parts), if the offending node carries one. */
  part: string | undefined;
}

/**
 * One controlled/uncontrolled prop trio (value/defaultValue/onChange).
 * Hook generators map each channel to a `useControllableState` call.
 */
export interface NormalizedChannelIR {
  /** Logical channel name (`value`, `open`, `selected`, …). */
  name: string;
  /** Prop carrying the controlled value. */
  valueProp: string;
  /** Prop carrying the uncontrolled initial value, when present. */
  defaultValueProp?: string;
  /** Prop carrying the change handler. */
  changeHandlerProp: string;
  /** Short cross-language type for the channel value. */
  valueType?: string;
  /** Sibling prop that gates the channel (truthy = enabled). */
  enabledByProp?: string;
  description?: string;
  /**
   * Whether the change handler receives a plain value or a DOM event.
   *
   * - `"value"` (default): handler signature is `(value: T) => void`. Each
   *   framework idiomatically wraps native events to extract the value
   *   (e.g. `event.target.checked` for checkboxes) before invoking the
   *   handler. This keeps the contract framework-neutral.
   * - `"event"`: handler signature carries a framework-native event. Use
   *   only when the consumer genuinely needs the event object itself.
   *
   * Sourced from `ContractChannel.callbackKind`; defaults to `"value"`.
   * The IR no longer infers this from React/DOM type-name patterns —
   * see `resolveCallbackKind`.
   */
  callbackKind: "value" | "event";
  /**
   * True when this channel controls visibility / open-closed state of an
   * overlay or disclosure surface (dialog, popover, drawer, accordion
   * panel, …). Disclosure channels are what drive `useAnchorToggle`,
   * dismissal wiring, scroll lock, and similar overlay behavior in every
   * framework emitter.
   *
   * Derived structurally at IR build time: a channel is a disclosure
   * channel iff its `valueType === "boolean"` OR its contract name is
   * `"open"`. The rule lives in the IR so emitters do not each maintain
   * the same `c.name === "open"` string predicate (which historically
   * leaked the same channel-name lore across five framework files).
   */
  isDisclosureChannel: boolean;
  /**
   * Priority for ranking disclosure channels when more than one exists.
   * Lower = higher priority. Used by emitters to pick the "primary"
   * disclosure channel for anchor-toggle / dismissal wiring.
   *
   *   0 — channel named `"open"`
   *   1 — channel named `"expanded"`
   *   2 — any other disclosure channel
   *   Number.MAX_SAFE_INTEGER — non-disclosure channels
   *
   * The IR also exposes a precomputed `primaryDisclosureChannel` on
   * `BehaviorIR` so emitters do not have to sort or filter themselves.
   */
  disclosurePriority: number;
}

/**
 * One dismissal trigger (e.g. Escape closes the panel) plus the prop that
 * gates it. Hook generators iterate this to wire keydown/click listeners.
 */
export interface NormalizedDismissalTriggerIR {
  event: ContractDismissalTrigger["event"];
  /** Prop name controlling whether the trigger is active. */
  enabledByProp?: string;
  defaultEnabled: boolean;
  /**
   * Anatomy part that owns this trigger's interaction. Required for
   * `overlayClick` (validated against the dom tree): the dismissal click
   * binds on this element because the root is pointer-events:none under a
   * full-cover overlay and can never be the hit target.
   */
  targetPart?: string;
  description?: string;
}

/**
 * One emitted event signature (independent of the prop name(s) that fire it).
 * Hook generators expose these in the returned getter object.
 */
export interface NormalizedEventIR {
  /** Event name (not prop name) — `change`, `open`, `dismiss`, etc. */
  name: string;
  /** Prop names that emit this event. */
  emittedViaProps: string[];
  payload: ContractEventPayloadField[];
  returns?: string;
  cancelable: boolean;
  triggeredByActions: string[];
  description?: string;
}

export interface BehaviorIR {
  /** Channels keyed by name (raw contract data, kept for reference). */
  channels: Record<string, ContractChannel> | undefined;
  /** Events keyed by name (raw contract data, kept for reference). */
  events: Record<string, ContractEventSignature> | undefined;
  stateMachine: ComponentContract["stateMachine"];
  form: ContractForm | undefined;
  focus: ContractFocus | undefined;
  portal: ContractPortal | undefined;
  dismissal: ContractDismissal | undefined;
  relationships: ComponentContract["relationships"];

  /** Normalized channel trios for direct use by hook generators. */
  normalizedChannels: NormalizedChannelIR[];
  /**
   * Precomputed primary disclosure channel for overlay/anchor/dismissal
   * wiring (priority: `open` → `expanded` → first other disclosure
   * channel). Emitters read this instead of filtering channels by
   * `c.name === "open"` themselves. Undefined when no disclosure channel
   * is declared.
   */
  primaryDisclosureChannel: NormalizedChannelIR | undefined;
  /** Normalized dismissal triggers, with prop names already resolved. */
  normalizedDismissalTriggers: NormalizedDismissalTriggerIR[];
  /** Normalized event signatures. */
  normalizedEvents: NormalizedEventIR[];
}

/**
 * IR for the presence-surface family (see docs/architecture/presence-surfaces.md).
 * Built only when `contract.surface` is present. Resolves the
 * `anchor.part` and `content.part` strings against `PartIR[]` so
 * emitters do not re-resolve. Validates that the referenced parts'
 * `details.role` matches the surface contract's expectations
 * ('trigger' for anchor; one of 'content' | 'region' | 'overlay'
 * for content).
 */
export interface SurfaceAnchorIR {
  /** Resolved PartIR — caller already validated details.role === 'trigger'. */
  part: PartIR;
  relation: ContractSurfaceAnchorRelation;
}

/**
 * Selector-sourced anchor (coachmark / guided tour): the anchor element is
 * an arbitrary page element resolved at runtime via a CSS selector carried
 * in an array-typed prop, indexed by a channel's value (Walkthrough's
 * steps[].anchor keyed by the step channel). Kept as a separate SurfaceIR
 * field rather than widening SurfaceAnchorIR into a union so the compound
 * trigger/content surface emitters (which read anchor.part / anchor.relation)
 * stay untouched. buildSurfaceIR validates the prop exists and is
 * array-typed and the channel exists — emitters consume names only.
 */
export interface SurfaceSelectorAnchorIR {
  /** Name of the array-typed prop carrying the anchor selectors. */
  prop: string;
  /** Member of each array element holding the CSS selector string. */
  path: string;
  /** Channel whose numeric value indexes the active array element. */
  indexChannel: string;
}

export interface SurfaceContentIR {
  /** Resolved PartIR — caller already validated details.role is one of
   * 'content' | 'region' | 'overlay'. */
  part: PartIR;
  interactive: boolean;
}

export interface SurfacePositioningIR {
  strategy: ContractSurfacePositioningStrategy;
  placementProp: string | undefined;
  collision: ContractSurfaceCollision | undefined;
}

export interface SurfaceTimingIR {
  openDelayProp: string | undefined;
  closeDelayProp: string | undefined;
  autoDismissProp: string | undefined;
}

export interface SurfaceModalityGateIR {
  prop: string;
  /** The prop's contract default: the modality when the consumer omits it. */
  defaultModal: boolean;
}

export interface SurfaceIR {
  kind: ContractSurfaceKind;
  presence: ContractSurfacePresence;
  modality: ContractSurfaceModality;
  /** Boolean prop that makes a blocking surface non-blocking when false
   * (validated fail-loud in buildSurfaceIR). Hook emitters AND it into the
   * focus-trap and scroll-lock activity. */
  modalityGate: SurfaceModalityGateIR | undefined;
  /** Axis-derived attachment target used to select shared surface machinery. */
  attachment: SurfaceAttachment;
  anchor: SurfaceAnchorIR | undefined;
  /** Selector-sourced anchor — mutually exclusive with `anchor` (validated
   * fail-loud in buildSurfaceIR). */
  selectorAnchor: SurfaceSelectorAnchorIR | undefined;
  content: SurfaceContentIR | undefined;
  positioning: SurfacePositioningIR | undefined;
  /** Semantic dismissal mode list — composes with BehaviorIR's
   * normalizedDismissalTriggers (which carries enabledBy prop wiring). */
  dismissal: ContractSurfaceDismissalMode[];
  /**
   * Anchor-element interactions that open the surface. Always an array
   * (possibly empty for non-anchored surfaces). Validated fail-loud in
   * buildSurfaceIR: anchored surfaces and tooltips must declare at least
   * one trigger; non-anchored surfaces may omit.
   */
  openTriggers: ContractSurfaceOpenTrigger[];
  timing: SurfaceTimingIR | undefined;
}

/**
 * Target-neutral text-overflow intent (built only when `contract.textOverflow`
 * is present). Distinct from the DOM realization: web targets additionally
 * lower line-clamp through the existing anatomy.dom cssVariableBindings
 * mechanism — both coexist. `line` is the same `prop:<name>` binding a
 * cssVariableBindings entry already reads, parsed once here so consumers get
 * a typed BindingExpression instead of re-parsing the raw string.
 */
export interface TextOverflowIR {
  kind: "line-clamp";
  line: BindingExpression;
}

export interface ComponentIR {
  /** Identity */
  name: string;
  cssPrefix: string;

  /** Anatomy */
  parts: PartIR[];
  /** Convenience: parts that emit as separate sub-components. */
  compoundParts: PartIR[];

  /** Props / types */
  styledProps: ResolvedPropIR[];
  definedTypes: Record<string, ContractTypeDef>;
  unresolvedTypeRefs: UnresolvedTypeRefIR[];

  /**
   * ARIA-obligation gaps acknowledged via `a11y.obligations.suppress`.
   * Each entry is point-in-time evidence that a static role in
   * `anatomy.dom` carries a known-missing required attribute. Unmet
   * obligations WITHOUT a matching suppression entry throw at IR-build;
   * suppressed ones land here. A11Y-CONTRACT-OBLIGATION-VALIDATOR-01.
   */
  unresolvedA11yObligations: A11yObligationIR[];

  /** Variants and states */
  variants: Record<string, string[]>;
  states: NormalizedStates;

  /** Computed BEM class recipe. */
  classRecipe: ClassRecipeIR;

  /** Root semantics + a11y facts. */
  root: RootSemanticsIR;

  /** CSS facts (target-neutral). */
  cssBlocks: CssBlockIR[];
  rootClipping: RootClippingIR;
  keyframes: KeyframeIR[];

  /**
   * Motion facts. Always present — `reducedMotion: null` distinguishes
   * "declared nothing" from "declared respect"; both honour by default.
   */
  motion: MotionIR;

  /**
   * Typed token facts (FEAT-MOBILE-IR-001). Substrate-neutral projection of
   * `contract.tokens` so non-DOM emitters read token values without parsing
   * CSS. Additive — web emitters ignore this and read `cssBlocks`.
   */
  tokenFacts: TokenFactIR[];
  designBindings: DesignBindingIR[];

  /**
   * Component-local token scopes as typed data. This mirrors the web
   * `<Component>.tokens.css` artifact without requiring native targets to
   * inspect CSS text or selector syntax.
   */
  tokenScopes: TokenScopeIR[];

  /** Higher-level behavior metadata. Emitters can ignore for now. */
  behavior: BehaviorIR;

  /**
   * Presence-surface IR — present only when `contract.surface` is set
   * (see docs/architecture/presence-surfaces.md). Emitters MUST NOT read this in
   * Phase F-1; the field is plumbed for forward compatibility and is
   * consumed starting with Phase F-2 (Tooltip migration).
   */
  surface: SurfaceIR | undefined;

  /** Value channel, invoking hosts and content presence relationship. */
  interaction?: InteractionIR;
  /** Interactive control capability, independent of native form submission. */
  formControl: FormControlIR | undefined;

  /** Repeated-item interaction capability with iteration-aware updates. */
  compositeControl: CompositeControlIR | undefined;

  /**
   * Realized keyboard interactions (FEAT-A11Y-COMPOSITE-KEYBOARD-01) —
   * structured `a11y.keyboard` entries carrying the closed `behavior`
   * vocabulary, fact-validated at IR build. Empty for contracts whose
   * keyboard declarations are all realized natively or by primitives.
   */
  keyboardActions: KeyboardActionIR[];

  /**
   * Target-neutral text-overflow intent — present only when
   * `contract.textOverflow` is set. Additive: existing DOM cssVariableBindings
   * line-clamp realization (ShowMore/Truncate `--fsds-*-content-max-lines`)
   * is unchanged and coexists with this fact; emitters are not required to
   * consume it yet (CODEGEN-RN-EMITTER-IR-AUTHORITY-01 A3 — IR authority
   * only, no emitter consumption in this slice).
   */
  textOverflow: TextOverflowIR | undefined;

  /**
   * Optional DOM tree derived from `contract.anatomy.dom`. When present,
   * framework component-source emitters walk this to produce idiomatic
   * templates with attribute/event bindings. When absent (most contracts
   * today), emitters fall back to existing single-root output.
   */
  dom: DomNodeIR | undefined;

  /**
   * Field-association facts (FEAT-A11Y-LABEL-ID-ASSOCIATION-01). Present
   * when `resolveIdRelationships` routed a relationship through a consumer
   * slot (provider side) and/or the contract declares
   * `fieldAssociation: "control"` (consumer side). Undefined for the
   * overwhelming majority of components.
   */
  fieldAssociation: FieldAssociationIR | undefined;

  /** Codegen options. */
  generateTests: boolean;
}

// ---------------------------------------------------------------------------
// Polymorphic-root detection
// ---------------------------------------------------------------------------

/**
 * HTML tag names a polymorphic-root prop is allowed to take. Not exhaustive —
 * just the tags we'd reasonably expect in `as` unions today (list elements,
 * sectioning, phrasing). Adding to this set is safe; emitters only branch
 * on whether *all* of a union's values are members.
 */
const POLYMORPHIC_ROOT_TAGS = new Set<string>([
  "div",
  "span",
  "p",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "main",
  "nav",
  "ul",
  "ol",
  "dl",
  "li",
  "dt",
  "dd",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "figure",
  "figcaption",
  "code",
  "kbd",
  "samp",
]);

/**
 * Derive the polymorphic-tag prop, if any. Authority is structural: a
 * styled prop whose type alias is a string-union of recognized HTML tag
 * names qualifies. The rule does NOT branch on prop name — a prop called
 * `variant: "primary" | "ghost"` correctly returns undefined because its
 * values aren't HTML tags.
 */
function derivePolymorphicTagProp(
  styledProps: ResolvedPropIR[],
  types: Record<string, ContractTypeDef> | undefined,
  defaultTag: string,
): RootSemanticsIR["polymorphicTagProp"] {
  if (!types) return undefined;
  for (const prop of styledProps) {
    const def = types[prop.type];
    if (!def || def.kind !== "union") continue;
    const values = def.values;
    if (!Array.isArray(values) || values.length === 0) continue;
    if (!values.every((v): v is string => typeof v === "string")) continue;
    if (!values.every((v) => POLYMORPHIC_ROOT_TAGS.has(v))) continue;
    return {
      propName: prop.name,
      allowedTags: values,
      defaultTag,
    };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Build a `ComponentIR` from a validated contract. Pure function; no I/O.
 *
 * Validation must happen before this call — `buildComponentIR` assumes the
 * contract conforms to the schema.
 */
export interface BuildComponentIROptions {
  /**
   * Extra type names the unresolved-ref diagnostic should treat as known.
   * Use to admit per-emitter type vocabularies (e.g. a React-only consumer
   * passes `REACT_ADMITTED_TYPES`) without dragging realization-specific
   * names into the framework-neutral builtin set. Omitting this means the
   * IR will surface any non-builtin, non-contract-defined reference as
   * unresolved — including React-shaped names — which is the desired
   * default for framework-neutral validation.
   */
  extraKnownTypes?: ReadonlySet<string>;
  /**
   * The full contract corpus, keyed by component name. Required to resolve
   * `componentRef` nodes into a typed `ComponentInstanceIR` (target layer +
   * bindings classified against the target's prop surface). When omitted, a
   * componentRef node is carried unresolved (`componentInstance` undefined)
   * and emitters fall back to the bare-name path — single-contract callers
   * that don't supply the corpus get no cross-contract resolution, but the
   * generation gate (cli.ts) always supplies it. This is the first
   * cross-contract input to the otherwise single-contract IR projection;
   * determinism (property 2) is preserved because the resolution is pure
   * given the corpus bytes.
   */
  allContracts?: ReadonlyMap<string, ComponentContract>;
}

/**
 * Layer ladder for by-reference composition, shared by the IR resolver and the
 * semantic validator. A contract may only reference a component whose layer is
 * lower-or-equal in this order (CODEGEN-RECURSIVE-COMPOSITION-01).
 */
export const LAYER_ORDER: Record<string, number> = {
  primitive: 0,
  compound: 1,
  composer: 2,
  assembly: 3,
};

/**
 * True when the authored DOM tree already places `role` on one of its nodes.
 * Role ownership is a normalized IR fact: emitters must not independently
 * rediscover whether an inner panel or the outer host owns the component role.
 */
function domTreeOwnsRole(
  node: DomNodeIR | null | undefined,
  role: string,
): boolean {
  if (!node) return false;
  if (node.attrs.role === role) return true;
  return node.children.some((child) => domTreeOwnsRole(child, role));
}

export function buildComponentIR(
  contract: ComponentContract,
  options?: BuildComponentIROptions,
): ComponentIR {
  const cssPrefix = getCssPrefix(contract);
  const styledProps = resolveProps(contract);
  const parts = buildParts(contract);
  const compoundParts = parts.filter(
    (p) => p.isCompound && p.name !== "root",
  );

  const variants = contract.variants || {};
  const states = normalizeStates(contract.states);

  const classRecipe = buildClassRecipe({
    cssPrefix,
    styledProps,
    variants,
    flatStates: states.flat,
  });

  const rootElement = getRootElement(contract);
  const explicitRole = contract.a11y?.role;
  const implicitRole = IMPLICIT_ROLES_BY_ELEMENT[rootElement];
  const effectiveRole =
    explicitRole &&
    explicitRole !== "none" &&
    explicitRole !== "compound" &&
    explicitRole !== implicitRole
      ? explicitRole
      : undefined;

  const cssBlocks = buildCssBlocks(contract, cssPrefix);
  const keyframes = buildKeyframes(contract);
  const motion = buildMotion(contract);
  const tokenFacts = buildTokenFacts(contract.tokens ?? {});
  const designBindings = buildDesignBindings(contract).map(binding => ({
    ...binding,
    selector: binding.selectorKey === "root" ? `.${cssPrefix}` : guardInteractionSelector(
      expandStylesKey(binding.selectorKey, cssPrefix, expandOptionsForContract(contract, cssPrefix)),
      suppressionGuardFor(contract),
    ),
  }));
  const tokenScopes = buildTokenScopes(contract, cssPrefix);

  const behavior = buildBehaviorIR(contract, styledProps);
  const surface = buildSurfaceIR(contract, parts);
  const textOverflow = buildTextOverflowIR(contract);
  const dom = buildDomTree(contract);
  const formControl = buildFormControlIR(
    contract,
    parts,
    behavior.normalizedChannels,
    dom,
  );
  const compositeControl = buildCompositeControlIR(
    contract,
    parts,
    behavior.normalizedChannels,
    dom,
  );
  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: lower realized keyboard interactions
  // after compositeControl (validation needs it) and attach onto the DOM
  // nodes whose parts host the keydown bindings.
  const keyboardActions = buildKeyboardActions(
    contract,
    parts,
    behavior.normalizedChannels,
    compositeControl,
    behavior.focus,
  );
  attachKeyboardActions(dom, keyboardActions, contract.name);
  const interaction = buildInteractionIR(contract, parts, behavior.normalizedChannels, dom);
  if (interaction?.presence === "hidden") {
    cssBlocks.push({
      selector: `.${cssPrefix}__${interaction.content.name}[hidden]:not([hidden="until-found"])`,
      declarations: { display: "none !important" },
    });
  }
  validateDismissalTargetParts(contract, dom);
  const rootRole =
    effectiveRole && !domTreeOwnsRole(dom, effectiveRole)
      ? effectiveRole
      : undefined;

  if (dom) {
    enrichMarkdownTagsInTree(
      dom,
      contract.anatomy !== undefined && !Array.isArray(contract.anatomy)
        ? contract.anatomy.details ?? {}
        : {},
    );
    validateDomBindings(
      dom,
      behavior.normalizedChannels,
      styledProps,
      contract.name,
      cssPrefix,
      contract.anatomy !== undefined && !Array.isArray(contract.anatomy)
        ? contract.anatomy.details ?? {}
        : {},
      contract.types ?? {},
    );
    // ARCH-COMPOSER-SLOT-PROJECTION-001: a named-slot name and a designed-prop
    // name occupy disjoint namespaces. Svelte projects both into one `$props()`
    // scope, so a slot named the same as a prop is a `Duplicate identifier`
    // compile error there — even though React/Vue/Lit/Angular namespace slots
    // separately and mask it. Catch the contract-shape defect at IR-build so it
    // fails once, loud, for all five targets instead of only under svelte-check.
    validateSlotPropNamespaces(dom, styledProps, contract.name);
  }

  // CODEGEN-RECURSIVE-COMPOSITION-01: resolve componentRef nodes into typed
  // ComponentInstanceIR facts. This is the single place componentRef bindings
  // are interpreted (normal-form property 2): classify each against the
  // target's prop surface, resolve the target layer, fail loud on an unknown
  // target prop / unresolved ref / layer violation. Runs only when the corpus
  // was supplied; emitters fall back to the bare-name path otherwise.
  if (dom && options?.allContracts) {
    resolveComponentInstances(dom, contract, options.allContracts);
  }

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: lower contract relationships[] into
  // generated-id facts (generatedIdSlug / idRefAttrs on dom nodes) and
  // field-association provider facts for consumer-slotted targets. Runs
  // before the a11y-obligation validator so lowered idref attributes are
  // visible to any downstream inspection.
  let fieldAssociation: FieldAssociationIR | undefined;
  {
    const propNames = new Set(styledProps.map((p) => p.name));
    const provides = dom
      ? resolveIdRelationships(dom, contract, propNames)
      : undefined;
    const consumerPart =
      contract.fieldAssociation === "control"
        ? formControl?.part.name
        : undefined;
    if (contract.fieldAssociation === "control" && !consumerPart) {
      throw new Error(
        `Contract "${contract.name}": fieldAssociation "control" requires formControl so association can target the rendered control part.`,
      );
    }
    if (provides || consumerPart) {
      fieldAssociation = { provides, consumerPart };
    }
  }

  // A11Y-CONTRACT-OBLIGATION-VALIDATOR-01: throw on static ARIA roles
  // with required attributes that aren't satisfied by either attrs,
  // bindings, or an explicit `a11y.obligations.suppress` entry.
  // Suppressed obligations land on `unresolvedA11yObligations` for
  // downstream inspection without blocking IR build.
  const unresolvedA11yObligations: A11yObligationIR[] = [];
  if (dom) {
    const suppressed = contract.a11y?.obligations?.suppress ?? [];
    validateDomA11yObligations(dom, suppressed, contract.name, unresolvedA11yObligations);
  }

  // The polymorphic-as default tag comes from the contract's dom-tree root
  // (when present) rather than the a11y-role-derived rootElement, because
  // contracts like List declare the semantic tag via anatomy.dom.tag without
  // setting a role. Falls back to rootElement when no dom tree is authored.
  const polymorphicDefaultTag = dom?.tag ?? rootElement;
  const polymorphicTagProp = derivePolymorphicTagProp(
    styledProps,
    contract.types,
    polymorphicDefaultTag,
  );

  return {
    name: contract.name,
    cssPrefix,
    parts,
    compoundParts,
    styledProps,
    definedTypes: contract.types || {},
    unresolvedTypeRefs: collectUnresolvedTypes(
      styledProps,
      contract.types,
      options?.extraKnownTypes,
    ),
    unresolvedA11yObligations,
    variants,
    states,
    classRecipe,
    root: {
      element: rootElement,
      explicitRole,
      implicitRole,
      effectiveRole,
      rootRole,
      labeling: contract.a11y?.labeling ?? [],
      keyboard: contract.a11y?.keyboard,
      polymorphicTagProp,
    },
    cssBlocks,
    rootClipping: buildRootClipping(contract),
    keyframes,
    motion,
    tokenFacts,
    designBindings,
    tokenScopes,
    behavior,
    surface,
    interaction,
    formControl,
    compositeControl,
    keyboardActions,
    textOverflow,
    dom,
    fieldAssociation,
    generateTests: contract.codegen?.tests !== false,
  };
}

/**
 * Walk the IR's dom tree and return true iff it contains a `{ tag: "children" }`
 * insertion point. Used by framework emitters to gate the `children` prop on the
 * generated component's public API: if the contract anatomy doesn't declare
 * a children placement, the component does not accept children and the prop
 * should not appear in the typed interface.
 *
 * Named slots (`{ tag: "slot", name: "X" }`) are NOT counted — they're a
 * separate, named API surface via the `slots` prop.
 */
export function hasChildrenPlaceholder(ir: ComponentIR): boolean {
  if (!ir.dom) return false;
  const stack: DomNodeIR[] = [ir.dom];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.tag === "children") return true;
    if (node.children) stack.push(...node.children);
  }
  return false;
}

/**
 * Group anatomy parts by their declared collapse intent.
 *
 * Returns a map keyed by `ContractCollapseIntent` (e.g.
 * `native-toggle-affordance`) whose values are the part names that share
 * that intent. Parts without `details.collapsibleTo` are omitted.
 *
 * Each non-web emitter consults this map plus its own intent→primitive
 * table to decide whether to collapse the multi-part anatomy into a
 * single native primitive. Web emitters can ignore the result — the
 * `anatomy.dom` tree is the authoritative shape for them.
 */
export function collectCollapseIntents(
  ir: ComponentIR,
): Map<ContractCollapseIntent, string[]> {
  const result = new Map<ContractCollapseIntent, string[]>();
  for (const part of ir.parts) {
    const intent = part.details?.collapsibleTo;
    if (!intent) continue;
    const existing = result.get(intent) ?? [];
    existing.push(part.name);
    result.set(intent, existing);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Binding validation
// ---------------------------------------------------------------------------

/**
 * Walk all bindings in a `DomNodeIR` tree and assert that every
 * `channel:X` reference names a known normalized channel and every
 * `prop:Y` reference names a known styled prop.
 *
 * Throws a descriptive error on the first violation so contract authors
 * see exactly what went wrong (e.g. a misspelled channel name) rather than
 * silently emitting a literal string in the generated output.
 */
/**
 * ARCH-COMPOSER-SLOT-PROJECTION-001 — slot/prop namespace disjointness.
 *
 * A component's named-slot names and its designed-prop names must not overlap.
 * Svelte lowers both a designed prop and a same-named slot into one `Props`
 * interface and one `$props()` destructure, producing a `Duplicate identifier`
 * / `Cannot redeclare block-scoped variable` compile error. React, Vue, Lit,
 * and Angular expose slots in a namespace separate from props and silently
 * tolerate the overlap, so the defect would otherwise surface only under
 * `svelte-check` — the lowest-common-denominator framework. The contract is the
 * single source of truth for all five targets, so a shape only four can express
 * is a contract defect, not a Svelte bug. The fix is always to MOVE the content
 * from the prop into the slot (the slot becomes the sole content surface for
 * that region), never to keep both.
 */
function validateSlotPropNamespaces(
  dom: DomNodeIR,
  styledProps: ResolvedPropIR[],
  componentName: string,
): void {
  const slotNames = new Set<string>();
  const collect = (node: DomNodeIR): void => {
    if (node.tag === "slot" && node.slotName) {
      slotNames.add(node.slotName);
    }
    for (const child of node.children) collect(child);
  };
  collect(dom);
  if (slotNames.size === 0) return;

  const propNames = new Set(styledProps.map((p) => p.name));
  const collisions = [...slotNames].filter((s) => propNames.has(s)).sort();
  if (collisions.length > 0) {
    throw new Error(
      `[${componentName}] named slot(s) collide with designed prop name(s): ` +
        `[${collisions.join(", ")}]. A named slot and a prop may not share a ` +
        `name — Svelte projects both into one $props() scope (Duplicate ` +
        `identifier). Move the region's content from the prop into the slot ` +
        `(the slot owns the content; keep only behavioral props). ` +
        `See docs/architecture/composer-slot-projection.md.`,
    );
  }
}

function countMarkdownTransforms(node: DomNodeIR | undefined): number {
  if (!node) return 0;
  const self = isMarkdownTransform(node.content) ? 1 : 0;
  return self + node.children.reduce((sum, c) => sum + countMarkdownTransforms(c), 0);
}

function validateDomBindings(
  node: DomNodeIR,
  channels: NormalizedChannelIR[],
  styledProps: ResolvedPropIR[],
  componentName: string,
  cssPrefix: string,
  anatomyDetails: Record<string, ContractPartDetails>,
  componentTypes: Record<string, ContractTypeDef>,
): void {
  if (countMarkdownTransforms(node) > 1) {
    throw new Error(
      `[${componentName}] at most one markdown content transform per dom tree ` +
      `is admitted in v1 — the emitter helper shapes (one renderer family ` +
      `per file) assume a single transform.`,
    );
  }
  const knownChannels = new Set(channels.map((c) => c.name));
  const channelValueProps = new Set(channels.map((c) => c.valueProp));
  const knownProps = new Set(styledProps.map((p) => p.name));
  const propTypes = new Map(styledProps.map((p) => [p.name, p.type]));
  const propTypeIR = new Map(styledProps.map((p) => [p.name, p.propType]));
  const channelValuePropByName = new Map(channels.map((c) => [c.name, c.valueProp]));
  // FEAT-CHANNEL-UPDATE-OPERATIONS-01: channel name → declared valueType, so
  // `channelUpdate` validation can check operation/valueType compatibility
  // (setCharAt requires a string channel; toggleMembership requires an
  // array-capable one). Undefined valueType channels map to "".
  const channelValueTypes = new Map(
    channels.map((c) => [c.name, c.valueType ?? ""]),
  );
  // Resolve iteration sources that arrived as `channel:X.value` to the
  // underlying styled prop name. This is done up-front so the recursive
  // validator can use the same `propTypes`/`knownProps` checks for both
  // sources (`prop:X` and `channel:X.value`). Mutates the IR in place; the
  // tree is fresh out of `buildDomTree` and not yet exposed externally.
  resolveChannelIterationSources(node, channelValuePropByName, componentName);
  validateDomNode(
    node,
    knownChannels,
    channelValueProps,
    knownProps,
    propTypes,
    propTypeIR,
    componentName,
    cssPrefix,
    channelValueTypes,
    [],
    anatomyDetails,
    componentTypes,
  );
}

/**
 * Walk the IR tree and, for every `iteration` whose `source` is a
 * `channel:X.value` binding, resolve X to the channel's valueProp and
 * write it into `sourceProp`. `parseIterate` leaves `sourceProp = ""`
 * for channel sources because it lacks access to the channel registry.
 * Throws if X is not a known channel.
 *
 * PRODUCTION-ARRAY-ITERATION-CONSUMER-01: lets a contract author write
 * `iterate.source: "channel:selection.value"` and have the validator
 * still confirm the channel's underlying valueProp is the right shape
 * (array for `kind: "array"`, number for `kind: "count"`).
 */
function resolveChannelIterationSources(
  node: DomNodeIR,
  channelValuePropByName: Map<string, string>,
  componentName: string,
): void {
  if (node.iteration && node.iteration.source.kind === "channel") {
    const channelName = node.iteration.source.channel;
    const valueProp = channelValuePropByName.get(channelName);
    if (valueProp === undefined) {
      throw new Error(
        `[${componentName}] DOM iterate.source references unknown channel ` +
        `'${channelName}' (known: [${[...channelValuePropByName.keys()].join(", ")}])`,
      );
    }
    node.iteration.sourceProp = valueProp;
  }
  for (const child of node.children) {
    resolveChannelIterationSources(child, channelValuePropByName, componentName);
  }
}

/**
 * Match the loose form of an array type expression: `Foo[]`, `Array<Foo>`,
 * `ReadonlyArray<Foo>`, or a union that contains an array shape
 * (e.g. `Date[] | null`). The IR's prop type strings are TypeScript
 * expressions stored verbatim, so this is intentionally permissive — a
 * misformatted type is the contract-author's problem, not the codegen's.
 */
function looksLikeArrayType(type: string): boolean {
  const t = type.trim();
  return /\[\]/.test(t) || /\bArray</.test(t) || /\bReadonlyArray</.test(t);
}

function validateDomNode(
  node: DomNodeIR,
  knownChannels: Set<string>,
  channelValueProps: Set<string>,
  knownProps: Set<string>,
  propTypes: Map<string, string>,
  propTypeIR: Map<string, PropTypeIR>,
  componentName: string,
  cssPrefix: string,
  channelValueTypes: Map<string, string>,
  enclosingIterations: IterationIR[] = [],
  anatomyDetails: Record<string, ContractPartDetails> = {},
  componentTypes: Record<string, ContractTypeDef> = {},
): void {
  // Iteration source must resolve in the OUTER scope (the iteration
  // variables it defines are not yet visible to itself). Validate it
  // before extending the in-scope name set for the rest of the node.
  // - kind="count" → prop type must be exactly `number`.
  // - kind="array" → prop type must look array-shaped (T[], Array<T>,
  //   ReadonlyArray<T>, or a union containing one of those).
  // Reject sub-typing surprises early so the emitter can assume the type.
  if (node.iteration) {
    const { sourceProp, kind } = node.iteration;
    if (!knownProps.has(sourceProp)) {
      throw new Error(
        `[${componentName}] DOM iterate.source references unknown prop ` +
        `'${sourceProp}' (known: [${[...knownProps].join(", ")}])`,
      );
    }
    const declaredType = (propTypes.get(sourceProp) ?? "").trim();
    if (kind === "count" && declaredType !== "number") {
      throw new Error(
        `[${componentName}] DOM iterate.kind="count" requires prop ` +
        `'${sourceProp}' to be typed 'number'; got '${declaredType}'. ` +
        `For array-typed iteration sources, use kind="array" with itemType.`,
      );
    }
    if (kind === "array" && !looksLikeArrayType(declaredType)) {
      throw new Error(
        `[${componentName}] DOM iterate.kind="array" requires prop ` +
        `'${sourceProp}' to be an array type (T[], Array<T>, ` +
        `ReadonlyArray<T>); got '${declaredType}'.`,
      );
    }
  }

  // Icon-glyph props must resolve against the component's prop surface.
  // - nameFrom → must be a string-typed prop (the canonical icon name).
  // - sizeFrom + sizeHints → any prop whose values the hints enumerate
  //   (typically a string-literal union); without hints the prop must be
  //   number-typed because its value is used as pixels directly.
  if (node.iconGlyph) {
    const { namePropName, sizePropName, sizeHints } = node.iconGlyph;
    if (!knownProps.has(namePropName)) {
      throw new Error(
        `[${componentName}] DOM iconGlyph.nameFrom references unknown prop ` +
        `'${namePropName}' (known: [${[...knownProps].join(", ")}])`,
      );
    }
    const nameType = (propTypes.get(namePropName) ?? "").trim();
    if (nameType !== "string") {
      throw new Error(
        `[${componentName}] DOM iconGlyph.nameFrom requires prop ` +
        `'${namePropName}' to be typed 'string' (the canonical icon name); ` +
        `got '${nameType}'.`,
      );
    }
    if (sizePropName !== undefined) {
      if (!knownProps.has(sizePropName)) {
        throw new Error(
          `[${componentName}] DOM iconGlyph.sizeFrom references unknown prop ` +
          `'${sizePropName}' (known: [${[...knownProps].join(", ")}])`,
        );
      }
      const sizeType = (propTypes.get(sizePropName) ?? "").trim();
      if (sizeHints === undefined && sizeType !== "number") {
        throw new Error(
          `[${componentName}] DOM iconGlyph.sizeFrom without sizeHints ` +
          `requires prop '${sizePropName}' to be typed 'number' (used as ` +
          `pixels directly); got '${sizeType}'. Declare sizeHints to map ` +
          `enum values to pixels instead.`,
        );
      }
    }
  }

  // Content-transform directives (FEAT-CODEBLOCK-HIGHLIGHT-01,
  // FEAT-MARKDOWN-CONTENT-TRANSFORM-01): every input binding must resolve
  // against the prop surface with the type the transform consumes, and
  // every vocabulary entry must name an anatomy part with the kind's
  // DOM-contract tag.
  if (isContentTransform(node.content)) {
    const transform = node.content;
    const requireProp = (propName: string, field: string): string => {
      if (!knownProps.has(propName)) {
        throw new Error(
          `[${componentName}] DOM content.${field} references unknown prop ` +
          `'${propName}' (known: [${[...knownProps].join(", ")}])`,
        );
      }
      return (propTypes.get(propName) ?? "").trim();
    };
    const sourceType = requireProp(transform.sourceProp, "source");
    if (sourceType !== "string") {
      throw new Error(
        `[${componentName}] DOM content.source requires prop ` +
        `'${transform.sourceProp}' to be typed 'string' (the literal source ` +
        `text); got '${sourceType}'.`,
      );
    }
    if (transform.gate !== undefined && transform.gateProp !== undefined) {
      const gateType = requireProp(transform.gateProp!, "gate");
      if (gateType !== "boolean") {
        throw new Error(
          `[${componentName}] DOM content.gate requires prop ` +
          `'${transform.gateProp}' to be typed 'boolean'; got '${gateType}'.`,
        );
      }
    }
    const requireVocabularyPart = (
      map: Record<string, string>,
      tags: Readonly<Record<string, readonly string[]>>,
      field: string,
      requireMultiple: boolean,
    ): void => {
      for (const [kind, partName] of Object.entries(map)) {
        const partDetail = anatomyDetails[partName];
        if (!partDetail) {
          throw new Error(
            `[${componentName}] DOM content.${field}.${kind} references ` +
            `unknown anatomy part '${partName}' (known: ` +
            `[${Object.keys(anatomyDetails).join(", ")}])`,
          );
        }
        const admitted = tags[kind] ?? [];
        const declaredTag = partDetail.tag ?? "(none)";
        if (!admitted.includes(declaredTag)) {
          throw new Error(
            `[${componentName}] DOM content.${field}.${kind} part ` +
            `'${partName}' must declare one of tags [${admitted.join(", ")}] ` +
            `— the markdown DOM contract is part of the transform grammar; ` +
            `got '${declaredTag}'.`,
          );
        }
        if (requireMultiple && partDetail.multiple !== true) {
          throw new Error(
            `[${componentName}] DOM content.${field}.${kind} part ` +
            `'${partName}' must be marked multiple: true — marks repeat.`,
          );
        }
      }
    };

    if (transform.transform === "markdown") {
      requireVocabularyPart(
        transform.blockParts as unknown as Record<string, string>,
        MARKDOWN_BLOCK_TAGS,
        "blockParts",
        false,
      );
      requireVocabularyPart(
        transform.markParts as unknown as Record<string, string>,
        MARKDOWN_MARK_TAGS,
        "markParts",
        true,
      );
    } else {
      const languageType = requireProp(transform.languageProp, "language");
      const languageTypeDef = componentTypes[languageType];
      const languageIsStringUnion =
        languageTypeDef !== undefined && languageTypeDef.kind === "union";
      if (languageType !== "string" && !languageIsStringUnion) {
        throw new Error(
          `[${componentName}] DOM content.language requires prop ` +
          `'${transform.languageProp}' to be typed 'string' or a string-union ` +
          `type declared in contract.types; got '${languageType}'.`,
        );
      }
      const partDetail = anatomyDetails[transform.tokenPart];
      if (!partDetail) {
        throw new Error(
          `[${componentName}] DOM content.tokenPart references unknown anatomy ` +
          `part '${transform.tokenPart}' (known: ` +
          `[${Object.keys(anatomyDetails).join(", ")}])`,
        );
      }
      if (partDetail.tag !== "span" || partDetail.multiple !== true) {
        throw new Error(
          `[${componentName}] DOM content.tokenPart '${transform.tokenPart}' ` +
          `must be an anatomy part with tag "span" and multiple: true — one ` +
          `span is realized per token.`,
        );
      }
      if (transform.tokensProp !== undefined) {
        const tokenType = requireProp(transform.tokensProp, "tokens");
        const tokenTypeIR = propTypeIR.get(transform.tokensProp);
        if (tokenTypeIR?.kind !== "array" || tokenTypeIR.items.kind !== "ref") {
          throw new Error(`[${componentName}] DOM content.tokens requires an array of a named token type; got '${tokenType}'.`);
        }
      }
      if (transform.lineNumbersProp !== undefined) {
        const lineType = requireProp(transform.lineNumbersProp, "lineNumbers");
        if (lineType !== "boolean") {
          throw new Error(`[${componentName}] DOM content.lineNumbers requires boolean; got '${lineType}'.`);
        }
      }
      for (const [field, partName] of [["linePart", transform.linePart], ["gutterPart", transform.gutterPart]] as const) {
        if (partName === undefined) continue;
        const detail = anatomyDetails[partName];
        if (detail?.tag !== "span" || detail.multiple !== true) {
          throw new Error(`[${componentName}] DOM content.${field} must name a multiple span anatomy part.`);
        }
      }
    }
  }

  // After V2 (BINDING-EXPRESSION-V2-01), the validator distinguishes two
  // separate scope concepts:
  //
  //   1. `enclosingIteration` (nearest) — used to validate `iterationLocal`
  //      bindings. A binding of kind `iterationLocal` is only legal when
  //      *some* enclosing iteration exists, and `iterationLocal.local ===
  //      "item"` is only legal under an `array`-kind iteration (count has
  //      no item).
  //
  //   2. `inScopeForIf` (cumulative) — used to validate `if:` guards. The
  //      `if:` grammar predates V2 and still allows `if: "index"` inside
  //      iteration to resolve to the iteration's `indexVar`. Outer
  //      iteration locals remain visible inside nested iterations because
  //      `if:` doesn't have an `iter:` form yet.
  //
  // `prop:X` bindings, after V1 normalization, never legitimately refer to
  // iteration locals — so binding-side `prop:` validation uses the
  // un-extended `knownProps` set.
  const activeIterations = node.iteration
    ? [...enclosingIterations, node.iteration]
    : enclosingIterations;
  const enclosingIteration = activeIterations[activeIterations.length - 1];
  const inScopeForIf = new Set(knownProps);
  for (const it of activeIterations) {
    inScopeForIf.add(it.indexVar);
    if (it.itemVar !== undefined) inScopeForIf.add(it.itemVar);
  }

  for (const [attr, binding] of Object.entries(node.bindings)) {
    if (binding.kind === "valueMap") {
      validateValueMapBinding(
        binding,
        attr,
        propTypeIR,
        componentTypes,
        componentName,
      );
    }
    validateBindingAgainstScope(
      binding,
      `binding "${attr}"`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      // BINDING-EXPRESSION-V2-PREDICATE-01: attribute bindings are the
      // only callsite where predicate-kind expressions are admitted.
      // Event/content/iterate-source/css-var callsites pass the default
      // `false` and reject predicates with a typed error.
      true,
    );
  }
  for (const [prop, binding] of Object.entries(node.propertyBindings)) {
    const hostRequirement = DOM_PROPERTY_HOST_REQUIREMENTS[prop];
    if (hostRequirement) {
      const tagMismatch = node.tag !== hostRequirement.tag;
      const attrMismatches = Object.entries(hostRequirement.attrs).filter(
        ([attr, value]) => node.attrs[attr] !== value,
      );
      if (tagMismatch || attrMismatches.length > 0) {
        const wantShape =
          hostRequirement.tag +
          Object.entries(hostRequirement.attrs)
            .map(([attr, value]) => ` ${attr}="${value}"`)
            .join("");
        const gotTag =
          node.componentRef !== undefined
            ? `componentRef="${node.componentRef}"`
            : node.tag;
        const gotShape =
          gotTag +
          Object.entries(node.attrs)
            .map(([attr, value]) => ` ${attr}="${value}"`)
            .join("");
        throw new Error(
          `[${componentName}] properties.${prop} requires a DOM node ` +
          `shaped <${wantShape}> — "${prop}" has no effect (or is invalid) ` +
          `on any other host. Got <${gotShape}> (part="${node.part ?? "?"}"). ` +
          `(DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01)`,
        );
      }
    }
    validateBindingAgainstScope(
      binding,
      `property "${prop}"`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      // Property-only bindings are a boolean/primitive DOM-property set,
      // not an attribute — no predicate use case has come up. Matches
      // events/content/iterate-source/css-var's default (false).
    );
  }
  for (const [evt, binding] of Object.entries(node.events)) {
    validateBindingAgainstScope(
      binding,
      `event "${evt}"`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      // Predicates stay rejected in events (they're boolean-valued). The
      // channelCall call-with-arg form AND the channelUpdate named-operation
      // form are admitted ONLY here.
      false,
      true,
      channelValueTypes,
    );
  }
  if (node.content !== undefined) {
    if (isContentTransform(node.content)) {
      const transform = node.content;
      const transformInputs: [string, BindingExpression][] = [
        ["source", transform.source],
      ];
      if (transform.transform === "highlight") {
        transformInputs.push(["language", transform.language]);
        if (transform.tokens !== undefined) transformInputs.push(["tokens", transform.tokens]);
        if (transform.lineNumbers !== undefined) transformInputs.push(["lineNumbers", transform.lineNumbers]);
      }
      if (transform.gate !== undefined) {
        transformInputs.push(["gate", transform.gate]);
      }
      for (const [field, binding] of transformInputs) {
        validateBindingAgainstScope(
          binding,
          `content.${field}`,
          knownChannels,
          knownProps,
          enclosingIteration,
          componentName,
        );
      }
    } else {
      validateBindingAgainstScope(
        node.content,
        `content`,
        knownChannels,
        knownProps,
        enclosingIteration,
        componentName,
      );
    }
  }
  // `if: "slot:<name>"` gates a wrapper on its own named slot; a guard on a
  // slot the subtree never renders could never become true.
  if (node.ifSlot !== undefined && !subtreeHasNamedSlot(node, node.ifSlot)) {
    throw new Error(
      `[${componentName}] DOM node 'if: "slot:${node.ifSlot}"' guards a subtree ` +
      `that renders no {"tag": "slot", "name": "${node.ifSlot}"}.`,
    );
  }
  // `if: "<name>"` must resolve to a declared prop, a channel name, a
  // channel's value-prop, or the special literal "children". The React
  // emitter falls back to emitting the raw identifier when this fails —
  // producing JS ReferenceErrors at runtime. Catch the issue at IR-build.
  if (node.ifProp && node.ifProp !== "children") {
    const resolves =
      inScopeForIf.has(node.ifProp) ||
      knownChannels.has(node.ifProp) ||
      channelValueProps.has(node.ifProp);
    if (!resolves) {
      throw new Error(
        `[${componentName}] DOM node 'if: "${node.ifProp}"' does not resolve ` +
        `to a declared prop, channel name, or channel value-prop. ` +
        `Declared props: [${[...inScopeForIf].join(", ")}]. ` +
        `Declared channels: [${[...knownChannels].join(", ")}].`,
      );
    }
  }
  // CSS-var bindings: the schema accepts the loose `--fsds-<anything>`
  // prefix; tighten it here to the component-specific form
  // `--fsds-<cssPrefix>(-…)+` so a Progress contract can't accidentally
  // bind a `--fsds-truncate-…` var (and so renames of one component's
  // prefix never silently collide with another's). Also confirm that
  // every binding's source resolves to a declared prop/channel/alias.
  if (node.cssVarBindings.length > 0) {
    const expected = new RegExp(`^--fsds-${cssPrefix}(-[a-z0-9]+)+$`);
    for (const { varName, value } of node.cssVarBindings) {
      if (value.kind === 'valueMap') {
        validateValueMapBinding(value, varName, propTypeIR, componentTypes, componentName);
      }
      if (!expected.test(varName)) {
        throw new Error(
          `[${componentName}] DOM cssVariableBindings name '${varName}' ` +
          `must match --fsds-${cssPrefix}-<name> (e.g. ` +
          `'--fsds-${cssPrefix}-value'). This namespacing prevents ` +
          `collision with consumer CSS variables and keeps the ` +
          `design-system surface auditable.`,
        );
      }
      validateBindingAgainstScope(
        value,
        `cssVariableBindings '${varName}'`,
        knownChannels,
        knownProps,
        enclosingIteration,
        componentName,
      );
    }
  }
  for (const child of node.children) {
    validateDomNode(
      child,
      knownChannels,
      channelValueProps,
      knownProps,
      propTypes,
      propTypeIR,
      componentName,
      cssPrefix,
      channelValueTypes,
      activeIterations,
      anatomyDetails,
      componentTypes,
    );
  }
}

function literalDomainForProp(
  propType: PropTypeIR | undefined,
  componentTypes: Record<string, ContractTypeDef>,
): string[] | undefined {
  if (!propType) return undefined;
  if (propType.kind === "enum") return propType.values;
  if (propType.kind === "literal" && typeof propType.value === "string") {
    return [propType.value];
  }
  if (propType.kind === "union") {
    const domains = propType.of.map((member) =>
      literalDomainForProp(member, componentTypes),
    );
    return domains.some((domain) => domain === undefined)
      ? undefined
      : domains.flatMap((domain) => domain!);
  }
  if (propType.kind === "ref") {
    const def = componentTypes[propType.to];
    return def?.kind === "union" && Array.isArray(def.values)
      ? def.values
      : undefined;
  }
  return undefined;
}

function validateValueMapBinding(
  binding: Extract<BindingExpression, { kind: "valueMap" }>,
  attr: string,
  propTypes: Map<string, PropTypeIR>,
  componentTypes: Record<string, ContractTypeDef>,
  componentName: string,
): void {
  if (
    binding.source.kind !== "prop" ||
    (binding.source.path?.length ?? 0) > 0
  ) {
    throw new Error(
      `[${componentName}] DOM binding "${attr}" value map source must be a ` +
        `bare prop:<name> reference so its finite domain can be verified.`,
    );
  }
  const domain = literalDomainForProp(
    propTypes.get(binding.source.prop),
    componentTypes,
  );
  if (!domain) {
    if (binding.fallback === undefined) {
      throw new Error(
        `[${componentName}] DOM binding "${attr}" value map source prop ` +
          `'${binding.source.prop}' has no enumerable literal domain; declare ` +
          `a fallback or use an enum/string-union prop.`,
      );
    }
    return;
  }
  const authored = Object.keys(binding.values);
  const unknown = authored.filter((key) => !domain.includes(key));
  if (unknown.length > 0) {
    throw new Error(
      `[${componentName}] DOM binding "${attr}" value map has unknown key(s) ` +
        `[${unknown.join(", ")}] outside source prop '${binding.source.prop}' ` +
        `domain [${domain.join(", ")}].`,
    );
  }
  const missing = domain.filter((key) => !(key in binding.values));
  if (missing.length > 0 && binding.fallback === undefined) {
    throw new Error(
      `[${componentName}] DOM binding "${attr}" value map must be exhaustive ` +
        `for source prop '${binding.source.prop}'; missing [${missing.join(", ")}].`,
    );
  }
}

/**
 * Validate a single `BindingExpression` against the declared channel /
 * prop sets and the enclosing iteration. Used for `bindings`, `events`,
 * `content`, and `cssVarBindings.value` — every site where a contract
 * author writes a binding-expression string.
 *
 * Rejects:
 *   - `channel:X` where `X` is not declared
 *   - `prop:X` where `X` is not a declared prop (iteration locals do NOT
 *     count here; after V1 normalization, a `prop:` binding always refers
 *     to a real prop)
 *   - `iter:index` / `iter:item` with no enclosing iteration
 *   - `iter:item` when the enclosing iteration is `kind: "count"` (count
 *     iteration has no item)
 *
 * Accepts:
 *   - `literal:` (always opaque)
 *   - `iter:index` under any kind of iteration
 *   - `iter:item` under array iteration
 */
function validateBindingAgainstScope(
  binding: BindingExpression,
  siteLabel: string,
  knownChannels: Set<string>,
  knownProps: Set<string>,
  enclosingIteration: IterationIR | undefined,
  componentName: string,
  /**
   * Whether `predicate`-kind bindings are admitted at this callsite.
   * Defaults to `false`. Only attribute-binding contexts pass `true`
   * (and only because attribute bindings can be boolean-valued). For
   * `content`, `events`, `iterate.source`, and `cssVariableBindings`,
   * `predicate` is rejected with a typed message — those positions
   * consume value-shaped expressions, not boolean ones.
   * BINDING-EXPRESSION-V2-PREDICATE-01.
   */
  allowPredicates: boolean = false,
  /**
   * Whether `channelCall`-kind bindings are admitted at this callsite.
   * Defaults to `false`. Only `events` positions pass `true`: a `channelCall`
   * lowers to a `() => setter(arg)` handler, which is an event-handler value,
   * not an attribute/content value. FEAT-BINDING-CALL-WITH-ARG-01.
   */
  allowChannelCall: boolean = false,
  /**
   * Channel name → declared valueType, used to check `channelUpdate`
   * operation/valueType compatibility (setCharAt ⇒ string channel;
   * toggleMembership ⇒ array-capable channel). Absent (empty map) at
   * non-events callsites, where `channelUpdate` is rejected outright by the
   * `allowChannelCall` gate. FEAT-CHANNEL-UPDATE-OPERATIONS-01.
   */
  channelValueTypes: Map<string, string> = new Map(),
): void {
  if (binding.kind === "projection") {
    if (binding.op === "selectionLabel") {
      for (const operand of [binding.selection, binding.fallback]) {
        validateBindingAgainstScope(operand, `${siteLabel} selection label operand`, knownChannels, knownProps, enclosingIteration, componentName);
      }
    }
    validateBindingAgainstScope(
      binding.source,
      `${siteLabel} projection source`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      false,
      false,
    );
    if (
      binding.op === "dateDayOfMonth" &&
      binding.source.kind === "iterationLocal" &&
      binding.source.local === "item" &&
      enclosingIteration?.itemType !== "Date"
    ) {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} uses project:dateDayOfMonth(iter:item), but the enclosing iteration itemType is '${enclosingIteration?.itemType ?? "(unspecified)"}', not 'Date'.`,
      );
    }
    return;
  }
  if (binding.kind === "valueMap") {
    validateBindingAgainstScope(
      binding.source,
      `${siteLabel} value map source`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      false,
      false,
    );
    return;
  }
  if (binding.kind === "channelUpdate") {
    // channelUpdate reuses the events-only gate: like channelCall it lowers
    // to a `() => …` handler, not a value.
    if (!allowChannelCall) {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} uses a channel:${binding.channel}` +
        `.onChange:${binding.op}(...) update-operation binding, but that form ` +
        `is only legal in \`events\` positions (it produces a \`() => …\` ` +
        `handler, not a value). Move the operation into an \`events\` entry.`,
      );
    }
    if (!knownChannels.has(binding.channel)) {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} references unknown channel ` +
        `'${binding.channel}' (known: [${[...knownChannels].join(", ")}])`,
      );
    }
    // Operation/valueType compatibility. The valueType is a verbatim TS
    // type string; setCharAt needs a plain string channel, toggleMembership
    // needs an array-capable one (a `T[]` arm, e.g. `string | string[]`).
    const valueType = (channelValueTypes.get(binding.channel) ?? "").trim();
    if (binding.op === "setCharAt") {
      if (valueType !== "string") {
        throw new Error(
          `[${componentName}] DOM ${siteLabel} uses ` +
          `channel:${binding.channel}.onChange:setCharAt(...), which requires ` +
          `a string channel (it sets a character at an index); channel ` +
          `'${binding.channel}' is typed '${valueType || "(unspecified)"}'.`,
        );
      }
    } else if (binding.op === "toggleMembership") {
      if (!looksLikeArrayType(valueType)) {
        throw new Error(
          `[${componentName}] DOM ${siteLabel} uses ` +
          `channel:${binding.channel}.onChange:toggleMembership(...), which ` +
          `requires an array-capable channel (a 'T[]' arm, e.g. ` +
          `'string | string[]'); channel '${binding.channel}' is typed ` +
          `'${valueType || "(unspecified)"}'.`,
        );
      }
    }
    // Each operand inherits the enclosing iteration and prop set; the
    // operation introduces no new scope. Operands are value-shaped
    // (predicates/channels/nested calls already rejected at parse time by
    // `isChannelCallArg`) — recurse with predicates/channelCall disabled.
    for (const operand of binding.operands) {
      validateBindingAgainstScope(
        operand,
        `${siteLabel} channel:${binding.channel}.onChange:${binding.op} operand`,
        knownChannels,
        knownProps,
        enclosingIteration,
        componentName,
        false,
        false,
      );
    }
    return;
  }
  if (binding.kind === "channelCall") {
    if (!allowChannelCall) {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} uses a channel:${binding.channel}` +
        `.onChange(...) call-with-argument binding, but that form is only ` +
        `legal in \`events\` positions (it produces a \`() => setter(arg)\` ` +
        `handler, not a value). Use a plain prop / channel / iter expression ` +
        `at this site, or move the call into an \`events\` entry.`,
      );
    }
    if (!knownChannels.has(binding.channel)) {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} references unknown channel ` +
        `'${binding.channel}' (known: [${[...knownChannels].join(", ")}])`,
      );
    }
    // The argument inherits the enclosing iteration and prop set; a
    // channelCall introduces no new scope. `allowChannelCall=false` on the
    // recursion because a nested channelCall is not a legal payload
    // (`isChannelCallArg` already rejects it at parse time; this is the
    // scope-time belt-and-suspenders). `allowPredicates=false` because the
    // payload is value-shaped, not boolean.
    validateBindingAgainstScope(
      binding.arg,
      `${siteLabel} channel:${binding.channel}.onChange argument`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      false,
      false,
    );
    return;
  }
  if (binding.kind === "channel") {
    if (!knownChannels.has(binding.channel)) {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} references unknown channel ` +
        `'${binding.channel}' (known: [${[...knownChannels].join(", ")}])`,
      );
    }
    return;
  }
  if (binding.kind === "prop") {
    if (!knownProps.has(binding.prop)) {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} references unknown prop ` +
        `'${binding.prop}' (known: [${[...knownProps].join(", ")}]). ` +
        `If this is meant to be an iteration index/item, use 'iter:index' ` +
        `or 'iter:item' and ensure the binding sits inside an enclosing ` +
        `\`iterate\` block.`,
      );
    }
    return;
  }
  if (binding.kind === "iterationLocal") {
    if (!enclosingIteration) {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} uses 'iter:${binding.local}' ` +
        `but the node is not inside any \`iterate\` block. ` +
        `Move the binding under an iterating ancestor, or use a real prop.`,
      );
    }
    if (binding.local === "item" && enclosingIteration.kind !== "array") {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} uses 'iter:item' under a ` +
        `count-kind iteration (over '${enclosingIteration.sourceProp}'). ` +
        `'iter:item' requires \`iterate.kind: "array"\` with an item type; ` +
        `count iteration has no item value. Use 'iter:index' for the loop ` +
        `index, or change the iteration kind.`,
      );
    }
    // BINDING-EXPRESSION-V2-PATH-01: `iter:index` resolves to a `number`
    // and has no object-field projections. Paths are only valid on
    // `iter:item` (and only when the item type is object-shaped — that's
    // not checked here; the framework type-checker enforces it against
    // the iteration's declared `itemType`).
    if (binding.local === "index" && binding.path && binding.path.length > 0) {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} uses ` +
        `'iter:index.${binding.path.join(".")}' but \`iter:index\` resolves ` +
        `to the loop index (a \`number\`); object-field paths are only ` +
        `valid on object-shaped iteration items. Use 'iter:item.${binding.path.join(".")}' ` +
        `if the array's items are objects, or drop the path.`,
      );
    }
    return;
  }
  if (binding.kind === "predicate") {
    // BINDING-EXPRESSION-V2-PREDICATE-01: predicates are boolean-valued.
    // They're admitted only at boolean attribute-binding callsites
    // (`bindings.<attr>`). `content`, `events`, `iterate.source`, and
    // `cssVariableBindings` consume value-shaped expressions; a predicate
    // there is a typed authoring error.
    if (!allowPredicates) {
      throw new Error(
        `[${componentName}] DOM ${siteLabel} uses a predicate:${binding.op} ` +
        `binding, but predicates are only legal in attribute-binding ` +
        `positions (\`bindings.<attr>\`). They produce boolean values and ` +
        `are not value-shaped — use a prop / channel / iter expression at ` +
        `this site, or move the predicate into an attribute binding.`,
      );
    }
    // Operand scope checks. Each operand inherits the enclosing iteration
    // and prop/channel sets; predicates do NOT introduce a new scope. Note
    // we pass `allowPredicates=false` to the recursive calls because
    // operand positions are value-shaped — nested predicates are explicitly
    // held for a future grammar extension.
    validateBindingAgainstScope(
      binding.left,
      `${siteLabel} predicate:${binding.op} left operand`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      false,
    );
    validateBindingAgainstScope(
      binding.right,
      `${siteLabel} predicate:${binding.op} right operand`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      false,
    );
    return;
  }
  if (binding.kind === "conditional") {
    validateBindingAgainstScope(
      binding.condition,
      `${siteLabel} conditional condition`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      true,
    );
    validateBindingAgainstScope(
      binding.whenTrue,
      `${siteLabel} conditional true branch`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      false,
    );
    validateBindingAgainstScope(
      binding.whenFalse,
      `${siteLabel} conditional false branch`,
      knownChannels,
      knownProps,
      enclosingIteration,
      componentName,
      false,
    );
    return;
  }
  // literal: always accepted.
}

// ---------------------------------------------------------------------------
// A11y obligation validation (A11Y-CONTRACT-OBLIGATION-VALIDATOR-01)
// ---------------------------------------------------------------------------

/**
 * Required ARIA attributes for static roles found in `anatomy.dom`.
 *
 * Source fact: WAI-ARIA spec — these attributes are required on the
 * named role and the spec considers their absence an authoring error.
 * Bounded to roles whose absence-of-required-state would mislead
 * assistive tech (e.g. axe / lit-analyzer / svelte-check would flag
 * the resulting rendered DOM as a violation).
 *
 * Applies by: static `attrs.role` value (or, future: a contract-level
 * `details.role` projection onto a DOM node). The walker does not
 * branch on component name. Roles whose required state is contextual
 * (require a containing-role check) are deliberately excluded from
 * this minimal first slice; they belong to a separate slice that
 * understands ARIA role inheritance.
 *
 * Removable when: the IR carries a richer ARIA semantics layer that
 * supersedes a static role/attr lookup (e.g. derives obligations from
 * `contract.a11y.apgPattern` + ancestry analysis).
 */
const ARIA_ROLE_REQUIRED_ATTRS: ReadonlyMap<string, readonly string[]> = new Map([
  // role="option" requires aria-selected to communicate selection state
  // (WAI-ARIA 1.2 §4.3.13). Without it, the option's selection is
  // ambiguous to AT; axe flags this as aria-required-attr.
  ["option", ["aria-selected"]],
]);

/**
 * Walk `anatomy.dom` and assert that every static role with a required
 * ARIA attribute has it declared — either as a static `attrs.X` or as
 * a dynamic `bindings.X`. Returns the suppressed-but-acknowledged
 * obligations as `A11yObligationIR[]` for inspection on the IR; throws
 * on the first unmet, unsuppressed obligation.
 *
 * The throw is descriptive: it names the component, the offending part,
 * the role, the missing attribute, and points the contract author to
 * the two remediation paths (declare the attr, or suppress with reason).
 *
 * No component-name branches. The walker reads `node.attrs.role`,
 * `node.attrs[attr]`, `node.bindings[attr]`, and the contract's
 * `a11y.obligations.suppress`. All decisions follow from those inputs.
 */
function validateDomA11yObligations(
  node: DomNodeIR,
  suppressed: ReadonlyArray<{ role: string; attr: string; reason: string }>,
  componentName: string,
  diagnostics: A11yObligationIR[],
): void {
  const role = node.attrs.role;
  if (role) {
    const requiredAttrs = ARIA_ROLE_REQUIRED_ATTRS.get(role);
    if (requiredAttrs) {
      for (const attr of requiredAttrs) {
        const hasStatic = Object.prototype.hasOwnProperty.call(node.attrs, attr);
        const hasBinding = Object.prototype.hasOwnProperty.call(node.bindings, attr);
        if (hasStatic || hasBinding) continue;
        const matchingSuppression = suppressed.find(
          (s) => s.role === role && s.attr === attr,
        );
        if (matchingSuppression) {
          diagnostics.push({
            role,
            attr,
            reason: matchingSuppression.reason,
            part: node.part,
          });
          continue;
        }
        const partLabel = node.part ? `part="${node.part}"` : `tag="${node.tag}"`;
        throw new Error(
          `[${componentName}] anatomy.dom node (${partLabel}) has ` +
          `\`role="${role}"\` but is missing the required ARIA attribute ` +
          `'${attr}'. WAI-ARIA requires this attribute on \`role="${role}"\`; ` +
          `assistive tech and a11y validators (axe, svelte-check, ` +
          `lit-analyzer) flag its absence. To resolve, either:\n` +
          `  1. Declare the attribute under \`attrs\` (static) or ` +
          `\`bindings\` (dynamic). Static is appropriate when every ` +
          `rendered instance carries the same state (e.g. a ` +
          `selected-items-only listbox).\n` +
          `  2. If the contract cannot yet truthfully declare the ` +
          `attribute (e.g. per-item selection state needs grammar that ` +
          `hasn't landed), add an explicit suppression under ` +
          `\`a11y.obligations.suppress\` with a reason citing the ` +
          `upstream blocker.`,
        );
      }
    }
  }
  for (const child of node.children) {
    validateDomA11yObligations(child, suppressed, componentName, diagnostics);
  }
}

// ---------------------------------------------------------------------------
// DOM tree
// ---------------------------------------------------------------------------

/**
 * Parse the contract's optional `anatomy.dom` block into a `DomNodeIR` tree.
 * Returns `undefined` for contracts that omit the field — emitters fall back
 * to their existing single-root output in that case.
 */
function buildDomTree(contract: ComponentContract): DomNodeIR | undefined {
  if (!contract.anatomy || Array.isArray(contract.anatomy)) return undefined;
  const dom = contract.anatomy.dom;
  if (!dom) return undefined;
  const root = parseDomNode(dom);
  // Post-walk: rewrite legacy `prop:index` / `prop:item` references that sit
  // inside an iteration scope to their `iterationLocal` semantic equivalent.
  // Done as a separate pass because `parseDomNode` recurses bottom-up — a
  // child's bindings are constructed before the parent's `iterate` block is
  // resolved, so promotion cannot happen during the initial walk.
  promoteIterationLocalsInTree(root, undefined);
  return root;
}

/**
 * Set of HTML attribute names that may legitimately pass THROUGH to a composed
 * component as host attributes (not props). Kept deliberately small — the rule
 * is "name the target's prop"; passthrough is the escape hatch for genuine
 * host attributes (analytics/test hooks) that no component models as a prop.
 */
const REF_HOST_ATTR_PREFIXES = ["data-", "aria-"] as const;

function isRefHostAttribute(name: string): boolean {
  return REF_HOST_ATTR_PREFIXES.some((p) => name.startsWith(p));
}

/**
 * Walk the dom tree and resolve every `componentRef` node into a typed
 * `ComponentInstanceIR` (CODEGEN-RECURSIVE-COMPOSITION-01). For each ref:
 *   1. Resolve the target contract from the corpus (throw if unknown).
 *   2. Enforce layer ordering: target layer ≤ host layer (throw otherwise).
 *   3. Classify each binding/attr against the target's prop surface:
 *        - matches a target prop → kind:"prop" (targetProp = that prop name).
 *        - else a valid host attribute (data-/aria-) → kind:"attribute".
 *        - else → throw (the contract named neither a target prop nor a host
 *          attribute — fail loud, normal-form property 5).
 *   4. Events pass through as component callbacks (not prop-classified).
 * Mutates the tree in place (fresh out of buildDomTree, not yet exposed).
 */
function resolveComponentInstances(
  node: DomNodeIR,
  host: ComponentContract,
  allContracts: ReadonlyMap<string, ComponentContract>,
): void {
  if (node.componentRef !== undefined) {
    const ref = node.componentRef;
    const target = allContracts.get(ref);
    if (!target) {
      throw new Error(
        `${host.name}: componentRef "fsds.${ref}" does not resolve to a known ` +
          `component contract. Every referenced component must exist in the corpus.`,
      );
    }
    const hostRank = host.layer ? LAYER_ORDER[host.layer] : undefined;
    const targetRank = target.layer ? LAYER_ORDER[target.layer] : undefined;
    if (hostRank !== undefined && targetRank !== undefined && targetRank > hostRank) {
      throw new Error(
        `${host.name}: componentRef "fsds.${ref}" targets a higher layer ` +
          `(${target.layer}) than this ${host.layer} component. A component may ` +
          `only reference a lower-or-equal layer in the ladder ` +
          `primitive < compound < composer < assembly.`,
      );
    }
    const targetProps = new Set(getPropMembers(target).map((p) => p.name));

    const classify = (
      sourceAttr: string,
    ): { kind: "prop" | "attribute"; targetProp?: string } => {
      if (targetProps.has(sourceAttr)) {
        return { kind: "prop", targetProp: sourceAttr };
      }
      if (isRefHostAttribute(sourceAttr)) {
        return { kind: "attribute" };
      }
      throw new Error(
        `${host.name}: componentRef "fsds.${ref}" binds "${sourceAttr}", which ` +
          `is neither a declared prop on ${ref} nor a host attribute (data-*/aria-*). ` +
          `componentRef bindings must name the TARGET component's prop directly ` +
          `(e.g. bind "invalid", not "aria-invalid", when ${ref} exposes an ` +
          `"invalid" prop). Declared ${ref} props: ${[...targetProps].join(", ") || "(none)"}.`,
      );
    };

    const bindings: ResolvedRefBinding[] = Object.entries(node.bindings).map(
      ([sourceAttr, expr]) => ({ ...classify(sourceAttr), sourceAttr, expr }),
    );
    const attrs: ResolvedRefAttr[] = Object.entries(node.attrs).map(
      ([sourceAttr, value]) => ({ ...classify(sourceAttr), sourceAttr, value }),
    );
    const events: ResolvedRefEvent[] = Object.entries(node.events).map(
      ([name, expr]) => {
        // Resolve the event to the target's handler prop when declared
        // (`click` → `onClick`), so component-event-as-prop emitters (Svelte 5)
        // target the right name. `change` → `onChange`, etc.
        const handlerProp = `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
        return {
          name,
          targetHandlerProp: targetProps.has(handlerProp) ? handlerProp : undefined,
          expr,
        };
      },
    );

    node.componentInstance = {
      ref,
      targetLayer: target.layer,
      bindings,
      attrs,
      events,
    };
  }
  for (const child of node.children) {
    resolveComponentInstances(child, host, allContracts);
  }
}

/**
 * Walk the IR tree and promote `prop:X` bindings to `iterationLocal` when
 * `X` matches the enclosing iteration's declared `indexVar` or `itemVar`.
 * Nested iterations resolve to the nearest enclosing scope (the inner
 * iteration shadows the outer one's locals, just like JS closures).
 *
 * Mutates in place — the IR is fresh out of `parseDomNode` and not yet
 * exposed. Returning a new tree would cost an unnecessary copy.
 *
 * Scope rule, from the user's spec:
 * - `prop:index` / `prop:item` outside any iteration → left untouched
 *   (validation will catch it later if no such prop is declared).
 * - Inside iteration declaring `indexVar: "index"`, `prop:index` →
 *   `{ kind: "iterationLocal", local: "index" }`.
 * - Inside iteration declaring `indexVar: "dayIndex"`, `prop:dayIndex` →
 *   same. `prop:index` would NOT promote (the literal "index" doesn't
 *   match the iteration's declared name).
 * - Count iteration has no `itemVar`, so `prop:item` is never promoted
 *   under it. Authors who write `iter:item` under count get a typed
 *   error from `validateDomNode`.
 */
function promoteIterationLocalsInTree(
  node: DomNodeIR,
  enclosing: IterationIR | undefined,
): void {
  // The iterating node itself is part of the iteration scope: its own
  // bindings/events/content/cssVarBindings can reference the locals it
  // introduces. So we resolve the active scope BEFORE rewriting this
  // node's own fields.
  const active = node.iteration ?? enclosing;
  if (active) {
    for (const [attr, binding] of Object.entries(node.bindings)) {
      node.bindings[attr] = promoteIterationLocals(binding, active);
    }
    for (const [evt, binding] of Object.entries(node.events)) {
      node.events[evt] = promoteIterationLocals(binding, active);
    }
    if (node.content !== undefined && !isContentTransform(node.content)) {
      node.content = promoteIterationLocals(node.content, active);
    }
    for (const css of node.cssVarBindings) {
      css.value = promoteIterationLocals(css.value, active);
    }
  }
  for (const child of node.children) {
    promoteIterationLocalsInTree(child, active);
  }
}

/**
 * Strip the `fsds.` prefix from a `componentRef` string, returning the bare
 * component name (e.g. `"fsds.Button"` → `"Button"`). Throws on a malformed
 * reference so contract authors get a clear redirect rather than a silently
 * empty import. The schema's pattern already gates this, but the IR builder
 * also runs over hand-constructed contracts in tests, so the check is real.
 */
function stripComponentRefPrefix(ref: string, context: string): string {
  const match = /^fsds\.([A-Z][A-Za-z0-9]*)$/.exec(ref);
  if (!match) {
    throw new Error(
      `${context}: componentRef "${ref}" is malformed. It must be ` +
        `"fsds.<Name>" where <Name> is a PascalCase component name ` +
        `(e.g. "fsds.Button", "fsds.Input").`,
    );
  }
  return match[1];
}

/**
 * Closed set of DOM-property-only facts — keys with no HTML attribute form
 * at all, that must be set via an imperative JS property assignment
 * (`el.<key> = value`). Authoring one of these under `bindings` hard-fails
 * with a redirect to `properties` (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-
 * INDETERMINATE-01). `indeterminate` is the only member today; extend this
 * set when a future contract needs another property-only fact — do not
 * special-case the component name that happens to use it.
 */
const DOM_PROPERTY_ONLY_KEYS = new Set<string>(["indeterminate"]);

/**
 * Host-eligibility for each DOM-property-only key: the exact `(tag, static
 * attrs)` shape the property is meaningful on. `indeterminate` is a real DOM
 * property on `HTMLInputElement`, but browsers only honor it for
 * `type="checkbox"` — setting it on any other tag/input-type is a silent
 * no-op, which is exactly the failure mode this closed set exists to catch
 * at IR-build time instead of downstream in framework output or a browser
 * (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01). Extend per-key
 * when a future property-only fact is added; do not special-case component
 * names or genericize into open pattern matching.
 */
const DOM_PROPERTY_HOST_REQUIREMENTS: Record<
  string,
  { tag: string; attrs: Record<string, string> }
> = {
  indeterminate: { tag: "input", attrs: { type: "checkbox" } },
};

function parseDomNode(node: ContractDomNode): DomNodeIR {
  // A node declares EITHER a native `tag` OR a `componentRef` to another
  // design-system component, never both. The schema's `oneOf` enforces this
  // for file-loaded contracts; the IR builder re-checks because it also runs
  // over hand-constructed contracts (tests) that bypass schema validation.
  if (node.componentRef !== undefined && node.tag !== undefined) {
    throw new Error(
      `anatomy.dom node (part="${node.part ?? "?"}"): declares both \`tag\` ` +
        `("${node.tag}") and \`componentRef\` ("${node.componentRef}"). These ` +
        `are mutually exclusive — a node renders either a native tag or a ` +
        `referenced component, not both.`,
    );
  }
  if (node.componentRef === undefined && node.tag === undefined) {
    throw new Error(
      `anatomy.dom node (part="${node.part ?? "?"}"): declares neither \`tag\` ` +
        `nor \`componentRef\`. Exactly one is required.`,
    );
  }
  const componentRef =
    node.componentRef !== undefined
      ? stripComponentRefPrefix(
          node.componentRef,
          `anatomy.dom node (part="${node.part ?? "?"}")`,
        )
      : undefined;
  // Authors interact with three sibling fields, each with a distinct
  // semantic shape that the framework emitters lower idiomatically:
  //   bindings — attribute bindings (aria-label, disabled, src, …)
  //   events   — event-handler bindings (keyed by unprefixed event name)
  //   content  — single inner-content binding (BindingExpression)
  //
  // The IR-DOM-BINDING-CAPABILITY-01 capability stack was built to make
  // these three shapes the *only* portable authoring path. The previous
  // single-bag `bindings` field collapsed all three into one map — that
  // shape worked on React/Vue (JSX/templates accept arbitrary props) but
  // broke Angular (template parser rejects `[children]=` / `onClick=`)
  // and Lit (function-typed callbacks were silently dropped from
  // attribute decorators). Earlier steps shipped a back-compat
  // dual-pathway translation so the migration could land emitter-by-
  // emitter; step 4C removes it. Legacy shapes now hard-fail with an
  // actionable error message so contract authors get redirected
  // explicitly to the canonical field.
  const bindings: Record<string, BindingExpression> = {};
  if (node.bindings) {
    // Native input type changes sanitize the current value. Preserve the
    // authored value by realizing type first, regardless of JSON key order.
    const entries = Object.entries(node.bindings);
    if (node.tag === "input") entries.sort(([a], [b]) => Number(b === "type") - Number(a === "type"));
    for (const [attr, expr] of entries) {
      if (/^on[A-Z]/.test(attr)) {
        const suggestedEvent = attr.slice(2).toLowerCase();
        throw new Error(
          `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}"): ` +
            `bindings.${attr} is an event-shaped key. Move it under the ` +
            `\`events\` field as { "${suggestedEvent}": "${expr}" }. Event ` +
            `handlers are not portable as attribute bindings across all five ` +
            `framework emitters (Angular rejects them, Lit drops the prop). ` +
            `This used to be auto-translated; the back-compat path was ` +
            `removed in IR-DOM-BINDING-CAPABILITY-01/4C.`,
        );
      }
      if (attr === "children" || attr === "textContent") {
        throw new Error(
          `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}"): ` +
            `bindings.${attr} smuggles inner content through an attribute ` +
            `slot. Use the top-level \`content\` field instead: ` +
            `{ "content": "${expr}" }. This used to be auto-translated; the ` +
            `back-compat path was removed in IR-DOM-BINDING-CAPABILITY-01/4C.`,
        );
      }
      if (DOM_PROPERTY_ONLY_KEYS.has(attr)) {
        throw new Error(
          `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}"): ` +
            `bindings.${attr} is a DOM-property-only binding — "${attr}" has ` +
            `no HTML attribute form and cannot be expressed by any framework's ` +
            `attribute-binding syntax. Move it to \`properties\` instead: ` +
            `{ "${attr}": "${expr}" } under the sibling \`properties\` field. ` +
            `(DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01)`,
        );
      }
      bindings[attr] = parseDomBindingExpression(expr);
    }
  }
  const propertyBindings: Record<string, BindingExpression> = {};
  if (node.properties) {
    for (const [prop, expr] of Object.entries(node.properties)) {
      propertyBindings[prop] = parseBindingExpression(expr);
    }
  }
  const events: Record<string, BindingExpression> = {};
  if (node.events) {
    for (const [evt, expr] of Object.entries(node.events)) {
      events[evt] = parseBindingExpression(expr);
    }
  }
  const children = (node.children ?? []).map(parseDomNode);
  const content = parseContentDirective(node.content, node);
  if (content !== undefined && children.length > 0) {
    throw new Error(
      `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}"): ` +
        `\`content\` and \`children\` are mutually exclusive on the same node. ` +
        `Wrap the content value in its own child node if you need both.`,
    );
  }
  const iteration = parseIterate(node);
  if (iteration && content !== undefined) {
    throw new Error(
      `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}"): ` +
        `\`iterate\` and \`content\` are mutually exclusive on the same node. ` +
        `Wrap the content value in a child node and put \`iterate\` on the wrapper.`,
    );
  }
  const iconGlyph = parseIconGlyph(node);
  if (iconGlyph) {
    if (children.length > 0 || content !== undefined || iteration !== undefined) {
      throw new Error(
        `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}"): ` +
          `\`iconGlyph\` is mutually exclusive with \`children\`, \`content\`, ` +
          `and \`iterate\` — the glyph directive owns the svg's entire subtree ` +
          `(viewBox + <path> children come from the icon catalog).`,
      );
    }
  }
  const cssVarBindings = parseCssVarBindings(node);
  if (cssVarBindings.length > 0 && node.attrs?.style !== undefined) {
    throw new Error(
      `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}"): ` +
        `\`cssVariableBindings\` and a literal \`attrs.style\` cannot both be ` +
        `set on the same node — emitters cannot reconcile a literal style ` +
        `string with structured custom-property bindings. Move the literal ` +
        `style declarations into a CSS rule, or merge them into ` +
        `\`cssVariableBindings\`.`,
    );
  }
  return {
    // A componentRef node carries its component name on `componentRef` and a
    // normalized empty `tag`; emitters discriminate on `componentRef !==
    // undefined` (the fourth case alongside tag === "slot"/"children"/<html>).
    tag: componentRef !== undefined ? "" : (node.tag as string),
    componentRef,
    // `name` is meaningful only for slot sentinels. Carry it through the IR so
    // each framework emitter can render the matching named-slot idiom.
    slotName: node.tag === "slot" ? node.name : undefined,
    part: node.part,
    attrs: node.attrs ?? {},
    bindings,
    propertyBindings,
    events,
    content,
    children,
    ...parseIfGuard(node.if),
    iteration,
    cssVarBindings,
    iconGlyph,
    generatedIdSlug: undefined,
    idRefAttrs: [],
  };
}

/**
 * Parse a `content` directive on a contract DOM node. The string form is a
 * plain binding expression; the object form is a content-transform directive
 * (FEAT-CODEBLOCK-HIGHLIGHT-01) resolved into `ContentTransformIR`.
 *
 * Structural rules enforced here: the transform name is in the closed set;
 * `source`/`language`/`gate` are bare `prop:` bindings (no paths, no
 * channels, no literals — the transform consumes declared prop values
 * only); `highlight` REQUIRES `language` and `tokenPart`. Prop
 * existence/type validation and the tokenPart anatomy check are deferred to
 * `validateDomNode` where the prop surface and anatomy are available.
 */
function parseContentDirective(
  content: string | ContractContentTransform | undefined,
  node: ContractDomNode,
): BindingExpression | ContentTransformIR | undefined {
  if (content === undefined) return undefined;
  if (typeof content === "string") return parseBindingExpression(content);
  const where = `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}")`;
  if (content.transform !== "highlight" && content.transform !== "markdown") {
    throw new Error(
      `${where}: content.transform "${(content as { transform: string }).transform}" is not admitted. ` +
        `The transform set is closed; "highlight" and "markdown" are the admitted transforms.`,
    );
  }
  const parseTransformBinding = (
    expr: string | undefined,
    field: string,
  ): PropBindingExpression => {
    if (expr === undefined) {
      throw new Error(
        `${where}: content-transform "${content.transform}" requires \`${field}\`.`,
      );
    }
    const binding = parseBindingExpression(expr);
    if (binding.kind !== "prop" || binding.path !== undefined) {
      throw new Error(
        `${where}: content.${field} must be a bare prop binding ` +
          `("prop:<name>"); got "${expr}". Channels, literals, and paths ` +
          `are not admitted as content-transform inputs.`,
      );
    }
    return binding;
  };
  const source = parseTransformBinding(content.source, "source");
  const gate =
    content.gate !== undefined
      ? parseTransformBinding(content.gate, "gate")
      : undefined;

  if (content.transform === "markdown") {
    const md = content;
    const requirePartMap = <T extends Record<string, string | undefined>>(
      map: T | undefined,
      field: string,
      keys: readonly string[],
    ): Record<string, string> => {
      if (map === undefined || typeof map !== "object") {
        throw new Error(
          `${where}: content-transform "markdown" requires \`${field}\` mapping every vocabulary kind to an anatomy part.`,
        );
      }
      const out: Record<string, string> = {};
      for (const key of keys) {
        const part = map[key];
        if (typeof part !== "string" || part.length === 0) {
          throw new Error(
            `${where}: content.${field}.${key} must name the anatomy part realized for "${key}".`,
          );
        }
        out[key] = part;
      }
      return out;
    };
    const blockParts = requirePartMap(
      md.blockParts as unknown as Record<string, string | undefined> | undefined,
      "blockParts",
      ["heading", "paragraph", "unorderedList", "orderedList", "listItem", "codeBlock", "blockquote"],
    );
    const markParts = requirePartMap(
      md.markParts as unknown as Record<string, string | undefined> | undefined,
      "markParts",
      ["emphasis", "strong", "code", "link"],
    );
    return {
      transform: "markdown",
      source,
      sourceProp: source.prop,
      gate,
      gateProp: gate?.prop,
      blockParts: blockParts as unknown as MarkdownBlockParts,
      markParts: markParts as unknown as MarkdownMarkParts,
      // Enriched from anatomy details once the tree is attached to its
      // component (see enrichMarkdownTagsInTree); grammar-contract tags
      // as the interim defaults so the object is always total.
      blockTags: {
        heading: "h2",
        paragraph: "p",
        unorderedList: "ul",
        orderedList: "ol",
        listItem: "li",
        codeBlock: "pre",
        blockquote: "blockquote",
      },
      markTags: { emphasis: "em", strong: "strong", code: "code", link: "a" },
    };
  }

  const language = parseTransformBinding(content.language, "language");
  const tokens = content.tokens !== undefined ? parseTransformBinding(content.tokens, "tokens") : undefined;
  const lineNumbers = content.lineNumbers !== undefined ? parseTransformBinding(content.lineNumbers, "lineNumbers") : undefined;
  if (!content.tokenPart) {
    throw new Error(
      `${where}: content-transform "highlight" requires \`tokenPart\` ` +
        `naming the anatomy part realized as one span per token.`,
    );
  }
  return {
    transform: "highlight",
    source,
    sourceProp: source.prop,
    language,
    languageProp: language.prop,
    gate,
    gateProp: gate?.prop,
    tokenPart: content.tokenPart,
    tokens,
    tokensProp: tokens?.prop,
    lineNumbers,
    lineNumbersProp: lineNumbers?.prop,
    linePart: content.linePart,
    gutterPart: content.gutterPart,
  };
}

/**
 * Resolve every markdown transform's tag tables from the component's
 * anatomy details (part name -> declared tag). Runs once per IR build,
 * before validation, so emitters consume only IR facts. Uses the
 * grammar-contract tags when a part omits its tag (the validator rejects
 * non-contract tags separately).
 */
function enrichMarkdownTagsInTree(
  node: DomNodeIR | undefined,
  anatomyDetails: Record<string, ContractPartDetails>,
): void {
  if (!node) return;
  const content = node.content;
  if (
    content !== undefined &&
    (content as ContentTransformIR).transform === "markdown"
  ) {
    const transform = content as MarkdownTransformIR;
    for (const kind of Object.keys(transform.blockParts) as Array<
      keyof MarkdownBlockParts
    >) {
      const tag = anatomyDetails[transform.blockParts[kind]]?.tag;
      if (tag) transform.blockTags[kind] = tag;
    }
    for (const kind of Object.keys(transform.markParts) as Array<
      keyof MarkdownMarkParts
    >) {
      const tag = anatomyDetails[transform.markParts[kind]]?.tag;
      if (tag) transform.markTags[kind] = tag;
    }
  }
  for (const child of node.children) enrichMarkdownTagsInTree(child, anatomyDetails);
}

/**
 * Parse an `iconGlyph` block on a contract DOM node into `IconGlyphIR`.
 * Returns `undefined` when no glyph directive is declared.
 *
 * Structural rules enforced here: host must be a literal `svg` tag;
 * `nameFrom`/`sizeFrom` must be bare `prop:` bindings; the svg must not
 * author its own `viewBox`/`width`/`height`/`data-fsds-icon` attrs (those
 * are owned by the glyph lowering). Prop existence/type validation is
 * deferred to `validateDomNode` where the prop surface is available.
 */
function parseIconGlyph(node: ContractDomNode): IconGlyphIR | undefined {
  if (!node.iconGlyph) return undefined;
  const where = `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}")`;
  if (node.tag !== "svg") {
    throw new Error(
      `${where}: \`iconGlyph\` is only valid on a \`tag: "svg"\` node — the ` +
        `directive renders svg path children from the icon catalog.`,
    );
  }
  const glyphOwnedAttrs = ["viewBox", "width", "height", "data-fsds-icon"];
  for (const attr of glyphOwnedAttrs) {
    if (node.attrs?.[attr] !== undefined || node.bindings?.[attr] !== undefined) {
      throw new Error(
        `${where}: \`iconGlyph\` owns the svg's \`${attr}\` — it is derived ` +
          `from the resolved glyph at runtime. Remove the authored ` +
          `attr/binding.`,
      );
    }
  }
  const parseGlyphPropBinding = (
    expr: string,
    field: string,
  ): BindingExpression & { kind: "prop" } => {
    const parsed = parseBindingExpression(expr);
    if (parsed.kind !== "prop" || (parsed.path && parsed.path.length > 0)) {
      throw new Error(
        `${where}: iconGlyph.${field} must be a bare \`prop:<name>\` binding; ` +
          `got "${expr}".`,
      );
    }
    return parsed as BindingExpression & { kind: "prop" };
  };
  const nameFrom = parseGlyphPropBinding(node.iconGlyph.nameFrom, "nameFrom");
  const sizeFrom =
    node.iconGlyph.sizeFrom !== undefined
      ? parseGlyphPropBinding(node.iconGlyph.sizeFrom, "sizeFrom")
      : undefined;
  if (node.iconGlyph.sizeHints !== undefined && sizeFrom === undefined) {
    throw new Error(
      `${where}: iconGlyph.sizeHints without iconGlyph.sizeFrom is ` +
        `meaningless — hints map the size prop's values to pixels.`,
    );
  }
  return {
    nameFrom,
    namePropName: nameFrom.prop,
    sizeFrom,
    sizePropName: sizeFrom?.prop,
    sizeHints: node.iconGlyph.sizeHints,
  };
}

/**
 * Parse an `iterate` block on a contract DOM node into `IterationIR`.
 * Returns `undefined` when no iteration is declared.
 *
 * Type validation (count → number prop; array → array-typed prop with
 * `itemType`) is deferred to `validateDomNode` where `styledProps` is
 * available. This function enforces only the structural rules: source must
 * be a `prop:` binding; kind must be 'count' or 'array'; array iteration
 * requires `itemType`.
 */
function parseIterate(node: ContractDomNode): IterationIR | undefined {
  if (!node.iterate) return undefined;
  const it = node.iterate;
  const source = parseBindingExpression(it.source);
  // Accepted sources:
  //   - `prop:X`        — raw prop reference (must exist; validated later)
  //   - `channel:X.value` — the resolved channel value (must be a known channel)
  // Other kinds are not meaningful for iteration:
  //   - `literal:` would iterate over a string constant, never useful
  //   - `iter:`    would refer to an outer iteration local (and require
  //                outer-scope addressing, which V2 explicitly excludes)
  //   - `channel:X.{onChange,defaultValue}` aren't iterable values
  // The IR's `sourceProp` denotes the *underlying styled prop name* — the
  // prop whose declared type (array vs number) the validator constrains.
  // For `prop:X` that's just X. For `channel:X.value` we resolve X to the
  // channel's `valueProp` at validation time, because the channel
  // registry isn't available here in `parseIterate`. We carry the channel
  // name on `source` and the validator looks it up — see `validateDomNode`.
  // The runtime identifier (post-channel-resolution; what each framework
  // actually emits in the loop wrapper) is NOT this string — emitters
  // route `source` through their binding-value renderer at emit time.
  let sourceProp: string;
  if (source.kind === "prop") {
    sourceProp = source.prop;
  } else if (source.kind === "channel" && source.field === "value") {
    // The validator resolves the channel to its valueProp.
    sourceProp = "";
  } else {
    throw new Error(
      `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}"): ` +
        `iterate.source must be a prop: or channel:<name>.value binding ` +
        `(got "${it.source}"). literal:, iter:, and predicate: sources, ` +
        `and the onChange/defaultValue fields of channels, are not ` +
        `iterable.`,
    );
  }
  // BINDING-EXPRESSION-V2-PATH-01 explicitly excludes paths on the
  // iteration root: the iterable must be the raw prop / channel value,
  // not a projection. A future slice may relax this (e.g. to iterate
  // over `prop:groups.items` once nested-array semantics are designed),
  // but until then a path-on-source is rejected so contract authors
  // don't unintentionally rely on path resolution at the iteration
  // boundary.
  if (source.path !== undefined && source.path.length > 0) {
    throw new Error(
      `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}"): ` +
        `iterate.source must be a bare prop:<name> or channel:<name>.value ` +
        `binding (got "${it.source}"). Property paths on the iteration ` +
        `source are not supported in this slice — they are reserved for ` +
        `a future nested-iteration grammar.`,
    );
  }
  if (it.kind === "array" && (it.itemType === undefined || it.itemType.trim() === "")) {
    throw new Error(
      `anatomy.dom node (tag="${node.tag}", part="${node.part ?? "?"}"): ` +
        `iterate.kind="array" requires \`itemType\` to be set. Each emitter ` +
        `needs the item's TypeScript type to generate typed loop variables.`,
    );
  }
  return {
    kind: it.kind,
    source,
    sourceProp,
    indexVar: it.indexVar ?? "index",
    itemVar: it.kind === "array" ? (it.itemVar ?? "item") : undefined,
    itemType: it.kind === "array" ? it.itemType : undefined,
  };
}

/**
 * Parse `cssVariableBindings` into an ordered array of `CssVarBindingIR`.
 * Loose schema-level checks (the `--fsds-…` prefix) are tightened to the
 * component-specific form `^--fsds-${cssPrefix}(-…)+$` in `validateDomNode`.
 */
function parseCssVarBindings(node: ContractDomNode): CssVarBindingIR[] {
  if (!node.cssVariableBindings) return [];
  return Object.entries(node.cssVariableBindings).map(([varName, expr]) => ({
    varName,
    value: parseDomBindingExpression(expr),
  }));
}

/**
 * Parse the contract's `if` field into `{ ifProp, ifNegated }`. Supports two
 * shapes:
 *   - `"src"`      → `{ ifProp: "src",      ifNegated: false }`  (existing)
 *   - `"!src"`     → `{ ifProp: "src",      ifNegated: true  }`  (new)
 *   - `"children"` → `{ ifProp: "children", ifNegated: false }`  (special content insertion)
 *   - undefined    → `{ ifProp: undefined,  ifNegated: false }`
 *
 * Why negation lives here, not as a general expression: the contract's
 * render-guard grammar is deliberately minimal so all five emitter ports
 * (React, Vue, Svelte, Angular, Lit) share one trivial code path. `!` is
 * symmetric — every framework knows how to negate a boolean. Going further
 * (`&&`, `||`, equality) would force the IR to carry an expression tree
 * and each emitter to walk it. Not worth it for current contract needs.
 */
function parseIfGuard(
  value: string | undefined,
): { ifProp: string | undefined; ifNegated: boolean; ifSlot?: string } {
  if (!value) return { ifProp: undefined, ifNegated: false };
  const ifNegated = value.startsWith("!");
  const name = ifNegated ? value.slice(1) : value;
  if (name.startsWith("slot:")) {
    return { ifProp: undefined, ifNegated, ifSlot: name.slice("slot:".length) };
  }
  return { ifProp: name, ifNegated };
}

function subtreeHasNamedSlot(node: DomNodeIR, name: string): boolean {
  if (node.tag === "slot" && node.slotName === name) return true;
  return node.children.some((child) => subtreeHasNamedSlot(child, name));
}

/**
 * Parse a binding expression string into its structured form.
 *
 * Grammar (regex-friendly):
 *   binding := "prop:" name path?
 *            | "channel:" name "." field path?
 *            | "literal:" value
 *            | "iter:" local path?
 *   field   := "value" | "onChange" | "defaultValue"
 *   local   := "index" | "item"
 *   path    := ("." segment)+
 *   segment := identifier ([A-Za-z_$][\w$]*)
 *
 * Path constraint (BINDING-EXPRESSION-V2-PATH-01): path is object-field
 * projection only. Empty segments (`a..b`, `a.`), bracket access (`a[0]`),
 * optional chaining (`a?.b`), and any operator (`?? x`, `=== x`, `()`) are
 * syntactically rejected — the expression falls through to `literal` so
 * downstream emit shows the malformed string in output instead of
 * silently lowering to garbage. Validators (`validateBindingAgainstScope`,
 * `iter:index` typing) consume the parsed form and decide semantic
 * legality (e.g. `iter:index.foo` is a type error: index is `number`).
 *
 * Channel-path constraint: only `channel:X.value.<seg>+` is well-formed.
 * `channel:X.onChange.foo` and `channel:X.defaultValue.foo` parse-fail
 * because `.onChange` is a callback (no value-shaped projection) and
 * `.defaultValue` is the default itself (the *initial* value, not a
 * read-after-defaulting projection). Paths on those fields are reserved
 * for a future predicate slice if ever needed.
 *
 * Anything not matching falls through as a literal so contracts that
 * misspell don't silently produce empty output. Consumers should still
 * treat parse errors as authoring bugs.
 *
 * `iter:` resolution is semantic: `iter:index` always refers to the
 * enclosing iteration's loop-index role, regardless of whether that
 * iteration named its `indexVar` something other than the default
 * `"index"`. The lexical-variable lookup is the emitter's job —
 * `parseBindingExpression` only attaches the role.
 *
 * Scope validation (no enclosing iteration; `iter:item` under count
 * iteration) and typing (`iter:index` is `number`, not an object) happen
 * in `validateDomNode`, not here, because this function is context-free.
 */
export function parseBindingExpression(expr: string): BindingExpression {
  const conditionalMatch = expr.match(/^conditional:(.*)$/);
  if (conditionalMatch) {
    const parsed = tryParseConditional(conditionalMatch[1]);
    if (parsed) return parsed;
  }

  if (expr.startsWith("project:selectionLabel")) {
    const match = expr.match(/^project:selectionLabel\(([^,]+),\s*([^,]+),\s*([^,]+)\)$/);
    if (!match) throw new Error("selectionLabel requires options, selection and fallback operands");
    const [source, selection, fallback] = match.slice(1).map(value => parseBindingExpression(value.trim()));
    if (source.kind !== "prop" || selection.kind !== "channel" || selection.field !== "value" || (fallback.kind !== "prop" && fallback.kind !== "literal")) {
      throw new Error("selectionLabel requires a prop collection, a channel value and a prop or literal fallback");
    }
    return { kind: "projection", op: "selectionLabel", source, selection, fallback };
  }

  const projectionMatch = expr.match(
    /^project:(dateDayOfMonth)\((.*)\)$/,
  );
  if (projectionMatch) {
    const source = parseBindingExpression(projectionMatch[2]);
    if (
      source.kind === "prop" ||
      source.kind === "channel" ||
      source.kind === "iterationLocal"
    ) {
      return {
        kind: "projection",
        op: projectionMatch[1] as "dateDayOfMonth",
        source,
      };
    }
  }

  // Path: zero or more `.segment` tails. Anchored to consume the rest of
  // the string after the root so an unexpected suffix (operators, brackets,
  // optional chaining) falls through to `literal` instead of being
  // silently truncated.
  const pathTail = /(?:\.[A-Za-z_$][\w$]*)*/.source;
  const propMatch = expr.match(new RegExp(`^prop:([A-Za-z_$][\\w$-]*)(${pathTail})$`));
  if (propMatch) {
    return { kind: "prop", prop: propMatch[1], ...buildPathField(propMatch[2]) };
  }
  // Channel paths only apply to `.value`; `.onChange` and `.defaultValue`
  // refuse a tail by construction (the regex does not allow it).
  const channelValueMatch = expr.match(
    new RegExp(`^channel:([A-Za-z_$][\\w$-]*)\\.value(${pathTail})$`),
  );
  if (channelValueMatch) {
    return {
      kind: "channel",
      channel: channelValueMatch[1],
      field: "value",
      ...buildPathField(channelValueMatch[2]),
    };
  }
  // FEAT-CHANNEL-UPDATE-OPERATIONS-01: `channel:X.onChange:<op>(<operands>)`.
  // Matched BEFORE the plain channelCall form so the `:op` segment is not
  // read as trailing garbage on a bare `.onChange`. The operation name and
  // operand arity/types are validated by `tryParseChannelUpdate`; any
  // malformed shape (unknown op, wrong arity, non-value-shaped operand)
  // returns null and the whole form falls through to a literal so the
  // authoring error appears verbatim in output.
  const channelUpdateMatch = expr.match(
    /^channel:([A-Za-z_$][\w$-]*)\.onChange:([A-Za-z][A-Za-z0-9]*)\((.*)\)$/,
  );
  if (channelUpdateMatch) {
    const parsed = tryParseChannelUpdate(
      channelUpdateMatch[1],
      channelUpdateMatch[2],
      channelUpdateMatch[3],
    );
    if (parsed) return parsed;
    // Malformed operation form — fall through to literal below.
  }
  // FEAT-BINDING-CALL-WITH-ARG-01: `channel:X.onChange(<argExpr>)`. Matched
  // BEFORE the bare-callback form so the parenthesized call is not read as a
  // bare `.onChange` with trailing garbage. The inner argument is parsed
  // recursively and must be a value-shaped payload kind (`iterationLocal`,
  // `prop`, `literal`); anything else (channel, predicate, conditional,
  // nested channelCall) is rejected and the whole form falls through to a
  // literal so the authoring error appears verbatim in output.
  const channelCallMatch = expr.match(
    /^channel:([A-Za-z_$][\w$-]*)\.onChange\((.*)\)$/,
  );
  if (channelCallMatch) {
    const parsed = tryParseChannelCall(channelCallMatch[1], channelCallMatch[2]);
    if (parsed) return parsed;
    // Malformed argument — fall through to literal below.
  }
  const channelCallbackMatch = expr.match(
    /^channel:([A-Za-z_$][\w$-]*)\.(onChange|defaultValue)$/,
  );
  if (channelCallbackMatch) {
    return {
      kind: "channel",
      channel: channelCallbackMatch[1],
      field: channelCallbackMatch[2] as "onChange" | "defaultValue",
    };
  }
  const literalMatch = expr.match(/^literal:(.*)$/);
  if (literalMatch) {
    return { kind: "literal", value: literalMatch[1] };
  }
  const iterMatch = expr.match(new RegExp(`^iter:(index|item)(${pathTail})$`));
  if (iterMatch) {
    return {
      kind: "iterationLocal",
      local: iterMatch[1] as "index" | "item",
      ...buildPathField(iterMatch[2]),
    };
  }
  // BINDING-EXPRESSION-V2-PREDICATE-01: `predicate:<op>(LEFT, RIGHT)`.
  // The match below claims the entire string starting with `predicate:`;
  // any malformed form (missing parens, unknown op, single operand,
  // nested predicate, literal operand) falls through to `literal` so
  // the authoring error appears verbatim in output.
  const predicateMatch = expr.match(/^predicate:([a-zA-Z][a-zA-Z0-9]*)\((.*)\)$/);
  if (predicateMatch) {
    const opName = predicateMatch[1];
    const inner = predicateMatch[2];
    const parsed = tryParsePredicate(opName, inner);
    if (parsed) return parsed;
    // Malformed predicate form — fall through to literal below.
  }
  // Unrecognized — treat the whole expression as a literal so the contract's
  // intent (whatever it was) appears in output for visible failure.
  return { kind: "literal", value: expr };
}

function parseDomBindingExpression(
  expr: string | ContractValueMapBinding,
): BindingExpression {
  if (typeof expr === "string") return parseBindingExpression(expr);
  return {
    kind: "valueMap",
    source: parseBindingExpression(expr.source),
    values: { ...expr.values },
    ...(expr.fallback === undefined ? {} : { fallback: expr.fallback }),
  };
}

/**
 * BINDING-EXPRESSION-V2-PREDICATE-01.
 *
 * Parse the inside of a `predicate:<op>(...)` form. Returns the
 * `predicate`-kind BindingExpression on success, or `null` on any
 * malformed shape so the caller can fall through to literal. Closed
 * grammar:
 *
 *   - Operator name must be one of: `eq`, `contains`, `memberOf`.
 *   - Exactly two comma-separated operands.
 *   - Each operand must parse to a value-shaped kind (`prop`,
 *     `channel`, `iterationLocal`). `literal` and `predicate` are
 *     rejected as operands — literals carry no comparison semantics
 *     in this grammar, and nested predicates are explicitly held.
 *
 * Comma splitting is naive (single comma + optional space). Operand
 * strings never contain commas in the V2 grammar (no function calls,
 * no array literals, no arbitrary JS), so naive split is sufficient.
 */
function tryParsePredicate(opName: string, inner: string): BindingExpression | null {
  if (opName !== "eq" && opName !== "contains" && opName !== "memberOf") {
    return null;
  }
  const op = opName as BindingPredicateOp;
  // Naive split — V2 operand grammar contains no commas. If a future
  // grammar adds commas inside operands, this must learn paren-aware
  // splitting; today it's a deliberate shortcut.
  const parts = inner.split(",").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const [leftStr, rightStr] = parts;
  if (leftStr.length === 0 || rightStr.length === 0) return null;
  const left = parseBindingExpression(leftStr);
  const right = parseBindingExpression(rightStr);
  // Reject operand kinds that aren't value-shaped in this grammar.
  if (!isPredicateOperand(left) || !isPredicateOperand(right)) return null;
  return { kind: "predicate", op, left, right };
}

/**
 * BINDING-EXPRESSION-V2-CONDITIONAL-01.
 *
 * Value-position conditional with a closed delimiter grammar:
 *
 *   conditional:<condition>|<whenTrue>|<whenFalse>
 *
 * The pipe delimiter is intentionally chosen because existing binding
 * operands (`prop:`, `channel:`, `iter:`, `literal:`) already use `:`.
 * Nested conditionals are held for a future expression-tree grammar.
 */
function tryParseConditional(inner: string): BindingExpression | null {
  const parts = inner.split("|").map((s) => s.trim());
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return null;
  }
  const [conditionRaw, trueRaw, falseRaw] = parts;
  const condition = parseBindingExpression(conditionRaw);
  const whenTrue = parseBindingExpression(trueRaw);
  const whenFalse = parseBindingExpression(falseRaw);
  if (condition.kind === "conditional") return null;
  if (whenTrue.kind === "predicate" || whenTrue.kind === "conditional") return null;
  if (whenFalse.kind === "predicate" || whenFalse.kind === "conditional") return null;
  return { kind: "conditional", condition, whenTrue, whenFalse };
}

/**
 * Closed set of operand kinds legal inside a predicate. Predicates and
 * literals are rejected: nesting is explicitly held; literals carry no
 * useful comparison semantics in the V2 grammar.
 */
function isPredicateOperand(expr: BindingExpression): boolean {
  return (
    expr.kind === "prop" ||
    expr.kind === "channel" ||
    expr.kind === "iterationLocal"
  );
}

/**
 * FEAT-BINDING-CALL-WITH-ARG-01.
 *
 * Parse the argument of a `channel:X.onChange(<arg>)` form. Returns the
 * `channelCall`-kind BindingExpression on success, or `null` on any
 * malformed shape so the caller falls through to literal. Closed grammar:
 *
 *   - Exactly one argument (the `(...)` capture; commas are not split — the
 *     argument grammar contains no commas, so an accidental comma parses to
 *     an unrecognized string that fails the value-shape check below).
 *   - The argument must parse to a value-shaped payload kind: `iterationLocal`
 *     (with optional object-field path, e.g. `iter:item.value`), `prop` (with
 *     optional path), or `literal`. `channel`, `predicate`, `conditional`,
 *     and a nested `channelCall` are rejected — no arbitrary-expression
 *     escape hatch, and no reading another channel's value as a payload.
 *
 * Scope legality (the channel exists; the argument's iteration locals sit
 * inside an enclosing iteration) is decided later in
 * `validateBindingAgainstScope`, not here — this function is context-free.
 */
function tryParseChannelCall(channel: string, argStr: string): BindingExpression | null {
  const trimmed = argStr.trim();
  if (trimmed.length === 0) return null;
  const arg = parseBindingExpression(trimmed);
  if (!isChannelCallArg(arg)) return null;
  return { kind: "channelCall", channel, arg };
}

/**
 * Closed set of argument kinds legal inside a `channelCall`. Only value-shaped
 * payloads: `iterationLocal`, `prop`, `literal`. `channel` is rejected (a
 * setter argument reading another channel's live value is a composed-setter
 * case held for a successor); `predicate`/`conditional`/`channelCall` are
 * rejected (no nesting, no boolean/branch payloads).
 */
function isChannelCallArg(expr: BindingExpression): boolean {
  return (
    expr.kind === "iterationLocal" ||
    expr.kind === "prop" ||
    expr.kind === "literal"
  );
}

/**
 * FEAT-CHANNEL-UPDATE-OPERATIONS-01.
 *
 * Fixed operand arity per named update operation. The single source of
 * truth for how many operands each `channel:X.onChange:<op>(...)` form must
 * carry. A form with the wrong count fails to parse (falls to literal).
 */
const CHANNEL_UPDATE_ARITY: Record<BindingUpdateOp, number> = {
  setCharAt: 1, // [index]
  toggleMembership: 2, // [member, modeGate]
};

/**
 * FEAT-CHANNEL-UPDATE-OPERATIONS-01.
 *
 * The framework-neutral accessor strings a `channelUpdate` lowering needs.
 * Each emitter fills these with its own idiom (React bare `value` /
 * `setValue`; Vue `behavior.value.value` / `behavior.setValue`; Angular
 * `behavior.value()` / `behavior.setValue`; Lit `this.behavior.value` /
 * `this.behavior.setValue`), then calls `composeChannelUpdateExpression` to
 * get the single, framework-agnostic JS body of the `() => …` handler. The
 * composed next value is always passed through `setter` — the canonical
 * channel setter — never written to internal state directly.
 */
export interface ChannelUpdateAccessors {
  /** Reads the channel's CURRENT value (e.g. `value`, `this.behavior.value`). */
  current: string;
  /** The channel setter (e.g. `setValue`, `behavior.setValue`). */
  setter: string;
  /**
   * For `setCharAt`: a JS expression reading the native input event's string
   * payload (e.g. `e.target.value`, `(event.target as HTMLInputElement).value`).
   */
  eventValue?: string;
  /** Rendered operand accessors, one per operation operand (in order). */
  operands: string[];
}

/**
 * FEAT-CHANNEL-UPDATE-OPERATIONS-01.
 *
 * Build the framework-agnostic JS EXPRESSION body of the `() => …` handler
 * for a named channel-update operation. The returned string is valid JS in
 * every emitter's inline-arrow position (React/Vue/Svelte/Lit); Angular,
 * whose template expressions forbid arrows/spread/filter-callbacks, wraps
 * the SAME semantics in a synthesized component method instead (see the
 * Angular emitter). Semantics are fixed by `op` and documented on the
 * `BindingExpression` doctrine comment.
 *
 *   - setCharAt: `setter(cur.slice(0, i) + LAST_CHAR(eventValue) + cur.slice(i + 1))`
 *     with left-padding when `i` exceeds the current length so the character
 *     lands at the requested index. Takes the LAST character of the payload
 *     (a field briefly holding a paste keeps only the final char; whole-paste
 *     distribution is out of scope).
 *   - toggleMembership: `setter(modeGate ? toggle(asArray(cur), member) : member)`.
 */
/**
 * FEAT-CHANNEL-UPDATE-OPERATIONS-01.
 *
 * Deterministic, collision-safe name for a synthesized channel-update helper
 * (`apply<Op><Channel>`, e.g. `applySetCharAtValue`,
 * `applyToggleMembershipSelection`). Used by the Angular emitter (whose
 * template expressions forbid arrows/spread, forcing a class method) to name
 * both the wire target and the method definition from one source.
 */
export function channelUpdateMethodName(
  op: BindingUpdateOp,
  channel: string,
): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `apply${cap(op)}${cap(channel)}`;
}

export function composeChannelUpdateExpression(
  op: BindingUpdateOp,
  acc: ChannelUpdateAccessors,
): string {
  const { current, setter, operands } = acc;
  // String literals are SINGLE-quoted throughout: this expression is spliced
  // into "-delimited template attributes in Vue (`@input="..."`) and Angular
  // wires; an embedded double quote would prematurely close the attribute
  // (the aria-checked quote-collision precedent). React/Svelte/Lit use
  // `{}`/`${}` delimiters where single quotes are equally valid.
  if (op === "setCharAt") {
    const index = operands[0];
    const raw = acc.eventValue ?? "''";
    // Last character of the payload; empty string clears the position.
    const char = `String(${raw} ?? '').slice(-1)`;
    const cur = `String(${current} ?? '')`;
    // Pad so an index past the current end still lands correctly.
    const padded = `${cur}.padEnd(${index}, ' ')`;
    return `${setter}(${padded}.slice(0, ${index}) + ${char} + ${cur}.slice(${index} + 1))`;
  }
  // toggleMembership
  const member = operands[0];
  const modeGate = operands[1];
  const cur = `(Array.isArray(${current}) ? ${current} : ${current} == null ? [] : [${current}])`;
  const toggled = `(${cur}.includes(${member}) ? ${cur}.filter((v) => v !== ${member}) : [...${cur}, ${member}])`;
  return `${setter}(${modeGate} ? ${toggled} : ${member})`;
}

/**
 * FEAT-CHANNEL-UPDATE-OPERATIONS-01.
 *
 * Parse the body of a `channel:X.onChange:<op>(<operands>)` form. Returns
 * the `channelUpdate`-kind BindingExpression on success, or `null` on any
 * malformed shape so the caller falls through to literal (visible failure,
 * matching the `channelCall` / `predicate` malformed-form behaviour).
 * Closed grammar:
 *
 *   - `<op>` must be a member of `BindingUpdateOp`.
 *   - The operand count must equal `CHANNEL_UPDATE_ARITY[op]`.
 *   - Each operand must parse to a value-shaped payload kind
 *     (`iterationLocal`, `prop`, `literal`) — the same closed set as a
 *     `channelCall` argument. No channel, predicate, conditional, or nested
 *     call operands.
 *
 * Operand splitting is naive (comma + optional space); the value-shaped
 * operand grammar contains no commas, so an accidental comma parses to an
 * unrecognized operand that fails the shape check.
 *
 * Channel existence and valueType/operation compatibility are decided later
 * in `validateBindingAgainstScope` (context-dependent), not here.
 */
function tryParseChannelUpdate(
  channel: string,
  opName: string,
  operandStr: string,
): BindingExpression | null {
  if (opName !== "setCharAt" && opName !== "toggleMembership") return null;
  const op = opName as BindingUpdateOp;
  const trimmed = operandStr.trim();
  if (trimmed.length === 0) return null;
  const parts = trimmed.split(",").map((s) => s.trim());
  if (parts.length !== CHANNEL_UPDATE_ARITY[op]) return null;
  if (parts.some((p) => p.length === 0)) return null;
  const operands = parts.map((p) => parseBindingExpression(p));
  if (!operands.every(isChannelCallArg)) return null;
  return { kind: "channelUpdate", channel, op, operands };
}

/**
 * Convert a leading-dot path tail like `".foo.bar"` (or `""`) into the
 * spread fragment used to attach a `path` field to a `BindingExpression`.
 * Returns `{}` when the tail is empty so the resulting binding stays
 * shape-compatible with V1 (no `path` key present at all).
 */
function buildPathField(pathTail: string): { path?: string[] } {
  if (pathTail.length === 0) return {};
  // Drop the leading "." then split. Each segment is already validated
  // by the regex.
  return { path: pathTail.slice(1).split(".") };
}

/**
 * In-place rewrite a `BindingExpression` so that `prop:index` / `prop:item`
 * references resolve to `iterationLocal` when their target name matches
 * the enclosing iteration's `indexVar` / `itemVar`. Returns the original
 * binding unchanged when no rewrite applies.
 *
 * Why this exists: V1 contracts (Calendar, OTP) wrote `prop:index` to mean
 * "the loop-index variable named index" — relying on the iteration scope
 * happening to declare a local of that name. New contracts SHOULD write
 * `iter:index`, but existing contracts must continue to emit byte-equivalent
 * output. The auto-promotion is bounded: it only fires when the prop name
 * exactly matches a declared iteration-local name in the *nearest* enclosing
 * iteration. Outside iteration scope, `prop:index` still requires a real
 * declared prop and `validateDomNode` will reject undeclared references.
 *
 * The promotion is local to the role of the matched variable: a `prop:index`
 * binding inside an iteration whose `indexVar` is `index` becomes
 * `{ kind: "iterationLocal", local: "index" }`, NOT a reference to the
 * literal identifier — so a future contract that overrides `indexVar` to
 * `"dayIndex"` still gets `iter:index` semantics at the emitter.
 */
export function promoteIterationLocals(
  binding: BindingExpression,
  iteration: { indexVar: string; itemVar?: string },
): BindingExpression {
  if (binding.kind === "projection") {
    const source = promoteIterationLocals(binding.source, iteration);
    if (binding.op === "selectionLabel") return { ...binding, source, selection: promoteIterationLocals(binding.selection, iteration), fallback: promoteIterationLocals(binding.fallback, iteration) };
    if (source === binding.source) return binding;
    return { ...binding, source };
  }
  if (binding.kind === "valueMap") {
    const source = promoteIterationLocals(binding.source, iteration);
    if (source === binding.source) return binding;
    return { ...binding, source };
  }
  // BINDING-EXPRESSION-V2-PREDICATE-01: predicate operands are themselves
  // BindingExpressions. Walk into both sides so any V1-style
  // `prop:<indexVar>` / `prop:<itemVar>` reference inside an operand gets
  // promoted to `iterationLocal` just like a top-level binding would.
  // Nested predicates are not legal (the parser rejects them), but the
  // recursion shape is the same either way.
  if (binding.kind === "predicate") {
    const left = promoteIterationLocals(binding.left, iteration);
    const right = promoteIterationLocals(binding.right, iteration);
    if (left === binding.left && right === binding.right) return binding;
    return { kind: "predicate", op: binding.op, left, right };
  }
  if (binding.kind === "conditional") {
    return {
      kind: "conditional",
      condition: promoteIterationLocals(binding.condition, iteration),
      whenTrue: promoteIterationLocals(binding.whenTrue, iteration),
      whenFalse: promoteIterationLocals(binding.whenFalse, iteration),
    };
  }
  // FEAT-BINDING-CALL-WITH-ARG-01: promote a V1-style `prop:<itemVar>` /
  // `prop:<indexVar>` reference inside the call argument. In practice the
  // parser routes `iter:item` straight to `iterationLocal`, so this only
  // fires on an already-normalized arg (a no-op) — but the recursion keeps
  // the promotion total over the grammar.
  if (binding.kind === "channelCall") {
    const arg = promoteIterationLocals(binding.arg, iteration);
    if (arg === binding.arg) return binding;
    return { kind: "channelCall", channel: binding.channel, arg };
  }
  // FEAT-CHANNEL-UPDATE-OPERATIONS-01: promote iteration locals inside each
  // operand. As with channelCall, the parser already routes `iter:*` to
  // `iterationLocal`, so this only fires on an already-normalized operand
  // (a no-op) — the recursion keeps the promotion total over the grammar.
  if (binding.kind === "channelUpdate") {
    const operands = binding.operands.map((o) =>
      promoteIterationLocals(o, iteration),
    );
    const changed = operands.some((o, i) => o !== binding.operands[i]);
    if (!changed) return binding;
    return { kind: "channelUpdate", channel: binding.channel, op: binding.op, operands };
  }
  if (binding.kind !== "prop") return binding;
  // Preserve the path field across promotion. V1 contracts never wrote
  // `prop:item.foo`, so in practice this branch is only hit when the
  // promotion runs on an already-pathed V2 binding (which itself never
  // happens — the parser routes `iter:item.foo` straight to
  // `iterationLocal` without ever being a `prop:` — but the carry is
  // semantically correct and trivial).
  const pathField = binding.path && binding.path.length > 0 ? { path: binding.path } : {};
  if (binding.prop === iteration.indexVar) {
    return { kind: "iterationLocal", local: "index", ...pathField };
  }
  if (iteration.itemVar !== undefined && binding.prop === iteration.itemVar) {
    return { kind: "iterationLocal", local: "item", ...pathField };
  }
  return binding;
}

/**
 * Normalize the contract's behavior fields into the shapes hook generators
 * actually want to consume. Raw fields are kept on the IR for emitters
 * that need full fidelity; the normalized ones are pre-shaped for the
 * common hook patterns (`useControllableState`, dismissal listeners, event
 * exposure).
 */
function buildBehaviorIR(
  contract: ComponentContract,
  styledProps: ResolvedPropIR[],
): BehaviorIR {
  const normalizedChannelsForBuild = buildChannelsIR(
    contract.channels,
    styledProps,
  );
  return {
    channels: contract.channels,
    events: contract.events,
    stateMachine: contract.stateMachine,
    form: contract.form,
    focus: contract.focus,
    portal: contract.portal,
    dismissal: contract.dismissal,
    relationships: contract.relationships,
    normalizedChannels: normalizedChannelsForBuild,
    primaryDisclosureChannel: pickPrimaryDisclosureChannel(
      normalizedChannelsForBuild,
    ),
    normalizedDismissalTriggers: buildDismissalTriggersIR(contract.dismissal),
    normalizedEvents: buildEventsIR(contract.events),
  };
}

const SURFACE_CONTENT_PART_ROLES = new Set<string>([
  "content",
  "region",
  "overlay",
]);

/**
 * Build the presence-surface IR (see docs/architecture/presence-surfaces.md). Returns
 * `undefined` when the contract declares no `surface` block. Resolves
 * `anchor.part` and `content.part` strings against the already-built
 * `PartIR[]`, and fails loud when the referenced part is missing or
 * carries the wrong `details.role`.
 *
 * This is the boundary that prevents future contracts from declaring
 * `surface.anchor.part: "trigger"` when no trigger part exists, or
 * pointing `surface.content.part` at an item / decoration / list part.
 */
export function buildSurfaceIR(
  contract: ComponentContract,
  parts: PartIR[],
): SurfaceIR | undefined {
  const surface = contract.surface;
  if (!surface) return undefined;

  const partByName = new Map(parts.map((p) => [p.name, p]));

  let anchor: SurfaceAnchorIR | undefined;
  let selectorAnchor: SurfaceSelectorAnchorIR | undefined;
  if (surface.anchor && "selector" in surface.anchor) {
    const { prop, path, indexChannel } = surface.anchor.selector;
    const member = getPropMembers(contract).find((m) => m.name === prop);
    if (!member) {
      throw new Error(
        `Contract "${contract.name}": surface.anchor.selector.prop "${prop}" is not a declared prop.`,
      );
    }
    // Array-typedness is judged on the canonical TS string, so it holds for
    // both authored forms: structured {kind:"array"} members and legacy
    // TS-string members (which normalize to fallback{raw} and lower verbatim).
    const resolvedType = canonicalTsType(normalizePropType(member));
    if (!resolvedType.endsWith("[]")) {
      throw new Error(
        `Contract "${contract.name}": surface.anchor.selector.prop "${prop}" must be array-typed (got "${resolvedType}").`,
      );
    }
    if (!path) {
      throw new Error(
        `Contract "${contract.name}": surface.anchor.selector.path must be a non-empty member name.`,
      );
    }
    if (!contract.channels?.[indexChannel]) {
      throw new Error(
        `Contract "${contract.name}": surface.anchor.selector.indexChannel "${indexChannel}" is not a declared channel.`,
      );
    }
    selectorAnchor = { prop, path, indexChannel };
  } else if (surface.anchor) {
    const part = partByName.get(surface.anchor.part);
    if (!part) {
      throw new Error(
        `Contract "${contract.name}": surface.anchor.part "${surface.anchor.part}" is not declared in anatomy.parts.`,
      );
    }
    if (part.details?.role !== "trigger") {
      throw new Error(
        `Contract "${contract.name}": surface.anchor.part "${surface.anchor.part}" must have details.role === "trigger" (got ${part.details?.role ?? "undefined"}).`,
      );
    }
    anchor = { part, relation: surface.anchor.relation };
  }

  let content: SurfaceContentIR | undefined;
  if (surface.content) {
    const part = partByName.get(surface.content.part);
    if (!part) {
      throw new Error(
        `Contract "${contract.name}": surface.content.part "${surface.content.part}" is not declared in anatomy.parts.`,
      );
    }
    const role = part.details?.role;
    if (!role || !SURFACE_CONTENT_PART_ROLES.has(role)) {
      throw new Error(
        `Contract "${contract.name}": surface.content.part "${surface.content.part}" must have details.role of "content", "region", or "overlay" (got ${role ?? "undefined"}).`,
      );
    }
    content = { part, interactive: surface.content.interactive };
  }

  const positioning: SurfacePositioningIR | undefined = surface.positioning
    ? {
        strategy: surface.positioning.strategy,
        placementProp: surface.positioning.placementProp,
        collision: surface.positioning.collision,
      }
    : undefined;

  const timing: SurfaceTimingIR | undefined = surface.timing
    ? {
        openDelayProp: surface.timing.openDelayProp,
        closeDelayProp: surface.timing.closeDelayProp,
        autoDismissProp: surface.timing.autoDismissProp,
      }
    : undefined;

  const modalityProp = surface.modalityProp;
  let modalityGate: SurfaceModalityGateIR | undefined;
  if (modalityProp !== undefined) {
    if (surface.modality !== "blocking") {
      throw new Error(
        `Contract "${contract.name}": surface.modalityProp requires surface.modality "blocking" (got "${surface.modality}").`,
      );
    }
    const member = getPropMembers(contract).find((m) => m.name === modalityProp);
    if (!member || canonicalTsType(normalizePropType(member)) !== "boolean") {
      throw new Error(
        `Contract "${contract.name}": surface.modalityProp "${modalityProp}" must name a declared boolean prop.`,
      );
    }
    if (typeof member.default !== "boolean") {
      throw new Error(
        `Contract "${contract.name}": surface.modalityProp "${modalityProp}" must declare a boolean default (the modality when the prop is omitted).`,
      );
    }
    modalityGate = { prop: modalityProp, defaultModal: member.default };
  }

  const openTriggers = surface.openTriggers ?? [];
  // Selector-anchored surfaces (coachmarks / guided tours) open
  // programmatically — there is no in-tree trigger element to attach an
  // open interaction to, so the openTriggers requirement applies only to
  // part-anchored surfaces.
  const requiresOpenTriggers =
    (surface.kind === "tooltip" ||
      surface.positioning?.strategy === "anchored") &&
    selectorAnchor === undefined;
  if (requiresOpenTriggers && openTriggers.length === 0) {
    throw new Error(
      `Contract "${contract.name}": surface.openTriggers must declare at least one of "hover" | "focus" | "click" when surface.kind === "tooltip" or surface.positioning.strategy === "anchored".`,
    );
  }

  return {
    kind: surface.kind,
    presence: surface.presence,
    modality: surface.modality,
    modalityGate,
    attachment: resolveSurfaceAttachment(surface),
    anchor,
    selectorAnchor,
    content,
    positioning,
    dismissal: surface.dismissal ?? [],
    openTriggers,
    timing,
  };
}

/**
 * Lower the form-control capability and inject its one authoritative channel
 * commit onto the declared DOM part. The contract's DOM tree remains
 * structural; framework event spelling and timing are selected from this
 * semantic fact instead of being repeated in every emitter or DOM node.
 */
export function buildFormControlIR(
  contract: ComponentContract,
  parts: PartIR[],
  channels: NormalizedChannelIR[],
  dom: DomNodeIR | undefined,
): FormControlIR | undefined {
  const control = contract.formControl;
  if (!control) return undefined;

  const part = parts.find((candidate) => candidate.name === control.part);
  if (!part) {
    throw new Error(
      `Contract "${contract.name}": formControl.part "${control.part}" is not declared in anatomy.parts.`,
    );
  }
  if (part.details?.interactive !== true) {
    throw new Error(
      `Contract "${contract.name}": formControl.part "${control.part}" must declare details.interactive === true.`,
    );
  }

  const channel = channels.find((candidate) => candidate.name === control.channel);
  if (!channel) {
    throw new Error(
      `Contract "${contract.name}": formControl.channel "${control.channel}" is not a declared channel.`,
    );
  }
  const expectedValueType = control.valueModel === "text" ? "string" : "boolean";
  if (channel.valueType !== expectedValueType) {
    throw new Error(
      `Contract "${contract.name}": formControl.valueModel "${control.valueModel}" requires channel "${control.channel}" to have valueType "${expectedValueType}" (got "${channel.valueType ?? "undefined"}").`,
    );
  }
  if (control.commit === "input" && control.valueModel !== "text") {
    throw new Error(
      `Contract "${contract.name}": formControl.commit "input" requires valueModel "text".`,
    );
  }
  if (control.commit === "activation" && control.valueModel !== "boolean") {
    throw new Error(
      `Contract "${contract.name}": formControl.commit "activation" requires valueModel "boolean".`,
    );
  }
  if (!dom) {
    throw new Error(
      `Contract "${contract.name}": formControl requires anatomy.dom so part "${control.part}" has a rendered target.`,
    );
  }

  const targets: DomNodeIR[] = [];
  const visit = (node: DomNodeIR): void => {
    if (node.part === control.part) targets.push(node);
    for (const child of node.children) visit(child);
  };
  visit(dom);
  if (targets.length !== 1) {
    throw new Error(
      `Contract "${contract.name}": formControl.part "${control.part}" must render exactly once in anatomy.dom (got ${targets.length}).`,
    );
  }

  const event =
    control.commit === "input"
      ? "input"
      : control.commit === "change"
        ? "change"
        : "click";
  const target = targets[0];
  for (const [authoredEvent, binding] of Object.entries(target.events)) {
    if (
      binding.kind === "channel" &&
      binding.channel === control.channel &&
      binding.field === "onChange"
    ) {
      throw new Error(
        `Contract "${contract.name}": formControl owns the ${control.channel} commit; remove anatomy.dom event "${authoredEvent}" from part "${control.part}".`,
      );
    }
  }
  if (target.events[event]) {
    throw new Error(
      `Contract "${contract.name}": formControl-derived event "${event}" collides with an authored event on part "${control.part}".`,
    );
  }
  target.events[event] = parseBindingExpression(
    `channel:${control.channel}.onChange`,
  );

  return {
    part,
    channel,
    valueModel: control.valueModel,
    commit: control.commit,
    event,
  };
}

/**
 * Lower a repeated-item control and inject its iteration-aware update onto
 * the declared DOM part. The update stays inside the closed binding grammar;
 * contracts select semantic operations, never executable emitter snippets.
 */
export function buildCompositeControlIR(
  contract: ComponentContract,
  parts: PartIR[],
  channels: NormalizedChannelIR[],
  dom: DomNodeIR | undefined,
): CompositeControlIR | undefined {
  const control = contract.compositeControl;
  if (!control) return undefined;

  const part = parts.find((candidate) => candidate.name === control.part);
  if (!part) {
    throw new Error(
      `Contract "${contract.name}": compositeControl.part "${control.part}" is not declared in anatomy.parts.`,
    );
  }
  if (part.details?.interactive !== true || part.details?.multiple !== true) {
    throw new Error(
      `Contract "${contract.name}": compositeControl.part "${control.part}" must declare details.interactive === true and details.multiple === true.`,
    );
  }

  const channel = channels.find((candidate) => candidate.name === control.channel);
  if (!channel) {
    throw new Error(
      `Contract "${contract.name}": compositeControl.channel "${control.channel}" is not a declared channel.`,
    );
  }
  if (control.interactionModel === "segmented-text" && channel.valueType !== "string") {
    throw new Error(
      `Contract "${contract.name}": compositeControl interactionModel "segmented-text" requires a string channel (got "${channel.valueType ?? "undefined"}").`,
    );
  }
  if (control.interactionModel === "segmented-text" && control.commit !== "input") {
    throw new Error(
      `Contract "${contract.name}": compositeControl interactionModel "segmented-text" requires commit "input".`,
    );
  }
  if (control.interactionModel === "collection-selection" && control.commit === "input") {
    throw new Error(
      `Contract "${contract.name}": compositeControl interactionModel "collection-selection" requires commit "activation" or "change".`,
    );
  }
  if (!dom) {
    throw new Error(
      `Contract "${contract.name}": compositeControl requires anatomy.dom so part "${control.part}" has a rendered target.`,
    );
  }

  const targets: Array<{ node: DomNodeIR; repeated: boolean }> = [];
  const visit = (node: DomNodeIR, insideIteration: boolean): void => {
    const repeated = insideIteration || node.iteration !== undefined;
    if (node.part === control.part) targets.push({ node, repeated });
    for (const child of node.children) visit(child, repeated);
  };
  visit(dom, false);
  if (targets.length !== 1) {
    throw new Error(
      `Contract "${contract.name}": compositeControl.part "${control.part}" must occur exactly once as a repeated DOM template (got ${targets.length}).`,
    );
  }
  const target = targets[0];
  if (!target.repeated) {
    throw new Error(
      `Contract "${contract.name}": compositeControl.part "${control.part}" must be inside an anatomy.dom iteration.`,
    );
  }

  const update = parseBindingExpression(control.update);
  if (update.kind !== "channelCall" && update.kind !== "channelUpdate") {
    throw new Error(
      `Contract "${contract.name}": compositeControl.update must be a closed channelCall or channelUpdate expression.`,
    );
  }
  if (update.channel !== control.channel) {
    throw new Error(
      `Contract "${contract.name}": compositeControl.update targets channel "${update.channel}" instead of declared channel "${control.channel}".`,
    );
  }
  if (
    control.interactionModel === "segmented-text" &&
    (update.kind !== "channelUpdate" || update.op !== "setCharAt")
  ) {
    throw new Error(
      `Contract "${contract.name}": segmented-text compositeControl.update must use the setCharAt operation.`,
    );
  }

  const event = control.commit === "activation" ? "click" : control.commit;
  if (Object.keys(target.node.events).length > 0) {
    throw new Error(
      `Contract "${contract.name}": compositeControl owns the ${control.channel} commit; remove authored anatomy.dom events from part "${control.part}".`,
    );
  }
  target.node.events[event] = update;

  return {
    part,
    channel,
    interactionModel: control.interactionModel,
    commit: control.commit,
    event,
    update,
  };
}

/**
 * Lower structured `a11y.keyboard` entries carrying the closed `behavior`
 * vocabulary into fact-validated KeyboardActionIR records
 * (FEAT-A11Y-COMPOSITE-KEYBOARD-01). Validation is authoritative here: a
 * contract declaring a behavior it lacks the facts to realize fails IR build
 * once, loud, for every target — emitters consume the facts without
 * re-validating. Entries without `behavior` are declaration-only and produce
 * no fact (native semantics / behavior primitives realize them; the
 * a11y-realization audit classifies those forms).
 */
export function buildKeyboardActions(
  contract: ComponentContract,
  parts: PartIR[],
  channels: NormalizedChannelIR[],
  compositeControl: CompositeControlIR | undefined,
  focus: ContractFocus | undefined,
): KeyboardActionIR[] {
  const entries = contract.a11y?.keyboard ?? [];
  const declaredParts = new Set(parts.map((part) => part.name));
  const actions: KeyboardActionIR[] = [];
  const seenPartKey = new Set<string>();
  for (const entry of entries) {
    if (typeof entry === "string" || entry.behavior === undefined) continue;
    const when = entry.when;
    if (!when) {
      throw new Error(
        `Contract "${contract.name}": a11y.keyboard entry for key "${entry.key}" declares behavior "${entry.behavior}" but no "when" part; the realization must know which part hosts the keydown.`,
      );
    }
    if (!declaredParts.has(when)) {
      throw new Error(
        `Contract "${contract.name}": a11y.keyboard entry with behavior "${entry.behavior}" scopes "when: ${when}", which is not declared in anatomy.parts.`,
      );
    }
    const partKey = `${when}\u0000${entry.key}`;
    if (seenPartKey.has(partKey)) {
      throw new Error(
        `Contract "${contract.name}": duplicate a11y.keyboard entries for part "${when}" + key "${entry.key}"; one key must resolve to exactly one behavior.`,
      );
    }
    seenPartKey.add(partKey);
    switch (entry.behavior) {
      case "open": {
        const booleanChannels = channels.filter(
          (candidate) => candidate.valueType === "boolean",
        );
        if (booleanChannels.length !== 1) {
          throw new Error(
            `Contract "${contract.name}": keyboard behavior "open" requires exactly one boolean channel to set; found ${booleanChannels.length}.`,
          );
        }
        break;
      }
      case "select": {
        if (!compositeControl) {
          throw new Error(
            `Contract "${contract.name}": keyboard behavior "select" requires compositeControl (the item activation it must mirror).`,
          );
        }
        if (compositeControl.part.name !== when) {
          throw new Error(
            `Contract "${contract.name}": keyboard behavior "select" scopes "when: ${when}" but compositeControl declares item part "${compositeControl.part.name}".`,
          );
        }
        if (compositeControl.commit !== "activation") {
          throw new Error(
            `Contract "${contract.name}": keyboard behavior "select" requires compositeControl.commit "activation" (got "${compositeControl.commit}").`,
          );
        }
        break;
      }
      case "roving-next":
      case "roving-prev":
      case "roving-first":
      case "roving-last": {
        // The roved-over item set is declared by compositeControl (collection
        // controls) or by an anatomy part carrying `focusable: "roving"`
        // (compound containers like Tabs, whose registration order — not a
        // collection channel — defines the item sequence).
        const hasRovingItemSet =
          compositeControl !== undefined ||
          parts.some((candidate) => candidate.details?.focusable === "roving");
        if (!hasRovingItemSet) {
          throw new Error(
            `Contract "${contract.name}": keyboard behavior "${entry.behavior}" requires a declared roving item set — compositeControl, or an anatomy part with focusable "roving".`,
          );
        }
        if (focus?.strategy !== "roving") {
          throw new Error(
            `Contract "${contract.name}": keyboard behavior "${entry.behavior}" requires focus.strategy "roving" (got "${focus?.strategy ?? "unset"}").`,
          );
        }
        break;
      }
      default: {
        throw new Error(
          `Contract "${contract.name}": unknown keyboard behavior "${entry.behavior}" on key "${entry.key}".`,
        );
      }
    }
    actions.push({ part: when, key: entry.key, op: entry.behavior });
  }
  return actions;
}

/**
 * Attach built keyboard actions onto the DOM node whose `part` matches each
 * action's declared `when` scope (FEAT-A11Y-COMPOSITE-KEYBOARD-01). Runs
 * after buildDomTree/buildCompositeControlIR so emitters can lower directly
 * from `node.keyboardActions` without re-resolving part ownership.
 */
export function attachKeyboardActions(
  dom: DomNodeIR | undefined,
  actions: KeyboardActionIR[],
  contractName: string,
): void {
  if (!dom || actions.length === 0) return;
  const byPart = new Map<string, KeyboardActionIR[]>();
  for (const action of actions) {
    const existing = byPart.get(action.part);
    if (existing) existing.push(action);
    else byPart.set(action.part, [action]);
  }
  const visitedParts = new Set<string>();
  const visit = (node: DomNodeIR): void => {
    if (node.part !== undefined) visitedParts.add(node.part);
    const owned = byPart.get(node.part ?? "");
    if (owned) { node.keyboardActions = owned; node.keyboardAnchor = owned.some(a => a.op === "open") || undefined; }
    for (const child of node.children) visit(child);
  };
  visit(dom);
  for (const action of actions) {
    if (!visitedParts.has(action.part)) {
      throw new Error(
        `Contract "${contractName}": keyboard behavior "${action.op}" scopes "when: ${action.part}", which has no node in anatomy.dom to host the keydown.`,
      );
    }
  }
  // An `open` action needs the panel element after the reveal (post-open
  // focus lands inside it), so the panel node must carry the hook's
  // `panelRef`. The roving host part — the item-set container — is the panel
  // for this behavior; without it the post-open focus target is unnameable
  // and the realization would silently no-op.
  if (actions.some((action) => action.op === "open")) {
    const rovingParts = new Set(
      actions.filter((a) => a.op.startsWith("roving-")).map((a) => a.part),
    );
    let marked = false;
    const markPanel = (node: DomNodeIR): void => {
      if (marked) return;
      if (node.part !== undefined && rovingParts.has(node.part)) {
        node.keyboardPanel = true;
        marked = true;
        return;
      }
      for (const child of node.children) markPanel(child);
    };
    markPanel(dom);
    if (!marked) {
      throw new Error(
        `Contract "${contractName}": keyboard "open" behavior requires a roving item part in anatomy.dom to anchor the panel ref — the post-open focus target lives inside it.`,
      );
    }
  }
}

/**
 * Group the IR's keyboard actions by hosting part
 * (FEAT-A11Y-COMPOSITE-KEYBOARD-01). The attachment pass on `DomNodeIR`
 * already scopes actions to nodes; this parallel map lets a framework walker
 * answer "which handler does this part's node bind" without a linear scan.
 */
export function groupKeyboardActionsByPart(
  actions: KeyboardActionIR[],
): Map<string, KeyboardActionIR[]> | undefined {
  if (actions.length === 0) return undefined;
  const byPart = new Map<string, KeyboardActionIR[]>();
  for (const action of actions) {
    const existing = byPart.get(action.part);
    if (existing) existing.push(action);
    else byPart.set(action.part, [action]);
  }
  return byPart;
}

/**
 * The activation member operand of a composite control (the item value its
 * click binding mutates), for lowering the keyboard select op against the
 * identical value. Collection-selection composite controls are validated
 * upstream to carry a `toggleMembership` channel update whose first operand
 * is the member; anything else has no keyboard-selectable member.
 */
export function compositeActivationMember(
  control: ComponentIR["compositeControl"],
): BindingExpression | undefined {
  if (!control) return undefined;
  if (control.update.kind !== "channelUpdate") return undefined;
  if (control.update.op !== "toggleMembership") return undefined;
  return control.update.operands[0];
}

/**
 * Hosting parts with realized keyboard actions, in declaration order — each
 * framework hook supplies one `handle<Part>Keydown` handler per part and the
 * root template binds the same idents.
 */
export function keyboardHandlerParts(ir: ComponentIR): string[] {
  const parts: string[] = [];
  for (const action of ir.keyboardActions) {
    if (!parts.includes(action.part)) parts.push(action.part);
  }
  return parts;
}

/**
 * Tags on which keyboard events fire without a tabIndex and which are
 * programmatically focusable by default (FEAT-A11Y-COMPOSITE-KEYBOARD-01).
 * Keyboard hosts and roving items with any other tag receive
 * `tabindex="-1"` so delegated keys can reach them and they are focusable
 * without entering tab order. Shared by every web-framework emitter so the
 * focusability rule cannot drift between targets.
 */
export const NATIVE_FOCUSABLE_TAGS: ReadonlySet<string> = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
]);

/** Depth-first lookup of an anatomy.dom node by its declared `part`. */
export function findDomNodeByPart(
  dom: DomNodeIR | undefined,
  part: string,
): DomNodeIR | undefined {
  if (!dom) return undefined;
  if (dom.part === part) return dom;
  for (const child of dom.children) {
    const hit = findDomNodeByPart(child, part);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Props the keyboard `select` behavior reads as its toggle/set mode gate
 * (FEAT-A11Y-COMPOSITE-KEYBOARD-01) — the `modeGate` operand of the
 * composite control's `toggleMembership` update. The component forwards
 * these into the behavior hook so the keyboard handler evaluates the same
 * gate the item's click binding does.
 */
export function keyboardModeGateProps(ir: ComponentIR): string[] {
  const props: string[] = [];
  const control = ir.compositeControl;
  if (!control) return props;
  if (control.update.kind !== "channelUpdate") return props;
  if (control.update.op !== "toggleMembership") return props;
  const gate = control.update.operands[1];
  if (gate?.kind === "prop" && !props.includes(gate.prop)) {
    props.push(gate.prop);
  }
  return props;
}

/**
 * Props consumed by a trapping surface's focus policy.
 * Source fact: normalized focus bindings; applies by focus strategy.
 */
export function focusTargetProps(ir: ComponentIR): Array<{
  target: "initialFocus" | "returnFocus"; prop: string;
}> {
  if (ir.behavior.focus?.strategy !== "trap") return [];
  const result: Array<{ target: "initialFocus" | "returnFocus"; prop: string }> = [];
  for (const target of ["initialFocus", "returnFocus"] as const) {
    const binding = ir.behavior.focus[target];
    if (binding?.startsWith("prop:")) result.push({ target, prop: binding.slice(5) });
  }
  return result;
}

function roleSelectorOf(node: DomNodeIR): string | undefined {
  const role = node.attrs.role;
  return role ? `[role="${role}"]` : undefined;
}

/**
 * The anatomy part naming the roved-over item set
 * (FEAT-A11Y-COMPOSITE-KEYBOARD-01): the `compositeControl` item part when the
 * contract declares one, otherwise the part whose anatomy details carry
 * `focusable: "roving"` (compound containers like Tabs, whose items are
 * registered rather than collected). `undefined` when neither source exists —
 * a contract may rove over nothing else.
 */
export function resolveRovingItemPartName(
  ir: ComponentIR,
): string | undefined {
  const compositePart = ir.compositeControl?.part.name;
  if (compositePart) return compositePart;
  return ir.parts.find((part) => part.details?.focusable === "roving")?.name;
}

/**
 * CSS selector resolving the composite roving item nodes inside their
 * container (FEAT-A11Y-COMPOSITE-KEYBOARD-01) — the roving item part's role,
 * which a roving item set must declare so keyboard handlers can query the
 * item set. `undefined` when the contract declares no roving item set.
 */
export function resolveRovingItemSelector(ir: ComponentIR): string | undefined {
  const itemPart = resolveRovingItemPartName(ir);
  if (!itemPart) return undefined;
  const node = findDomNodeByPart(ir.dom, itemPart);
  if (!node) {
    throw new Error(
      `Contract "${ir.name}": roving item part "${itemPart}" has no node in anatomy.dom.`,
    );
  }
  const selector = roleSelectorOf(node);
  if (!selector) {
    throw new Error(
      `Contract "${ir.name}": roving item part "${itemPart}" must declare an explicit role so roving focus can resolve the item set.`,
    );
  }
  return node.bindings.disabled ? `${selector}:not(:disabled)` : selector;
}

/**
 * CSS selector resolving the element the roving focus lands on when the
 * keyboard-open action fires (FEAT-A11Y-COMPOSITE-KEYBOARD-01). The
 * `focus.initialFocus` value names a part; the resolved selector targets the
 * first natively focusable element in that part's subtree (e.g. Select's
 * search input), falling back to the part's own role. `prop:`-shaped
 * initialFocus is a ref concern owned by the focus-trap path and yields
 * `undefined` here.
 */
export function resolveInitialFocusSelector(
  ir: ComponentIR,
): string | undefined {
  const initial = ir.behavior.focus?.initialFocus;
  if (!initial || initial.startsWith("prop:")) return undefined;
  const partName = initial.startsWith("part:") ? initial.slice(5) : initial;
  const node = findDomNodeByPart(ir.dom, partName);
  if (!node) {
    throw new Error(
      `Contract "${ir.name}": focus.initialFocus names part "${partName}", which has no node in anatomy.dom.`,
    );
  }
  const firstFocusable = (current: DomNodeIR): string | undefined => {
    if (NATIVE_FOCUSABLE_TAGS.has(current.tag)) return current.tag;
    for (const child of current.children) {
      const hit = firstFocusable(child);
      if (hit) return hit;
    }
    return undefined;
  };
  return firstFocusable(node) ?? roleSelectorOf(node);
}

/**
 * Builds TextOverflowIR from `contract.textOverflow`. Reuses
 * parseBindingExpression on `textOverflow.line` so the IR carries the same
 * typed BindingExpression shape every other prop/channel binding uses,
 * instead of a raw string a consumer would have to re-parse. Does not
 * re-validate that the referenced prop exists — that is
 * validateTextOverflow's job (validation/semantic.ts), run as part of the
 * separate semantic-validation pass before IR build in the normal
 * generate:check pipeline.
 */
export function buildTextOverflowIR(
  contract: ComponentContract,
): TextOverflowIR | undefined {
  const textOverflow = contract.textOverflow;
  if (!textOverflow) return undefined;

  const line = parseBindingExpression(textOverflow.line);
  if (line.kind !== "prop") {
    throw new Error(
      `Contract "${contract.name}": textOverflow.line "${textOverflow.line}" must be a "prop:<name>" binding.`,
    );
  }

  return { kind: textOverflow.kind, line };
}

/**
 * Resolve a channel's callback shape from its contract-declared
 * `callbackKind`. The IR is deliberately framework-neutral here: it does
 * not inspect handler TypeScript types looking for React/DOM event
 * identifiers, because that classification would leak React realization
 * knowledge into the IR as a fact published to all five framework
 * emitters. Contracts that need event-shaped callbacks must declare
 * `callbackKind: "event"` on the channel; absent declaration defaults to
 * `"value"`, which matches the entire current corpus.
 *
 * Exported so the parity tests and external consumers can call the same
 * resolution rather than reimplement it.
 */
export function resolveCallbackKind(
  channel: Pick<ContractChannel, "callbackKind">,
): "value" | "event" {
  return channel.callbackKind ?? "value";
}

function buildChannelsIR(
  channels: Record<string, ContractChannel> | undefined,
  styledProps: ResolvedPropIR[],
): NormalizedChannelIR[] {
  if (!channels) return [];
  // styledProps reserved for future channel-aware prop introspection;
  // intentionally not consumed today now that callbackKind is
  // contract-declared rather than handler-type-inferred.
  void styledProps;
  const out: NormalizedChannelIR[] = [];
  for (const [name, c] of Object.entries(channels)) {
    const callbackKind = resolveCallbackKind(c);
    const isDisclosureChannel = c.valueType === "boolean" || name === "open";
    const disclosurePriority = !isDisclosureChannel
      ? Number.MAX_SAFE_INTEGER
      : name === "open"
        ? 0
        : name === "expanded"
          ? 1
          : 2;
    out.push({
      name,
      valueProp: c.value,
      defaultValueProp: c.defaultValue,
      changeHandlerProp: c.onChange,
      valueType: c.valueType,
      enabledByProp: c.enabledBy,
      description: c.description,
      callbackKind,
      isDisclosureChannel,
      disclosurePriority,
    });
  }
  return out;
}

/**
 * Pick the primary disclosure channel from a normalized channel list, or
 * undefined when none exists. Emitters call this once when wiring
 * anchor-toggle / dismissal / focus-trap primitives so they do not each
 * reimplement the priority order (`open` → `expanded` → other boolean).
 */
export function pickPrimaryDisclosureChannel(
  channels: readonly NormalizedChannelIR[],
): NormalizedChannelIR | undefined {
  const disclosure = channels.filter((c) => c.isDisclosureChannel);
  if (disclosure.length === 0) return undefined;
  return disclosure.reduce((best, c) =>
    c.disclosurePriority < best.disclosurePriority ? c : best,
  );
}

function buildDismissalTriggersIR(
  dismissal: ContractDismissal | undefined,
): NormalizedDismissalTriggerIR[] {
  if (!dismissal?.triggers) return [];
  return dismissal.triggers.map((t) => ({
    event: t.event,
    enabledByProp: t.enabledBy,
    defaultEnabled: t.defaultEnabled !== false,
    targetPart: t.targetPart,
    description: t.description,
  }));
}

/**
 * Fail loud when an `overlayClick` trigger cannot receive its dismissal
 * click: the trigger must name a `targetPart`, and that part must exist in
 * the dom tree. The root is not a fallback binding site — under a
 * full-cover pointer-events:auto overlay the root (pointer-events:none) can
 * never be the hit target, so a root-bound self-target handler is dead code
 * (FIX-OVERLAY-CLICK-DISMISSAL-BINDING-01).
 */
function validateDismissalTargetParts(
  contract: ComponentContract,
  dom: DomNodeIR | undefined,
): void {
  const overlayClickTriggers = (contract.dismissal?.triggers ?? []).filter(
    (t) => t.event === "overlayClick",
  );
  if (overlayClickTriggers.length === 0) return;

  const partNames = new Set<string>();
  if (dom) {
    const stack: DomNodeIR[] = [dom];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node.part) partNames.add(node.part);
      for (const child of node.children) stack.push(child);
    }
  }

  for (const trigger of overlayClickTriggers) {
    if (!trigger.targetPart) {
      throw new Error(
        `Contract "${contract.name}": dismissal trigger 'overlayClick' must declare 'targetPart' — the anatomy part that receives the dismissal click (the root is pointer-events:none under a full-cover overlay and can never be the hit target).`,
      );
    }
    if (!partNames.has(trigger.targetPart)) {
      throw new Error(
        `Contract "${contract.name}": dismissal trigger 'overlayClick' targets part '${trigger.targetPart}', which does not exist in the anatomy (known parts: [${[...partNames].sort().join(", ")}]).`,
      );
    }
  }
}

function buildEventsIR(
  events: Record<string, ContractEventSignature> | undefined,
): NormalizedEventIR[] {
  if (!events) return [];
  const out: NormalizedEventIR[] = [];
  for (const [name, e] of Object.entries(events)) {
    out.push({
      name,
      emittedViaProps: e.emittedVia ?? [],
      payload: e.payload ?? [],
      returns: e.returns,
      cancelable: e.cancelable === true,
      triggeredByActions: e.triggeredBy ?? [],
      description: e.description,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

function buildParts(contract: ComponentContract): PartIR[] {
  const allDetails = getPartDetails(contract.anatomy);
  const domTagByPart = collectDomTagsByPart(contract);
  const domComponentRefByPart = collectDomComponentRefsByPart(contract);
  const partsInDomTree = new Set([
    ...Object.keys(domTagByPart),
    ...Object.keys(domComponentRefByPart),
  ]);
  return getParts(contract.anatomy).map((name) => {
    const semanticElement = SEMANTIC_ELEMENTS[name];
    const details = allDetails[name];
    const componentRef = resolvePartComponentRef({
      partName: name,
      detailsRef: details?.componentRef,
      domRef: domComponentRefByPart[name],
      detailsTag: details?.tag,
      componentName: contract.name,
    });
    const nativeTag = resolveNativeTag({
      partName: name,
      detailsTag: details?.tag,
      domTag: domTagByPart[name],
      componentName: contract.name,
    });
    // A part becomes a native-realization compound subcomponent when:
    //   (a) it is declared in anatomy.parts (always true at this point),
    //   (b) it has a nativeTag in TABLE_COMPOSITION_TAGS,
    //   (c) it is not root and not container (root + container are owned
    //       by the root component's anatomy.dom render, not exported as
    //       subcomponents),
    //   (d) it is NOT already rendered by the root component's anatomy.dom
    //       tree (consumer-composed only — root-rendered parts must not
    //       double as subcomponents or the consumer gets duplicate /
    //       misplaced semantic nodes), AND
    //   (e) [framework-target-specific] the emitter can honestly host it.
    //
    // This rule moves compound-classification from name-based folklore
    // (the COMPOUND_PARTS set in semantics.ts) to contract-authored
    // native realization. Existing components with names in
    // COMPOUND_PARTS continue to be compound by the legacy rule;
    // new realization is layered on top.
    //
    // Rule (d) is the doctrinal guard against cross-contract bleed:
    // Calendar's contract declares <table>/<td> in its anatomy.dom
    // (calendar grid is a real <table>), but those nodes are
    // root-rendered, not consumer-composed. They must not become
    // separate CalendarGrid/CalendarCell subcomponents.
    const isTableCompositionPart =
      nativeTag !== undefined &&
      TABLE_COMPOSITION_TAGS.has(nativeTag) &&
      name !== "root" &&
      name !== "container" &&
      !partsInDomTree.has(name);
    const isExplicitSubcomponent = details?.subcomponent === true;
    return {
      name,
      semanticElement,
      isCompound:
        isExplicitSubcomponent ||
        (details?.subcomponent !== false && (isCompoundPart(name) || isTableCompositionPart)),
      isExplicitSubcomponent: isExplicitSubcomponent || undefined,
      isRootOnly: ROOT_ONLY_PARTS.has(name),
      layoutVariant:
        name === "footer" || name === "list" ? "horizontal" : undefined,
      nativeTag,
      componentRef,
      details,
    };
  });
}

/**
 * Walk the contract's anatomy.dom tree and collect the `componentRef` (bare
 * component name, `fsds.` stripped) declared for each part name. Parallels
 * `collectDomTagsByPart` for the by-reference composition path. Returns an
 * empty map when the contract has no anatomy.dom tree.
 */
function collectDomComponentRefsByPart(
  contract: ComponentContract,
): Record<string, string> {
  if (!contract.anatomy || Array.isArray(contract.anatomy)) return {};
  const dom = contract.anatomy.dom;
  if (!dom) return {};
  const out: Record<string, string> = {};
  const stack: typeof dom[] = [dom];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.part && typeof node.componentRef === "string") {
      out[node.part] = stripComponentRefPrefix(
        node.componentRef,
        `anatomy.dom node (part="${node.part}")`,
      );
    }
    if (Array.isArray(node.children)) {
      for (const c of node.children) stack.push(c);
    }
  }
  return out;
}

/**
 * Resolve a part's by-reference component name from the contract.
 *
 *   1. anatomy.details.<part>.componentRef is the primary authority.
 *   2. anatomy.dom node componentRef is the secondary source.
 *   3. undefined — the part is not realized by reference.
 *
 * Throws when a part declares both a componentRef and a native `tag` (mutually
 * exclusive), or when the two sources disagree, mirroring resolveNativeTag's
 * disagreement guard.
 */
function resolvePartComponentRef(args: {
  partName: string;
  detailsRef: string | undefined;
  domRef: string | undefined;
  detailsTag: string | undefined;
  componentName: string;
}): string | undefined {
  const { partName, detailsRef, domRef, detailsTag, componentName } = args;
  const normalizedDetailsRef =
    detailsRef !== undefined
      ? stripComponentRefPrefix(
          detailsRef,
          `${componentName} anatomy.details.${partName}.componentRef`,
        )
      : undefined;
  const resolved = normalizedDetailsRef ?? domRef;
  if (resolved === undefined) return undefined;
  if (detailsTag !== undefined) {
    throw new Error(
      `${componentName} part "${partName}": declares both a native \`tag\` ` +
        `("${detailsTag}") and a \`componentRef\` ("${resolved}"). These are ` +
        `mutually exclusive — a part is realized as either a native tag or a ` +
        `referenced component.`,
    );
  }
  if (
    normalizedDetailsRef !== undefined &&
    domRef !== undefined &&
    normalizedDetailsRef !== domRef
  ) {
    throw new Error(
      `${componentName} part "${partName}": anatomy.details componentRef ` +
        `("${normalizedDetailsRef}") disagrees with anatomy.dom componentRef ` +
        `("${domRef}"). They must agree.`,
    );
  }
  return resolved;
}

/**
 * Walk the contract's anatomy.dom tree and collect the HTML tag declared
 * for each part name. Used to derive PartIR.nativeTag when the contract
 * doesn't repeat the tag in anatomy.details.<part>.tag.
 *
 * Returns an empty map when the contract has no anatomy.dom tree.
 */
function collectDomTagsByPart(
  contract: ComponentContract,
): Record<string, string> {
  if (!contract.anatomy || Array.isArray(contract.anatomy)) return {};
  const dom = contract.anatomy.dom;
  if (!dom) return {};
  const out: Record<string, string> = {};
  const stack: typeof dom[] = [dom];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.part && typeof node.tag === "string") {
      out[node.part] = node.tag;
    }
    if (Array.isArray(node.children)) {
      for (const c of node.children) stack.push(c);
    }
  }
  return out;
}

/**
 * Resolve a part's native HTML tag from the contract.
 *
 *   1. anatomy.details.<part>.tag is the primary authority.
 *   2. anatomy.dom node tag is the secondary source.
 *   3. When both are present they must agree — disagreement throws
 *      a hard error here so the IR refuses to build a contract with
 *      split-brain authority over a part's native realization.
 *   4. When neither is present, returns undefined (emitters fall
 *      back to SEMANTIC_ELEMENTS).
 */
function resolveNativeTag(opts: {
  partName: string;
  detailsTag: string | undefined;
  domTag: string | undefined;
  componentName: string;
}): string | undefined {
  const { partName, detailsTag, domTag, componentName } = opts;
  if (detailsTag !== undefined && domTag !== undefined) {
    if (detailsTag !== domTag) {
      throw new Error(
        `[${componentName}] anatomy.details.${partName}.tag (${detailsTag}) ` +
          `disagrees with anatomy.dom node tag (${domTag}) for the same part. ` +
          `These declarations must be identical, or only one of them should ` +
          `be set. Contract validator rule.`,
      );
    }
    return detailsTag;
  }
  return detailsTag ?? domTag;
}

// ---------------------------------------------------------------------------
// Props / type resolution
// ---------------------------------------------------------------------------

// Framework-neutral type names the IR treats as "known" — primitives,
// generic TS utility types, and intrinsic JS globals only. React-specific
// names (ReactNode, SyntheticEvent, MouseEventHandler, HTMLButtonElement,
// React, …) deliberately do NOT live here: a contract reaching for those
// is leaking realization detail into the source-of-truth. The unresolved-
// ref diagnostic surfaces that leak so it can be paid down at the
// contract layer. Per-emitter type allowlists, if needed, live in the
// emitter's own translation surface (e.g. `non-react-types.ts` for the
// non-React emitters, where React-shaped contract types get rewritten
// before emission).
export const BUILTIN_TYPE_NAMES = new Set([
  "string",
  "number",
  "boolean",
  "void",
  "undefined",
  "null",
  "never",
  "any",
  "unknown",
  "object",
  "Function",
  "Promise",
  "Array",
  "Map",
  "Set",
  "Record",
  "Omit",
  "Partial",
  "Pick",
  "Readonly",
  "Required",
  "Exclude",
  "Extract",
  "NonNullable",
  "ReturnType",
  "Parameters",
  "Date",
  "RegExp",
  "Error",
]);

function resolveProps(contract: ComponentContract): ResolvedPropIR[] {
  return getPropMembers(contract).map((p) => {
    const propType = normalizePropType(p);
    // Migrated members (structured propType) derive their canonical TS string;
    // legacy members keep the authored string verbatim. Either way `type` stays
    // populated so import scanners / type-ref extraction / un-migrated emitters
    // behave identically.
    const type = p.propType ? canonicalTsType(propType) : p.type ?? "";
    return {
      name: p.name,
      safeName: toSafeIdentifier(p.name),
      type,
      typeRefs: extractTypeRefs(type),
      required: p.required ?? false,
      description: p.description,
      defaultExpr: defaultExpr(p),
      nodeKind: nodeKindForPropType(propType, p.nodeKind),
      propType,
    };
  });
}

function defaultExpr(prop: StyledPropMember): string | undefined {
  if (prop.default === undefined) return undefined;
  if (typeof prop.default === "string") return `"${prop.default}"`;
  if (typeof prop.default === "boolean") return String(prop.default);
  if (Array.isArray(prop.default)) {
    // JSON-serialize array defaults so each emitter can splice them
    // verbatim into the destructure-or-binding site. PRODUCTION-ARRAY-
    // ITERATION-CONSUMER-01: enables Shuttle's `defaultValue` to seed a
    // demo with non-empty `value` for the runtime rail to assert against.
    return JSON.stringify(prop.default);
  }
  return String(prop.default);
}

function extractTypeRefs(typeStr: string): string[] {
  const refs = typeStr
    .replace(/"[^"]*"/g, "")
    .replace(/'[^']*'/g, "")
    .split(/[|&<>,\s()[\]{}]+/)
    .map((t) => t.trim())
    .filter((t) => t && /^[A-Z]/.test(t));
  return Array.from(new Set(refs));
}

function collectUnresolvedTypes(
  props: ResolvedPropIR[],
  types: ComponentContract["types"],
  extraKnownTypes?: ReadonlySet<string>,
): UnresolvedTypeRefIR[] {
  const definedTypes = new Set(Object.keys(types || {}));
  const unresolved = new Map<string, Set<string>>();
  for (const p of props) {
    for (const ref of p.typeRefs) {
      if (
        definedTypes.has(ref) ||
        BUILTIN_TYPE_NAMES.has(ref) ||
        extraKnownTypes?.has(ref)
      )
        continue;
      let bucket = unresolved.get(ref);
      if (!bucket) {
        bucket = new Set();
        unresolved.set(ref, bucket);
      }
      bucket.add(p.name);
    }
  }
  return Array.from(unresolved.entries()).map(([ref, props]) => ({
    ref,
    fromProps: Array.from(props).sort(),
  }));
}

function toSafeIdentifier(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Class recipe
// ---------------------------------------------------------------------------

/**
 * Boolean props that are *implicitly* state modifiers when not listed in
 * the explicit `states` block. Kept narrow to preserve current behavior.
 */
const IMPLICIT_BOOLEAN_STATE_PROPS = new Set(["disabled", "full", "small"]);

interface ClassRecipeInputs {
  cssPrefix: string;
  styledProps: ResolvedPropIR[];
  variants: Record<string, string[]>;
  flatStates: string[];
}

/**
 * Returns the set of variant axes that COLLIDE within a single component —
 * i.e. share at least one value with another axis. A colliding axis must emit
 * a namespaced class (`${prefix}--${axis}-${value}`) because a bare
 * `${prefix}--${value}` cannot tell which axis it came from. For example List
 * declares `size:[sm,md,lg]` and `spacing:[none,sm,md,lg]`, so a bare
 * `.list--sm` is ambiguous between the two; both axes are returned as tainted.
 *
 * Pure function of the contract's declared `variants`. Shared by the class
 * recipe (which drives the component templates) and the test-plan (which
 * drives the generated per-value smoke tests) so the namespacing decision is
 * made in exactly one place and the two cannot drift apart.
 */
export function computeTaintedAxes(
  variants: Record<string, string[]>,
): Set<string> {
  const valueToAxes = new Map<string, Set<string>>();
  for (const [axis, values] of Object.entries(variants)) {
    for (const value of values) {
      let axes = valueToAxes.get(value);
      if (!axes) {
        axes = new Set();
        valueToAxes.set(value, axes);
      }
      axes.add(axis);
    }
  }
  const tainted = new Set<string>();
  for (const axes of valueToAxes.values()) {
    if (axes.size >= 2) {
      for (const axis of axes) tainted.add(axis);
    }
  }
  return tainted;
}

function buildClassRecipe(inputs: ClassRecipeInputs): ClassRecipeIR {
  const { cssPrefix, styledProps, variants, flatStates } = inputs;
  const propNames = new Set(styledProps.map((p) => p.name));
  const taintedAxes = computeTaintedAxes(variants);

  const valueModifiers: ClassRecipeIR["valueModifiers"] = [];
  const seenValueProps = new Set<string>();

  // A styled prop becomes a value modifier ONLY if it is the carrier for a
  // declared variant dimension. Free-form-string and channel-state props
  // (`checked`, `value`, `title`, etc.) are not visual variants — emitting
  // `${prefix}--${booleanProp}` produces nonsense classes like
  // `switch--true` and is what the prior `VALUE_MODIFIER_PROPS` shortcut
  // produced.
  for (const p of styledProps) {
    if (variants[p.name]) {
      valueModifiers.push({
        propName: p.name,
        safeName: p.safeName,
        defaultExpr: p.defaultExpr,
        ...(taintedAxes.has(p.name) ? { valuePrefix: `${p.name}-` } : {}),
      });
      seenValueProps.add(p.name);
    }
  }

  for (const dim of Object.keys(variants)) {
    if (!propNames.has(dim) && !seenValueProps.has(dim)) {
      valueModifiers.push({
        propName: dim,
        safeName: toSafeIdentifier(dim),
        ...(taintedAxes.has(dim) ? { valuePrefix: `${dim}-` } : {}),
      });
      seenValueProps.add(dim);
    }
  }

  const booleanModifiers: ClassRecipeIR["booleanModifiers"] = [];
  for (const p of styledProps) {
    if (seenValueProps.has(p.name)) continue;
    if (p.type !== "boolean" && p.type !== "boolean | undefined") continue;
    const isStateProp =
      flatStates.includes(p.name) || IMPLICIT_BOOLEAN_STATE_PROPS.has(p.name);
    if (!isStateProp) continue;
    booleanModifiers.push({
      propName: p.name,
      // The historical generator strips dashes (so "data-loading" -> "dataloading"),
      // not camelCases them. Preserve to keep generated CSS class names stable.
      safeName: p.name.replace(/-/g, ""),
    });
  }

  return {
    base: cssPrefix,
    valueModifiers,
    booleanModifiers,
  };
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

/**
 * Project `contract.motion` into the IR.
 *
 * Always returns a fact, even for the 39 contracts that declare no `motion`
 * block — because the question the CSS lowering asks ("must this honour
 * reduced motion?") has an answer for every component, and that answer is yes
 * by default. Returning `null` for undeclared motion would push the
 * opt-out-vs-opt-in decision into css.ts, which is exactly the emitter lore
 * this layer exists to prevent.
 */
export function buildMotion(contract: ComponentContract): MotionIR {
  const motion = contract.motion;
  const reducedMotion = motion?.reducedMotion ?? null;
  return {
    reducedMotion,
    honorsReducedMotion: reducedMotion !== 'ignore',
    countdown: buildMotionCountdown(contract, buildParts(contract)),
    sequence: buildSequence(contract, buildTokenFacts(contract.tokens ?? {})),
    loops: buildMotionLoops(contract, buildParts(contract), buildTokenFacts(contract.tokens ?? {})),
    transitions: (motion?.transitions ?? []).map((t) => ({
      name: t.name,
      trigger: t.trigger ?? null,
      realization: 'declaration-only',
      phase: t.phase ?? null,
      properties: t.properties ?? [],
      durationRef: t.duration ?? null,
      easingRef: t.easing ?? null,
    })),
  };
}

function buildKeyframes(contract: ComponentContract): KeyframeIR[] {
  const keyframes = contract.keyframes || {};
  return Object.entries(keyframes).map(([name, frames]) => ({
    name,
    frames: Object.entries(frames).map(([selector, declarations]) => ({
      selector,
      declarations,
    })),
  }));
}

function buildCssBlocks(
  contract: ComponentContract,
  cssPrefix: string,
): CssBlockIR[] {
  return computeCssBlocks(contract, cssPrefix);
}

/**
 * Compute the framework-neutral list of CSS blocks for a contract.
 *
 * This is the single source of truth for selector expansion (BEM blocks,
 * variant modifiers, state modifiers, part-level insertion points, focus,
 * tokens). `css.ts#generateCSS` formats this output as a CSS string;
 * the IR carries the same blocks so non-string consumers (Vue's
 * `<style>`, doc generators, design tokens) can inspect them directly.
 */
export function computeCssBlocks(
  contract: ComponentContract,
  cssPrefix: string,
  options: { platformTarget?: StylePlatform } = {},
): CssBlockIR[] {
  const platformTarget: StylePlatform = options.platformTarget ?? "web";
  const styles = contract.styles ?? {};
  const tokens = contract.tokens ?? {};

  const blocks: CssBlockIR[] = [];
  const emitted = new Set<string>();

  // Root block: slot declarations from tokens.json (always; even when
  // styles.root is absent), then box-model consumers, then styles.root
  // author rules. Slot declarations live ONLY on root and inherit through
  // the CSS cascade to every descendant selector that reads them via
  // var(--<slug>).
  //
  // Box-model consumers are auto-emitted on every component's root so the
  // primitive slot pool actually applies without each contract having to
  // re-declare `padding-inline-start: var(--fsds-box-model-...)` etc. in
  // its styles.json. Only the longhand properties auto-consume — the
  // shorthand slots (`box-model.padding`, `box-model.padding-block`, etc.)
  // remain available for app-level overrides but are NOT auto-consumed,
  // because setting both shorthand and longhand on the same rule produces
  // a confusing cascade. Authors who want shorthand-level control read
  // those slots explicitly in styles.json. Author-supplied properties in
  // `styles.root` still merge ON TOP of the consumer block, so any
  // explicit `padding: ...` from a contract wins over the box-model
  // longhand defaults.
  const rootSelector = `.${cssPrefix}`;
  const slotDeclarations = renderTokenSlots(tokens);
  // Morphology profile structure (display / box-sizing / flow) is a DEFAULT
  // layered before the box-model consumers and the author's styles.root, so a
  // contract can still override it (MORPHOLOGY-GEOMETRY-PROFILE-01). Empty when
  // no morphology is declared, so unclassified components are unchanged.
  const profileStructure = renderProfileStructure(contract);
  const boxModelConsumers = renderBoxModelConsumers();
  const rootStyleDeclarations = renderStyleBlock(
    styles.root,
    cssPrefix,
    platformTarget,
  );
  blocks.push({
    selector: rootSelector,
    declarations: {
      ...slotDeclarations,
      ...profileStructure,
      ...boxModelConsumers,
      ...rootStyleDeclarations,
    },
  });
  emitted.add(rootSelector);

  // Portal-aware: when the contract opts into a portal for its
  // surface content, the content element is rendered at document.body
  // (escaping the .<cssPrefix> ancestor). Selectors that target the
  // content's data-attribute MUST emit at the top level, not nested
  // under the root, or they won't apply. Derive the content selector
  // from the cssPrefix to match what surface-emit.ts emits as the
  // data-<prefix>-content attribute.
  const expandOptions = expandOptionsForContract(contract, cssPrefix);

  // Every other selector key in styles.json gets its own block. The
  // selector key is interpreted by expandStylesKey:
  //   - "root"          → already handled above; skip.
  //   - bare state name (hover, checked, disabled, ...) → pseudo-class
  //     via DERIVABLE_STATE_TO_PSEUDO.
  //   - "--<value>"     → BEM variant modifier.
  //   - "__<part>"      → BEM anatomy part.
  //   - ":..." / "[..." → pseudo-class / attribute selector on root.
  //   - bare part name  → BEM anatomy part.
  //   - compound (whitespace, +, >, ~, or mixed __/: selectors) →
  //     expanded verbatim with bare parts qualified.
  //   - portal-content   → top-level verbatim (no BEM qualification).
  // When a contract declares that a state suppresses the interaction category
  // (`availability: { suppresses: { categories: ["interaction"] } }`), that is a
  // claim about rendered behaviour: while suppressed, interaction styling does
  // not apply. Honour it by guarding the interaction selectors themselves.
  //
  // The alternative — resetting each interaction property inside the suppressing
  // block — is what the corpus did, and it is why this defect existed: Button's
  // :disabled reset background-color and color and forgot border-color, so a
  // disabled Button still took the hover border. Guarding suppresses the whole
  // category by construction instead of by enumeration, so a property added to
  // :hover later cannot silently reopen the hole.
  //
  // WEB ONLY. The guard is CSS selector mechanics and must not leak into
  // non-CSS targets. React Native derives its pressed state by matching the
  // `:active` selector; appending `:not(:disabled)` made that match fail, which
  // silently dropped EVERY `_pressed` style from RN Button — root and all four
  // variants — and deleted the test that pinned it. RN suppresses interaction
  // through the Pressable's own disabled handling, not a selector, so it needs
  // no guard here.
  const interactionGuard =
    platformTarget === "web" ? suppressionGuardFor(contract) : undefined;

  for (const [key, rawBlock] of Object.entries(styles)) {
    if (key === "root") continue;
    const selector = guardInteractionSelector(
      expandStylesKey(key, cssPrefix, expandOptions),
      interactionGuard,
    );
    if (emitted.has(selector)) continue;
    const declarations = renderStyleBlock(rawBlock, cssPrefix, platformTarget);
    if (Object.keys(declarations).length === 0) continue;
    blocks.push({ selector, declarations });
    emitted.add(selector);
  }

  return blocks;
}

/**
 * Selector keys in `styles` use a compact authoring notation (e.g.
 * `__header`, `--primary`, `:hover`, or compound `__header > .x`). This
 * function expands those into fully-qualified selectors.
 *
 * Resolution order for a bare key (no prefix sigils):
 *   1. State-name lookup in DERIVABLE_STATE_TO_PSEUDO — `hover` → `:hover`.
 *      State semantics are universal; anatomy parts wouldn't share names
 *      with state pseudo-classes.
 *   2. Anatomy-part fallback — `track` → `.{prefix}__track`.
 *
 * Exported so validation/styles.ts can detect selector-aliasing
 * collisions between two distinct keys that resolve to the same selector.
 *
 * Portal-aware selectors: when `options.portalContentSelector` is set
 * (the codegen passes it when the contract enables portal on its
 * surface — typically `[data-popover-content]`), any styles key that
 * equals that selector OR equals the legacy compound form
 * `.<prefix> [data-<prefix>-content]` is emitted at the TOP LEVEL
 * (verbatim, no BEM qualification). This is necessary because the
 * portaled element lives at `document.body`, escaping the
 * `.<prefix>` ancestor; styles nested under that ancestor never
 * apply to the portaled content.
 */
export interface ExpandStylesKeyOptions {
  /**
   * The bare attribute selector that identifies the portaled
   * content node, e.g. `[data-popover-content]`. When the styles key
   * matches it (either directly or as a compound `.popover [data-...]`),
   * the emitter returns the bare attribute selector at top level so
   * the rule actually targets the portaled element.
   */
  portalContentSelector?: string;
  /**
   * Host-aware selector for the `disabled` state block. `:disabled` only
   * matches native form controls, so a non-disableable host (div, span…)
   * must carry the state as `[aria-disabled="true"]` instead — the same
   * form the suppression guard emits (see suppressionGuardFor). Computed
   * from the contract's root tag; absent means legacy `:disabled`.
   */
  disabledSelector?: string;
  /**
   * Part key → selector overrides for components whose parts are marked by a
   * data-attribute rather than a part class (the anchored-surface family).
   * Consulted before the default `.<prefix>__<part>` lowering.
   */
  surfacePartSelectors?: Record<string, string>;
}

/**
 * Derive the selector-lowering options a contract needs. Single source for both
 * callsites (css blocks + token scopes) so their selectors cannot drift apart.
 *
 * The anchored-surface family is the reason `surfacePartSelectors` exists: its
 * emitters mark `trigger` and `content` with `data-<prefix>-<part>` and emit NO
 * part class. The trigger may be the consumer's own adopted element (React
 * `asChild`, Vue slot-props host adoption) where codegen cannot put a class, and
 * the content is portaled out of the `.<prefix>` ancestor entirely. So for these
 * components a bare part key must lower to the marker selector.
 *
 * Without this, `content: {...}` compiled to `.tooltip__content`, which matched
 * zero elements — all 11 of Tooltip's declared surface properties were silently
 * inert and the tooltip rendered as bare text. Popover worked around it by
 * hand-writing `[data-popover-content]` as a styles key; this makes that
 * mechanism reachable from the part vocabulary instead of by hand.
 */
export function expandOptionsForContract(
  contract: ComponentContract,
  cssPrefix: string,
): ExpandStylesKeyOptions | undefined {
  const portalContentSelector =
    contract.portal?.enabled === true
      ? `[data-${cssPrefix}-content]`
      : undefined;

  const isAnchoredSurface =
    contract.surface !== undefined &&
    resolveSurfaceAttachment(contract.surface) === "part" &&
    contract.surface.positioning?.strategy === "anchored";

  const surfacePartSelectors: Record<string, string> | undefined =
    isAnchoredSurface
      ? {
          // Portaled content sits at document.body — top level, unqualified.
          // Un-portaled content stays inside the root, so keep it qualified.
          content:
            portalContentSelector ?? `.${cssPrefix} [data-${cssPrefix}-content]`,
          // The trigger is never portaled; it always renders inside the root.
          trigger: `.${cssPrefix} [data-${cssPrefix}-trigger]`,
        }
      : undefined;

  // The disabled-state selector is host-aware for EVERY contract, not only
  // the portal/surface ones: a `disabled` block on a div host lowered to
  // `:disabled` emits a rule that can never match, which would green the
  // slot's consumption while the styling stays dead.
  const rootTag =
    contract.anatomy && !Array.isArray(contract.anatomy)
      ? contract.anatomy.dom?.tag
      : undefined;
  const disabledSelector =
    rootTag && NATIVE_DISABLEABLE_TAGS.has(rootTag)
      ? ":disabled"
      : ('[aria-disabled="true"]' as const);

  if (!portalContentSelector && !surfacePartSelectors) {
    return rootTag ? { disabledSelector } : undefined;
  }
  return {
    portalContentSelector,
    surfacePartSelectors,
    ...(rootTag ? { disabledSelector } : {}),
  };
}

/**
 * Every component-owned attachment point the Web-DOM realization can produce.
 *
 * "Carrier" is the thing a rule attaches to: the root class, a value/boolean
 * modifier class, a `__part` class, or — for the anchored-surface family — a
 * `data-<prefix>-<part>` marker. This is the substrate an authored selector
 * may claim. A selector that names a carrier absent from here can never match,
 * however well-formed it is.
 *
 * Derived from IR authority, never from generated framework source. Modifier
 * spelling comes from `classRecipe` (so a colliding axis is namespaced exactly
 * as the emitters namespace it, and a disjoint axis keeps the bare shape); part
 * carriers come from walking `ir.dom`, which is what emitters walk to place
 * `__part` classes; marker carriers come from `expandOptionsForContract`, the
 * same helper `expandStylesKey` consults. Re-deriving any of that from a regex
 * over emitted `.tsx` would create a second naming algorithm that can drift
 * from the first while both look green.
 *
 * `partsDeterminate` is the honest bit. Three contracts (Card, Popover,
 * Tooltip) carry no `anatomy.dom`, so the IR has no dom tree to walk and the
 * producible part set is UNKNOWN, not empty. Treating unknown as empty would
 * report every part carrier in those components as unreachable — inferring a
 * defect from the absence of information, which is the error
 * FIX-DEAD-SLOT-UNRENDERED-PART-AUTHORITY-01 exists to prevent. Callers must
 * skip part adjudication when this is false.
 */
export interface WebDomCarriers {
  /** The root BEM class, from `classRecipe.base`. */
  base: string;
  /** Every component-owned CLASS an element can carry: root, modifiers, parts. */
  classes: ReadonlySet<string>;
  /** Part name → the selector that carries it (`.base__part` or a data marker). */
  partSelectors: ReadonlyMap<string, string>;
  /** Non-class carriers (the anchored-surface `[data-*]` markers), as selectors. */
  markerSelectors: ReadonlySet<string>;
  /** False when the contract carries no `anatomy.dom`: the part set is unknown. */
  partsDeterminate: boolean;
}

export function deriveWebDomCarriers(
  ir: ComponentIR,
  contract: ComponentContract,
): WebDomCarriers {
  const base = ir.classRecipe.base;
  const classes = new Set<string>([base]);

  // Value modifiers: `classRecipe` owns the spelling (including `valuePrefix`
  // for colliding axes); the contract's `variants` owns the vocabulary each
  // axis can take. Both are declarations — neither is a reconstruction.
  for (const vm of ir.classRecipe.valueModifiers) {
    const values = contract.variants?.[vm.propName];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      classes.add(`${base}--${vm.valuePrefix ?? ""}${String(value)}`);
    }
  }
  for (const bm of ir.classRecipe.booleanModifiers) {
    classes.add(`${base}--${bm.propName}`);
  }

  // Part carriers: the parts the realization actually carries, NOT the parts
  // `anatomy.parts` declares. Checkbox declares `input` and `indicator` and
  // renders neither; claiming them here would make the validator green on
  // exactly the defect it exists to find.
  //
  // Three production paths reach an element, and all three are needed —
  // calibrated against what the React emitter places, per component, across
  // the whole corpus:
  //
  //   1. the `anatomy.dom` tree — nodes carrying a `part`;
  //   2. compound subcomponents (`PartIR.isCompound`) — Table's `cell`/`head`,
  //      Toast's `item`, Tabs' `tab`: emitted as separate subcomponents that
  //      carry `.<base>__<part>` without ever appearing in the root's dom tree;
  //   3. content-transform vocabularies — Markdown's 11 block/mark parts and
  //      CodeBlock's `token`, realized by the transform rather than by a dom
  //      node. Missing this path reported all 12 as unreachable.
  //
  // The root's own part is excluded: the root element carries `.<base>`, never
  // `.<base>__<part>`, whatever the contract names that part (Toast calls it
  // `viewport`).
  const producedParts = new Set<string>();
  const walk = (node: DomNodeIR): void => {
    if (node.part) producedParts.add(node.part);
    if (isHighlightTransform(node.content)) {
      producedParts.add(node.content.tokenPart);
      if (node.content.linePart) producedParts.add(node.content.linePart);
      if (node.content.gutterPart) producedParts.add(node.content.gutterPart);
    } else if (isMarkdownTransform(node.content)) {
      for (const part of Object.values(node.content.blockParts)) producedParts.add(part);
      for (const part of Object.values(node.content.markParts)) producedParts.add(part);
    }
    for (const child of node.children) walk(child);
  };
  if (ir.dom) walk(ir.dom);
  for (const part of ir.parts) {
    if (part.isCompound) producedParts.add(part.name);
  }
  producedParts.delete("root");
  if (ir.dom?.part) producedParts.delete(ir.dom.part);

  const surfacePartSelectors =
    expandOptionsForContract(contract, base)?.surfacePartSelectors;

  const partSelectors = new Map<string, string>();
  const markerSelectors = new Set<string>();
  for (const part of producedParts) {
    const marker = surfacePartSelectors?.[part];
    if (marker) {
      partSelectors.set(part, marker);
      markerSelectors.add(marker);
      continue;
    }
    partSelectors.set(part, `.${base}__${part}`);
    classes.add(`${base}__${part}`);
  }
  // A marked part is carried by its marker whether or not the dom tree names
  // it — the anchored-surface emitters place the marker on an adopted or
  // portaled element the dom walk does not see as a `part` node.
  for (const [part, marker] of Object.entries(surfacePartSelectors ?? {})) {
    if (!partSelectors.has(part)) partSelectors.set(part, marker);
    markerSelectors.add(marker);
  }

  return {
    base,
    classes,
    partSelectors,
    markerSelectors,
    partsDeterminate: ir.dom !== undefined,
  };
}

export function expandStylesKey(
  key: string,
  prefix: string,
  options: ExpandStylesKeyOptions = {},
): string {
  const { portalContentSelector, surfacePartSelectors } = options;

  // Portal-aware fast path: emit content-targeting selectors at top
  // level when portal is enabled, regardless of whether the author
  // wrote the bare form or the legacy compound form.
  if (portalContentSelector) {
    const trimmed = key.trim();
    if (trimmed === portalContentSelector) return trimmed;
    const compoundPrefix = `.${prefix} ${portalContentSelector}`;
    if (trimmed === compoundPrefix) return portalContentSelector;
  }

  // Data-attribute-marked part: a bare part key lowers to the marker selector
  // instead of `.<prefix>__<part>`, because that is what the emitters actually
  // render. Checked before the compound/qualified branches so it only ever
  // intercepts the bare part name an author writes as a styles key.
  const surfacePartSelector = surfacePartSelectors?.[key.trim()];
  if (surfacePartSelector) return surfacePartSelector;

  const isCompound =
    /[\s+~>]/.test(key) ||
    (key.includes(":") && key.includes("__")) ||
    (key.startsWith("--") && key.includes(" "));

  if (isCompound) return expandComplexSelector(key, prefix);
  // Already-qualified single-segment selectors (start with `.`, `#`, or
  // `*`) pass through verbatim. e.g. `.avatar--small` from the author
  // should emit as `.avatar--small`, NOT `.avatar__.avatar--small`.
  if (key.startsWith(".") || key.startsWith("#") || key.startsWith("*")) {
    return key;
  }
  if (key.startsWith("--")) return `.${prefix}${key}`;
  if (key.startsWith(":") || key.startsWith("[")) return `.${prefix}${key}`;
  if (key.startsWith("__")) return `.${prefix}${key}`;
  if (key.includes(":") || key.includes("[")) {
    return expandComplexSelector(key, prefix);
  }
  const statePseudo =
    key === "disabled" && options.disabledSelector
      ? options.disabledSelector
      : DERIVABLE_STATE_TO_PSEUDO[key];
  if (statePseudo) return `.${prefix}${statePseudo}`;
  return `.${prefix}__${key}`;
}

/**
 * Interaction pseudo-classes the codegen can derive. A selector ending in one
 * of these is interaction-state styling and is subject to a suppression guard.
 */
const INTERACTION_PSEUDOS = [
  ":hover",
  ":active",
  ":focus-visible",
  ":focus-within",
  ":focus",
] as const;

/** Elements for which `disabled` is a native attribute the UA honours. */
const NATIVE_DISABLEABLE_TAGS = new Set([
  "button",
  "input",
  "select",
  "textarea",
  "fieldset",
  "optgroup",
  "option",
]);

/**
 * Derive the guard that excludes a contract's suppressed state, or undefined
 * when the contract declares no interaction suppression.
 *
 * The FORM has to follow the element, or the guard is decorative: `:disabled`
 * only matches native form controls, so emitting `.chip:not(:disabled)` on a
 * `<span>` root would suppress nothing while looking like it did. Order of
 * preference:
 *
 *   1. a contract-declared `a11y.attribute` on the suppressing dimension —
 *      authored intent wins, and it is the only source that can name a
 *      non-obvious attribute.
 *   2. `:disabled` when the root is a native form control.
 *   3. the ARIA attribute form, which is how a non-form-control root can carry
 *      a disabled state at all.
 */
function suppressionGuardFor(contract: ComponentContract): string | undefined {
  const dimensions = contract.states?.dimensions;
  if (!dimensions || typeof dimensions !== "object") return undefined;

  for (const dim of Object.values(dimensions)) {
    if (!dim.suppresses?.categories?.includes("interaction")) continue;

    const values = dim.values ?? [];
    const initial = dim.initial ?? values[0];
    const suppressedValue = values.find((v) => v !== initial);
    if (!suppressedValue) return undefined;

    if (dim.a11y?.attribute) {
      const attrValue = dim.a11y.values?.[suppressedValue] ?? "true";
      return `:not([${dim.a11y.attribute}="${String(attrValue)}"])`;
    }

    const anatomy = contract.anatomy;
    const rootTag =
      anatomy && !Array.isArray(anatomy) ? anatomy.dom?.tag : undefined;
    if (rootTag && NATIVE_DISABLEABLE_TAGS.has(rootTag)) return ":not(:disabled)";
    return `:not([aria-disabled="true"])`;
  }
  return undefined;
}

/**
 * Append the suppression guard to an interaction selector.
 *
 * Only selectors ENDING in an interaction pseudo are guarded: a variant
 * modifier or an anatomy part carries no interaction semantics, and guarding
 * those would change the cascade for rules the contract never claimed to
 * suppress. Note this raises specificity by the guard's own weight — for
 * `:not(:disabled)` that is (0,1,0) — which is why the framework suites and the
 * rail run over the regenerated corpus rather than the emitter alone.
 */
function guardInteractionSelector(selector: string, guard: string | undefined): string {
  if (!guard) return selector;
  if (!INTERACTION_PSEUDOS.some((pseudo) => selector.endsWith(pseudo))) return selector;
  if (selector.includes(guard)) return selector; // already guarded by the author
  return `${selector}${guard}`;
}

/**
 * Expand a compound CSS selector key, qualifying bare part identifiers
 * with the BEM prefix.
 */
export function expandComplexSelector(key: string, prefix: string): string {
  const segments = key.split(/(\s*[+~>]\s*|\s+)/);
  return segments
    .map((segment) => {
      const trimmed = segment.trim();
      if (!trimmed || /^[+~>]$/.test(trimmed)) return segment;
      // Already-qualified or root-anchored selectors emit verbatim: a
      // segment that starts with `.`, `:`, `[`, `#`, or `*` is fully
      // specified by the author and must not be re-qualified with the
      // BEM prefix. This includes `:has(.x__input:checked)`, `.x__track`,
      // `[aria-pressed="true"]`, etc.
      if (/^[.:#*[]/.test(trimmed)) return segment;
      if (trimmed.startsWith("--")) return `.${prefix}${trimmed}`;
      if (trimmed.startsWith("__")) return `.${prefix}${trimmed}`;
      const match = trimmed.match(/^([a-zA-Z][\w-]*)([:[\s].*)?$/);
      if (match) {
        const [, name, suffix = ""] = match;
        return `.${prefix}__${name}${suffix}`;
      }
      return `.${prefix}__${trimmed}`;
    })
    .join("");
}

/**
 * Render the flat slot pool from `<Name>.tokens.json` into root-level CSS
 * custom-property declarations.
 *
 * For each entry in `tokens`:
 *   - `{ resolvesTo, fallback }` → `--<tokenSlug(name)>: var(--<tokenSlug(resolvesTo)>, <fallback>);`
 *   - `{ literal }`              → `--<tokenSlug(name)>: <literal>;`
 *
 * The result is merged onto the component's root selector — `.{cssPrefix}` —
 * so all descendant selectors read the slots through the CSS cascade by
 * name. Consumers (in `<Name>.styles.json`) reference the slot via
 * `var(--<tokenSlug(name)>)`; the fallback chains automatically.
 */
/**
 * Auto-consumer block for the box-model primitive slots. Every component
 * root gets these property declarations so the slot pool actually applies
 * without each contract having to wire `padding-inline-start: var(...)`
 * etc. in its styles.json. Longhand-only — see the docblock at the
 * computeCssBlocks callsite for the rationale on excluding the shorthand
 * slots.
 *
 * Author rules in styles.root merge on TOP of this map (object-spread
 * order in the callsite), so any explicit `padding-inline-start: ...`
 * from a contract overrides the consumer default.
 */
function renderBoxModelConsumers(): Record<string, string> {
  return {
    "padding-block-start": "var(--fsds-box-model-padding-block-start)",
    "padding-block-end": "var(--fsds-box-model-padding-block-end)",
    "padding-inline-start": "var(--fsds-box-model-padding-inline-start)",
    "padding-inline-end": "var(--fsds-box-model-padding-inline-end)",
    gap: "var(--fsds-box-model-gap)",
    width: "var(--fsds-box-model-width)",
    "min-width": "var(--fsds-box-model-min-width)",
    "max-width": "var(--fsds-box-model-max-width)",
    height: "var(--fsds-box-model-height)",
    "min-height": "var(--fsds-box-model-min-height)",
    "max-height": "var(--fsds-box-model-max-height)",
  };
}

/**
 * Root structural CSS contributed by a contract's morphology style profile
 * (MORPHOLOGY-GEOMETRY-PROFILE-01) — display / box-sizing / flow that is NOT a
 * box-model slot. Emitted into <Name>.css between the slot declarations and
 * the box-model consumers, so author rules in styles.root still win
 * (object-spread order at the callsite). Branches on the morphology FACT,
 * never on component name; returns {} when the contract declares no morphology
 * (legacy behavior — no structural defaults injected).
 */
function renderProfileStructure(
  contract: ComponentContract,
): Record<string, string> {
  const profile = resolveStyleProfile(contract.morphology);
  if (!profile) return {};
  return { ...profile.structure };
}

/**
 * Project `contract.tokens` into typed token facts (FEAT-MOBILE-IR-001).
 *
 * Pure function of the tokens record + cssPrefix — the same input
 * `renderTokenSlots` flattens into CSS strings, but preserved as typed data
 * so non-DOM consumers never parse CSS. Category is derived from the slot
 * PATH (the segment after the component slug), never from the component name.
 * Emitted in stable (insertion) order for byte-determinism.
 */
function buildTokenFacts(
  tokens: Record<string, TokenResolution>,
): TokenFactIR[] {
  const facts: TokenFactIR[] = [];
  for (const [name, value] of Object.entries(tokens)) {
    if (!value || typeof value !== "object") continue;
    // Category = path structure after the component slug. `switch.size.md...`
    // -> "size". A single-segment slot (no dot) categorizes as "root".
    const segments = name.split(".");
    const category = segments.length > 1 ? segments[1] : "root";
    const base: Omit<TokenFactIR, "rawValue" | "resolvesTo" | "isLiteral"> = {
      name,
      cssVar: `--${tokenSlug(name)}`,
      category,
      layer: value.layer ?? "semantic",
      source: "tokens-sidecar",
    };
    if (typeof value.literal === "string") {
      facts.push({ ...base, isLiteral: true, rawValue: value.literal });
      continue;
    }
    if (typeof value.resolvesTo === "string") {
      facts.push({
        ...base,
        isLiteral: false,
        resolvesTo: value.resolvesTo,
        // The fallback is the concrete value when present — this is what
        // replaces regexing `(\d+)px\)$` out of the CSS var() expression.
        ...(typeof value.fallback === "string" ? { rawValue: value.fallback } : {}),
      });
    }
  }
  return facts;
}

function buildTokenScopes(
  contract: ComponentContract,
  cssPrefix: string,
): TokenScopeIR[] {
  const scopes = new Map<string, TokenScopeIR>();
  const rootSelector = `.${cssPrefix}`;

  const add = (value: TokenScopeValueIR): void => {
    const key = value.scope;
    const existing = scopes.get(key) ?? {
      selector: value.selector,
      scope: value.scope,
      values: [],
    };
    existing.values.push(value);
    scopes.set(key, existing);
  };

  for (const [name, token] of Object.entries(contract.tokens ?? {})) {
    if (!token || typeof token !== "object") continue;
    const base = tokenScopeBase({
      name,
      selector: rootSelector,
      scope: "root",
      layer: token.layer ?? "semantic",
      source: "tokens-sidecar",
    });
    if (typeof token.literal === "string") {
      add({ ...base, isLiteral: true, rawValue: token.literal });
      continue;
    }
    if (typeof token.resolvesTo === "string") {
      add({
        ...base,
        isLiteral: false,
        resolvesTo: token.resolvesTo,
        ...(typeof token.fallback === "string" ? { rawValue: token.fallback } : {}),
      });
    }
  }

  for (const [key, rawBlock] of Object.entries(contract.styles ?? {})) {
    const selector =
      key === "root"
        ? rootSelector
        : expandStylesKey(
            key,
            cssPrefix,
            expandOptionsForContract(contract, cssPrefix),
          );
    const scope = tokenScopeKeyFromSelector(selector, cssPrefix);
    for (const [property, entry] of Object.entries(rawBlock)) {
      if (!property.includes(".")) continue;
      const projected = projectStyleEntryTokenScope({
        entry,
        property,
        selector,
        scope,
      });
      if (projected) add(projected);
    }
  }

  return [...scopes.values()].map((scope) => ({
    ...scope,
    values: dedupeTokenScopeValues(scope.values),
  }));
}

function tokenScopeBase(input: {
  name: string;
  selector: string;
  scope: string;
  layer: "core" | "semantic" | "brand" | "density";
  source: "tokens-sidecar" | "styles-sidecar";
}): Omit<TokenScopeValueIR, "isLiteral" | "rawValue" | "resolvesTo"> {
  return {
    name: input.name,
    cssVar: `--${tokenSlug(input.name)}`,
    selector: input.selector,
    scope: input.scope,
    layer: input.layer,
    source: input.source,
  };
}

function projectStyleEntryTokenScope(input: {
  property: string;
  entry: StyleEntry;
  selector: string;
  scope: string;
}): TokenScopeValueIR | null {
  const { property, entry, selector, scope } = input;
  if (!entry || typeof entry !== "object") return null;
  if (entry.platforms && !entry.platforms.some((p) => p === "ios" || p === "android")) {
    return null;
  }
  const base = tokenScopeBase({
    name: property,
    selector,
    scope,
    layer: "semantic",
    source: "styles-sidecar",
  });
  if (typeof entry.literal === "string") {
    return { ...base, isLiteral: true, rawValue: entry.literal };
  }
  if (typeof entry.resolvesTo === "string") {
    return {
      ...base,
      isLiteral: false,
      resolvesTo: entry.resolvesTo,
      ...(typeof entry.fallback === "string" ? { rawValue: entry.fallback } : {}),
    };
  }
  return null;
}

function dedupeTokenScopeValues(values: TokenScopeValueIR[]): TokenScopeValueIR[] {
  const byName = new Map<string, TokenScopeValueIR>();
  for (const value of values) byName.set(value.name, value);
  return [...byName.values()];
}

function tokenScopeKeyFromSelector(selector: string, cssPrefix: string): string {
  const rootSelector = `.${cssPrefix}`;
  if (selector === rootSelector) return "root";
  const valueModifier = new RegExp(`\\.${cssPrefix}--([A-Za-z0-9_-]+)`).exec(selector);
  if (valueModifier) return `variant_${sanitizeScopeKey(valueModifier[1]!)}`;
  if (selector.includes(":checked")) return "checked";
  if (selector.includes(":disabled")) return "disabled";
  if (selector.includes(":hover")) return "hover";
  if (selector.includes(":focus")) return "focus";
  const part = new RegExp(`\\.${cssPrefix}__([A-Za-z0-9_-]+)`).exec(selector);
  if (part) return `part_${sanitizeScopeKey(part[1]!)}`;
  return sanitizeScopeKey(selector);
}

function sanitizeScopeKey(value: string): string {
  return value.replace(/[^A-Za-z0-9_]/g, "_");
}

function renderTokenSlots(
  tokens: Record<string, TokenResolution>,
): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const [name, value] of Object.entries(tokens)) {
    if (!value || typeof value !== "object") continue;
    const slotProp = `--${tokenSlug(name)}`;
    if (typeof value.literal === "string") {
      declarations[slotProp] = value.literal;
      continue;
    }
    if (typeof value.resolvesTo === "string") {
      const globalRef = `--${tokenSlug(value.resolvesTo)}`;
      declarations[slotProp] =
        typeof value.fallback === "string"
          ? `var(${globalRef}, ${value.fallback})`
          : `var(${globalRef})`;
    }
  }
  return declarations;
}

/**
 * Render one selector's property → styleEntry map into CSS declarations.
 *
 * Two key shapes are supported:
 *
 * 1. **CSS property keys** (no dot, e.g. `background-color`, `padding-block-start`).
 *    Emits a normal CSS declaration: `<property>: <resolved-value>;`. The
 *    resolved value is either `var(--<tokenSlug(resolvesTo)>[, <fallback>])`
 *    for `resolvesTo` entries or the verbatim literal for `literal` entries.
 *
 * 2. **Slot-path keys** (containing at least one `.`, e.g. `button.color.background.default`).
 *    Emits a CSS custom-property REDEFINITION at this selector's scope:
 *    `--<tokenSlug(slot-path)>: var(--<tokenSlug(resolvesTo)>[, <fallback>]);`.
 *    The slot's consumer site (`.button { background-color: var(--fsds-button-color-background-default) }`)
 *    is unchanged; only the resolution of the slot is re-pointed at this
 *    selector's scope. Used for variant/state redirection — e.g.
 *    `--primary` selector redefines `button.color.background.default` to
 *    point at the primary semantic token.
 *
 * Disambiguation: CSS property names never contain `.` while slot paths
 * always do (they're dotted by construction). The dot count IS the type
 * tag; no separate field is needed.
 *
 * Platform handling:
 *
 *  - `literal` entries: the contract schema requires `platforms` whenever
 *    `literal` is set. If `platforms` is missing we throw — the schema
 *    should have caught it, and silently dropping the declaration (the
 *    previous behavior) hid the contract bug. If `platforms` is present
 *    but excludes the current target, the entry is skipped normally.
 *  - `resolvesTo` entries: `platforms` is optional and defaults to "all
 *    platforms" when absent; explicit `platforms` filters as expected.
 *    This is the symmetry the user spec requires; both branches now
 *    interpret "no platforms array" deliberately rather than by accident.
 */
function renderStyleBlock(
  block: Record<string, StyleEntry> | undefined,
  _cssPrefix: string,
  platformTarget: StylePlatform,
): Record<string, string> {
  if (!block) return {};
  const declarations: Record<string, string> = {};
  for (const [property, entry] of Object.entries(block)) {
    if (!entry || typeof entry !== "object") continue;
    // Disambiguate property key vs slot-path key once per entry so both
    // the `literal` and `resolvesTo` branches honor the same emission rule.
    const isSlotKey = property.includes(".");
    const outputKey = isSlotKey ? `--${tokenSlug(property)}` : property;

    if (typeof entry.literal === "string") {
      if (!entry.platforms) {
        throw new Error(
          `Style entry "${property}" uses \`literal\` without a \`platforms\` array. ` +
            `The schema requires \`platforms\` on \`literal\` entries; if you see this ` +
            `error the entry bypassed schema validation. Add an explicit ` +
            `\`platforms\` array (e.g. ["web"]) and regenerate.`,
        );
      }
      if (!entry.platforms.includes(platformTarget)) continue;
      // Slot-path key with literal: redefine the slot at this scope to
      // a literal CSS value (e.g. `transparent` for ghost/tertiary
      // variants). The literal flows straight through as the custom-
      // property's value.
      declarations[outputKey] = entry.literal;
      continue;
    }
    if (typeof entry.resolvesTo === "string") {
      const platforms = entry.platforms;
      if (platforms && !platforms.includes(platformTarget)) continue;
      const ref = `--${tokenSlug(entry.resolvesTo)}`;
      const value =
        typeof entry.fallback === "string"
          ? `var(${ref}, ${entry.fallback})`
          : `var(${ref})`;
      declarations[outputKey] = value;
    }
  }
  return declarations;
}

/**
 * States that are pseudo-class-derivable in CSS. When a contract declares
 * one of these in `states`, the emitter generates a pseudo-class selector
 * (e.g. `.spinner:hover { ... }`) rather than a BEM modifier class. This
 * keeps the generated stylesheets idiomatic — designers expect `:hover`,
 * not `.spinner--hover` — and means we don't need any JS to apply the
 * state class.
 *
 * Non-derivable states (`entering`, `leaving`, `loading`, etc.) still get
 * the legacy `.${cssPrefix}--state` BEM modifier so authors / hooks can
 * toggle them via class.
 */
const DERIVABLE_STATE_TO_PSEUDO: Record<string, string> = {
  hover: ":hover",
  focus: ":focus-visible",
  "focus-visible": ":focus-visible",
  "focus-within": ":focus-within",
  active: ":active",
  visited: ":visited",
  disabled: ":disabled",
  "read-only": ":read-only",
  checked: ":checked",
  indeterminate: ":indeterminate",
  // ARIA-derived states map to attribute selectors so they cover both
  // React's `aria-*` attributes and any native equivalents.
  expanded: '[aria-expanded="true"]',
  pressed: '[aria-pressed="true"]',
  selected: '[aria-selected="true"]',
};
