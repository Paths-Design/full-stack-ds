import { describe, expect, it } from "vitest";
import ts from "typescript";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { corpusIR } from "../corpus-fixtures.js";
import { generateLitTest } from "./tests.js";

describe("generateLitTest", () => {
  it("emits a Lit suite from the shared test plan", () => {
    const source = generateLitTest(buildComponentIR(makeContract()));

    expect(source).toContain(`import { axe } from "vitest-axe";`);
    expect(source).toContain(`import "../Switch";`);
    expect(source).toContain(`componentAxeOptions`);
    expect(source).toContain(`region: { enabled: false }`);
    expect(source).toContain(`expect(results.violations.map((v) => v.id)).toEqual([]);`);
    expect(source).toContain("switch");
  });

  it("emits channel behavior assertions for a boolean channel", () => {
    const source = generateLitTest(buildComponentIR(makeContract()));
    expect(source).toContain("checked");
  });

  it("disconnects only its own fixtures after successful and failed renders", async () => {
    const cleanup: Array<() => void> = [];
    const emitted: {
      renderElement?: (tag: string, props?: Record<string, unknown>) => Promise<{ element: HTMLElement }>;
    } = {};
    const source = generateLitTest(buildComponentIR(makeContract()));
    const javascript = ts.transpileModule(`${source}\nexport { renderElement };`, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const require = (name: string) => name === "vitest" ? {
      afterEach: (callback: () => void) => cleanup.push(callback),
      describe: () => {},
    } : {};
    new Function("require", "exports", javascript)(require, emitted);
    expect(cleanup).toHaveLength(1);
    expect(emitted.renderElement).toBeTypeOf("function");
    const render = emitted.renderElement!;

    let notifications = 0;
    let disconnections = 0;
    class LifecycleFixture extends HTMLElement {
      updateComplete = Promise.resolve();
      private notify = () => { notifications++; };
      connectedCallback() { document.addEventListener("fixture-notification", this.notify); }
      disconnectedCallback() {
        disconnections++;
        document.removeEventListener("fixture-notification", this.notify);
      }
    }
    const tag = "fsds-test-fixture-lifetime";
    customElements.define(tag, LifecycleFixture);
    const sentinel = document.createElement("aside");
    document.body.append(sentinel);
    try {
      const first = await render(tag);
      const firstContainer = first.element.parentElement!;
      document.dispatchEvent(new Event("fixture-notification"));
      expect(notifications).toBe(1);
      cleanup[0]();
      expect(first.element.isConnected).toBe(false);
      expect(firstContainer.isConnected).toBe(false);
      expect(disconnections).toBe(1);
      expect(sentinel.isConnected).toBe(true);
      document.dispatchEvent(new Event("fixture-notification"));
      expect(notifications).toBe(1);

      // A rejected render must remain owned even though its helper never returns.
      const failure = new Error("fixture update failed");
      await expect(render(tag, { updateComplete: Promise.reject(failure) })).rejects.toBe(failure);
      const failed = document.querySelector(tag)!;
      expect(failed.isConnected).toBe(true);
      cleanup[0]();
      expect(failed.isConnected).toBe(false);
      expect(disconnections).toBe(2);
      expect(sentinel.isConnected).toBe(true);
      document.dispatchEvent(new Event("fixture-notification"));
      expect(notifications).toBe(1);

      const next = await render(tag);
      expect(next.element.isConnected).toBe(true);
      expect(document.querySelectorAll(tag)).toHaveLength(1);
      document.dispatchEvent(new Event("fixture-notification"));
      expect(notifications).toBe(2);
      cleanup[0]();
      cleanup[0]();
      expect(next.element.isConnected).toBe(false);
      expect(disconnections).toBe(3);
      expect(sentinel.isConnected).toBe(true);
    } finally {
      for (const dispose of cleanup) dispose();
      sentinel.remove();
    }
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

describe("generateLitTest — real corpus contracts", () => {
  it("emits the compound Tabs plan against the real contract", () => {
    const source = generateLitTest(corpusIR("Tabs"));

    expect(source).toContain(`import "../Tabs";`);
    expect(source).toContain(`describe("Tabs — unit"`);
    expect(source).toContain(`axe`);
  });

  it("emits typed element casts and never `as any` in the compound plan", () => {
    // CODEGEN-EMIT-LINT-HYGIENE-01: ~58 @typescript-eslint/no-explicit-any
    // findings came from these emissions. Typed casts are type-level only;
    // runtime behavior is identical.
    const source = generateLitTest(corpusIR("Tabs"));

    expect(source).not.toContain("as any");
    // smoke test: querySelector'd element gets the typed await cast.
    expect(source).toContain(
      "await (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;",
    );
    // variant loop: createElement'd element carries the typed shape.
    expect(source).toContain(
      'const el = document.createElement("fsds-tabs") as HTMLElement & {',
    );
    // axe block: the compound parts carry value/idBase in their shapes.
    expect(source).toContain(
      'const tabsEl = document.createElement("fsds-tabs") as HTMLElement & {',
    );
    expect(source).toContain("value: string;");
    expect(source).toContain("idBase?: string;");
    expect(source).toMatch(
      /const tabA = document\.createElement\("fsds-tabs-tab"\) as HTMLElement & \{\s+value: string;\s+updateComplete\?: Promise<unknown>;\s+\};/,
    );
  });

  it("emits the Select plan with behavior assertions", () => {
    const source = generateLitTest(corpusIR("Select"));

    expect(source).toContain(`import "../Select";`);
    expect(source).toContain(`"onOpenChange"`);
  });

  it("emits the disclosure plan for Accordion", () => {
    const source = generateLitTest(corpusIR("Accordion"));

    expect(source).toContain(`import "../Accordion";`);
  });

  it("includes required props in the axe fixture", () => {
    const source = generateLitTest(corpusIR("Details"));

    expect(source).toContain(
      `renderElement("fsds-details", { "summary": "placeholder",`,
    );
  });

  it("does not leak component-local type aliases into the runtime fixture", () => {
    const source = generateLitTest(corpusIR("Postcard"));

    expect(source).toContain(`"author": {}`);
    expect(source).not.toContain(`as PostcardAuthor`);
  });

  it("emits the Dialog plan with dismissal coverage", () => {
    const source = generateLitTest(corpusIR("Dialog"));

    expect(source).toContain(`import "../Dialog";`);
    expect(source).toContain(`"onOpenChange"`);
    expect(source).toContain(
      `renderElement("fsds-dialog", { "open": true }, [{"slotName":"title","html":"<span>Test Dialog title</span>"}`,
    );
    expect(source).toContain(`{"html":"<span>content</span>"}`);
    expect(source).not.toContain(`knownScaffoldViolationIds`);
    expect(source).toContain(`expect(results.violations.map((v) => v.id)).toEqual([]);`);
  });

  it("keeps the generic plan for the Popover surface", () => {
    const source = generateLitTest(corpusIR("Popover"));

    expect(source).toContain(`import "../Popover";`);
    expect(source).toContain(`describe("Popover — unit"`);
  });

  it("keeps the generic plan for the Toast surface", () => {
    const source = generateLitTest(corpusIR("Toast"));

    expect(source).toContain(`import "../Toast";`);
    expect(source).toContain(`describe("Toast — unit"`);
  });
});
