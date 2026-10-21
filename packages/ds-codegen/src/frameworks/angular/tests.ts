import type { ComponentIR, DomNodeIR, NormalizedChannelIR } from "../../ir.js";
import { renderSections, type Section } from "../../preserve.js";
import {
  buildComponentTestPlan,
  findIndeterminateAriaCheckedFact,
  runtimeRequiredPropExpression,
} from "../../test-plan.js";
import { toKebab } from "../../contract.js";
import { portalsRootToBody, selectorAnchoredRootPortal } from "../../semantics.js";
import { jestGlobalsImportLine } from "./emitted-imports.js";

export function generateAngularTest(ir: ComponentIR): string {
  const plan = buildComponentTestPlan(ir);
  const className = `${plan.name}Component`;
  const isDomTree = ir.dom !== undefined;

  // Dismissal tests are only reliable for dom-tree components (they wire document listeners).
  const emitEscape = plan.escapeDismissals.length > 0 && isDomTree;
  const emitOverlayClick = plan.overlayClickDismissals.length > 0 && isDomTree;

  // Angular stack-only components do not consistently expose change-handler callbacks as
  // @Input() props (they are layout wrappers delegating to the stack). Dom-tree components
  // have comprehensive channel tests written in the @custom block. No generated channel
  // prop tests are emitted for Angular.

  const fixtureExpression =
    plan.requiredProps.length > 0
      ? "createFixture()"
      : `TestBed.createComponent(${className})`;

  const lines: string[] = [];
  if (isDomTree && plan.requiredProps.length > 0) {
    lines.push(`function createFixture() {`);
    lines.push(`  const fixture = TestBed.createComponent(${className});`);
    for (const prop of plan.requiredProps) {
      lines.push(
        `  fixture.componentInstance[${JSON.stringify(prop.name)}] = ${runtimeRequiredPropExpression(prop.expression)} as never;`,
      );
    }
    lines.push(`  return fixture;`);
    lines.push(`}`);
    lines.push(``);
  }
  lines.push(`describe("${plan.name} — unit", () => {`);

  if (isDomTree) {
    // dom-tree components use inject() and Angular effects in their constructors;
    // TestBed provides the full environment injector with ChangeDetectionScheduler.
    lines.push(`  beforeEach(() => {`);
    lines.push(`    TestBed.configureTestingModule({ imports: [${className}] });`);
    lines.push(`  });`);
    lines.push(``);
    lines.push(`  it("creates the component", () => {`);
    lines.push(`    const fixture = ${fixtureExpression};`);
    lines.push(`    expect(fixture.componentInstance).toBeInstanceOf(${className});`);
    lines.push(`  });`);
    lines.push(``);
    lines.push(`  it("applies the base CSS class", () => {`);
    lines.push(`    const fixture = ${fixtureExpression};`);
    lines.push(`    expect(classTokens(fixture.componentInstance)).toContain("${plan.cssPrefix}");`);
    lines.push(`  });`);

    // FIX-CHANNEL-EVENT-LOWERING-001: a boolean channel click on a
    // non-form host must toggle through the change callback. Only emitted
    // for unguarded hosts (rendered by default) so the click is reachable.
    const channelClick = findUnguardedBooleanChannelClick(ir);
    if (channelClick) {
      const selector =
        channelClick.node === ir.dom
          ? `.${plan.cssPrefix}`
          : `.${plan.cssPrefix}__${channelClick.node.part}`;
      lines.push(``);
      lines.push(
        `  it("toggles the ${channelClick.channel.name} channel from the ${channelClick.node.part ?? "root"} click", () => {`,
      );
      lines.push(`    const fixture = ${fixtureExpression};`);
      lines.push(`    const seen: boolean[] = [];`);
      lines.push(
        `    fixture.componentInstance.${channelClick.channel.changeHandlerProp} = (v: boolean) => seen.push(v);`,
      );
      lines.push(`    fixture.detectChanges();`);
      lines.push(
        `    const host = fixture.nativeElement.querySelector("${selector}") as HTMLElement;`,
      );
      lines.push(`    host.click();`);
      lines.push(
        `    expect(seen).toEqual([${channelClickExpectedValue(ir, channelClick.channel)}]);`,
      );
      lines.push(`  });`);
    }

    for (const variant of plan.variants) {
      lines.push(``);
      lines.push(
        `  it("applies ${variant.dimension}=${variant.value} variant class", () => {`,
      );
      lines.push(`    const fixture = ${fixtureExpression};`);
      lines.push(
        `    fixture.componentInstance.${variant.dimension} = "${variant.value}";`,
      );
      lines.push(
        `    expect(classTokens(fixture.componentInstance)).toContain("${variant.className}");`,
      );
      lines.push(`  });`);
    }

    // DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01: durable runtime
    // proof that indeterminate lowers to a real DOM-property reflection (not
    // an attribute) and aria-checked reflects the tri-state. Gated on the IR
    // fact (propertyBindings.indeterminate + an aria-checked "mixed"
    // conditional coexisting on the same node), not the component name — any
    // future contract with this same fact pattern gets this test for free.
    const indeterminateFact = findIndeterminateAriaCheckedFact(ir.dom);
    if (indeterminateFact) {
      lines.push(``);
      lines.push(
        `  it("sets .${indeterminateFact.propertyKey} as a DOM property (not an attribute) and lowers aria-checked to mixed", () => {`,
      );
      lines.push(`    const fixture = ${fixtureExpression};`);
      lines.push(
        `    fixture.componentInstance.${indeterminateFact.propertyKey} = true;`,
      );
      lines.push(`    fixture.detectChanges();`);
      lines.push(
        `    const el = fixture.nativeElement.querySelector("input") as HTMLInputElement;`,
      );
      lines.push(`    expect(el.${indeterminateFact.propertyKey}).toBe(true);`);
      lines.push(`    expect(el.getAttribute("aria-checked")).toBe("mixed");`);
      lines.push(`  });`);

      // Reactive-update ratchet: the mount-only test above can't
      // distinguish "the binding is reactive" from "the binding happened
      // to write the right value once at construction." Uses
      // fixture.componentRef.setInput (Angular's own API for simulating
      // an @Input change through the real input-binding pipeline) rather
      // than mutating componentInstance directly — jest-preset-angular's
      // strict change-detection rejects post-detectChanges mutation of a
      // consumer @Input on a TestBed host (confirmed via a runtime
      // probe: even the pre-existing `checked` binding silently fails to
      // re-render that way; see Popover.test.ts's "controlled open prop
      // overrides internal state" comment for the same finding). This
      // genuinely falsifies a mount/constructor-only property write: a
      // one-time write would leave el.indeterminate stuck at `true`
      // after the setInput(false) below.
      lines.push(``);
      lines.push(
        `  it("re-applies .${indeterminateFact.propertyKey} when the input changes from true to false, and aria-checked reflects checked state again", () => {`,
      );
      lines.push(`    const fixture = ${fixtureExpression};`);
      lines.push(
        `    fixture.componentRef.setInput("${indeterminateFact.propertyKey}", true);`,
      );
      lines.push(`    fixture.detectChanges();`);
      lines.push(
        `    const el = fixture.nativeElement.querySelector("input") as HTMLInputElement;`,
      );
      lines.push(`    expect(el.${indeterminateFact.propertyKey}).toBe(true);`);
      lines.push(
        `    fixture.componentRef.setInput("${indeterminateFact.propertyKey}", false);`,
      );
      lines.push(`    fixture.detectChanges();`);
      lines.push(`    expect(el.${indeterminateFact.propertyKey}).toBe(false);`);
      lines.push(
        `    expect(el.getAttribute("aria-checked")).toBe("false");`,
      );
      lines.push(`  });`);
    }
  } else {
    lines.push(`  it("creates the component class", () => {`);
    lines.push(`    expect(new ${className}()).toBeInstanceOf(${className});`);
    lines.push(`  });`);
    lines.push(``);
    lines.push(`  it("applies the base CSS class", () => {`);
    lines.push(`    const component = new ${className}();`);
    lines.push(`    expect(classTokens(component)).toContain("${plan.cssPrefix}");`);
    lines.push(`  });`);

    for (const variant of plan.variants) {
      lines.push(``);
      lines.push(
        `  it("applies ${variant.dimension}=${variant.value} variant class", () => {`,
      );
      lines.push(`    const component = new ${className}();`);
      lines.push(`    component.${variant.dimension} = "${variant.value}";`);
      lines.push(
        `    expect(classTokens(component)).toContain("${variant.className}");`,
      );
      lines.push(`  });`);
    }

  }

  lines.push(`});`);

  // Dismissal tests for dom-tree components — document-level Escape listener.
  if (emitEscape) {
    for (const testCase of plan.escapeDismissals) {
      lines.push(``);
      lines.push(`describe("${plan.name} — Escape dismissal", () => {`);
      lines.push(`  beforeEach(() => {`);
      lines.push(`    TestBed.configureTestingModule({ imports: [${className}] });`);
      lines.push(`  });`);
      lines.push(``);
      lines.push(`  it("closes on Escape key", () => {`);
      lines.push(`    const fixture = ${fixtureExpression};`);
      lines.push(`    const ${testCase.spyName} = jest.fn();`);
      lines.push(
        `    fixture.componentInstance.${testCase.channel.valueProp} = true;`,
      );
      lines.push(
        `    fixture.componentInstance.${testCase.channel.changeHandlerProp} = ${testCase.spyName};`,
      );
      lines.push(`    fixture.detectChanges();`);
      lines.push(
        `    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));`,
      );
      lines.push(`    expect(${testCase.spyName}).toHaveBeenCalledWith(false);`);
      lines.push(`  });`);
      lines.push(`});`);
    }
  }

  // Dismissal tests for dom-tree components — overlay click on the presentation layer.
  if (emitOverlayClick) {
    for (const testCase of plan.overlayClickDismissals) {
      lines.push(``);
      lines.push(`describe("${plan.name} — overlay-click dismissal", () => {`);
      lines.push(`  beforeEach(() => {`);
      lines.push(`    TestBed.configureTestingModule({ imports: [${className}] });`);
      lines.push(`  });`);
      lines.push(``);
      lines.push(`  it("closes on overlay click", () => {`);
      lines.push(`    const fixture = ${fixtureExpression};`);
      lines.push(`    const ${testCase.spyName} = jest.fn();`);
      lines.push(
        `    fixture.componentInstance.${testCase.channel.valueProp} = true;`,
      );
      lines.push(
        `    fixture.componentInstance.${testCase.channel.changeHandlerProp} = ${testCase.spyName};`,
      );
      lines.push(`    fixture.detectChanges();`);
      lines.push(
        `    const overlay = fixture.nativeElement.querySelector('[role="presentation"]') as HTMLElement;`,
      );
      lines.push(`    overlay?.click();`);
      lines.push(`    expect(${testCase.spyName}).toHaveBeenCalledWith(false);`);
      lines.push(`  });`);
      lines.push(`});`);
    }
  }

  lines.push(``);
  lines.push(...angularAxeLines(ir, plan));

  lines.push(``);
  lines.push(`function classTokens(component: { classes: () => string }): string[] {`);
  lines.push(`  return component.classes().split(/\\s+/).filter(Boolean);`);
  lines.push(`}`);

  // CODEGEN-EMIT-LINT-HYGIENE-01: the @jest/globals specifier set derives
  // from the emitted test body — `jest` is referenced only by the
  // dismissal describes' `jest.fn()` spies, so a dom-tree suite without
  // dismissal tests imports `beforeEach` (its TestBed setup) but not
  // `jest`.
  const importsBody = [
    jestGlobalsImportLine(lines.join("\n")),
    `import { Component } from "@angular/core";`,
    `import { TestBed } from "@angular/core/testing";`,
    `import axe from "axe-core";`,
    `import { ${className} } from "../${plan.name}.component";`,
  ].join("\n");

  const sections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    { kind: "between", body: "" },
    { kind: "generated", id: "tests", body: lines.join("\n") },
    { kind: "between", body: "" },
    { kind: "custom", id: "tests", body: "" },
    { kind: "between", body: "" },
  ];
  return renderSections(sections, "line");
}


/**
 * The axe scan the other web frameworks run, from the same plan inputs: the
 * component renders inside a host template that binds the required,
 * render-open and role-activating props and the label input, and projects the contract's
 * content fixtures (named ones through `[slot=<name>]`). The scan root is the
 * element carrying the base class; a portalled root lives in document.body.
 */
function angularAxeLines(
  ir: ComponentIR,
  plan: ReturnType<typeof buildComponentTestPlan>,
): string[] {
  const hostName = `${plan.name}AxeHost`;
  const inputs = new Map<string, string>();
  for (const prop of plan.requiredProps) {
    inputs.set(prop.name, runtimeRequiredPropExpression(prop.expression));
  }
  // An overlay renders its content only while open; scan it open, as the
  // other frameworks do.
  if (plan.renderOpenProp) inputs.set(plan.renderOpenProp, "true");
  for (const prop of plan.accessibility.props) {
    inputs.set(prop.name, JSON.stringify(prop.value));
  }
  const label = plan.accessibility.labelInput;
  if (label?.kind === "prop") inputs.set(label.name, JSON.stringify(label.value));

  const hostAttributes = [...inputs.keys()].map((name) => ` [${name}]="${name}"`);
  if (label?.kind === "attribute") hostAttributes.push(` ${label.name}="${label.value}"`);
  const content = plan.accessibility.content
    .map((fixture) => fixture.slotName ? withSlotAttribute(fixture.html, fixture.slotName) : fixture.html)
    .join("");
  const selector = `fsds-${toKebab(plan.name)}`;
  const template = `<${selector}${hostAttributes.join("")}>${content}</${selector}>`;
  const portal = portalsRootToBody(ir) || selectorAnchoredRootPortal(ir) !== null;
  const scope = portal ? "document.body" : "(fixture.nativeElement as HTMLElement)";

  const lines: string[] = [];
  lines.push(`// \`region\` asks whether all page content is landmark-contained, a page`);
  lines.push(`// question; a single component under test cannot answer it.`);
  lines.push(`const componentAxeOptions = { rules: { region: { enabled: false } } };`);
  lines.push(``);
  lines.push(`@Component({`);
  lines.push(`  standalone: true,`);
  lines.push(`  imports: [${plan.name}Component],`);
  lines.push(`  template: ${JSON.stringify(template)},`);
  lines.push(`})`);
  if (inputs.size === 0) {
    lines.push(`class ${hostName} {}`);
  } else {
    lines.push(`class ${hostName} {`);
    for (const [name, expression] of inputs) lines.push(`  readonly ${name} = ${expression};`);
    lines.push(`}`);
  }
  lines.push(``);
  lines.push(`describe("${plan.name} — accessibility", () => {`);
  lines.push(`  it("has no unexpected axe violations with default props", async () => {`);
  lines.push(`    TestBed.configureTestingModule({ imports: [${hostName}] });`);
  lines.push(`    const fixture = TestBed.createComponent(${hostName});`);
  lines.push(`    fixture.detectChanges();`);
  lines.push(`    await fixture.whenStable();`);
  lines.push(`    const root = ${scope}.querySelector<HTMLElement>(".${plan.cssPrefix}");`);
  lines.push(`    expect(root).not.toBeNull();`);
  if (plan.accessibility.needsListParent) {
    lines.push(`    const list = document.createElement("ul");`);
    lines.push(`    document.body.append(list);`);
    lines.push(`    list.append(root as HTMLElement);`);
    lines.push(`    const results = await axe.run(list, componentAxeOptions);`);
    lines.push(`    list.remove();`);
  } else {
    lines.push(`    const results = await axe.run(root as HTMLElement, componentAxeOptions);`);
  }
  lines.push(`    expect(results.violations.map((v) => v.id)).toEqual([]);`);
  lines.push(`  });`);
  lines.push(`});`);
  return lines;
}

/** Marks a fixture's outermost element for `<ng-content select="[slot=…]">`. */
function withSlotAttribute(html: string, slotName: string): string {
  return html.replace(/^<([a-zA-Z][\w-]*)/, `<$1 slot="${slotName}"`);
}

/**
 * First-click expectation for a boolean channel toggle: the channel starts at
 * the default-value prop's contract default (false when none is declared), so
 * the click must emit its negation.
 */
function channelClickExpectedValue(
  ir: ComponentIR,
  channel: NormalizedChannelIR,
): string {
  const defaultProp = channel.defaultValueProp
    ? ir.styledProps.find((p) => p.name === channel.defaultValueProp)
    : undefined;
  return defaultProp?.defaultExpr === "true" ? "false" : "true";
}

/**
 * First dom node with a boolean-channel click event on a non-form host
 * and no if-guard on itself or any ancestor (so a generated test can
 * click it without arranging state first).
 */
function findUnguardedBooleanChannelClick(
  ir: ComponentIR,
): { node: DomNodeIR; channel: NormalizedChannelIR } | null {
  const FORM_HOSTS = new Set(["input", "textarea", "select"]);
  const channelByName = new Map(
    ir.behavior.normalizedChannels.map((c) => [c.name, c]),
  );
  const visit = (
    node: DomNodeIR | undefined,
  ): { node: DomNodeIR; channel: NormalizedChannelIR } | null => {
    if (!node || node.ifProp) return null;
    const click = node.events["click"];
    if (click && click.kind === "channel" && !FORM_HOSTS.has(node.tag)) {
      const channel = channelByName.get(click.channel);
      if (channel?.valueType === "boolean" && channel.callbackKind !== "event") {
        return { node, channel };
      }
    }
    for (const child of node.children) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(ir.dom);
}
