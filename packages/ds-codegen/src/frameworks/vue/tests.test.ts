import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { corpusIR } from "../corpus-fixtures.js";
import { generateVueTest } from "./tests.js";

describe("generateVueTest", () => {
  it("emits Vue Test Utils tests from the shared component test plan", () => {
    const source = generateVueTest(buildComponentIR(makeContract()));

    expect(source).toContain(`import { mount } from "@vue/test-utils";`);
    expect(source).toContain(`import Switch from "../Switch.vue";`);
    expect(source).toContain(`expect(wrapper.classes()).toContain("switch");`);
    expect(source).toContain(`props: { "size": "small" }`);
    expect(source).toContain(`await wrapper.trigger("click");`);
    expect(source).toContain(`expect(onChangeSpy).toHaveBeenCalled();`);
    expect(source).toContain(
      `const results = await axe(wrapper.element, componentAxeOptions);`,
    );
    expect(source).toContain(`region: { enabled: false }`);
    expect(source).toContain(
      `expect(results.violations.map((v) => v.id)).toEqual([]);`,
    );
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

describe("generateVueTest — real corpus contracts", () => {
  it("emits the compound Tabs plan against the real contract", () => {
    const source = generateVueTest(corpusIR("Tabs"));

    expect(source).toContain(`import Tabs from "../Tabs.vue";`);
    expect(source).toContain(`describe("Tabs — unit"`);
    expect(source).toContain(`"orientation": "horizontal"`);
    expect(source).toContain(`"tabs--horizontal"`);
  });

  it("mounts Select with the open channel bound and covers dismissal", () => {
    const source = generateVueTest(corpusIR("Select"));

    expect(source).toContain(`import Select from "../Select.vue";`);
    expect(source).toContain(`"open": true, "onOpenChange": onOpenChangeSpy`);
  });

  it("emits the disclosure plan for Accordion", () => {
    const source = generateVueTest(corpusIR("Accordion"));

    expect(source).toContain(`import Accordion from "../Accordion.vue";`);
  });

  it("includes required props in the axe fixture", () => {
    const source = generateVueTest(corpusIR("Details"));

    expect(source).toContain(`"summary": "placeholder"`);
  });

  it("does not leak component-local type aliases into the runtime fixture", () => {
    const source = generateVueTest(corpusIR("Postcard"));

    expect(source).toContain(`"author": {}`);
    expect(source).not.toContain(`as PostcardAuthor`);
  });

  it("attaches Dialog to the body for portal/dismissal assertions", () => {
    const source = generateVueTest(corpusIR("Dialog"));

    expect(source).toContain(`import Dialog from "../Dialog.vue";`);
    expect(source).toContain(`attachTo: document.body`);
    expect(source).toContain(`props: { "open": true }`);
    expect(source).toContain(
      `"title": "<span>Test Dialog title</span>"`,
    );
    expect(source).toContain(`expect(root).not.toBeNull();`);
    expect(source).not.toContain(`knownScaffoldViolationIds`);
    expect(source).toContain(`expect(results.violations.map((v) => v.id)).toEqual([]);`);
  });

  it("keeps the generic plan for the Toast surface and cleans up timers", () => {
    const source = generateVueTest(corpusIR("Toast"));

    expect(source).toContain(`import Toast from "../Toast.vue";`);
    expect(source).toContain(`afterEach`);
  });
});

describe("CODEGEN-EMIT-LINT-HYGIENE-01: vue test vitest import hygiene", () => {
  it("Truncate's generated body uses no vi API → no vi specifier", () => {
    const source = generateVueTest(corpusIR("Truncate"));

    expect(source).toContain(
      `import { describe, it, expect } from "vitest";`,
    );
    expect(source).not.toMatch(/import \{[^}]*\bvi\b[^}]*\} from "vitest";/);
  });

  it("Dialog's generated body emits spies → vi is imported", () => {
    const source = generateVueTest(corpusIR("Dialog"));

    expect(source).toMatch(/import \{[^}]*\bvi\b[^}]*\} from "vitest";/);
  });

  it("Accordion's generated body uses no vi → no vi specifier (custom blocks self-import)", () => {
    const source = generateVueTest(corpusIR("Accordion"));

    expect(source).not.toMatch(/import \{[^}]*\bvi\b[^}]*\} from "vitest";/);
  });
});
