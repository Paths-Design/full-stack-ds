/**
 * The erasure-plan authority: one walk emits both the coordinate and where it
 * lives, and the quotient executes rather than re-interprets.
 *
 * Every test here is about the SEPARATION, not about any coordinate's standing.
 * The four objects the system used to conflate — proposition, locator,
 * operation, footprint — are checked as four, because identifying any two of
 * them is how this experiment produced eleven un-erasable coordinates and a
 * dependency set under-reported by more than half.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadCensus, loadDerivation, loadLocators, loadPlans, type Coordinate } from "./census.js";
import { derivedRunAfter, executeAll, executePlan, orderPlans, wouldChange, type ErasurePlan, type ForgetOperation } from "./erasure-plan.js";
import { forgetBranchField, loadClosures } from "./closure.js";
import { specimens } from "./erasure-audit.js";
import { FIXTURES_DIR, checkIsolation, loadOracle, resolveSide } from "./necessity.js";
import { canonical, CONFLUENCE_BOUND, declaredNonCommuting, distinctListingImages, erase, planFor } from "./quotient.js";
import { isMarker } from "./quotient-image.js";
import { parseFixtures, type Fixture } from "./structure.js";

const census = loadCensus();
const plans = loadPlans();
const fixtures = parseFixtures(fs.readFileSync(`${FIXTURES_DIR}/fixtures.jsonl`, "utf-8"));
const byId = new Map(census.map((c) => [c.id, c]));

/**
 * Every terminal path present in a fixture, so an ADDED key is detectable.
 *
 * A MARKER IS A TERMINAL. A hole replaces a value at a path that already
 * existed; its `@q` and `by` keys are the erasure's own bookkeeping, not
 * declarations the fixture acquired. Descending into them would report 1521
 * "added paths" for an operation that added no facts, and the invariant this
 * guard exists for — forgetting may destroy, never create — would be drowned by
 * its own instrument. What it still catches, unchanged, is the real defect: an
 * erasure writing a slot into existence, which is how incidence erasure once
 * added `along` to 76 fixtures that never declared it.
 */
function paths(node: unknown, at = "", out = new Set<string>()): Set<string> {
  if (node === null || typeof node !== "object" || isMarker(node)) {
    out.add(at);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => paths(v, `${at}[${i}]`, out));
    return out;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) paths(v, `${at}.${k}`, out);
  return out;
}

describe("plan registry — one walk owns identity and location", () => {
  it("gives every coordinate a locator and every non-reference coordinate exactly one plan", () => {
    const locators = loadLocators();
    for (const c of census) expect(locators.has(c.id), `${c.id} has no locator`).toBe(true);
    const withoutPlan = census.filter((c) => !plans.has(c.id));
    expect([...new Set(withoutPlan.map((c) => c.kind))]).toEqual(["reference"]);
    expect(plans.size).toBe(census.length - withoutPlan.length);
  });

  it("keys locators by leaf as well, because coordinates sharing a leaf share a slot", () => {
    const locators = loadLocators();
    const leafOf = new Map<string, Coordinate[]>();
    for (const c of census) leafOf.set(c.leaf, [...(leafOf.get(c.leaf) ?? []), c]);
    for (const [leaf, cs] of leafOf) {
      const base = locators.get(leaf);
      expect(base, `no locator for leaf ${leaf}`).toBeDefined();
      // Every coordinate on that leaf must resolve to the same steps — a
      // divergence here would mean the census placed two propositions about one
      // slot in two different places.
      for (const c of cs) expect(JSON.stringify(locators.get(c.id)!.steps)).toBe(JSON.stringify(base!.steps));
    }
  });

  it("names one operation per coordinate kind, from a closed vocabulary", () => {
    const seen = new Map<Coordinate["kind"], Set<ForgetOperation["kind"]>>();
    for (const c of census) {
      const p = plans.get(c.id);
      if (!p) continue;
      seen.set(c.kind, (seen.get(c.kind) ?? new Set()).add(p.operation.kind));
    }
    expect(seen.get("member-pair")).toEqual(new Set(["merge-enum-members"]));
    expect(seen.get("member-absence")).toEqual(new Set(["spell-member-as-absent"]));
    expect(seen.get("reference-topology")).toEqual(
      new Set(["forget-reference-arity", "forget-reference-order", "forget-reference-incidence"]),
    );
    expect(seen.get("leaf")).toEqual(new Set(["forget-value", "delete-slot", "delete-holder"]));
  });

  it("chooses a leaf's operation from the SCHEMA: required leaves are holed, optional ones deleted", () => {
    // Asserted as the rule rather than as the eight names that satisfy it
    // today. A ninth required leaf added to the model must be holed too, and a
    // list of names would let it be deleted while the test still passed.
    const { requiredLeaves } = loadDerivation();
    const leaves = census.filter((c) => c.kind === "leaf" && !c.id.endsWith("#present"));
    expect(leaves.length).toBeGreaterThan(20);
    for (const c of leaves) {
      const op = plans.get(c.id)!.operation.kind;
      // A required leaf has no absent state to identify, and deleting it leaves
      // a declaration missing something it must have.
      if (requiredLeaves.has(c.leaf)) expect(op, `${c.id} is required`).toBe("forget-value");
      // An optional leaf CAN say nothing, and "says nothing" is one of the
      // states its erasure has to identify — which deletion does, and a hole
      // would not.
      else expect(op, `${c.id} is optional`).toBe("delete-slot");
    }
  });

  it("distinguishes forgetting a holder from forgetting a value, because their footprints differ", () => {
    expect(plans.get("relation.derivedBy#present")!.operation.kind).toBe("delete-holder");
    // Required within the join branch, so a hole rather than a deletion: the
    // join declaration cannot be missing its cardinality and still be a join.
    expect(plans.get("relation.derivedBy.join.cardinality")!.operation.kind).toBe("forget-value");
    // Optional on a field, so deletion: absence is one of the states it can be in.
    expect(plans.get("field.cyclic")!.operation.kind).toBe("delete-slot");
  });
});

describe("execution — forgetting may destroy, never create", () => {
  it("never declares a slot that was not already declared, for any plan", () => {
    // Stated over SLOTS rather than terminal paths, because a hole legitimately
    // moves a terminal upward: `grain: ["k"]` has the terminal `.grain[0]`, and
    // holing it makes `.grain` itself terminal. That is the hole replacing a
    // subtree that was there, not the fixture acquiring a declaration.
    //
    // So a path that appears is an offender only when it is not a PREFIX of one
    // that existed — which is exactly "something is now declared where nothing
    // was". The real defect this guards is untouched: incidence erasure once
    // wrote `along` into 76 fixtures that never declared it, and `.…along` is a
    // prefix of nothing in those fixtures.
    const declaredBefore = (before: Set<string>, x: string) =>
      before.has(x) || [...before].some((b) => b.startsWith(x) && (b[x.length] === "." || b[x.length] === "["));

    const offenders: string[] = [];
    for (const f of fixtures) {
      const before = paths(f);
      for (const p of plans.values()) {
        const added = [...paths(executePlan(f, p))].filter((x) => !declaredBefore(before, x));
        if (added.length > 0) offenders.push(`${p.id} added ${added.slice(0, 3).join(", ")} to ${f.id}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("and that guard can still fail: a plan that writes an undeclared slot is caught", () => {
    // The falsifier for the rule above, because a prefix test is exactly the
    // kind of loosening that can quietly stop catching anything. `along` is
    // optional on an aggregate assertion, so a fixture that omits it has no
    // path under it for a write to be a prefix of.
    const fixture = {
      id: "FX_T",
      structure: { relations: { r: { grain: ["k"], fields: { k: { transformation: "nominal", key: true } } } } },
      assertions: [{ kind: "aggregate", relation: "r", field: "k", op: "sum" }],
    } as unknown as Fixture;
    const before = paths(fixture);
    const written = JSON.parse(JSON.stringify(fixture)) as { assertions: Record<string, unknown>[] };
    written.assertions[0].along = ["k"];
    const declaredBefore = (x: string) => before.has(x) || [...before].some((b) => b.startsWith(x) && (b[x.length] === "." || b[x.length] === "["));
    expect([...paths(written)].filter((x) => !declaredBefore(x))).toEqual([".assertions[0].along[0]"]);
  });

  it("reaches the sugar spelling of an observation as well as the record spelling", () => {
    const fixture = {
      id: "FX_T",
      structure: { relations: { r: { grain: ["k"], fields: { v: { transformation: "ratio" } } } } },
      assertions: [{ kind: "aggregate", relation: "r", field: "v", op: "sum" }],
      evidence: { rows: { r: [{ v: 3 }, { v: { value: 4, unit: "kg" } }] } },
    } as unknown as Fixture;
    const after = executePlan(fixture, plans.get("observation.value")!) as unknown as Record<string, any>;
    // The bare scalar IS the value, so the whole observation goes; the record
    // form keeps its unit.
    expect(after.evidence.rows.r).toEqual([{}, { v: { unit: "kg" } }]);
  });

  it("guards `field.whole` to its scalar spelling so it cannot subsume `field.whole.perRow`", () => {
    const withRecord = {
      id: "FX_T",
      structure: { relations: { r: { grain: ["k"], fields: { v: { transformation: "ratio", whole: { perRow: "k" } } } } } },
      assertions: [{ kind: "aggregate", relation: "r", field: "v", op: "sum" }],
    } as unknown as Fixture;
    const scalar = JSON.parse(JSON.stringify(withRecord)) as Record<string, any>;
    scalar.structure.relations.r.fields.v.whole = "fixed";

    const wholePlan = plans.get("field.whole")!;
    expect((executePlan(withRecord, wholePlan) as unknown as Record<string, any>).structure.relations.r.fields.v.whole).toEqual({
      perRow: "k",
    });
    expect((executePlan(scalar as unknown as Fixture, wholePlan) as unknown as Record<string, any>).structure.relations.r.fields.v.whole).toBeUndefined();
  });

  it("leaves `relation.grain` UNguarded, because its other spelling carries no coordinate of its own", () => {
    // The scalar guard is not a special case for `whole`; it exists exactly
    // where the object branch contributes coordinates. `grain`'s array branch
    // collapses to the same id, so a guard would make the list form
    // un-erasable — which is the shape every corpus fixture actually uses.
    const steps = plans.get("relation.grain")!.locator.steps;
    expect(steps.some((s) => s.kind === "scalar-only")).toBe(false);
    const reached = fixtures.filter((f) => canonical(erase(f, byId.get("relation.grain")!)) !== canonical(f));
    expect(reached.length).toBeGreaterThan(0);
  });
});

describe("composition — the ordering is derived, and the laws hold", () => {
  const corpusPlans = [...plans.values()];

  it("is idempotent: erasing the same plan twice equals erasing it once", () => {
    const offenders: string[] = [];
    for (const p of corpusPlans) {
      for (const f of fixtures) {
        const once = executePlan(f, p);
        if (canonical(executePlan(once, p)) !== canonical(once)) offenders.push(`${p.id} on ${f.id}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("subsumes: erasing a holder makes every erasure beneath it a no-op", () => {
    const holder = plans.get("relation.derivedBy#present")!;
    const beneath = corpusPlans.filter((p) => p.id.startsWith("relation.derivedBy.") && p.id !== holder.id);
    expect(beneath.length).toBeGreaterThan(20);
    for (const f of fixtures) {
      const gone = executePlan(f, holder);
      for (const p of beneath) expect(canonical(executePlan(gone, p)), `${p.id} still acts after the holder is gone`).toBe(canonical(gone));
    }
  });

  it("orders a discriminator's plans after everything that branches on it", () => {
    const kind = plans.get("relation.derivedBy.kind")!;
    const merge = plans.get("relation.derivedBy.kind:join~nest")!;
    for (const p of [kind, merge]) {
      expect(p.runAfter, `${p.id} carries no ordering edges`).toBeDefined();
      expect(p.runAfter).toContain("relation.derivedBy.join.cardinality");
      expect(p.runAfter).toContain("relation.derivedBy.nest.levels#arity");
      // Its own plans are not among its predecessors, or the sort would cycle.
      expect(p.runAfter).not.toContain(kind.id);
    }
    const ordered = orderPlans([kind, plans.get("relation.derivedBy.join.cardinality")!]).map((p) => p.id);
    expect(ordered).toEqual(["relation.derivedBy.join.cardinality", "relation.derivedBy.kind"]);
  });

  it("the ordering is not cosmetic: the two orders genuinely disagree", () => {
    // The rank this replaces gave a discriminator MERGE and a branch-qualified
    // facet the same rank, so listing order decided the result. Merging
    // `aggregate-to-grain~join` first relabels the branch out from under the
    // second locator.
    // `join.from#incidence` used to be the example. It is a BOUND reference now,
    // and on every committed join fixture the operand already IS the structure's
    // first relation, so rebinding it is the identity and the two listings agree.
    // `nest.levels#incidence` on the flattening fixture is not the identity --
    // `sale_id` is declared before `country` -- so the relabelling still moves
    // the ground out from under the second locator.
    const merge = plans.get("relation.derivedBy.kind:nest~bin")!;
    const facet = plans.get("relation.derivedBy.nest.levels#incidence")!;
    const target = fixtures.find((f) => f.id === "FX_PROJECT_DROPS_NEST_LEVEL")!;
    const derived = canonical(executePlan(executePlan(target, facet), merge));
    const reversed = canonical(executePlan(executePlan(target, merge), facet));
    expect(derived).not.toBe(reversed);
    expect(orderPlans([merge, facet]).map((p) => p.id)).toEqual([facet.id, merge.id]);
  });

  it("commutes where no ordering edge exists, over a spread of representative plans", () => {
    const sample = [
      "field.transformation",
      "field.key",
      "field.temporality#present",
      "field.temporality.grain",
      "field.additivity.kind",
      "relation.grain",
      "relation.derivedBy.join.cardinality",
      "relation.derivedBy.nest.levels#arity",
      "structure.peers#present",
      "assertion.aggregate.op",
      "assertion.aggregate.along#incidence",
      "assertion.aggregate.nulls",
      "observation.value",
      "observation.null",
      "evidence.rows.*#present",
    ].map((id) => plans.get(id)!);
    expect(sample.every(Boolean)).toBe(true);
    const offenders: string[] = [];
    for (let i = 0; i < sample.length; i++) {
      for (let j = i + 1; j < sample.length; j++) {
        const [p, q] = [sample[i], sample[j]];
        if ((p.runAfter ?? []).includes(q.id) || (q.runAfter ?? []).includes(p.id)) continue;
        for (const f of fixtures) {
          if (canonical(executePlan(executePlan(f, p), q)) !== canonical(executePlan(executePlan(f, q), p))) {
            offenders.push(`${p.id} / ${q.id} on ${f.id}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("refusals stay falsifiable", () => {
  const absence = (leaf: string, member: string): Coordinate => ({
    id: `${leaf}:${member}~<absent>`,
    kind: "member-absence",
    leaf,
    members: [member, "<absent>"],
    role: "schema",
  });

  it("synthesizes a plan for a coordinate the census refuses, so the refusal can be demonstrated", () => {
    const c = absence("relation.derivedBy.kind", "project");
    expect(census.some((x) => x.id === c.id)).toBe(false);
    const p = planFor(c)!;
    expect(p.operation).toEqual({ kind: "delete-tagged-holder", member: "project" });
    expect(p.locator.path).toBe("structure.relations.*.derivedBy");
  });

  it("spells absence of a REQUIRED leaf as absence of its whole declaration, not of the tag", () => {
    const fixture = {
      id: "FX_T",
      structure: {
        relations: {
          r: { grain: ["k"], fields: { v: { transformation: "ratio", temporality: { kind: "instant", grain: "day" } } } },
        },
      },
      assertions: [{ kind: "aggregate", relation: "r", field: "v", op: "sum" }],
    } as unknown as Fixture;
    const after = erase(fixture, absence("field.temporality.kind", "instant")) as unknown as Record<string, any>;
    // Not `{ grain: "day" }`, which the schema rejects: the whole declaration goes.
    expect(after.structure.relations.r.fields.v.temporality).toBeUndefined();
  });

  it("throws rather than silently doing nothing when no plan can be built", () => {
    const nowhere: Coordinate = { id: "not.a.path", kind: "leaf", leaf: "not.a.path", role: "schema" };
    expect(() => erase(fixtures[0], nowhere)).toThrow(/no erasure plan/);
  });

  it("still treats a reference coordinate's erasure as a no-op, which is the alpha-renaming invariant", () => {
    const ref = census.find((c) => c.kind === "reference")!;
    expect(planFor(ref)).toBeUndefined();
    expect(canonical(erase(fixtures[0], ref))).toBe(canonical(fixtures[0]));
  });
});

describe("derived presence — recorded, not merely suppressed", () => {
  const derived = loadDerivation().derivedPresence;

  it("records all sixteen conjunctions, each naming a branch", () => {
    expect(derived.length).toBe(16);
    expect(derived.every((d) => d.branch !== undefined)).toBe(true);
    expect(derived.map((d) => d.proposition)).toContain("relation.derivedBy.join.from#present");
    expect(derived.map((d) => d.proposition)).toContain("field.additivity.semi-additive.nonAdditiveAlong#present");
  });

  it("never suppresses into a hole: every holder it defers to is itself a live coordinate", () => {
    const live = new Set(census.map((c) => c.id));
    for (const d of derived) expect(live.has(d.holder), `${d.proposition} defers to ${d.holder}, which is not a coordinate`).toBe(true);
  });

  it("and none of the suppressed propositions is itself a coordinate, in the other direction", () => {
    const live = new Set(census.map((c) => c.id));
    for (const d of derived) expect(live.has(d.proposition), `${d.proposition} is both derived and emitted`).toBe(false);
  });

  it("is a claim about SCHEMA topology, not about which coordinates the kernel currently keeps", () => {
    // The rule reads "the holder structurally owns existence", so it must not be
    // expressible as "suppress the child while some other coordinate happens to
    // exist". The observable consequence: every deferral names a holder PATH
    // that the schema declares optional, and the branch it names is a real
    // member of that holder's discriminator.
    const kinds = new Map(census.filter((c) => c.enum && c.leaf.endsWith(".kind")).map((c) => [c.leaf, c.enum!]));
    for (const d of derived) {
      const holderLeaf = `${d.holder.replace(/#present$/, "")}.kind`;
      expect(kinds.get(holderLeaf), `${d.holder} is not a tagged holder`).toBeDefined();
      expect(kinds.get(holderLeaf)).toContain(d.branch);
    }
  });
});

describe("representation effects are schema facts, not coordinate ids", () => {
  it("lists paths beneath a holder, including ones that carry no coordinate", () => {
    const effects = plans.get("relation.derivedBy#present")!.representationEffects;
    expect(effects).toContain("structure.relations.*.derivedBy");
    expect(effects).toContain("structure.relations.*.derivedBy.join.cardinality");
    // `.kind` is a representation fact under the holder as much as any payload.
    expect(effects).toContain("structure.relations.*.derivedBy.kind");
  });

  it("is narrower for a value slot than for its holder", () => {
    const holder = plans.get("relation.derivedBy#present")!.representationEffects;
    const slot = plans.get("relation.derivedBy.join.cardinality")!.representationEffects;
    expect(slot).toEqual(["structure.relations.*.derivedBy.join.cardinality"]);
    expect(holder.length).toBeGreaterThan(slot.length);
  });
});

describe("the quotient no longer reads the schema", () => {
  const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "quotient.ts"), "utf-8");

  it("carries no traversal of the fixture shape and no branch-topology query", () => {
    // What this pins: the erasure path names no fixture property and asks the
    // census no shape questions. What it does NOT pin: `nameBlindMap` still
    // reads `structure.relations` and `.fields`, because alpha-renaming is
    // canonicalization, not location — that is the remaining, deliberate,
    // shape-aware code in this module.
    for (const token of ["walkFixture", "loadBranchSignatures", "derivedBy", "grainWitness", "peers", "assertions"]) {
      expect(source.includes(token), `quotient.ts still mentions ${token}`).toBe(false);
    }
  });
});

/**
 * THE OPERATION'S OWN LAW.
 *
 * Everything above this point checks WHERE an erasure writes and what it costs.
 * None of it checks what the erasure FORGETS, and those are different claims.
 * `checkIsolation` cannot supply the missing one either: legality and locality
 * are necessary side conditions on an erasure, not a definition of it. An
 * operation can stay inside its own slot, leave a schema-legal image, and still
 * be the wrong function.
 *
 * The specimen that forced this block: `forget-reference-order` returning
 * `[...v].sort().map((_x, _i, arr) => arr[0])`. It is idempotent, it writes only
 * inside the plan's slot, and every image it produces is schema-legal — so
 * composition, footprint and isolation all pass it — yet it destroys membership
 * while claiming to forget only order. It survived all 222 tests in this file,
 * `quotient-image.test.ts` and `necessity.test.ts` together. Only the recorded
 * freeze noticed, and a moved digest proves a byte changed, not that a law broke.
 *
 * Lawful forgetting is EXACT IDENTIFICATION, which is two obligations pulling
 * against each other:
 *
 *   IDENTIFIES  stimuli differing only in the fact the coordinate names must
 *               produce equal images — otherwise the operation does not forget.
 *   SEPARATES   stimuli differing in any fact the coordinate does NOT name must
 *               produce different images — otherwise it forgets something else.
 *
 * Only the pair binds. Either alone is satisfied by a degenerate function:
 * identity satisfies SEPARATES, and a constant satisfies IDENTIFIES.
 */
describe("lawful forgetting — each operation identifies exactly what its coordinate names", () => {
  /** A relation, built to whatever depth a locator needs. */
  const fx = (r: Record<string, unknown>): Fixture =>
    ({ id: "fx_law", structure: { relations: { r: { grain: ["k"], fields: { k: { transformation: "nominal", key: true } }, ...r } } }, assertions: [] }) as unknown as Fixture;
  /** A relation carrying one extra field `v`, the usual subject. */
  const field = (v: Record<string, unknown>): Fixture => fx({ fields: { k: { transformation: "nominal", key: true }, v } });
  const image = (planId: string, f: Fixture) => {
    const p = plans.get(planId);
    if (!p) throw new Error(`no plan for ${planId}`);
    return JSON.stringify(executePlan(f, p));
  };

  /**
   * One row per operation the census actually plans. Each names the fact its
   * coordinate carries, a pair that must collapse, and a pair that must not.
   *
   * The `separates` pairs are chosen to differ in a fact of the SAME kind and
   * often the same slot — a neighbouring enum member, another element of the
   * same list — because a pair differing somewhere unrelated is separated by
   * any operation at all and would prove nothing.
   */
  const fires = (planId: string, f: Fixture) => image(planId, f) !== JSON.stringify(f);

  /**
   * How many of a row's two stimuli the operation actually runs on.
   *
   * Stated per row and asserted, because a SEPARATES row where the operation
   * is a no-op on BOTH sides is vacuous: the images differ only because the
   * stimuli did, and the row would stay green for any operation whatsoever.
   * The first draft of the `forget-reference-order` row was exactly that — it
   * used `["a","b"]` and `["a","c"]`, both already sorted, so `affects` skipped
   * them both and the row proved nothing about ordering.
   *
   * "one" is the honest and intended answer where the second stimulus carries a
   * fact the coordinate does not name: a merge leaves a third member alone, an
   * absence-spelling leaves a different member alone, and a value already in
   * canonical form is already its own image.
   */
  type Fires = "both" | "one";

  const laws: {
    op: ForgetOperation["kind"];
    plan: string;
    forgets: string;
    identifies: [Fixture, Fixture, Fires];
    separates: [Fixture, Fixture, string, Fires];
  }[] = [
    {
      op: "forget-value",
      plan: "field.transformation",
      forgets: "which scale a field is measured on",
      identifies: [field({ transformation: "ordinal" }), field({ transformation: "interval" }), "both"],
      separates: [field({ transformation: "ordinal" }), field({ transformation: "ordinal", index: true }), "a sibling leaf on the same field", "both"],
    },
    {
      op: "merge-enum-members",
      plan: "field.transformation:nominal~ordinal",
      forgets: "the distinction between two named members, and no third one",
      identifies: [field({ transformation: "nominal" }), field({ transformation: "ordinal" }), "both"],
      separates: [field({ transformation: "nominal" }), field({ transformation: "ratio" }), "a member outside the merged pair", "both"],
      // "both", not "one": the locator sweeps EVERY field's transformation, and
      // the key field `k` carries `nominal` in both stimuli, so the merge runs
      // on each side regardless of what `v` carries. The firing profile is
      // therefore weak evidence for this row alone, which is why the merge's
      // class content and the third member's survival are asserted directly
      // below rather than inferred from the images differing.
    },
    {
      op: "spell-member-as-absent",
      plan: "field.temporality.grain:day~<absent>",
      forgets: "whether one member was spelled or left off",
      identifies: [field({ transformation: "interval", temporality: { kind: "instant", grain: "day" } }), field({ transformation: "interval", temporality: { kind: "instant" } }), "one"],
      separates: [field({ transformation: "interval", temporality: { kind: "instant", grain: "day" } }), field({ transformation: "interval", temporality: { kind: "instant", grain: "month" } }), "a different member of the same enum", "one"],
    },
    {
      op: "delete-slot",
      plan: "field.cyclic",
      forgets: "whether an optional leaf was declared",
      identifies: [field({ transformation: "ordinal", cyclic: true }), field({ transformation: "ordinal" }), "one"],
      separates: [field({ transformation: "ordinal", cyclic: true }), field({ transformation: "ordinal", cyclic: true, index: true }), "another optional leaf beside it", "both"],
    },
    {
      op: "delete-holder",
      plan: "field.temporality#present",
      forgets: "whether the holder was declared at all",
      identifies: [field({ transformation: "interval", temporality: { kind: "instant" } }), field({ transformation: "interval" }), "one"],
      separates: [field({ transformation: "interval", temporality: { kind: "instant" } }), field({ transformation: "ratio", temporality: { kind: "instant" } }), "a fact outside the holder", "both"],
    },
    {
      op: "forget-reference-order",
      plan: "relation.derivedBy.nest.levels#order",
      forgets: "the sequence of a reference list, and nothing about its members",
      identifies: [fx({ derivedBy: { kind: "nest", levels: ["a", "b"] } }), fx({ derivedBy: { kind: "nest", levels: ["b", "a"] } }), "one"],
      // THE MUTANT-B ROW. Same length, same position count, one member swapped.
      // BOTH sides are given out of order, so the operation runs on each: a pair
      // that is already sorted is skipped by `affects` and separates for the
      // trivial reason that nothing happened to either one.
      separates: [fx({ derivedBy: { kind: "nest", levels: ["b", "a"] } }), fx({ derivedBy: { kind: "nest", levels: ["c", "a"] } }), "which things the list names", "both"],
    },
    {
      op: "forget-reference-arity",
      plan: "relation.derivedBy.nest.levels#arity",
      forgets: "how many references stand above the declaration's floor",
      identifies: [fx({ derivedBy: { kind: "nest", levels: ["a", "b", "c"] } }), fx({ derivedBy: { kind: "nest", levels: ["a", "b"] } }), "one"],
      separates: [fx({ derivedBy: { kind: "nest", levels: ["a", "b", "c"] } }), fx({ derivedBy: { kind: "nest", levels: ["b", "a", "c"] } }), "the order of the references it keeps", "both"],
    },
    {
      op: "forget-reference-incidence",
      plan: "field.additivity.semi-additive.nonAdditiveAlong#incidence",
      forgets: "which positions name the same thing, and only that",
      identifies: [
        field({ transformation: "ratio", additivity: { kind: "semi-additive", nonAdditiveAlong: ["a", "a"] } }),
        field({ transformation: "ratio", additivity: { kind: "semi-additive", nonAdditiveAlong: ["a", "b"] } }),
        "both",
      ],
      separates: [
        field({ transformation: "ratio", additivity: { kind: "semi-additive", nonAdditiveAlong: ["a", "a"] } }),
        field({ transformation: "ratio", additivity: { kind: "semi-additive", nonAdditiveAlong: ["a", "a", "a"] } }),
        "how many positions there are",
        "both",
      ],
    },
  ];

  it("covers every operation kind the census plans, so no operation is exempt from the law", () => {
    // The table is checked against the plan registry rather than against the
    // type union: a kind the census never plans has no law to state here, and a
    // kind it DOES plan must not be able to slip in unstated.
    const planned = new Set([...plans.values()].map((p) => p.operation.kind));
    expect(new Set(laws.map((l) => l.op))).toEqual(planned);
  });

  for (const law of laws) {
    describe(`${law.op} forgets ${law.forgets}`, () => {
      const ran = (x: Fixture, y: Fixture, expected: Fires) =>
        expect([fires(law.plan, x), fires(law.plan, y)].filter(Boolean).length, `the operation must run on ${expected === "both" ? "both stimuli" : "exactly one stimulus"}`).toBe(expected === "both" ? 2 : 1);

      it("IDENTIFIES: stimuli differing only in the named fact produce the same image", () => {
        const [x, y, profile] = law.identifies;
        expect(JSON.stringify(x), "the two stimuli must actually differ, or the row proves nothing").not.toBe(JSON.stringify(y));
        ran(x, y, profile);
        expect(image(law.plan, x)).toBe(image(law.plan, y));
      });

      it(`SEPARATES: it does not also forget ${law.separates[2]}`, () => {
        const [x, y, , profile] = law.separates;
        expect(JSON.stringify(x)).not.toBe(JSON.stringify(y));
        // Without this the row is satisfied by an operation that does nothing:
        // the images would differ only because the stimuli did.
        ran(x, y, profile);
        expect(image(law.plan, x)).not.toBe(image(law.plan, y));
      });
    });
  }

  it("merge-enum-members writes the CLASS of exactly the two named members, and leaves a third alone", () => {
    // The merge row's SEPARATES check is satisfied by the images differing, and
    // they would differ for a merge that wrote a class of the WRONG members, or
    // one that quietly touched a third. Both are in-slot and both are legal.
    const p = plans.get("field.transformation:nominal~ordinal")!;
    const at = (f: Fixture) =>
      (executePlan(f, p) as unknown as { structure: { relations: { r: { fields: Record<string, { transformation: unknown }> } } } }).structure.relations.r.fields.v.transformation;

    const cls = at(field({ transformation: "nominal" }));
    expect(isMarker(cls)).toBe(true);
    expect((cls as { members: string[] }).members, "the class is exactly the pair the coordinate names").toEqual(["nominal", "ordinal"]);
    // Symmetric: reaching the class from either member gives the same class, or
    // composing two merges over one leaf would depend on listing order.
    expect(JSON.stringify(at(field({ transformation: "ordinal" })))).toBe(JSON.stringify(cls));
    // And the member outside the pair is not merely "still different" — it is
    // untouched, still a plain source-language value.
    expect(at(field({ transformation: "ratio" }))).toBe("ratio");
  });

  it("forget-value departs the source language: a hole is never confusable with a declared value", () => {
    // The other half of `forget-value`'s law, which no pair of stimuli states.
    // Substituting a known value at the slot satisfies IDENTIFIES perfectly —
    // every transformation collapses to one — and it is local and legal. What
    // it fails is that the image must not be readable as an un-erased
    // declaration; a reader could not tell it from a field that really is
    // nominal. The quotient codomain exists to carry exactly this difference.
    const p = plans.get("field.transformation")!;
    const img = executePlan(field({ transformation: "ordinal" }), p) as unknown as {
      structure: { relations: { r: { fields: Record<string, { transformation: unknown }> } } };
    };
    const at = img.structure.relations.r.fields.v.transformation;
    expect(isMarker(at), "the slot must carry a marker, not a value the source language could have declared").toBe(true);
    expect(typeof at).not.toBe("string");
  });

  it("the skip predicate is not a second, disagreeing definition of the operation", () => {
    // `affects` decides whether a slot needs the operation at all, and for the
    // reference operations it decides by recomputing the operation's own answer
    // (`JSON.stringify(v) !== JSON.stringify([...v].sort())`). That is a second
    // copy of the definition, and two copies can drift apart.
    //
    // The consequence is not cosmetic. A slot the predicate skips keeps its
    // original value; a slot it admits gets the operation's. If they disagree,
    // the image depends on which of the two was consulted, and the erasure
    // stops being a function of the coordinate. That is exactly how the
    // membership-collapsing mutant produced two DIFFERENT images from two
    // stimuli that differ only in order: one was skipped, the other was not.
    const disagree: string[] = [];
    for (const f of fixtures) {
      for (const [id, plan] of plans) {
        const predicted = wouldChange(f, plan);
        const actual = JSON.stringify(executePlan(f, plan)) !== JSON.stringify(f);
        if (predicted !== actual) disagree.push(`${f.id}/${id}: predicted ${predicted}, observed ${actual}`);
      }
    }
    expect(disagree.slice(0, 5), `${disagree.length} disagreements over ${fixtures.length} fixtures x ${plans.size} plans`).toEqual([]);
  });

  it("the law is not vacuous: an in-slot, legal, idempotent operation still fails it", () => {
    // The specimen, executed rather than described. This is the same function
    // the surviving mutant installed, applied through the same plan, and the
    // SEPARATES row above is what refuses it. Without this the block could
    // silently stop discriminating and still read green.
    const wrong = (v: string[]) => v.slice().sort().map((_x, _i, arr) => arr[0]);
    const levels = (l: string[]) => ({ derivedBy: { kind: "nest", levels: wrong(l) } });
    expect(wrong(["a", "b"])).toEqual(wrong(["b", "a"]));            // it does forget order
    expect(wrong(wrong(["a", "b"]))).toEqual(wrong(["a", "b"]));      // and it is idempotent
    expect(wrong(["a", "b"])).toHaveLength(2);                        // and arity survives
    // And yet it identifies two lists that name different things.
    expect(JSON.stringify(fx(levels(["a", "b"])))).toBe(JSON.stringify(fx(levels(["a", "c"]))));
  });
});

describe("the structure-level namespace — peers binds relations, declared where the walk reads every namespace fact", () => {
  const peersPlan = () => plans.get("structure.peers[]#incidence");
  const oracle = loadOracle();

  it("the annotation reaches the locator through the ELEMENTS step, so the executor never infers it", () => {
    const plan = peersPlan();
    expect(plan, "the peers incidence plan exists").toBeDefined();
    expect(plan!.locator.operand, "the structure's x-fsds-operands map reached the inner peer lists").toBe("relation");
  });

  it("a peer set rebinds to the operand's own declared relation names, in declaration order", () => {
    const plan = peersPlan()!;
    const f = oracle.fixtures.get("FX_PEERS_AGGREGATE_TO_DIFFERENT_TARGETS")!;
    const before = (f.structure as unknown as { peers: string[][] }).peers;
    expect(before).toEqual([["by_day", "by_other"]]);
    const image = executePlan(f, plan) as unknown as { structure: { peers: string[][] } };
    // relations are declared [events, by_day, by_other]: the canonical bind is
    // the FIRST TWO, exactly as the branch operands' pool is.
    expect(image.structure.peers).toEqual([["events", "by_day"]]);
  });

  it("the rebound set is a LAWFUL peer claim, and the coordinate is discharged wherever it moves", () => {
    const c = census.find((x) => x.id === "structure.peers[]#incidence")!;
    const moving = oracle.fixtures.get("FX_PEERS_AGGREGATE_TO_DIFFERENT_TARGETS")!;
    const r = checkIsolation(moving, c);
    expect(r.state, String((r as { detail?: string }).detail)).toBe("discharged");
    // WHY it is lawful, from the corpus rather than by fiat: the canonical bind
    // lands on the structure's first declared relation, which this corpus
    // declares as a BASE relation, and the divergence law is conditioned on
    // every member being an aggregate -- so the rebound set is a vacuous peer
    // claim the boundary has no obligation about, not a conserved one. A
    // fixture declaring two aggregates first would put that to the test.
    const image = executePlan(moving, peersPlan()!) as unknown as { structure: { peers: string[][]; relations: Record<string, { derivedBy?: unknown }> } };
    expect(image.structure.peers[0].includes("events")).toBe(true);
    expect(image.structure.relations.events.derivedBy, "events is a base relation").toBeUndefined();
    // And the identity case discharges by `unchanged`: two corpus peer sets
    // already name the first two relations their structure declares.
    const identity = oracle.fixtures.get("FX_PEERS_AT_DAY_AND_MONTH_GRAIN")!;
    expect(checkIsolation(identity, c)).toEqual({ state: "discharged", by: ["unchanged"] });
  });
});

describe("declared distinctness — with differs from from, edgeTo from edgeFrom", () => {
  const oracle = loadOracle();

  it("the constraint rides on the locator for exactly the two operands the law states", () => {
    expect(plans.get("relation.derivedBy.join.with#incidence")!.locator.operandDistinctFrom).toBe("from");
    expect(plans.get("relation.derivedBy.graph.edgeTo#incidence")!.locator.operandDistinctFrom).toBe("edgeFrom");
    // And nothing else: the constraint is a declared LAW fact, not a default.
    const others = [...plans.values()].filter(
      (p) => p.operation.kind === "forget-reference-incidence" && p.locator.operand && p.id !== "relation.derivedBy.join.with#incidence" && p.id !== "relation.derivedBy.graph.edgeTo#incidence",
    );
    expect(others.every((p) => p.locator.operandDistinctFrom === undefined)).toBe(true);
  });

  it("the pick skips the sibling's binding and MOVES where the corpus does not already write it", () => {
    // FX_ORDER_REVENUE_SUMMED_AFTER_LINE_JOIN declares [orders, lines,
    // order_lines] and joins orders with lines, so the sibling-skipping pick
    // ("lines") is the identity -- that is the corpus-dead fact C1e records.
    // Rebinding `with` to the THIRD relation and erasing takes it back to the
    // pick, which proves the erasure is not vacuously the identity and that the
    // pick never collides with `from`.
    const base = oracle.fixtures.get("FX_ORDER_REVENUE_SUMMED_AFTER_LINE_JOIN")!;
    const plan = plans.get("relation.derivedBy.join.with#incidence")!;
    expect(wouldChange(base, plan)).toBe(false);
    const rebound = JSON.parse(JSON.stringify(base)) as typeof base;
    (rebound.structure.relations.order_lines.derivedBy as unknown as Record<string, unknown>).with = "order_lines";
    expect(wouldChange(rebound, plan)).toBe(true);
    const image = executePlan(rebound, plan) as unknown as typeof base;
    const d = image.structure.relations.order_lines.derivedBy as unknown as Record<string, unknown>;
    expect(d.with).toBe("lines");
    expect(d.with).not.toBe(d.from);
  });

  it("on every corpus join and graph fixture the pick differs from the sibling binding", () => {
    // The law holds after erasure everywhere the corpus carries the operator:
    // the images are declarations the boundary can type, and none is a
    // self-join or a degenerate edge.
    for (const [planId, sibling] of [
      ["relation.derivedBy.join.with#incidence", "from"],
      ["relation.derivedBy.graph.edgeTo#incidence", "edgeFrom"],
    ] as const) {
      const plan = plans.get(planId)!;
      for (const f of oracle.fixtures.values()) {
        const image = executePlan(f, plan) as unknown as { structure: { relations: Record<string, { derivedBy?: Record<string, unknown> }> } };
        for (const rel of Object.values(image.structure.relations)) {
          const d = rel.derivedBy;
          if (!d || !(planId.includes("join") ? d.kind === "join" : d.kind === "graph")) continue;
          expect(d[planId.split(".").at(-1)!.replace("#incidence", "")], `${planId} on ${f.id}`).not.toBe(d[sibling]);
        }
      }
    }
  });
});

describe("declared mirrors — toGrain rebinds to the result grain, keep to the result fields", () => {
  const oracle = loadOracle();

  it("the mirror rides on the locator for exactly the operands whose law writes the binding twice", () => {
    // The locator is shared by the slot's facets, so the mirror reaches the
    // arity and order facets of toGrain too -- the arity floor becomes the
    // mirror's length there, and the order erasure never consults a pool.
    expect(plans.get("relation.derivedBy.aggregate-to-grain.toGrain#incidence")!.locator.operandMirror).toBe("result.grain");
    expect(plans.get("relation.derivedBy.project.keep#incidence")!.locator.operandMirror).toBe("result.fields");
    expect(plans.get("relation.derivedBy.project.keep#arity")!.locator.operandMirror).toBe("result.fields");
    const mirrored = [...plans.values()].filter((p) => !!p.locator.operandMirror).map((p) => p.id);
    expect(mirrored.sort()).toEqual([
      "relation.derivedBy.aggregate-to-grain.toGrain#arity",
      "relation.derivedBy.aggregate-to-grain.toGrain#incidence",
      "relation.derivedBy.aggregate-to-grain.toGrain#order",
      "relation.derivedBy.project.keep#arity",
      "relation.derivedBy.project.keep#incidence",
    ]);
  });

  it("the mirror is the identity on every corpus declaration, and a broken equation is REPAIRED", () => {
    // The equation (sameSet(out.grain, d.toGrain), sameSet(fieldNames(out),
    // d.keep)) holds in every corpus declaration -- unlawful ones included --
    // so the mirror rebind moves nothing there.
    for (const id of ["relation.derivedBy.aggregate-to-grain.toGrain#incidence", "relation.derivedBy.project.keep#incidence", "relation.derivedBy.project.keep#arity"]) {
      const plan = plans.get(id)!;
      const carries = [...oracle.fixtures.values()].filter((f) => wouldChange(f, plan));
      expect(carries.map((f) => f.id), `${id} moves somewhere in the corpus`).toEqual([]);
    }
    // An authored equation break is the moving case. The rebind is POSITIONAL
    // -- it cannot extend a list -- so the break it repairs is the ARRANGED
    // one: keep holds the result's own names in a different order, and the
    // mirror writes the declaration order back. (A SHORT keep cannot be
    // repaired by an incidence erasure at all, and an arity cut only ever
    // shortens: both limits are stated, not hidden.)
    const base = oracle.fixtures.get("FX_N_PROJECT_KEEPS_NEST_LEVELS")!;
    const broken = JSON.parse(JSON.stringify(base)) as typeof base;
    const flat = broken.structure.relations.flat as unknown as { fields: Record<string, unknown>; derivedBy: Record<string, unknown> };
    const declared = Object.keys(flat.fields);
    expect(declared.length).toBeGreaterThan(1);
    flat.derivedBy.keep = [...declared].reverse();
    const plan = plans.get("relation.derivedBy.project.keep#incidence")!;
    expect(wouldChange(broken, plan)).toBe(true);
    const image = executePlan(broken, plan) as unknown as typeof base;
    expect((image.structure.relations.flat.derivedBy as unknown as { keep: string[] }).keep).toEqual(declared);
    // And the repaired image is a lawful declaration the boundary accepts.
    const c = census.find((x) => x.id === "relation.derivedBy.project.keep#incidence")!;
    expect(checkIsolation(broken, c)).toMatchObject({ state: "discharged" });
  });

  it("a mirrored arity truncates to the mirror's length and preserves the surviving names", () => {
    // A keep LONGER than the result's fields breaks the equation by length.
    // The extra name is schema-valid (a Name is a patterned string; the
    // cross-reference is law-level, not schema-level) and the arity cut takes
    // keep back to the mirror's length, keeping the FIRST names -- so an
    // arity erasure never rewrites occupants.
    const base = oracle.fixtures.get("FX_N_PROJECT_KEEPS_NEST_LEVELS")!;
    const overlong = JSON.parse(JSON.stringify(base)) as typeof base;
    const flat = overlong.structure.relations.flat as unknown as { fields: Record<string, unknown>; derivedBy: Record<string, unknown> };
    const declared = Object.keys(flat.fields);
    flat.derivedBy.keep = [...declared, "zz_extra"];
    const plan = plans.get("relation.derivedBy.project.keep#arity")!;
    expect(wouldChange(overlong, plan)).toBe(true);
    const image = executePlan(overlong, plan) as unknown as typeof base;
    const keep = (image.structure.relations.flat.derivedBy as unknown as { keep: string[] }).keep;
    expect(keep).toEqual(declared);
    expect(keep).not.toContain("zz_extra");
  });
});

describe("composition — derived ordering and confluence over the bound registry", () => {
  const fx = (id: string): Fixture => {
    const f = fixtures.find((x) => x.id === id);
    if (!f) throw new Error(`no corpus fixture ${id}`);
    return f;
  };

  it("orders a synthesized branch-field plan before the discriminator it branches on, with no declared edge", () => {
    // A closure's normalization plan is built outside the census and carries no
    // `runAfter`; the carrier's declared edges name census ids, not this one.
    const carrier = plans.get("relation.derivedBy.kind:aggregate-to-grain~join")!;
    const forget = forgetBranchField({ holder: "relation.derivedBy", branch: "join", field: "cardinality" });
    expect(forget.runAfter).toBeUndefined();
    expect(carrier.runAfter ?? []).not.toContain(forget.id);
    expect(derivedRunAfter(carrier, [carrier, forget])).toEqual([forget.id]);
    expect(derivedRunAfter(forget, [carrier, forget])).toEqual([]);
    expect(orderPlans([carrier, forget]).map((p) => p.id)).toEqual([forget.id, carrier.id]);
    expect(orderPlans([forget, carrier]).map((p) => p.id)).toEqual([forget.id, carrier.id]);
    // The edge is load-bearing: merged first, the branch step no longer finds
    // `join` and the cardinality survives as residue.
    const target = fx("FX_ORDER_REVENUE_SUMMED_AFTER_LINE_JOIN");
    const edgeOrder = canonical(executePlan(executePlan(target, forget), carrier));
    expect(canonical(executePlan(executePlan(target, carrier), forget))).not.toBe(edgeOrder);
    expect(canonical(executeAll(target, [carrier, forget]))).toBe(edgeOrder);
    expect(canonical(executeAll(target, [forget, carrier]))).toBe(edgeOrder);
  });

  it("the derived edge compares the WHOLE prefix -- property names and enclosing branch members -- so a nested union orders only its own discriminator", () => {
    // Synthetic nested union: `a.[x].b` is itself discriminated. The plan that
    // branches on the INNER discriminator must order the inner `kind` plan under
    // the SAME outer member and nothing else: not the inner kind under another
    // outer member, and not a same-shaped locator with a different property name.
    const at = (id: string, steps: Parameters<typeof orderPlans>[0][number]["locator"]["steps"], operation: ForgetOperation) => ({
      id,
      locator: { path: id, steps },
      operation,
      representationEffects: [],
    });
    const inner = at("inner-field", [{ kind: "prop", name: "a" }, { kind: "branch", member: "x" }, { kind: "prop", name: "b" }, { kind: "branch", member: "y" }, { kind: "prop", name: "c" }], { kind: "delete-slot" });
    const innerKind = at("inner-kind", [{ kind: "prop", name: "a" }, { kind: "branch", member: "x" }, { kind: "prop", name: "b" }, { kind: "prop", name: "kind" }], { kind: "forget-value" });
    const otherMember = at("inner-kind-under-z", [{ kind: "prop", name: "a" }, { kind: "branch", member: "z" }, { kind: "prop", name: "b" }, { kind: "prop", name: "kind" }], { kind: "forget-value" });
    const otherName = at("inner-kind-under-other", [{ kind: "prop", name: "a" }, { kind: "branch", member: "x" }, { kind: "prop", name: "other" }, { kind: "prop", name: "kind" }], { kind: "forget-value" });
    const outerKind = at("outer-kind", [{ kind: "prop", name: "a" }, { kind: "prop", name: "kind" }], { kind: "forget-value" });
    const present = [inner, innerKind, otherMember, otherName, outerKind];
    expect(derivedRunAfter(innerKind, present)).toEqual([inner.id]);
    expect(derivedRunAfter(otherMember, present)).toEqual([]);
    expect(derivedRunAfter(otherName, present)).toEqual([]);
    // The OUTER discriminator is branched on by every plan under `[x]` AND under `[z]`: all of them run first.
    expect(derivedRunAfter(outerKind, present).sort()).toEqual([inner.id, innerKind.id, otherMember.id, otherName.id].sort());
  });

  it("every closure set yields one image whatever its listing, on its own stimuli and on the fixtures that used to split it", () => {
    const oracle = loadOracle();
    const splitters = ["FX_ORDER_REVENUE_SUMMED_AFTER_LINE_JOIN", "FX_NESTED_SUBTOTAL_OFF_HIERARCHY", "FX_PEERS_AGGREGATE_TO_DIFFERENT_TARGETS"].map(fx);
    let sets = 0;
    for (const c of loadClosures().closures) {
      const carrier = planFor(byId.get(c.carrier)!);
      expect(carrier, c.carrier).toBeDefined();
      const set = [carrier!, ...c.normalization.map((n) => forgetBranchField(n))];
      const stimuli = [c.a, c.b].filter((s) => s !== undefined).map((s) => resolveSide(s!, oracle).fixture);
      for (const f of [...splitters, ...stimuli]) expect(distinctListingImages(f, set), `${c.carrier} on ${f.id}`).toHaveLength(1);
      sets++;
    }
    expect(sets).toBe(22);
  });

  it("merges on one leaf do not commute as raw two-step compositions, and saturation reconciles them to the connected class", () => {
    const p = plans.get("field.transformation:nominal~ordinal")!;
    const q = plans.get("field.transformation:nominal~interval")!;
    const f = fx("FX_SURVEY_MEAN_SATISFACTION");
    expect(canonical(executePlan(executePlan(f, p), q))).not.toBe(canonical(executePlan(executePlan(f, q), p)));
    expect(distinctListingImages(f, [p, q])).toHaveLength(1);
    const image = executeAll(f, [p, q]) as unknown as { structure: { relations: Record<string, { fields: Record<string, { transformation: unknown }> }> } };
    const classes = Object.values(image.structure.relations).flatMap((r) => Object.values(r.fields).map((x) => x.transformation)).filter(isMarker);
    expect(classes.length).toBeGreaterThan(0);
    for (const c of classes) expect(c).toEqual({ "@q": "member-class", members: ["interval", "nominal", "ordinal"] });
  });

  it("a merge against an absence-spelling on one leaf composes to ONE image: absence absorbs a class that contains the member", () => {
    // Merged first, the slot holds {absent, censored}; the absence-spelling of
    // `censored` sees a class containing it and deletes the slot. Spelled first,
    // `censored` leaves and the merge finds nothing. Both listings: the
    // declaration is gone — a ~ censored ~ absent under the joint quotient.
    const absence = ["observation.null:absent~censored", "observation.null:censored~<absent>"].map((id) => planFor(byId.get(id)!)!);
    const base = fx("FX_SURVIVAL_MEAN_WITH_CENSORED_ROWS");
    expect(absence.every((p) => wouldChange(base, p))).toBe(true);
    const images = distinctListingImages(base, absence);
    expect(images).toHaveLength(1);
    expect(images[0]).not.toContain("censored");
    expect(images[0]).not.toContain("member-class");
  });

  it("arity against order on one list is the DECLARED non-commuting pair: two images, refused, with its reason on record", () => {
    const [arity, order] = ["relation.derivedBy.nest.levels#arity", "relation.derivedBy.nest.levels#order"].map((id) => planFor(byId.get(id)!)!);
    // `project.keep` used to be the example; it is a declared SET now, so it has no
    // order plan. `nest.levels` keeps its facet and needs a THREE-element list to
    // show the disagreement, which no committed fixture has -- cut-then-sort keeps
    // the first two and sorts them, sort-then-cut sorts first and cuts a different
    // pair. The stimuli are built here rather than read from the corpus because the
    // claim is about the two KINDS on one slot, not about these names.
    const base = fx("FX_N_NESTED_SUBTOTAL_AT_PREFIX");
    const three = JSON.parse(JSON.stringify(base)) as Fixture;
    (three.structure.relations.hierarchy as { derivedBy: { levels: string[] } }).derivedBy.levels = ["state", "country", "revenue"];
    expect(distinctListingImages(three, [arity, order])).toHaveLength(2);
    expect(declaredNonCommuting(arity, order)).toMatch(/not composable/);
    expect(declaredNonCommuting(order, arity)).toBe(declaredNonCommuting(arity, order));
    // The declaration is about KINDS on ONE slot: the same kinds on different lists are
    // not a declared pair, and other kinds on the same list are not either.
    const otherOrder = planFor(byId.get("relation.derivedBy.aggregate-to-grain.toGrain#order")!)!;
    expect(declaredNonCommuting(arity, otherOrder)).toBeUndefined();
    const sameListIncidence = planFor(byId.get("relation.derivedBy.nest.levels#incidence")!)!;
    expect(declaredNonCommuting(arity, sameListIncidence)).toBeUndefined();
  });

  it("over the whole footprint population, every non-confluent same-slot pair is a declared one", () => {
    const pop = specimens().fixtures;
    const all = [...plans.values()];
    const stepsOf = (p: ErasurePlan) => JSON.stringify(p.locator.steps);
    const undeclared: string[] = [];
    const declared: string[] = [];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const p = all[i];
        const q = all[j];
        if (stepsOf(p) !== stepsOf(q)) continue;
        const splits = pop.some((f) => wouldChange(f, p) && wouldChange(f, q) && distinctListingImages(f, [p, q]).length > 1);
        if (!splits) continue;
        (declaredNonCommuting(p, q) ? declared : undeclared).push(`${p.id} x ${q.id}`);
      }
    }
    expect(undeclared).toEqual([]);
    // Not vacuous: BOTH declared families are exercised by the population -- the
    // arity/order cut-and-sort pair, and the incidence/order pair that arrived
    // when a bound slot started rebinding to names it ignores the current value of.
    expect(declared.length).toBeGreaterThan(0);
    expect(declared.every((d) => d.includes("#arity") || d.includes("#incidence"))).toBe(true);
    expect(declared.some((d) => d.includes("#arity"))).toBe(true);
    expect(declared.some((d) => d.includes("#incidence"))).toBe(true);
    // Every same-slot plan pair against the whole specimen population, each
    // surviving pair executed in both listings: quadratic in the registry and
    // measured at ~6s, which sat just under the 5s default until it did not.
    // The budget is declared rather than the sweep narrowed — a sampled
    // certificate is not one.
  }, 60_000);

  it("refuses to certify beyond the exhaustive bound rather than sampling", () => {
    const tooMany = [...plans.values()].slice(0, CONFLUENCE_BOUND + 1);
    expect(() => distinctListingImages(fixtures[0], tooMany)).toThrow(/certified exhaustively up to 7 plans; 8 given/);
  });
});
