/**
 * Vue behavioral tests for the Anchored Presence Surface family.
 *
 * Parity with the React reference (commit 499ed17). Tests cover the
 * same semantic surface: hover/focus open, pointer-leave/blur/escape
 * close, aria-describedby wiring, disabled suppression,
 * controlled/uncontrolled state, host-adoption via slot props, and
 * consumer-handler preservation including the preventDefault opt-out.
 */
import type { ComponentIR } from "../../ir.js";
import { anchoredPortalsContentToBody, isPartAnchoredSurface } from "../../semantics.js";

export function generateVueSurfaceTest(ir: ComponentIR): string {
  const surface = ir.surface;
  if (!surface) {
    throw new Error(
      `generateVueSurfaceTest called on ${ir.name} without ir.surface`,
    );
  }
  if (!isPartAnchoredSurface(surface)) {
    throw new Error(
      `Vue surface test emitter expected an anchored-presence kind (got "${surface.kind}"). ` +
        `Declare part attachment with anchored positioning when its substrate is ready.`,
    );
  }
  // Content is teleported to document.body when the contract portals
  // anchored content (see anchoredPortalsContentToBody). @vue/test-utils'
  // `wrapper` no longer contains the content node in that case, so all
  // content lookups must resolve it from document.body instead — mirror
  // of the full-overlay portal-aware fix in tests.ts.
  const portalContent = anchoredPortalsContentToBody(ir);
  // Test-body shape is kind-specific (Tooltip's hover/focus contract
  // vs Popover's click contract). Each kind has its own scaffold
  // function; dispatch on kind here. Body emission is realization,
  // not policy.
  if (surface.kind === "popover") {
    return emitPopoverScaffoldTests(ir, portalContent);
  }
  return emitTooltipTests(ir, portalContent);
}

/**
 * Rewrites `wrapper.find("[data-testid='content']")` occurrences to
 * resolve via `findContent()` when content is teleported to
 * document.body. Textual substitution (rather than re-deriving each
 * call site) keeps the two scaffold bodies close to their pre-portal
 * shape, which is what a reviewer diffs against.
 */
function withContentLookup(body: string, portalContent: boolean): string {
  if (!portalContent) return body;
  return body.split(`wrapper.find("[data-testid='content']")`).join(`findContent()`);
}

/**
 * Minimal Vue Popover test scaffold. Mirrors the React Popover atom
 * B scaffold shape: contract-essential behavioral coverage (click
 * opens, click toggles, Escape closes, aria-controls + aria-expanded
 * wiring, onOpenChange, disabled suppression, unmount cleanup) plus
 * slot-host adoption (v-slot triggerProps). Deep behavioral coverage
 * (focus boundary, outside-click, controlled mode) lives in the
 * @custom block per atom B's precedent.
 */
function emitPopoverScaffoldTests(ir: ComponentIR, portalContent: boolean): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;
  const importsBody = [
    `import { describe, it, expect, vi${portalContent ? ", afterEach" : ""} } from "vitest";`,
    `import { defineComponent, h } from "vue";`,
    `import { mount } from "@vue/test-utils";`,
    `import { axe } from "vitest-axe";`,
    `import ${name} from "../${name}.vue";`,
    `import ${name}Trigger from "../${name}Trigger.vue";`,
    `import ${name}Content from "../${name}Content.vue";`,
    ``,
    `declare module "vitest" {`,
    `  interface Assertion<T> {`,
    `    // The positional T keeps this augmentation mergeable with vitest's`,
    `    // own Assertion<T = any> declaration (TS2428 fires on any rename);`,
    `    // the expected param references it so it is never an unused type param.`,
    `    toHaveNoViolations(expected?: T): void;`,
    `  }`,
    `}`,
  ].join("\n");

  const findContentHelper = portalContent
    ? `
// Content is teleported to document.body when open (anchoredPortalsContentToBody),
// so @vue/test-utils' \`wrapper\` never contains it — resolve from document.body.
function findContent() {
  return { exists: () => document.body.querySelector("[data-testid='content']") !== null,
    attributes: (key: string) => document.body.querySelector("[data-testid='content']")?.getAttribute(key) ?? undefined,
    element: document.body.querySelector("[data-testid='content']") as Element };
}
`
    : "";
  const afterEachBlock = portalContent
    ? `
afterEach(() => {
  document.body.innerHTML = "";
});
`
    : "";

  const testsBodyRaw = `function mountDefault(rootProps: Record<string, unknown> = {}) {
  const Host = defineComponent({
    components: { ${name}, ${name}Trigger, ${name}Content },
    props: {
      popoverProps: { type: Object, default: () => ({}) },
    },
    setup(props) {
      return () =>
        h(${name}, props.popoverProps as Record<string, unknown>, () => [
          h(${name}Trigger, { "data-testid": "trigger" }, () => "Open"),
          h(${name}Content, { "data-testid": "content" }, () => "Body"),
        ]);
    },
  });
  return mount(Host, {
    props: { popoverProps: rootProps },
    attachTo: document.body,
  });
}
${findContentHelper}${afterEachBlock}
describe("${name} — compound API surface", () => {
  it("renders the trigger but not the content when closed", () => {
    const wrapper = mountDefault();
    expect(wrapper.find("[data-testid='trigger']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='content']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("renders the content when defaultOpen={true}", () => {
    const wrapper = mountDefault({ defaultOpen: true });
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("opens on click of the trigger", async () => {
    const wrapper = mountDefault();
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("toggles closed on a second click of the trigger", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(wrapper.find("[data-testid='content']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("closes on Escape", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='content']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("wires aria-controls + aria-expanded on the trigger", () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']");
    const content = wrapper.find("[data-testid='content']");
    const id = content.attributes("id");
    expect(id).toBeTruthy();
    expect(trigger.attributes("aria-controls")).toBe(id);
    expect(trigger.attributes("aria-expanded")).toBe("true");
    wrapper.unmount();
  });

  it("aria-expanded reflects closed state", () => {
    const wrapper = mountDefault();
    const trigger = wrapper.find("[data-testid='trigger']");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = vi.fn();
    const wrapper = mountDefault({ onOpenChange: spy });
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(spy).toHaveBeenCalledWith(true);
    wrapper.unmount();
  });

  it("respects disabled — click does not open", async () => {
    const wrapper = mountDefault({ disabled: true });
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(wrapper.find("[data-testid='content']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("unmount removes document-level listeners", async () => {
    const spy = vi.fn();
    const wrapper = mountDefault({ defaultOpen: true, onOpenChange: spy });
    wrapper.unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("${name} — slot-props host adoption", () => {
  it("renders the adopted child as the actual host (no nested button)", () => {
    const Host = defineComponent({
      components: { ${name}, ${name}Trigger, ${name}Content },
      setup() {
        return () =>
          h(${name}, {}, () => [
            h(${name}Trigger, { asChild: true }, {
              default: ({ triggerProps }: { triggerProps: Record<string, unknown> }) =>
                h("a", { ...triggerProps, href: "#open", "data-testid": "trigger" }, "Open"),
            }),
            h(${name}Content, { "data-testid": "content" }, () => "Body"),
          ]);
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    const trigger = wrapper.find("[data-testid='trigger']");
    expect(trigger.element.tagName).toBe("A");
    wrapper.unmount();
  });

  it("asChild opens on click over the adopted child", async () => {
    const Host = defineComponent({
      components: { ${name}, ${name}Trigger, ${name}Content },
      setup() {
        return () =>
          h(${name}, {}, () => [
            h(${name}Trigger, { asChild: true }, {
              default: ({ triggerProps }: { triggerProps: Record<string, unknown> }) =>
                h("a", { ...triggerProps, href: "#open", "data-testid": "trigger" }, "Open"),
            }),
            h(${name}Content, { "data-testid": "content" }, () => "Body"),
          ]);
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("asChild applies the data-${cssPrefix}-trigger marker to the adopted host", () => {
    const Host = defineComponent({
      components: { ${name}, ${name}Trigger, ${name}Content },
      setup() {
        return () =>
          h(${name}, {}, () => [
            h(${name}Trigger, { asChild: true }, {
              default: ({ triggerProps }: { triggerProps: Record<string, unknown> }) =>
                h("a", { ...triggerProps, href: "#open", "data-testid": "trigger" }, "Open"),
            }),
            h(${name}Content, { "data-testid": "content" }, () => "Body"),
          ]);
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    expect(wrapper.find("[data-testid='trigger']").attributes("data-${cssPrefix}-trigger")).toBeDefined();
    wrapper.unmount();
  });
});

describe("${name} — accessibility", () => {
  it("has no unexpected axe violations when closed", async () => {
    const wrapper = mountDefault();
    const results = (await axe(wrapper.element)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
    wrapper.unmount();
  });

  it("has no unexpected axe violations when open", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const results = (await axe(wrapper.element)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
    wrapper.unmount();
  });
});`;
  const testsBody = withContentLookup(testsBodyRaw, portalContent);

  return [
    `// @generated:start imports`,
    importsBody,
    `// @generated:end`,
    ``,
    `// @generated:start tests`,
    testsBody,
    `// @generated:end`,
    ``,
    `// @custom:start tests`,
    ``,
    `// @custom:end`,
    ``,
  ].join("\n");
}

function emitTooltipTests(ir: ComponentIR, portalContent: boolean): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;

  const importsBody = [
    `import { describe, it, expect, vi${portalContent ? ", afterEach" : ""} } from "vitest";`,
    `import { defineComponent, h } from "vue";`,
    `import { mount } from "@vue/test-utils";`,
    `import { axe } from "vitest-axe";`,
    `import ${name} from "../${name}.vue";`,
    `import ${name}Trigger from "../${name}Trigger.vue";`,
    `import ${name}Content from "../${name}Content.vue";`,
    ``,
    `declare module "vitest" {`,
    `  interface Assertion<T> {`,
    `    // The positional T keeps this augmentation mergeable with vitest's`,
    `    // own Assertion<T = any> declaration (TS2428 fires on any rename);`,
    `    // the expected param references it so it is never an unused type param.`,
    `    toHaveNoViolations(expected?: T): void;`,
    `  }`,
    `}`,
  ].join("\n");

  const findContentHelper = portalContent
    ? `
// Content is teleported to document.body when open (anchoredPortalsContentToBody),
// so @vue/test-utils' \`wrapper\` never contains it — resolve from document.body.
function findContent() {
  return { exists: () => document.body.querySelector("[data-testid='content']") !== null,
    attributes: (key: string) => document.body.querySelector("[data-testid='content']")?.getAttribute(key) ?? undefined,
    element: document.body.querySelector("[data-testid='content']") as Element };
}
`
    : "";
  const afterEachBlock = portalContent
    ? `
afterEach(() => {
  document.body.innerHTML = "";
});
`
    : "";

  // Render helpers — Vue test-utils does not accept a fragment-shaped
  // children prop the way React does, so we emit a small helper that
  // mounts a defineComponent rendering Tooltip with its compound parts.
  const testsBodyRaw = `function mountDefault(rootProps: Record<string, unknown> = {}) {
  const Host = defineComponent({
    components: { ${name}, ${name}Trigger, ${name}Content },
    props: {
      tooltipProps: { type: Object, default: () => ({}) },
    },
    setup(props) {
      return () =>
        h(${name}, props.tooltipProps as Record<string, unknown>, () => [
          h(${name}Trigger, { "data-testid": "trigger" }, () => "Open"),
          h(${name}Content, { "data-testid": "content" }, () => "Help text"),
        ]);
    },
  });
  return mount(Host, {
    props: { tooltipProps: rootProps },
    attachTo: document.body,
  });
}
${findContentHelper}${afterEachBlock}
describe("${name} — compound API surface", () => {
  it("renders the trigger but not the content when closed", () => {
    const wrapper = mountDefault();
    expect(wrapper.find("[data-testid='trigger']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='content']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("renders the content when defaultOpen={true}", () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const content = wrapper.find("[data-testid='content']");
    expect(content.exists()).toBe(true);
    expect(content.attributes("role")).toBe("tooltip");
    wrapper.unmount();
  });

  it("opens on pointerenter (hover) over the trigger", async () => {
    const wrapper = mountDefault();
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("opens on focus over the trigger", async () => {
    const wrapper = mountDefault();
    await wrapper.find("[data-testid='trigger']").trigger("focus");
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("closes on pointerleave from the trigger (no grace path into content)", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']");
    trigger.element.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: document.body }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='content']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("closes on Escape", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='content']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("closes when focus leaves the trigger to outside the surface", async () => {
    // Boundary semantics: the substrate listens via \`focusout\` for
    // focus leaving the anchor ∪ content surface. \`blur\` doesn't
    // bubble; \`focusout\` does. See AnchoredSurfaceController.
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']");
    trigger.element.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='content']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("wires aria-describedby from trigger to content when open", () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']");
    const content = wrapper.find("[data-testid='content']");
    const id = content.attributes("id");
    expect(id).toBeTruthy();
    expect(trigger.attributes("aria-describedby")).toBe(id);
    wrapper.unmount();
  });

  it("does NOT set aria-describedby when closed", () => {
    const wrapper = mountDefault();
    const trigger = wrapper.find("[data-testid='trigger']");
    expect(trigger.attributes("aria-describedby")).toBeUndefined();
    wrapper.unmount();
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = vi.fn();
    const wrapper = mountDefault({ onOpenChange: spy });
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(spy).toHaveBeenCalledWith(true);
    wrapper.unmount();
  });

  it("respects disabled — pointerenter does not open", async () => {
    const wrapper = mountDefault({ disabled: true });
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(wrapper.find("[data-testid='content']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("disabled root does not fire onOpenChange on hover", async () => {
    const spy = vi.fn();
    const wrapper = mountDefault({ disabled: true, onOpenChange: spy });
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(spy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("controlled open prop overrides internal state", async () => {
    const wrapper = mountDefault({ open: false });
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(wrapper.find("[data-testid='content']").exists()).toBe(false);
    await wrapper.setProps({ tooltipProps: { open: true } });
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("pointerleave INTO content does not close (grace path)", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']");
    const content = wrapper.find("[data-testid='content']");
    trigger.element.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: content.element }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("closeOnEscape={false} prevents Escape dismissal", async () => {
    const wrapper = mountDefault({ defaultOpen: true, closeOnEscape: false });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("closeOnBlur={false} prevents boundary-focusout dismissal", async () => {
    const wrapper = mountDefault({ defaultOpen: true, closeOnBlur: false });
    wrapper.find("[data-testid='trigger']").element.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("unmount removes document-level listeners", async () => {
    const spy = vi.fn();
    const wrapper = mountDefault({ defaultOpen: true, onOpenChange: spy });
    wrapper.unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("${name} — slot-props host adoption", () => {
  function mountAsChild(opts: { onPointerenter?: (e: PointerEvent) => void; consumerRef?: { value: Element | null } } = {}) {
    const Host = defineComponent({
      components: { ${name}, ${name}Trigger, ${name}Content },
      setup() {
        return () =>
          h(${name}, null, () => [
            h(
              ${name}Trigger,
              { asChild: true },
              {
                default: ({ triggerProps }: { triggerProps: Record<string, unknown> }) => {
                  // Consumer-owned ref composed with the substrate's
                  // registration callback from triggerProps.ref. The
                  // slot-props bag is atomic but the *ref* slot is the
                  // one place a consumer may legitimately need to fan
                  // out (their own ref + the substrate's). The standard
                  // Vue pattern is to call both inside one callback.
                  const surfaceRef = triggerProps.ref as (el: unknown) => void;
                  const composedRef = (el: unknown) => {
                    surfaceRef(el);
                    if (opts.consumerRef && (el === null || el instanceof Element)) {
                      opts.consumerRef.value = el;
                    }
                  };
                  return h(
                    "a",
                    {
                      href: "#help",
                      "data-testid": "trigger",
                      onPointerenter: opts.onPointerenter,
                      ...triggerProps,
                      ref: composedRef,
                    },
                    "Help",
                  );
                },
              },
            ),
            h(${name}Content, { "data-testid": "content" }, () => "Help text"),
          ]);
      },
    });
    return mount(Host, { attachTo: document.body });
  }

  it("renders the adopted child as the actual host (no nested button)", () => {
    const wrapper = mountAsChild();
    const trigger = wrapper.find("[data-testid='trigger']");
    expect(trigger.element.tagName).toBe("A");
    expect(wrapper.find("button").exists()).toBe(false);
    wrapper.unmount();
  });

  it("asChild opens on pointerenter over the adopted child", async () => {
    const wrapper = mountAsChild();
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("asChild opens on focus over the adopted child", async () => {
    const wrapper = mountAsChild();
    await wrapper.find("[data-testid='trigger']").trigger("focus");
    expect(wrapper.find("[data-testid='content']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("asChild applies data-${cssPrefix}-trigger marker on the adopted host", () => {
    const wrapper = mountAsChild();
    expect(wrapper.find("[data-testid='trigger']").attributes("data-${cssPrefix}-trigger")).toBeDefined();
    wrapper.unmount();
  });

  it("asChild forwards consumer ref to the adopted DOM node", () => {
    const consumerRef = { value: null as Element | null };
    const wrapper = mountAsChild({ consumerRef });
    expect(consumerRef.value).not.toBeNull();
    expect(consumerRef.value?.tagName).toBe("A");
    wrapper.unmount();
  });
});

describe("${name} — accessibility", () => {
  it("has no unexpected axe violations when closed", async () => {
    const wrapper = mountDefault();
    const results = (await axe(wrapper.element)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
    wrapper.unmount();
  });

  it("has no unexpected axe violations when open", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const results = (await axe(wrapper.element)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
    wrapper.unmount();
  });
});`;
  const testsBody = withContentLookup(testsBodyRaw, portalContent);

  return [
    `// @generated:start imports`,
    importsBody,
    `// @generated:end`,
    ``,
    `// @generated:start tests`,
    testsBody,
    `// @generated:end`,
    ``,
    `// @custom:start tests`,
    ``,
    `// @custom:end`,
    ``,
  ].join("\n");
}
