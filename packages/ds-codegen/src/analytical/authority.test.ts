/**
 * The identities are a partition of the code that can move a recorded verdict,
 * and this is what keeps that claim from being a hand-maintained assertion.
 *
 * The failure it exists to catch is under-claiming. A helper extracted into a
 * new file leaves every declared list intact and every digest computable, so a
 * list checked only against itself stays green while the identity has stopped
 * covering the thing it names. The walk over the import graph is the only part
 * of this that cannot be satisfied by editing a list.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COORDINATE_BASIS,
  COMPOSITE_OUTPUT_BASIS,
  digestOf,
  ERASURE_AUTHORITY,
  footprintBasisDigest,
  IDENTITIES,
  moduleClosure,
  ownerOf,
  PEER_TEXT_BASIS,
  UNIDENTIFIED_MODULES,
  WITNESS_AUTHORITY,
  authorityIdentities,
} from "./authority.js";
import { loadPlans } from "./census.js";
import { checkClosures } from "./closure.js";
import { gateProblems, loadReport } from "./erasure-audit.js";
import { executePlan } from "./erasure-plan.js";
import { adjudicationKey, checkFreeze, loadFreeze } from "./freeze.js";
import { CONTRACTS_DIR, RULE_SOURCES } from "./necessity.js";
import { QUOTIENT_SCHEMA_VERSION } from "./quotient-image.js";
import { canonical } from "./quotient.js";
import type { Fixture } from "./structure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ruleModules = new Set(RULE_SOURCES.map((p) => path.basename(p)));

describe("the identities partition the code that can move a verdict", () => {
  it("no module is owned twice, so a moved digest names exactly one cause", () => {
    const seen = new Map<string, string>();
    for (const i of IDENTITIES) {
      for (const f of i.owns) {
        expect(seen.get(f), `${f} is owned by both ${seen.get(f)} and ${i.name}`).toBeUndefined();
        seen.set(f, i.name);
      }
    }
    // And no identity claims a rule source: a changed rule and a changed
    // erasure are different invalidation causes and must stay distinguishable.
    for (const [f, owner] of seen) expect(ruleModules.has(f), `${f} is claimed by ${owner} and by RULE_SOURCES`).toBe(false);
  });

  it("every module an identity can REACH is owned by some identity, is a rule source, or is excluded with a reason", () => {
    for (const i of IDENTITIES) {
      const unaccounted = [...moduleClosure(i.entryPoints)].filter((f) => ownerOf(f) === undefined && !ruleModules.has(f) && !(f in i.excluded)).sort();
      expect(unaccounted, `reachable from ${i.name} but neither digested nor excused`).toEqual([]);
    }
  });

  it("every production module in the directory has a disposition, whether or not any walk reaches it", () => {
    // Reachability is not the completeness rule. `localImports` reads static
    // relative specifiers, so a module reached only through a deferred
    // `import()` is invisible to the walk — which is how `stimulus.ts` and
    // `final-quotient.ts` both came to govern evidence with no identity moving
    // when they changed. Totality over the directory is the rule; the walk
    // above is a second check.
    const modules = fs
      .readdirSync(HERE)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .sort();
    const undisposed = modules.filter((f) => ownerOf(f) === undefined && !ruleModules.has(f) && !(f in UNIDENTIFIED_MODULES)).sort();
    expect(undisposed, "in the analytical directory but neither owned, a rule source, nor listed in UNIDENTIFIED_MODULES").toEqual([]);

    // The list may not rot in the other direction either: an entry naming a
    // module that no longer exists, or one that some identity now owns, would
    // read as a considered exemption while being noise.
    for (const [f, reason] of Object.entries(UNIDENTIFIED_MODULES)) {
      expect(modules.includes(f), `UNIDENTIFIED_MODULES names ${f}, which is not a production module here`).toBe(true);
      expect(ownerOf(f), `${f} is listed as unidentified and also owned`).toBeUndefined();
      expect(ruleModules.has(f), `${f} is listed as unidentified and is also a rule source`).toBe(false);
      expect(reason.trim().length, `${f} is exempted with no reason`).toBeGreaterThan(10);
    }
  });

  it("every exclusion is actually reachable, so the excuse list cannot rot", () => {
    for (const i of IDENTITIES) {
      const reached = moduleClosure(i.entryPoints);
      for (const [f, reason] of Object.entries(i.excluded)) {
        expect(reached.has(f), `${i.name} excuses ${f}, which nothing it imports reaches`).toBe(true);
        expect(reason.trim().length, `${i.name}/${f} is excused with no reason`).toBeGreaterThan(10);
      }
    }
  });

  it("an owned module is reachable from its own identity's entry points", () => {
    // The other direction: a list may not name a module the identity does not
    // actually depend on, which would bind evidence to unrelated churn.
    for (const i of IDENTITIES) {
      const reached = moduleClosure(i.entryPoints);
      for (const f of i.owns) expect(reached.has(f), `${i.name} owns ${f} but does not reach it`).toBe(true);
    }
  });

  it("catches a rule or helper that moves into an undeclared module", () => {
    // Falsification. `moduleClosure` is given a directory whose graph contains a
    // module no identity declares, and the same check that passes above fails.
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "authority-"));
    fs.writeFileSync(path.join(dir, "entry.ts"), 'import { x } from "./extracted.js";\nexport const y = x;\n');
    fs.writeFileSync(path.join(dir, "extracted.ts"), "export const x = 1;\n");
    const reached = moduleClosure(["entry.ts"], dir);
    expect([...reached].sort()).toEqual(["entry.ts", "extracted.ts"]);
    expect([...reached].filter((f) => ownerOf(f) === undefined && !ruleModules.has(f))).toEqual(["entry.ts", "extracted.ts"]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("a digest is an identity, not a checksum of a pile of bytes", () => {
  it("text consumer changes move their own identity without restamping selected meaning or Stage 2", () => {
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "peer-authority-"));
    const identities = [PEER_TEXT_BASIS, COMPOSITE_OUTPUT_BASIS, WITNESS_AUTHORITY];
    try {
      for (const identity of identities) for (const file of identity.owns) fs.copyFileSync(path.join(HERE, file), path.join(dir, file));
      const before = identities.map(identity => digestOf(identity, dir));
      fs.appendFileSync(path.join(dir, "peer-text-probe.ts"), "\n// changed consumer\n");
      const after = identities.map(identity => digestOf(identity, dir));
      expect(after[0]).not.toBe(before[0]);
      expect(after.slice(1)).toEqual(before.slice(1));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it("distinguishes the same bytes arranged under different names", () => {
    // Two identities over the same file set but different names must differ, or
    // the digest is over a concatenation and a rename is invisible to it.
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "authority-"));
    fs.writeFileSync(path.join(dir, "a.ts"), "one");
    fs.writeFileSync(path.join(dir, "b.ts"), "two");
    fs.writeFileSync(path.join(dir, "c.ts"), "onetwo");
    fs.writeFileSync(path.join(dir, "d.ts"), "");
    const id = (owns: string[]) => ({ ...COORDINATE_BASIS, owns, artifacts: [] });
    expect(digestOf(id(["a.ts", "b.ts"]), dir)).not.toBe(digestOf(id(["c.ts", "d.ts"]), dir));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("moves when an owned source moves, and only then", () => {
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "authority-"));
    fs.writeFileSync(path.join(dir, "a.ts"), "one");
    fs.writeFileSync(path.join(dir, "unowned.ts"), "three");
    const id = { ...ERASURE_AUTHORITY, owns: ["a.ts"], artifacts: [] };
    const before = digestOf(id, dir);
    fs.writeFileSync(path.join(dir, "unowned.ts"), "changed");
    expect(digestOf(id, dir)).toBe(before);
    fs.writeFileSync(path.join(dir, "a.ts"), "one!");
    expect(digestOf(id, dir)).not.toBe(before);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("moves when a committed ARTIFACT moves, though no source did", () => {
    // The case a source-only digest misses: the emitted schema is a second
    // place the same decision lives, and evidence bound only to the generator
    // would not notice it going stale.
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "authority-"));
    const contracts = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "contracts-"));
    fs.writeFileSync(path.join(dir, "a.ts"), "one");
    fs.writeFileSync(path.join(contracts, "s.json"), "{}");
    const id = { ...ERASURE_AUTHORITY, owns: ["a.ts"], artifacts: ["s.json"] };
    const before = digestOf(id, dir, contracts);
    fs.writeFileSync(path.join(contracts, "s.json"), '{"x":1}');
    expect(digestOf(id, dir, contracts)).not.toBe(before);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(contracts, { recursive: true, force: true });
  });

  it("the three live digests are distinct, and each is a sha256", () => {
    const ids = authorityIdentities(QUOTIENT_SCHEMA_VERSION);
    const values = [ids.coordinateBasisDigest, ids.erasureAuthorityDigest, ids.witnessAuthorityDigest];
    for (const v of values) expect(v).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(values).size).toBe(3);
    expect(ids.quotientSchemaVersion).toBe(QUOTIENT_SCHEMA_VERSION);
  });

  it("every identity is over at least one owned source, and names what it invalidates", () => {
    for (const i of IDENTITIES) {
      expect(i.owns.length, `${i.name} owns nothing`).toBeGreaterThan(0);
      expect(i.invalidates.trim().length, `${i.name} does not say what it invalidates`).toBeGreaterThan(30);
      for (const f of i.owns) expect(fs.existsSync(path.join(HERE, f)), `${i.name} owns ${f}, which does not exist`).toBe(true);
    }
  });
});

describe("the specimen population is a SEPARATE identity", () => {
  it("is order-independent, since a population is a set and not a listing", () => {
    expect(footprintBasisDigest(["b", "a", "c"])).toBe(footprintBasisDigest(["a", "b", "c"]));
  });

  it("moves when the population changes, in either direction", () => {
    const base = footprintBasisDigest(["a", "b"]);
    expect(footprintBasisDigest(["a", "b", "c"])).not.toBe(base);
    expect(footprintBasisDigest(["a"])).not.toBe(base);
  });

  it("is not the erasure identity: growing the population must not reject a witness", () => {
    // The reason the two are apart. A footprint claim is population-sensitive —
    // "no specimen separates this" is a statement about the specimens — while a
    // witness is existential and survives the population growing.
    const ids = authorityIdentities(QUOTIENT_SCHEMA_VERSION);
    expect(footprintBasisDigest(["a", "b"])).not.toBe(ids.erasureAuthorityDigest);
    expect(footprintBasisDigest(["a", "b"])).not.toBe(ids.witnessAuthorityDigest);
  });
});

describe("the witness identity covers ADMISSION, not only image production", () => {
  it("owns the module that decides a witness holds and the module that decides a closure is discharged", () => {
    expect(WITNESS_AUTHORITY.owns).toContain("necessity.ts");
    expect(WITNESS_AUTHORITY.owns).toContain("closure.ts");
  });

  it("changing the isolation boundary moves the witness digest while every image is untouched", () => {
    // The property the erasure digest alone cannot have. `isolationViolation`
    // lives in `necessity.ts` and produces no image at all; a change to it moves
    // every witness verdict and would leave an erasure-only identity unmoved.
    //
    // Demonstrated over a COPY of the two identities' owned files. Editing the
    // real `necessity.ts` would prove the same thing and leave the tree
    // corrupted if the run were interrupted, which is not a trade worth making
    // for a test about bookkeeping.
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "authority-"));
    const contracts = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "contracts-"));
    for (const f of [...WITNESS_AUTHORITY.owns, ...ERASURE_AUTHORITY.owns]) fs.copyFileSync(path.join(HERE, f), path.join(dir, f));
    for (const a of ERASURE_AUTHORITY.artifacts) fs.copyFileSync(path.join(CONTRACTS_DIR, a), path.join(contracts, path.basename(a)));
    const erasureHere = { ...ERASURE_AUTHORITY, artifacts: ERASURE_AUTHORITY.artifacts.map((a) => path.basename(a)) };

    const witnessBefore = digestOf(WITNESS_AUTHORITY, dir, contracts);
    const erasureBefore = digestOf(erasureHere, dir, contracts);
    fs.appendFileSync(path.join(dir, "necessity.ts"), "\n// the isolation boundary moved\n");
    expect(digestOf(WITNESS_AUTHORITY, dir, contracts), "the witness identity did not notice its admission code move").not.toBe(witnessBefore);
    expect(digestOf(erasureHere, dir, contracts), "the erasure identity moved although no image can have changed").toBe(erasureBefore);

    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(contracts, { recursive: true, force: true });
  });
});

/**
 * EVIDENCE EARNED UNDER ONE DEFINITION OF LAWFUL ERASURE IS REFUSED UNDER
 * ANOTHER, and the wrong operation fails the behavioural law -- not merely a
 * digest comparison.
 *
 * The analytical modules are relocated to a scratch tree that resolves its
 * contracts, docs and package dependencies exactly as the real one does, and
 * ONE operation is changed in the copy: arity truncates to one whatever the
 * declaration's floor -- a legal-looking, in-slot, idempotent change. The
 * copy's OWN live report and freeze are then handed to THIS tree's consumers.
 * Nothing is stubbed: the identities are digested over the copy's bytes by the
 * copy's own authority module, and the reports are computed by the copy's own
 * audit and freeze modules over the same specimens. The unmutated relocation
 * runs first, so a refusal cannot be an artefact of relocating.
 */
describe("evidence earned under one erasure definition is refused under another", () => {
  const ROOT = path.resolve(HERE, "../../../..");
  const relocate = (mutate?: { file: string; from: string; to: string }): { dir: string; remove: () => void } => {
    fs.mkdirSync(path.join(ROOT, "tmp"), { recursive: true });
    const scratch = fs.mkdtempSync(path.join(ROOT, "tmp", "authority-"));
    const dir = path.join(scratch, "packages/ds-codegen/src/analytical");
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(HERE)) if (f.endsWith(".ts") && !f.endsWith(".test.ts")) fs.copyFileSync(path.join(HERE, f), path.join(dir, f));
    fs.symlinkSync(path.join(ROOT, "packages/ds-contracts"), path.join(scratch, "packages/ds-contracts"));
    fs.symlinkSync(path.join(ROOT, "docs"), path.join(scratch, "docs"));
    // The package's own dependencies (ajv, zod) live beside the package, not at the root.
    fs.symlinkSync(path.join(ROOT, "packages/ds-codegen/node_modules"), path.join(scratch, "packages/ds-codegen/node_modules"));
    if (mutate) {
      const p = path.join(dir, mutate.file);
      const src = fs.readFileSync(p, "utf-8");
      expect(src.split(mutate.from), `${mutate.file}: the anchor must match exactly once`).toHaveLength(2);
      fs.writeFileSync(p, src.replace(mutate.from, mutate.to));
    }
    return { dir, remove: () => fs.rmSync(scratch, { recursive: true, force: true }) };
  };
  const load = async (dir: string) => ({
    authority: (await import(/* @vite-ignore */ path.join(dir, "authority.ts"))) as typeof import("./authority.js"),
    audit: (await import(/* @vite-ignore */ path.join(dir, "erasure-audit.ts"))) as typeof import("./erasure-audit.js"),
    freeze: (await import(/* @vite-ignore */ path.join(dir, "freeze.ts"))) as typeof import("./freeze.js"),
    plan: (await import(/* @vite-ignore */ path.join(dir, "erasure-plan.ts"))) as typeof import("./erasure-plan.js"),
    quotient: (await import(/* @vite-ignore */ path.join(dir, "quotient.ts"))) as typeof import("./quotient.js"),
    quotientImage: (await import(/* @vite-ignore */ path.join(dir, "quotient-image.ts"))) as typeof import("./quotient-image.js"),
    closure: (await import(/* @vite-ignore */ path.join(dir, "closure.ts"))) as typeof import("./closure.js"),
  });
  /** Arity truncates to ONE whatever the floor. In-slot, idempotent, schema-shaped; wrong. */
  const TRUNCATE_TO_ONE = {
    file: "erasure-plan.ts",
    from: "if (Array.isArray(v)) write(s, v.slice(0, plan.locator.operandMirror ? (mirrorFloor(copy, s, plan.locator.operandMirror) ?? floor) : floor));",
    to: "if (Array.isArray(v)) write(s, v.slice(0, 1));",
  };
  const nest = (levels: string[]): Fixture =>
    ({ id: "FX_LAW", structure: { relations: { r: { fields: {}, derivedBy: { kind: "nest", from: "s", levels } } } }, assertions: [] }) as unknown as Fixture;

  it("the relocation itself is faithful: unmutated, every identity agrees and both consumers accept", async () => {
    const copy = relocate();
    try {
      const m = await load(copy.dir);
      expect(m.authority.authorityIdentities(QUOTIENT_SCHEMA_VERSION)).toEqual(authorityIdentities(QUOTIENT_SCHEMA_VERSION));
      expect(gateProblems(loadReport(), m.audit.computeReport())).toEqual([]);
      expect(checkFreeze(loadFreeze(), m.freeze.computeFreeze({}, loadFreeze().fixtures)).ok).toBe(true);
      expect(m.closure.checkClosures().problems).toEqual([]);
    } finally {
      copy.remove();
    }
  }, 60_000);

  it("a wrong-but-local operation fails the law, moves exactly the erasure identity, and both consumers refuse the evidence earned under the old one", async () => {
    const copy = relocate(TRUNCATE_TO_ONE);
    try {
      const m = await load(copy.dir);

      // THE BEHAVIOURAL FAILURE FIRST -- the proof; the digest below is only
      // attribution. Two lists above the floor that differ in a position the
      // floor KEEPS: lawful forgetting separates them ([a,b] vs [a,c]); the
      // wrong operation identifies them ([a] vs [a]).
      const plan = loadPlans().get("relation.derivedBy.nest.levels#arity")!;
      expect(plan.locator.arityFloor).toBe(2);
      const [abc, acb] = [nest(["a", "b", "c"]), nest(["a", "c", "b"])];
      expect(canonical(executePlan(abc, plan))).not.toBe(canonical(executePlan(acb, plan)));
      expect(m.quotient.canonical(m.plan.executePlan(abc, plan))).toBe(m.quotient.canonical(m.plan.executePlan(acb, plan)));

      // THE IDENTITY, BY CAUSE: what an erasure does moved, and nothing else.
      const here = authorityIdentities(QUOTIENT_SCHEMA_VERSION);
      const there = m.authority.authorityIdentities(QUOTIENT_SCHEMA_VERSION);
      expect((Object.keys(here) as (keyof typeof here)[]).filter((k) => here[k] !== there[k])).toEqual(["erasureAuthorityDigest"]);

      // THE CONSUMERS, over the copy's OWN report and freeze. The footprint
      // gate names the cause with both endpoints...
      const problems = gateProblems(loadReport(), m.audit.computeReport());
      expect(problems).toContain(
        `consistency: authority erasureAuthorityDigest moved since the report was recorded: ${here.erasureAuthorityDigest} -> ${there.erasureAuthorityDigest}`,
      );
      // ...and, for THIS mutant, the population moved too: the synthesized
      // arity pairs stop separating under an operation that truncates both
      // sides to one, so they are discarded and every footprint classification
      // bound to the population is rejected with them.
      expect(problems).toContain("consistency: the specimen population moved: every footprint classification bound to footprintBasisDigest is rejected");
      // ...and the freeze diverges on exactly that transition, adjudicable only by its endpoints.
      const fr = checkFreeze(loadFreeze(), m.freeze.computeFreeze({}, loadFreeze().fixtures));
      expect(fr.ok).toBe(false);
      expect(fr.divergences.map(adjudicationKey)).toContain(`authority:erasureAuthorityDigest@${here.erasureAuthorityDigest}->${there.erasureAuthorityDigest}`);
    } finally {
      copy.remove();
    }
  }, 60_000);

  /**
   * "WHEN ANY OF THOSE INPUTS MOVES." The criterion names six; each is one row
   * here, changed in the copy by one line, and the consumers refuse by the cause
   * the partition assigns it. The locator machinery is the coordinate basis, not
   * the erasure authority -- a locator decides WHERE a coordinate lives, and the
   * evidence is bound to that identity too -- so its row is expected to move
   * coordinateBasisDigest and nothing else. The schema version moves two: the
   * module that declares it is owned by the erasure authority, and the version
   * itself is an identity.
   */
  const INPUTS: { input: string; mutate: { file: string; from: string; to: string }; moves: string[] }[] = [
    {
      input: "the canonical quotient-image serializer (attribution kept, so two images differing only by which erasure opened a hole stop colliding)",
      mutate: { file: "quotient.ts", from: 'if (isForgotten(v)) return { [Q]: "forgotten" };', to: "if (isForgotten(v)) return v;" },
      moves: ["erasureAuthorityDigest"],
    },
    {
      input: "the ordering graph (ties and edges reversed)",
      mutate: {
        file: "erasure-plan.ts",
        from: "return [...plans].sort((a, b) => rank(a.id, new Set()) - rank(b.id, new Set()));",
        to: "return [...plans].sort((a, b) => rank(b.id, new Set()) - rank(a.id, new Set()));",
      },
      moves: ["erasureAuthorityDigest"],
    },
    {
      input: "the quotient schema version",
      mutate: { file: "quotient-image.ts", from: "export const QUOTIENT_SCHEMA_VERSION = 1;", to: "export const QUOTIENT_SCHEMA_VERSION = 2;" },
      moves: ["erasureAuthorityDigest", "quotientSchemaVersion"],
    },
    {
      input: "the schema-derived locator machinery (the declaration's arity floor no longer rides on the locator)",
      mutate: {
        file: "census.ts",
        from:
          "const locator: StructuralLocator = {\n      path: rawPath,\n      steps,\n      ...(arityFloor !== undefined ? { arityFloor } : {}),\n      ...(operand\n        ? {\n            operand: operand.namespace,\n            ...(operand.distinctFrom ? { operandDistinctFrom: operand.distinctFrom } : {}),\n            ...(operand.mirrors ? { operandMirror: operand.mirrors } : {}),\n          }\n        : {}),\n    };",
        to: "const locator: StructuralLocator = {\n      path: rawPath,\n      steps,\n      ...(operand\n        ? {\n            operand: operand.namespace,\n            ...(operand.distinctFrom ? { operandDistinctFrom: operand.distinctFrom } : {}),\n            ...(operand.mirrors ? { operandMirror: operand.mirrors } : {}),\n          }\n        : {}),\n    };",
      },
      moves: ["coordinateBasisDigest"],
    },
  ];
  for (const row of INPUTS) {
    it(`moving ${row.input} is refused by both consumers, by cause`, async () => {
      const copy = relocate(row.mutate);
      try {
        const m = await load(copy.dir);
        const here = authorityIdentities(QUOTIENT_SCHEMA_VERSION) as unknown as Record<string, string | number>;
        const there = m.authority.authorityIdentities(m.quotientImage.QUOTIENT_SCHEMA_VERSION) as unknown as Record<string, string | number>;
        expect(Object.keys(here).filter((k) => here[k] !== there[k]).sort()).toEqual([...row.moves].sort());
        const problems = gateProblems(loadReport(), m.audit.computeReport());
        const fr = checkFreeze(loadFreeze(), m.freeze.computeFreeze({}, loadFreeze().fixtures));
        expect(fr.ok).toBe(false);
        for (const k of row.moves) {
          expect(problems).toContain(`consistency: authority ${k} moved since the report was recorded: ${here[k]} -> ${there[k]}`);
          expect(fr.divergences.map(adjudicationKey)).toContain(`authority:${k}@${here[k]}->${there[k]}`);
        }
      } finally {
        copy.remove();
      }
    }, 60_000);
  }

  /**
   * CLOSURE EVIDENCE IS BOUND AND RE-EARNED. What the ledger records -- each
   * closure's normalization, footprints, minimum raw edit, promotion and
   * dependencies -- are CLAIMS that `checkClosures` derives again from the live
   * census, executor and witnesses and compares; and the ledger carries the
   * authority those claims were verified under, so a moved identity refuses it
   * by its stamp even where every derivation still agrees. Both arms are shown
   * here: change how a footprint is computed (locator containment) in the copy,
   * and the copy's own closure gate refuses the ledger for its stamp AND for the
   * recorded normalizations (and the dependencies declared from them).
   */
  it("closure evidence is bound AND re-derived: a moved erasure authority refuses the ledger by its stamp, and a moved footprint rule refuses the recorded normalizations", async () => {
    // Containment is what a footprint is computed by: with it false, every
    // derived footprint collapses to the plan itself and the recorded ones no
    // longer equal the derived set.
    const copy = relocate({
      file: "erasure-plan.ts",
      from: "return a.length <= b.length && a.every((s, i) => JSON.stringify(s) === JSON.stringify(b[i]));",
      to: "return false;",
    });
    try {
      const m = await load(copy.dir);
      const r = m.closure.checkClosures();
      expect(r.problems.filter((p) => /^closure ledger authored under a different erasureAuthorityDigest: /.test(p))).toHaveLength(1);
      expect(r.problems.filter((p) => /authored normalization does not equal the derived set/.test(p)).length).toBeGreaterThan(0);
      // And the identity moved with it, so a RECORD bound to it (the footprint report) is refused as well.
      const there = m.authority.authorityIdentities(QUOTIENT_SCHEMA_VERSION);
      expect(there.erasureAuthorityDigest).not.toBe(authorityIdentities(QUOTIENT_SCHEMA_VERSION).erasureAuthorityDigest);
    } finally {
      copy.remove();
    }
  }, 60_000);

  /**
   * NON-CONFLUENCE IS REFUSED, NOT NORMALIZED. Without the derived
   * branch-before-discriminator edge, a closure's normalization plans and its
   * carrier compose differently under different listings. A copy in that state
   * must not evaluate obligations 4-6 under whichever order `checkClosure`
   * happens to write: its own gate refuses each such set as evidence, by name.
   * This tree's executor, with the edge, reads the same ledger as confluent --
   * so the refusal is a fact about the executor, not about the ledger.
   */
  it("a copy without the derived ordering edge refuses its closure sets as non-confluent instead of normalizing them through one listing", async () => {
    const copy = relocate({
      file: "erasure-plan.ts",
      from: "...(p ? derivedRunAfter(p, plans) : [])",
      to: "...[]",
    });
    try {
      const m = await load(copy.dir);
      const gate = m.closure.checkClosures();
      const refusals = gate.problems.filter((p) => / is not confluent on stimulus /.test(p));
      const withStimuli = m.closure.loadClosures().closures.filter((c) => c.a !== undefined && c.b !== undefined);
      // Refused means NOT READ: obligations 4-6 are unevaluable with the refusal
      // as their detail, never evaluated under the order the checker listed.
      for (const c of withStimuli) {
        const check = gate.checks.find((x) => x.carrier === c.carrier)!;
        for (const id of ["4-carrier-insufficient-before-normalization", "5-complete-closure-sufficiency", "6-normalization-is-not-the-cited-cause"]) {
          const o = check.obligations.find((x) => x.id === id)!;
          expect(o.unevaluable, `${c.carrier} ${id}`).toBe(true);
          expect(o.detail).toBe("the plan set is not confluent; refused as evidence");
        }
      }
      // Without the edge, EVERY closure that has stimuli is refused, so no
      // closure's collision evidence is admitted through an accidental order.
      // Five carriers carry stimuli: the additivity pair, `aggregate-to-grain~project`,
      // and the two whose receipt pairs discharge obligations 3-6.
      expect(withStimuli.length).toBe(5);
      const refusedCarriers = [...new Set(refusals.map((p) => p.split(": ")[0]))].sort();
      expect(refusedCarriers).toEqual(withStimuli.map((c) => c.carrier).sort());
      for (const p of refusals) expect(p).toMatch(/ \(2 distinct images across its listings\); refused as evidence rather than normalized through one order$/);
      expect(checkClosures().problems.filter((p) => / is not confluent on stimulus /.test(p))).toEqual([]);
      const there = m.authority.authorityIdentities(QUOTIENT_SCHEMA_VERSION);
      expect(there.erasureAuthorityDigest).not.toBe(authorityIdentities(QUOTIENT_SCHEMA_VERSION).erasureAuthorityDigest);
    } finally {
      copy.remove();
    }
  }, 60_000);
});
