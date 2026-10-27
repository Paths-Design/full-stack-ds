/**
 * Contract `styles.json` drift validation (after the tokens/styles
 * convergence, PLAN-TOKENS-STYLES-CONVERGENCE-001).
 *
 * Two invariants:
 *
 *   1. **Namespace rule on `resolvesTo`.** Every `resolvesTo` path in a
 *      styles.json entry must resolve. If the first dotted segment matches
 *      the contract's `cssPrefix`, the path is component-local — it must
 *      name a slot declared in `<Name>.tokens.json`. Otherwise the path
 *      points at the global token graph (`core.*` / `semantic.*`) and is
 *      checked against the composed graph the same way tokens.json
 *      `resolvesTo` is.
 *
 *   2. **Selector-aliasing collisions.** Two distinct top-level keys in
 *      styles.json that expand to the same CSS selector silently overwrite
 *      each other's declarations through the cascade. e.g. a key `hover`
 *      (expands to `.x:hover`) AND a key `:hover` (also `.x:hover`) is an
 *      authoring bug — the author thought they were targeting different
 *      things. We surface it as DRIFT.
 *
 * Doctrinal stance, matching the sibling tokens.ts validator: never
 * modifies anything. Reads the contract and the composed-token-graph
 * cache, returns one ValidationIssue per problem.
 */

import type { ComponentContract, StyleEntry } from "../contract.js";
import { getCssPrefix } from "../contract.js";
import { loadBoxModelPrimitive } from "../box-model.js";
import {
  buildComponentIR,
  deriveWebDomCarriers,
  expandOptionsForContract,
  expandStylesKey,
} from "../ir.js";
import { loadKnownTokenPaths } from "./tokens.js";
import type { ValidationIssue } from "../validate.js";

/**
 * Validate every `resolvesTo` in `contract.styles` resolves correctly,
 * applying the namespace rule. Returns one issue per failing entry.
 */
export function validateContractStyles(
  contract: ComponentContract,
): ValidationIssue[] {
  const styles = contract.styles;
  if (!styles || typeof styles !== "object") return [];

  const cssPrefix = getCssPrefix(contract);
  const localSlots = new Set(Object.keys(contract.tokens ?? {}));
  const boxModelSlots = loadBoxModelPrimitive().slotNames;
  const known = loadKnownTokenPaths();
  const issues: ValidationIssue[] = [];

  for (const [selectorKey, block] of Object.entries(styles)) {
    if (!block || typeof block !== "object") continue;
    // Reserved `@starting-style` key: a selector→block map, not a block.
    // Recurse one level so nested selectors get the identical entry
    // validation (a typo'd resolvesTo in an entry state must fail the same
    // way one in a resting state does) instead of being read as properties.
    if (selectorKey === "@starting-style") {
      for (const [nestedKey, nestedBlock] of Object.entries(
        block as Record<string, Record<string, StyleEntry>>,
      )) {
        if (!nestedBlock || typeof nestedBlock !== "object") continue;
        collectStyleBlockIssues(contract, cssPrefix, localSlots, boxModelSlots, known, nestedKey, nestedBlock, issues);
      }
      continue;
    }
    collectStyleBlockIssues(
      contract,
      cssPrefix,
      localSlots,
      boxModelSlots,
      known,
      selectorKey,
      block as Record<string, StyleEntry>,
      issues,
    );
  }

  return issues;
}

/**
 * Validate one selector block's style entries (the shared body of
 * validateContractStyles). Extracted so the reserved `@starting-style`
 * nested blocks validate identically to top-level blocks.
 */
function collectStyleBlockIssues(
  contract: ComponentContract,
  cssPrefix: string,
  localSlots: ReadonlySet<string>,
  boxModelSlots: ReadonlySet<string>,
  known: ReturnType<typeof loadKnownTokenPaths>,
  selectorKey: string,
  block: Record<string, StyleEntry>,
  issues: ValidationIssue[],
): void {
  for (const [property, entry] of Object.entries(block)) {
    if (!entry || typeof entry !== "object") continue;

      // Slot-path property key: redefines a CSS custom property at this
      // selector's scope (variant/state redirection). The KEY itself must
      // name a real slot — either component-local (declared in this
      // contract's tokens.json) or a box-model primitive slot. Typoed
      // slot names silently no-op at runtime; this gate catches them at
      // validate time. The `resolvesTo` value gets the same global-graph
      // check the property-key path below applies — variant redirects
      // almost always point at semantic.* / core.* tokens, occasionally
      // at another component-local slot.
      if (property.includes(".")) {
        const keyFirstSegment = property.split(".")[0];
        const keyPointer = `/styles/${escapePointerSegment(selectorKey)}/${escapePointerSegment(property)}`;
        if (keyFirstSegment === "box-model") {
          if (!boxModelSlots.has(property)) {
            issues.push({
              pointer: keyPointer,
              message:
                `redefines box-model slot "${property}" which is not in the ` +
                `box-model primitive pool. Valid slots are declared in ` +
                `packages/ds-contracts/box-model.primitive.schema.json.`,
            });
            continue;
          }
        } else if (keyFirstSegment === cssPrefix) {
          if (!localSlots.has(property)) {
            issues.push({
              pointer: keyPointer,
              message:
                `redefines slot "${property}" which is not declared in ` +
                `${contract.name}.tokens.json. Declare the slot in tokens.json, ` +
                `or remove the redefinition.`,
            });
            continue;
          }
        } else {
          issues.push({
            pointer: keyPointer,
            message:
              `slot-path key "${property}" does not match the component's ` +
              `cssPrefix ("${cssPrefix}") or the box-model namespace. Slot ` +
              `redefinitions can only target slots declared by this component ` +
              `or by the box-model primitive.`,
          });
          continue;
        }
      }

      const resolvesTo = entry.resolvesTo;
      if (typeof resolvesTo !== "string") continue;
      const firstSegment = resolvesTo.split(".")[0];
      const pointer = `/styles/${escapePointerSegment(selectorKey)}/${escapePointerSegment(property)}/resolvesTo`;

      if (firstSegment === "box-model") {
        // Box-model primitive slot: must match one of the slot names
        // declared by box-model.primitive.schema.json. The slot itself
        // is guaranteed to exist on every component's root (defaults
        // injected at sidecar load) so the check is purely a typo gate.
        if (!boxModelSlots.has(resolvesTo)) {
          issues.push({
            pointer,
            message:
              `references box-model slot "${resolvesTo}" which is not in the ` +
              `box-model primitive pool. Valid slots are declared in ` +
              `packages/ds-contracts/box-model.primitive.schema.json.`,
          });
        }
        continue;
      }

      if (firstSegment === cssPrefix) {
        // Component-local: must match a declared slot.
        if (!localSlots.has(resolvesTo)) {
          issues.push({
            pointer,
            message:
              `references slot "${resolvesTo}" which is not declared in ` +
              `${contract.name}.tokens.json. Declare the slot, or change ` +
              `resolvesTo to reference an existing slot.`,
          });
        }
        continue;
      }

      // Global graph reference. Mirrors validateContractTokens.
      if (known === "missing") {
        issues.push({
          pointer,
          message:
            `cannot validate global token "${resolvesTo}" — token graph not built. ` +
            `Run \`pnpm -F @full-stack-ds/tokens build\` to emit ` +
            `packages/ds-tokens/generated/composed.tokens.json.`,
        });
        continue;
      }
      if (!known.has(resolvesTo)) {
        issues.push({
          pointer,
          message:
            `references global token "${resolvesTo}" which is not defined in ` +
            `the token graph. Author styles.json prefers component-local slot ` +
            `references (paths starting with "${cssPrefix}.") because the slot ` +
            `gives brands a per-component override point. Either add the slot ` +
            `to tokens.json or fix the resolvesTo path.`,
        });
      }
    }
}

/**
 * Detect when two distinct top-level keys in styles.json expand to the
 * same CSS selector. The IR's last-writer-wins on declaration insertion
 * means one key's properties silently overwrite the other's — almost
 * always an authoring bug.
 */
export function validateStylesSelectorCollisions(
  contract: ComponentContract,
): ValidationIssue[] {
  const styles = contract.styles;
  if (!styles || typeof styles !== "object") return [];

  const cssPrefix = getCssPrefix(contract);
  // Mirror the portal-aware selector emission in computeCssBlocks so
  // collision detection sees the same final selectors. Without this
  // the validator would think `[data-popover-content]` and
  // `.popover [data-popover-content]` produce different selectors,
  // when in fact they both collapse to `[data-popover-content]` at
  // emit time for portal-enabled surfaces.
  const portalEnabled = contract.portal?.enabled === true;
  const expandOptions = portalEnabled
    ? { portalContentSelector: `[data-${cssPrefix}-content]` }
    : undefined;
  const seen = new Map<string, string>();
  const issues: ValidationIssue[] = [];

  for (const key of Object.keys(styles)) {
    // Reserved `@starting-style` key is an at-rule wrapper, not a selector;
    // its nested selectors live in a separate at-rule scope and cannot
    // collide with top-level keys.
    if (key === "@starting-style") continue;
    const selector = expandStylesKey(key, cssPrefix, expandOptions);
    const prior = seen.get(selector);
    if (prior !== undefined && prior !== key) {
      issues.push({
        pointer: `/styles/${escapePointerSegment(key)}`,
        message:
          `selector "${selector}" is also produced by key "${prior}". ` +
          `Two distinct styles.json keys that resolve to the same CSS ` +
          `selector overwrite each other's declarations through the ` +
          `cascade. Pick one canonical form (prefer the shorthand: ` +
          `"hover" over ":hover", "__track" over "track" only when needed ` +
          `to disambiguate).`,
      });
      continue;
    }
    seen.set(selector, key);
  }

  return issues;
}

/**
 * Component-owned class tokens in an expanded selector.
 *
 * "Owned" means the token is in this component's own BEM namespace: the root
 * class, a `--modifier`, or a `__part`. Everything else in the selector —
 * another component's class, a `[data-*]` marker, a pseudo-class, a
 * combinator, a bare tag — belongs to a different question (does the selector
 * match at runtime?) and is deliberately not adjudicated here. Claiming
 * authority over arbitrary descendant selectors would turn this validator into
 * a general satisfiability solver and produce findings it cannot justify.
 */
interface OwnedToken {
  /** The full class as written in the selector, e.g. `tabs__tab--active`. */
  token: string;
  /** The carrier this component must actually produce for the token to match. */
  required: string;
  kind: "root" | "modifier" | "part";
}

function ownedClassTokens(selector: string, base: string): OwnedToken[] {
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\.(${esc}(?:__[\\w-]+|--[\\w-]+)?)(?![\\w-])`, "g");
  const out: OwnedToken[] = [];
  for (const m of selector.matchAll(re)) {
    const token = m[1];
    if (token === base) {
      out.push({ token, required: base, kind: "root" });
      continue;
    }
    const partMatch = new RegExp(`^${esc}__([A-Za-z0-9]+)`).exec(token);
    if (partMatch) {
      // `tabs__tab--active` requires the PART carrier `tabs__tab`; whether the
      // `--active` suffix is produced is a part-scoped modifier question the
      // class recipe does not describe (it only covers root modifiers), so it
      // is left unadjudicated rather than guessed at.
      out.push({ token, required: `${base}__${partMatch[1]}`, kind: "part" });
      continue;
    }
    out.push({ token, required: token, kind: "modifier" });
  }
  return out;
}

/**
 * Producible carriers that plausibly answer an unreachable one, so the
 * diagnostic names a repair instead of only a failure. Matched on the last
 * dash-delimited segment: `details--icon-none` is unreachable while
 * `details--none` is produced, and they share `none`.
 */
function nearestCarriers(missing: string, base: string, produced: ReadonlySet<string>): string[] {
  const tail = missing.split("-").filter(Boolean).pop();
  if (!tail) return [];
  return [...produced]
    .filter((c) => c !== missing && c.startsWith(`${base}--`) && c.endsWith(tail))
    .sort()
    .slice(0, 3);
}

/**
 * RAIL-WEB-STYLE-CARRIER-REACHABILITY-01 — does authored CSS demand a carrier
 * the Web-DOM realization can never produce?
 *
 * `styles.json` accepts raw-selector keys that `expandStylesKey` passes through
 * verbatim, and nothing has ever checked them against what the emitters place
 * on an element. `Details.styles.json` authors `.details--icon-none
 * .details__icon`, while `classRecipe` emits `details--${icon}` for that
 * disjoint axis — so the rule compiles into all five web packages and matches
 * nothing. Same shape one level down: a `__part` block for a part the dom tree
 * never carries.
 *
 * The question this answers, exactly: **does every component-owned carrier an
 * authored selector requires appear in the set the IR can produce?** It is one
 * direction only. An emitted variant class with no matching CSS rule is the
 * INVERSE problem (a declared visual distinction nobody painted) and is not a
 * finding here — that census lives in the variant-style rail.
 *
 * Named non-claims. A reachable carrier does NOT mean the rule wins the
 * cascade, changes computed style, supplies content the part needs, or
 * realizes the intended visual distinction: repairing Details' modifier proves
 * the selector can attach to an element, not that the disclosure indicator is
 * functionally complete (its `__icon` span is empty). Pseudo-class host
 * satisfiability (`:disabled` on a `<span>`), `aria-*` truth, and suppression
 * guards stay with the element-awareness and pseudo-state rails; this
 * validator does not evaluate them.
 *
 * A finding is never authority to delete the contract side. Resolution may be
 * selector repair, realization repair, or independently justified contract
 * retirement — adjudicated per case, per
 * FIX-DEAD-SLOT-UNRENDERED-PART-AUTHORITY-01.
 */
export function validateStylesCarrierReachability(
  contract: ComponentContract,
): ValidationIssue[] {
  const styles = contract.styles;
  if (!styles || typeof styles !== "object") return [];

  const cssPrefix = getCssPrefix(contract);
  const carriers = deriveWebDomCarriers(buildComponentIR(contract), contract);
  const expandOptions = expandOptionsForContract(contract, cssPrefix);
  const issues: ValidationIssue[] = [];

  for (const key of Object.keys(styles)) {
    // `computeCssBlocks` skips the `root` key — it IS the base block and never
    // goes through `expandStylesKey`. Adjudicating it here would invent a
    // `.<base>__root` carrier the emitter never asks for.
    if (key === "root") continue;

    const selector = expandStylesKey(key, cssPrefix, expandOptions);
    for (const { token, required, kind } of ownedClassTokens(selector, cssPrefix)) {
      if (kind === "root" || carriers.classes.has(required)) continue;

      // A part class in a contract with no `anatomy.dom` is INDETERMINATE, not
      // unreachable: the IR has no dom tree to walk, so the producible part set
      // is unknown. Card/Popover/Tooltip are in this state. Reporting them
      // would be inferring a defect from missing information.
      if (kind === "part" && !carriers.partsDeterminate) continue;

      const near = nearestCarriers(required, cssPrefix, carriers.classes);
      issues.push({
        pointer: `/styles/${escapePointerSegment(key)}`,
        message:
          `styles key "${key}" requires the component-owned carrier ` +
          `".${required}", which the Web-DOM IR never produces, so the rule ` +
          `compiles into every web package and matches nothing` +
          (token === required ? "" : ` (from ".${token}")`) +
          `. ` +
          (kind === "part"
            ? `Part carriers come from what the realization renders — the ` +
              `\`anatomy.dom\` tree, compound subcomponents, and content-transform ` +
              `vocabularies — not from \`anatomy.parts\`. Either the realization ` +
              `is missing the part or the styles key names one the component does ` +
              `not have; adjudicate, because the realization's silence does not ` +
              `decide it.`
            : `Modifier spelling is owned by \`classRecipe\`: a colliding axis ` +
              `emits \`--<axis>-<value>\`, a disjoint axis emits \`--<value>\`. ` +
              (near.length
                ? `Produced carriers sharing this value: ${near.map((c) => `".${c}"`).join(", ")}.`
                : `No produced carrier shares this value.`)),
      });
    }
  }

  return issues;
}

function escapePointerSegment(seg: string): string {
  return seg.replace(/~/g, "~0").replace(/\//g, "~1");
}
