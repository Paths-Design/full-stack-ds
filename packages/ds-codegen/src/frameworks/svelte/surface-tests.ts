/**
 * Svelte behavioral tests for the Anchored Presence Surface family.
 *
 * Parity with React (499ed17) and Vue (38454fe). Same semantic
 * surface: hover/focus open, pointer-leave/blur/escape close,
 * aria-describedby wiring, disabled suppression, controlled/
 * uncontrolled state, host-adoption via snippet, and consumer
 * handler/ref composition.
 *
 * Emits TWO files: the test file (`.test.ts`) and a fixture component
 * file (`.svelte`) consumed by the tests. @testing-library/svelte
 * cannot render an in-test compound tree without a fixture SFC.
 */
import type { ComponentIR } from "../../ir.js";
import { anchoredPortalsContentToBody, isPartAnchoredSurface } from "../../semantics.js";

/**
 * The literal content-query expression used throughout the hand-authored
 * test-body template strings below. When the surface's content portals to
 * document.body (`anchoredPortalsContentToBody`), this expression is
 * rewritten post-hoc to resolve via `document.body.querySelector` instead
 * of `container.querySelector` — portaled content escapes `container`, so
 * the in-container query would always resolve null. See `rewriteContentQueries`.
 */
const CONTENT_QUERY = `container.querySelector("[data-testid='content']")`;
const PORTAL_CONTENT_QUERY = `document.body.querySelector("[data-testid='content']")`;

/**
 * Rewrites every content-query call site in a generated test body from
 * the in-container form to the document.body form when content portals
 * out of `container`. Also gates whether `afterEach` cleanup + its
 * import are required — there is no testing-library auto-cleanup in this
 * package, so portaled content nodes accumulate in document.body across
 * tests and poison later queries' `querySelector` results unless reset.
 */
function rewriteContentQueries(testsBody: string, portalsContent: boolean): string {
  if (!portalsContent) return testsBody;
  return dropOrphanedContainerBindings(
    testsBody.split(CONTENT_QUERY).join(PORTAL_CONTENT_QUERY),
  );
}

/**
 * The portal rewrite swaps content queries from `container.querySelector`
 * to `document.body.querySelector`, which orphans the
 * `const { container } = mountDefault(...)` destructure in any test whose
 * only container reads were content queries. Drop the destructuring in
 * exactly those it-blocks — render() still appends the fixture to
 * document.body, and tests that keep reading `container` (trigger
 * queries, axe scans) are left untouched. The it-block boundary is the
 * next two-space-indented `});` closer; mountDefault argument objects
 * never contain one (deeper-indented closers only).
 */
function dropOrphanedContainerBindings(body: string): string {
  return body.replace(
    /const \{ container \} = mountDefault\(/g,
    (destructure: string, offset: number) => {
      const blockEnd = body.indexOf("\n  });", offset);
      const rest = body.slice(
        offset + destructure.length,
        blockEnd === -1 ? body.length : blockEnd,
      );
      return /\bcontainer\b/.test(rest) ? destructure : "mountDefault(";
    },
  );
}

export interface SvelteSurfaceTestFiles {
  testFile: string;
  fixtureFile: string;
}

export function generateSvelteSurfaceTestFiles(ir: ComponentIR): SvelteSurfaceTestFiles {
  const surface = ir.surface;
  if (!surface) {
    throw new Error(
      `generateSvelteSurfaceTestFiles called on ${ir.name} without ir.surface`,
    );
  }
  if (!isPartAnchoredSurface(surface)) {
    throw new Error(
      `Svelte surface test emitter expected an anchored-presence kind (got "${surface.kind}"). ` +
        `Declare part attachment with anchored positioning when its substrate is ready.`,
    );
  }
  // Test-body shape is kind-specific (Tooltip's hover/focus contract
  // vs Popover's click contract). Each kind has its own scaffold
  // function; dispatch on kind here. Body emission is realization,
  // not policy.
  if (surface.kind === "popover") {
    return {
      testFile: emitPopoverTestFile(ir),
      fixtureFile: emitPopoverFixtureFile(ir),
    };
  }
  return {
    testFile: emitTestFile(ir),
    fixtureFile: emitFixtureFile(ir),
  };
}

function emitFixtureFile(ir: ComponentIR): string {
  const name = ir.name;
  return [
    `<script lang="ts">`,
    `// Test fixture for ${name} presence-surface compound.`,
    `import ${name} from "../${name}.svelte";`,
    `import ${name}Trigger from "../${name}Trigger.svelte";`,
    `import ${name}Content from "../${name}Content.svelte";`,
    ``,
    `interface Props {`,
    `  open?: boolean;`,
    `  defaultOpen?: boolean;`,
    `  onOpenChange?: (open: boolean) => void;`,
    `  disabled?: boolean;`,
    `  closeOnEscape?: boolean;`,
    `  closeOnBlur?: boolean;`,
    `  /** When true, render the asChild snippet adoption path. */`,
    `  asChild?: boolean;`,
    `  /** Spy invoked from the adopted child's onpointerenter handler.`,
    `   *  Used by the host-adoption tests to assert consumer handlers`,
    `   *  still run when composed with the substrate's handler. */`,
    `  consumerOnPointerEnter?: (event: PointerEvent) => void;`,
    `  /** When set, the consumer's handler calls preventDefault to`,
    `   *  exercise the substrate's consumer-opt-out contract. */`,
    `  consumerPreventsDefault?: boolean;`,
    `}`,
    ``,
    `let {`,
    `  open,`,
    `  defaultOpen,`,
    `  onOpenChange,`,
    `  disabled,`,
    `  closeOnEscape,`,
    `  closeOnBlur,`,
    `  asChild,`,
    `  consumerOnPointerEnter,`,
    `  consumerPreventsDefault,`,
    `}: Props = $props();`,
    `</script>`,
    ``,
    `<${name}`,
    `  {open}`,
    `  {defaultOpen}`,
    `  {onOpenChange}`,
    `  {disabled}`,
    `  {closeOnEscape}`,
    `  {closeOnBlur}`,
    `>`,
    `  {#if asChild}`,
    `    <${name}Trigger asChild>`,
    `      {#snippet child(trigger)}`,
    `        <!--`,
    `          Split binding via \`trigger\` (action + attrs).`,
    `          \`use:trigger.action\` owns DOM-node registration via`,
    `          Svelte's action lifecycle; \`{...trigger.attrs}\``,
    `          carries ARIA, data marker, and Svelte event handlers`,
    `          via spread. Both are required — applying only one`,
    `          silently breaks the substrate.`,
    ``,
    `          Consumer-handler composition: we run our own`,
    `          onpointerenter first, optionally call preventDefault,`,
    `          and only invoke the substrate's handler when not`,
    `          prevented. Mirrors the React asChild and Vue`,
    `          slot-props contracts.`,
    `        -->`,
    `        <a`,
    `          href="#help"`,
    `          data-testid="trigger"`,
    `          use:trigger.action`,
    `          {...trigger.attrs}`,
    `          onpointerenter={(e) => {`,
    `            consumerOnPointerEnter?.(e);`,
    `            if (consumerPreventsDefault) e.preventDefault();`,
    `            if (!e.defaultPrevented) trigger.attrs.onpointerenter?.(e);`,
    `          }}`,
    `        >Save</a>`,
    `      {/snippet}`,
    `    </${name}Trigger>`,
    `  {:else}`,
    `    <${name}Trigger data-testid="trigger">Save</${name}Trigger>`,
    `  {/if}`,
    `  <${name}Content data-testid="content">Help text</${name}Content>`,
    `</${name}>`,
    ``,
  ].join("\n");
}

function emitTestFile(ir: ComponentIR): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;
  // Portaled content (use:portal moves it to document.body) escapes
  // `container`, so in-container queries always resolve null. Query
  // via document.body instead, and reset it between tests — there is
  // no testing-library auto-cleanup in this package, so portaled
  // nodes would otherwise accumulate and poison later queries.
  const portalsContent = anchoredPortalsContentToBody(ir);
  const importsBody = [
    `import { describe, expect, it, vi${portalsContent ? ", afterEach" : ""} } from "vitest";`,
    `import type { Component } from "svelte";`,
    `import { tick } from "svelte";`,
    `import { render, fireEvent } from "@testing-library/svelte";`,
    `import { axe } from "vitest-axe";`,
    `import ${name}Fixture from "./${name}Fixture.svelte";`,
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

  const testsBody = `function mountDefault(props: Record<string, unknown> = {}) {
  return render(${name}Fixture as unknown as Component<Record<string, unknown>>, { props });
}
${
  portalsContent
    ? `
// Portaled content nodes (use:portal) are appended to document.body and
// are not cleaned up by testing-library's unmount in this package; reset
// so each test's content query resolves only its own mount.
afterEach(() => {
  document.body.innerHTML = "";
});
`
    : ""
}
describe("${name} — compound API surface", () => {
  it("renders the trigger but not the content when closed", async () => {
    const { container } = mountDefault();
    await tick();
    expect(container.querySelector("[data-testid='trigger']")).toBeTruthy();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });

  it("renders the content when defaultOpen={true}", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const content = container.querySelector("[data-testid='content']");
    expect(content).toBeTruthy();
    expect(content?.getAttribute("role")).toBe("tooltip");
  });

  it("opens on pointerenter (hover) over the trigger", async () => {
    const { container } = mountDefault();
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("opens on focus over the trigger", async () => {
    const { container } = mountDefault();
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.focus(trigger);
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("closes on pointerleave from the trigger (no grace path into content)", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    trigger.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: document.body }));
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });

  it("closes on Escape", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });

  it("closes on focus leaving the surface boundary (focusout)", async () => {
    // Boundary semantics: the substrate listens via focusout
    // (which bubbles, unlike blur) for focus leaving the anchor +
    // content surface. Focus moving from anchor to an outside node
    // dismisses; focus moving from anchor INTO content does not.
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    trigger.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });

  it("wires aria-describedby from trigger to content when open", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    const content = container.querySelector("[data-testid='content']")!;
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(trigger.getAttribute("aria-describedby")).toBe(id);
  });

  it("does NOT set aria-describedby when closed", async () => {
    const { container } = mountDefault();
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.getAttribute("aria-describedby")).toBeNull();
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = vi.fn();
    const { container } = mountDefault({ onOpenChange: spy });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("respects disabled — pointerenter does not open", async () => {
    const { container } = mountDefault({ disabled: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });

  it("disabled root does not fire onOpenChange on hover", async () => {
    const spy = vi.fn();
    const { container } = mountDefault({ disabled: true, onOpenChange: spy });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(spy).not.toHaveBeenCalled();
  });

  it("controlled open prop overrides internal state", async () => {
    const { container, rerender } = mountDefault({ open: false });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
    await rerender({ open: true });
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("pointerleave INTO content does not close (grace path)", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    const content = container.querySelector("[data-testid='content']")!;
    trigger.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: content }));
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("closeOnEscape={false} prevents Escape dismissal", async () => {
    const { container } = mountDefault({ defaultOpen: true, closeOnEscape: false });
    await tick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("closeOnBlur={false} prevents boundary-focusout dismissal", async () => {
    const { container } = mountDefault({ defaultOpen: true, closeOnBlur: false });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    trigger.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("unmount removes document-level listeners", async () => {
    const spy = vi.fn();
    const { unmount } = mountDefault({ defaultOpen: true, onOpenChange: spy });
    await tick();
    unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("${name} — snippet host adoption", () => {
  it("renders the adopted child as the actual host (no nested button)", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.tagName).toBe("A");
    expect(container.querySelector("button")).toBeNull();
  });

  it("asChild opens on pointerenter over the adopted child", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("asChild opens on focus over the adopted child", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.focus(trigger);
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("asChild wires aria-describedby onto the adopted child when open", async () => {
    const { container } = mountDefault({ asChild: true, defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    const content = container.querySelector("[data-testid='content']")!;
    expect(trigger.getAttribute("aria-describedby")).toBe(content.getAttribute("id"));
  });

  it("asChild applies data-${cssPrefix}-trigger marker on the adopted host", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.hasAttribute("data-${cssPrefix}-trigger")).toBe(true);
  });

  it("asChild preserves the consumer's onpointerenter handler when composed manually", async () => {
    const consumerSpy = vi.fn();
    const surfaceSpy = vi.fn();
    const { container } = mountDefault({
      asChild: true,
      onOpenChange: surfaceSpy,
      consumerOnPointerEnter: consumerSpy,
    });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(consumerSpy).toHaveBeenCalled();
    expect(surfaceSpy).toHaveBeenCalledWith(true);
  });

  it("asChild — consumer event.preventDefault() suppresses the surface handler", async () => {
    const consumerSpy = vi.fn();
    const surfaceSpy = vi.fn();
    const { container } = mountDefault({
      asChild: true,
      onOpenChange: surfaceSpy,
      consumerOnPointerEnter: consumerSpy,
      consumerPreventsDefault: true,
    });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    // \`pointerenter\` is not cancellable per the DOM spec, so we have
    // to construct a cancellable event manually. Dispatching it on the
    // adopted element exercises the consumer's onpointerenter handler
    // and the substrate's defaultPrevented check.
    trigger.dispatchEvent(new PointerEvent("pointerenter", { bubbles: false, cancelable: true }));
    await tick();
    expect(consumerSpy).toHaveBeenCalled();
    expect(surfaceSpy).not.toHaveBeenCalled();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });
});

describe("${name} — accessibility", () => {
  it("has no unexpected axe violations when closed", async () => {
    const { container } = mountDefault();
    await tick();
    const results = (await axe(container)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("has no unexpected axe violations when open", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const results = (await axe(container)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});`;

  return [
    `// @generated:start imports`,
    importsBody,
    `// @generated:end`,
    ``,
    `// @generated:start tests`,
    rewriteContentQueries(testsBody, portalsContent),
    `// @generated:end`,
    ``,
    `// @custom:start tests`,
    ``,
    `// @custom:end`,
    ``,
  ].join("\n");
}

/**
 * Svelte Popover fixture. Mirrors the Tooltip fixture shape but
 * carries the Popover-specific consumer-facing dismissal flags
 * (closeOnEscape / closeOnBlur / closeOnOutsideClick) and the
 * Popover trigger contract (click-to-toggle on `<button>` /
 * `<a>` adopted host).
 */
function emitPopoverFixtureFile(ir: ComponentIR): string {
  const name = ir.name;
  return [
    `<script lang="ts">`,
    `// Test fixture for ${name} presence-surface compound.`,
    `import ${name} from "../${name}.svelte";`,
    `import ${name}Trigger from "../${name}Trigger.svelte";`,
    `import ${name}Content from "../${name}Content.svelte";`,
    ``,
    `interface Props {`,
    `  open?: boolean;`,
    `  defaultOpen?: boolean;`,
    `  onOpenChange?: (open: boolean) => void;`,
    `  disabled?: boolean;`,
    `  closeOnEscape?: boolean;`,
    `  closeOnBlur?: boolean;`,
    `  closeOnOutsideClick?: boolean;`,
    `  /** When true, render the asChild snippet adoption path. */`,
    `  asChild?: boolean;`,
    `  /** Spy invoked from the adopted child's onclick handler.`,
    `   *  Used by the host-adoption tests to assert consumer handlers`,
    `   *  still run when composed with the substrate's handler. */`,
    `  consumerOnClick?: (event: MouseEvent) => void;`,
    `  /** When set, the consumer's handler calls preventDefault to`,
    `   *  exercise the substrate's consumer-opt-out contract. */`,
    `  consumerPreventsDefault?: boolean;`,
    `}`,
    ``,
    `let {`,
    `  open,`,
    `  defaultOpen,`,
    `  onOpenChange,`,
    `  disabled,`,
    `  closeOnEscape,`,
    `  closeOnBlur,`,
    `  closeOnOutsideClick,`,
    `  asChild,`,
    `  consumerOnClick,`,
    `  consumerPreventsDefault,`,
    `}: Props = $props();`,
    `</script>`,
    ``,
    `<${name}`,
    `  {open}`,
    `  {defaultOpen}`,
    `  {onOpenChange}`,
    `  {disabled}`,
    `  {closeOnEscape}`,
    `  {closeOnBlur}`,
    `  {closeOnOutsideClick}`,
    `>`,
    `  {#if asChild}`,
    `    <${name}Trigger asChild>`,
    `      {#snippet child(trigger)}`,
    `        <!--`,
    `          Split binding via \`trigger\` (action + attrs). Popover's`,
    `          openTriggers is ["click"], so the substrate handler is`,
    `          onclick. Consumer composition runs our handler first,`,
    `          optionally calls preventDefault, and only invokes the`,
    `          substrate handler when not prevented.`,
    `        -->`,
    `        <a`,
    `          href="#open"`,
    `          data-testid="trigger"`,
    `          use:trigger.action`,
    `          {...trigger.attrs}`,
    `          onclick={(e) => {`,
    `            consumerOnClick?.(e);`,
    `            if (consumerPreventsDefault) e.preventDefault();`,
    `            if (!e.defaultPrevented) trigger.attrs.onclick?.(e);`,
    `          }}`,
    `        >Open</a>`,
    `      {/snippet}`,
    `    </${name}Trigger>`,
    `  {:else}`,
    `    <${name}Trigger data-testid="trigger">Open</${name}Trigger>`,
    `  {/if}`,
    `  <${name}Content data-testid="content">Body</${name}Content>`,
    `</${name}>`,
    ``,
  ].join("\n");
}

/**
 * Minimal Svelte Popover test scaffold. Mirrors Vue Popover atom
 * F-3B-1-B coverage: contract-essential behavioral coverage (click
 * opens, click toggles, Escape closes, outside-click closes,
 * aria-controls + aria-expanded wiring, onOpenChange, disabled
 * suppression, unmount cleanup) plus snippet host adoption via the
 * adopted \`<a>\`.
 */
function emitPopoverTestFile(ir: ComponentIR): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;
  // See emitTestFile's identical comment: portaled content escapes
  // `container`, so document.body must be the query root, reset per test.
  const portalsContent = anchoredPortalsContentToBody(ir);
  const importsBody = [
    `import { describe, expect, it, vi${portalsContent ? ", afterEach" : ""} } from "vitest";`,
    `import type { Component } from "svelte";`,
    `import { tick } from "svelte";`,
    `import { render, fireEvent } from "@testing-library/svelte";`,
    `import { axe } from "vitest-axe";`,
    `import ${name}Fixture from "./${name}Fixture.svelte";`,
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

  const testsBody = `function mountDefault(props: Record<string, unknown> = {}) {
  return render(${name}Fixture as unknown as Component<Record<string, unknown>>, { props });
}
${
  portalsContent
    ? `
// Portaled content nodes (use:portal) are appended to document.body and
// are not cleaned up by testing-library's unmount in this package; reset
// so each test's content query resolves only its own mount.
afterEach(() => {
  document.body.innerHTML = "";
});
`
    : ""
}
describe("${name} — compound API surface", () => {
  it("renders the trigger but not the content when closed", async () => {
    const { container } = mountDefault();
    await tick();
    expect(container.querySelector("[data-testid='trigger']")).toBeTruthy();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });

  it("renders the content when defaultOpen={true}", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("opens on click of the trigger", async () => {
    const { container } = mountDefault();
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("toggles closed on a second click of the trigger", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });

  it("closes on Escape", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });

  it("closes on outside-click", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    document.body.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true }),
    );
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });

  it("click on content does not count as outside-click", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const content = container.querySelector("[data-testid='content']")!;
    content.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("wires aria-controls + aria-expanded on the trigger", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    const content = container.querySelector("[data-testid='content']")!;
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(trigger.getAttribute("aria-controls")).toBe(id);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("aria-expanded reflects closed state", async () => {
    const { container } = mountDefault();
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = vi.fn();
    const { container } = mountDefault({ onOpenChange: spy });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("respects disabled — click does not open", async () => {
    const { container } = mountDefault({ disabled: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeNull();
  });

  it("closeOnEscape={false} prevents Escape dismissal", async () => {
    const { container } = mountDefault({ defaultOpen: true, closeOnEscape: false });
    await tick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("closeOnOutsideClick={false} prevents outside-click dismissal", async () => {
    const { container } = mountDefault({ defaultOpen: true, closeOnOutsideClick: false });
    await tick();
    document.body.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true }),
    );
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("unmount removes document-level listeners", async () => {
    const spy = vi.fn();
    const { unmount } = mountDefault({ defaultOpen: true, onOpenChange: spy });
    await tick();
    unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("${name} — snippet host adoption", () => {
  it("renders the adopted child as the actual host (no nested button)", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.tagName).toBe("A");
  });

  it("asChild opens on click over the adopted child", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(container.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("asChild applies the data-${cssPrefix}-trigger marker to the adopted host", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.hasAttribute("data-${cssPrefix}-trigger")).toBe(true);
  });

  it("consumer-handler composition: consumer onclick runs alongside substrate", async () => {
    const spy = vi.fn();
    const onOpenChange = vi.fn();
    const { container } = mountDefault({
      asChild: true,
      consumerOnClick: spy,
      onOpenChange,
    });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(spy).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("consumer preventDefault opts out of substrate open", async () => {
    const onOpenChange = vi.fn();
    const { container } = mountDefault({
      asChild: true,
      consumerPreventsDefault: true,
      onOpenChange,
    });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("${name} — accessibility", () => {
  it("has no unexpected axe violations when closed", async () => {
    const { container } = mountDefault();
    await tick();
    const results = (await axe(container)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("has no unexpected axe violations when open", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const results = (await axe(container)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});`;

  return [
    `// @generated:start imports`,
    importsBody,
    `// @generated:end`,
    ``,
    `// @generated:start tests`,
    rewriteContentQueries(testsBody, portalsContent),
    `// @generated:end`,
    ``,
    `// @custom:start tests`,
    ``,
    `// @custom:end`,
    ``,
  ].join("\n");
}
