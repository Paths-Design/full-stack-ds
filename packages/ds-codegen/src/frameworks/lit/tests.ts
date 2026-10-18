/**
 * Lit test source emission, IR test-plan driven.
 *
 * Channel and Escape tests are gated on plan.channels / plan.escapeDismissals,
 * not on ir.dom or litBehaviorRequired — those control template shape, not
 * whether behavioral props exist on the element.
 *
 * For compound-state-container components (Tabs-shaped), the generated section
 * emits only a smoke test + an axe test. The behavioral surface is fully covered
 * by the hand-authored @custom:start tests block in the component's test file.
 */
import type { ComponentIR, NormalizedChannelIR, DomNodeIR } from "../../ir.js";
import { renderSections, type Section } from "../../preserve.js";
import {
  buildComponentTestPlan,
  findIndeterminateAriaCheckedFact,
  runtimeRequiredPropExpression,
} from "../../test-plan.js";
import { isCompoundStateContainer, isDisclosureContainer } from "../react/hook-source.js";

type LitTestPropSource = string | boolean | number | { code: string };

function objectLiteral(values: Record<string, LitTestPropSource>): string {
  const entries = Object.entries(values);
  if (entries.length === 0) return "{}";
  return `{ ${entries
    .map(([key, value]) => `${JSON.stringify(key)}: ${literal(value)}`)
    .join(", ")} }`;
}

function literal(value: LitTestPropSource): string {
  if (typeof value === "object") return value.code;
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

function emitComponentAxeOptions(lines: string[]): void {
  lines.push(`const componentAxeOptions = {`);
  lines.push(`  rules: {`);
  lines.push(`    // \`region\` asks whether all page content is landmark-contained.`);
  lines.push(`    // These tests scan one component subtree, not a complete page.`);
  lines.push(`    region: { enabled: false },`);
  lines.push(`  },`);
  lines.push(`};`);
  lines.push(``);
}

/**
 * Scan a component IR's DOM tree for the rendered signals a channel
 * produces, so the behavioral test can assert the rendered DOM (not just
 * the controller) reflects the channel's value.
 *
 * Two kinds of signal:
 *   - hasGuard: at least one node's `ifProp` matches this channel. The
 *     codegen emits `data-fsds-channel-renders="${name}"` on that node, so
 *     the test selects on the data attribute to verify presence/absence.
 *   - ariaAttrs: ARIA attributes bound to `channel:${name}.value` on any
 *     node. Each attribute serializes as `"true"` / `"false"` strings, so
 *     the test selects on the attribute value.
 */
/**
 * Per-ARIA-attribute metadata so the test can select on the correct DOM
 * location. `insideGuard` means the ARIA attribute lives on a node that's
 * inside the channel's guarded subtree — when the channel flips false, the
 * node is unmounted entirely (so no "value=false" assertion is possible).
 * `insideGuard: false` means the ARIA attribute is on an always-rendered
 * node (typically the root) and its value flips between "true" and "false"
 * in place.
 */
interface AriaAttrInfo {
  attr: string;
  insideGuard: boolean;
}

function findChannelDomMarkers(
  ir: ComponentIR,
  channel: { name: string; valueProp: string },
): {
  hasGuard: boolean;
  ariaAttrs: AriaAttrInfo[];
  requiredProps: string[];
} {
  let hasGuard = false;
  const ariaAttrs = new Map<string, AriaAttrInfo>();
  const requiredProps = new Set<string>();
  // Channel/prop names whose presence we recognize on a path.
  const channelNames = new Set(
    ir.behavior.normalizedChannels.flatMap((c) => [c.name, c.valueProp]),
  );
  const visit = (
    node: DomNodeIR,
    ancestorProps: string[],
    insideChannelGuard: boolean,
  ): void => {
    let nextAncestors = ancestorProps;
    let nextInsideGuard = insideChannelGuard;
    if (node.ifProp && node.ifProp !== "children") {
      if (node.ifProp === channel.name || node.ifProp === channel.valueProp) {
        hasGuard = true;
        nextInsideGuard = true;
      } else if (!channelNames.has(node.ifProp)) {
        // It's a plain prop guard (not another channel). Record it so the
        // test can pass `${prop}: true` when mounting, ensuring the
        // ARIA-bearing subtree is actually rendered.
        nextAncestors = [...ancestorProps, node.ifProp];
      }
    }
    for (const [attr, expr] of Object.entries(node.bindings)) {
      if (
        attr.startsWith("aria-") &&
        expr.kind === "channel" &&
        expr.channel === channel.name &&
        expr.field === "value"
      ) {
        // Earlier finds take precedence; if the same attr appears on
        // multiple nodes, the first-encountered (outermost) wins.
        if (!ariaAttrs.has(attr)) {
          ariaAttrs.set(attr, { attr, insideGuard: nextInsideGuard });
        }
        for (const p of nextAncestors) requiredProps.add(p);
      }
    }
    for (const child of node.children)
      visit(child, nextAncestors, nextInsideGuard);
  };
  if (ir.dom) visit(ir.dom, [], false);
  return {
    hasGuard,
    ariaAttrs: [...ariaAttrs.values()].sort((a, b) =>
      a.attr.localeCompare(b.attr),
    ),
    requiredProps: [...requiredProps].sort(),
  };
}

/**
 * Emit a minimal smoke + axe test for compound-state-container components.
 *
 * The full behavioral surface is in the hand-authored @custom:start tests block.
 * This generated section only asserts that the element renders and passes axe.
 */
function generateCompoundStateContainerTest(ir: ComponentIR): string {
  const plan = buildComponentTestPlan(ir);
  const elementName = `fsds-${plan.testId}`;
  const subTagList = `fsds-${plan.testId}-list`;
  const subTagTab = `fsds-${plan.testId}-tab`;
  const subTagPanel = `fsds-${plan.testId}-panel`;

  const importsBody = [
    `import { describe, expect, it } from "vitest";`,
    `import { axe } from "vitest-axe";`,
    `import "../${plan.name}";`,
  ].join("\n");

  const lines: string[] = [];

  emitComponentAxeOptions(lines);

  lines.push(`describe("${plan.name} — unit", () => {`);
  lines.push(`  it("renders with default props", async () => {`);
  lines.push(`    const container = document.createElement("div");`);
  lines.push(`    container.innerHTML = \`<${elementName} value="a">`);
  lines.push(`  <${subTagList}>`);
  lines.push(`    <${subTagTab} value="a">A</${subTagTab}>`);
  lines.push(`    <${subTagTab} value="b">B</${subTagTab}>`);
  lines.push(`  </${subTagList}>`);
  lines.push(`  <${subTagPanel} value="a">PA</${subTagPanel}>`);
  lines.push(`  <${subTagPanel} value="b">PB</${subTagPanel}>`);
  lines.push(`</${elementName}>\`;`);
  lines.push(`    document.body.append(container);`);
  lines.push(`    await customElements.whenDefined("${elementName}");`);
  lines.push(`    const el = container.querySelector("${elementName}")!;`);
  lines.push(
    `    await (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;`,
  );
  lines.push(`    expect(el).toBeInstanceOf(HTMLElement);`);
  lines.push(`    container.remove();`);
  lines.push(`  });`);

  // Variant tests — applies tabs--horizontal etc.
  for (const variant of plan.variants) {
    lines.push(``);
    lines.push(`  it("applies ${variant.dimension}=${variant.value} variant class", async () => {`);
    lines.push(`    const el = document.createElement("${elementName}") as HTMLElement & {`);
    lines.push(`      updateComplete?: Promise<unknown>;`);
    lines.push(`    };`);
    lines.push(`    el.setAttribute("${variant.dimension}", "${variant.value}");`);
    lines.push(`    const container = document.createElement("div");`);
    lines.push(`    container.append(el);`);
    lines.push(`    document.body.append(container);`);
    lines.push(`    await customElements.whenDefined("${elementName}");`);
    lines.push(`    await el.updateComplete;`);
    lines.push(`    const root = el.shadowRoot?.firstElementChild ?? el;`);
    lines.push(`    const classes = (root?.className ?? "").split(/\\s+/).filter(Boolean);`);
    lines.push(`    expect(classes).toContain("${variant.className}");`);
    lines.push(`    container.remove();`);
    lines.push(`  });`);
  }

  lines.push(`});`);
  lines.push(``);

  lines.push(`describe("${plan.name} — accessibility", () => {`);
  lines.push(`  it("has no unexpected axe violations with default props", async () => {`);
  lines.push(`    // Build elements imperatively so we can set idBase before connecting.`);
  lines.push(`    const container = document.createElement("div");`);
  lines.push(`    await customElements.whenDefined("${elementName}");`);
  lines.push(`    await customElements.whenDefined("${subTagList}");`);
  lines.push(`    await customElements.whenDefined("${subTagTab}");`);
  lines.push(`    await customElements.whenDefined("${subTagPanel}");`);
  lines.push(`    const tabsEl = document.createElement("${elementName}") as HTMLElement & {`);
  lines.push(`      value: string;`);
  lines.push(`      idBase?: string;`);
  lines.push(`      updateComplete?: Promise<unknown>;`);
  lines.push(`    };`);
  lines.push(`    tabsEl.value = "a";`);
  lines.push(`    tabsEl.idBase = "axe-test";`);
  lines.push(`    const listEl = document.createElement("${subTagList}");`);
  lines.push(`    const tabA = document.createElement("${subTagTab}") as HTMLElement & {`);
  lines.push(`      value: string;`);
  lines.push(`      updateComplete?: Promise<unknown>;`);
  lines.push(`    };`);
  lines.push(`    tabA.value = "a"; tabA.textContent = "Tab A";`);
  lines.push(`    const tabB = document.createElement("${subTagTab}") as HTMLElement & {`);
  lines.push(`      value: string;`);
  lines.push(`      updateComplete?: Promise<unknown>;`);
  lines.push(`    };`);
  lines.push(`    tabB.value = "b"; tabB.textContent = "Tab B";`);
  lines.push(`    listEl.append(tabA, tabB);`);
  lines.push(`    const panelA = document.createElement("${subTagPanel}") as HTMLElement & {`);
  lines.push(`      value: string;`);
  lines.push(`      updateComplete?: Promise<unknown>;`);
  lines.push(`    };`);
  lines.push(`    panelA.value = "a"; panelA.textContent = "Panel A";`);
  lines.push(`    const panelB = document.createElement("${subTagPanel}") as HTMLElement & {`);
  lines.push(`      value: string;`);
  lines.push(`      updateComplete?: Promise<unknown>;`);
  lines.push(`    };`);
  lines.push(`    panelB.value = "b"; panelB.textContent = "Panel B";`);
  lines.push(`    tabsEl.append(listEl, panelA, panelB);`);
  lines.push(`    container.append(tabsEl);`);
  lines.push(`    document.body.append(container);`);
  lines.push(`    await tabsEl.updateComplete;`);
  lines.push(`    // Allow time for microtask-deferred tab registration.`);
  lines.push(`    await new Promise((r) => setTimeout(r, 0));`);
  lines.push(`    // Wait for children to re-render after context is established.`);
  lines.push(`    await tabA.updateComplete; await tabB.updateComplete;`);
  lines.push(`    await panelA.updateComplete; await panelB.updateComplete;`);
  lines.push(`    await new Promise((r) => setTimeout(r, 0));`);
  lines.push(`    const results = await axe(container, componentAxeOptions);`);
  lines.push(`    expect(results.violations.map((v) => v.id)).toEqual([]);`);
  lines.push(`    container.remove();`);
  lines.push(`  });`);
  lines.push(`});`);
  lines.push(``);

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

export function generateLitTest(ir: ComponentIR): string {
  // Compound-state-container components (Tabs-shaped) use a hand-authored
  // @custom:start tests block for behavioral coverage. Only emit smoke + axe.
  if (isCompoundStateContainer(ir) && !isDisclosureContainer(ir)) {
    return generateCompoundStateContainerTest(ir);
  }

  const plan = buildComponentTestPlan(ir);
  const elementName = `fsds-${plan.testId}`;
  // Escape tests require a document-level listener wired by the dom-tree
  // behavior class. Stack-only Lit elements have no such listener.
  const emitEscape = plan.escapeDismissals.length > 0 && !!ir.dom;
  // Overlay-click tests dispatch a click on the host element; only valid for
  // dom-tree components where the overlay backdrop and dismissal listener exist.
  const emitOverlayClick = plan.overlayClickDismissals.length > 0 && !!ir.dom;
  // Channel interaction tests dispatch events on the host element. For
  // dom-tree components the real event binding is in the shadow subtree;
  // those components have exhaustive custom test blocks. Only emit for
  // stack-only components where host-level event dispatch reaches the prop.
  const emitChannelInteraction = plan.channels.length > 0 && !ir.dom;
  // Only import vi when the generated section uses it. Dom-tree components
  // have vi in their @custom block imports already, so we don't add it here
  // to avoid duplicate identifier errors.
  const needsVi = emitChannelInteraction || emitEscape || emitOverlayClick;

  const importsBody = [
    `import { describe, expect, it${needsVi ? ", vi" : ""} } from "vitest";`,
    `import { axe } from "vitest-axe";`,
    `import "../${plan.name}";`,
  ].join("\n");

  const lines: string[] = [];

  emitComponentAxeOptions(lines);
  const hasRequiredProps = plan.requiredProps.length > 0;
  if (hasRequiredProps) {
    const requiredProps: Record<string, LitTestPropSource> = Object.fromEntries(
      plan.requiredProps.map((prop) => [
        prop.name,
        { code: runtimeRequiredPropExpression(prop.expression) },
      ]),
    );
    lines.push(`const requiredProps = ${objectLiteral(requiredProps)};`);
    lines.push(``);
  }
  lines.push(`describe("${plan.name} — unit", () => {`);
  lines.push(`  it("renders with default props", async () => {`);
  lines.push(`    const { element } = await renderElement("${elementName}");`);
  lines.push(`    expect(element).toBeInstanceOf(HTMLElement);`);
  lines.push(`  });`);
  lines.push(``);

  if (ir.dom) {
    // Dom-tree components use their own shadow structure; classes live on the
    // shadow root's first child, not on a nested fsds-stack element. Also, some
    // dom-tree components (e.g. Modal) only render content when open — include
    // the open prop to ensure the shadow tree is populated.
    const openProps = plan.renderOpenProp
      ? `, { ${JSON.stringify(plan.renderOpenProp)}: true }`
      : "";
    lines.push(`  it("applies the base CSS class", async () => {`);
    lines.push(
      `    const { element } = await renderElement("${elementName}"${openProps});`,
    );
    lines.push(
      `    const root = element.shadowRoot?.firstElementChild ?? element;`,
    );
    lines.push(`    expect(classTokens(root)).toContain("${plan.cssPrefix}");`);
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
        `  it("toggles the ${channelClick.channel.name} channel from the ${channelClick.node.part ?? "root"} click", async () => {`,
      );
      lines.push(
        `    const { element } = await renderElement("${elementName}");`,
      );
      lines.push(`    const seen: boolean[] = [];`);
      lines.push(
        `    (element as LitTestElement & { ${channelClick.channel.changeHandlerProp}?: (v: boolean) => void }).${channelClick.channel.changeHandlerProp} = (v: boolean) => seen.push(v);`,
      );
      lines.push(`    await (element as LitTestElement).updateComplete;`);
      lines.push(
        `    const host = element.shadowRoot?.querySelector("${selector}") as HTMLElement;`,
      );
      lines.push(`    host.click();`);
      lines.push(
        `    expect(seen).toEqual([${channelClickExpectedValue(ir, channelClick.channel)}]);`,
      );
      lines.push(`  });`);
    }

    const testableVariantDimensions = new Set(
      ir.styledProps.map((prop) => prop.name),
    );
    for (const variant of plan.variants.filter((entry) =>
      testableVariantDimensions.has(entry.dimension),
    )) {
      const variantProps = plan.renderOpenProp
        ? `, { ${JSON.stringify(plan.renderOpenProp)}: true, ${JSON.stringify(variant.dimension)}: ${JSON.stringify(variant.value)} }`
        : `, { ${JSON.stringify(variant.dimension)}: ${JSON.stringify(variant.value)} }`;
      lines.push(``);
      lines.push(
        `  it("applies ${variant.dimension}=${variant.value} variant class", async () => {`,
      );
      lines.push(
        `    const { element } = await renderElement("${elementName}"${variantProps});`,
      );
      lines.push(
        `    const root = element.shadowRoot?.firstElementChild ?? element;`,
      );
      lines.push(
        `    expect(classTokens(root)).toContain("${variant.className}");`,
      );
      lines.push(`  });`);
    }
  } else {
    lines.push(`  it("applies the base CSS class", async () => {`);
    lines.push(`    const { stack } = await renderElement("${elementName}");`);
    lines.push(
      `    expect(classTokens(stack)).toContain("${plan.cssPrefix}");`,
    );
    lines.push(`  });`);

    const testableVariantDimensions = new Set(
      ir.styledProps.map((prop) => prop.name),
    );
    for (const variant of plan.variants.filter((entry) =>
      testableVariantDimensions.has(entry.dimension),
    )) {
      lines.push(``);
      lines.push(
        `  it("applies ${variant.dimension}=${variant.value} variant class", async () => {`,
      );
      lines.push(
        `    const { stack } = await renderElement("${elementName}", { ${JSON.stringify(variant.dimension)}: ${JSON.stringify(variant.value)} });`,
      );
      lines.push(
        `    expect(classTokens(stack)).toContain("${variant.className}");`,
      );
      lines.push(`  });`);
    }
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
          `    const { element } = await renderElement("${elementName}");`,
        );
        lines.push(
          `    (element as unknown as Record<string, unknown>)["${channel.changeHandlerProp}"] = ${spyName};`,
        );
        lines.push(`    element.click();`);
        lines.push(`    expect(${spyName}).toHaveBeenCalled();`);
      } else if (testCase.interaction === "change") {
        // Stack-only Lit elements have no native change event binding on the
        // host. Verify the handler prop is assignable without throwing.
        lines.push(
          `    const { element } = await renderElement("${elementName}");`,
        );
        lines.push(
          `    expect(() => { (element as unknown as Record<string, unknown>)["${channel.changeHandlerProp}"] = ${spyName}; }).not.toThrow();`,
        );
      } else {
        // render-only: verify the prop is assignable without throwing
        lines.push(
          `    const { element } = await renderElement("${elementName}", { "${channel.valueProp}": false });`,
        );
        lines.push(
          `    expect(() => { (element as unknown as Record<string, unknown>)["${channel.changeHandlerProp}"] = ${spyName}; }).not.toThrow();`,
        );
      }
      lines.push(`  });`);
    }
  }

  if (emitEscape) {
    for (const testCase of plan.escapeDismissals) {
      // For Lit, use the live open prop (not defaultProp) so the behavior can
      // see the component as open at render time. The renderOpenProp is the
      // canonical "open" / "isOpen" prop name from the contract.
      const litOpenProp = plan.renderOpenProp ?? testCase.defaultProp;
      lines.push(``);
      lines.push(`  it("closes on Escape key", async () => {`);
      lines.push(`    const ${testCase.spyName} = vi.fn();`);
      lines.push(
        `    const { element } = await renderElement("${elementName}", { "${litOpenProp}": true });`,
      );
      lines.push(
        `    (element as unknown as Record<string, unknown>)["${testCase.channel.changeHandlerProp}"] = ${testCase.spyName};`,
      );
      lines.push(
        `    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));`,
      );
      lines.push(
        `    expect(${testCase.spyName}).toHaveBeenCalledWith(false);`,
      );
      lines.push(`  });`);
    }
  }

  if (emitOverlayClick) {
    for (const testCase of plan.overlayClickDismissals) {
      const litOpenProp = plan.renderOpenProp ?? testCase.defaultProp;
      lines.push(``);
      lines.push(`  it("closes on overlay click", async () => {`);
      lines.push(`    const ${testCase.spyName} = vi.fn();`);
      lines.push(
        `    const { element } = await renderElement("${elementName}", { "${litOpenProp}": true });`,
      );
      lines.push(
        `    (element as unknown as Record<string, unknown>)["${testCase.channel.changeHandlerProp}"] = ${testCase.spyName};`,
      );
      lines.push(
        `    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));`,
      );
      lines.push(
        `    expect(${testCase.spyName}).toHaveBeenCalledWith(false);`,
      );
      lines.push(`  });`);
    }
  }

  // Behavioral-state tests for dom-tree components. For every boolean
  // controllable channel, set the channel to true via the behavior controller,
  // await updateComplete, and assert the rendered DOM reflects the new state.
  //
  // Three layers of assertion:
  //   1. Controller state: `el.behavior.${ch.name}` flipped.
  //   2. Guarded subtree: any node whose `ifProp` matches the channel gets a
  //      `data-fsds-channel-renders` attribute. Presence/absence verifies the
  //      render() actually re-fired with the new state. Components without
  //      a guarded subtree (the channel doesn't conditionally render anything)
  //      skip this assertion.
  //   3. ARIA attributes: any aria-* binding pointing at this channel
  //      serializes to "true"/"false" strings. The test asserts both polarities.
  if (ir.dom) {
    const booleanChannels = ir.behavior.normalizedChannels.filter(
      (c) => c.valueType === "boolean",
    );
    for (const ch of booleanChannels) {
      const setter = `set${ch.name[0].toUpperCase()}${ch.name.slice(1)}`;
      const markers = findChannelDomMarkers(ir, ch);
      // Build the renderElement second-arg with any prop-guards on the path
      // to the ARIA-bearing node — without these, the node is unmounted and
      // the test would assert against missing markup.
      const renderProps: Record<string, boolean> = {};
      for (const prop of markers.requiredProps) renderProps[prop] = true;
      const renderArg =
        Object.keys(renderProps).length > 0
          ? `, ${JSON.stringify(renderProps)}`
          : "";
      lines.push(``);
      lines.push(
        `  it("reflects ${ch.name}=true after behavior.${setter}(true)", async () => {`,
      );
      lines.push(
        `    const { element } = await renderElement("${elementName}"${renderArg});`,
      );
      lines.push(`    const el = element as LitTestElement & {`);
      lines.push(
        `      behavior?: { ${setter}?: (v: boolean) => void; ${ch.name}?: boolean };`,
      );
      lines.push(`    };`);
      lines.push(`    el.behavior?.${setter}?.(true);`);
      lines.push(`    el.requestUpdate?.();`);
      lines.push(`    await el.updateComplete;`);
      lines.push(`    expect(el.behavior?.${ch.name}).toBe(true);`);
      if (markers.hasGuard) {
        lines.push(
          `    // Guarded subtree should now be rendered (codegen marker).`,
        );
        lines.push(
          `    expect(element.shadowRoot?.querySelector('[data-fsds-channel-renders="${ch.name}"]')).not.toBeNull();`,
        );
      }
      // Per-attribute: when the ARIA attr is on a node INSIDE the guarded
      // subtree, the attribute simply doesn't exist when the guard is closed,
      // so the selector must scope into the guard. When it's on an
      // always-rendered node (typically the root), the attribute is always
      // present and its value flips between "true" and "false".
      for (const info of markers.ariaAttrs) {
        const selector = info.insideGuard
          ? `[data-fsds-channel-renders="${ch.name}"] [${info.attr}], [data-fsds-channel-renders="${ch.name}"][${info.attr}]`
          : `[${info.attr}]`;
        const varName = `trueNode_${info.attr.replace(/-/g, "_")}`;
        lines.push(
          `    const ${varName} = element.shadowRoot?.querySelector('${selector}');`,
        );
        lines.push(
          `    expect(${varName}?.getAttribute('${info.attr}')).toBe("true");`,
        );
      }
      lines.push(`  });`);

      // Also test the false side — proves render() responds in both directions.
      // When the guarded subtree contains the ARIA-bearing node, the node
      // simply isn't in the DOM after the channel flips false; we only assert
      // the guard marker is gone. When the ARIA attribute is on an unguarded
      // node, we additionally assert the attribute value flipped to "false".
      if (markers.hasGuard || markers.ariaAttrs.length > 0) {
        lines.push(``);
        lines.push(
          `  it("reflects ${ch.name}=false after behavior.${setter}(false)", async () => {`,
        );
        lines.push(
          `    const { element } = await renderElement("${elementName}"${renderArg});`,
        );
        lines.push(`    const el = element as LitTestElement & {`);
        lines.push(
          `      behavior?: { ${setter}?: (v: boolean) => void; ${ch.name}?: boolean };`,
        );
        lines.push(`    };`);
        // Set to true first, then to false — proves the transition works,
        // not just the initial render.
        lines.push(`    el.behavior?.${setter}?.(true);`);
        lines.push(`    el.requestUpdate?.();`);
        lines.push(`    await el.updateComplete;`);
        lines.push(`    el.behavior?.${setter}?.(false);`);
        lines.push(`    el.requestUpdate?.();`);
        lines.push(`    await el.updateComplete;`);
        lines.push(`    expect(el.behavior?.${ch.name}).toBe(false);`);
        if (markers.hasGuard) {
          lines.push(
            `    // Guarded subtree should be torn down after the channel flips false.`,
          );
          lines.push(
            `    expect(element.shadowRoot?.querySelector('[data-fsds-channel-renders="${ch.name}"]')).toBeNull();`,
          );
        }
        // ARIA attribute on an always-rendered node — assert value flipped to "false".
        // Attributes inside the guarded subtree are gone with the subtree, so
        // there's nothing to assert against.
        for (const info of markers.ariaAttrs) {
          if (info.insideGuard) continue;
          const varName = `falseNode_${info.attr.replace(/-/g, "_")}`;
          lines.push(
            `    const ${varName} = element.shadowRoot?.querySelector('[${info.attr}]');`,
          );
          lines.push(
            `    expect(${varName}?.getAttribute('${info.attr}')).toBe("false");`,
          );
        }
        lines.push(`  });`);
      }
    }
  }

  // DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01: durable runtime
  // proof that indeterminate lowers to a real DOM-property reflection (not
  // an attribute) and aria-checked reflects the tri-state. Gated on the IR
  // fact (propertyBindings.indeterminate + an aria-checked "mixed"
  // conditional coexisting on the same node), shared with React/Vue/
  // Svelte/Angular's generators so any future contract with this same
  // fact pattern gets this test for free.
  const indeterminateFact = findIndeterminateAriaCheckedFact(ir.dom);
  if (indeterminateFact) {
    // `shadowRoot.firstElementChild` is the ROOT. When the fact sits on a
    // nested part (Checkbox's `<label>` > `<input>` composite) the root does
    // not carry the property, and the proof silently asserts `undefined`.
    const indeterminateEl = indeterminateFact.part
      ? `element.shadowRoot?.querySelector(".${ir.classRecipe.base}__${indeterminateFact.part}") as HTMLInputElement`
      : `element.shadowRoot?.firstElementChild as HTMLInputElement`;
    lines.push(``);
    lines.push(
      `  it("sets .${indeterminateFact.propertyKey} as a DOM property (not an attribute) and lowers aria-checked to mixed", async () => {`,
    );
    lines.push(
      `    const { element } = await renderElement("${elementName}", { "${indeterminateFact.propertyKey}": true });`,
    );
    lines.push(
      `    const el = ${indeterminateEl};`,
    );
    lines.push(`    expect(el.${indeterminateFact.propertyKey}).toBe(true);`);
    lines.push(`    expect(el.getAttribute("aria-checked")).toBe("mixed");`);
    lines.push(`  });`);

    // Reactive-update ratchet: the mount-only test above can't distinguish
    // "the binding is reactive" from "the binding happened to write the
    // right value once at mount." Sets the reactive property directly
    // (mirroring this file's own renderElement helper and the pre-existing
    // "reflects <channel>=true" tests above), then requestUpdate() +
    // await updateComplete — LitElement's own API for flushing a property
    // change through the real reactive-update pipeline. This genuinely
    // falsifies a mount-only property write: a one-time write would leave
    // el.indeterminate stuck at `true` after setting the property to
    // false below.
    lines.push(``);
    lines.push(
      `  it("re-applies .${indeterminateFact.propertyKey} when the property changes from true to false, and aria-checked reflects checked state again", async () => {`,
    );
    lines.push(
      `    const { element } = await renderElement("${elementName}", { "${indeterminateFact.propertyKey}": true });`,
    );
    lines.push(
      `    const el = ${indeterminateEl};`,
    );
    lines.push(`    expect(el.${indeterminateFact.propertyKey}).toBe(true);`);
    lines.push(
      `    (element as unknown as Record<string, boolean>)["${indeterminateFact.propertyKey}"] = false;`,
    );
    lines.push(`    (element as LitTestElement).requestUpdate?.();`);
    lines.push(`    await (element as LitTestElement).updateComplete;`);
    lines.push(`    expect(el.${indeterminateFact.propertyKey}).toBe(false);`);
    lines.push(`    expect(el.getAttribute("aria-checked")).toBe("false");`);
    lines.push(`  });`);
  }

  lines.push(`});`);
  lines.push(``);

  // Accessibility suite — the shared plan routes a label through the actual
  // public prop when the authored role owner binds one. This matters for Lit:
  // setting aria-label only on the role-less custom-element host would not
  // name a dialog rendered inside its shadow root.
  lines.push(`describe("${plan.name} — accessibility", () => {`);
  lines.push(
    `  it("has no unexpected axe violations with default props", async () => {`,
  );
  const axeProps: Record<string, LitTestPropSource> = Object.fromEntries(
    plan.requiredProps.map((prop) => [
      prop.name,
      { code: runtimeRequiredPropExpression(prop.expression) },
    ]),
  );
  for (const prop of plan.accessibility.props) {
    axeProps[prop.name] = prop.value;
  }
  if (plan.accessibility.labelInput) {
    axeProps[plan.accessibility.labelInput.name] =
      plan.accessibility.labelInput.value;
  }
  if (plan.renderOpenProp) axeProps[plan.renderOpenProp] = true;
  const axeContent = plan.accessibility.content.map((fixture) => ({
    slotName: fixture.slotName,
    html: fixture.html,
  }));
  const axeArgs = [
    Object.keys(axeProps).length > 0 || axeContent.length > 0
      ? objectLiteral(axeProps)
      : undefined,
    axeContent.length > 0 ? JSON.stringify(axeContent) : undefined,
  ].filter((arg): arg is string => arg !== undefined);
  lines.push(
    `    const { element } = await renderElement("${elementName}"${axeArgs.length > 0 ? `, ${axeArgs.join(", ")}` : ""});`,
  );
  if (plan.accessibility.needsListParent) {
    lines.push(`    const list = document.createElement("ul");`);
    lines.push(`    list.append(element);`);
    lines.push(`    const results = await axe(list, componentAxeOptions);`);
  } else {
    lines.push(`    const results = await axe(element, componentAxeOptions);`);
  }
  lines.push(`    expect(results.violations.map((v) => v.id)).toEqual([]);`);
  lines.push(`  });`);
  lines.push(`});`);
  lines.push(``);

  // Helpers emitted inline — kept single-file to avoid runtime import complexity
  lines.push(`interface RenderedElement {`);
  lines.push(`  element: HTMLElement;`);
  lines.push(`  stack: Element | null | undefined;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`interface LitTestElement extends HTMLElement {`);
  lines.push(`  updateComplete?: Promise<unknown>;`);
  lines.push(`  requestUpdate?: () => void;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`interface AccessibilityContent {`);
  lines.push(`  slotName?: string;`);
  lines.push(`  html: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(
    `function classTokens(element: Element | null | undefined): string[] {`,
  );
  lines.push(
    `  return (element?.className ?? "").split(/\\s+/).filter(Boolean);`,
  );
  lines.push(`}`);
  lines.push(``);
  lines.push(
    `async function renderElement(tagName: string, props: Record<string, unknown> = {}, content: AccessibilityContent[] = []): Promise<RenderedElement> {`,
  );
  if (hasRequiredProps) {
    lines.push(`  await customElements.whenDefined(tagName);`);
  }
  lines.push(
    `  const element = document.createElement(tagName) as LitTestElement;`,
  );
  lines.push(`  for (const fixture of content) {`);
  lines.push(`    const template = document.createElement("template");`);
  lines.push(`    template.innerHTML = fixture.html;`);
  lines.push(`    const child = template.content.firstElementChild as HTMLElement | null;`);
  lines.push(`    if (child && fixture.slotName) child.slot = fixture.slotName;`);
  lines.push(`    element.append(template.content.cloneNode(true));`);
  lines.push(`  }`);
  const emitPropAssignments = (entries: string): void => {
    lines.push(`  for (const [key, value] of Object.entries(${entries})) {`);
    lines.push(
      `    (element as unknown as Record<string, unknown>)[key] = value;`,
    );
    lines.push(`    if (typeof value === "boolean") {`);
    lines.push(`      if (value) element.setAttribute(key, "");`);
    lines.push(`    } else {`);
    lines.push(`      element.setAttribute(key, String(value));`);
    lines.push(`    }`);
    lines.push(`  }`);
  };
  // Lit schedules its first update from connectedCallback. Components with
  // required inputs must receive them before connection so an object-path
  // binding cannot render once through `undefined`.
  if (hasRequiredProps) {
    emitPropAssignments("{ ...requiredProps, ...props }");
  }
  // Append to an isolated container so axe doesn't walk sibling elements
  // from prior test renders when scoping to this element's context.
  lines.push(`  const container = document.createElement("div");`);
  lines.push(`  container.append(element);`);
  lines.push(`  document.body.append(container);`);
  if (!hasRequiredProps) {
    lines.push(`  await customElements.whenDefined(tagName);`);
    emitPropAssignments("props");
  }
  lines.push(`  element.requestUpdate?.();`);
  lines.push(`  await element.updateComplete;`);
  lines.push(`  // Named slots can schedule one follow-up render via slotchange.`);
  lines.push(`  await Promise.resolve();`);
  lines.push(`  await element.updateComplete;`);
  lines.push(
    `  return { element, stack: element.shadowRoot?.querySelector("fsds-stack") };`,
  );
  lines.push(`}`);

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
 * First dom node with a boolean-channel click event on a non-form host
 * and no if-guard on itself or any ancestor (so a generated test can
 * click it without arranging state first).
 */
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
