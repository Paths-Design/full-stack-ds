import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentContract } from "../contract.js";
import { buildComponentIR, nativeTableAttrsFor } from "../ir.js";
import { generateReactComponentSource } from "./react/component-source.js";
import { generateVueComponentSource, generateVueCompoundPartSource } from "./vue/component-source.js";
import { generateSvelteComponentSource, generateSvelteCompoundPartSource } from "./svelte/component-source.js";
import { generateAngularComponentSource } from "./angular/component-source.js";
import { generateLitComponentSource } from "./lit/component-source.js";

// CODEGEN-TABLE-COMPOUND-PARTS-REALIZATION-01 — realization invariants
// (Commit 2 promoted these from `it.fails` to `it`).
//
// This file loads the real Table.contract.json from disk, builds IR,
// generates source for every framework target, and asserts native HTML
// table semantics in the emitted output. It is a Layer 1 (source-string)
// gate. Layer 2 (runtime DOM) tests live in per-framework generated
// __tests__/Table.test.* files.
//
// In Commit 1 (test-only), this file was split into:
//   • Suite A — current broken state (plain `it`, deleted in Commit 2).
//   • Suite B — realization claims (`it.fails`, promoted in Commit 2).
// The two-suite shape kept the CI gate honest at Commit 1 (no committed
// red tests) while still committing falsifying evidence.
//
// As of Commit 2, Suite A is removed (the broken state no longer exists)
// and Suite B's `it.fails` are flipped to `it`. The diff is the ledger
// of realization claims earned.
//
// Doctrine bounds this file enforces:
//   • Native semantics across frameworks is the promise, not API symmetry.
//   • A part becomes a native compound subcomponent because the contract
//     declares its native realization via anatomy.details.<part>.tag,
//     NOT because its name appears in a global classifier set.
//   • TABLE_COMPOSITION_TAGS = { table, thead, tbody, tfoot, tr, th, td,
//     caption } scoped to HTML table content model only.
//   • Lit framework boundary: the root <fsds-table> shadow template owns
//     the full native table; per-row/per-cell/per-section custom elements
//     are NOT registered. See the Lit gating test outcome documented in
//     the Commit 2 commit body.

const CONTRACTS_ROOT = resolve(__dirname, "../../../ds-contracts");
const TABLE_CONTRACT_PATH = resolve(
  CONTRACTS_ROOT,
  "components/Table/Table.contract.json",
);

function loadTableContract(): ComponentContract {
  const raw = readFileSync(TABLE_CONTRACT_PATH, "utf8");
  return JSON.parse(raw) as ComponentContract;
}

const contract = loadTableContract();
const ir = buildComponentIR(contract);

const COMPOSED_PARTS: ReadonlyArray<{ part: string; tag: string; cssClass: string }> = [
  { part: "caption", tag: "caption", cssClass: "table__caption" },
  { part: "head", tag: "thead", cssClass: "table__head" },
  { part: "body", tag: "tbody", cssClass: "table__body" },
  { part: "footer", tag: "tfoot", cssClass: "table__footer" },
  { part: "row", tag: "tr", cssClass: "table__row" },
  { part: "headerCell", tag: "th", cssClass: "table__headerCell" },
  { part: "cell", tag: "td", cssClass: "table__cell" },
];

describe("Table realization — React", () => {
  const reactSrc = generateReactComponentSource(ir, "../../primitives");

  it("root component's render contains <table className=\"table__container\">", () => {
    expect(reactSrc).toMatch(/<table[^>]*className="table__container"/);
  });

  it("root component wraps the table in a div whose classNames variable includes \"table\"", () => {
    // Root render shape: `<div className={\`${classNames}\`}>...<table>...</table></div>`.
    // The classNames variable derivation includes the literal "table".
    expect(reactSrc).toMatch(/classNames\s*=\s*\[\s*\n?\s*"table",/);
    expect(reactSrc).toMatch(/<div className=\{`\$\{classNames\}`\}[^>]*>[\s\S]*<table\b/);
  });

  it("does not import Stack (all compound parts are native-leaf)", () => {
    expect(reactSrc).not.toMatch(/import\s+\{[^}]*\bStack\b[^}]*\}\s+from\s+["']\.\.\/\.\.\/primitives["']/);
  });

  for (const { part, tag, cssClass } of COMPOSED_PARTS) {
    const subName = `Table${part[0].toUpperCase()}${part.slice(1)}`;
    it(`emits ${subName} as a native <${tag} className="${cssClass}">, no Stack`, () => {
      const positive = new RegExp(
        `export function ${subName}[\\s\\S]*?<${tag}[^>]*className=\\{classNames\\}`,
      );
      const noStack = new RegExp(`export function ${subName}[\\s\\S]*?<Stack`);
      expect(reactSrc).toMatch(positive);
      expect(reactSrc).not.toMatch(noStack);
    });
  }
});

describe("Table realization — Vue", () => {
  const vueRootSrc = generateVueComponentSource(ir);

  it("root SFC contains the native <table> container in its template", () => {
    // Vue root: `<table :class="..." :aria-label="...">` with class binding
    // including the table__container BEM class.
    expect(vueRootSrc).toMatch(/<table\b[^>]*:class="[^"]*table__container/);
  });

  for (const { part, tag, cssClass } of COMPOSED_PARTS) {
    const partIR = ir.parts.find((p) => p.name === part);
    if (!partIR) {
      throw new Error(
        `Expected Table contract to declare part "${part}" — Commit 2's contract change adds these. ` +
          `Missing part means the realization claim cannot be earned.`,
      );
    }
    const partSrc = generateVueCompoundPartSource(ir.cssPrefix, partIR);
    const subName = `Table${part[0].toUpperCase()}${part.slice(1)}`;

    it(`${subName}.vue template uses <${tag} :class="classNames"> with "${cssClass}", no Stack`, () => {
      expect(partSrc).toMatch(new RegExp(`<${tag}\\b[^>]*:class="classNames"`));
      expect(partSrc).toMatch(new RegExp(`\\["${cssClass}"`));
      expect(partSrc).not.toMatch(/<Stack/);
      expect(partSrc).not.toMatch(/import\s+\{\s*Stack\s*\}/);
    });
  }
});

describe("Table realization — Svelte", () => {
  const svelteRootSrc = generateSvelteComponentSource(ir);

  it("root component contains the native <table> container", () => {
    expect(svelteRootSrc).toMatch(/<table\b[^>]*class=[^>]*table__container/);
  });

  for (const { part, tag, cssClass } of COMPOSED_PARTS) {
    const partIR = ir.parts.find((p) => p.name === part);
    if (!partIR) {
      throw new Error(
        `Expected Table contract to declare part "${part}" — Commit 2's contract change adds these. ` +
          `Missing part means the realization claim cannot be earned.`,
      );
    }
    const partSrc = generateSvelteCompoundPartSource(ir.cssPrefix, partIR);
    const subName = `Table${part[0].toUpperCase()}${part.slice(1)}`;

    it(`${subName}.svelte template uses <${tag} class={classes}> with "${cssClass}", no Stack`, () => {
      expect(partSrc).toMatch(new RegExp(`<${tag}\\b[^>]*class=\\{classes\\}`));
      expect(partSrc).toMatch(new RegExp(`\\["${cssClass}"`));
      expect(partSrc).not.toMatch(/<Stack/);
      expect(partSrc).not.toMatch(/import\s+\{\s*Stack\s*\}/);
    });
  }
});

describe("Table realization — Angular", () => {
  const angularSrc = generateAngularComponentSource(ir);

  it("root TableComponent template contains the native <table class=\"table__container\">", () => {
    // Angular root template: `<table [ngClass]="'table__container'" [attr.aria-label]="ariaLabel">`
    expect(angularSrc).toMatch(/<table\b[^>]*\[ngClass\]="'table__container'"/);
  });

  it("emits attribute selectors (e.g. tr[fsdsTableRow]) on native hosts, not element selectors", () => {
    for (const { tag, part } of COMPOSED_PARTS) {
      const kebabPart = part.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
      const partCamel = `${part[0].toUpperCase()}${part.slice(1)}`;
      // Element selector forbidden:
      expect(
        angularSrc,
        `Angular must not emit element selector fsds-table-${kebabPart}`,
      ).not.toMatch(
        new RegExp(`selector:\\s*["']fsds-table-${kebabPart}["']`),
      );
      // Attribute selector required:
      expect(
        angularSrc,
        `Angular must emit attribute selector ${tag}[fsdsTable${partCamel}]`,
      ).toMatch(
        new RegExp(`selector:\\s*["']${tag}\\[fsdsTable${partCamel}\\]["']`),
      );
    }
  });

  it("table-leaf compound parts do not import or render fsds-stack", () => {
    // Each Table*Component (other than the root TableComponent) should
    // have <ng-content /> as its template and rely on the host attribute
    // selector for class binding, not delegate to <fsds-stack>.
    const partComponentNames = [
      "TableCaptionComponent",
      "TableHeadComponent",
      "TableBodyComponent",
      "TableFooterComponent",
      "TableRowComponent",
      "TableHeaderCellComponent",
      "TableCellComponent",
    ];
    for (const name of partComponentNames) {
      const componentRe = new RegExp(`@Component\\(\\{[\\s\\S]*?\\}\\)\\s*export class ${name}\\b`);
      const match = angularSrc.match(componentRe);
      expect(match, `Expected to find @Component for ${name}`).not.toBeNull();
      if (match) {
        expect(match[0]).not.toMatch(/<fsds-stack/);
        expect(match[0]).toMatch(/<ng-content\s*\/?>/);
      }
    }
  });
});

describe("Table realization — Lit", () => {
  const litSrc = generateLitComponentSource(ir);

  it("root template contains a native <table> with the table__container class", () => {
    // Lit's template literal uses interpolation: `<table class=${'table__container'}>`.
    // The match accepts both literal class="..." and interpolated forms.
    expect(litSrc).toMatch(/html`[\s\S]*<table[^>]*(class="table__container"|class=\$\{['"]table__container['"]\})/);
  });

  it("does NOT register fsds-table-{row,cell,head,body,footer,headerCell,header-cell,caption} custom elements", () => {
    const forbiddenTags = [
      "fsds-table-row",
      "fsds-table-cell",
      "fsds-table-header-cell",
      "fsds-table-headerCell",
      "fsds-table-head",
      "fsds-table-body",
      "fsds-table-footer",
      "fsds-table-caption",
    ];
    for (const ce of forbiddenTags) {
      expect(
        litSrc,
        `Lit must not register ${ce} as a custom element`,
      ).not.toMatch(new RegExp(`customElements\\.define\\(['"]${ce}['"]`));
    }
    // The root fsds-table custom element SHOULD still be registered:
    expect(litSrc).toMatch(/customElements\.define\(['"]fsds-table['"]/);
  });

  it("no <fsds-stack> tag appears anywhere in the Lit Table source", () => {
    // Table is now fully native HTML. Stack-class-name strings may appear
    // in unrelated contexts but the actual tag must not.
    expect(litSrc).not.toMatch(/<fsds-stack\b/);
  });
});

// CODEGEN-TABLE-CELL-ATTRIBUTES-01 / SHOWCASE-CONSUMPTION-03 A1 — the native
// cell/header subcomponents own their element, so they must forward the HTML
// attributes a real data table needs. The policy lives ONCE in the IR
// (nativeTableAttrsFor, keyed by tag — no per-component lore); the emitters
// consume it. Runtime DOM proofs live in each package's generated Table test.
describe("Table cell-attribute forwarding", () => {
  describe("IR fact: nativeTableAttrsFor (single policy source)", () => {
    it("td forwards the global id/style + cell-spanning colSpan/rowSpan, no scope", () => {
      expect(nativeTableAttrsFor("td")).toEqual(["id", "style", "colSpan", "rowSpan"]);
    });
    it("th additionally forwards scope (header association direction)", () => {
      expect(nativeTableAttrsFor("th")).toEqual([
        "id",
        "style",
        "colSpan",
        "rowSpan",
        "scope",
      ]);
    });
    it("structural rows/sections forward only the global id, style", () => {
      for (const tag of ["tr", "thead", "tbody", "tfoot", "caption"]) {
        expect(nativeTableAttrsFor(tag)).toEqual(["id", "style"]);
      }
    });
    it("returns [] for non-table tags (no leakage to other native leaves)", () => {
      for (const tag of ["div", "span", "ul", "li", "button"]) {
        expect(nativeTableAttrsFor(tag)).toEqual([]);
      }
      expect(nativeTableAttrsFor(undefined)).toEqual([]);
    });
  });

  describe("React/Vue/Svelte emitters consume the fact", () => {
    const reactSrc = generateReactComponentSource(ir, "../../primitives");

    it("React TableCell forwards colSpan + id onto the <td>", () => {
      expect(reactSrc).toMatch(
        /export function TableCell\([\s\S]*?<td[^>]*colSpan=\{colSpan\}/,
      );
      expect(reactSrc).toMatch(/export function TableCell\([\s\S]*?<td[^>]*id=\{id\}/);
    });

    it("React TableHeaderCell forwards scope; TableRow takes id but NOT colSpan", () => {
      expect(reactSrc).toMatch(
        /export function TableHeaderCell\([\s\S]*?scope=\{scope\}/,
      );
      const rowProps = reactSrc.match(/export interface TableRowProps \{[\s\S]*?\}/)![0];
      expect(rowProps).toMatch(/id\?: string/);
      expect(rowProps).not.toMatch(/colSpan/);
    });

    it("Vue TableCell.vue binds :colspan to the camelCase prop", () => {
      const cell = ir.parts.find((p) => p.name === "cell")!;
      const src = generateVueCompoundPartSource(ir.cssPrefix, cell);
      expect(src).toMatch(/colSpan\?: number/);
      expect(src).toMatch(/:colspan="props\.colSpan"/);
    });

    it("Svelte TableHeaderCell.svelte binds scope + colspan", () => {
      const headerCell = ir.parts.find((p) => p.name === "headerCell")!;
      const src = generateSvelteCompoundPartSource(ir.cssPrefix, headerCell);
      expect(src).toMatch(/colspan=\{colSpan\}/);
      expect(src).toMatch(/ \{scope\}/);
    });
  });

  describe("Angular + Lit forward structurally (consumer owns the cell element)", () => {
    it("Angular cell directive declares no colspan input — the host <td> carries it", () => {
      const angularSrc = generateAngularComponentSource(ir);
      const cellClass = angularSrc.match(/export class TableCellComponent \{[\s\S]*?\n\}/)![0];
      expect(cellClass).not.toMatch(/colSpan|colspan/i);
    });
    it("Lit exposes native cell templates without per-cell custom elements", () => {
      const litSrc = generateLitComponentSource(ir);
      expect(litSrc).not.toMatch(/customElements\.define\(['"]fsds-table-cell/);
      expect(litSrc).toContain("export function tableCell(content: unknown");
      expect(litSrc).toContain("colspan=${ifDefined(attrs.colSpan)}");
      expect(litSrc).toContain("rowspan=${ifDefined(attrs.rowSpan)}");
      expect(litSrc).toContain("scope=${ifDefined(attrs.scope)}");
    });
  });
});
