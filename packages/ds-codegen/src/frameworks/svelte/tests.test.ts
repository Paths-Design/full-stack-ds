import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { corpusIR } from "../corpus-fixtures.js";
import { generateSvelteTest } from "./tests.js";

describe("generateSvelteTest", () => {
  it("emits a Testing Library Svelte suite from the shared test plan", () => {
    const source = generateSvelteTest(buildComponentIR(makeContract()));

    expect(source).toContain(`from "@testing-library/svelte";`);
    expect(source).toContain(`import { axe } from "vitest-axe";`);
    expect(source).toContain(`import Switch from "../Switch.svelte";`);
    expect(source).toContain(`container.firstElementChild?.className).toContain("switch");`);
    expect(source).toContain(`componentAxeOptions`);
    expect(source).toContain(`region: { enabled: false }`);
    expect(source).toContain(`expect(results.violations.map((v) => v.id)).toEqual([]);`);
  });

  it("emits channel interaction code for a stack-only boolean channel", () => {
    const source = generateSvelteTest(buildComponentIR(makeContract()));
    expect(source).toContain(`vi`);
    expect(source).toContain(`fireEvent`);
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
          { name: "onChange", type: "(event: Event) => void" },
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

describe("generateSvelteTest — real corpus contracts", () => {
  it("emits the compound Tabs plan against the real contract", () => {
    const source = generateSvelteTest(corpusIR("Tabs"));

    expect(source).toContain(`import Tabs from "../Tabs.svelte";`);
    expect(source).toContain(`describe("Tabs — unit"`);
    expect(source).toContain(`"orientation": "horizontal"`);
    expect(source).toContain(`"tabs--horizontal"`);
  });

  it("renders Select with the open channel bound", () => {
    const source = generateSvelteTest(corpusIR("Select"));

    expect(source).toContain(`import Select from "../Select.svelte";`);
    expect(source).toContain(`"open": true, "onOpenChange": onOpenChangeSpy`);
  });

  it("emits the disclosure plan for Accordion", () => {
    const source = generateSvelteTest(corpusIR("Accordion"));

    expect(source).toContain(`import Accordion from "../Accordion.svelte";`);
  });

  it("includes required props in the axe fixture", () => {
    const source = generateSvelteTest(corpusIR("Details"));

    expect(source).toContain(`"summary": "placeholder"`);
  });

  it("does not leak component-local type aliases into the runtime fixture", () => {
    const source = generateSvelteTest(corpusIR("Postcard"));

    expect(source).toContain(`"author": {}`);
    expect(source).not.toContain(`as PostcardAuthor`);
  });

  it("renders Dialog with the openness channel and dismissal coverage", () => {
    const source = generateSvelteTest(corpusIR("Dialog"));

    expect(source).toContain(`import Dialog from "../Dialog.svelte";`);
    expect(source).toContain(`"open": true, "onOpenChange": onOpenChangeSpy`);
    expect(source).toContain(
      `"title": createRawSnippet(() => ({ render: () => "<span>Test Dialog title</span>" }))`,
    );
    expect(source).toContain(`expect(root).not.toBeNull();`);
    expect(source).not.toContain(`knownScaffoldViolationIds`);
    expect(source).toContain(`expect(results.violations.map((v) => v.id)).toEqual([]);`);
  });

  it("keeps the generic plan for the Toast surface and cleans up timers", () => {
    const source = generateSvelteTest(corpusIR("Toast"));

    expect(source).toContain(`import Toast from "../Toast.svelte";`);
    expect(source).toContain(`afterEach`);
  });
});

describe("CODEGEN-EMIT-LINT-HYGIENE-01: svelte test vitest import hygiene", () => {
  it("Postcard's generated body uses no vi API → no vi specifier", () => {
    const source = generateSvelteTest(corpusIR("Postcard"));

    expect(source).toContain(
      `import { describe, expect, it } from "vitest";`,
    );
    expect(source).not.toMatch(/import \{[^}]*\bvi\b[^}]*\} from "vitest";/);
  });

  it("Dialog's generated body emits spies → vi is imported", () => {
    const source = generateSvelteTest(corpusIR("Dialog"));

    expect(source).toMatch(/import \{[^}]*\bvi\b[^}]*\} from "vitest";/);
  });

  it("Accordion's generated body uses no vi → no vi specifier (custom blocks self-import)", () => {
    const source = generateSvelteTest(corpusIR("Accordion"));

    expect(source).not.toMatch(/import \{[^}]*\bvi\b[^}]*\} from "vitest";/);
  });
});
