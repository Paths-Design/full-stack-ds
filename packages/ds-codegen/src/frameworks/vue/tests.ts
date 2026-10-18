/**
 * Vue test source emission, IR test-plan driven.
 */
import type { ComponentIR } from "../../ir.js";
import { renderSections, type Section } from "../../preserve.js";
import { portalsRootToBody, selectorAnchoredRootPortal } from "../../semantics.js";
import {
  buildComponentTestPlan,
  findIndeterminateAriaCheckedFact,
  runtimeRequiredPropExpression,
} from "../../test-plan.js";

export function generateVueTest(ir: ComponentIR): string {
  const plan = buildComponentTestPlan(ir);
  // FEAT-PORTAL-MECHANISM-CROSS-FRAMEWORK-01: full-overlay surfaces render
  // their root through <Teleport to="body">, so @vue/test-utils' `wrapper`
  // no longer wraps the root element (`wrapper.element` is the teleport anchor
  // comment). Class/role/axe assertions must resolve the teleported root from
  // document.body instead. IR-driven via `portalsRootToBody` — no name lore.
  // Selector-anchored root portals (coachmark tours) also teleport the root
  // and need the same document.body resolution/reset in generated tests.
  const portalRoot =
    portalsRootToBody(ir) || selectorAnchoredRootPortal(ir) !== null;
  // Resolve the teleported root by its base class within document.body —
  // fallthrough attrs (data-testid) do not reach a teleported root, so the
  // component's own class is the only reliable handle. Safe because each
  // portal-mode test resets document.body in afterEach.
  const rootDecl = `    const root = document.body.querySelector<HTMLElement>(".${plan.cssPrefix}");\n    expect(root).not.toBeNull();`;
  // Escape dismissals rely on a document-level keydown listener that is only
  // wired by the dom-tree behavior hook. Stack-only components have no such
  // listener, so Escape tests would always fail and are omitted here.
  const emitEscape = plan.escapeDismissals.length > 0 && !!ir.dom;
  // Overlay-click tests click the root wrapper; only valid for dom-tree components
  // where the overlay backdrop is rendered and the dismissal listener is wired.
  const emitOverlayClick = plan.overlayClickDismissals.length > 0 && !!ir.dom;
  // Channel click/change tests fire events on the root wrapper element. For
  // dom-tree components the handler is bound deeper in the shadow; those
  // components already have exhaustive custom test blocks. Only emit
  // interaction tests for stack-only components where @click/@change on the
  // root wrapper correctly reaches the prop handler.
  const emitChannelInteraction = plan.channels.length > 0 && !ir.dom;
  // The vitest import set is derived from emitted-body usage: `vi` is
  // imported only when the generated tests section itself references it
  // (the vi.fn() spies emitted below). @custom test blocks import their
  // own `vi` — the Svelte-side convention — so preserved content can
  // never keep an unused import alive in the generated section.

  const lines: string[] = [];
  lines.push(`const componentAxeOptions = {`);
  lines.push(`  rules: {`);
  lines.push(`    // \`region\` asks whether all page content is landmark-contained.`);
  lines.push(`    // These tests scan one component subtree, not a complete page.`);
  lines.push(`    region: { enabled: false },`);
  lines.push(`  },`);
  lines.push(`};`);
  lines.push(``);
  lines.push(`describe("${plan.name} — unit", () => {`);
  if (portalRoot) {
    // Teleported roots accumulate in document.body across mounts; reset so
    // the class-based root query always resolves the current test's mount.
    lines.push(`  afterEach(() => {`);
    lines.push(`    document.body.innerHTML = "";`);
    lines.push(`  });`);
    lines.push(``);
  }
  lines.push(`  it("renders with default props", () => {`);
  lines.push(`    const wrapper = ${mountExpression(plan.name, plan)};`);
  lines.push(`    expect(wrapper.element).toBeTruthy();`);
  lines.push(`  });`);
  lines.push(``);

  lines.push(`  it("applies the base CSS class", () => {`);
  if (portalRoot) {
    lines.push(`    ${mountExpression(plan.name, plan, { attachTo: "document.body" })};`);
    lines.push(rootDecl);
    lines.push(`    expect(root?.classList.contains("${plan.cssPrefix}")).toBe(true);`);
  } else {
    lines.push(`    const wrapper = ${mountExpression(plan.name, plan)};`);
    lines.push(`    expect(wrapper.classes()).toContain("${plan.cssPrefix}");`);
  }
  lines.push(`  });`);
  lines.push(``);

  lines.push(`  it("merges custom class", () => {`);
  if (portalRoot) {
    lines.push(
      `    ${mountExpression(plan.name, plan, { attrs: { class: "custom" }, attachTo: "document.body" })};`,
    );
    lines.push(rootDecl);
    lines.push(`    expect(root?.classList.contains("${plan.cssPrefix}")).toBe(true);`);
    lines.push(`    expect(root?.classList.contains("custom")).toBe(true);`);
  } else {
    lines.push(
      `    const wrapper = ${mountExpression(plan.name, plan, { attrs: { class: "custom" } })};`,
    );
    lines.push(`    expect(wrapper.classes()).toContain("${plan.cssPrefix}");`);
    lines.push(`    expect(wrapper.classes()).toContain("custom");`);
  }
  lines.push(`  });`);
  lines.push(``);

  // A consumer-passed data-testid must reach the rendered DOM. The attribute
  // is a declared prop, so it does not fall through: the template binding is
  // the only path, and a mis-keyed prop read drops it silently.
  const testIdSelector = `[data-testid="${plan.testId}"]`;
  lines.push(`  it("forwards data-testid to the rendered element", () => {`);
  if (portalRoot) {
    lines.push(`    ${mountExpression(plan.name, plan, { attachTo: "document.body" })};`);
    lines.push(`    expect(document.body.querySelector('${testIdSelector}')).not.toBeNull();`);
  } else {
    lines.push(`    const wrapper = ${mountExpression(plan.name, plan)};`);
    lines.push(`    expect(wrapper.find('${testIdSelector}').exists()).toBe(true);`);
  }
  lines.push(`  });`);

  if (plan.role) {
    lines.push(``);
    lines.push(`  it("has the correct ARIA role", () => {`);
    if (portalRoot) {
      lines.push(`    ${mountExpression(plan.name, plan, { attachTo: "document.body" })};`);
      lines.push(rootDecl);
      lines.push(`    expect(root?.getAttribute("role")).toBe("${plan.role.role}");`);
    } else {
      lines.push(`    const wrapper = ${mountExpression(plan.name, plan)};`);
      lines.push(`    expect(wrapper.attributes("role")).toBe("${plan.role.role}");`);
    }
    lines.push(`  });`);
  }

  for (const variant of plan.variants) {
    lines.push(``);
    lines.push(
      `  it("applies ${variant.dimension}=${variant.value} variant class", () => {`,
    );
    if (portalRoot) {
      lines.push(
        `    ${mountExpression(plan.name, plan, { props: { [variant.dimension]: variant.value }, attachTo: "document.body" })};`,
      );
      lines.push(rootDecl);
      lines.push(`    expect(root?.classList.contains("${variant.className}")).toBe(true);`);
    } else {
      lines.push(
        `    const wrapper = ${mountExpression(plan.name, plan, { props: { [variant.dimension]: variant.value } })};`,
      );
      lines.push(`    expect(wrapper.classes()).toContain("${variant.className}");`);
    }
    lines.push(`  });`);
  }

  if (emitChannelInteraction) {
    for (const testCase of plan.channels) {
      const { channel, spyName } = testCase;
      lines.push(``);
      lines.push(
        `  it("calls ${channel.changeHandlerProp} when ${channel.name} changes", async () => {`,
      );
      lines.push(`    const ${spyName} = vi.fn();`);
      if (testCase.interaction === "click") {
        lines.push(
          `    const wrapper = ${mountExpression(plan.name, plan, { props: { [channel.changeHandlerProp]: { code: spyName } } })};`,
        );
        lines.push(`    await wrapper.trigger("click");`);
        lines.push(`    expect(${spyName}).toHaveBeenCalled();`);
      } else if (testCase.interaction === "change") {
        lines.push(
          `    const wrapper = ${mountExpression(plan.name, plan, { props: { [channel.changeHandlerProp]: { code: spyName } } })};`,
        );
        lines.push(`    await wrapper.trigger("change");`);
        lines.push(`    expect(${spyName}).toHaveBeenCalled();`);
      } else {
        lines.push(
          `    expect(() => ${mountExpression(plan.name, plan, { props: { [channel.valueProp]: false, [channel.changeHandlerProp]: { code: spyName } } })}).not.toThrow();`,
        );
      }
      lines.push(`  });`);
    }
  }

  if (emitEscape) for (const testCase of plan.escapeDismissals) {
    lines.push(``);
    lines.push(`  it("closes on Escape key", async () => {`);
    lines.push(`    const ${testCase.spyName} = vi.fn();`);
    lines.push(
      `    ${mountExpression(plan.name, plan, {
        props: {
          [testCase.channel.valueProp]: true,
          [testCase.channel.changeHandlerProp]: { code: testCase.spyName },
        },
        attachTo: "document.body",
      })};`,
    );
    lines.push(
      `    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));`,
    );
    lines.push(`    expect(${testCase.spyName}).toHaveBeenCalledWith(false);`);
    lines.push(`  });`);
  }

  // DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01: durable runtime
  // proof that indeterminate lowers to a real DOM-property reflection (not
  // an attribute) and aria-checked reflects the tri-state. Gated on the IR
  // fact (propertyBindings.indeterminate + an aria-checked "mixed"
  // conditional coexisting on the same node), shared with React/Angular's
  // generators so any future contract with this same fact pattern gets
  // this test for free.
  const indeterminateFact = findIndeterminateAriaCheckedFact(ir.dom);
  if (indeterminateFact) {
    // The mount wrapper's element is the ROOT. When the fact sits on a
    // nested part (Checkbox's `<label>` > `<input>` composite) the root does
    // not carry the property, and the proof silently asserts `undefined`.
    const indeterminateEl = indeterminateFact.part
      ? `wrapper.element.querySelector(".${ir.classRecipe.base}__${indeterminateFact.part}") as HTMLInputElement`
      : `wrapper.element as HTMLInputElement`;
    lines.push(``);
    lines.push(
      `  it("sets .${indeterminateFact.propertyKey} as a DOM property (not an attribute) and lowers aria-checked to mixed", () => {`,
    );
    lines.push(
      `    const wrapper = ${mountExpression(plan.name, plan, { props: { [indeterminateFact.propertyKey]: true } })};`,
    );
    lines.push(
      `    const el = ${indeterminateEl};`,
    );
    lines.push(`    expect(el.${indeterminateFact.propertyKey}).toBe(true);`);
    lines.push(`    expect(el.getAttribute("aria-checked")).toBe("mixed");`);
    lines.push(`  });`);

    // Reactive-update ratchet: the mount-only test above can't distinguish
    // "the binding is reactive" from "the binding happened to write the
    // right value once at mount." wrapper.setProps() is Vue Test Utils'
    // own API for pushing a new prop through the real reactive-props
    // pipeline (confirmed against the installed @vue/test-utils package —
    // it returns a Promise and must be awaited before Vue's DOM patch
    // flushes). This genuinely falsifies a mount-only property write: a
    // one-time write would leave el.indeterminate stuck at `true` after
    // setProps({ indeterminate: false }) below.
    lines.push(``);
    lines.push(
      `  it("re-applies .${indeterminateFact.propertyKey} when the prop changes from true to false, and aria-checked reflects checked state again", async () => {`,
    );
    lines.push(
      `    const wrapper = ${mountExpression(plan.name, plan, { props: { [indeterminateFact.propertyKey]: true } })};`,
    );
    lines.push(
      `    const el = ${indeterminateEl};`,
    );
    lines.push(`    expect(el.${indeterminateFact.propertyKey}).toBe(true);`);
    lines.push(
      `    await wrapper.setProps({ ${indeterminateFact.propertyKey}: false });`,
    );
    lines.push(`    expect(el.${indeterminateFact.propertyKey}).toBe(false);`);
    lines.push(`    expect(el.getAttribute("aria-checked")).toBe("false");`);
    lines.push(`  });`);
  }

  if (emitOverlayClick) for (const testCase of plan.overlayClickDismissals) {
    lines.push(``);
    lines.push(`  it("closes on overlay click", async () => {`);
    lines.push(`    const ${testCase.spyName} = vi.fn();`);
    const wrapper = mountExpression(plan.name, plan, {
      props: {
        [testCase.channel.valueProp]: true,
        [testCase.channel.changeHandlerProp]: { code: testCase.spyName },
      },
      attachTo: "document.body",
    });
    // FIX-OVERLAY-CLICK-DISMISSAL-BINDING-01: dispatch the click on the
    // overlay element itself — jsdom does no hit-testing, so triggering on
    // the root proved nothing while the overlay child swallows every scrim
    // click at hit-test time in a real browser.
    const overlaySelector = testCase.trigger.targetPart
      ? `.${plan.cssPrefix}__${testCase.trigger.targetPart}`
      : null;
    if (portalRoot) {
      // The teleported root lives in document.body, so trigger the click on
      // the resolved DOM node (wrapper no longer wraps the root element).
      lines.push(`    ${wrapper};`);
      lines.push(rootDecl);
      if (overlaySelector) {
        lines.push(`    root?.querySelector<HTMLElement>("${overlaySelector}")?.click();`);
      } else {
        lines.push(`    root?.dispatchEvent(new MouseEvent("click", { bubbles: true }));`);
      }
      lines.push(`    await Promise.resolve();`);
    } else {
      lines.push(`    const wrapper = ${wrapper};`);
      if (overlaySelector) {
        lines.push(`    wrapper.element.querySelector<HTMLElement>("${overlaySelector}")?.click();`);
      } else {
        lines.push(`    await wrapper.trigger("click");`);
      }
      lines.push(`    await Promise.resolve();`);
    }
    lines.push(`    expect(${testCase.spyName}).toHaveBeenCalledWith(false);`);
    lines.push(`  });`);
  }

  lines.push(`});`);
  lines.push(``);
  lines.push(`describe("${plan.name} — accessibility", () => {`);
  lines.push(
    `  it("has no unexpected axe violations with default props", async () => {`,
  );
  const axeLabelInput = plan.accessibility.labelInput;
  const axeProps: Record<string, MountValue> = Object.fromEntries(
    plan.requiredProps.map((prop) => [
      prop.name,
      { code: runtimeRequiredPropExpression(prop.expression) },
    ]),
  );
  for (const prop of plan.accessibility.props) {
    axeProps[prop.name] = prop.value;
  }
  if (axeLabelInput?.kind === "prop") {
    axeProps[axeLabelInput.name] = axeLabelInput.value;
  }
  const axeAttrs: Record<string, string> =
    axeLabelInput?.kind === "attribute"
      ? { [axeLabelInput.name]: axeLabelInput.value }
      : {};
  const axeSlots = Object.fromEntries(
    plan.accessibility.content.map((fixture) => [
      fixture.slotName ?? "default",
      fixture.html,
    ]),
  );
  if (portalRoot) {
    // Teleported root lives in document.body; resolve it and run axe on it.
    lines.push(
      `    ${mountExpression(plan.name, plan, {
        props: axeProps,
        attrs: axeAttrs,
        slots: axeSlots,
        attachTo: "document.body",
      })};`,
    );
    lines.push(rootDecl);
    if (plan.accessibility.needsListParent) {
      lines.push(`    const list = document.createElement("ul");`);
      lines.push(`    if (root) list.append(root);`);
      lines.push(`    const results = await axe(list, componentAxeOptions);`);
    } else {
      lines.push(`    const results = await axe(root as Element, componentAxeOptions);`);
    }
  } else {
    lines.push(
      `    const wrapper = ${mountExpression(plan.name, plan, {
        props: axeProps,
        attrs: axeAttrs,
        slots: axeSlots,
      })};`,
    );
    if (plan.accessibility.needsListParent) {
      lines.push(`    const list = document.createElement("ul");`);
      lines.push(`    list.append(wrapper.element);`);
      lines.push(`    const results = await axe(list, componentAxeOptions);`);
    } else {
      lines.push(`    const results = await axe(wrapper.element, componentAxeOptions);`);
    }
  }
  lines.push(`    expect(results.violations.map((v) => v.id)).toEqual([]);`);
  lines.push(`  });`);
  lines.push(`});`);

  const testsBody = lines.join("\n");
  const needsVi = /\bvi\s*\./.test(testsBody);
  const importsBody = [
    `import { describe, it, expect${needsVi ? ", vi" : ""}${portalRoot ? ", afterEach" : ""} } from "vitest";`,
    `import type { Component } from "vue";`,
    `import { mount } from "@vue/test-utils";`,
    `import { axe } from "vitest-axe";`,
    `import ${plan.name} from "../${plan.name}.vue";`,
  ].join("\n");

  const sections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    { kind: "between", body: "" },
    { kind: "generated", id: "tests", body: testsBody },
    { kind: "between", body: "" },
    { kind: "custom", id: "tests", body: "" },
    { kind: "between", body: "" },
  ];

  return renderSections(sections, "line");
}

type MountValue = string | number | boolean | { code: string };

interface MountOverrides {
  props?: Record<string, MountValue>;
  attrs?: Record<string, string>;
  slots?: Record<string, string>;
  /** When set, emits `attachTo: <value>` so the component is mounted in the real DOM (needed for document-level event listeners). */
  attachTo?: string;
}

function mountExpression(
  componentName: string,
  plan: {
    renderOpenProp?: string;
    requiredProps: Array<{ name: string; expression: string }>;
    testId: string;
  },
  overrides: MountOverrides = {},
): string {
  const props: Record<string, MountValue> = {
    ...Object.fromEntries(
      plan.requiredProps.map((prop) => [
        prop.name,
        { code: runtimeRequiredPropExpression(prop.expression) },
      ]),
    ),
    ...(plan.renderOpenProp ? { [plan.renderOpenProp]: true } : {}),
    ...(overrides.props ?? {}),
  };
  const attrs: Record<string, string> = {
    "data-testid": plan.testId,
    ...(overrides.attrs ?? {}),
  };
  const attachToPart = overrides.attachTo ? `, attachTo: ${overrides.attachTo}` : "";
  const slots = { default: "content", ...(overrides.slots ?? {}) };

  return `mount(${componentName} as Component, { props: ${objectLiteral(props)}, attrs: ${objectLiteral(attrs)}, slots: ${objectLiteral(slots)}${attachToPart} })`;
}

function objectLiteral(values: Record<string, MountValue>): string {
  const entries = Object.entries(values);
  if (entries.length === 0) return "{}";
  return `{ ${entries
    .map(([key, value]) => `${JSON.stringify(key)}: ${literal(value)}`)
    .join(", ")} }`;
}

function literal(value: MountValue): string {
  if (typeof value === "object") return value.code;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}
