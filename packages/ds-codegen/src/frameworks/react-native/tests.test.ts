import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { corpusIR } from "../corpus-fixtures.js";
import { generateReactNativeTest } from "./tests.js";

describe("generateReactNativeTest", () => {
  it("emits a ComponentProps type-surface suite from the shared test plan", () => {
    const source = generateReactNativeTest(buildComponentIR(makeContract()));

    expect(source).toContain(`import { describe, it } from "vitest";`);
    expect(source).toContain(`import type { ComponentProps } from "react";`);
    // CODEGEN-EMIT-LINT-HYGIENE-01: the component is referenced only in
    // `ComponentProps<typeof Switch>` type position → type-only import.
    expect(source).toContain(`import type { Switch } from "../Switch";`);
    expect(source).not.toContain(`import { Switch } from "../Switch";`);
    expect(source).toContain(`type SwitchSmokeProps = ComponentProps<typeof Switch>;`);
    expect(source).toContain(`const smokeProps = {} as SwitchSmokeProps;`);
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
          { name: "onChange", type: "(event: unknown) => void" },
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

describe("generateReactNativeTest — real corpus contracts", () => {
  it("emits the compound-selection plan for Tabs", () => {
    const source = generateReactNativeTest(corpusIR("Tabs"));

    expect(source).toContain(
      `describe("Tabs React Native compound selection"`,
    );
    expect(source).toContain(
      `it("pressing a tab drives onValueChange and flips accessibilityState.selected"`,
    );
    expect(source).toContain(`compound component used outside`);
  });

  it("emits the non-blocking live-region surface plan for Toast", () => {
    const source = generateReactNativeTest(corpusIR("Toast"));

    expect(source).toContain(
      `it("renders a non-blocking live region without a modal host"`,
    );
  });

  it("emits the expandable-disclosure plan for Truncate", () => {
    const source = generateReactNativeTest(corpusIR("Truncate"));

    expect(source).toContain(
      `it("renders collapsed content and expanded trigger state"`,
    );
  });

  it("emits the button plan for Button", () => {
    const source = generateReactNativeTest(corpusIR("Button"));

    expect(source).toContain(
      `it("renders button semantics and press passthrough"`,
    );
  });

  it("emits the progress plan for Progress", () => {
    const source = generateReactNativeTest(corpusIR("Progress"));

    expect(source).toContain(
      `it("renders progressbar accessibility value and fill width"`,
    );
  });

  it("emits the checkbox plan for Checkbox", () => {
    const source = generateReactNativeTest(corpusIR("Checkbox"));

    expect(source).toContain(
      `it("renders checkbox semantics and press handler"`,
    );
  });

  it("emits the anchored-surface plan for Dialog", () => {
    const source = generateReactNativeTest(corpusIR("Dialog"));

    expect(source).toContain(
      `it("renders a native modal bound to the open channel"`,
    );
  });

  it("emits the anchored trigger plan for Popover including backdrop dismissal", () => {
    const source = generateReactNativeTest(corpusIR("Popover"));

    expect(source).toContain(
      `it("opens the anchored surface from the trigger interaction"`,
    );
    expect(source).toContain(`dismisses on backdrop press`);
  });

  it("emits the native-toggle plan for the real Switch contract", () => {
    const source = generateReactNativeTest(corpusIR("Switch"));

    expect(source).toContain(
      `it("renders native switch state and change handler"`,
    );
    // Runtime plans render the component → the value import stays a value
    // import (only the type-surface fallback uses `import type`).
    expect(source).toContain(`import { Switch } from "../Switch";`);
    expect(source).not.toContain(`import type { Switch }`);
  });

  it("CODEGEN-EMIT-LINT-HYGIENE-01: Toast timer tests read and unmount their renderer", () => {
    const source = generateReactNativeTest(corpusIR("Toast"));

    const unmounts = source.match(/renderer\?\.unmount\(\);/g) ?? [];
    expect(unmounts.length).toBe(2);
    // Each timer test sets fake timers, unmounts, then restores.
    const firstTimer = source.indexOf("vi.useFakeTimers();");
    const firstUnmount = source.indexOf("renderer?.unmount();");
    const firstReal = source.indexOf("vi.useRealTimers();");
    expect(firstTimer).toBeGreaterThan(-1);
    expect(firstUnmount).toBeGreaterThan(firstTimer);
    expect(firstReal).toBeGreaterThan(firstUnmount);
  });
});
