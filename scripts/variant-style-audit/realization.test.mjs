#!/usr/bin/env node
/**
 * VARIANT-STYLE-REALIZATION-AUDIT-01 — locked discriminator test.
 *
 * Locks the audit's classification on REAL contracts/CSS:
 *   - Batch 1 (VARIANT-STYLE-VAR-RESCOPE-BATCH-01) realized Spinner.thickness,
 *     Stat.trend, Select.size; Batch 2 (VARIANT-STYLE-SIZE-INTENT-BATCH-02)
 *     realized Spinner.size, Avatar.size, Stat.size and Progress.intent via
 *     per-value tokens — all now fully realized (regression lock for the fixes);
 *   - Spinner.variant (the ring/dots/bars overclaim) was REMOVED by
 *     SPINNER-VARIANT-CONTRACT-DECISION-01 — the anatomy only ever rendered a
 *     ring, so the prop/type/values were dropped; it is no longer a tracked axis
 *     while Spinner.size + Spinner.thickness stay realized;
 *   - a fully-realized component (Button: `.button--primary` etc. scope vars in
 *     tokens.css) is NOT flagged (false-positive control);
 *   - a behavioral axis (Calendar `mode`, NavList `orientation`) has no styling
 *     intent and is NOT flagged (behavioral false-positive control).
 *
 * VARIANT-CLASS-NAMESPACE-COLLISION-01 also locks here:
 *   - collision detection: List's variant/marker/spacing/size axes are tainted
 *     (size × spacing share sm/md/lg — the locked fixture); Image's size/radius
 *     are tainted; `as` (and clean components) are not;
 *   - namespaced emission across react/vue/svelte/angular/lit: colliding axes
 *     emit `.<prefix>--<axis>-<value>` and never the bare ambiguous form, while
 *     the non-colliding `as` keeps `.list--<as>`.
 *
 * VARIANT-STYLE-LIST-IMAGE-REALIZATION-01 locks the visual realization:
 *   - List.{size,spacing,marker,variant} + Image.{size,radius} are realized
 *     THROUGH the namespaced selectors (tainted axes, no gaps), positively
 *     exercising the namespaced-realization detection path; the generated CSS
 *     contains `.<prefix>--<axis>-<value>` rules and no bare ambiguous rule.
 *
 * UNITY-STYLING-PROJECTION-01 (S8) locks the unity surface: the census is the
 * fsds.targets.json unity allowlist checked against the generated Controls.uss,
 * default-aware, boundary-safe, independent of the React CSS, and keyed apart
 * from the web rows.
 *
 * Standalone (named *.test.mjs → exempt from the shortcut-language guard).
 * Run: node scripts/variant-style-audit/realization.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classify, gapRowsOf, unityAllowlist, unitySurface, unrealizedId, UNITY_TARGET } from "./audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const readGen = (p) => readFileSync(resolve(REPO, p), "utf8");

let pass = 0;
let fail = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
    pass++;
  } catch (e) {
    console.error(`  XX  ${name}: ${e.message}`);
    fail++;
  }
};
const dim = (c, d) => classify(c).dims.find((x) => x.dim === d);

console.log("Batch 1 + Batch 2 — per-value-token axes now fully realized:");
for (const [c, d] of [
  ["Spinner", "thickness"], ["Stat", "trend"], ["Select", "size"],
  ["Spinner", "size"], ["Avatar", "size"], ["Stat", "size"], ["Progress", "intent"],
]) {
  check(`${c}.${d} is fully realized (styling axis, no gaps)`, () => {
    const x = dim(c, d);
    assert.ok(x, `no ${c}.${d} axis`);
    assert.equal(x.stylingIntent, true, `expected styling intent for ${c}.${d}`);
    assert.equal(x.gaps.length, 0, `unexpected gaps: ${JSON.stringify(x.gaps)}`);
    // realizedCount can be total-1 when the axis has a declared default that the
    // base rule realizes (e.g. Stat.size default=md), so assert >=1, not ==total.
    assert.ok(x.realizedCount >= 1, `expected >=1 consuming selector, got ${x.realizedCount}`);
  });
}

console.log("\nVARIANT-STYLE-LIST-IMAGE-REALIZATION-01 — List/Image visual axes realized via the NAMESPACED selectors (A4):");
// tainted=true means the audit only counts `.<prefix>--<axis>-<value>` as realizing,
// so realizedCount>=1 here proves the namespaced-realization detection path fired.
for (const [c, d, minRealized] of [
  ["List", "size", 3], ["List", "spacing", 4], ["List", "marker", 7], ["List", "variant", 4],
  ["Image", "size", 6], ["Image", "radius", 5],
]) {
  check(`${c}.${d} is realized through namespaced selectors (tainted, no gaps)`, () => {
    const x = dim(c, d);
    assert.ok(x, `no ${c}.${d} axis`);
    assert.equal(x.tainted, true, `${c}.${d} should be a tainted (collision) axis`);
    assert.equal(x.gaps.length, 0, `unexpected gaps: ${JSON.stringify(x.gaps)}`);
    assert.ok(
      x.realizedCount >= minRealized,
      `${c}.${d} realizedCount=${x.realizedCount} (expected >=${minRealized} via namespaced selectors)`,
    );
    assert.ok(x.ambiguousRealizations === undefined, `${c}.${d} must not realize via the bare ambiguous form`);
  });
}

console.log("\nrealizing selectors are the NAMESPACED form in the generated CSS, never the bare ambiguous form (A3):");
check("List.css/Image.css contain `.<prefix>--<axis>-<value>` and no bare colliding-axis rule", () => {
  const listCss = readGen("packages/ds-react/src/components/List/List.css");
  const imageCss = readGen("packages/ds-react/src/components/Image/Image.css");
  for (const sel of [".list--size-sm", ".list--spacing-md", ".list--marker-disc", ".list--variant-divided"]) {
    assert.ok(listCss.includes(sel), `List.css missing namespaced selector ${sel}`);
  }
  for (const sel of [".image--size-md", ".image--radius-lg"]) {
    assert.ok(imageCss.includes(sel), `Image.css missing namespaced selector ${sel}`);
  }
  // bare ambiguous colliding-axis rules must not exist (boundary-safe)
  const bareList = /\.list--(sm|md|lg|none|disc|circle|square|decimal|alpha|roman|inline|divided|spaced|unstyled)(?![A-Za-z0-9_-])/;
  const bareImage = /\.image--(xs|sm|md|lg|xl|full|none)(?![A-Za-z0-9_-])/;
  assert.ok(!bareList.test(listCss), "List.css authored a bare ambiguous colliding-axis selector");
  assert.ok(!bareImage.test(imageCss), "Image.css authored a bare ambiguous colliding-axis selector");
});

console.log("\nSPINNER-VARIANT-CONTRACT-DECISION-01 — the dots/bars overclaim is removed (variant is no longer a tracked axis):");
check("Spinner.variant no longer exists as a variant axis", () => {
  assert.equal(dim("Spinner", "variant"), undefined, "Spinner.variant should be removed from the contract (constrained to the single ring morphology)");
});
check("Spinner keeps its realized size + thickness axes (no regression from the variant removal)", () => {
  const size = dim("Spinner", "size");
  const thickness = dim("Spinner", "thickness");
  assert.ok(size && size.realizedCount >= 1 && size.gaps.length === 0, "Spinner.size regressed");
  assert.ok(thickness && thickness.realizedCount >= 1 && thickness.gaps.length === 0, "Spinner.thickness regressed");
});

console.log("\nfalse-positive control — a fully-realized component is NOT flagged:");
check("Button has no realization gaps (variants scope vars in tokens.css)", () => {
  const gaps = classify("Button").dims.flatMap((d) => d.gaps);
  assert.deepEqual(gaps, [], `Button unexpectedly flagged: ${JSON.stringify(gaps)}`);
});

// RAIL-WEB-STYLE-CARRIER-REACHABILITY-01 replaced these three cases. They used
// to assert that a behavioral axis has no styling intent and is therefore NOT
// censused — the admission rule that made Checkbox.size, Progress.size/variant
// and ToggleSwitch.size invisible to this gate while a browser measured them as
// dead knobs. Styling intent cannot decide whether a finding EXISTS, because
// the artifact it looks for is exactly what is missing when nobody authored the
// styling. It is now a disposition.
//
// Calendar.mode is the case that shows the old predicate was never even
// self-consistent: it asserted `stylingIntent === false` for a behavioral axis
// and had been RED on `main` before this slice, because Calendar's tokens
// happen to carry a `range` segment. A discriminator that misfires on its own
// canonical example is not one a gate should have been admitting on.
console.log("\nbehavioral axes are CENSUSED with a disposition, not excluded:");
for (const [c, d] of [["Calendar", "mode"], ["NavList", "orientation"], ["OTP", "mode"]]) {
  check(`${c}.${d} non-default values are censused and carry a disposition`, () => {
    const x = dim(c, d);
    assert.ok(x, `no ${c}.${d} axis`);
    assert.ok(
      x.gaps.length > 0,
      `${c}.${d} has unrealized non-default values; the census must record them so triage can adjudicate them as non-visual`,
    );
    for (const row of x.values) {
      assert.ok(
        row.disposition === "styling-intent" || row.disposition === "no-styling-intent",
        `${c}.${d}=${row.value} must carry a disposition for triage`,
      );
    }
  });
}

check("the axis DEFAULT is never a gap — the base rule realizes it", () => {
  // The one false-positive control that survives: dropping it would flood the
  // ledger with every default value in the corpus.
  const x = dim("NavList", "orientation");
  assert.equal(x.default, "vertical");
  assert.ok(!x.gaps.includes("vertical"), "the default must not be censused as a gap");
});

console.log("\nVARIANT-CLASS-NAMESPACE-COLLISION-01 — collision detection (A1):");
check("List: size × spacing collide on sm/md/lg (locked fixture); variant/marker/spacing/size tainted, as clean", () => {
  const L = classify("List");
  assert.deepEqual(L.taintedAxes, ["marker", "size", "spacing", "variant"], `taintedAxes=${JSON.stringify(L.taintedAxes)}`);
  for (const v of ["sm", "md", "lg"]) {
    const col = L.collisions.find((c) => c.value === v);
    assert.ok(col, `no collision recorded for List value '${v}'`);
    assert.deepEqual(col.axes, ["size", "spacing"], `'${v}' collision axes=${JSON.stringify(col?.axes)}`);
  }
  // the wider collision web is also detected
  assert.deepEqual(L.collisions.find((c) => c.value === "default")?.axes, ["marker", "variant"]);
  assert.deepEqual(L.collisions.find((c) => c.value === "none")?.axes, ["marker", "spacing"]);
});
check("Image: size × radius tainted (second proof case, proves generality not List-lore)", () => {
  const I = classify("Image");
  assert.deepEqual(I.taintedAxes, ["radius", "size"], `taintedAxes=${JSON.stringify(I.taintedAxes)}`);
});
check("a clean component (Button) reports zero collisions / no tainted axes", () => {
  const B = classify("Button");
  assert.equal(B.collisions.length, 0, `Button collisions=${JSON.stringify(B.collisions)}`);
  assert.deepEqual(B.taintedAxes, []);
});

console.log("\nVARIANT-CLASS-NAMESPACE-COLLISION-01 — namespaced emission across frameworks (A2/A4):");
// accessor shape per framework for a bare colliding-axis class literal `prefix--${<acc>}`
const ACC = {
  react: (a) => a,
  vue: (a) => `props.${a}`,
  svelte: (a) => a,
  angular: (a) => `this.${a}`,
  lit: (a) => `this.${a}`,
};
const FILE = {
  react: (n) => `packages/ds-react/src/components/${n}/${n}.tsx`,
  vue: (n) => `packages/ds-vue/src/components/${n}/${n}.vue`,
  svelte: (n) => `packages/ds-svelte/src/components/${n}/${n}.svelte`,
  angular: (n) => `packages/ds-angular/src/components/${n}/${n}.component.ts`,
  lit: (n) => `packages/ds-lit/src/components/${n}/${n}.ts`,
};
// component → { prefix, colliding axes, clean axes }
const CASES = [
  { name: "List", prefix: "list", colliding: ["variant", "marker", "spacing", "size"], clean: ["as"] },
  { name: "Image", prefix: "image", colliding: ["radius", "size"], clean: [] },
];
for (const fw of ["react", "vue", "svelte", "angular", "lit"]) {
  for (const cse of CASES) {
    check(`${fw}: ${cse.name} colliding axes emit \`${cse.prefix}--<axis>-\` and never the bare ambiguous form`, () => {
      const src = readGen(FILE[fw](cse.name));
      for (const axis of cse.colliding) {
        assert.ok(
          src.includes(`${cse.prefix}--${axis}-`),
          `${fw} ${cse.name}: missing namespaced class \`${cse.prefix}--${axis}-\``,
        );
        const bare = `${cse.prefix}--\${${ACC[fw](axis)}}`;
        assert.ok(
          !src.includes(bare),
          `${fw} ${cse.name}: still emits ambiguous bare class \`${bare}\``,
        );
      }
      for (const axis of cse.clean) {
        const bare = `${cse.prefix}--\${${ACC[fw](axis)}}`;
        assert.ok(src.includes(bare), `${fw} ${cse.name}: clean axis '${axis}' should stay bare \`${bare}\``);
        assert.ok(
          !src.includes(`${cse.prefix}--${axis}-`),
          `${fw} ${cse.name}: clean axis '${axis}' was unnecessarily namespaced`,
        );
      }
    });
  }
}

console.log("\nUNITY-STYLING-PROJECTION-01 — the unity surface (S8):");
const unitySize = (css) => classify("Switch", { target: UNITY_TARGET, css }).dims.find((d) => d.dim === "size");
check("the unity census is exactly the fsds.targets.json unity allowlist", () => {
  const registry = JSON.parse(readGen("fsds.targets.json"));
  assert.deepEqual(unityAllowlist(), registry.targets.find((t) => t.id === "unity").components);
  assert.deepEqual(unityAllowlist({ targets: [{ id: "react" }] }), [], "no unity target means no unity census");
});
check("Switch.size is realized in the generated Controls.uss: sm and lg carriers are selected, md is the default", () => {
  const x = unitySize(unitySurface().css);
  assert.equal(x.default, "md");
  assert.deepEqual(x.values.map((v) => [v.value, v.realized, v.gap]), [["sm", true, false], ["md", true, false], ["lg", true, false]]);
  assert.ok(x.values.every((v) => v.carrierProduced === undefined), "the web DOM carrier set is not a unity fact");
});
check("an empty unity sheet realizes nothing: every non-default value is a gap and the default never is", () => {
  assert.deepEqual(unitySize("").gaps, ["sm", "lg"]);
});
check("the unity carrier match is boundary-safe (.switch--small and .switch--lg-x realize nothing)", () => {
  assert.deepEqual(unitySize(".switch--small { }\n.switch--lg-x { }").gaps, ["sm", "lg"]);
});
check("a React realization never clears a unity gap: the unity surface reads only its own sheet", () => {
  assert.deepEqual(dim("Switch", "size").gaps, [], "Switch.size is realized in the React CSS");
  assert.deepEqual(unitySize("").gaps, ["sm", "lg"]);
});
check("unity gap rows carry target and a ledger identity distinct from the web row of the same value", () => {
  const rows = gapRowsOf([classify("Switch", { target: UNITY_TARGET, css: "" })]);
  assert.deepEqual(rows.map((r) => [r.target, unrealizedId(r)]), [["unity", "unity:Switch.size=sm"], ["unity", "unity:Switch.size=lg"]]);
  assert.equal(unrealizedId({ component: "Switch", axis: "size", value: "sm" }), "Switch.size=sm");
});

console.log(`\nlocked test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
