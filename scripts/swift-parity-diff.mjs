#!/usr/bin/env node
// React-vs-SwiftUI emission parity fixture (FEAT-SWIFTUI-FINAL-FIVE-01).
//
// Generates EVERY corpus contract through both the react and swiftui
// emitters using the resolved contract corpus. Reports whether both emitters
// accept each contract; channel/prop counts describe the input IR, not a
// verification of the emitted public API. Any backend rejection fails.
//
// NON-CLAIMS: this is emission-level API-surface parity, not visual,
// behavioral, or token-value parity. A component passing here can still
// render differently across frameworks. It proves the contract→emission
// path admits both targets, nothing about runtime equivalence.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "packages", "ds-codegen", "dist");
const { buildComponentIR } = await import(path.join(dist, "ir.js"));
const { listComponentContracts } = await import(path.join(dist, "contracts-fs.js"));
const { generateSwiftUIComponentSource } = await import(
  path.join(dist, "frameworks", "swift", "swiftui", "component-source.js")
);
const { generateSwiftUISurfaceFiles } = await import(
  path.join(dist, "frameworks", "swift", "swiftui", "surface-emit.js")
);
const reactFactory = await import(path.join(dist, "frameworks", "react", "factory.js"));

function loadContract(name) {
  const folder = path.join(root, "packages", "ds-contracts", "components", name);
  const contract = JSON.parse(
    readFileSync(path.join(folder, `${name}.contract.json`), "utf8"),
  );
  for (const sidecar of ["tokens", "styles"]) {
    const p = path.join(folder, `${name}.${sidecar}.json`);
    if (existsSync(p)) contract[sidecar] = JSON.parse(readFileSync(p, "utf8"));
  }
  return contract;
}

function reactEmits(ir) {
  try {
    const emitter = reactFactory.createReactEmitter({
      stackImportRelative: "../../primitives",
    });
    emitter.emitComponent(ir, {
      componentsRoot: "/dev/null",
      contractsRoot: "/dev/null",
    });
    return { emitted: true };
  } catch (error) {
    return { emitted: false, error: String(error) };
  }
}

function swiftEmits(ir) {
  try {
    if (ir.surface) {
      generateSwiftUISurfaceFiles(ir);
    } else {
      generateSwiftUIComponentSource(ir);
    }
    return { emitted: true };
  } catch (error) {
    return { emitted: false, error: String(error) };
  }
}

function surfaceOf(ir) {
  const channels = ir.behavior.normalizedChannels
    .map((c) => `${c.name}:${c.valueType}`)
    .sort();
  const props = ir.styledProps.map((p) => p.safeName).sort();
  return { channels, props };
}

const contracts = new Map(listComponentContracts(path.join(root, "packages", "ds-contracts"))
  .map(({ name }) => [name, loadContract(name)]));
const rows = [];
let rejected = 0;
for (const [name, contract] of contracts) {
  const ir = buildComponentIR(contract, { allContracts: contracts });
  const r = reactEmits(ir);
  const s = swiftEmits(ir);
  if (!r.emitted || !s.emitted) rejected += 1;
  const { channels, props } = surfaceOf(ir);
  rows.push({ name, react: r.emitted, swift: s.emitted, channels: channels.length, props: props.length });
  if (r.error) console.error(`${name} react: ${r.error}`);
  if (s.error) console.error(`${name} swift: ${s.error}`);
}
console.log("component | react | swift | channels | props");
for (const row of rows) {
  console.log(
    `${row.name} | ${row.react ? "yes" : "NO"} | ${row.swift ? "yes" : "NO"} | ${row.channels} | ${row.props}`,
  );
}
console.log(`\ncorpus: ${rows.length} | react-emitting: ${rows.filter((r) => r.react).length} | swift-emitting: ${rows.filter((r) => r.swift).length} | rejected by either backend: ${rejected}`);
if (rejected > 0) {
  console.error("PARITY FAILURE: every corpus component must emit for both react and swiftui.");
  process.exit(1);
}
process.exit(0);
