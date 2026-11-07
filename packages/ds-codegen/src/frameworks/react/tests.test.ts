import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { corpusIR } from "../corpus-fixtures.js";
import { generateReactTest } from "./tests.js";

describe("generateReactTest", () => {
  it("emits a React Testing Library suite from the shared test plan", () => {
    const source = generateReactTest(buildComponentIR(makeContract()));

    expect(source).toContain(`import { render, screen } from "@testing-library/react";`);
    expect(source).toContain(`import userEvent from "@testing-library/user-event";`);
    expect(source).toContain(`import { axe } from "vitest-axe";`);
    expect(source).toContain(`import { Switch } from "../Switch";`);
    expect(source).toContain(`expect(screen.getByTestId("switch")).toHaveClass("switch");`);
    expect(source).toContain(`expect(screen.getByTestId("switch")).toHaveClass("switch--small");`);
    expect(source).toContain(`expect(results.violations.map((v) => v.id)).toEqual([]);`);
  });

  it("emits a channel interaction test for a boolean channel", () => {
    const source = generateReactTest(buildComponentIR(makeContract()));
    expect(source).toContain(`it("calls onChange when checked changes"`);
    expect(source).toContain(`await userEvent.setup().click(screen.getByTestId("switch"));`);
  });
});

function makeContract(): ComponentContract {
  return {
    name: "Switch",
    cssPrefix: "switch",
    anatomy: { parts: ["root"] },
    props: {
      styled: {
        members: [
          { name: "checked", type: "boolean" },
          { name: "onChange", type: "(event: ChangeEvent<HTMLInputElement>) => void" },
          { name: "size", type: "SwitchSize", default: "small" },
          { name: "aria-label", type: "string" },
        ],
      },
    },
    types: {
      SwitchSize: { kind: "union", values: ["small", "large"] },
    },
    variants: {
      size: ["small", "large"],
    },
    channels: {
      checked: {
        value: "checked",
        defaultValue: "defaultChecked",
        onChange: "onChange",
        valueType: "boolean",
      },
    },
    a11y: {
      role: "switch",
      labeling: ["aria-label"],
    },
  };
}

describe("generateReactTest — real corpus contracts", () => {
  it("omits unreachable channel behavior tests for Tabs", () => {
    const source = generateReactTest(corpusIR("Tabs"));

    // CODEGEN-EMIT-LINT-HYGIENE-01: the generated body renders only the
    // root, so only the root is imported — parts nothing renders were
    // unused-import findings. The @custom test region self-imports the
    // parts it uses (companion convention, same as vue/svelte).
    expect(source).toContain(`import { Tabs } from "../Tabs";`);
    expect(source).not.toContain(
      `import { Tabs, TabsList, TabsTab, TabsPanel } from "../Tabs";`,
    );
    // The root-only fixture cannot exercise a descendant tab activation.
    expect(source).not.toContain(`calls onValueChange when activeTab changes`);
    expect(source).not.toContain(`onValueChangeSpy`);
  });

  it("omits unsupported Calendar callback behavior cases", () => {
    const source = generateReactTest(corpusIR("Calendar"));
    expect(source).not.toContain(`calls onChange when value changes`);
    expect(source).not.toContain(`calls onMonthChange when month changes`);
    expect(source).not.toContain(`not.toThrow()`);
    expect(source).not.toContain(`expect, vi`);
  });

  it("keeps the spy import required by preserved authored tests", () => {
    const source = generateReactTest(corpusIR("Accordion"), {
      preservedCustomTests: `const onChangeSpy = vi.fn();`,
    });

    expect(source).toContain(`import { describe, it, expect, vi } from "vitest";`);
  });

  it("respects an authored spy import instead of declaring it twice", () => {
    const source = generateReactTest(corpusIR("Calendar"), {
      preservedCustomTests: `import { vi } from "vitest"; const spy = vi.fn();`,
    });

    expect(source).toContain(`import { describe, it, expect } from "vitest";`);
    expect(source).not.toContain(`expect, vi`);
  });

  it("distinguishes local and aliased helper bindings from a missing module helper", () => {
    const local = generateReactTest(corpusIR("Calendar"), {
      preservedCustomTests: `function authored(vi: { fn(): unknown }) { return vi.fn(); }`,
    });
    const aliased = generateReactTest(corpusIR("Calendar"), {
      preservedCustomTests: `import { vi as mock } from "vitest"; const first = mock.fn(); const second = vi.fn();`,
    });

    expect(local).not.toContain(`expect, vi`);
    expect(aliased).toContain(`import { describe, it, expect, vi } from "vitest";`);
  });

  it.each([
    { name: "direct alias", body: `const helper = vi; helper.fn();` },
    { name: "destructuring initializer", body: `const { fn } = vi; const authoredSpy = fn();` },
    { name: "function argument", body: `consume(vi);` },
    { name: "shorthand property", body: `const helpers = { vi };` },
    { name: "computed property", body: `const helpers = { [vi]: true };` },
    { name: "type query", body: `type Spy = typeof vi;` },
    { name: "qualified type query", body: `type SpyFactory = typeof vi.fn;` },
    { name: "nested type query", body: `interface Helpers { spy: { factory: typeof vi.fn }; }` },
    { name: "local value export", body: `export { vi as helper };` },
    { name: "reference outside a shadowing parameter", body: `function authored(vi: unknown) { return { vi }; } consume(vi);` },
  ])("imports vi for a free $name value", ({ body }) => {
    const source = generateReactTest(corpusIR("Calendar"), { preservedCustomTests: body });
    expect(source).toContain(`import { describe, it, expect, vi } from "vitest";`);
  });

  it.each([
    { name: "local variable and shorthand", body: `const vi = {}; consume(vi); const helpers = { vi };` },
    { name: "parameter and shorthand", body: `function authored(vi: unknown) { return { vi }; }` },
    { name: "destructured local binding", body: `const { vi } = helpers; consume(vi);` },
    { name: "renamed binding property", body: `const { vi: helper } = helpers; consume(helper);` },
    { name: "named import", body: `import { vi } from "vitest"; consume(vi); const helpers = { vi };` },
    { name: "import aliased to vi", body: `import { helper as vi } from "helpers"; const { fn } = vi;` },
    { name: "namespace import", body: `import * as vi from "vitest"; consume(vi);` },
    { name: "scoped type query", body: `function authored(vi: { fn(): unknown }) { type Spy = typeof vi.fn; }` },
    { name: "imported type query", body: `import { vi } from "vitest"; type Spy = typeof vi;` },
    { name: "type query member name", body: `type Spy = typeof helpers.vi;` },
    { name: "exported alias name", body: `const helper = {}; export { helper as vi };` },
    { name: "external and type-only re-exports", body: `export { vi } from "helpers"; export type { vi as Spy };` },
    { name: "property keys and member names", body: `const helpers = { vi: factory() }; consume(helpers.vi);` },
    { name: "method and class member names", body: `const helpers = { vi() {} }; class Helper { vi = 1; }` },
    { name: "plain type names", body: `type Helper = vi; interface Helpers { vi: unknown; }` },
    { name: "label", body: `vi: for (;;) { break vi; }` },
    { name: "intrinsic JSX tag and attribute", body: `const view = <vi vi="label" />;` },
  ])("does not import vi for $name", ({ body }) => {
    const source = generateReactTest(corpusIR("Calendar"), { preservedCustomTests: body });
    expect(source).toContain(`import { describe, it, expect } from "vitest";`);
    expect(source).not.toContain(`expect, vi`);
  });

  it("emits the open-render prop and dismissal tests for Select", () => {
    const source = generateReactTest(corpusIR("Select"));

    expect(source).toContain(`open={true}`);
    expect(source).not.toContain(`calls onChange when selection changes`);
    expect(source).toContain(`closes on Escape key`);
  });

  it("emits disclosure subcomponent imports for Accordion", () => {
    const source = generateReactTest(corpusIR("Accordion"));

    // CODEGEN-EMIT-LINT-HYGIENE-01: generated body renders only the root;
    // the disclosure parts live in the @custom region's own import.
    expect(source).toContain(`import { Accordion } from "../Accordion";`);
    expect(source).not.toContain(
      `import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../Accordion";`,
    );
  });

  it("CODEGEN-EMIT-LINT-HYGIENE-01: preserved @custom usage keeps the part imports it renders", () => {
    // Direct call without preserved content narrows to the root (previous
    // test); a preserved region that renders the parts keeps them, because
    // import assembly scans the preserved text too.
    const preserved = `<AccordionItem><AccordionTrigger value="a">A</AccordionTrigger><AccordionContent value="a">PA</AccordionContent></AccordionItem>`;
    const source = generateReactTest(corpusIR("Accordion"), {
      preservedCustomTests: preserved,
    });

    expect(source).toContain(
      `import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../Accordion";`,
    );
  });

  it("CODEGEN-EMIT-LINT-HYGIENE-01: Alert imports only the parts something renders", () => {
    const source = generateReactTest(corpusIR("Alert"));

    expect(source).toContain(`import { Alert } from "../Alert";`);
    expect(source).not.toContain("AlertBody");
    expect(source).not.toContain("AlertTitle");
  });

  it("CODEGEN-EMIT-LINT-HYGIENE-01: augments vitest's Assertion with a referenced T, no disables", () => {
    const source = generateReactTest(corpusIR("Tabs"));

    expect(source).toContain(`interface Assertion<T> {`);
    expect(source).toContain(`toHaveNoViolations(expected?: T): void;`);
    expect(source).not.toContain(`Assertion<_T>`);
    expect(source).not.toContain("eslint-disable");
  });

  it("CODEGEN-EMIT-LINT-HYGIENE-01: the factory threads the on-disk @custom region into import assembly", async () => {
    // Exactly what regeneration does: readPreservedCustomTests pulls the
    // committed custom region, and the Tabs suite's parts survive.
    const { createReactEmitter } = await import("./factory.js");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const repoRoot = resolve(here, "../../../../..");
    const emitter = createReactEmitter({ stackImportRelative: "../../primitives" });
    const files = emitter.emitTests(corpusIR("Tabs"), {
      componentsRoot: resolve(repoRoot, "packages/ds-react/src/components"),
      contractsRoot: resolve(repoRoot, "packages/ds-contracts/components"),
    });

    expect(files[0]?.contents).toContain(
      `import { Tabs, TabsList, TabsTab, TabsPanel } from "../Tabs";`,
    );
    expect(files[0]?.contents).toContain(
      `import { describe, it, expect, vi } from "vitest";`,
    );
  });

  it("emits Escape and overlay-click dismissal tests for Dialog", () => {
    const source = generateReactTest(corpusIR("Dialog"));

    expect(source).toContain(`import { render, screen, act, fireEvent }`);
    expect(source).toContain(`closes on Escape key`);
    // FIX-OVERLAY-CLICK-DISMISSAL-BINDING-01: the dismissal test dispatches
    // on the declared targetPart element (Dialog's backdrop), not the root —
    // jsdom does no hit-testing, so the root click proved nothing.
    expect(source).toContain(
      `const overlay = screen.getByTestId("dialog").querySelector(".dialog__backdrop");`,
    );
    expect(source).toContain(`fireEvent.click(overlay!);`);
  });

  it("scans the realized component subtree and does not suppress dialog naming failures", () => {
    const source = generateReactTest(corpusIR("Dialog"));

    expect(source).toContain(
      `const component = baseElement.querySelector('[data-fsds-component="dialog"]');`,
    );
    expect(source).toContain(`expect(component).not.toBeNull();`);
    expect(source).toContain(
      `const results = await axe(component!, componentAxeOptions)`,
    );
    expect(source).toContain(`region: { enabled: false }`);
    expect(source).not.toContain(`"button-name"`);
    expect(source).not.toContain(`"aria-required-children"`);
    expect(source).not.toContain(`knownScaffoldViolationIds`);
    expect(source).toContain(`expect(results.violations.map((v) => v.id)).toEqual([]);`);
    expect(source).not.toContain(`const { container } = render(`);
  });

  it("lets the accessible-name fixture replace the required placeholder", () => {
    const source = generateReactTest(corpusIR("Avatar"));
    const axeRender = source.split(`describe("Avatar — accessibility"`)[1];

    expect(axeRender).toContain(`<Avatar name="Test Avatar"`);
    expect(axeRender).not.toContain(`name={"placeholder"}`);
  });

  it("routes anchored surfaces (Popover) to the surface test plan", () => {
    const source = generateReactTest(corpusIR("Popover"));

    expect(source).toContain(`describe("Popover — compound API surface"`);
  });

  it("keeps the generic plan for non-anchored surfaces (Toast)", () => {
    const source = generateReactTest(corpusIR("Toast"));

    expect(source).toContain(`describe("Toast — unit"`);
    expect(source).toContain(`closes on Escape key`);
  });
});
