#!/usr/bin/env node
/**
 * RAIL-BEHAVIOR-REALIZATION-AUDIT-01 — behavior-realization audit rail.
 *
 * READ-ONLY over source. Derives, for every component, the BEHAVIOR
 * obligations IMPLIED BY THE LIVE CONTRACT CORPUS (never a committed frozen
 * classification), then verifies each is REALIZED in the generated framework
 * output. It classifies and reports; it fixes nothing and writes only under
 * docs/internal/behavior-realization-audit/ (gitignored machine-local state).
 *
 * Every existing gate checks SHAPE (schema, typecheck, byte-drift). None
 * checks INTERACTIVITY. A generated component can be typecheck-green and
 * governed-rail-green while behaviorally dead: a trigger with no handler, a
 * disclosure container with no toggle wiring, an orphaned portal primitive.
 * This rail derives the interactivity obligations and fails when one is not
 * realized.
 *
 * -- Obligation classes (each derived from a contract FACT, falsifiable) ------
 *
 *   EVENT WIRE   — every normalized IR DOM node carrying an `events` entry,
 *                  including events injected by formControl/compositeControl
 *                  (click/change/input bound to `prop:X` or `channel:X.onChange`,
 *                  including the channelCall form `channel:X.onChange(iter:…)`
 *                  and the named update-operation form
 *                  `channel:X.onChange:<op>(…)`, FEAT-CHANNEL-UPDATE-OPERATIONS-01)
 *                  demands a handler realization on that part's element in each
 *                  admitted web framework. Derivation is per (component, part,
 *                  event, framework). OTP's `field` now carries an `input` wire
 *                  (set-char-at-index) → an `input` obligation is DERIVED for it
 *                  across all five frameworks, not allow-listed.
 *
 *   COMPOUND     — every contract the shared predicates classify as a
 *                  compound-state container (Tabs) or disclosure container
 *                  (Accordion) must realize the wiring the lowering promises:
 *                  a context provider PLUS the per-item selection/toggle call.
 *                  Expectations are pinned to what the emitters ACTUALLY
 *                  produce today, discriminated by isDisclosureContainer.
 *
 *   PORTAL       — every contract where portalsRootToBody holds (Dialog, Sheet,
 *                  Toast, Command) must consume its framework's root-portal
 *                  mechanism in ALL five frameworks (react renderInPortal,
 *                  vue <Teleport to="body">, svelte use:portal, angular/lit
 *                  document.body.appendChild); every contract where it does
 *                  NOT hold must carry NO orphaned root-portal scaffolding
 *                  (usePortal / renderInPortal) in any framework — the orphan
 *                  invariant
 *                  landed by FIX-PORTAL-CONSUMPTION-01. (Direct `createPortal`
 *                  from react-dom is the anchored content-portal path
 *                  Tooltip/Popover use and is NOT the orphaned primitive.)
 *
 *   ANCHORED     — every contract with positioning.strategy "anchored"
 *                  (Popover, Tooltip) must instantiate its framework's
 *                  anchored-position primitive on the content part in ALL
 *                  five frameworks, and — when the contract also enables
 *                  portal (anchoredPortalsContentToBody) — must move the
 *                  content node to document.body (react createPortal,
 *                  vue <Teleport to="body">, svelte use:portal, angular
 *                  body-append, lit content-host move). Landed by
 *                  FEAT-ANCHORED-SURFACE-XFW-01. Selector-anchored surfaces
 *                  (coachmark tours: Walkthrough steps[].anchor) portal
 *                  their ROOT instead — they owe consume-root-portal (the
 *                  root-portal mechanism tokens) PLUS
 *                  consume-anchored-positioning, and are exempt from both
 *                  the orphan invariant and the content-portal obligation
 *                  (FEAT-WALKTHROUGH-ANCHOR-CONSUMPTION-01).
 *
 * The predicates (isCompoundStateContainer / isDisclosureContainer /
 * getInteractiveItemPart / getRegionPart / portalsRootToBody) and the IR are
 * IMPORTED from the compiled codegen dist — the SINGLE SOURCE OF TRUTH. This
 * script never re-implements detection; build codegen first
 * (`pnpm exec turbo run build --filter=@full-stack-ds/codegen`).
 *
 * NON-CLAIMS: this is a STATIC SOURCE-LEVEL check. A realized handler token
 * proves the wire exists in the emitted markup — it does NOT prove the handler
 * fires, updates state, or is a11y-adequate. Runtime truth is the Playwright
 * rails' job (e2e/runtime-rail.spec.ts). This rail is drift-protection for the
 * interactivity the emitters promise, not a proof of behavioral correctness.
 *
 * Usage:  node scripts/behavior-realization-audit/audit.mjs
 * Output: docs/internal/behavior-realization-audit/behavior-matrix.{json,md}
 * Exit:   nonzero if ANY derived obligation is unrealized.
 */
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const CONTRACTS = resolve(REPO, "packages/ds-contracts/components");
const OUT_DIR = resolve(REPO, "docs/internal/behavior-realization-audit");
const DIST = resolve(REPO, "packages/ds-codegen/dist");

// ---- imported canonical predicates + IR builder (single source of truth) ---
let ir, hook, sem;
try {
  ir = await import(resolve(DIST, "ir.js"));
  hook = await import(resolve(DIST, "frameworks/react/hook-source.js"));
  sem = await import(resolve(DIST, "semantics.js"));
} catch (err) {
  console.error(
    "\nBEHAVIOR-REALIZATION-AUDIT: could not import compiled codegen predicates from\n" +
      `  ${DIST}\n` +
      "Build codegen first:  pnpm exec turbo run build --filter=@full-stack-ds/codegen\n" +
      `(underlying error: ${err.message})\n`,
  );
  process.exit(2);
}

// Admitted WEB framework family (react-native/figma are NOT in this rail).
// The handler-token vocabulary is derived from what each emitter ACTUALLY
// produces today (verified against generated Select/Checkbox/ToggleSwitch).
export const FRAMEWORKS = [
  {
    id: "react",
    root: "packages/ds-react/src/components",
    ext: ".tsx",
    handler: { click: /\bonClick\s*=/, change: /\bonChange\s*=/, input: /\bonInput\s*=/ },
  },
  {
    id: "vue",
    root: "packages/ds-vue/src/components",
    ext: ".vue",
    handler: { click: /@click\s*=/, change: /@change\s*=/, input: /@input\s*=/ },
  },
  {
    id: "svelte",
    root: "packages/ds-svelte/src/components",
    ext: ".svelte",
    // Svelte 5 runes: `onclick` / `onchange` / `oninput` (legacy `on:` also accepted).
    handler: { click: /\bon:?click\s*=/, change: /\bon:?change\s*=/, input: /\bon:?input\s*=/ },
  },
  {
    id: "angular",
    root: "packages/ds-angular/src/components",
    ext: ".component.ts",
    handler: { click: /\(click\)\s*=/, change: /\(change\)\s*=/, input: /\(input\)\s*=/ },
  },
  {
    id: "lit",
    root: "packages/ds-lit/src/components",
    ext: ".ts",
    handler: { click: /@click\s*=/, change: /@change\s*=/, input: /@input\s*=/ },
  },
];

// FEAT-CHANNEL-UPDATE-OPERATIONS-01 adds `input` (OTP per-field set-char-at).
export const EVENT_KEYS = ["click", "change", "input"];

const readJSON = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

/** Authoritative corpus discovery (mirrors contracts-fs — never hand-counted). */
export const ALL_COMPONENTS = () =>
  readdirSync(CONTRACTS)
    .filter((d) => statSync(resolve(CONTRACTS, d)).isDirectory())
    .filter((d) => existsSync(resolve(CONTRACTS, d, `${d}.contract.json`)))
    .sort();

/** Full corpus contract map, needed by buildComponentIR for componentRef resolution. */
export function loadCorpus() {
  const all = new Map();
  for (const n of ALL_COMPONENTS()) {
    const c = readJSON(resolve(CONTRACTS, n, `${n}.contract.json`));
    if (c && typeof c.name === "string") {
      c.tokens = readJSON(resolve(CONTRACTS, n, `${n}.tokens.json`)) ?? {};
      all.set(n, c);
    }
  }
  return all;
}

// ---- event-wire obligation derivation ---------------------------------------

/**
 * Parse an events-wire value into its channel/prop target. Forms:
 *   "prop:onClick"                       → { kind:"prop",    ref:"onClick" }
 *   "channel:checked.onChange"           → { kind:"channel", ref:"checked" }
 *   "channel:value.onChange(iter:item)"  → { kind:"channel", ref:"value" }  (channelCall)
 */
export function parseEventTarget(expr) {
  if (typeof expr !== "string") return null;
  const p = expr.match(/^prop:([A-Za-z_$][\w$]*)$/);
  if (p) return { kind: "prop", ref: p[1] };
  // FEAT-CHANNEL-UPDATE-OPERATIONS-01: named update-operation form
  // `channel:X.onChange:<op>(<operands>)`. Matched BEFORE the plain
  // channelCall form so the `:op` segment is not read as trailing garbage.
  const u = expr.match(/^channel:([A-Za-z_$][\w$]*)\.onChange:([A-Za-z][A-Za-z0-9]*)\(.*\)$/);
  if (u) return { kind: "channel", ref: u[1], channelUpdate: u[2] };
  const c = expr.match(/^channel:([A-Za-z_$][\w$]*)\.onChange(\(.*\))?$/);
  if (c) return { kind: "channel", ref: c[1], channelCall: c[2] != null };
  return null;
}

/** Read the same target identity from normalized binding IR. */
function eventTargetFromBinding(binding) {
  if (typeof binding === "string") return parseEventTarget(binding);
  if (!binding || typeof binding !== "object") return null;
  if (binding.kind === "prop") return { kind: "prop", ref: binding.prop };
  if (binding.kind === "channel") {
    return { kind: "channel", ref: binding.channel, channelCall: false };
  }
  if (binding.kind === "channelCall") {
    return { kind: "channel", ref: binding.channel, channelCall: true };
  }
  if (binding.kind === "channelUpdate") {
    return { kind: "channel", ref: binding.channel, channelUpdate: binding.op };
  }
  return null;
}

/**
 * Walk anatomy.dom collecting every node that carries an `events` entry.
 * `isTop` marks the outermost anatomy node — a component whose top node itself
 * carries the wire (Checkbox `input`) is rendered with the ROOT class binding,
 * not a `prefix__part` literal, so we must not hunt for `prefix__input`.
 * `componentRef` marks nodes whose element is a CHILD COMPONENT (Alert/Chip
 * dismiss → fsds.Button): the wire is delegated as a prop to that child, so
 * react/svelte pass a capital-C `onClick=`/`onChange=` prop, not a native
 * DOM handler.
 */
function collectEventNodes(node, out, isTop = true) {
  if (!node || typeof node !== "object") return;
  if (node.events && typeof node.events === "object") {
    for (const [event, expr] of Object.entries(node.events)) {
      const target = eventTargetFromBinding(expr);
      out.push({
        part: node.part ?? null,
        tag: node.tag ?? null,
        event,
        expr,
        target,
        isTop,
        componentRef: node.componentRef ?? null,
      });
    }
  }
  for (const child of node.children ?? []) collectEventNodes(child, out, false);
}

/**
 * Derive the event-wire obligations for one component: one row per
 * (part, event). Skipped-with-reason rather than dropped when un-auditable.
 */
export function deriveEventObligations(component, corpus) {
  const contract = corpus.get(component) ?? {};
  const componentIR = ir.buildComponentIR(contract, { allContracts: corpus });
  const nodes = [];
  collectEventNodes(componentIR.dom, nodes);
  const cssPrefix = componentIR.cssPrefix;

  return nodes.map((n) => {
    let skip = null;
    if (!n.part) skip = "no-part-name"; // cannot anchor a class token
    else if (!EVENT_KEYS.includes(n.event)) skip = `unmodeled-event:${n.event}`;
    else if (!n.target) skip = `unparsed-target:${JSON.stringify(n.expr)}`;
    // A part is root-rendered (no `prefix__part` literal, uses the root class
    // binding) when it is named "root" OR it is the outermost anatomy node.
    const rootRendered = n.part === "root" || n.isTop;
    const classToken = rootRendered ? null : `${cssPrefix}__${n.part}`;
    return {
      component,
      part: n.part,
      event: n.event,
      expr: n.expr,
      target: n.target,
      componentRef: n.componentRef,
      cssPrefix,
      classToken, // null → root element (no `prefix__part` class literal)
      skip,
    };
  });
}

// ---- per-framework file access ----------------------------------------------

function frameworkFiles(fw, component) {
  const dir = resolve(REPO, fw.root, component);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(fw.ext) && !/\.(test|spec)\./.test(f))
    .map((f) => resolve(dir, f));
}

/** All non-test source lines of a component for a framework (flattened). */
function frameworkLines(fw, component) {
  const lines = [];
  for (const file of frameworkFiles(fw, component)) {
    for (const line of readFileSync(file, "utf8").split("\n")) lines.push(line);
  }
  return lines;
}

function frameworkText(fw, component) {
  return frameworkFiles(fw, component)
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
}

// Framework-specific expression that carries the ROOT element's class binding,
// so a root-part event wire can be co-located with the root element (which has
// no `prefix__part` literal). Derived from generated output for Button /
// ToggleSwitch / Input roots.
const ROOT_CLASS_EXPR = {
  react: /className=\{/,
  vue: /:class=/,
  svelte: /class=\{/,
  angular: /\[ngClass\]=/,
  lit: /class=\$\{|class="\$\{/,
};

/**
 * Is the event wire realized in `fw`'s output for this component? A wire is
 * realized when the part's element carries the framework handler token for the
 * event:
 *   - non-root part: a source LINE holds BOTH the `prefix__part` class literal
 *     AND the handler token (co-location on the element).
 *   - root part: a source LINE holds BOTH the framework root-class expression
 *     AND the handler token.
 * Co-location on one emitted element line is what makes deletion of the handler
 * fail the audit (the class literal survives; the handler token vanishes).
 */
export function isEventRealized(fw, ob) {
  let handlerRe = fw.handler[ob.event];
  if (!handlerRe) return { realized: false, reason: "no-handler-vocab" };

  // React's `onChange` is its idiomatic keystroke-timed text-input event, so
  // it realizes a semantic `input` commit even though the JSX prop spelling
  // differs from the other web targets.
  if (ob.event === "input" && fw.id === "react" && fw.handler.change) {
    handlerRe = new RegExp(`(?:${handlerRe.source})|(?:${fw.handler.change.source})`);
  }

  // FIX-SETTINGS-FIELD-VUE-FINDINGS-01 #6: a legacy value-channel `change`
  // wire may be realized keystroke-timed as the native `input` event. Accept
  // either spelling for that legacy obligation.
  // Accept EITHER token for a `change` obligation so a faithful `@input`
  // realization is not a false negative. Falsification is preserved: both
  // handlers must be absent for the wire to read unrealized.
  if (ob.event === "change" && fw.handler.input) {
    handlerRe = new RegExp(`(?:${handlerRe.source})|(?:${fw.handler.input.source})`);
  }

  // componentRef parts delegate the wire as a PROP to a child component; the
  // element is `<Button …>`, not a DOM tag. react/svelte pass a capital-C
  // `onClick=`/`onChange=` prop; vue/angular/lit keep their native handler
  // syntax. Accept either so the check stays tight (the token must still be on
  // the child element's line) without a false negative on the prop form.
  if (ob.componentRef) {
    const cap = ob.event.charAt(0).toUpperCase() + ob.event.slice(1); // Click/Change
    const propRe = new RegExp(`\\bon${cap}\\s*=`);
    handlerRe = new RegExp(`(?:${handlerRe.source})|(?:${propRe.source})`);
  }

  const lines = frameworkLines(fw, ob.component);
  if (lines.length === 0) return { realized: false, reason: "no-generated-files" };

  if (ob.classToken) {
    const found = lines.some(
      (l) => l.includes(ob.classToken) && handlerRe.test(l),
    );
    return { realized: found, reason: found ? null : "handler-not-on-part-element" };
  }
  // root element
  const rootRe = ROOT_CLASS_EXPR[fw.id];
  const found = lines.some((l) => rootRe.test(l) && handlerRe.test(l));
  return { realized: found, reason: found ? null : "handler-not-on-root-element" };
}

// ---- compound / disclosure obligation ---------------------------------------

// Realization tokens per framework, derived from generated Tabs + Accordion.
//   provider — the compound-context provision the lowering emits.
//   toggle   — disclosure per-item call (Accordion).
//   select   — tab-selection per-item call (Tabs).
const COMPOUND_TOKENS = {
  react: {
    provider: /createCompoundContext\s*</,
    toggle: /toggleItem\s*\(/,
    select: /setActiveTab\s*\(/,
  },
  vue: {
    provider: /provide\w+Context\s*\(/,
    toggle: /toggleItem\s*\(/,
    select: /setActiveTab\s*\(/,
  },
  svelte: {
    provider: /provide\w+Context\s*\(/,
    toggle: /toggleItem\s*\(/,
    select: /setActiveTab\s*\(/,
  },
  angular: {
    provider: /\w+ContextToken/,
    toggle: /toggleItem\s*\(/,
    select: /setActiveTab\s*\(/,
  },
  lit: {
    provider: /provideContext\s*\(/,
    toggle: /toggleItem\s*\(/,
    select: /setActiveTab\s*\(/,
  },
};

export function deriveCompoundObligation(component, corpus) {
  const contract = corpus.get(component) ?? {};
  const built = ir.buildComponentIR(contract, { allContracts: corpus });
  if (!hook.isCompoundStateContainer(built)) return null;
  const disclosure = hook.isDisclosureContainer(built);
  return {
    component,
    kind: disclosure ? "disclosure" : "tab-selection",
    interactiveItem: hook.getInteractiveItemPart(built)?.name ?? null,
    region: hook.getRegionPart(built)?.name ?? null,
  };
}

/** Verify the compound wiring the lowering promises exists in `fw` output. */
export function isCompoundRealized(fw, ob) {
  const tok = COMPOUND_TOKENS[fw.id];
  const text = frameworkText(fw, ob.component);
  if (!text) return { realized: false, missing: ["generated-files"] };
  const missing = [];
  if (!tok.provider.test(text)) missing.push("context-provider");
  const itemCall = ob.kind === "disclosure" ? tok.toggle : tok.select;
  const callName = ob.kind === "disclosure" ? "toggle-call" : "select-call";
  if (!itemCall.test(text)) missing.push(callName);
  return { realized: missing.length === 0, missing };
}

// ---- portal obligation ------------------------------------------------------

// The React root-portal primitive orphaned-then-fixed by FIX-PORTAL-CONSUMPTION-01.
const PORTAL_PRIMITIVE = /\b(usePortal|renderInPortal)\b/;

// Per-framework root-portal consumption tokens, matching what each emitter
// actually produces for portalsRootToBody components
// (FEAT-PORTAL-MECHANISM-CROSS-FRAMEWORK-01). Angular appends the host from
// its lifecycle (`document.body.appendChild(host)`); lit moves the host
// element itself (`document.body.appendChild(this)`).
const PORTAL_CONSUMPTION = {
  react: /\brenderInPortal\b/,
  vue: /<Teleport to="body"/,
  svelte: /use:portal/,
  angular: /document\.body\.appendChild\(/,
  lit: /document\.body\.appendChild\(this\)/,
};

export function derivePortalObligation(component, corpus) {
  const contract = corpus.get(component) ?? {};
  const built = ir.buildComponentIR(contract, { allContracts: corpus });
  const rootPortal = sem.portalsRootToBody(built);
  const portalEnabled = built.behavior?.portal?.enabled === true;
  const anchoredPositioning =
    built.surface?.positioning?.strategy === "anchored";
  const anchoredContentPortal = sem.anchoredPortalsContentToBody(built);
  // Selector-anchored root portal (coachmark tours): the ROOT panel moves
  // to body (root-portal mechanism) while positioning comes from the
  // anchored primitive — so it owes consume-root-portal +
  // consume-anchored-positioning, and is exempt from the orphan invariant.
  const selectorAnchoredRoot = sem.selectorAnchoredRootPortal(built) !== null;
  return {
    component,
    rootPortal,
    portalEnabled,
    anchoredPositioning,
    anchoredContentPortal,
    selectorAnchoredRoot,
  };
}

// Per-framework anchored-POSITIONING consumption tokens: the mirrored
// positioning primitive each emitter instantiates on the content part when
// `surface.positioning.strategy === "anchored"`
// (FEAT-ANCHORED-SURFACE-XFW-01). Same options/state shape everywhere;
// names follow each package's primitive naming convention.
const ANCHORED_POSITION_CONSUMPTION = {
  react: /\buseAnchoredPosition\(/,
  vue: /\buseAnchoredPosition\(/,
  svelte: /\bcreateAnchoredPosition\(/,
  angular: /\bcreateAnchoredPosition\(/,
  lit: /\bnew AnchoredPositionController\(/,
};

// Per-framework anchored-CONTENT-portal consumption tokens: how each emitter
// moves the anchored content node (never the root — the trigger stays
// in-tree) to document.body when `anchoredPortalsContentToBody` holds.
// React wraps content in createPortal; lit moves the content HOST element
// (its own custom element, so shadow styles travel with it).
const ANCHORED_PORTAL_CONSUMPTION = {
  react: /\bcreatePortal\(/,
  vue: /<Teleport to="body"/,
  svelte: /use:portal/,
  angular: /document\.body\.appendChild\(/,
  lit: /document\.body\.appendChild\(this\)/,
};

/**
 * Positive obligations for anchored presence surfaces:
 *  - consume-anchored-positioning: every framework's content part must
 *    instantiate its positioning primitive when the contract declares
 *    `positioning.strategy: "anchored"`.
 *  - consume-anchored-content-portal: every framework must move the content
 *    node to document.body when the contract also enables portal.
 */
export function checkAnchored(ob) {
  const results = [];
  if (ob.anchoredPositioning) {
    for (const fw of FRAMEWORKS) {
      const text = frameworkText(fw, ob.component);
      results.push({
        component: ob.component,
        framework: fw.id,
        obligation: "consume-anchored-positioning",
        realized: ANCHORED_POSITION_CONSUMPTION[fw.id].test(text),
      });
    }
  }
  if (ob.anchoredContentPortal) {
    for (const fw of FRAMEWORKS) {
      const text = frameworkText(fw, ob.component);
      results.push({
        component: ob.component,
        framework: fw.id,
        obligation: "consume-anchored-content-portal",
        realized: ANCHORED_PORTAL_CONSUMPTION[fw.id].test(text),
      });
    }
  }
  return results;
}

/**
 * Positive: root-portal components must consume each framework's root-portal
 * mechanism in ALL five frameworks (PORTAL_CONSUMPTION tokens).
 * Negative (orphan invariant): non-root-portal components must carry NO
 * root-portal primitive (usePortal/renderInPortal) in ANY framework.
 */
export function checkPortal(ob) {
  const results = [];
  if (ob.rootPortal || ob.selectorAnchoredRoot) {
    for (const fw of FRAMEWORKS) {
      const text = frameworkText(fw, ob.component);
      const consumed = PORTAL_CONSUMPTION[fw.id].test(text);
      results.push({
        component: ob.component,
        framework: fw.id,
        obligation: "consume-root-portal",
        realized: consumed,
      });
    }
  } else {
    // orphan invariant across all admitted frameworks
    for (const fw of FRAMEWORKS) {
      const text = frameworkText(fw, ob.component);
      const orphaned = PORTAL_PRIMITIVE.test(text);
      results.push({
        component: ob.component,
        framework: fw.id,
        obligation: "no-orphan-portal-primitive",
        realized: !orphaned,
      });
    }
  }
  return results;
}

// ---- run --------------------------------------------------------------------

const RUN_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (RUN_DIRECTLY) {
  const t0 = Date.now();
  const corpus = loadCorpus();
  const components = ALL_COMPONENTS();

  const failures = [];

  // ---- EVENT WIRE ----
  const eventRows = [];
  let eventObligations = 0;
  for (const c of components) {
    for (const ob of deriveEventObligations(c, corpus)) {
      const perFramework = {};
      if (ob.skip) {
        eventRows.push({ ...ob, perFramework: null });
        continue;
      }
      eventObligations += 1;
      for (const fw of FRAMEWORKS) {
        const r = isEventRealized(fw, ob);
        perFramework[fw.id] = r;
        if (!r.realized) {
          failures.push({
            class: "event-wire",
            component: c,
            detail: `${ob.part}.${ob.event} (${ob.expr})`,
            framework: fw.id,
            reason: r.reason,
          });
        }
      }
      eventRows.push({ ...ob, perFramework });
    }
  }

  // ---- COMPOUND ----
  const compoundRows = [];
  let compoundObligations = 0;
  for (const c of components) {
    const ob = deriveCompoundObligation(c, corpus);
    if (!ob) continue;
    compoundObligations += 1;
    const perFramework = {};
    for (const fw of FRAMEWORKS) {
      const r = isCompoundRealized(fw, ob);
      perFramework[fw.id] = r;
      if (!r.realized) {
        failures.push({
          class: "compound",
          component: c,
          detail: `${ob.kind} (item=${ob.interactiveItem})`,
          framework: fw.id,
          reason: `missing:${r.missing.join(",")}`,
        });
      }
    }
    compoundRows.push({ ...ob, perFramework });
  }

  // ---- PORTAL ----
  const portalRows = [];
  let portalObligations = 0;
  for (const c of components) {
    const ob = derivePortalObligation(c, corpus);
    const checks = [...checkPortal(ob), ...checkAnchored(ob)];
    portalObligations += checks.length;
    for (const chk of checks) {
      if (!chk.realized) {
        const reason =
          chk.obligation === "consume-root-portal"
            ? "root-portal-mechanism-not-consumed"
            : chk.obligation === "consume-anchored-positioning"
              ? "anchored-positioning-primitive-not-consumed"
              : chk.obligation === "consume-anchored-content-portal"
                ? "anchored-content-portal-not-consumed"
                : "orphaned-portal-primitive-present";
        failures.push({
          class: "portal",
          component: c,
          detail: chk.obligation,
          framework: chk.framework,
          reason,
        });
      }
    }
    portalRows.push({ ...ob, checks });
  }

  const skippedEvents = eventRows.filter((r) => r.skip);

  // ---- emit JSON + Markdown (gitignored machine-local) ----
  mkdirSync(OUT_DIR, { recursive: true });
  const summary = {
    spec: "RAIL-BEHAVIOR-REALIZATION-AUDIT-01",
    generatedFromCommit: process.env.AUDIT_COMMIT ?? null,
    componentCount: components.length,
    frameworks: FRAMEWORKS.map((f) => f.id),
    obligationCounts: {
      eventWire: eventObligations,
      compound: compoundObligations,
      portal: portalObligations,
      eventWireSkipped: skippedEvents.length,
    },
    failureCount: failures.length,
  };
  writeFileSync(
    resolve(OUT_DIR, "behavior-matrix.json"),
    JSON.stringify(
      { ...summary, failures, eventRows, compoundRows, portalRows },
      null,
      2,
    ) + "\n",
  );

  const md = [];
  md.push("# Behavior-realization obligation matrix");
  md.push("");
  md.push("`RAIL-BEHAVIOR-REALIZATION-AUDIT-01` — read-only. Obligations are derived from the LIVE contract corpus each run (never a committed frozen classification) and verified against generated framework output. Static source-level only — no runtime/browser/a11y proof.");
  md.push("");
  md.push(`Components: **${components.length}** · Frameworks: ${FRAMEWORKS.map((f) => f.id).join(", ")}`);
  md.push("");
  md.push("## Obligation counts");
  md.push("");
  md.push("| class | obligations |");
  md.push("|---|---|");
  md.push(`| event-wire (× ${FRAMEWORKS.length} frameworks) | ${eventObligations} |`);
  md.push(`| event-wire skipped (typed reason) | ${skippedEvents.length} |`);
  md.push(`| compound/disclosure (× ${FRAMEWORKS.length} frameworks) | ${compoundObligations} |`);
  md.push(`| portal (positive + orphan) | ${portalObligations} |`);
  md.push("");
  md.push(`## Failures: ${failures.length}`);
  md.push("");
  if (failures.length) {
    md.push("| class | component | detail | framework | reason |");
    md.push("|---|---|---|---|---|");
    for (const f of failures) md.push(`| ${f.class} | ${f.component} | ${f.detail} | ${f.framework} | ${f.reason} |`);
  } else md.push("_none — every derived obligation is realized._");
  md.push("");
  md.push("## Event-wire obligations");
  md.push("");
  md.push("| component | part | event | target | react | vue | svelte | angular | lit |");
  md.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of eventRows) {
    if (r.skip) {
      md.push(`| ${r.component} | ${r.part ?? "?"} | ${r.event} | _skip: ${r.skip}_ | - | - | - | - | - |`);
      continue;
    }
    const cell = (id) => (r.perFramework[id]?.realized ? "ok" : `MISS(${r.perFramework[id]?.reason})`);
    const tgt = r.target ? `${r.target.kind}:${r.target.ref}${r.target.channelCall ? "()" : ""}` : "?";
    md.push(`| ${r.component} | ${r.part} | ${r.event} | ${tgt} | ${cell("react")} | ${cell("vue")} | ${cell("svelte")} | ${cell("angular")} | ${cell("lit")} |`);
  }
  md.push("");
  md.push("## Compound / disclosure obligations");
  md.push("");
  md.push("| component | kind | item | react | vue | svelte | angular | lit |");
  md.push("|---|---|---|---|---|---|---|---|");
  for (const r of compoundRows) {
    const cell = (id) => (r.perFramework[id]?.realized ? "ok" : `MISS(${r.perFramework[id]?.missing.join(",")})`);
    md.push(`| ${r.component} | ${r.kind} | ${r.interactiveItem} | ${cell("react")} | ${cell("vue")} | ${cell("svelte")} | ${cell("angular")} | ${cell("lit")} |`);
  }
  md.push("");
  md.push("## Portal obligations");
  md.push("");
  md.push("| component | root-portal? | portal.enabled? | checks |");
  md.push("|---|---|---|---|");
  for (const r of portalRows) {
    const chk = r.checks.map((c) => `${c.framework}:${c.obligation}=${c.realized ? "ok" : "MISS"}`).join("; ");
    md.push(`| ${r.component} | ${r.rootPortal} | ${r.portalEnabled} | ${chk} |`);
  }
  md.push("");
  writeFileSync(resolve(OUT_DIR, "behavior-matrix.md"), md.join("\n") + "\n");

  // ---- console summary ----
  const ms = Date.now() - t0;
  console.log(`\nRAIL-BEHAVIOR-REALIZATION-AUDIT-01 — ${components.length} components (${ms}ms)`);
  console.log(`obligations: event-wire=${eventObligations} (×${FRAMEWORKS.length} fw), compound=${compoundObligations} (×${FRAMEWORKS.length} fw), portal=${portalObligations}; event-wire skipped=${skippedEvents.length}`);
  console.log(`report: ${resolve(OUT_DIR, "behavior-matrix.md")}`);
  if (failures.length) {
    console.error(`\nUNREALIZED OBLIGATIONS: ${failures.length}`);
    for (const f of failures) console.error(`  - [${f.class}] ${f.component} ${f.detail} · ${f.framework} · ${f.reason}`);
    process.exit(1);
  }
  console.log("\nAll derived behavior obligations are realized.");
}
