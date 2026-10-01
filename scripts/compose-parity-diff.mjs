#!/usr/bin/env node
/** Native token integrity over the generated trees. Each target emits its
 * own consumed slots. Shared addresses must agree; every Compose lookup must
 * have a definition in the addressed scope and every definition must be used.
 * Supported chrome roles, content propagation and Compose API shape remain
 * cross-target obligations. This static gate does not prove visual parity.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { composeTokenReads, composeTokenDefinitions } from "../packages/ds-codegen/dist/frameworks/native-token-consumption.js";

const ROOT = join(import.meta.dirname, "..");
const COMPOSE_ROOT = join(
  ROOT, "packages", "ds-jetpack-compose", "library", "src", "main", "kotlin",
  "com", "fullstackds", "components",
);
const RN_ROOT = join(ROOT, "packages", "ds-react-native", "src", "components");
const CONTRACTS_ROOT = join(ROOT, "packages", "ds-contracts", "components");

const registry = JSON.parse(readFileSync(join(ROOT, "fsds.targets.json"), "utf8"));
const compose = registry.targets.find((t) => t.id === "jetpack-compose");
const admitted = (compose?.components ?? []).sort();

let failures = 0;

/** Shared slot identity survives target-specific projection. RN definitions
 * carry the same name/cssVar metadata even when native value units differ. */
function rnTokenIdentities(source) {
  return new Map([...source.matchAll(/name:\s*"([^"]+)",\s*cssVar:\s*"([^"]+)"/g)]
    .map(match => [match[1], match[2]]));
}

/** Slot keys the RN `<Name>.styles.ts` consumes (`tokens.<scope>?.["…"]`). */
function rnConsumedKeys(stylesSource) {
  return new Set(
    [...stylesSource.matchAll(/tokens\.[A-Za-z0-9_]+(\?\.)?\["([^"]+)"\]/g)]
      .map((m) => m[2]),
  );
}

/** The claimed chrome-role set, per emitter path. Each path claims exactly
 *  the roles it realizes: static-content claims box-model padding/min-height +
 *  base color tones + radius; the projected-children (button) path also claims
 *  minimum width. Both use the canonical box-model slots; the native-toggle path
 *  claims none of the chrome roles (its realization is the track/thumb color
 *  surface). State variants (`.foreground.hover`, `.background.active`) and
 *  per-part tones (Stat's `.foreground.value`/`.label`) are never claimed. */
const BASE_BACKGROUND = /\.color\.background\.(default|bg)$/;
const BASE_FOREGROUND = /\.color\.foreground\.(default|primary)$/;
const CHROME_ROLE_STATIC = new RegExp(
  [BASE_BACKGROUND.source, BASE_FOREGROUND.source, "\\.(?:size|border)\\.radius(?:\\.|$)", "box-model\\.padding", "box-model\\.min-height(?:\\.|$)"].join("|"),
);
const CHROME_ROLE_BUTTON = new RegExp(
  [CHROME_ROLE_STATIC.source, "box-model\\.min-width(?:\\.|$)"].join("|"),
);
const CHROME_ROLE_TOGGLE = /(?!)/;
/** Boolean-control path (Checkbox): the checkbox-part token vocabulary plus
 *  the shared box-model surface slots it realizes. `box-model.gap` is
 *  deliberately unclaimed — a lone control lays out no children; the
 *  label/gap realization belongs to composer classes. */
const CHROME_ROLE_CHECKBOX = new RegExp(
  ["checkbox\\.(?:color|border|focus\\.ring|transition)\\.", "box-model\\.(?:padding|min-width|min-height)"].join("|"),
);
/** Bare-rule-leaf path (Divider): the rule paint (part-scoped color default
 *  + thickness) and its surface minimums. */
const CHROME_ROLE_RULE = new RegExp(
  ["\\.color\\.default$", "\\.size\\.thickness", "box-model\\.(?:padding|min-width|min-height)"].join("|"),
);
/** Glyph-host path (Icon): per-member frame dims (`icon.size.*`) and the
 *  touch-surface box-model slots. `box-model.gap` unclaimed — a lone glyph
 *  lays out no children. */
const CHROME_ROLE_GLYPH_HOST = new RegExp(
  ["icon\\.size\\.", "box-model\\.(?:padding|min-width|min-height)"].join("|"),
);
/** Icon-decorated path (Alert/AlertNotice/Badge): container paint (part-
 *  scoped bg/border/fg incl. variant layers), radius, the icon↔content gap,
 *  and the surface minimums. Part-scoped text typography (`.text.size`/
 *  `.text.weight`) deliberately unclaimed — the content region is a
 *  consumer composable, not styled text. */
const CHROME_ROLE_ICON_DECORATED = new RegExp(
  ["\\.color\\.(?:background|border|foreground)\\.", "\\.(?:size|border)\\.radius", "\\.spacing\\.gap", "box-model\\.(?:padding|min-width|min-height)"].join("|"),
);
/** Text-control path (Input): the input-part chrome vocabulary (colors incl.
 *  disabled variants, border width, radius, typography size) plus the
 *  surface minimums. `input.opacity.disabled` deliberately unclaimed — a
 *  unitless numeric with no toFsds converter; disabled styling rides the
 *  color slots. */
const CHROME_ROLE_TEXT_CONTROL = new RegExp(
  ["input\\.(?:color|size|typography)\\.", "box-model\\.(?:padding|min-width|min-height)"].join("|"),
);
/** Font-size role: claimed by the prop-text leaf path (the corpus's
 *  text-leaf size vocabulary — `code-block.size.fontSize` etc.). */
const FONT_SIZE_ROLE = /\.size\.fontSize\.|\.typography\.fontSize\./;
/** Text-color role: claimed by the progress path (`progress.color.text`). */
const TEXT_COLOR_ROLE = /\.color\.text\./;
/** Typography role: claimed only for typography-bearing content-role roots
 *  (slot-evidence: the scopes carry `text.size.*` keys). Covers the slots the
 *  RN Text styles consume (text.size.md + text.typography.fontWeight.*). */
const TYPO_ROLE = /text\.size\.|text\.typography\.fontWeight\./;

/** Which emitter path produced a generated `<Name>.kt`. */
function emitterPath(ktSource) {
  if (ktSource.includes("FsdsButtonScope")) return "button";
  if (ktSource.includes("FsdsToggle")) return "toggle";
  if (ktSource.includes("FsdsCheckbox")) return "checkbox";
  if (ktSource.includes("FsdsRule")) return "rule";
  if (ktSource.includes("FsdsGlyphIcon")) return "glyphHost";
  // A compound-part composer emits a marker scope plus one region composable
  // per declared part, because it has no dom to walk.
  if (/^private object \w+ScopeImpl : /m.test(ktSource)) return "compoundPartComposer";
  if (ktSource.includes("FoundationImage(")) return "mediaLeaf";
  if (ktSource.includes("contentDescription = ") && ktSource.includes("avatar")) return "referencedContentComposite";
  if (ktSource.includes("FsdsDate.")) return "dateGrid";
  // A passive tree item renders a heading with text beside its catalog glyph;
  // the glyph-host class renders the glyph alone.
  if (ktSource.includes("FsdsGlyphIcon(") && ktSource.includes("BasicText(")) return "passiveTree";
  // A component is *composed from* references when it composes more than one
  // control; a single decoration reference is a fact of whatever class owns the
  // layout (Status renders one icon and stays a static-content box).
  if (composedCallSites(ktSource) >= 2) return "referencedComposite";
  // A named-slot composer declares one nullable content region per slot, so the
  // signature shape identifies the path without naming the component.
  if ((ktSource.match(/: \(@Composable \(\) -> Unit\)\? = null/g) ?? []).length >= 3) {
    return "namedSlotComposer";
  }
  if (ktSource.includes("icon: (@Composable () -> Unit)?")) return "iconDecorated";
  // Surface classes are tested before every marker whose host they *reuse*:
  // an anchored surface is a `Popup(` host, a centered surface may carry a
  // `BasicTextField(` search channel, and a viewport-edge surface is a
  // `ComposeDialog(` host. Classifying one of those as the lower-level class
  // makes its chrome-role claim vacuous, so the specific marker wins.
  if (ktSource.includes("onGloballyPositioned")) return "anchoredSurface";
  if (ktSource.includes("fillMaxSize()")) return "edgeSurface";
  if (ktSource.includes("ComposeDialog(")) return "centeredSurface";
  if (ktSource.includes("BasicTextField(")) return "textControl";
  if (ktSource.includes("AnimatedVisibility(")) return "disclosure";
  if (ktSource.includes("Role.RadioButton")) return "radioGroup";
  if (ktSource.includes("filter { it != item }")) return "arrayList";
  if (ktSource.includes("compositionLocalOf")) return "interactiveComposite";
  if (ktSource.includes("padEnd(length")) return "countField";
  if (ktSource.includes("inputModifier")) return "labeledText";
  if (ktSource.includes("Popup(")) return "selectionControl";
  if (ktSource.includes("FsdsProgressIndicator")) return "progress";
  if (ktSource.includes("BasicText(") && !ktSource.includes("content: @Composable")) {
    return "propText";
  }
  if (ktSource.includes("resolvedExpanded")) return "expandable";
  return "static";
}

/** Chrome-role filter for a generated component's emitter path. */
function chromeRoleForPath(path) {
  if (path === "button") return CHROME_ROLE_BUTTON;
  if (path === "toggle") return CHROME_ROLE_TOGGLE;
  if (path === "checkbox") return CHROME_ROLE_CHECKBOX;
  if (path === "rule") return CHROME_ROLE_RULE;
  if (path === "glyphHost") return CHROME_ROLE_GLYPH_HOST;
  if (path === "iconDecorated") return CHROME_ROLE_ICON_DECORATED;
  if (path === "textControl") return CHROME_ROLE_TEXT_CONTROL;
  /** Disclosure path (Details): the details-part chrome vocabulary plus the
   *  surface minimums. Hover-scoped slots, focus-ring slots, typography and
   *  spacing deliberately unclaimed (ledgered divergences). */
  if (path === "disclosure") {
    return new RegExp(
      ["details\\.(?:color|size)\\.", "box-model\\.(?:padding|min-width|min-height)"].join("|"),
    );
  }
  /** Radio-collection path (RadioGroup): the shared box-model surface slots
   *  incl. the group gap (the options really are laid out with it). */
  /** Array-iterated list path (Shuttle): the shuttle-part chrome plus the
   *  shared box-model family incl. the list gap. */
  /** Interactive-composite path (Accordion/Tabs): the part-scoped container paint
   *  (accordion border / tabs shape radius) plus the shared box-model family.
   *  Part-scoped typography (`accordion.text.*`) deliberately unclaimed. */
  /** Count-iterated field-group path (OTP): the otp-part chrome plus the
   *  shared box-model family incl. the slot gap. */
  /** Labeled text-control path (TextField): the text-field border chrome
   *  plus the shared box-model family. */
  /** Selection-control path (Select): the select-part chrome (background,
   *  border color/width, radius) plus the shared box-model family. */
  /** Centered-surface path (Dialog/Command): the part-scoped chrome family
   *  (`dialog.*`, `command.*`) plus the shared box-model family. */
  /** Viewport-edge surface path (Sheet/Toast): the sheet/toast-part chrome
   *  (border colour/width, radius) plus the shared box-model family. Note
   *  `sheet.color.border` is the contract's border colour slot. */
  /** Anchored-surface path (Popover/Tooltip): the popover/tooltip-part chrome
   *  plus the shared box-model family. */
  if (path === "anchoredSurface") {
    return new RegExp(
      ["(?:popover|tooltip)\\.(?:color|size)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  if (path === "edgeSurface") {
    return new RegExp(
      ["(?:sheet|toast)\\.(?:border|color|surface)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  /** Referenced content composite path (Avatar): the avatar-part chrome family
   *  plus the shared box-model family. `avatar.size.<member>` is
   *  React Native-consumed while the contract declares the size axis as a
   *  variant, not as slots, so no Compose read can resolve it; the role claims
   *  the size.border / size.radius and fontWeight slots the contract does
   *  declare; the size-member and fontFamily exclusions are recorded in the
   *  admission criteria. */
  if (path === "referencedContentComposite") {
    return new RegExp(
      ["avatar\\.(?:color|typography\\.fontWeight|size\\.(?:border|radius))\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  /** Media leaf path (Image): the image-part chrome the corpus declares slots
   *  for — colour and radius — plus the shared box-model family. `image.size.*`
   *  is React Native-consumed but the contract declares the size axis as a
   *  variant, not as slots, so no Compose read can resolve it; the divergence
   *  is ledgered rather than papered over. */
  if (path === "mediaLeaf") {
    return new RegExp(
      ["image\\.(?:color|radius)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  /** Compound-part composer path (Card): the card-part chrome family plus the
   *  shared box-model family. */
  if (path === "compoundPartComposer") {
    return new RegExp(
      ["card\\.(?:color|size|typography|elevation|focus)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  /** Passive tree item path (NavTree): the nav-tree chrome family plus the
   *  shared box-model family. */
  if (path === "passiveTree") {
    return new RegExp(
      ["nav-tree\\.(?:color|size|stateLayer)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  /** Named-slot composer path (Field): the field-part chrome family (surface,
   *  label, radius, section and meta gaps) plus the shared box-model family. */
  if (path === "namedSlotComposer") {
    return new RegExp(
      ["field\\.(?:color|size|label|focus|gap|pad|radius)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  /** Referenced-action composite path (Chip): the chip-part chrome family plus
   *  the shared box-model family. The referenced controls carry their own
   *  chrome from their own generated class. */
  if (path === "referencedComposite") {
    return new RegExp(
      ["chip\\.(?:color|size|text|motion)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  /** Date-grid path (Calendar): the calendar-part chrome family (surface,
   *  day states, today/focus rings, cell/nav/radius geometry, typography)
   *  plus the shared box-model family. */
  if (path === "dateGrid") {
    return new RegExp(
      ["calendar\\.(?:color|size|typography|focus)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  if (path === "centeredSurface") {
    return new RegExp(
      ["(?:dialog|command)\\.(?:color|size|border|spacing|text)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  if (path === "selectionControl") {
    return new RegExp(
      ["select\\.(?:color|size)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  if (path === "labeledText") {
    return new RegExp(
      ["text-field\\.border\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  if (path === "countField") {
    return new RegExp(
      ["otp\\.(?:color|size)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  if (path === "interactiveComposite") {
    return new RegExp(
      ["(?:accordion\\.border|tabs\\.shape)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  if (path === "arrayList") {
    return new RegExp(
      ["shuttle\\.(?:color|size)\\.", "box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  if (path === "radioGroup") {
    return new RegExp(
      ["box-model\\.(?:gap|padding|min-width|min-height)"].join("|"),
    );
  }
  if (path === "progress") {
    return new RegExp([CHROME_ROLE_STATIC.source, TEXT_COLOR_ROLE.source].join("|"));
  }
  if (path === "propText") {
    return new RegExp([CHROME_ROLE_STATIC.source, FONT_SIZE_ROLE.source].join("|"));
  }
  if (path === "expandable") return CHROME_ROLE_STATIC;
  return CHROME_ROLE_STATIC;
}

/**
 * Declared component references the target does not yet realize, each with the
 * reason. Two-directional: an unlisted unrealized reference fails, and a listed
 * reference that becomes realized fails as a stale entry. Every entry is a
 * decision recorded in docs/architecture/native-target-admission.md, so a
 * declared reference can never be dropped silently.
 */
export const REFERENCE_DIVERGENCES = {
};

/** Generated components this source composes by reference. The committed
 *  substrates under `components/<family>/` share the prefix but are not
 *  components, so the import must name the component its package is named for
 *  (`components/button/Button`). */
export function composedComponents(ktSource) {
  const out = [];
  for (const match of ktSource.matchAll(/^import com\.fullstackds\.components\.([a-z0-9]+)\.([A-Z]\w*)$/gm)) {
    const [, pkg, symbol] = match;
    if (pkg.charAt(0).toUpperCase() + pkg.slice(1) === symbol) out.push(symbol);
  }
  return out;
}

/** How many times this source calls a generated component it imports. */
function composedCallSites(ktSource) {
  let total = 0;
  for (const symbol of composedComponents(ktSource)) {
    total += (ktSource.match(new RegExp(`${symbol}\\(`, "g")) ?? []).length;
  }
  return total;
}

/** Declared `componentRef` parts in a contract's dom, in declaration order. */
function declaredReferences(contract) {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    const ref = node.componentRef;
    if (typeof ref === "string") {
      out.push({ part: node.part ?? "(unparted)", ref: ref.replace(/^fsds\./, "") });
    }
    (node.children ?? []).forEach(walk);
  };
  walk(contract?.anatomy?.dom);
  return out;
}

/** Every declared reference is realized in the generated Kotlin, or listed in
 *  the divergence ledger as a deliberate gap. */
export function inspectComponentReferences({ name, contract, component, ledger = REFERENCE_DIVERGENCES }) {
  const issues = [];
  for (const { part, ref } of declaredReferences(contract)) {
    const key = `${name}:${part}`;
    const realized = component.includes(`${ref}(`);
    if (realized && ledger[key]) {
      issues.push(`STALE REFERENCE LEDGER ${key}: the reference to ${ref} is realized — remove the entry`);
    }
    if (!realized && !ledger[key]) {
      issues.push(`UNREALIZED REFERENCE ${key}: the contract declares a reference to ${ref} and the emitted source never calls it`);
    }
  }
  return issues;
}

/** First parameter that carries a default in the composable signature. */
function firstDefaultParam(ktSource, name) {
  const m = ktSource.match(new RegExp(`fun ${name}\\(([\\s\\S]*?)\\)\\s*\\{`));
  if (!m) return null;
  const params = m[1].split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  // Split on top-level commas (none appear inside the lambda types used here).
  const firstWithDefault = params.split(",").find((p) => p.includes("="));
  return firstWithDefault?.trim() ?? null;
}

export function inspectComposeTokens({ name, tokens, component, rnTokens, rnStyles }) {
  const issues = [];
  const definitions = composeTokenDefinitions(tokens);
  const reads = composeTokenReads(component);
  const declared = new Set(definitions.map(definition => definition.key));
  const rnIdentities = rnTokenIdentities(rnTokens);
  for (const definition of definitions) {
    const address = `${definition.scope}/${definition.key}`;
    if (definition.name !== definition.key || !definition.cssVar?.startsWith("--fsds-")) {
      issues.push(`INVALID IDENTITY ${address}`);
    }
    const rnIdentity = rnIdentities.get(definition.key);
    if (rnIdentity !== undefined && definition.cssVar !== rnIdentity) {
      issues.push(`SHARED IDENTITY ${address}: Compose=${definition.cssVar} RN=${rnIdentity}`);
    }
    if (definition.ref === undefined && definition.literal === undefined && definition.fallback === undefined) {
      issues.push(`UNRESOLVABLE ${address}: no ref, literal or fallback`);
    }
    if (!reads.some(read => read.name === definition.key &&
        (read.scope === undefined || read.scope === definition.scope))) {
      issues.push(`UNCONSUMED ${address}`);
    }
  }
  for (const read of reads) {
    if (!definitions.some(definition => definition.key === read.name &&
        (read.scope === undefined || read.scope === definition.scope))) {
      issues.push(`DEAD LOOKUP ${read.scope ?? "layered"}/${read.name}`);
    }
  }
  const path = emitterPath(component);
  const chromeRole = chromeRoleForPath(path);
  const isTypographyBearing = [...rnIdentities.keys()].some(key => key.includes("text.size."));
  const rnConsumed = [...rnConsumedKeys(rnStyles)].filter(key =>
    chromeRole.test(key) || (isTypographyBearing && TYPO_ROLE.test(key)));
  for (const key of rnConsumed) {
    if (!reads.some(read => read.name === key)) issues.push(`USAGE DIVERGENCE ${path}: ${key}`);
  }
  const isStaticContent = component.includes("content: @Composable () -> Unit");
  if (isStaticContent && [...declared].some(key => BASE_FOREGROUND.test(key)) &&
      !component.includes("LocalFsdsContentColor")) issues.push("CONTENT COLOR: missing LocalFsdsContentColor");
  if (firstDefaultParam(component, name) !== "modifier: Modifier = Modifier") {
    issues.push("MODIFIER ORDER: modifier must be first optional");
  }
  return issues;
}

export function auditComposeCorpus() {
  if (!admitted.length) throw new Error("Compose component allowlist is empty or missing");
  const results = [];
  for (const name of admitted) {
    const paths = {
      tokens: join(COMPOSE_ROOT, name, `${name}Tokens.kt`),
      component: join(COMPOSE_ROOT, name, `${name}.kt`),
      rnTokens: join(RN_ROOT, name, `${name}.tokens.ts`),
      rnStyles: join(RN_ROOT, name, `${name}.styles.ts`),
    };
    const missing = Object.values(paths).filter(path => !existsSync(path));
    const issues = missing.length ? missing.map(path => `MISSING ${path}`) :
      (() => {
        const sources = Object.fromEntries(Object.entries(paths).map(([key, path]) =>
          [key, readFileSync(path, "utf8")]));
        const contractPath = join(CONTRACTS_ROOT, name, `${name}.contract.json`);
        const contract = existsSync(contractPath)
          ? JSON.parse(readFileSync(contractPath, "utf8"))
          : undefined;
        return [
          ...inspectComposeTokens({ name, ...sources }),
          ...(contract ? inspectComponentReferences({ name, contract, component: sources.component }) : []),
        ];
      })();
    results.push({ name, issues });
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const { name, issues } of auditComposeCorpus()) {
    if (issues.length) {
      failures += issues.length;
      issues.forEach(issue => console.error(`[compose-parity] ${name}: ${issue}`));
    } else console.log(`[compose-parity] OK ${name}: consumed definitions, shared identities, supported roles and API shape`);
  }
  console.log(`[compose-parity] ${admitted.length} allowlisted components; ${failures} failures.`);
  process.exitCode = failures ? 1 : 0;
}
