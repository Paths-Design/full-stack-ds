/**
 * The identities recorded evidence is bound to, and what each one invalidates.
 *
 * A digest here is ATTRIBUTION, never correctness. The tests prove behaviour;
 * an identity proves that a recorded verdict still refers to the behaviour it
 * was recorded against. When one moves, the evidence bound to it is rejected
 * and re-earned rather than silently re-read.
 *
 * THE IDENTITIES ARE A PARTITION, and that is the whole design. A single
 * "everything the harness touches" digest answers "something moved" — which is
 * the least useful thing it could say, because every cause looks alike and
 * re-recording becomes a ritual. Here each module is owned by exactly one
 * identity, so a moved digest names its cause: the coordinates changed, or what
 * an erasure does changed, or what admits a witness changed, or a RULE changed.
 * `RULE_SOURCES` in `necessity.ts` is another member of that partition and is
 * deliberately not restated here; a changed rule digest and a changed erasure
 * digest are different causes and must not collapse into one another.
 *
 * WHAT KEEPS THE OWNERSHIP HONEST is not this file — a hand-maintained list can
 * always under-claim, which is exactly how `alphaRename` came to sit inside the
 * judgment surface unnoticed. It is `authority.test.ts`, which walks the local
 * import graph from each identity's entry points and requires every module it
 * reaches to be owned by some identity or excluded with a reason. Extracting a
 * helper into a new file is reached through its import and reported.
 *
 * It imports nothing local, on purpose: a module in an identity's closure
 * cannot also be the module that defines the closure.
 */
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS = path.resolve(HERE, "../../../ds-contracts");

const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

export type AuthorityName = "coordinateBasis" | "erasureAuthority" | "witnessAuthority" | "graphViewBasis" | "compositeOutputBasis";

export interface AuthorityIdentity {
  name: AuthorityName;
  /** What a change to this identity invalidates, in one line. */
  invalidates: string;
  /** Where the import walk starts. */
  entryPoints: readonly string[];
  /**
   * The modules this identity is the identity OF.
   *
   * Sorted, and disjoint from every other identity's list. The digest is over
   * these bytes in this order, with each module's NAME joined in — so moving a
   * function between two owned files changes the digest even though the
   * concatenated bytes could be arranged not to.
   */
  owns: readonly string[];
  /**
   * Modules this identity's closure reaches that it does not own, each with the
   * reason. `owned by <name>` is the common one and is not a hand-wave: it says
   * the module is digested, under a different cause.
   */
  excluded: Readonly<Record<string, string>>;
  /**
   * Committed artifacts whose bytes join the digest.
   *
   * A generated file is a second place the same decision lives. `census.ts` can
   * be unchanged while the emitted schema it reads has moved, and evidence
   * bound only to the source would not notice.
   */
  artifacts: readonly string[];
}

/**
 * WHICH COORDINATES EXIST, and where in a representation each one lives.
 *
 * `relation-model.ts` is owned here rather than merely excused. It is the zod
 * model every schema is emitted from, so it decides the coordinate basis
 * outright; `RULE_SOURCES` excludes it because it settles well-formedness and
 * not what a structure yields, which is a statement about judgments and says
 * nothing about which coordinates there are to judge.
 */
export const COORDINATE_BASIS: AuthorityIdentity = {
  name: "coordinateBasis",
  invalidates: "any verdict that names a coordinate id, since the id may now denote a different slot or none",
  entryPoints: ["census.ts"],
  owns: ["census.ts", "relation-model.ts"],
  excluded: {
    "erasure-plan.ts": "owned by erasureAuthority",
    "quotient-image.ts": "owned by erasureAuthority",
    "structure.ts": "a RULE_SOURCES module; covered by the holdout's rule digest",
  },
  artifacts: ["relation.contract.schema.json", "analytical-fixtures/assertion.schema.json", "analytical-fixtures/fixture.schema.json"],
};

/**
 * WHAT AN ERASURE DOES: the plan compiler and executor, marker semantics, the
 * ordering graph, and the canonical serializer that decides when two images are
 * the same representation.
 *
 * The spec's invariant is that this covers SOURCE and not only the declarative
 * plan registry, because two of the defects that motivated it — a slot written
 * into existence, an array element deleted as a null hole — left the registry
 * untouched and lived entirely in the executor.
 *
 * `erasure-specimens.ts` is owned for a reason that separates it from the
 * ledger writers: it synthesizes the separating pairs every footprint claim is
 * TESTED over, and that population is not itself a committed artifact. A
 * recorder whose rule changes produces a different ledger and is caught by its
 * own byte comparison; a specimen generator can produce weaker pairs for the
 * same coordinates, which is a falsifier moving with nothing to diff against.
 */
export const ERASURE_AUTHORITY: AuthorityIdentity = {
  name: "erasureAuthority",
  invalidates: "every collision, footprint and freeze entry, since the images they were measured over may differ",
  entryPoints: ["erasure-plan.ts", "quotient.ts", "quotient-image.ts", "alpha-rename.ts", "erasure-specimens.ts"],
  owns: ["alpha-rename.ts", "erasure-plan.ts", "erasure-specimens.ts", "quotient-image.ts", "quotient.ts"],
  excluded: {
    "census.ts": "owned by coordinateBasis",
    "relation-model.ts": "owned by coordinateBasis",
    "structure.ts": "a RULE_SOURCES module; covered by the holdout's rule digest",
  },
  artifacts: ["quotient-image.schema.json"],
};

/**
 * WHAT ADMITS A WITNESS: the harness that decides a witness holds, the
 * isolation check that decides an erasure was isolated, and the closure
 * machinery that decides an obligation is discharged and a carrier promotable.
 *
 * Separate from the erasure identity because it answers a different question.
 * An identity claimed to protect witness standing has to cover the code that
 * ADMITS the witness, not only the code that produces its erased images — the
 * isolation boundary can move without a single image changing, and every
 * witness verdict moves with it.
 *
 * `derivation.ts` and `codes.ts` are the instrument the isolation check runs
 * and are covered by the rule digest, which is a different cause and stays
 * that way.
 *
 * `stimulus.ts` and `final-quotient.ts` are named as entry points rather than
 * left to the walk. Both are reached only through a deferred `import()` — a
 * static import back would be a cycle — and `localImports` reads static
 * relative specifiers, out of the file TEXT, so the walk cannot see them and
 * writing one here as an example would itself register as an import. Each
 * decides what is admitted as evidence: which stimulus pairs stand for a
 * carrier, and whether the simultaneous removal set leaves every artifact
 * redundant. Reachability is not the completeness rule for that reason —
 * `authority.test.ts` requires a disposition for every module in the directory
 * and treats the walk as a second check.
 */
export const WITNESS_AUTHORITY: AuthorityIdentity = {
  name: "witnessAuthority",
  invalidates: "every witness and closure verdict, since what counts as holding may have changed",
  entryPoints: ["necessity.ts", "closure.ts", "stimulus.ts", "final-quotient.ts"],
  owns: ["capabilities.ts", "closure.ts", "corpus-integrity.ts", "experiments.ts", "final-quotient.ts", "necessity.ts", "stimulus.ts", "subtraction.ts", "support.ts"],
  excluded: {
    "census.ts": "owned by coordinateBasis",
    "relation-model.ts": "owned by coordinateBasis",
    "alpha-rename.ts": "owned by erasureAuthority",
    "erasure-plan.ts": "owned by erasureAuthority",
    "quotient-image.ts": "owned by erasureAuthority",
    "quotient.ts": "owned by erasureAuthority",
    "codes.ts": "a RULE_SOURCES module; covered by the holdout's rule digest",
    "derivation.ts": "a RULE_SOURCES module; covered by the holdout's rule digest",
    "judgment.ts": "a RULE_SOURCES module; covered by the holdout's rule digest",
    "structure.ts": "a RULE_SOURCES module; covered by the holdout's rule digest",
    "authority.ts": "defines the identities; a module inside an identity's closure cannot also be the module that defines it, and a change here moves every digest it computes",
  },
  artifacts: [],
};

/**
 * WHAT A GRAPH VIEW MEANS: the canonical declaration family whose result is a
 * graph rather than a relation, and the interpreter that denotes it.
 *
 * Its own identity on purpose. Extending `coordinateBasis` would move that
 * digest and every verdict stamped with it, for a family that is not a census
 * coordinate; a separate identity states the new family's standing without
 * silently re-stamping the existing ones.
 */
const GRAPH_VIEW_BASIS: AuthorityIdentity = {
  name: "graphViewBasis",
  invalidates: "any verdict that names a graph view id, since the id may now denote a different binding or none",
  entryPoints: ["graph-projection.ts"],
  owns: ["graph-view-model.ts", "graph-projection.ts"],
  excluded: {},
  artifacts: ["analytical-fixtures/graph-view.schema.json"],
};

/** Source identity for selected output, kept outside stage-2 witness stamps. */
export const COMPOSITE_OUTPUT_BASIS: AuthorityIdentity = {
  name: "compositeOutputBasis",
  invalidates: "attribution of composite qualification, selection and recovered output to the source that produced it",
  entryPoints: ["composite-selection.ts"],
  owns: ["composite-artifacts.ts", "composite-selection.ts", "projection.ts"],
  excluded: {
    "authority.ts": "defines the identity and digest utility; it cannot own itself, and correctness is tested independently",
  },
  artifacts: [],
};

export const IDENTITIES: readonly AuthorityIdentity[] = [COORDINATE_BASIS, ERASURE_AUTHORITY, WITNESS_AUTHORITY, GRAPH_VIEW_BASIS, COMPOSITE_OUTPUT_BASIS];

/**
 * Production modules that belong to NO identity, each with the reason.
 *
 * This exists because reachability is the wrong completeness rule. The import
 * walk finds what an identity's entry points reach through static specifiers,
 * so a module reached only by a deferred `import()` is neither owned nor
 * reported — `stimulus.ts` and `final-quotient.ts` both arrived that way, the
 * second of them governing a close condition. `authority.test.ts` therefore
 * requires every module in this directory to be owned, a rule source, or
 * listed here, and keeps the walk as a second check rather than the definition.
 *
 * The line these all sit on: each WRITES a committed ledger and CHECKS it by
 * byte comparison, so a change to its rule necessarily changes the artifact it
 * would be caught by. That is not true of a module whose output is consumed
 * and never committed — `erasure-specimens.ts` is owned for exactly that
 * reason, and a new module here has to answer the same question before it is
 * admitted to this list.
 */
export const UNIDENTIFIED_MODULES: Readonly<Record<string, string>> = {
  "authority.ts": "defines the identities; a module inside an identity's closure cannot also be the module that defines it, and a change here moves every digest it computes",
  "baseline.ts": "records and byte-compares the Phase-A baseline ledger; a changed rule changes the ledger it checks itself against",
  "emit-schemas.ts": "emits the JSON schemas, which are digested as coordinateBasis ARTIFACTS; the emitter cannot move a schema without moving that digest",
  "erasure-audit.ts": "computes the footprint report and checks the committed one against a fresh computation; a changed rule cannot leave the recorded report identical",
  "freeze.ts": "records and checks the stage-2 freeze the same way",
  "legacy-comparison.ts": "compares the live ledgers against the legacy record; it reports a difference and adjudicates nothing",
};

/** Local `./x.js` imports of one analytical module, by basename. */
export function localImports(file: string, dir = HERE): string[] {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return [];
  return [...fs.readFileSync(p, "utf-8").matchAll(/from\s+"\.\/([\w.-]+)\.js"/g)].map((m) => `${m[1]}.ts`);
}

/** Every module reachable from these entry points, including them. */
export function moduleClosure(entryPoints: readonly string[], dir = HERE): Set<string> {
  const seen = new Set<string>();
  const queue = [...entryPoints];
  while (queue.length > 0) {
    const f = queue.shift()!;
    if (seen.has(f)) continue;
    seen.add(f);
    queue.push(...localImports(f, dir));
  }
  return seen;
}

/**
 * The digest of one identity: its owned sources, then its artifacts, each
 * preceded by its name.
 *
 * Names are joined in so that the digest is over a mapping and not over a
 * concatenation. Without them, deleting one module and growing another by the
 * same bytes would leave the digest unmoved.
 */
export function digestOf(identity: AuthorityIdentity, dir = HERE, contracts = CONTRACTS): string {
  const h = createHash("sha256");
  for (const f of [...identity.owns].sort()) {
    h.update(`${f} `);
    h.update(fs.readFileSync(path.join(dir, f)));
  }
  for (const a of [...identity.artifacts].sort()) {
    h.update(`${a} `);
    h.update(fs.readFileSync(path.join(contracts, a)));
  }
  return h.digest("hex");
}

/** Resolve source bytes for source and compiled callers in this repository. */
export const compositeOutputDigest = (): string => digestOf(COMPOSITE_OUTPUT_BASIS, path.resolve(CONTRACTS, "../ds-codegen/src/analytical"));

export interface AuthorityIdentities {
  coordinateBasisDigest: string;
  erasureAuthorityDigest: string;
  witnessAuthorityDigest: string;
  /** Which quotient language an image was written in. Not a digest: a version. */
  quotientSchemaVersion: number;
}

export function authorityIdentities(quotientSchemaVersion: number, dir = HERE, contracts = CONTRACTS): AuthorityIdentities {
  return {
    coordinateBasisDigest: digestOf(COORDINATE_BASIS, dir, contracts),
    erasureAuthorityDigest: digestOf(ERASURE_AUTHORITY, dir, contracts),
    witnessAuthorityDigest: digestOf(WITNESS_AUTHORITY, dir, contracts),
    quotientSchemaVersion,
  };
}

/**
 * The identity of the SPECIMEN POPULATION a footprint was measured over.
 *
 * Kept apart from the three code identities because it invalidates a different
 * class of claim. A footprint is population-sensitive — "no specimen separates
 * this" is a statement about the specimens — while a witness is existential and
 * survives the population growing. Binding both to one digest would reject
 * standing that a new specimen cannot possibly have disturbed.
 */
export function footprintBasisDigest(canonicalSpecimens: readonly string[]): string {
  return sha([...canonicalSpecimens].sort().join(" "));
}

/** Which identity, if any, owns a module. */
export function ownerOf(file: string): AuthorityName | undefined {
  return IDENTITIES.find((i) => i.owns.includes(file))?.name;
}
