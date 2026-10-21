#!/usr/bin/env node
/**
 * RAIL-A11Y-REALIZATION-01 — accessibility-realization audit rail.
 *
 * READ-ONLY over source. Derives, for every component, the ACCESSIBILITY
 * obligations IMPLIED BY THE LIVE CONTRACT CORPUS (never a committed frozen
 * classification), then verifies each is REALIZED in the committed generated
 * output of every rail-admitted family. It classifies and reports; it fixes
 * nothing and writes only under docs/internal/a11y-realization-audit/
 * (gitignored machine-local state). The only committed input it consumes
 * besides source is the known-gaps ledger beside this script.
 *
 * Why this rail exists: a contract can declare an ARIA relationship
 * (label.for -> control.id), a keyboard surface (arrow-key navigation), or a
 * focus strategy (roving/trap) that NO emitter realizes — and every existing
 * gate stays green. Schema checks the declaration's shape; typecheck and the
 * governed rail check the bytes; per-component axe tests cannot see keyboard
 * at all and miss relationship gaps that only manifest in composed usage.
 * Field's label association was declared (with a described context mechanism)
 * and realized NOWHERE — this rail makes that class of fiction fail loud.
 *
 * -- Obligation classes (each derived from a contract FACT, falsifiable) -----
 *
 *   RELATIONSHIP — every `relationships[]` entry demands its `attribute` on
 *                  the emitted `from` part. IDREF attributes additionally
 *                  demand an id on the emitted `to` part and a matching
 *                  target-id token in the source attribute. Merely finding
 *                  `aria-labelledby` elsewhere in the file is not evidence.
 *                  A family with no surface for an attribute is an EXPLICIT
 *                  documented exclusion in the report — never a silent skip.
 *
 *   KEYBOARD     — every ATOMIC key of an `a11y.keyboard` entry demands a
 *                  realization:
 *                  NATIVE   (the interactive part is a native element whose
 *                            platform behavior provides the declared keys —
 *                            Enter/Space on button/summary, Space on
 *                            checkbox input, text entry on input). Inside a
 *                            focus:roving composite a native key counts only
 *                            when the roving items are reachable (see FOCUS):
 *                            an untabbable native button supplies nothing,
 *                  PRIMITIVE (an imported behavior primitive owns the keys —
 *                            focus trap: Tab/Shift+Tab; dismissal/anchor
 *                            toggle: Escape), or
 *                  EXPLICIT  (a keydown handler in the emitted source that
 *                            COMPARES that key — `key === "PageUp"`,
 *                            `case "Home":`; Space is `" "` or code "Space").
 *                            A handler that never names the key realizes
 *                            nothing for it.
 *                  Named native radio inputs supply arrow navigation.
 *                  Other composite navigation requires PRIMITIVE or EXPLICIT.
 *
 *   FOCUS        — `focus.strategy: "trap"` demands the focus-trap primitive;
 *                  `focus.strategy: "roving"` demands explicit key handling
 *                  AND a way in: a dynamic tabindex binding (one item is the
 *                  tab stop) or a declared `behavior: "open"` entry action
 *                  that moves focus into the items. Roving cannot be native.
 *
 *   STATE-ATTRIBUTE — every state ARIA attribute the contract declares
 *                  (`states.dimensions.<d>.a11y.attribute`, or an
 *                  aria-selected/-checked/-expanded/-pressed/-current on an
 *                  `anatomy.dom` node) demands a binding that tracks state.
 *                  A static literal (`aria-selected="true"`) or an absent
 *                  attribute is unrealized. Native equivalents count where the
 *                  platform carries the state itself (input `checked`,
 *                  details `open`, SwiftUI Toggle/DisclosureGroup traits,
 *                  Compose selectable/toggleable semantics).
 *
 *   INTERACTIVE-ROLE — a contract with interactive parts demands that every
 *                  activation site in a native family carries a role
 *                  (react-native Pressable accessibilityRole, Compose
 *                  clickable/selectable/toggleable `role =`, SwiftUI no bare
 *                  onTapGesture without the button trait). Web roles come
 *                  from native elements and are checked by generated axe
 *                  tests, so the web family is an explicit exclusion here.
 *
 * Families are iterated from the compiled AdmissionDescriptor registry — the
 * SINGLE SOURCE for rail-admitted targets (react, vue, svelte, lit, angular,
 * react-native today) — plus every registered native-view target pack from
 * fsds.targets.json (swiftui, jetpack-compose, and the engine pilots). A
 * native-view target with a surface table below is classified as the
 * `native-declarative` kind; one without a table (and the figma design-tool
 * target) is reported as an explicit family exclusion with its reason, never
 * silently skipped. This script never hardcodes a family list; a new target
 * joins this rail automatically and its gaps must be either realized or
 * ledgered. Build codegen first
 * (`pnpm exec turbo run build --filter=@full-stack-ds/codegen`).
 *
 * -- Ledger semantics (two-directional failure) ------------------------------
 * known-gaps.json enumerates the PRE-EXISTING unrealized obligations, each
 * naming the campaign spec that owns its burn-down. The rail FAILS when an
 * unrealized obligation is absent from the ledger (new gap — fix it or ledger
 * it in review) AND when a ledger entry no longer reproduces (stale debt —
 * delete the entry). The ledger can only shrink truthfully; it cannot rot.
 *
 * NON-CLAIMS: this is a STATIC SOURCE-LEVEL check. Matching emitted source
 * ownership does not prove the contract chose the semantically correct part,
 * runtime branch, or accessible name; a keydown handler does not prove correct
 * focus order; native realization does not prove AT announces well. Runtime
 * truth stays with the Playwright rails and axe checks. This rail is
 * drift-protection for the accessibility surface the contracts promise — the
 * "declared but not emitted on its declared carrier" class.
 *
 * Usage:  node scripts/a11y-realization-audit/audit.mjs
 * Output: docs/internal/a11y-realization-audit/a11y-matrix.{json,md}
 * Exit:   nonzero on unledgered gap OR stale ledger entry.
 */
import {
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const CONTRACTS = resolve(REPO, "packages/ds-contracts/components");
const OUT_DIR = resolve(REPO, "docs/internal/a11y-realization-audit");
const LEDGER_PATH = resolve(HERE, "known-gaps.json");
const DIST = resolve(REPO, "packages/ds-codegen/dist");

// ---- family registry (single source of truth: AdmissionDescriptor) ---------
let descriptors;
try {
  const mod = await import(resolve(DIST, "validation/admission-descriptor.js"));
  descriptors = Object.values(mod.ADMISSION_DESCRIPTORS).sort(
    (a, b) => a.reportRank - b.reportRank,
  );
} catch (err) {
  console.error(
    "FATAL: could not import compiled admission-descriptor registry from",
    DIST,
    "\nBuild codegen first: pnpm exec turbo run build --filter=@full-stack-ds/codegen",
  );
  console.error(String(err));
  process.exit(2);
}

/** Family kind: how this family expresses accessibility. Derived, not authored
 * per component: react-native is the one non-DOM family in the registry. */
function familyKind(id) {
  return id === "react-native" ? "native-mobile" : "web-dom";
}

/**
 * Declarative native families (registered native-view target packs) whose
 * accessibility surface this rail knows how to read. A registered native-view
 * pack absent from this table is reported as an excluded family with
 * NATIVE_VIEW_EXCLUSION_REASON — visible, never silent.
 */
const NATIVE_DECLARATIVE_SURFACE = {
  swiftui: { extensions: [".swift"] },
  "jetpack-compose": { extensions: [".kt"] },
};
const NATIVE_VIEW_EXCLUSION_REASON =
  "engine pilot target: no accessibility surface table (its emitted toolkit has no screen-reader role/state API the rail can read)";
const DESIGN_TOOL_EXCLUSION_REASON =
  "design-tool descriptors carry no runtime accessibility surface";

/** Registered non-descriptor targets, resolved to rail families or explicit
 * exclusions from the compiled builtin target-pack manifests. */
async function loadRegisteredTargetFamilies(admittedIds) {
  let packs;
  try {
    packs = (await import(resolve(DIST, "target-packs/builtin.js"))).BUILTIN_TARGET_PACKS;
  } catch (err) {
    console.error("FATAL: could not import compiled builtin target packs from", DIST);
    console.error(String(err));
    process.exit(2);
  }
  const registry = JSON.parse(readFileSync(resolve(REPO, "fsds.targets.json"), "utf-8"));
  return resolveRegisteredFamilies(registry.targets ?? [], packs, admittedIds);
}

/**
 * Every registered target that is not an AdmissionDescriptor family becomes
 * either a classified `native-declarative` family or a named exclusion with a
 * reason. No registration is dropped.
 */
export function resolveRegisteredFamilies(targets, packs, admittedIds) {
  const families = [];
  const excludedFamilies = [];
  for (const { id, source } of targets) {
    if (admittedIds.has(id)) continue;
    const pack = packs[id];
    if (source?.kind !== "builtin" || !pack) {
      // A local (metadata-only) or otherwise unresolvable registration has no
      // emitted tree this rail can read; it is named, never dropped.
      excludedFamilies.push({
        id,
        reason:
          source?.kind === "local"
            ? "local target pack: metadata-only, its emitter is not executed so no output tree exists to audit"
            : `registered target "${id}" has no builtin target-pack manifest`,
      });
      continue;
    }
    if (pack.target.family === "design-tool") {
      excludedFamilies.push({ id, reason: DESIGN_TOOL_EXCLUSION_REASON });
      continue;
    }
    if (pack.target.family !== "native-view") {
      excludedFamilies.push({
        id,
        reason: `registered ${pack.target.family} target is not rail-admitted (no AdmissionDescriptor)`,
      });
      continue;
    }
    const surface = NATIVE_DECLARATIVE_SURFACE[id];
    const packageRoot = pack.admission?.commands?.[0]?.scope?.packageRoot;
    if (!surface || !packageRoot) {
      excludedFamilies.push({ id, reason: NATIVE_VIEW_EXCLUSION_REASON });
      continue;
    }
    families.push({
      id,
      kind: "native-declarative",
      outputTreeRelPath: join(packageRoot, pack.outputs.componentsRoot),
      sourceExtensions: surface.extensions,
    });
  }
  return { families, excludedFamilies };
}

const registeredTargets = await loadRegisteredTargetFamilies(
  new Set(descriptors.map((d) => d.id)),
);

// ---- per-family realization surfaces ---------------------------------------
/**
 * RELATIONSHIP attribute -> any-of source tokens, per family kind.
 * web-dom: the literal attribute substring matches every web framework's
 * spelling (react JSX attr, vue :attr, svelte attr, lit attr=${}, angular
 * [attr.x]) — except `for`, which react spells htmlFor and angular binds as
 * attr.for; the any-of list covers each spelling.
 * native-mobile: the react-native accessibility-prop mapping where one
 * exists; `null` means the family has NO surface for this attribute and the
 * obligation is family-excluded (reported with reason, not counted).
 */
const RELATIONSHIP_SURFACE = {
  "web-dom": {
    for: ["htmlFor", 'for="', "for=${", ":for", "attr.for", "for={"],
    // default: the attribute name itself (see relationshipTokens()).
  },
  "native-mobile": {
    "aria-label": ["accessibilityLabel", "aria-label"],
    "aria-labelledby": ["accessibilityLabelledBy", "aria-labelledby"],
    "aria-hidden": [
      "accessibilityElementsHidden",
      "importantForAccessibility",
      "aria-hidden",
    ],
    "aria-expanded": ["accessibilityState", "aria-expanded"],
    for: null,
    "aria-describedby": null,
    "aria-controls": null,
    "aria-sort": null,
    "aria-activedescendant": null,
  },
};

const NATIVE_MOBILE_EXCLUSION_REASONS = {
  for: "no react-native idref label-for surface (labelling is accessibilityLabel/LabelledBy)",
  "aria-describedby":
    "no react-native idref describedby surface (accessibilityHint is prose, not an idref)",
  "aria-controls": "no react-native controls-idref surface",
  "aria-sort": "no react-native sort-state surface",
  "aria-activedescendant": "no react-native activedescendant surface",
};

/** Keyboard/focus are DOM concepts; the native-mobile family realizes
 * activation/focus through the host platform (screen reader / dpad), so those
 * obligation classes are family-excluded there with this reason. */
const NATIVE_MOBILE_KEYBOARD_REASON =
  "DOM keyboard/focus semantics do not apply to react-native; activation and focus are host-platform concerns";

/** Declarative native families realize keyboard/focus through the platform
 * focus engine, and their labels are not idref relationships. */
const NATIVE_DECLARATIVE_EXCLUSION_REASONS = {
  relationship:
    "declarative native toolkits have no idref relationship surface (names come from the control's own label)",
  keyboard:
    "keyboard navigation is a host-platform focus-engine concern in declarative native toolkits",
  focus:
    "focus movement is a host-platform focus-engine concern in declarative native toolkits",
};
const WEB_INTERACTIVE_ROLE_REASON =
  "web roles come from native elements and anatomy role attributes, checked by the generated axe tests";

/** Explicit keydown handling across the web frameworks' event spellings. */
const EXPLICIT_KEY_RE =
  /onKeyDown|onkeydown|@keydown|on:keydown|\(keydown\)|addEventListener\(["']keydown/;

/**
 * How a keydown handler names each contract key. `KeyboardEvent.key` for the
 * space bar is " " (or the legacy "Spacebar"); `KeyboardEvent.code` is
 * "Space". A bare `" "` string is never accepted on its own — every
 * `classNames.join(" ")` would satisfy it — only a comparison against `key`
 * or a `case " ":` arm counts.
 */
const KEY_SPELLINGS = {
  Space: { key: [" ", "Spacebar"], code: ["Space"] },
  Escape: { key: ["Escape", "Esc"], code: ["Escape"] },
};

/** True when `src` compares a keyboard event against `key`. */
export function handlesKey(src, key) {
  const spellings = KEY_SPELLINGS[key] ?? { key: [key], code: [] };
  const patterns = [];
  for (const spelling of spellings.key) {
    const q = escapeRegExp(spelling);
    patterns.push(
      // `key === "End"`, and the guard form `key !== "End"` whose fallthrough
      // branch handles the key.
      new RegExp(`\\bkey\\s*(?:={2,3}|!==?)\\s*["'\`]${q}["'\`]`),
      new RegExp(`["'\`]${q}["'\`]\\s*(?:={2,3}|!==?)\\s*[\\w.?]*\\bkey\\b`),
      new RegExp(`\\bcase\\s+["'\`]${q}["'\`]\\s*:`),
    );
  }
  for (const spelling of spellings.code) {
    patterns.push(new RegExp(`\\bcode\\s*={2,3}\\s*["'\`]${escapeRegExp(spelling)}["'\`]`));
  }
  return patterns.some((re) => re.test(src));
}

/** Keydown handler expressions a component binds, in each framework spelling. */
const KEYDOWN_BINDING_RES = [
  /\bonKeyDown=\{([^}]+)\}/g, // react
  /\bon:?keydown=\{([^}]+)\}/g, // svelte 5 / svelte 4
  /(?:@|v-on:)keydown(?:\.[\w.]+)?="([^"]+)"/g, // vue
  /\(keydown(?:\.[\w.]+)?\)="([^"]+)"/g, // angular
  /@keydown=\$\{([^}]+)\}/g, // lit
  /addEventListener\(\s*["']keydown["']\s*,\s*([^,)]+)/g, // programmatic
];

/**
 * True when a keydown expression the component binds names a function that the
 * primitive source defines, and that function's body compares `key`. The
 * definition region runs from the definition to the next top-level-looking
 * definition, bounded so an unrelated later function is not borrowed.
 */
export function boundPrimitiveHandlesKey(ownSrc, primitiveSrc, key) {
  const names = new Set();
  for (const re of KEYDOWN_BINDING_RES) {
    for (const m of ownSrc.matchAll(re)) {
      for (const id of m[1].match(/[A-Za-z_$][\w$]*/g) ?? []) {
        if (id.length > 2) names.add(id);
      }
    }
  }
  for (const name of names) {
    // function N( … | N(params) { (method shorthand; params may nest parens,
    // so the line is matched greedily) | N = / N: an arrow or function.
    const n = escapeRegExp(name);
    const definition = new RegExp(
      `(?:^|[\\s,{(])(?:function\\s+${n}\\s*\\(|${n}\\s*\\([^\\n]*\\)\\s*(?::[^\\n{]*)?\\{|${n}\\s*[:=]\\s*(?:async\\s+)?(?:function\\b|\\([^\\n]*?\\)\\s*(?::[^\\n=]*)?=>|[A-Za-z_$][\\w$]*\\s*=>))`,
      "g",
    );
    for (const m of primitiveSrc.matchAll(definition)) {
      const start = m.index ?? 0;
      const rest = primitiveSrc.slice(start + m[0].length);
      // The next definition ends the body; control-flow keywords that share
      // the `name(...) {` shape (`if (…) {`) are not definitions.
      const next = /\n\s*(?:export\s+)?(?:function\s|const\s|let\s|(?!(?:if|for|while|switch|catch|return|else)\b)[A-Za-z_$][\w$]*\s*\([^\n]*\)\s*\{\s*$)/m.exec(rest);
      const body = rest.slice(0, next ? Math.min(next.index, 1200) : 1200);
      if (handlesKey(body, key)) return true;
    }
  }
  return false;
}

/**
 * A tabindex whose value is computed (one roving item is the tab stop) in each
 * framework's spelling. A literal (`tabIndex={-1}`, `:tabindex="0"`) is not a
 * roving tab stop.
 */
const DYNAMIC_TABINDEX_RES = [
  /\btab[iI]ndex=\{(?!\s*-?\d+\s*\})/, // react / svelte
  /:tabindex="(?!\s*-?\d+\s*")/, // vue
  /\[(?:attr\.)?tab[iI]ndex\]="(?!\s*-?\d+\s*")/, // angular
  /\btabindex="?\$\{(?!\s*-?\d+\s*\})/, // lit
  // Whitespace sits INSIDE each negative lookahead: a `\s*` before it would
  // backtrack to zero width and let the lookahead inspect the space instead.
  /setAttribute\(\s*["']tabindex["']\s*,(?!\s*["']-?\d+["']\s*\))/, // programmatic
  /\.tabIndex\s*=(?!=)(?!\s*-?\d+\s*[;\n,)])/, // property assignment
];

/** Roving items are reachable when one is a computed tab stop, or when the
 * contract's `behavior: "open"` entry action is EMITTED: its key is compared
 * and focus is moved programmatically. A declaration alone is not a way in. */
export function rovingReachable(src, roving) {
  if (DYNAMIC_TABINDEX_RES.some((re) => re.test(src))) return true;
  const entryKeys = roving?.entryKeys ?? [];
  return (
    entryKeys.length > 0 &&
    entryKeys.every((spec) => atomicKeys(spec).every((k) => handlesKey(src, k))) &&
    /\.focus\(/.test(src)
  );
}

/** ARIA attributes whose value is component state, not configuration. */
const STATE_ARIA_ATTRIBUTES = new Set([
  "aria-selected",
  "aria-checked",
  "aria-expanded",
  "aria-pressed",
  "aria-current",
]);

/** A constant inside a binding delimiter — `{true}`, `"false"`, `'true'` —
 * pins the value exactly as a quoted literal does. */
const CONSTANT_BINDING = String.raw`\s*(?:true|false|mixed|"[^"]*"|'[^']*'|-?\d+)\s*`;

/** Web-dom: the attribute bound to an expression in each framework spelling. */
function webDynamicStateRes(attr) {
  const a = escapeRegExp(attr);
  return [
    new RegExp(`(?<![\\w-])${a}=\\{(?!${CONSTANT_BINDING}\\})`), // react / svelte
    new RegExp(`(?:^|[\\s<])(?::|v-bind:)${a}="(?!${CONSTANT_BINDING}")`), // vue
    new RegExp(`\\[(?:attr\\.)?${a}\\]="(?!${CONSTANT_BINDING}")`), // angular
    new RegExp(`(?<![\\w-])${a}="?\\$\\{(?!${CONSTANT_BINDING}\\})`), // lit
    new RegExp(`setAttribute\\(\\s*["']${a}["']\\s*,(?!\\s*["'][^"']*["']\\s*\\))`), // programmatic
    // Prop-getter objects spread onto a trigger: `"aria-expanded": ctx.open`
    // and `ariaProps["aria-expanded"] = isOpen`.
    new RegExp(`["']${a}["']\\s*:(?!\\s*["'][^"']*["'])`),
    new RegExp(`\\[\\s*["']${a}["']\\s*\\]\\s*=(?!=)(?!\\s*["'])`),
    new RegExp(`HostBinding\\(\\s*["']attr\\.${a}["']\\s*\\)`), // angular host binding
  ];
}

/** Web-dom: the attribute pinned to a constant, capturing the constant in
 * group `v`. A CSS/selector string (`[aria-selected="true"]`) is preceded by
 * `[` and never matches. Constants inside binding delimiters count too. */
function webStaticStateRes(attr) {
  const a = escapeRegExp(attr);
  const constant = String.raw`\s*(?:"(?<v1>[^"]*)"|'(?<v2>[^']*)'|(?<v3>true|false|mixed|-?\d+))\s*`;
  return [
    new RegExp(`(?<![\\w:.\\[-])${a}=(["'])(?!\\$\\{)(?<v>[^"'{}]*)\\1`),
    new RegExp(`setAttribute\\(\\s*["']${a}["']\\s*,\\s*["'](?<v>[^"']*)["']\\s*\\)`),
    new RegExp(`["']${a}["']\\s*:\\s*["'](?<v>true|false|mixed)["']`),
    new RegExp(`(?<![\\w-])${a}=\\{${constant}\\}`), // react / svelte {true}
    new RegExp(`(?:^|[\\s<])(?::|v-bind:)${a}="${constant}"`), // vue :a="true"
    new RegExp(`\\[(?:attr\\.)?${a}\\]="${constant}"`), // angular [attr.a]="true"
    new RegExp(`(?<![\\w-])${a}="?\\$\\{${constant}\\}`), // lit ${true}
  ];
}

/** The constant values a source pins `attr` to (empty when none). */
export function staticStateValues(src, attr) {
  const values = [];
  for (const re of webStaticStateRes(attr)) {
    const global = new RegExp(re.source, "g");
    let m;
    while ((m = global.exec(src)) !== null) {
      const g = m.groups ?? {};
      values.push(g.v ?? g.v1 ?? g.v2 ?? g.v3 ?? "");
    }
  }
  return values;
}

/** Web-dom native elements that carry the state themselves. */
const WEB_NATIVE_STATE = {
  "aria-checked": {
    tag: "input",
    res: [/\bchecked=\{/, /:checked="/, /\[checked\]="/, /[.?]checked=\$\{/, /\bbind:checked\b/],
  },
  "aria-expanded": {
    tag: "details",
    res: [/\bopen=\{/, /:open="/, /\[open\]="/, /[.?]open=\$\{/, /\bbind:open\b/],
  },
};

/** react-native: accessibilityState keys (and aria-* props) per attribute;
 * `null` means react-native has no surface for that state. */
const RN_STATE_KEYS = {
  "aria-selected": "selected",
  "aria-checked": "checked",
  "aria-expanded": "expanded",
  "aria-pressed": "checked",
  "aria-current": null,
};

/** Constant state forms accepted only where the contract itself pins the
 * attribute to a constant (`declaredStatic`). */
const NATIVE_DECLARATIVE_STATIC_STATE = {
  swiftui: {
    "aria-selected": [/\.accessibilityAddTraits\(\s*\.isSelected\s*\)/],
  },
  "jetpack-compose": {
    "aria-selected": [/(?<!\b(?:val|var)\s+)\bselected\s*=\s*true\b/],
  },
};

/** Compose `selected = <expr>` semantics argument: not a `val selected =`
 * declaration, not an `==` comparison, not a constant. */
const COMPOSE_SELECTED_RE = /(?<!\b(?:val|var)\s+)\bselected\s*=(?!=)(?!\s*(?:true|false)\b)/;

/** Declarative native state surfaces. Each entry: dynamic realizations
 * (state tracked) — static constants are treated as unrealized. */
const NATIVE_DECLARATIVE_STATE = {
  swiftui: {
    // Picker / DatePicker / TabView own their selection semantics natively.
    "aria-selected": [/\?\s*\[\.isSelected\]\s*:\s*\[\]/, /\bPicker\(/, /\bDatePicker\(/, /\bTabView\b/],
    "aria-checked": [/\bToggle\(/, /\bPicker\(/, /\.accessibilityValue\((?!\s*")/],
    // A Menu's presentation state is system-managed.
    "aria-expanded": [/\bDisclosureGroup\b/, /\bMenu\s*[({]/, /\.accessibilityValue\((?!\s*")/],
    "aria-pressed": [/\bToggle\(/, /\?\s*\[\.isSelected\]\s*:\s*\[\]/],
    "aria-current": [/\?\s*\[\.isSelected\]\s*:\s*\[\]/],
  },
  "jetpack-compose": {
    "aria-selected": [COMPOSE_SELECTED_RE],
    // A selectable radio (`selectable(selected = …, role = Role.RadioButton)`)
    // is Compose's checked-radio idiom.
    "aria-checked": [/\btoggleable\(/, /\btriStateToggleable\(/, /\btoggleableState\s*=/, COMPOSE_SELECTED_RE],
    "aria-expanded": [/\bexpand\s*[({]/, /\bcollapse\s*[({]/],
    "aria-pressed": [/\btoggleable\(/, COMPOSE_SELECTED_RE],
    "aria-current": [COMPOSE_SELECTED_RE],
  },
};

/** `aria-current` beside a dynamic `aria-selected` (a date grid's today among
 * its selected days): the selected-state surfaces above already realize the
 * selection, so crediting them for "current" would announce the current item
 * as selected. A distinct state value must carry it. */
const NATIVE_CURRENT_BESIDE_SELECTION = {
  swiftui: [/\.accessibilityValue\((?!\s*")/],
  "jetpack-compose": [/\bstateDescription\s*=/],
};

/** Behavior primitives that own specific keys, mirrored across frameworks
 * under different names (useX / createX / XController). A primitive counts
 * only where the source runs it — `useX(`, `createX(` or `new XController(` —
 * because an import, a type position or a comment names it without running
 * it. The focus trap compares Tab only; the dismissal, anchor-toggle and
 * anchored-surface primitives compare Escape only, so neither carries the
 * other's key. */
const TRAP_CALL_RE = /\b(?:useFocusTrap|createFocusTrap)\s*\(|\bnew\s+FocusTrapController\s*\(/;
const ESCAPE_CLOSER_CALL_RE =
  /\b(?:useAnchorToggle|createAnchorToggle|useAnchoredSurface|createAnchoredSurface)\s*\(|\bnew\s+(?:AnchorToggleController|AnchoredSurfaceController)\s*\(/;
const DISMISSAL_CALL_RE = /\b(?:useDismissal|createDismissal)\s*\(|\bnew\s+DismissalController\s*\(/;
/** A dismissal's onDismiss callback, and the shapes that do nothing — the
 * lowering for a component with no disclosure channel to close, where Escape
 * is heard and ignored. */
const ON_DISMISS_RE = /\bonDismiss\s*:\s*([^,\n]+)/g;
const NO_OP_CALLBACK_RE = /^\(\)\s*=>\s*(?:void 0|undefined|\{\s*(?:void 0;?)?\s*\})$/;

/** The source runs the focus trap, which keeps Tab and Shift+Tab inside. */
export function focusTrapInvoked(src) {
  return TRAP_CALL_RE.test(src);
}

/** The source runs a primitive that closes on Escape: an anchor toggle or
 * anchored surface, or a dismissal whose onDismiss does something. */
export function escapeCloserInvoked(src) {
  if (ESCAPE_CLOSER_CALL_RE.test(src)) return true;
  if (!DISMISSAL_CALL_RE.test(src)) return false;
  return [...src.matchAll(ON_DISMISS_RE)].some((match) => !NO_OP_CALLBACK_RE.test(match[1].trim()));
}

/** Keys the platform provides on native interactive elements. */
const NATIVE_KEYS = new Set(["Enter", "Space", "Tab"]);
/** Native text-entry keys an <input> provides (per-character entry, caret). */
const NATIVE_TEXT_KEYS = new Set(["0-9", "Backspace"]);
const NATIVE_RADIO_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Tab"]);
const NATIVE_INTERACTIVE_TAGS = new Set([
  "button",
  "input",
  "select",
  "textarea",
  "a",
  "summary",
  "details",
]);

const IDREF_ATTRIBUTES = new Set([
  "for",
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-activedescendant",
]);

// ---- contract corpus --------------------------------------------------------
function loadContracts() {
  const out = [];
  for (const name of readdirSync(CONTRACTS).sort()) {
    const p = join(CONTRACTS, name, `${name}.contract.json`);
    if (!existsSync(p)) continue;
    out.push({ name, contract: JSON.parse(readFileSync(p, "utf-8")) });
  }
  return out;
}

/** All tags appearing in the contract's anatomy dom tree. */
function domTags(node, acc = new Set()) {
  if (!node || typeof node !== "object") return acc;
  if (typeof node.tag === "string") acc.add(node.tag);
  for (const child of node.children ?? []) domTags(child, acc);
  return acc;
}

/** All part names in a dom subtree. */
function domParts(node, acc = new Set()) {
  if (!node || typeof node !== "object") return acc;
  if (typeof node.part === "string") acc.add(node.part);
  for (const child of node.children ?? []) domParts(child, acc);
  return acc;
}

/** All componentRef targets ("fsds.Button" -> "Button") in the dom tree. */
function domComponentRefs(node, acc = new Set()) {
  if (!node || typeof node !== "object") return acc;
  if (typeof node.componentRef === "string") {
    acc.add(node.componentRef.replace(/^fsds\./, ""));
  }
  for (const child of node.children ?? []) domComponentRefs(child, acc);
  return acc;
}

/**
 * The full set of element tags a component's contract implies: its own dom
 * tree, its anatomy.details part tags, and — resolved against the corpus —
 * the root tags of components it owns by-reference (Chip's dismiss/action are
 * fsds.Button, so `button` is implied). Derived, never hand-listed. With a
 * `root` part node, only that part's subtree and its details.
 */
function impliedTags(contract, contractByName, root = contract.anatomy?.dom) {
  const tags = domTags(root);
  const parts = root === contract.anatomy?.dom ? null : domParts(root);
  for (const [part, detail] of Object.entries(contract.anatomy?.details ?? {})) {
    if (parts && !parts.has(part)) continue;
    if (typeof detail?.tag === "string") tags.add(detail.tag);
  }
  for (const ref of domComponentRefs(root)) {
    const target = contractByName.get(ref);
    const rootTag = target?.anatomy?.dom?.tag;
    if (typeof rootTag === "string") tags.add(rootTag);
  }
  return tags;
}

/** The element tags one part implies: its subtree, its subtree's details, and
 * the root tags of components the subtree owns. Focus "in" a part reaches its
 * descendants (a tab list holds focus on its tabs). */
export function partImpliedTags(contract, part, contractByName = new Map()) {
  const node = findPartNode(contract?.anatomy?.dom, part);
  return node ? impliedTags(contract, contractByName, node) : new Set();
}

/** Native interactive element present in the EMITTED source — the strongest
 * evidence a family realized keyboard natively (covers surface compounds
 * whose trigger element exists only in the emitter's lowering, not the
 * contract dom tree). */
const NATIVE_ELEMENT_IN_SOURCE_RE = /<(button|input|select|textarea|summary|a)\b/;

// ---- obligation derivation --------------------------------------------------
/** Split a declared key spec ("Enter|Space", "Shift+Tab") into atomic keys. */
export function atomicKeys(keySpec) {
  return String(keySpec)
    .split("|")
    .map((k) => k.trim())
    .map((k) => (k === "Shift+Tab" ? "Tab" : k));
}

export function deriveObligations(contracts) {
  const obligations = [];
  for (const { name, contract } of contracts) {
    for (const rel of contract.relationships ?? []) {
      if (!rel.attribute) continue;
      const target = findPartNode(contract.anatomy?.dom, rel.to);
      obligations.push({
        component: name,
        class: "relationship",
        key: rel.attribute,
        from: rel.from,
        to: rel.to,
        cssPrefix: contract.cssPrefix ?? toKebab(name),
        targetId: target?.attrs?.id,
        ...(isConsumerSlotPart(target) ? { targetSlotted: true } : {}),
      });
    }
    const kb = contract.a11y?.keyboard ?? [];
    const strategy = contract.focus?.strategy;
    // A roving composite's items are reachable either through a computed tab
    // stop (checked in the emitted source) or a declared entry action.
    const roving =
      strategy === "roving"
        ? {
            entryKeys: kb
              .filter((entry) => typeof entry === "object" && entry.behavior === "open")
              .map((entry) => entry.key ?? entry.keys),
          }
        : undefined;
    for (const entry of kb) {
      const keySpec =
        typeof entry === "string" ? entry : (entry.key ?? entry.keys ?? "");
      if (!keySpec) continue;
      const nativeRadio = nativeRadioCarrier(contract, name);
      // `when` names either the anatomy part that holds focus or a state
      // ("open"); only a part scopes the binding.
      const part =
        typeof entry === "object" && typeof entry.when === "string" && findPartNode(contract.anatomy?.dom, entry.when)
          ? entry.when
          : undefined;
      obligations.push({
        component: name,
        class: "keyboard",
        key: keySpec,
        ...(part ? { part } : {}),
        ...(nativeRadio ? { nativeRadio } : {}),
        ...(roving ? { roving } : {}),
      });
    }
    if (strategy === "trap") {
      obligations.push({ component: name, class: "focus", key: strategy });
    }
    if (strategy === "roving") {
      obligations.push({ component: name, class: "focus", key: strategy, roving });
    }
    const stateAttributes = declaredStateAttributes(contract);
    const selectsDynamically = stateAttributes.some((entry) => entry.attribute === "aria-selected" && !entry.declaredStatic);
    for (const { attribute, declaredStatic, declaredValue, suppressed } of stateAttributes) {
      obligations.push({
        component: name,
        class: "state-attribute",
        key: attribute,
        ...(declaredStatic ? { declaredStatic, declaredValue } : {}),
        ...(suppressed ? { suppressed } : {}),
        ...(attribute === "aria-current" && !declaredStatic && selectsDynamically ? { besideSelection: true } : {}),
      });
    }
    if (hasInteractivePart(contract)) {
      obligations.push({ component: name, class: "interactive-role", key: "activation" });
    }
  }
  // Dedupe (a contract may declare the same attribute in several relationships).
  const seen = new Set();
  return obligations.filter((o) => {
    const id = tupleId(o.component, o.class, o.key, o.from, o.to);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** State ARIA attributes a contract declares, in first-declaration order:
 * `states.dimensions.<d>.a11y.attribute`, then dom `attrs`/`bindings` keys. */
export function declaredStateAttributes(contract) {
  const dynamic = new Set();
  const staticValues = new Map();
  for (const dimension of Object.values(contract.states?.dimensions ?? {})) {
    const attribute = dimension?.a11y?.attribute;
    if (typeof attribute === "string") dynamic.add(attribute);
  }
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    for (const key of Object.keys(node.bindings ?? {})) {
      if (STATE_ARIA_ATTRIBUTES.has(key)) dynamic.add(key);
    }
    for (const [key, value] of Object.entries(node.attrs ?? {})) {
      if (STATE_ARIA_ATTRIBUTES.has(key) && !staticValues.has(key)) staticValues.set(key, String(value));
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(contract.anatomy?.dom);
  const suppressions = contract.a11y?.obligations?.suppress ?? [];
  const out = [];
  for (const attribute of [...dynamic, ...staticValues.keys()]) {
    if (out.some((entry) => entry.attribute === attribute)) continue;
    const suppressed = suppressions.find((entry) => entry.attr === attribute);
    out.push({
      attribute,
      // A contract that pins the attribute to a constant on its dom node, and
      // never declares it as varying state, is realized by emitting that same
      // constant (the IR endorses this for a selected-items-only listbox).
      ...(!dynamic.has(attribute)
        ? { declaredStatic: true, declaredValue: staticValues.get(attribute) }
        : {}),
      ...(suppressed ? { suppressed: suppressed.reason } : {}),
    });
  }
  return out;
}

/** A contract declares an interactive part when any anatomy part is marked
 * `interactive: true`. */
function hasInteractivePart(contract) {
  return Object.values(contract.anatomy?.details ?? {}).some((detail) => detail?.interactive === true);
}

function findPartNode(node, part) {
  if (!node || typeof node !== "object") return undefined;
  if (node.part === part) return node;
  for (const child of node.children ?? []) {
    const found = findPartNode(child, part);
    if (found) return found;
  }
  return undefined;
}

/** A repeated native radio carrier with a required shared group-name prop. */
function nativeRadioCarrier(contract, name) {
  const control = contract.compositeControl;
  if (control?.interactionModel !== "collection-selection" || control.commit !== "change" ||
      contract.channels?.[control.channel]?.valueType !== "string") return undefined;
  const find = (node, repeated = false) => {
    if (!node) return undefined;
    repeated ||= node.iterate?.kind === "array";
    if (node.part === control.part && repeated && node.tag === "input" && node.attrs?.type === "radio") return node;
    return (node.children ?? []).map(child => find(child, repeated)).find(Boolean);
  };
  const node = find(contract.anatomy?.dom);
  const nameProp = /^prop:([A-Za-z_]\w*)$/.exec(node?.bindings?.name ?? "")?.[1];
  const props = contract.props?.designed?.members ?? [];
  if (!nameProp || !props.some(prop => prop.name === nameProp && prop.required === true)) return undefined;
  return { part: control.part, cssPrefix: contract.cssPrefix ?? toKebab(name), nameProp };
}

/** Match the declared carrier and group-name binding on the same emitted input. */
function emitsNativeRadio(source, carrier) {
  if (!carrier) return false;
  const marker = new RegExp(`${escapeRegExp(carrier.cssPrefix)}__${escapeRegExp(carrier.part)}(?=[^A-Za-z0-9_-]|$)`);
  const prop = escapeRegExp(carrier.nameProp);
  const nameBinding = new RegExp(
    `\\s(?:name|:name|\\[name\\]|\\[attr\\.name\\])=(?:` +
    `\\{${prop}\\}|["'](?:props\\.)?${prop}["']|\\$\\{(?:ifDefined\\(this\\.${prop}\\)|this\\.${prop})\\})`,
  );
  return openingTags(source).some(tag => /^<input\b/.test(tag) &&
    /\stype=["']radio["']/.test(tag) && marker.test(tag) && nameBinding.test(tag));
}

function isConsumerSlotPart(node) {
  return Boolean(
    node &&
      (node.tag === "slot" ||
        (node.children?.length === 1 && node.children[0]?.tag === "slot")),
  );
}

function toKebab(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function tupleId(...values) {
  return JSON.stringify(values.map((value) => value ?? ""));
}

// ---- realization checking ---------------------------------------------------
/**
 * Relative import specifiers in `src` that resolve INTO this package's
 * `src/primitives/` tree. A component may realize a relationship attribute in
 * a shared primitive it imports (Svelte's anchored-surface primitives set
 * aria-controls/aria-expanded/aria-describedby in
 * primitives/surfaces/createAnchoredSurface, not inline in the component) —
 * those must be scanned too, or the rail false-negatives on a genuinely
 * realized wire. Only imports the component ACTUALLY declares are followed,
 * so the falsification property holds: drop the import (or the primitive's
 * wiring) and the attribute token disappears from the scanned set.
 */
function resolvePrimitiveImports(src, fromDir, packageSrc) {
  const primitivesRoot = join(packageSrc, "primitives");
  const files = new Set();
  const re = /(?:from|import)\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const spec = m[1];
    if (!spec.startsWith(".")) continue; // only relative, same-package imports
    const resolvedNoExt = resolve(fromDir, spec).replace(/\.js$/, "");
    if (!resolvedNoExt.startsWith(primitivesRoot + "/")) continue;
    // Do NOT follow barrel re-exports (primitives/index, surfaces/index …):
    // a barrel pulls the WHOLE primitive surface into scope, so an unrelated
    // primitive's token would count as realization for any component that
    // imports the barrel — eroding falsification (Field imports the barrel for
    // provideFieldAssociation; its aria-describedby is delivered cross-COMPONENT
    // to a slotted control, a genuinely different gap the per-component rail
    // cannot see, and must NOT be spuriously realized via the barrel). Only a
    // DIRECT import of a specific primitive module is followed.
    if (/(^|\/)index$/.test(resolvedNoExt)) continue;
    // Generated imports use runtime `.js`/`.svelte.js`; map back to source.
    for (const cand of [
      `${resolvedNoExt}.ts`,
      `${resolvedNoExt}.svelte.ts`,
      resolvedNoExt, // already had an extension (e.g. a bare .svelte)
    ]) {
      if (existsSync(cand) && statSync(cand).isFile()) {
        files.add(cand);
        break;
      }
    }
  }
  return files;
}

/**
 * Same-package Kotlin imports (`import com.fullstackds.components.<dir>.<Symbol>`)
 * resolved to their files under the components root. A generated Compose
 * component that delegates to a hand-authored control (Checkbox ->
 * controls/FsdsCheckbox) realizes that control's semantics; only symbols the
 * component actually imports are followed.
 */
function resolveKotlinComponentImports(src, treeAbs) {
  const files = new Set();
  const re = /^import\s+com\.fullstackds\.components\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\s*$/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const candidate = join(treeAbs, m[1], `${m[2]}.kt`);
    if (existsSync(candidate) && statSync(candidate).isFile()) files.add(candidate);
  }
  return files;
}

function readNativeDeclarativeSource(treeAbs, component, sourceExtensions) {
  const dir = join(treeAbs, component);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
  let own = "";
  const ownFiles = [];
  const delegatedFiles = new Set();
  for (const entry of readdirSync(dir).sort()) {
    const p = join(dir, entry);
    if (!statSync(p).isFile() || !sourceExtensions.some((ext) => entry.endsWith(ext))) continue;
    const fileSrc = readFileSync(p, "utf-8");
    own += fileSrc;
    ownFiles.push({ path: p, source: fileSrc });
    for (const f of resolveKotlinComponentImports(fileSrc, treeAbs)) delegatedFiles.add(f);
  }
  let delegated = own;
  for (const f of delegatedFiles) {
    if (!ownFiles.some((file) => file.path === f)) delegated += readFileSync(f, "utf-8");
  }
  return { own, ownFiles, relationship: own, delegated };
}

function readComponentSource(treeAbs, component, sourceExtensions, kind = "web-dom") {
  if (kind === "native-declarative") {
    return readNativeDeclarativeSource(treeAbs, component, sourceExtensions);
  }
  const dir = join(treeAbs, component);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
  // `treeAbs` is <pkg>/src/components; the package source root is its parent,
  // where the shared `primitives/` tree lives.
  const packageSrc = dirname(treeAbs);
  let src = "";
  const ownFiles = [];
  const primitiveFiles = new Set();
  const walk = (d) => {
    for (const entry of readdirSync(d).sort()) {
      const p = join(d, entry);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (entry === "__tests__") continue;
        walk(p);
        continue;
      }
      if (/\.test\.[a-z]+$/.test(entry)) continue;
      if (!sourceExtensions.some((ext) => entry.endsWith(ext))) continue;
      const fileSrc = readFileSync(p, "utf-8");
      src += fileSrc;
      ownFiles.push({ path: p, source: fileSrc });
      for (const f of resolvePrimitiveImports(fileSrc, d, packageSrc)) {
        primitiveFiles.add(f);
      }
    }
  };
  walk(dir);
  // Transitively include primitives the imported primitives themselves import
  // (a controller re-exported through an index), bounded by the same
  // same-package-primitives constraint. Collected SEPARATELY from `src`: the
  // primitive-extended body is used ONLY for relationship (idref) checks, never
  // for keyboard/focus — a shared roving/focus-trap primitive's arrow-key or
  // keydown tokens must not count as realization for every component that
  // imports it (that would hide the very composite-keyboard gaps another lane
  // is chartered to burn). Relationship idref attributes (aria-controls/
  // -expanded/-describedby set in an anchored-surface primitive) are the only
  // class legitimately realized in a shared primitive.
  let primitiveSrc = "";
  const seen = new Set();
  const queue = [...primitiveFiles];
  while (queue.length > 0) {
    const f = queue.shift();
    if (seen.has(f)) continue;
    seen.add(f);
    const fileSrc = readFileSync(f, "utf-8");
    primitiveSrc += fileSrc;
    for (const next of resolvePrimitiveImports(fileSrc, dirname(f), packageSrc)) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return { own: src, ownFiles, relationship: src + primitiveSrc };
}

export function relationshipTokens(kind, attribute) {
  const table = RELATIONSHIP_SURFACE[kind];
  if (attribute in table) return table[attribute]; // may be null (excluded)
  return kind === "web-dom" ? [attribute] : null;
}

/**
 * Extract source-level opening tags without being confused by `=>` inside a
 * Lit/React event expression. This is intentionally a small scanner rather
 * than an HTML parser: the input is framework source, not HTML, but braces
 * and quoted attributes still give us enough structure to identify which
 * emitted element owns an attribute.
 */
export function openingTags(src) {
  const tags = [];
  for (let start = 0; start < src.length; start += 1) {
    if (src[start] !== "<" || !/[A-Za-z]/.test(src[start + 1] ?? "")) continue;
    let quote = null;
    let braces = 0;
    for (let i = start + 1; i < src.length; i += 1) {
      const ch = src[i];
      const prev = src[i - 1];
      if (quote) {
        if (ch === quote && prev !== "\\") quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "{") braces += 1;
      else if (ch === "}" && braces > 0) braces -= 1;
      else if (ch === ">" && braces === 0) {
        tags.push(src.slice(start, i + 1));
        start = i;
        break;
      }
    }
  }
  return tags;
}

function partCarriers(srcBundle, obligation, part, { target = false } = {}) {
  if (!part) return [];
  const ownSrc = typeof srcBundle === "string" ? srcBundle : srcBundle.own;
  const files =
    typeof srcBundle === "string" || !srcBundle.ownFiles?.length
      ? [{ path: "", source: ownSrc }]
      : srcBundle.ownFiles;
  const candidates = [];

  // Compound/surface emitters give each part a framework-native source
  // boundary: AccordionTrigger.tsx, TabsPanel.vue, or a
  // `TabsTabElement`/`PopoverTriggerDirective` class. Prefer that boundary
  // over markup heuristics. It lets the audit prove an attribute belongs to
  // the declared part even when the framework applies it programmatically to
  // a custom-element host rather than writing an opening tag.
  const symbol =
    part === "root"
      ? obligation.component
      : `${obligation.component}${toPascal(part)}`;
  for (const file of files) {
    const region = symbolRegion(file.source, symbol);
    if (region) candidates.push(region);
  }
  for (const file of files) {
    if (sourceStem(file.path) !== symbol.toLowerCase()) continue;
    const containsOnlySubpartDeclarations =
      part === "root" &&
      new RegExp(
        `(?:^|\\n)export\\s+(?:class|function)\\s+${escapeRegExp(obligation.component)}[A-Z]`,
      ).test(file.source);
    if (!containsOnlySubpartDeclarations) candidates.push(file.source);
  }

  const tags = openingTags(ownSrc);
  if (part === "root") {
    const rootTag = tags.find(
      (tag) =>
        (tag.includes("data-fsds-component") && tag.includes(obligation.cssPrefix)) ||
        (target && hasIdAttribute(tag) && targetReferenceTokens(obligation).some((t) => tag.includes(t))),
    );
    if (rootTag) candidates.push(rootTag);
    return [...new Set(candidates)];
  }
  const marker = `${obligation.cssPrefix}__${part}`;
  const exactMarker = new RegExp(`${escapeRegExp(marker)}(?=[^A-Za-z0-9_-]|$)`);
  const markedTag = tags.find((tag) => exactMarker.test(tag));
  if (markedTag) candidates.push(markedTag);
  return [...new Set(candidates)];
}

function toPascal(value) {
  return String(value)
    .replace(/(^|[-_\s]+)([a-zA-Z0-9])/g, (_match, _sep, ch) => ch.toUpperCase());
}

function sourceStem(path) {
  return basename(path)
    .replace(/\.(?:component|directive)(?=\.)/g, "")
    .split(".")[0]
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase();
}

function symbolRegion(source, symbol) {
  const declaration = new RegExp(
    `(?:^|\\n)(?:export\\s+(?:class|function)\\s+${escapeRegExp(symbol)}(?:Element|Component|Directive)?\\b|[A-Za-z0-9_]+\\.[A-Za-z0-9_]+\\s*=\\s*function\\s+${escapeRegExp(symbol)}\\b)`,
  );
  const match = declaration.exec(source);
  if (!match) return undefined;
  const declarationStart = match.index;
  const declarationEnd = declarationStart + match[0].length;

  // Angular keeps a component's template (and therefore most DOM carriers)
  // in the @Component metadata immediately before the exported class. Keep
  // that decorator inside the exact symbol region, but never borrow the next
  // component/directive decorator in a compound source file.
  const before = source.slice(0, declarationStart);
  const previousExport = before.lastIndexOf("\nexport ");
  const decorators = [
    ...before.matchAll(/(?:^|\n)@(?:Component|Directive)\s*\(\{/g),
  ];
  const decorator = decorators.at(-1);
  const start =
    decorator && decorator.index !== undefined && decorator.index > previousExport
      ? decorator.index
      : declarationStart;
  const remainder = source.slice(declarationEnd);
  const next = /\n(?:@(?:Component|Directive)\s*\(|export\s+(?:class|function|interface|type|const)\s+)/.exec(
    remainder,
  );
  return source.slice(start, next ? declarationEnd + next.index : undefined);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasIdAttribute(tag) {
  return (
    /(?:\bid|:id|\[attr\.id\]|\.id)=/.test(tag) ||
    /setAttribute\(\s*["']id["']/.test(tag) ||
    /HostBinding\(\s*["']attr\.id["']/.test(tag)
  );
}

function targetReferenceTokens(obligation) {
  return obligation.targetId
    ? [obligation.targetId]
    : [
        `-${obligation.to}`,
        `${obligation.to}Id`,
        `${obligation.to}ID`,
        `${obligation.to}_id`,
      ];
}

function occurrenceCount(source, token) {
  if (!token) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = source.indexOf(token, offset)) !== -1) {
    count += 1;
    offset += token.length;
  }
  return count;
}

function classifyWebRelationship(obligation, srcBundle, tokens) {
  const ownSrc = typeof srcBundle === "string" ? srcBundle : srcBundle.own;
  const relationshipSrc =
    typeof srcBundle === "string"
      ? srcBundle
      : srcBundle.relationship ?? srcBundle.own;
  const sourceCandidates = partCarriers(srcBundle, obligation, obligation.from);
  if (sourceCandidates.length === 0) {
    return { verdict: "unrealized", reason: `from part ${obligation.from} not found` };
  }

  const source = sourceCandidates.find((candidate) =>
    tokens.some((token) => candidate.includes(token)),
  );
  const ownsAttribute = source !== undefined;
  let attributeSource = source ?? sourceCandidates[0];
  let via = "owned attribute";
  if (!ownsAttribute) {
    const primitiveOnly = relationshipSrc.slice(ownSrc.length);
    if (tokens.some((token) => primitiveOnly.includes(token))) {
      attributeSource = primitiveOnly;
      via = "directly-imported primitive";
    } else {
      return {
        verdict: "unrealized",
        reason: `${obligation.key} is not on from part ${obligation.from}`,
      };
    }
  }

  if (!IDREF_ATTRIBUTES.has(obligation.key)) {
    return { verdict: "realized", via };
  }

  const targetCandidates = partCarriers(srcBundle, obligation, obligation.to, { target: true });
  if (targetCandidates.length === 0) {
    return { verdict: "unrealized", reason: `to part ${obligation.to} not found` };
  }
  const refTokens = targetReferenceTokens(obligation);
  const sourceReferences = (token) =>
    attributeSource.includes(token) ||
    boundAttributeReferencesTarget(
      attributeSource,
      obligation.key,
      token,
      relationshipSrc,
    ) ||
    (forwardsRelationshipAttribute(attributeSource, obligation.key) &&
      occurrenceCount(relationshipSrc, token) >= 2);
  if (obligation.targetSlotted) {
    const providedReference = refTokens.find(
      (token) => sourceReferences(token) && occurrenceCount(relationshipSrc, token) >= 2,
    );
    if (providedReference) {
      return { verdict: "realized", via: "consumer-slot association provider" };
    }
  }
  const target = targetCandidates.find((candidate) =>
    hasIdAttribute(candidate) &&
    refTokens.some(
      (token) =>
        sourceReferences(token) &&
        candidate.includes(token) &&
        occurrenceCount(relationshipSrc, token) >= 2,
    ),
  );
  const matchingReference = refTokens.find(
    (token) =>
      sourceReferences(token) &&
      target?.includes(token) &&
      occurrenceCount(relationshipSrc, token) >= 2,
  );
  if (!target || !hasIdAttribute(target) || !matchingReference) {
    return {
      verdict: "unrealized",
      reason: `to part ${obligation.to} has no matching id`,
    };
  }
  return { verdict: "realized", via: via === "owned attribute" ? "owned idref" : via };
}

function forwardsRelationshipAttribute(source, attribute) {
  const escaped = escapeRegExp(attribute);
  return (
    new RegExp(`(?:rest|attrs|triggerProps)(?:\\.value)?\\s*\\[\\s*["']${escaped}["']\\s*\\]`).test(source) ||
    /\.\.\.(?:ariaProps|triggerProps|attrs|rest)\b/.test(source)
  );
}

function boundAttributeReferencesTarget(carrier, attribute, targetToken, source) {
  const binding = new RegExp(
    `\\[attr\\.${escapeRegExp(attribute)}\\]\\s*=\\s*["']([^"']+)["']`,
  ).exec(carrier);
  if (!binding) return false;
  const expression = binding[1].trim();
  if (expression.includes(targetToken)) return true;
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(expression)) return false;

  // Angular commonly keeps the composed IDREF in a getter so consumer
  // overrides and generated defaults share one binding. Follow only that
  // exact getter body; a nearby sibling getter must not lend it an unrelated
  // endpoint token.
  const getter = new RegExp(
    `get\\s+${escapeRegExp(expression)}\\b[^\\{]*\\{([\\s\\S]*?)\\n\\s*\\}`,
  ).exec(source);
  return Boolean(getter?.[1].includes(targetToken));
}

/** Classify one obligation against one family's committed source.
 * `srcBundle` is { own, relationship }: `own` is the component's own source;
 * `relationship` additionally includes same-package primitives the component
 * imports (used ONLY for idref relationship checks — see readComponentSource).
 * A bare string is accepted for callers/tests that don't split the two.
 * Returns { verdict: "realized"|"unrealized"|"excluded", via?, reason? }. */
export function classify(obligation, kind, srcBundle, contractTags, familyId) {
  const ownSrc = typeof srcBundle === "string" ? srcBundle : srcBundle.own;
  const relationshipSrc =
    typeof srcBundle === "string"
      ? srcBundle
      : srcBundle.relationship ?? srcBundle.own;
  if (obligation.class === "state-attribute") {
    return classifyStateAttribute(obligation, kind, srcBundle, contractTags, familyId);
  }
  if (obligation.class === "interactive-role") {
    return classifyInteractiveRole(kind, srcBundle, familyId);
  }
  if (kind === "native-declarative") {
    return { verdict: "excluded", reason: NATIVE_DECLARATIVE_EXCLUSION_REASONS[obligation.class] };
  }
  if (kind === "native-mobile" && obligation.class !== "relationship") {
    return { verdict: "excluded", reason: NATIVE_MOBILE_KEYBOARD_REASON };
  }
  if (obligation.class === "relationship") {
    const tokens = relationshipTokens(kind, obligation.key);
    if (tokens === null) {
      return {
        verdict: "excluded",
        reason:
          NATIVE_MOBILE_EXCLUSION_REASONS[obligation.key] ??
          `no ${kind} surface for ${obligation.key}`,
      };
    }
    if (kind === "web-dom" && obligation.from && obligation.to && obligation.cssPrefix) {
      return classifyWebRelationship(obligation, srcBundle, tokens);
    }
    return tokens.some((t) => relationshipSrc.includes(t))
      ? { verdict: "realized", via: "attribute" }
      : { verdict: "unrealized" };
  }
  if (obligation.class === "keyboard") {
    const keys = atomicKeys(obligation.key);
    if (keys.every(key => NATIVE_RADIO_KEYS.has(key)) && emitsNativeRadio(ownSrc, obligation.nativeRadio)) {
      return { verdict: "realized", via: "native radio carrier" };
    }
    const trapKeys = keys.every((k) => k === "Tab");
    const dismissKeys = keys.every((k) => k === "Escape");
    if (trapKeys && focusTrapInvoked(ownSrc)) return { verdict: "realized", via: "primitive" };
    if (dismissKeys && escapeCloserInvoked(ownSrc)) return { verdict: "realized", via: "primitive" };
    const hasHandler = EXPLICIT_KEY_RE.test(ownSrc);
    // A part-scoped binding (`when` names the part that holds focus) gets
    // native credit only from the part's own subtree, which the caller passes
    // as contractTags; a native element elsewhere in the source cannot be
    // attributed to that part.
    const hasNativeTag =
      [...contractTags].some((t) => NATIVE_INTERACTIVE_TAGS.has(t)) ||
      (!obligation.part && NATIVE_ELEMENT_IN_SOURCE_RE.test(ownSrc));
    // Inside a roving composite, native activation needs a reachable item.
    const nativeReachable = !obligation.roving || rovingReachable(ownSrc, obligation.roving);
    const vias = new Set();
    const missing = [];
    for (const k of keys) {
      if (hasHandler && handlesKey(ownSrc, k)) {
        vias.add("explicit");
        continue;
      }
      // The component binds the keydown to a function a directly imported
      // primitive defines, and that function compares the key (PageNavigator's
      // `onKeyDown={pagedSet.commitOnEnter}` -> paging's commitOnEnter
      // Escape). An import alone, or a handler bound to anything else,
      // realizes nothing.
      if (boundPrimitiveHandlesKey(ownSrc, relationshipSrc, k)) {
        vias.add("primitive handler");
        continue;
      }
      const nativeKey = NATIVE_KEYS.has(k) || (contractTags.has("input") && NATIVE_TEXT_KEYS.has(k));
      if (hasNativeTag && nativeKey && nativeReachable) {
        vias.add("native");
        continue;
      }
      missing.push(k);
    }
    if (missing.length === 0) return { verdict: "realized", via: [...vias].join("+") };
    const unreachable = hasNativeTag && !nativeReachable &&
      missing.every((k) => NATIVE_KEYS.has(k) || (contractTags.has("input") && NATIVE_TEXT_KEYS.has(k)));
    return {
      verdict: "unrealized",
      reason: unreachable
        ? `native ${missing.join("/")} unreachable: roving items are never tabbable`
        : `no handler compares ${missing.join("/")}`,
    };
  }
  // focus
  if (obligation.key === "trap") {
    return focusTrapInvoked(ownSrc)
      ? { verdict: "realized", via: "primitive" }
      : { verdict: "unrealized" };
  }
  // roving cannot be native — demands explicit key handling and a way in.
  if (!EXPLICIT_KEY_RE.test(ownSrc)) return { verdict: "unrealized", reason: "no keydown handler" };
  if (!rovingReachable(ownSrc, obligation.roving)) {
    return {
      verdict: "unrealized",
      reason: "roving items are never tabbable: no computed tabindex and no emitted entry action",
    };
  }
  return {
    verdict: "realized",
    via: DYNAMIC_TABINDEX_RES.some((re) => re.test(ownSrc)) ? "explicit+tab stop" : "explicit+entry action",
  };
}

/** STATE-ATTRIBUTE: the declared attribute must track state in the family. */
function classifyStateAttribute(obligation, kind, srcBundle, contractTags, familyId) {
  const ownSrc = typeof srcBundle === "string" ? srcBundle : srcBundle.own;
  // A state attribute set by an imported primitive (an anchored surface sets
  // its trigger's aria-expanded) is realized there, as relationships are.
  const withPrimitives =
    typeof srcBundle === "string" ? srcBundle : srcBundle.relationship ?? ownSrc;
  const attribute = obligation.key;
  if (obligation.suppressed) {
    return { verdict: "excluded", reason: `contract suppression: ${obligation.suppressed}` };
  }
  if (kind === "web-dom") {
    const staticValues = staticStateValues(ownSrc, attribute);
    const statics = staticValues.length > 0;
    const dynamic = webDynamicStateRes(attribute).some((re) => re.test(withPrimitives));
    if (obligation.declaredStatic) {
      // The contract pins a value; an emitted constant must be that value.
      const wrong = staticValues.filter((v) => v !== obligation.declaredValue);
      if (wrong.length > 0) {
        return {
          verdict: "unrealized",
          reason: `declared ${attribute}="${obligation.declaredValue}" but emitted "${wrong[0]}"`,
        };
      }
      return statics || dynamic
        ? { verdict: "realized", via: "static as declared" }
        : { verdict: "unrealized", reason: `declared ${attribute} is not emitted` };
    }
    if (statics) return { verdict: "unrealized", reason: `${attribute} is a static literal` };
    if (dynamic) return { verdict: "realized", via: "binding" };
    const native = WEB_NATIVE_STATE[attribute];
    if (native && contractTags.has(native.tag) && native.res.some((re) => re.test(ownSrc))) {
      return { verdict: "realized", via: `native ${native.tag}` };
    }
    return { verdict: "unrealized", reason: `${attribute} is never bound` };
  }
  if (kind === "native-mobile") {
    const stateKey = RN_STATE_KEYS[attribute];
    if (stateKey === null || stateKey === undefined) {
      return { verdict: "excluded", reason: `no react-native surface for ${attribute}` };
    }
    const dynamic = [
      new RegExp(`accessibilityState=\\{\\{[^}]*\\b${stateKey}\\s*:(?!\\s*(?:true|false)\\b)`),
      new RegExp(`(?<![\\w-])${escapeRegExp(attribute)}=\\{`),
    ];
    if (obligation.declaredStatic) {
      // An emitted constant must be the declared one.
      const constant = new RegExp(`accessibilityState=\\{\\{[^}]*\\b${stateKey}\\s*:\\s*(true|false)\\b`).exec(ownSrc);
      if (constant && constant[1] !== obligation.declaredValue) {
        return {
          verdict: "unrealized",
          reason: `declared ${attribute}="${obligation.declaredValue}" but emitted accessibilityState.${stateKey}: ${constant[1]}`,
        };
      }
      const present = Boolean(constant) || dynamic.some((re) => re.test(ownSrc));
      return present
        ? { verdict: "realized", via: "static as declared" }
        : { verdict: "unrealized", reason: `declared ${attribute} is not emitted as accessibilityState.${stateKey}` };
    }
    if (dynamic.some((re) => re.test(ownSrc))) return { verdict: "realized", via: "accessibilityState" };
    if (attribute === "aria-checked" && /<Switch\b[^>]*\bvalue=\{/.test(ownSrc)) {
      return { verdict: "realized", via: "native Switch" };
    }
    return { verdict: "unrealized", reason: `accessibilityState.${stateKey} never tracks state` };
  }
  // native-declarative
  const src = typeof srcBundle === "string" ? srcBundle : srcBundle.delegated ?? ownSrc;
  const patterns = obligation.besideSelection
    ? NATIVE_CURRENT_BESIDE_SELECTION[familyId]
    : NATIVE_DECLARATIVE_STATE[familyId]?.[attribute];
  if (!patterns) return { verdict: "excluded", reason: `no ${familyId} surface for ${attribute}` };
  if (obligation.declaredStatic) {
    const constant = NATIVE_DECLARATIVE_STATIC_STATE[familyId]?.[attribute] ?? [];
    return [...patterns, ...constant].some((re) => re.test(src))
      ? { verdict: "realized", via: "static as declared" }
      : { verdict: "unrealized", reason: `declared ${attribute} has no ${familyId} state semantics` };
  }
  return patterns.some((re) => re.test(src))
    ? { verdict: "realized", via: "native semantics" }
    : { verdict: "unrealized", reason: `${attribute} has no ${familyId} state semantics` };
}

/** Balanced-paren argument text following `index` (the position of `(`). */
function callArguments(src, index) {
  let depth = 0;
  for (let i = index; i < src.length; i += 1) {
    if (src[i] === "(") depth += 1;
    else if (src[i] === ")") {
      depth -= 1;
      if (depth === 0) return src.slice(index + 1, i);
    }
  }
  return src.slice(index + 1);
}

/** Compose activation modifiers (`clickable`, `selectable`, `toggleable`,
 * `combinedClickable`) that do not declare `role =`. */
export function unroledComposeActivations(src) {
  const sites = [];
  const re = /\b(clickable|combinedClickable|selectable|toggleable|triStateToggleable)\b(?=\s*[({])/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let i = m.index + m[0].length;
    while (/\s/.test(src[i] ?? "")) i += 1;
    const args = src[i] === "(" ? callArguments(src, i) : "";
    if (!/\brole\s*=/.test(args)) sites.push(m[1]);
  }
  return sites;
}

/** INTERACTIVE-ROLE: every native activation site carries a role. */
function classifyInteractiveRole(kind, srcBundle, familyId) {
  const ownSrc = typeof srcBundle === "string" ? srcBundle : srcBundle.own;
  if (kind === "web-dom") return { verdict: "excluded", reason: WEB_INTERACTIVE_ROLE_REASON };
  if (kind === "native-mobile") {
    // A pressable hidden from assistive tech (`accessible={false}`, the
    // dismiss-backdrop idiom) is not an activation site screen readers reach.
    const unroled = openingTags(ownSrc).filter(
      (tag) => /^<(Pressable|TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback)\b/.test(tag) &&
        !/\b(?:accessibilityRole|role)=/.test(tag) &&
        !/\baccessible=\{false\}/.test(tag),
    );
    return unroled.length === 0
      ? { verdict: "realized", via: "accessibilityRole" }
      : { verdict: "unrealized", reason: `${unroled.length} pressable(s) without accessibilityRole` };
  }
  if (familyId === "jetpack-compose") {
    // Activation sites in a delegated hand-authored control (Checkbox ->
    // controls/FsdsCheckbox) are the component's own activation sites.
    const delegated = typeof srcBundle === "string" ? srcBundle : srcBundle.delegated ?? ownSrc;
    const unroled = unroledComposeActivations(delegated);
    return unroled.length === 0
      ? { verdict: "realized", via: "semantics role" }
      : { verdict: "unrealized", reason: `${unroled.length} ${[...new Set(unroled)].join("/")} site(s) without role` };
  }
  if (familyId === "swiftui") {
    return /\.onTapGesture\b/.test(ownSrc) && !/\.isButton\b/.test(ownSrc)
      ? { verdict: "unrealized", reason: "onTapGesture without the button trait" }
      : { verdict: "realized", via: "native controls" };
  }
  return { verdict: "excluded", reason: `no ${familyId} surface for interactive roles` };
}

// ---- main -------------------------------------------------------------------
function gapId(row) {
  return tupleId(
    row.component,
    row.family,
    row.class,
    row.key,
    row.class === "relationship" ? row.from : undefined,
    row.class === "relationship" ? row.to : undefined,
  );
}

export function runAudit({ repoRoot = REPO } = {}) {
  const contracts = loadContracts();
  const obligations = deriveObligations(contracts);
  const contractByName = new Map(contracts.map(({ name, contract }) => [name, contract]));
  const tagsByComponent = new Map(
    contracts.map(({ name, contract }) => [name, impliedTags(contract, contractByName)]),
  );
  const tagsFor = (ob) =>
    ob.part
      ? partImpliedTags(contractByName.get(ob.component), ob.part, contractByName)
      : tagsByComponent.get(ob.component) ?? new Set();

  const families = [
    ...descriptors.map((d) => ({
      id: d.id,
      kind: familyKind(d.id),
      outputTreeRelPath: d.outputTreeRelPath,
      sourceExtensions: d.sourceExtensions,
    })),
    ...registeredTargets.families,
  ];
  const rows = [];
  for (const d of families) {
    const treeAbs = resolve(repoRoot, d.outputTreeRelPath);
    for (const ob of obligations) {
      const srcBundle = readComponentSource(treeAbs, ob.component, d.sourceExtensions, d.kind);
      if (srcBundle === null) {
        // Component not emitted for this family (e.g. not yet admitted there):
        // nothing to check — record for visibility, not as a gap.
        rows.push({ ...ob, family: d.id, verdict: "not-emitted" });
        continue;
      }
      const res = classify(ob, d.kind, srcBundle, tagsFor(ob), d.id);
      rows.push({ ...ob, family: d.id, ...res });
    }
  }
  return { obligations, rows, excludedFamilies: registeredTargets.excludedFamilies };
}

function loadLedger() {
  if (!existsSync(LEDGER_PATH)) return [];
  const parsed = JSON.parse(readFileSync(LEDGER_PATH, "utf-8"));
  if (!Array.isArray(parsed.gaps)) {
    throw new Error("known-gaps.json must be { gaps: [...] }");
  }
  for (const g of parsed.gaps) {
    for (const field of ["component", "family", "class", "key", "spec"]) {
      if (typeof g[field] !== "string" || g[field].length === 0) {
        throw new Error(
          `known-gaps.json entry missing required "${field}": ${JSON.stringify(g)}`,
        );
      }
    }
    if (
      g.class === "relationship" &&
      (typeof g.from !== "string" ||
        g.from.length === 0 ||
        typeof g.to !== "string" ||
        g.to.length === 0)
    ) {
      throw new Error(
        `known-gaps.json relationship entry must name from/to: ${JSON.stringify(g)}`,
      );
    }
  }
  return parsed.gaps;
}

function markdownReport(rows, unledgered, stale, excludedFamilies = []) {
  const lines = [
    "# A11y-realization matrix",
    "",
    "Derived from the live contract corpus; verified against committed generated output per admitted family.",
    "Machine-local report — regenerate with `pnpm run audit:a11y-realization`.",
    "",
    ...(excludedFamilies.length > 0
      ? [
          "Excluded families (registered, no accessibility surface table):",
          "",
          ...excludedFamilies.map((f) => `- ${f.id}: ${f.reason}`),
          "",
        ]
      : []),
    `| component | family | class | key | endpoints | verdict | via/reason |`,
    `|---|---|---|---|---|---|---|`,
  ];
  for (const r of rows) {
    if (r.verdict === "realized" || r.verdict === "not-emitted") continue;
    lines.push(
      `| ${r.component} | ${r.family} | ${r.class} | ${r.key} | ${r.from && r.to ? `${r.from} → ${r.to}` : ""} | ${r.verdict} | ${r.via ?? r.reason ?? ""} |`,
    );
  }
  lines.push("", `Unledgered gaps: ${unledgered.length}`, `Stale ledger entries: ${stale.length}`);
  return lines.join("\n") + "\n";
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { obligations, rows, excludedFamilies } = runAudit();
  const unrealized = rows.filter((r) => r.verdict === "unrealized");
  const excluded = rows.filter((r) => r.verdict === "excluded");
  const realized = rows.filter((r) => r.verdict === "realized");

  const ledger = loadLedger();
  const ledgerIds = new Set(ledger.map(gapId));
  const unrealizedIds = new Set(unrealized.map(gapId));
  const unledgered = unrealized.filter((r) => !ledgerIds.has(gapId(r)));
  const stale = ledger.filter((g) => !unrealizedIds.has(gapId(g)));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "a11y-matrix.json"),
    JSON.stringify({ obligations, rows, unledgered, stale, excludedFamilies }, null, 2),
  );
  writeFileSync(
    join(OUT_DIR, "a11y-matrix.md"),
    markdownReport(rows, unledgered, stale, excludedFamilies),
  );

  console.log(
    `[a11y-rail] obligations=${obligations.length} checks=${rows.length} realized=${realized.length} unrealized=${unrealized.length} (ledgered=${unrealized.length - unledgered.length}) excluded=${excluded.length}`,
  );
  if (excludedFamilies.length > 0) {
    console.log(
      `[a11y-rail] excluded families: ${excludedFamilies.map((f) => f.id).join(", ")} (no accessibility surface table; see docs/internal/a11y-realization-audit/a11y-matrix.md)`,
    );
  }
  if (unledgered.length > 0) {
    console.error(`\n[a11y-rail] FAIL — ${unledgered.length} UNLEDGERED gap(s):`);
    for (const r of unledgered) {
      console.error(`  ${r.component} [${r.family}] ${r.class}:${r.key}`);
    }
    console.error(
      "\nFix the realization, or (in review) add a ledger entry naming the owning spec.",
    );
  }
  if (stale.length > 0) {
    console.error(`\n[a11y-rail] FAIL — ${stale.length} STALE ledger entr(ies) (now realized — delete them):`);
    for (const g of stale) {
      console.error(`  ${g.component} [${g.family}] ${g.class}:${g.key} (spec ${g.spec})`);
    }
  }
  if (unledgered.length > 0 || stale.length > 0) process.exit(1);
  console.log("[a11y-rail] PASS — all unrealized obligations are ledgered; no stale entries.");
}
