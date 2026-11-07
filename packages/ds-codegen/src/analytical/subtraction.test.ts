/**
 * The Stage-2 subtraction gate, and the separation that makes it admissible.
 *
 * Two claims are under test and they are different claims:
 *
 * - The gate is a slice-completion proof obligation over a FROZEN basis, not a
 *   freeze over the live kernel. It must not re-derive its candidates from the
 *   current census, and growth in the census must not reopen it.
 * - Constructor existence is governed separately from coordinate necessity. No
 *   coordinate verdict can remove a constructor, and — the subtler half — the
 *   current corpus population must not be what mechanically owns vocabulary
 *   existence either, or the cheap discharge simply moves one level upstream to
 *   deleting the referencing case.
 *
 * Every gate case below is synthetic, so the tests keep their meaning as the
 * live ledger burns down.
 */
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCensus, loadPlans } from "./census.js";
import { specimens } from "./erasure-audit.js";
import { executePlan, wouldChange } from "./erasure-plan.js";
import { canonical } from "./quotient.js";
import { loadBases, orphanedCoordinates, type ExperimentBasis } from "./experiments.js";
import { FIXTURES_DIR, loadOracle } from "./necessity.js";
import { Derivation } from "./relation-model.js";
import {
  basesForSpec,
  checkSubtraction,
  DISPOSITIONS,
  loadSubtraction,
  verdictDrift,
  type SubtractionLedger,
} from "./subtraction.js";

const live = loadSubtraction();

const ledgerOf = (over: Partial<SubtractionLedger>): SubtractionLedger => ({
  dispositions: Object.fromEntries(DISPOSITIONS.map((d) => [d, `synthetic gloss for ${d}`])),
  basis: { frozenAt: "abc1234", reason: "test", count: 2, candidates: ["a.b", "c.d"] },
  constructors: {},
  verdicts: { "a.b": { disposition: "unresolved" }, "c.d": { disposition: "unresolved" } },
  ...over,
});

const check = (l: SubtractionLedger) => checkSubtraction("<synthetic>", l);

describe("the close condition is a verdict per candidate, not a smaller schema", () => {
  it("refuses to close while any candidate is unadjudicated", () => {
    const r = check(ledgerOf({}));
    expect(r.ok).toBe(false);
    expect(r.unresolved).toEqual(["a.b", "c.d"]);
    expect(r.message).toContain("cannot claim ratification");
  });

  it("closes when every candidate carries a reasoned verdict, whichever verdict it is", () => {
    const r = check(
      ledgerOf({
        verdicts: {
          "a.b": { disposition: "witnessed", reason: "witnessed by FX_X | FX_Y under CASE_Z" },
          "c.d": { disposition: "not-yet-admitted", reason: "no active authority distinguishes it", reintroducibleAt: 3 },
        },
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.problems).toEqual([]);
  });

  it("refuses a verdict with no reason, which is a bare enumeration and discharges nothing", () => {
    const r = check(ledgerOf({ verdicts: { "a.b": { disposition: "witnessed" }, "c.d": { disposition: "unresolved" } } }));
    expect(r.problems).toContain("a.b: witnessed with no reason");
  });

  it("refuses a removal with no re-earning stage, so absence stays re-earnable rather than final", () => {
    const r = check(
      ledgerOf({
        verdicts: {
          "a.b": { disposition: "not-yet-admitted", reason: "nothing requires it" },
          "c.d": { disposition: "unresolved" },
        },
      }),
    );
    expect(r.problems).toContain("a.b: not-yet-admitted with no reintroducibleAt stage");
  });

  it("refuses a verdict for something the experiment never opened, and a candidate with no verdict", () => {
    expect(check(ledgerOf({ verdicts: { ...ledgerOf({}).verdicts, "e.f": { disposition: "witnessed", reason: "x" } } })).problems).toContain(
      "verdict e.f is not in the frozen basis",
    );
    expect(check(ledgerOf({ verdicts: { "a.b": { disposition: "unresolved" } } })).problems).toContain("candidate c.d has no verdict entry");
  });
});

describe("the apparatus owns its own vocabulary and verifies its own freeze", () => {
  it("refuses a disposition the ledger invented for itself", () => {
    // The defect this closes: the check read `ledger.dispositions`, so a ledger
    // could authorize a new disposition in the same edit that used it. A
    // vocabulary a document can extend about itself is not a vocabulary.
    const l = ledgerOf({});
    (l.dispositions as Record<string, string>)["looks-fine"] = "a gloss is not an authority";
    l.verdicts["a.b"] = { disposition: "looks-fine" as never, reason: "r" };
    const p = check(l).problems;
    expect(p.some((x) => x.includes("must describe exactly the code-owned vocabulary"))).toBe(true);
    expect(p).toContain('a.b: unknown disposition "looks-fine"');
  });

  it("refuses a duplicated candidate, which satisfies the count while hiding a coordinate", () => {
    const l = ledgerOf({ basis: { frozenAt: "abc1234", reason: "test", count: 2, candidates: ["a.b", "a.b"] } });
    expect(check(l).problems).toContain("basis lists duplicate candidate(s): a.b");
  });

  it("verifies the basis digest instead of merely recording it", () => {
    const bad = ledgerOf({ basis: { frozenAt: "abc1234", reason: "test", digest: "0".repeat(64), count: 2, candidates: ["a.b", "c.d"] } });
    expect(check(bad).problems.some((p) => p.startsWith("basis digest is"))).toBe(true);
    const real = createHash("sha256").update(["a.b", "c.d"].join("\n")).digest("hex");
    const good = ledgerOf({ basis: { frozenAt: "abc1234", reason: "test", digest: real, count: 2, candidates: ["a.b", "c.d"] } });
    expect(good.basis.digest).toBe(real);
    expect(check(good).problems).toEqual([]);
  });

  it("the live ledger's recorded digest is the one its candidate list actually hashes to", () => {
    for (const { file, ledger } of basesForSpec("REL-VIEW-ALGEBRA-01")) {
      if (ledger.basis.digest === undefined) continue;
      const actual = createHash("sha256").update([...ledger.basis.candidates].sort().join("\n")).digest("hex");
      expect(actual, `${file}`).toBe(ledger.basis.digest);
    }
  });
});

describe("the gate covers every basis the spec opened", () => {
  it("finds the sibling bases, not just the first one", () => {
    // The defect: the CLI checked `subtraction-stage2.json` alone, so it could
    // report green while obligations this same slice created were still open in
    // a sibling file.
    const files = basesForSpec("REL-VIEW-ALGEBRA-01").map((b) => b.file).sort();
    expect(files.length).toBeGreaterThan(1);
    expect(files).toContain("subtraction-stage2.json");
    for (const { file, ledger } of basesForSpec("REL-VIEW-ALGEBRA-01")) {
      expect(ledger.spec, file).toBe("REL-VIEW-ALGEBRA-01");
    }
  });

  it("every basis reports only LEDGER problems that are its own open candidates", () => {
    // A structural ledger problem is not the same as an unresolved candidate:
    // the first says the file is malformed, the second says the work is not
    // done. `subtraction-stage2-holders.json` shipped with a dispositions map
    // listing four of the five code-owned dispositions, which no test covered,
    // so it reported a malformed-ledger problem on every gate run while reading
    // as ordinary open work. This is the ratchet that catches the next one.
    for (const { file, ledger } of basesForSpec("REL-VIEW-ALGEBRA-01")) {
      expect(checkSubtraction(file, ledger).problems, `${file}`).toEqual([]);
    }
  });

  it("a sibling basis with an open candidate keeps the gate red", () => {
    const open = basesForSpec("REL-VIEW-ALGEBRA-01").filter(({ ledger }) =>
      ledger.basis.candidates.some((id) => (ledger.verdicts[id]?.disposition ?? "unresolved") === "unresolved"),
    );
    expect(open.length).toBeGreaterThan(0);
    for (const { file, ledger } of open) {
      expect(checkSubtraction(file, ledger).ok, `${file} reports OK with unresolved candidates`).toBe(false);
    }
  });
});

describe("the basis is frozen, so a later stage's growth cannot reopen this one", () => {
  it("takes its candidates from the recorded basis and never from the live census", () => {
    // The gate must be decidable with no census at all. If it read
    // `loadCensus()` it would be a shrink-only ledger keyed to an evolving
    // population, which is the shape the freeze doctrine forbids.
    const r = check(ledgerOf({}));
    expect(r.unresolved).toEqual(["a.b", "c.d"]);
    // Neither synthetic id exists in the live kernel; the gate did not notice
    // and must not.
    const kernelIds = new Set(loadCensus().map((c) => c.id));
    expect(kernelIds.has("a.b")).toBe(false);
  });

  it("a live coordinate outside the basis is never a failure of this gate", () => {
    // Ownership is a repo-level invariant that no single experiment owns; this
    // gate must not be able to see one. `checkSubtraction` reads only the
    // frozen basis, so its result cannot mention anything outside it.
    expect(check(live).unresolved.every((id) => live.basis.candidates.includes(id))).toBe(true);
    expect(check(live).problems.every((p) => live.basis.candidates.some((id) => p.includes(id)) || p.startsWith("basis"))).toBe(true);
  });

  it("the live ledger's basis is internally consistent", () => {
    expect(live.basis.candidates).toHaveLength(live.basis.count);
    expect(new Set(live.basis.candidates).size).toBe(live.basis.count);
    expect(check(live).problems).toEqual([]);
  });
});

describe("a verdict must be true of the live tree, or it is a story about it", () => {
  const drift = (verdicts: SubtractionLedger["verdicts"], live: string[], ratified: string[]) =>
    verdictDrift(ledgerOf({ verdicts }), new Set(live), new Set(ratified));

  it("catches a coordinate recorded as witnessed that no witness ratifies", () => {
    expect(drift({ "a.b": { disposition: "witnessed", reason: "r" }, "c.d": { disposition: "unresolved" } }, ["a.b", "c.d"], [])).toEqual([
      "a.b: recorded witnessed, but no holding witness ratifies it",
    ]);
  });

  it("catches a removal that was decided but never applied", () => {
    for (const d of ["not-yet-admitted", "representation-artifact"] as const) {
      expect(drift({ "a.b": { disposition: d, reason: "r", reintroducibleAt: 3 }, "c.d": { disposition: "unresolved" } }, ["a.b"], [])).toEqual([
        `a.b: recorded ${d}, but the kernel still carries it`,
      ]);
    }
  });

  it("catches a coordinate that quietly earned a witness while still recorded unresolved", () => {
    expect(drift({ "a.b": { disposition: "unresolved" }, "c.d": { disposition: "unresolved" } }, ["a.b"], ["a.b"])).toEqual([
      "a.b: is ratified but still recorded unresolved",
    ]);
  });

  it("is silent when every verdict has taken effect", () => {
    expect(
      drift(
        {
          "a.b": { disposition: "witnessed", reason: "r" },
          "c.d": { disposition: "not-yet-admitted", reason: "r", reintroducibleAt: 3 },
        },
        ["a.b"],
        ["a.b"],
      ),
    ).toEqual([]);
  });
});

describe("a witnessed verdict means a SINGLE-coordinate witness", () => {
  const v = (d: string) => ({ "a.b": { disposition: d as never, reason: "r" }, "c.d": { disposition: "unresolved" as const } });

  it("refuses a witnessed verdict whose only support is a minimal multi-coordinate set", () => {
    // Without this the pair pass could produce verdicts that contradict the
    // retention policy sitting beside them in the same file.
    const drift = verdictDrift(ledgerOf({ verdicts: v("witnessed") }), new Set(["a.b"]), new Set(), new Set(["a.b"]));
    expect(drift).toEqual([
      "a.b: recorded witnessed, but its only support is a minimal multi-coordinate witness — that proves the SET separates and that this coordinate alone does not, so the factorization is open, not the standing",
    ]);
  });

  it("distinguishes that from having no witness at all, because they need different work", () => {
    const drift = verdictDrift(ledgerOf({ verdicts: v("witnessed") }), new Set(["a.b"]), new Set(), new Set());
    expect(drift).toEqual(["a.b: recorded witnessed, but no holding witness ratifies it"]);
  });

  it("accepts it when a single-coordinate witness ratifies", () => {
    expect(verdictDrift(ledgerOf({ verdicts: v("witnessed") }), new Set(["a.b"]), new Set(["a.b"]), new Set())).toEqual([]);
  });
});

describe("constructor existence is governed separately from coordinate necessity", () => {
  const kinds = () => Derivation.options.map((o) => o.shape.kind.value as string).sort();

  it("every constructor the algebra admits carries a required disposition and a retention rationale", () => {
    const required = Object.entries(live.constructors)
      .filter(([, c]) => c.disposition === "required")
      .map(([k]) => k)
      .sort();
    expect(required).toEqual(kinds());
    for (const [name, c] of Object.entries(live.constructors)) {
      expect(c.retentionRationale.trim().length, `${name} has no retention rationale`).toBeGreaterThan(0);
      expect(c.evidenceCases.length, `${name} cites no case`).toBeGreaterThan(0);
      expect(c.removableWhen.trim().length, `${name} does not say what could retire it`).toBeGreaterThan(0);
    }
  });

  it("the ledger points at the law rather than stating it, so it is not a second authority for meaning", () => {
    // A subtraction that authored the definitions it then found necessary would
    // be circular, which is the failure this whole slice has been removing. So
    // every constructor's `authorityRef` must name real loci that really carry
    // the operator, and the ledger's own prose must be about survival.
    const repo = path.resolve(__dirname, "../../../..");
    for (const [name, c] of Object.entries(live.constructors)) {
      for (const [role, refText] of Object.entries(c.authorityRef)) {
        const file = refText.split(/[ (§]/)[0];
        const p = path.join(repo, file);
        expect(fs.existsSync(p), `${name}.authorityRef.${role} names a missing file ${file}`).toBe(true);
        expect(fs.readFileSync(p, "utf-8"), `${name}.authorityRef.${role} (${file}) does not mention ${name}`).toContain(name);
      }
    }
  });

  it("no coordinate verdict can reach a constructor: the two ledgers do not share a key", () => {
    // The structural guarantee behind "coordinate subtraction cannot remove a
    // constructor". A verdict is keyed by coordinate id; a constructor by
    // operator name; `checkSubtraction` reads only the former. If a constructor
    // could be retired by adjudicating `relation.derivedBy.kind:a~b`, the
    // cheapest discharge of an unwitnessed pair would be deleting an operator.
    for (const id of live.basis.candidates) expect(id in live.constructors).toBe(false);
    const retired = check({ ...live, constructors: {} });
    expect(retired.problems).toEqual([]);
    expect(retired.ok).toBe(check(live).ok);
  });

  it("a constructor's necessity is not owned by the current corpus population", () => {
    // Cases are EVIDENCE that Stage-2 authority needs the constructor, not the
    // mechanism that keeps it alive. If deleting the referencing case were
    // enough to retire an operator, the cheap discharge would have moved one
    // level upstream. So retirement requires its own disposition, and the
    // ledger says so per constructor.
    for (const [name, c] of Object.entries(live.constructors)) {
      expect(c.disposition, `${name}`).toBe("required");
      expect(c.removableWhen, `${name}`).toMatch(/disposition/);
      expect(c.removableWhen, `${name}`).toMatch(/no coordinate verdict/);
    }
  });
});

describe("the rule is on disk before any verdict cites it", () => {
  // A subtraction whose governing rule lives only in the conversation that
  // produced it cannot constrain a verdict recorded after a context reset, and
  // nothing would report the absence. So the policy is an artifact, and these
  // assert the parts that actually do work rather than that a key exists.
  const policy = live.adjudicationPolicy!;

  it("records the retention test in terms of erasure, not of engine agreement", () => {
    expect(policy).toBeDefined();
    expect(policy.retention).toMatch(/unexpressible/);
    expect(policy.retention).toMatch(/primitive standing/i);
  });

  it("keeps all four grounds on what counts as independently grounded", () => {
    // Losing any one of these re-opens a specific way to certify more than the
    // corpus supports: engine self-agreement, schema-shaped necessity,
    // non-isolating substitution, and inventing authority to fill a gap.
    expect(policy.independentlyGrounded).toHaveLength(4);
    const joined = policy.independentlyGrounded.join(" ");
    for (const ground of ["Engine behavior is evidence, never authority", "Schema invalidity", "isolate", "never permission"]) {
      expect(joined, `the "${ground}" ground is missing`).toContain(ground);
    }
  });

  it("precommits what a surviving kind distinction may and may not be read as", () => {
    expect(policy.kindInterpretation.proves).toContain("same structural operand signature");
    expect(policy.kindInterpretation.doesNotProve).toContain("primitive analytical semantic axis");
    // The bare leaf is an open question, not an automatic survivor.
    expect(policy.kindInterpretation.openQuestion).toContain("relation.derivedBy.kind");
  });

  it("states the closure conditions as validity constraints, each with its reason", () => {
    const ids = (live.closeConditions ?? []).map((c) => c.id).sort();
    expect(ids).toEqual(["closure-dependency-discharge", "final-quotient", "operator-law-locus", "ruledigest-boundary"]);
    for (const c of live.closeConditions ?? []) {
      expect(c.condition.trim().length, `${c.id} states no condition`).toBeGreaterThan(0);
      expect(c.why.trim().length, `${c.id} gives no reason`).toBeGreaterThan(0);
    }
  });

  it("the final-quotient condition is simultaneous, not sequential", () => {
    // The distinction is load-bearing: adjudicating one at a time lets two
    // coordinates each be declared carried by the other, both be removed, and
    // collectively erase the distinction — subtraction ORDER would then decide
    // the normal form.
    const fq = (live.closeConditions ?? []).find((c) => c.id === "final-quotient")!;
    expect(fq.condition).toMatch(/SIMULTANEOUSLY|simultaneous/);
    expect(fq.condition).toMatch(/not sequentially|as a whole/);
  });

  it("every derived basis names the ledger whose policy governs it", () => {
    // A second basis with its own copy of the rule would be a second authority
    // for what the rule says.
    for (const b of loadBases()) {
      const l = loadSubtraction(path.join(FIXTURES_DIR, b.file));
      if (l.adjudicationPolicy) continue;
      expect(l.policyRef, `${b.file} has neither a policy nor a policyRef`).toBeTruthy();
      const [file, anchor] = l.policyRef!.split("#");
      expect(fs.existsSync(path.join(FIXTURES_DIR, file)), `${b.file} policyRef names a missing ${file}`).toBe(true);
      expect(loadSubtraction(path.join(FIXTURES_DIR, file))[anchor as "adjudicationPolicy"]).toBeDefined();
    }
  });
});

describe("the prediction register is outside the subtraction's authority graph", () => {
  const REGISTER = "predictions-stage2.json";

  it("is not registered as a basis, so it can never own or adjudicate a coordinate", () => {
    expect(fs.existsSync(path.join(FIXTURES_DIR, REGISTER))).toBe(true);
    expect(loadBases().map((b) => b.file)).not.toContain(REGISTER);
  });

  it("is unreachable from every analytical module, which is what makes 'not admissible evidence' a guard", () => {
    // The banner in the file is a wish. This is the enforcement: a rule that
    // cannot read the register cannot be influenced by it, so agreement with
    // the predictions can never be manufactured by the code being adjudicated.
    const dir = __dirname;
    const readers = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .filter((f) => fs.readFileSync(path.join(dir, f), "utf-8").includes(REGISTER));
    expect(readers, "an analytical module reads the prediction register").toEqual([]);
  });

  it("keeps its outcomes blank, because a prediction updated during the experiment measures nothing", () => {
    const reg = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, REGISTER), "utf-8")) as {
      classes: Record<string, string>;
      entries: { class: string; claim: string; basis: string; predictedDisposition: string | null; actualDisposition: string | null }[];
    };
    expect(Object.keys(reg.classes).sort()).toEqual(["OPEN_EXPECTATION", "PREDICTION", "RESULT"]);
    for (const e of reg.entries) {
      expect(reg.classes[e.class], `${e.claim.slice(0, 40)}: unknown class ${e.class}`).toBeDefined();
      expect(e.basis.trim().length, `${e.claim.slice(0, 40)} cites no basis`).toBeGreaterThan(0);
      // Populated only at close. Until then the comparison has not been run.
      expect(e.actualDisposition, `${e.claim.slice(0, 40)} was scored early`).toBeNull();
    }
    // A RESULT must name what falsified it; a PREDICTION must not claim one.
    for (const e of reg.entries.filter((x) => x.class === "RESULT")) expect(e.predictedDisposition).toBe("survives");
    for (const e of reg.entries.filter((x) => x.class === "PREDICTION")) expect(e.predictedDisposition).toBeNull();
  });
});

describe("required derived vocabulary is a third outcome, not a flavour of artifact", () => {
  const withVerdict = (v: Record<string, unknown>) => check(ledgerOf({ verdicts: { "a.b": v as never, "c.d": { disposition: "unresolved" } } }));

  it("demands BOTH halves of the classification, because either alone is a different verdict", () => {
    const p = withVerdict({ disposition: "required-derived-vocabulary", reason: "r" }).problems;
    expect(p).toContain("a.b: required-derived-vocabulary without saying what it is derivable from");
    expect(p).toContain("a.b: required-derived-vocabulary without naming the authority that requires the name");
    expect(
      withVerdict({ disposition: "required-derived-vocabulary", reason: "r", derivableFrom: "x", requiredBy: "y" }).problems,
    ).toEqual([]);
  });

  it("is the one decided verdict whose coordinate must REMAIN, so drift runs the other way", () => {
    const v = { "a.b": { disposition: "required-derived-vocabulary" as const, reason: "r", derivableFrom: "x", requiredBy: "y" }, "c.d": { disposition: "unresolved" as const } };
    // Present: the verdict holds.
    expect(verdictDrift(ledgerOf({ verdicts: v }), new Set(["a.b"]), new Set())).toEqual([]);
    // Gone: the verdict claimed the kernel keeps it, so its absence falsifies it.
    expect(verdictDrift(ledgerOf({ verdicts: v }), new Set(), new Set())).toEqual([
      "a.b: recorded required-derived-vocabulary, which claims the kernel keeps it, but it is gone",
    ]);
  });

  it("accounts for its coordinate without owning it: decided, live, and not an orphan", () => {
    // The third accounting mode. Without it, adjudicating a coordinate as
    // required vocabulary would immediately orphan it — the invariant would
    // punish the one verdict that says the coordinate legitimately persists.
    const orphans = orphanedCoordinates([]).map((o) => o.coordinate);
    const x = orphans[0];
    const decided: ExperimentBasis = {
      file: "subtraction-vocab.json",
      spec: "REL-VOCAB-01",
      frozenAt: "0000000",
      candidates: [x],
      unresolved: [],
      retained: [x],
    };
    expect(orphanedCoordinates([decided]).map((o) => o.coordinate)).not.toContain(x);
  });
});

describe("the gate is a slice obligation, not repo admission", () => {
  it("is not wired into CI or any hook", () => {
    // Terminal at zero. A standing gate keyed to this experiment would fire
    // inside later slices that neither caused nor can discharge it.
    const repo = path.resolve(__dirname, "../../../..");
    const ci = path.join(repo, ".github/workflows/ci.yml");
    if (fs.existsSync(ci)) expect(fs.readFileSync(ci, "utf-8")).not.toContain("analytical:subtraction");
    const hooks = path.join(repo, ".caws/hooks");
    if (fs.existsSync(hooks)) {
      for (const f of fs.readdirSync(hooks)) {
        const p = path.join(hooks, f);
        if (fs.statSync(p).isFile()) expect(fs.readFileSync(p, "utf-8"), f).not.toContain("analytical:subtraction");
      }
    }
  });

  it("reads a ledger file rather than requiring one to exist at a fixed path", () => {
    // So the ledger can become historical evidence after the slice closes.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "subtraction-"));
    const file = path.join(dir, "elsewhere.json");
    fs.writeFileSync(file, JSON.stringify(ledgerOf({})));
    expect(checkSubtraction(file).unresolved).toEqual(["a.b", "c.d"]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("a PRESENCE witness needs a pair the erasure is a no-op on one side of", () => {
  // Collision alone is not enough to make a pair evidence for a presence coordinate:
  // `evidence.rows.*#present`'s pair collides because erasing presence destroys the rows'
  // CONTENT, and both sides carry rows. The shape that makes the measurement about presence is
  // a pair where the erasure changes one side and not the other -- collision then says that
  // side IS the other minus the holder.
  const presencePairs = (s = specimens()): string[] => {
    const plans = loadPlans();
    const oracle = loadOracle();
    const baseline = s.fixtures.map(canonical);
    const outcomeOf = (id: string) => oracle.outcomeOf(id)?.outcome;
    const outcomeDiffers = (a: ReturnType<typeof outcomeOf>, b: ReturnType<typeof outcomeOf>) =>
      a !== undefined && b !== undefined && (a.status !== b.status || JSON.stringify(a.codes) !== JSON.stringify(b.codes) || JSON.stringify(a.terms) !== JSON.stringify(b.terms));
    const unresolved = live.basis.candidates.filter((id) => (live.verdicts[id]?.disposition ?? "unresolved") === "unresolved");
    expect(unresolved.length, "an empty sweep would prove nothing").toBeGreaterThan(0);

    const found: string[] = [];
    for (const id of unresolved) {
      const plan = plans.get(id);
      if (!plan) continue;
      const changes = s.fixtures.map((f) => wouldChange(f, plan));
      if (!changes.some(Boolean) || changes.every(Boolean)) continue; // no no-op side to pair against
      const sig = s.fixtures.map((f, i) => (changes[i] ? canonical(executePlan(f, plan)) : baseline[i]));
      const blocks = new Map<string, number[]>();
      sig.forEach((x, i) => blocks.set(x, [...(blocks.get(x) ?? []), i]));
      let hit = false;
      for (const idx of blocks.values())
        for (let x = 0; x < idx.length && !hit; x++)
          for (let y = x + 1; y < idx.length && !hit; y++)
            if (baseline[idx[x]] !== baseline[idx[y]] && changes[idx[x]] !== changes[idx[y]] && outcomeDiffers(outcomeOf(s.fixtures[idx[x]].id), outcomeOf(s.fixtures[idx[y]].id))) hit = true;
      if (hit) found.push(id);
    }
    return found.sort();
  };

  it("now finds NONE, because the two it did find are adjudicated — and neither emptiness is vacuous", () => {
    // The sweep returned exactly two before REL-ISOLATION-SLOT-LOCAL-01: both bin.closure
    // spellings, whose pair is ideal and was refused on ERASURE_NOT_ISOLATED. The exemption's
    // scope was corrected rather than its principle, so both are now `witnessed` and a sweep
    // over the UNRESOLVED set legitimately finds nothing. The assertion below is what keeps
    // that from being a silent vacuity: if the pair were ever un-adjudicated, the sweep would
    // have to find it again.
    expect(presencePairs()).toEqual([]);
    for (const id of ["relation.derivedBy.bin.closure", "relation.derivedBy.bin.closure:left-closed~<absent>"]) {
      expect(live.verdicts[id]?.disposition, `${id} must be adjudicated, or the empty sweep is vacuous`).toBe("witnessed");
    }
  });

  // Collision search over the 212-specimen population; timed out at the 5s
  // default in the retained 2026-09-19 worktree run
  // (FIX-CLOSURE-LEDGER-AUTHORITY-TIMEOUT-01).
  it("and evidence.rows.*#present has none, so its refusal is a MISSING FIXTURE SHAPE and not a mis-chosen pair", { timeout: 30_000 }, () => {
    // The population varies rows presence widely -- 162 of 212 specimens carry no `evidence.rows`
    // at all, and 129 of those are oracle-bound -- so the earlier record's implication that a
    // better pair could simply be picked is wrong. What the corpus lacks is a fixture that IS
    // another fixture plus rows, which is the shape collision requires: erasing presence leaves
    // a row-less fixture unchanged, so colliding with one means the other must equal it exactly
    // once its rows are gone.
    const s = specimens();
    const oracle = loadOracle();
    const rowless = s.fixtures.filter((f) => (f as unknown as { evidence?: { rows?: unknown } }).evidence?.rows === undefined);
    expect(rowless.length).toBe(163);
    expect(rowless.filter((f) => oracle.outcomeOf(f.id)).length).toBe(130);
    expect(presencePairs(s)).not.toContain("evidence.rows.*#present");
  });
});
