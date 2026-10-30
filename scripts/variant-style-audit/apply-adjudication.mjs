/**
 * Stamp the ADJUDICATE-WEB-STYLE-REALIZATION-DEBT-01 adjudication onto the
 * inverse ledger. Each finding gets an `adjudication` from the four-way
 * vocabulary, the `evidence` the classification rests on, and the `remedy`
 * that would resolve it.
 *
 * Kept in-tree, and re-runnable, so the dispositions can be re-derived and
 * audited rather than trusted as hand-edits to a generated ledger. It fails
 * loud on any finding it has no rule for, so a newly censused row cannot
 * silently inherit an empty adjudication.
 *
 * `disposition` is deliberately untouched: that field stays the audit's own
 * stylingIntent heuristic, which is triage input and not a verdict.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const LEDGER = resolve(HERE, "known-unrealized.json");

/**
 * Keyed `Component.axis`, or `Component.axis.value` when one value in an axis
 * adjudicates differently from its peers. `only` narrows an axis rule to a
 * subset of its values. A row of another target surface (`target: "unity"`)
 * is keyed `<target>:Component.axis`: its evidence is about that target's
 * realization, so a web rule must never stamp it.
 */
const RULES = {
  "Checkbox.size": {
    adjudication: "visual-obligation",
    evidence:
      "No --sm/--md/--lg block and no per-value token in Checkbox.styles.json; a browser measures sm/md/lg as identical.",
    remedy: "Author per-size box-model and indicator dimensions.",
  },
  "ToggleSwitch.size": {
    adjudication: "visual-obligation",
    evidence:
      "No per-size block or token; small/medium/large render identically.",
    remedy: "Author per-size track and thumb dimensions.",
  },
  "Progress.size": {
    adjudication: "visual-obligation",
    evidence:
      "No per-size block or token; bar thickness is fixed across sm/md/lg.",
    remedy: "Author per-size track thickness.",
  },
  "NavTree.iconSize": {
    adjudication: "visual-obligation",
    evidence: "No per-size block; md and sm render the same glyph box.",
    remedy: "Author the md icon dimensions.",
  },
  "NavList.orientation": {
    adjudication: "visual-obligation",
    evidence:
      "The `list` part hard-codes flex-direction: column, so orientation=horizontal still renders a column. The nav-list--horizontal carrier is emitted and selected by nothing.",
    remedy:
      "Author .nav-list--horizontal .nav-list__list { flex-direction: row }.",
  },
  "Badge.variant": {
    adjudication: "visual-obligation",
    evidence:
      "counter and tag are painted; status is the unpainted peer of an otherwise painted vocabulary, so the axis does claim a visual distinction here.",
    remedy: "Author the --status block.",
    only: ["status"],
  },
  "Badge.variant.default": {
    adjudication: "stale-vocabulary",
    evidence:
      "The variant prop declares no default, so the audit treats no value as base-covered and flags the de-facto default. Unlike its painted peers counter/tag, `default` IS the base rule.",
    remedy: 'Declare "default": "default" on the variant prop. No styling owed.',
  },
  "Popover.placement": {
    adjudication: "structural-behavioral",
    evidence:
      "surface.positioning declares strategy=anchored, placementProp=placement, collision=flip-shift. Placement is resolved at runtime and applied as coordinates; under collision flipping a --top class would assert a side the runtime has already changed.",
    remedy:
      "None. A CSS modifier here would be actively wrong, not merely absent.",
  },
  "Tooltip.placement": {
    adjudication: "structural-behavioral",
    evidence:
      "Same anchored/flip-shift positioning declaration as Popover; the rendered side is runtime-resolved.",
    remedy: "None. A CSS modifier here would be actively wrong.",
  },
  "Walkthrough.placement": {
    adjudication: "structural-behavioral",
    evidence:
      "Same anchored/flip-shift positioning declaration; the rendered side is runtime-resolved.",
    remedy: "None. A CSS modifier here would be actively wrong.",
  },
  "List.as": {
    adjudication: "structural-behavioral",
    evidence:
      'Realized by the polymorphic root, not by CSS: the generated source reads `const As = as ?? "ul"` and renders `<Stack as={As}>`. The value changes the element.',
    remedy:
      "None for styling. The redundant list--<tag> carrier could be suppressed for polymorphic-tag axes.",
  },
  "Accordion.type": {
    adjudication: "structural-behavioral",
    evidence:
      "Selection cardinality (single vs multiple open panels), not appearance.",
    remedy: "None.",
  },
  "Calendar.mode": {
    adjudication: "structural-behavioral",
    evidence: "Selection semantics (single date vs range), not appearance.",
    remedy:
      "None for the axis carrier. Range selection may later owe in-range day styling, which is a state surface rather than this variant carrier.",
  },
  "OTP.mode": {
    adjudication: "structural-behavioral",
    evidence: "Drives the field inputmode/pattern — an input-method fact.",
    remedy: "None.",
  },
  "Tabs.activationMode": {
    adjudication: "structural-behavioral",
    evidence:
      "Keyboard activation semantics (automatic vs manual), not appearance.",
    remedy: "None.",
  },
  "Toast.politeness": {
    adjudication: "structural-behavioral",
    evidence:
      "Lowered to aria-live and bound in anatomy.dom — an assistive-technology fact with no visual counterpart.",
    remedy: "None.",
  },
  "Chip.variant": {
    adjudication: "stale-vocabulary",
    evidence:
      "The variant prop declares no default, so the de-facto default is flagged. selected and dismissible are painted; `default` IS the base rule.",
    remedy: 'Declare "default": "default" on the variant prop. No styling owed.',
  },
  "Divider.orientation": {
    adjudication: "stale-vocabulary",
    evidence:
      "The orientation prop declares no default. --vertical is painted; horizontal is the base <hr> rule.",
    remedy: 'Declare "default": "horizontal" on the orientation prop.',
  },
  "Postcard.type": {
    adjudication: "unresolved-contract-semantics",
    evidence:
      "image/video/audio name distinct media kinds, but the contract renders no per-kind element and authors no per-kind chrome. Nothing in the contract says whether the axis owes a different element, different styling, or neither.",
    remedy:
      "Decide what type means before painting it — per-kind media element (structural) or per-kind chrome (visual). Retire the axis if neither.",
  },
  "Progress.variant": {
    adjudication: "unresolved-contract-semantics",
    evidence:
      "circular cannot be delivered by a modifier class over the linear anatomy; it needs a different subtree (an SVG arc). The carrier is emitted, so the axis claims a distinction the current anatomy cannot express.",
    remedy:
      "Either give Progress a per-variant anatomy (a contract change, and the honest fix) or retire circular.",
  },
  "unity:Accordion.type": {
    adjudication: "structural-behavioral",
    evidence:
      "The generated Type attribute toggles the carrier and sets ItemGroup.SelectionType (single vs multiple open panels); selection cardinality, not appearance.",
    remedy: "None.",
  },
  "unity:Popover.placement": {
    adjudication: "structural-behavioral",
    evidence:
      "The generated Placement attribute toggles the carrier and sets AnchoredSurface.Placement, which positions the floating content at runtime; the contract declares no styles keyed on a placement value, so Controls.uss has nothing to select.",
    remedy: "None. A USS modifier would assert a side the runtime positioning owns.",
  },
  "unity:Tabs.activationMode": {
    adjudication: "structural-behavioral",
    evidence:
      "The generated ActivationMode attribute toggles the carrier and sets ItemGroup.ActivationMode (keyboard activation semantics); not appearance.",
    remedy: "None.",
  },
  "Select.position": {
    adjudication: "unresolved-contract-semantics",
    evidence:
      'The string "position" occurs exactly once in Select\'s contract — the axis declaration itself. No prop binding, no surface.positioning block, no style block. Unlike the anchored family, Select declares no positioning for a runtime to consume.',
    remedy:
      "Either declare surface.positioning so the listbox side is runtime-resolved (matching Popover/Tooltip/Walkthrough) or retire the axis.",
  },
};

const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));

let stamped = 0;
for (const gap of ledger.gaps) {
  const key = `${gap.target ? `${gap.target}:` : ""}${gap.component}.${gap.axis}`;
  const byValue = RULES[`${key}.${gap.value}`];
  const byAxis = RULES[key];
  const rule =
    byValue ??
    (byAxis && (!byAxis.only || byAxis.only.includes(gap.value))
      ? byAxis
      : undefined);
  if (!rule) {
    throw new Error(
      `apply-adjudication: no rule for ${key}=${gap.value}. ` +
        `A newly censused finding must be adjudicated, not left blank.`,
    );
  }
  gap.adjudication = rule.adjudication;
  gap.evidence = rule.evidence;
  gap.remedy = rule.remedy;
  // The ratchet requires `note`; keep it as the one-line human summary so a
  // reader of the raw ledger sees the verdict without joining three fields.
  gap.note = `${rule.adjudication} — ${rule.evidence} Remedy: ${rule.remedy}`;
  stamped += 1;
}

writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);

const counts = {};
for (const gap of ledger.gaps) {
  counts[gap.adjudication] = (counts[gap.adjudication] ?? 0) + 1;
}
console.log(`stamped ${stamped} finding(s)`);
console.log(counts);
