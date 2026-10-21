import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { corpusIR } from "../corpus-fixtures.js";
import { generateAngularTest } from "./tests.js";

describe("generateAngularTest", () => {
  it("emits a jest-globals class-instantiation suite from the shared test plan", () => {
    const source = generateAngularTest(buildComponentIR(makeContract()));

    expect(source).toContain(`import { describe, expect, it } from "@jest/globals";`);
    expect(source).toContain(`import { SwitchComponent } from "../Switch.component";`);
    expect(source).toContain(`new SwitchComponent()`);
    expect(source).toContain(`toBeInstanceOf(SwitchComponent)`);
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

describe("generateAngularTest — real corpus contracts", () => {
  it("emits a TestBed plan for the compound Tabs contract", () => {
    const source = generateAngularTest(corpusIR("Tabs"));

    expect(source).toContain(`import { TabsComponent } from "../Tabs.component";`);
    expect(source).toContain(`describe("Tabs — unit"`);
  });

  it("emits the Select plan with TestBed", () => {
    const source = generateAngularTest(corpusIR("Select"));

    expect(source).toContain(`import { SelectComponent } from "../Select.component";`);
    expect(source).toContain(`TestBed`);
  });

  it("emits the Accordion disclosure plan", () => {
    const source = generateAngularTest(corpusIR("Accordion"));

    expect(source).toContain(`import { AccordionComponent } from "../Accordion.component";`);
  });

  it("emits the Dialog plan with TestBed", () => {
    const source = generateAngularTest(corpusIR("Dialog"));

    expect(source).toContain(`import { DialogComponent } from "../Dialog.component";`);
    expect(source).toContain(`TestBed`);
  });

  it("routes the anchored Popover surface to the class-surface plan", () => {
    const source = generateAngularTest(corpusIR("Popover"));

    expect(source).toContain(`import { PopoverComponent } from "../Popover.component";`);
    expect(source).toContain(`creates the component class`);
  });

  it("keeps the generic plan for the Toast surface", () => {
    const source = generateAngularTest(corpusIR("Toast"));

    expect(source).toContain(`import { ToastComponent } from "../Toast.component";`);
    expect(source).toContain(`describe("Toast — unit"`);
  });
});

describe("generateAngularTest — axe scan", () => {
  it("scans an overlay open, with its named slot content, from its portalled root", () => {
    const source = generateAngularTest(corpusIR("Dialog"));

    expect(source).toContain(`import axe from "axe-core";`);
    expect(source).toContain(
      `template: "<fsds-dialog [open]=\\"open\\"><span slot=\\"title\\">Test Dialog title</span><span>content</span></fsds-dialog>",`,
    );
    expect(source).toContain(`  readonly open = true;`);
    expect(source).toContain(`    const root = document.body.querySelector<HTMLElement>(".dialog");\n    expect(root).not.toBeNull();`);
    expect(source).toContain(`    const results = await axe.run(root as HTMLElement, componentAxeOptions);`);
    expect(source).toContain(`    expect(results.violations.map((v) => v.id)).toEqual([]);`);
  });

  it("binds required, role-activating and label props as host fields", () => {
    const source = generateAngularTest(corpusIR("Icon"));

    expect(source).toContain(
      `template: "<fsds-icon [name]=\\"name\\" [decorative]=\\"decorative\\" [ariaLabel]=\\"ariaLabel\\"></fsds-icon>",`,
    );
    expect(source).toContain(`  readonly name = "placeholder";\n  readonly decorative = false;\n  readonly ariaLabel = "Test Icon";`);
    expect(source).toContain(`(fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".icon");`);
  });

  it("puts an attribute label on the host element and scans a listitem root inside a list", () => {
    const source = generateAngularTest(corpusIR("NavTree"));

    expect(source).toContain(` aria-label=\\"Test NavTree\\"><li>content</li></fsds-nav-tree>",`);
    expect(source).toContain(`    list.append(root as HTMLElement);\n    const results = await axe.run(list, componentAxeOptions);`);
  });
});
