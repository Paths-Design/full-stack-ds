import { emitBoxModelBoundaryCss } from './box-model.js';
import { analyzeCssTokenConsumption, onlyConsumedDeclarations } from './css-token-consumption.js';
/**
 * CSS string formatting from IR.
 *
 * All selector expansion and block computation now lives in `ir.ts`
 * (via `computeCssBlocks`); this module is a target-neutral text
 * formatter that any framework emitter can call to produce a `.css`
 * file alongside its rendered component.
 *
 * Since TOKENS-WORKSTREAM-STEP-06A-III, two CSS artifacts are emitted
 * per component:
 *
 *   - `<Component>.css`        Property references (the consumer side
 *                              of the two-hop indirection). Imports
 *                              its sibling .tokens.css at the top.
 *                              Uses native CSS nesting for BEM
 *                              modifiers, states, and parts.
 *
 *   - `<Component>.tokens.css` Slot declarations (the indirection
 *                              layer). One block per non-empty
 *                              selector, also nested. Brands and
 *                              themes override these slots at
 *                              cascade-layer time.
 *
 * Both partitions take the same flat `cssBlocks: CssBlockIR[]` from
 * the IR and re-group them on output — the IR does not encode
 * nesting because the same data feeds two different consumers
 * (the .css and .tokens.css files) which group it differently.
 */
import type { ComponentContract } from "./contract.js";
import type { ComponentIR, CssBlockIR, KeyframeIR } from "./ir.js";
import {
  buildComponentIR,
  computeCssBlocks,
  expandComplexSelector,
} from "./ir.js";
import { getCssPrefix } from "./contract.js";
import { renderSections, type Section } from "./preserve.js";

export { computeCssBlocks, expandComplexSelector, getCssPrefix };

const INDENT = "  ";

/**
 * Test a CSS custom-property name. Slot declarations from the two-hop
 * indirection use this prefix; everything else is a real CSS property.
 */
function isSlotDeclaration(prop: string): boolean {
  return prop.startsWith("--");
}

/**
 * Given the root selector (`.switch`), convert a sibling selector
 * (`.switch:hover`, `.switch[data-x="y"]`) into its nested form
 * (`&:hover`, `&[data-x="y"]`).
 *
 * Returns null when the selector cannot be safely nested under `&`.
 * The caller then emits the block as a flat sibling rule, which is
 * the only spec-compliant way to express BEM child / modifier
 * selectors under the current root.
 *
 * The CSS Nesting Level 1 spec requires `&` to behave like a single
 * compound-selector token: it can be followed by `:` (pseudo-class),
 * `::` (pseudo-element), `[` (attribute), or a combinator / whitespace.
 * It CANNOT be followed by an identifier-continuing character — `-`
 * or `_` start an identifier, and the parser will not concatenate
 * `&--md` into `.switch--md`. Chromium, Firefox, and Safari all drop
 * such rules silently (verified empirically and against
 * https://www.w3.org/TR/css-nesting-1/ and
 * https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting).
 *
 * Concretely: `.switch__track`, `.switch--md`, `.switch__thumb` must
 * be emitted as standalone selectors. Only state pseudo-classes
 * (`:hover`, `:checked`) and attribute selectors (`[aria-expanded]`)
 * are eligible for nesting.
 */
function toNestedSelector(rootSelector: string, child: string): string | null {
  if (!child.startsWith(rootSelector)) return null;
  const remainder = child.slice(rootSelector.length);
  if (remainder === "") return null; // identical to root, would be a no-op
  // Only `:` (pseudo) and `[` (attribute) start a fragment the parser
  // will append to `&` as part of the same compound selector. `-` and
  // `_` start identifiers and break nesting (see docblock above).
  if (/^[:[]/.test(remainder)) {
    return `&${remainder}`;
  }
  return null;
}

/**
 * Format declarations as indented CSS property lines.
 */
function formatDecls(
  decls: Record<string, string>,
  indent: string,
): string[] {
  return Object.entries(decls).map(
    ([prop, val]) => `${indent}${prop}: ${val};`,
  );
}

/**
 * Format a block's comments (already raw block-comment strings) as indented lines.
 */
function formatComments(comments: string[] | undefined, indent: string): string[] {
  if (!comments?.length) return [];
  return comments.map((c) => `${indent}${c}`);
}

/**
 * Group flat blocks by their base selector. Children are nested-eligible
 * blocks; orphans are blocks whose selector doesn't extend any other
 * block's selector and which therefore stand alone.
 *
 * Heuristic: the base selector is the longest selector that's a prefix
 * of the block's selector AND is itself a block in the input list.
 * In practice — given how `computeCssBlocks` emits — the base selector
 * is always the root `.cssPrefix` for component blocks.
 */
interface GroupedBlock {
  selector: string;
  decls: Record<string, string>;
  comments: string[];
  children: Array<{
    selector: string; // nested form, only ever `&:state` or `&[attr]`
    decls: Record<string, string>;
    comments: string[];
  }>;
}

function groupBlocksByRoot(
  blocks: CssBlockIR[],
  rootSelector: string,
): GroupedBlock[] {
  const root: GroupedBlock = {
    selector: rootSelector,
    decls: {},
    comments: [],
    children: [],
  };
  const orphans: GroupedBlock[] = [];

  for (const block of blocks) {
    if (block.selector === rootSelector) {
      Object.assign(root.decls, block.declarations);
      if (block.comments) root.comments.push(...block.comments);
      continue;
    }
    const nested = toNestedSelector(rootSelector, block.selector);
    if (nested) {
      root.children.push({
        selector: nested,
        decls: block.declarations,
        comments: block.comments ?? [],
      });
      continue;
    }
    // Compound or unrelated selector — stands alone.
    orphans.push({
      selector: block.selector,
      decls: block.declarations,
      comments: block.comments ?? [],
      children: [],
    });
  }

  return [root, ...orphans];
}

/**
 * Strip a block's declarations of slot decls (keeping only properties)
 * or vice versa, depending on the requested output.
 */
function filterGroupedBlock(
  group: GroupedBlock,
  keep: "slots" | "properties",
): GroupedBlock {
  const filter = (decls: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(decls)) {
      const isSlot = isSlotDeclaration(k);
      if ((keep === "slots") === isSlot) out[k] = v;
    }
    return out;
  };
  return {
    selector: group.selector,
    decls: filter(group.decls),
    // Comments only belong on the .css side — they're authoring hints
    // about unresolved property bindings, not slot intent.
    comments: keep === "properties" ? group.comments : [],
    children: group.children
      .map((c) => ({
        selector: c.selector,
        decls: filter(c.decls),
        comments: keep === "properties" ? c.comments : [],
      }))
      .filter((c) => Object.keys(c.decls).length > 0 || c.comments.length > 0),
  };
}

/**
 * Format a grouped block. Empty groups (no own decls/comments AND no
 * non-empty children) return an empty string so the caller can drop them.
 */
function formatGroupedBlock(group: GroupedBlock): string {
  const hasOwnContent =
    Object.keys(group.decls).length > 0 || group.comments.length > 0;
  if (!hasOwnContent && group.children.length === 0) return "";

  const lines: string[] = [`${group.selector} {`];
  lines.push(...formatDecls(group.decls, INDENT));
  lines.push(...formatComments(group.comments, INDENT));

  for (const child of group.children) {
    const childLines = [`${INDENT}${child.selector} {`];
    childLines.push(...formatDecls(child.decls, INDENT + INDENT));
    childLines.push(...formatComments(child.comments, INDENT + INDENT));
    childLines.push(`${INDENT}}`);
    // Blank line before each child for readability.
    lines.push("");
    lines.push(...childLines);
  }

  lines.push(`}`);
  return lines.join("\n");
}

function formatKeyframes(kf: KeyframeIR): string {
  const lines: string[] = [`@keyframes ${kf.name} {`];
  for (const frame of kf.frames) {
    const decls = Object.entries(frame.declarations)
      .map(([p, v]) => `    ${p}: ${v};`)
      .join("\n");
    lines.push(`  ${frame.selector} {\n${decls}\n  }`);
  }
  lines.push(`}\n`);
  return lines.join("\n");
}

/**
 * CSS properties whose presence means a block actually animates.
 *
 * Longhands are listed alongside the shorthands because a block that sets only
 * `animation-name` or only `transition-property` animates just as much as one
 * using the shorthand, and a reduced-motion block that missed those would be a
 * gate reporting success over a still-moving component.
 */
const ANIMATING_PROPERTIES = new Set([
  "animation",
  "animation-name",
  "animation-duration",
  "transition",
  "transition-property",
  "transition-duration",
]);

/**
 * Values that name an animating property while switching motion OFF.
 *
 * Skeleton's `--wipe` and `--none` variants both set `animation: none`, and a
 * naive property-name match pulled them into the reduced-motion block —
 * harmless in the browser, but it made the derived rule assert that six
 * selectors animate when three do. The rail reads this block, so an
 * overstatement here becomes a false realization claim there.
 */
const NON_ANIMATING_VALUES = new Set(["none", "0", "0s", "0ms", "initial", "unset"]);

function blockAnimates(declarations: Record<string, string>): boolean {
  return Object.entries(declarations).some(
    ([property, value]) =>
      ANIMATING_PROPERTIES.has(property) &&
      !NON_ANIMATING_VALUES.has(value.trim().toLowerCase()),
  );
}

function loopCss(ir: ComponentIR) {
  // Source: bound MotionIR + classRecipe. Applies by effect/target/variant facts.
  // This lowering can leave when another web executor owns these declarations.
  return ir.motion.loops.map((loop) => {
    const base = ir.classRecipe.base;
    const modifier = loop.when
      ? ir.classRecipe.valueModifiers.find((entry) => entry.propName === loop.when!.variant)
      : undefined;
    if (loop.when && !modifier) throw new Error("[MOTION_LOOP_INVALID] variant has no class carrier");
    const root = loop.when
      ? `.${base}--${modifier?.valuePrefix ?? ""}${loop.when.equals}`
      : `.${base}`;
    const target = loop.target.name === "root" ? `.${base}` : `.${base}__${loop.target.name}`;
    const selector = loop.target.name === "root" ? root : loop.when ? `${root} ${target}` : target;
    const property = loop.effect.kind === "rotation" ? "transform" : "opacity";
    for (const block of ir.cssBlocks.filter((block) => block.selector === target || block.selector === selector)) {
      if (Object.keys(block.declarations).some((key) => key === "animation" ||
          key.startsWith("animation-") || key === property)) {
        throw new Error(`[MOTION_LOOP_OWNER] ${selector}: authored style competes with ${loop.name}`);
      }
    }
    const name = `fsds-${base}-${loop.name}`;
    if (ir.keyframes.some((frames) => frames.name === name)) {
      throw new Error(`[MOTION_LOOP_OWNER] keyframe name collision: ${name}`);
    }
    const value = (n: number) => loop.effect.kind === "rotation" ? `rotate(${n}deg)` : String(n);
    const duration = `var(${loop.timing.duration.cssVar}, ${loop.timing.duration.rawValue})`;
    const easing = "token" in loop.timing.easing
      ? `var(${loop.timing.easing.token.cssVar}, ${loop.timing.easing.token.rawValue})`
      : `cubic-bezier(${loop.timing.easing.cubicBezier.join(", ")})`;
    return {
      selector,
      declarations: {
        animation: `${name} calc(${duration} * ${loop.timing.multiplier}) ${easing} infinite`,
      },
      keyframe: {
        name,
        frames: loop.effect.keyframes.map((frame) => ({
          selector: `${frame.offset * 100}%`,
          declarations: { [property]: value(frame.value) },
        })),
      },
      staticDeclaration: `${property}: ${value(loop.reducedMotion.value)};`,
    };
  });
}

function webKeyframes(ir: ComponentIR): KeyframeIR[] {
  return [...ir.keyframes, ...loopCss(ir).map((loop) => loop.keyframe)];
}

/**
 * Derive the `prefers-reduced-motion` block from the declarations that were
 * actually emitted (RAIL-REDUCED-MOTION-01).
 *
 * Derived, not authored, and that is the point: a hand-written reduced-motion
 * block drifts the moment someone adds an animation to another selector, and
 * the corpus proved it — before this landed, `prefers-reduced-motion` appeared
 * exactly ONCE across every generated artifact, inside a hand-authored
 * `@custom` region in one framework's Popover.css, while twelve contracts
 * declared `reducedMotion: "respect"` and seven components animated
 * unconditionally. Reading the emitted blocks means the neutralising rule
 * cannot name a selector that no longer animates, or miss one that started to.
 *
 * The legacy lowering zeroes durations rather than setting `animation: none`.
 * Executable loops instead declare their own explicit static presentation.
 * `none` drops an animation's final state, so a `forwards` fill that is the
 * only thing making an element visible would leave it stuck at its `from`
 * frame — reduced motion must remove the MOTION, not the end state. A ~0
 * duration with a single iteration lands on the final frame immediately, which
 * is what a user asking for reduced motion wants to see.
 */
export function reducedMotionBlock(ir: ComponentIR): string {
  if (!ir.motion.honorsReducedMotion) return "";

  // Nothing animates -> nothing to neutralise. Emitting an empty media query
  // would make the rail's "has a reduced-motion block" check pass for every
  // component regardless of whether it moves, which is worse than no block.
  const selectors = webCssBlocks(ir)
    .filter((block) => blockAnimates(block.declarations))
    .map((block) => block.selector);
  if (selectors.length === 0) return "";

  // One grouped rule rather than one per selector: the declarations are
  // identical by construction, so N copies would be N times the byte churn on
  // every regeneration for no behavioural difference.
  const selectorList = [...new Set(selectors)].join(",\n  ");
  return (
    `@media (prefers-reduced-motion: reduce) {\n` +
    `  ${selectorList} {\n` +
    `    animation-duration: 0.01ms;\n` +
    `    animation-iteration-count: 1;\n` +
    `    transition-duration: 0.01ms;\n` +
    `  }\n` +
    loopCss(ir).map((loop) =>
      `  ${loop.selector} { animation: none; ${loop.staticDeclaration} }\n`,
    ).join("") +
    `}`
  );
}

/**
 * Format the IR-derived blocks + keyframes as the `<Component>.css`
 * artifact: nested BEM via `&-...`, property references only (slots
 * live in the sibling `.tokens.css`), `@import` at the top.
 *
 * Regions (see `preserve.ts`):
 *   `styles`     (gen) — root block + nested children
 *   `keyframes`  (gen, optional) — keyframes if any
 *   `overrides`  (cust, empty default) — designer escape hatch
 */
/** CSS override syntax belongs to web realization, not the native style projection. */
function webCssBlocks(ir: ComponentIR): ComponentIR["cssBlocks"] {
  const rootSelector = `.${ir.cssPrefix}`;
  const defaults = ir.cssBlocks.find(block => block.selector === rootSelector)?.declarations ?? {};
  const bindings = ir.designBindings ?? [];
  return [...ir.cssBlocks, ...loopCss(ir)].map(block => {
    const declarations: Record<string, string> = { ...block.declarations };
    if (block.selector === rootSelector) {
      for (const [property, value] of Object.entries(declarations)) {
        const match = value.match(/^var\((--fsds-box-model-[a-z-]+)\)$/);
        if (match && !property.startsWith("--")) {
          const fallback = defaults[match[1]] ?? (property.startsWith("max-") ? "none" : property === "width" || property === "height" ? "auto" : "0");
          declarations[property] = `var(${match[1]}, ${fallback})`;
        }
      }
    }
    // Variant and part defaults are values at property consumers, never public
    // overrides. Otherwise a default side value defeats a consumer's axis or
    // shorthand in the shared side layer.
    if (block.selector !== rootSelector) {
      for (const [name, value] of Object.entries(declarations)) {
        if (!name.startsWith("--fsds-box-model-")) continue;
        const property = name.slice("--fsds-box-model-".length);
        if (!(property in declarations)) declarations[property] = `var(${name}, ${value})`;
        delete declarations[name];
      }
    }
    for (const binding of bindings) {
      if (binding.selector !== block.selector || !(binding.cssProperty in declarations)) continue;
      declarations[binding.cssProperty] = `var(${binding.cssVar}, ${declarations[binding.cssProperty]})`;
    }
    return { ...block, declarations };
  });
}

/** Reachability in the web realization; behavior defaults do not become CSS knobs. */
export function webTokenConsumption(ir: ComponentIR) {
  const root = `.${ir.cssPrefix}`;
  const declarations = webCssBlocks(ir).map(block => `${block.selector} {\n${
    Object.entries(block.declarations)
      .filter(([name]) => block.selector !== root || !name.startsWith("--fsds-box-model-"))
      .map(([name, value]) => `${name}: ${value};`).join("\n")
  }\n}`).join("\n");
  return analyzeCssTokenConsumption([
    declarations, ...webKeyframes(ir).map(formatKeyframes), emitBoxModelBoundaryCss(),
  ]);
}

export function emitCss(ir: ComponentIR): string {
  const rootSelector = `.${ir.cssPrefix}`;
  const grouped = groupBlocksByRoot(webCssBlocks(ir), rootSelector)
    .map((g) => filterGroupedBlock(g, "properties"))
    .map((g) => formatGroupedBlock(g))
    .filter((s) => s.length > 0);

  // The @import lives outside the `@generated:start styles` block so
  // designer-authored regions don't fight it. It's emitted as raw
  // pre-content via `renderSections`' "between" region.
  const importLine = `@import "../../primitives/box-model.css";\n@import "./${ir.name}.tokens.css";`;
  const stylesBody = grouped.join("\n\n").trimEnd();
  const keyframesBody = webKeyframes(ir).map(formatKeyframes).join("\n").trimEnd();

  const sections: Section[] = [
    { kind: "between", body: importLine },
    { kind: "between", body: "@layer components.defaults {" },
    { kind: "between", body: "" },
    { kind: "generated", id: "styles", body: stylesBody },
    { kind: "between", body: "" },
  ];
  if (keyframesBody) {
    sections.push(
      { kind: "generated", id: "keyframes", body: keyframesBody },
      { kind: "between", body: "" },
    );
  }
  const reducedMotionBody = reducedMotionBlock(ir);
  if (reducedMotionBody) {
    sections.push(
      { kind: "generated", id: "reduced-motion", body: reducedMotionBody },
      { kind: "between", body: "" },
    );
  }
  sections.push(
    { kind: "between", body: "}" },
    { kind: "custom", id: "overrides", body: "" },
    { kind: "between", body: "" },
  );

  return renderSections(sections, "block");
}

/**
 * Format the IR-derived blocks as the `<Component>.tokens.css` artifact:
 * one nested block per non-empty selector containing slot declarations
 * (`--fsds-<component>-…: var(--fsds-<global>, <fallback>);`). No
 * @import; no property references.
 *
 * Regions:
 *   `tokens`     (gen) — slot declarations
 *   `overrides`  (cust, empty default) — brand/density overrides at
 *                                       authoring time live here
 */
export function emitTokensCss(ir: ComponentIR): string {
  const rootSelector = `.${ir.cssPrefix}`;
  const consumed = webTokenConsumption(ir).consumed;
  // Portal-aware: when the contract enables a portal for its surface,
  // the content node renders at document.body. Component-local slot
  // declarations scoped to `.<cssPrefix>` don't reach it, so the
  // var(--…) references in the generated content rule resolve to
  // nothing. Hoist component slots to `:root` in that case — they're
  // already cssPrefix-qualified (`--fsds-modal-color-…`), so cross-
  // component bleed isn't possible.
  //
  // Box-model slots (`--fsds-box-model-…`) are UNSCOPED on purpose and
  // would leak across portal components if hoisted: two simultaneously-
  // open portal components would race for `:root`-defined values. Keep
  // them on `.<cssPrefix>` so the per-component override discipline
  // survives even for portaled surfaces. The portaled content node is
  // a descendant of document.body, not of `.<cssPrefix>` — so to
  // restore reachability for box-model slots specifically, the trigger
  // / surface node should still set these on a wrapping element, OR
  // the surface contract should declare a portal escape via the
  // existing `[data-<prefix>-content]` selector if it needs custom
  // sizing.
  const portalEnabled = ir.behavior.portal?.enabled === true;
  const grouped = groupBlocksByRoot(onlyConsumedDeclarations(webCssBlocks(ir), consumed), rootSelector)
    .map((g) => filterGroupedBlock(g, "slots"))
    .map((g) => g.selector === rootSelector ? { ...g, decls: Object.fromEntries(Object.entries(g.decls).filter(([key]) => !key.startsWith("--fsds-box-model-"))) } : g)
    .flatMap((g) => {
      if (!portalEnabled || g.selector !== rootSelector) return [g];
      // Split the root block into box-model (stays on `.<cssPrefix>`)
      // and the rest (hoists to `:root`).
      const stay: Record<string, string> = {};
      const hoist: Record<string, string> = {};
      for (const [prop, val] of Object.entries(g.decls)) {
        if (prop.startsWith("--fsds-box-model-")) {
          stay[prop] = val;
        } else {
          hoist[prop] = val;
        }
      }
      const out = [];
      if (Object.keys(hoist).length > 0) {
        out.push({
          selector: ":root",
          decls: hoist,
          comments: g.comments,
          children: g.children,
        });
      }
      if (Object.keys(stay).length > 0) {
        out.push({
          selector: rootSelector,
          decls: stay,
          comments: [] as string[],
          children: [] as typeof g.children,
        });
      }
      return out;
    })
    .map((g) => formatGroupedBlock(g))
    .filter((s) => s.length > 0);

  const tokensBody = grouped.join("\n\n").trimEnd();

  const sections: Section[] = [
    { kind: "generated", id: "tokens", body: tokensBody },
    { kind: "between", body: "" },
    { kind: "custom", id: "overrides", body: "" },
    { kind: "between", body: "" },
  ];

  const rendered = renderSections(sections, "block");

  // Wrapped in `@layer components` so a brand's component-scoped override
  // (packages/ds-tokens/src/brands/<id>.tokens.json `components.<Name>.*`,
  // emitted into `@layer brand`) wins by layer order instead of being
  // shadowed — unlayered CSS always beats layered CSS per spec regardless
  // of selector specificity, so this file can no longer be unlayered once a
  // brand needs to reach into it. `@layer components` is declared between
  // `semantic` and `theme/brand` in the global tokens.css layer order (see
  // packages/ds-tokens/build/generators/global.ts:generateLayerDeclaration).
  // Layer names are global to the document's cascade regardless of which
  // stylesheet declares them, so this only takes effect when the global
  // tokens.css (which declares the `@layer` order) shares a document with
  // this file — true for every framework except Lit, whose shadow DOM is a
  // separate cascade context that `@layer` cannot cross (see
  // emitLitInlineCss, which never participates in this layer at all).
  return `@layer components {\n${rendered}\n}\n`;
}

/**
 * Convenience wrapper retained for backward compatibility with callers that
 * still pass raw contracts. New code should call `emitCss(ir)` directly.
 */
export function generateCSS(contract: ComponentContract): string {
  return emitCss(buildComponentIR(contract));
}

/**
 * Produce the component's CSS text suitable for embedding inside a Lit
 * `css\`…\`` tagged template literal. Returns the slot declarations
 * (.tokens.css side) and property references (.css side) merged into
 * one body, without `@import`, `@generated`/`@custom` markers, or the
 * trailing custom-overrides empty block.
 *
 * Lit's shadow DOM means sibling `<Component>.css` / `<Component>.tokens.css`
 * files cannot be loaded into the shadow root via `@import` — those files
 * exist for documentation and audit parity with the other framework
 * targets, while this string is what actually styles the rendered
 * shadow tree at runtime.
 */
export function emitLitInlineCss(ir: ComponentIR): string {
  const rootSelector = `.${ir.cssPrefix}`;
  const consumed = webTokenConsumption(ir).consumed;

  const tokensGroups = groupBlocksByRoot(onlyConsumedDeclarations(webCssBlocks(ir), consumed), rootSelector)
    .map((g) => filterGroupedBlock(g, "slots"))
    .map((g) => g.selector === rootSelector ? { ...g, decls: Object.fromEntries(Object.entries(g.decls).filter(([key]) => !key.startsWith("--fsds-box-model-"))) } : g)
    .map((g) => formatGroupedBlock(g))
    .filter((s) => s.length > 0);

  const propertyGroups = groupBlocksByRoot(webCssBlocks(ir), rootSelector)
    .map((g) => filterGroupedBlock(g, "properties"))
    .map((g) => formatGroupedBlock(g))
    .filter((s) => s.length > 0);

  const keyframesBody = webKeyframes(ir).map(formatKeyframes).join("\n").trimEnd();

  const parts: string[] = [emitBoxModelBoundaryCss(true)];
  if (tokensGroups.length > 0) parts.push(tokensGroups.join("\n\n"));
  if (propertyGroups.length > 0) parts.push(`@layer components.defaults {\n${propertyGroups.join("\n\n")}\n}`);
  if (keyframesBody) parts.push(keyframesBody);
  // Loop adaptation must live inside the same shadow root as its animation.
  if (ir.motion.loops.length) parts.push(reducedMotionBlock(ir));

  return parts.join("\n\n").trimEnd();
}

/**
 * Escape a CSS body for safe inclusion inside a Lit `css\`…\`` tagged
 * template literal. Backticks and `${` would terminate the literal /
 * inject an interpolation; nothing in our generated CSS legitimately
 * needs either, so we escape defensively rather than asserting absence.
 */
export function escapeCssForLitTemplate(css: string): string {
  return css.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}
