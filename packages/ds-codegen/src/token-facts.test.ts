/**
 * FEAT-MOBILE-IR-001 — typed token facts for non-DOM target-family projection.
 *
 * Proves the spec's acceptance criteria at the IR boundary:
 *  - A1: ComponentIR.tokenFacts exposes path/category/value/alias/provenance.
 *  - A2: the value a native consumer needs is read from typed facts, and is
 *        the SAME value the old CSS-string-mining hack would have produced.
 *  - A4: the projection branches only on token path/category/source — no
 *        component-name lore (asserted structurally below).
 *  - A5: Switch (collapsed native primitive) and Details (next C1 candidate)
 *        both expose typed token facts available to a native consumer,
 *        without asserting any final mobile rendering.
 *
 * Sidecar merge mirrors the CLI load order (contract + tokens + styles).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildComponentIR } from "./ir.js";
import type { ComponentContract } from "./contract.js";

const CONTRACTS_ROOT = resolve(__dirname, "../../ds-contracts");

function loadContract(name: string): ComponentContract {
  const folder = resolve(CONTRACTS_ROOT, "components", name);
  const contract = JSON.parse(
    readFileSync(resolve(folder, `${name}.contract.json`), "utf8"),
  ) as ComponentContract & { tokens?: unknown; styles?: unknown };
  const tokensPath = resolve(folder, `${name}.tokens.json`);
  if (existsSync(tokensPath)) {
    contract.tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
  }
  const stylesPath = resolve(folder, `${name}.styles.json`);
  if (existsSync(stylesPath)) {
    contract.styles = JSON.parse(readFileSync(stylesPath, "utf8"));
  }
  return contract;
}

describe("FEAT-MOBILE-IR-001: typed token facts (A1)", () => {
  it("exposes path, category, layer, value, alias, and provenance for a ref-backed token", () => {
    const ir = buildComponentIR(loadContract("Switch"));

    const fact = ir.tokenFacts.find(
      (t) => t.name === "switch.size.md.track.width",
    );
    expect(fact).toBeDefined();
    // path/name
    expect(fact!.name).toBe("switch.size.md.track.width");
    // category derived from PATH structure (segment after the slug), not name
    expect(fact!.category).toBe("size");
    // provenance: tier + source kind
    expect(fact!.layer).toBe("core");
    expect(fact!.source).toBe("tokens-sidecar");
    // semantic alias (resolvesTo) preserved
    expect(fact!.resolvesTo).toBe("core.spacing.size.09");
    // concrete value available — the fallback, no CSS parsing
    expect(fact!.rawValue).toBe("48px");
    expect(fact!.isLiteral).toBe(false);
    // typed cssVar exposed (the projection's bridge to the CSS layer)
    expect(fact!.cssVar).toBe("--fsds-switch-size-md-track-width");
  });

  it("marks literal tokens as literal and carries their raw value", () => {
    const ir = buildComponentIR(loadContract("Switch"));
    const literals = ir.tokenFacts.filter((t) => t.isLiteral);
    // Every literal fact must carry a value and no resolvesTo alias.
    for (const lit of literals) {
      expect(lit.rawValue).toBeDefined();
      expect(lit.resolvesTo).toBeUndefined();
    }

    // HARDENING (A3): assert the EXACT set of literal token names, not just
    // "the isLiteral-filtered facts look right." The previous loop is
    // tautological — a discriminator that mislabelled EVERY fact as literal
    // (or none) would still pass it (the filter and the assertion use the same
    // flag). Switch's sidecar declares exactly six literal slots: the
    // thumb-translate offsets for the three sizes. Pinning the set catches a
    // discriminator that drifts in either direction.
    const literalNames = literals.map((l) => l.name).sort();
    expect(literalNames).toEqual(
      [
        "switch.size.lg.thumb.translate.off",
        "switch.size.lg.thumb.translate.on",
        "switch.size.md.thumb.translate.off",
        "switch.size.md.thumb.translate.on",
        "switch.size.sm.thumb.translate.off",
        "switch.size.sm.thumb.translate.on",
      ].sort(),
    );
  });
});

describe("FEAT-MOBILE-IR-001: typed value matches the old CSS-mining result (A2 regression)", () => {
  // The retired findSizeToken/parsePxFallback hack read
  //   ir.cssBlocks[..].declarations["--fsds-switch-size-md-track-width"]
  // = "var(--fsds-core-spacing-size-09, 48px)" and regexed the px fallback.
  // Two tests below: (1) the typed rawValue matches the px the CSS carried
  // (no regression), and (2) the typed fact carries STRUCTURE the flattened
  // CSS string lost (dotted alias path, layer tier, ref/literal flag) — which
  // is what genuinely distinguishes the typed path from CSS-string mining.
  // NOTE: independence is NOT provable by stripping an input — cssBlocks and
  // tokenFacts are siblings off the same contract.tokens map, so no strip
  // removes the CSS string while keeping the typed value. The structural
  // assertion is the real falsification (proven to fail for a CSS-miner).
  it("typed rawValue equals the px fallback the CSS string carried", () => {
    const ir = buildComponentIR(loadContract("Switch"));

    // What the CSS string would have yielded (the regression oracle):
    const cssDecl = ir.cssBlocks
      .flatMap((b) => Object.entries(b.declarations))
      .find(([k]) => k === "--fsds-switch-size-md-track-width")?.[1];
    const cssPx = cssDecl?.match(/(\d+)px\)$/)?.[1];
    expect(cssPx).toBe("48"); // sanity: the CSS path still carries 48px

    // The typed fact yields the same number, from typed data:
    const fact = ir.tokenFacts.find(
      (t) => t.name === "switch.size.md.track.width",
    );
    expect(fact!.rawValue?.match(/^(\d+)/)?.[1]).toBe("48");
  });

  it("carries the structured fields that CSS-string mining cannot reconstruct", () => {
    // FALSIFICATION TEST (TEST-MOBILE-IR-FALSIFIABILITY-HARDEN-01 A2).
    //
    // CORRECTION over the original framing: you CANNOT prove CSS-independence
    // by stripping an input, because cssBlocks and tokenFacts are siblings —
    // both derive from the same `contract.tokens` map (renderTokenSlots and
    // buildTokenFacts respectively). No contract-level strip removes the CSS
    // string while keeping the typed value; stripping `styles` leaves the
    // token-driven var declaration intact (verified: cssBlocks still carries
    // `var(--fsds-core-spacing-size-09, 48px)`), so a CSS-miner would still
    // find "48px". The earlier "strip styles" test therefore had NO bite.
    //
    // What actually distinguishes typed facts from CSS-string mining is
    // STRUCTURE: the CSS declaration `var(--fsds-core-spacing-size-09, 48px)`
    // is lossy — a regex over it can recover the fallback px and (with effort)
    // the ref var name, but NOT the semantic alias path, the layer tier, or
    // the literal/ref discriminator as typed data. The typed fact carries all
    // of these. Asserting them is the real falsification: a projection that
    // mined the CSS string could not populate `resolvesTo`/`layer`/`isLiteral`
    // correctly without re-parsing structure the string already flattened.
    const ir = buildComponentIR(loadContract("Switch"));
    const fact = ir.tokenFacts.find(
      (t) => t.name === "switch.size.md.track.width",
    );
    expect(fact).toBeDefined();

    // The CSS string the old hack mined — for the equality oracle below.
    const cssDecl = ir.cssBlocks
      .flatMap((b) => Object.entries(b.declarations))
      .find(([k]) => k === "--fsds-switch-size-md-track-width")?.[1];

    // (a) The raw value matches what the CSS string carried (no regression).
    expect(fact!.rawValue).toBe("48px");
    expect(cssDecl).toContain("48px");

    // (b) The semantic alias path — present as a typed field, NOT recoverable
    // as structured data from the flattened CSS string. The CSS carries only
    // the *css-var name* `--fsds-core-spacing-size-09` (slug form); the dotted
    // token path `core.spacing.size.09` is gone. A CSS-miner cannot produce it
    // without inverting the slug transform.
    expect(fact!.resolvesTo).toBe("core.spacing.size.09");
    expect(cssDecl).not.toContain("core.spacing.size.09"); // dotted path absent

    // (c) The provenance tier as a typed enum. The CSS string mentions "core"
    // only inside the slugified var name (`--fsds-core-…`), never as a typed
    // layer field — a miner would have to heuristically parse the slug to
    // guess the tier. The typed fact states it directly.
    expect(fact!.layer).toBe("core");

    // (d) The ref/literal discriminator — typed boolean; the CSS string is a
    // `var(--ref, fallback)` either way and carries no such flag.
    expect(fact!.isLiteral).toBe(false);
  });
});

describe("FEAT-MOBILE-IR-001: no component-name lore in projection (A4)", () => {
  it("category is the path segment after the slug for every fact, never the component name", () => {
    for (const name of ["Switch", "Details"]) {
      const ir = buildComponentIR(loadContract(name));
      for (const fact of ir.tokenFacts) {
        const expectedCategory =
          fact.name.split(".").length > 1 ? fact.name.split(".")[1] : "root";
        expect(fact.category).toBe(expectedCategory);
        // category is never the component's own name
        expect(fact.category).not.toBe(ir.name.toLowerCase());
      }
    }
  });
});

describe("FEAT-MOBILE-IR-001: native availability for Switch + Details (A5)", () => {
  it("Switch projects the full expected fact count, not merely some facts", () => {
    // HARDENING (A4): `length > 0` would pass even if the projection emitted a
    // single fact and dropped the rest. Switch's sidecar declares 41
    // fact-projecting entries (35 ref-backed + 6 literal); pin the exact count
    // so a projection that silently drops slots is caught.
    const ir = buildComponentIR(loadContract("Switch"));
    expect(ir.tokenFacts.length).toBe(41);
    expect(ir.tokenFacts.filter((t) => t.isLiteral).length).toBe(6);
  });

  // Proves DATA AVAILABILITY for a native consumer — not final rendering.
  for (const name of ["Switch", "Details"]) {
    it(`${name} exposes non-empty, well-typed token facts`, () => {
      const ir = buildComponentIR(loadContract(name));
      expect(ir.tokenFacts.length).toBeGreaterThan(0);
      for (const fact of ir.tokenFacts) {
        expect(typeof fact.name).toBe("string");
        expect(fact.name.length).toBeGreaterThan(0);
        expect(typeof fact.category).toBe("string");
        expect(["core", "semantic", "brand", "density"]).toContain(fact.layer);
        expect(fact.source).toBe("tokens-sidecar");
        // ref-backed facts carry an alias; literal facts carry a value;
        // every fact carries at least one of them (never an empty fact).
        expect(fact.isLiteral ? fact.rawValue : fact.resolvesTo).toBeDefined();
      }
    });
  }
});
