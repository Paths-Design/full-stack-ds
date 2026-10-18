/**
 * Angular behavioral tests for the Anchored Presence Surface family.
 *
 * Parity with React (499ed17), Vue (38454fe), Svelte (43863a0,
 * 29f3fb4), and Lit (c4ed447). Covers default-host vs directive-based
 * host adoption, ARIA wiring, controlled/uncontrolled state, disabled
 * suppression, closeOn* opt-outs, grace path, unmount cleanup, and
 * the consumer-preventDefault opt-out.
 *
 * Stack: Jest + jest-preset-angular + TestBed. Native event dispatch.
 */
import type { ComponentIR } from "../../ir.js";
import { anchoredPortalsContentToBody, isPartAnchoredSurface } from "../../semantics.js";
import { jestGlobalsImportLine } from "./emitted-imports.js";

export function generateAngularSurfaceTest(ir: ComponentIR): string {
  const surface = ir.surface;
  if (!surface) {
    throw new Error(
      `generateAngularSurfaceTest called on ${ir.name} without ir.surface`,
    );
  }
  if (!isPartAnchoredSurface(surface)) {
    throw new Error(
      `Angular surface test emitter expected an anchored-presence kind (got "${surface.kind}"). ` +
        `Declare part attachment with anchored positioning when its substrate is ready.`,
    );
  }
  // Test-body shape is kind-specific (Tooltip's hover/focus contract
  // vs Popover's click contract). Each kind has its own scaffold
  // function; dispatch on kind here. Body emission is realization,
  // not policy.
  if (surface.kind === "popover") {
    return emitPopoverTests(ir);
  }
  return emitTooltipTests(ir);
}

function kebab(name: string): string {
  return name.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
}

function emitTooltipTests(ir: ComponentIR): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;
  const rootTag = `fsds-${kebab(name)}`;
  const triggerTag = `${rootTag}-trigger`;
  const contentTag = `${rootTag}-content`;
  const surface = ir.surface!;
  const positioningEnabled = surface.positioning?.strategy === "anchored";
  const portalsToBody = anchoredPortalsContentToBody({
    behavior: { portal: ir.behavior.portal },
    surface: { positioning: surface.positioning },
  });

  const testsBody = `function mount(setup: (host: TooltipFixture) => void = () => {}) {
  const fixture = TestBed.createComponent(TooltipFixture);
  setup(fixture.componentInstance);
  fixture.detectChanges();
  return fixture;
}

async function settle(): Promise<void> {
  // Resolve queued microtasks (substrate open-triggers defer via
  // queueMicrotask for consumer-preventDefault support).
  await Promise.resolve();
  await Promise.resolve();
}

function getAnchor(host: HTMLElement, adopted: boolean): HTMLElement {
  if (adopted) return host.querySelector("[data-testid='anchor']") as HTMLElement;
  // Default-host: <fsds-tooltip-trigger> renders a <button> inside
  // itself, which the directive registers as the anchor.
  return host.querySelector("[data-testid='trigger-host'] button") as HTMLElement;
}

function getContentEl(host: HTMLElement): HTMLElement | null {
  // Portaled content escapes the fixture root (moved to document.body
  // by the content component's body-append wiring while open), so we
  // must also check document.body — an in-tree-only query would miss
  // it once the portal move has run.
  const el = (host.querySelector("[data-testid='content']") ??
    document.body.querySelector("[data-testid='content']")) as HTMLElement | null;
  return el?.hasAttribute("data-${cssPrefix}-content") ? el : null;
}

beforeEach(() => {
  TestBed.configureTestingModule({ imports: [TooltipFixture] });
});

afterEach(() => {
  // Portaled content that a test left open moves its host to
  // document.body; TestBed teardown does NOT remove it (proven by
  // Dialog's own portal test, which does explicit fixture.destroy() +
  // manual node cleanup). Sweep stray body children the fixture may
  // have appended so tests don't leak DOM into later suites.
  document.body.querySelectorAll("[data-testid='content']").forEach((n) => n.remove());
});

describe("${name} — compound API surface (default-host)", () => {
  it("renders the trigger but not the content when closed", () => {
    const fixture = mount();
    const host = fixture.nativeElement as HTMLElement;
    expect(getAnchor(host, false)).toBeTruthy();
    expect(getContentEl(host)).toBeNull();
  });

  it("renders the content when defaultOpen=true", () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    expect(getContentEl(host)).toBeTruthy();
    expect(getContentEl(host)?.getAttribute("role")).toBe("tooltip");
  });

  it("opens on pointerenter (hover) over the default <button>", async () => {
    const fixture = mount();
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("opens on focus over the default <button>", async () => {
    const fixture = mount();
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new FocusEvent("focus"));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("closes on pointerleave from the anchor (no grace path into content)", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: document.body }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
  });

  it("closes on Escape", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
  });

  it("closes on focus leaving the surface boundary (focusout)", async () => {
    // Boundary semantics: the substrate listens via focusout
    // (which bubbles, unlike blur) for focus leaving the anchor +
    // content surface. Focus moving from anchor to an outside node
    // dismisses; focus moving from anchor INTO content does not.
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
  });

  it("wires aria-describedby from anchor to content when open", () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    const content = getContentEl(host)!;
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(anchor.getAttribute("aria-describedby")).toBe(id);
  });

  it("does NOT set aria-describedby when closed", () => {
    const fixture = mount();
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    expect(anchor.getAttribute("aria-describedby")).toBeNull();
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = jest.fn();
    const fixture = mount((c) => { c.onOpenChange = spy; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("respects disabled — pointerenter does not open", async () => {
    const fixture = mount((c) => { c.disabled = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
  });

  it("disabled root does not fire onOpenChange on hover", async () => {
    const spy = jest.fn();
    const fixture = mount((c) => { c.disabled = true; c.onOpenChange = spy; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle();
    expect(spy).not.toHaveBeenCalled();
  });

  it("controlled open prop overrides internal state", async () => {
    // Phase 1: mount with open=false; verify pointerenter does NOT open.
    const fixture = mount((c) => { c.open = false; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
    // Phase 2: mount a fresh fixture with open=true; verify content is
    // rendered. We mount fresh instead of mutating because jest-preset-
    // angular's strict change-detection rejects post-detectChanges
    // mutation of consumer @Input bindings.
    fixture.destroy();
    const fixture2 = mount((c) => { c.open = true; });
    const host2 = fixture2.nativeElement as HTMLElement;
    expect(getContentEl(host2)).toBeTruthy();
  });

  it("pointerleave INTO content does not close (grace path)", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    const content = getContentEl(host)!;
    anchor.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: content }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("closeOnEscape=false prevents Escape dismissal", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; c.closeOnEscape = false; });
    const host = fixture.nativeElement as HTMLElement;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("closeOnBlur=false prevents boundary-focusout dismissal", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; c.closeOnBlur = false; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("destroying the fixture removes document-level listeners", async () => {
    const spy = jest.fn();
    const fixture = mount((c) => { c.defaultOpen = true; c.onOpenChange = spy; });
    fixture.destroy();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("${name} — directive-based host adoption", () => {
  it("uses the adopted <a> as the actual anchor (no nested button)", () => {
    const fixture = mount((c) => { c.adopted = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, true);
    expect(anchor.tagName).toBe("A");
    expect(anchor.hasAttribute("data-${cssPrefix}-trigger")).toBe(true);
    // There should be NO <button> rendered alongside it because we
    // chose the adopted path.
    expect(host.querySelector("button")).toBeNull();
  });

  it("adopted host opens on pointerenter", async () => {
    const fixture = mount((c) => { c.adopted = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, true);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("adopted host opens on focus", async () => {
    const fixture = mount((c) => { c.adopted = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, true);
    anchor.dispatchEvent(new FocusEvent("focus"));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("adopted host receives aria-describedby when open", () => {
    const fixture = mount((c) => { c.adopted = true; c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, true);
    const content = getContentEl(host)!;
    expect(anchor.getAttribute("aria-describedby")).toBe(content.getAttribute("id"));
  });

  it("consumer event.preventDefault() suppresses the surface handler", async () => {
    const surfaceSpy = jest.fn();
    const fixture = mount((c) => {
      c.adopted = true;
      c.onOpenChange = surfaceSpy;
      c.onConsumerPointerEnter = (e) => e.preventDefault();
    });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, true);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, cancelable: true }));
    await settle();
    fixture.detectChanges();
    expect(surfaceSpy).not.toHaveBeenCalled();
    expect(getContentEl(host)).toBeNull();
  });
});${emitPositioningAndPortalTests({
    name,
    cssPrefix,
    positioningEnabled,
    portalsToBody,
    openExpr:
      'getAnchor(fixture.nativeElement as HTMLElement, false).dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }))',
  })}`;

  // CODEGEN-EMIT-LINT-HYGIENE-01: the @jest/globals specifier set derives
  // from the emitted test body — both surface suites reference every API
  // today, so the bytes do not change, but a future body edit cannot
  // strand an unused specifier.
  const importsBody = [
    jestGlobalsImportLine(testsBody),
    `import { Component } from "@angular/core";`,
    `import { TestBed } from "@angular/core/testing";`,
    `import { ${name}Component } from "../${name}.component";`,
    `import { ${name}TriggerComponent } from "../${name}Trigger.component";`,
    `import { ${name}TriggerDirective } from "../${name}Trigger.directive";`,
    `import { ${name}ContentComponent } from "../${name}Content.component";`,
    ``,
    `// jsdom doesn't ship PointerEvent. Polyfill via MouseEvent so the`,
    `// substrate's pointerenter/pointerleave listeners receive an event`,
    `// object with the right \`type\`, \`relatedTarget\`, \`cancelable\`, and`,
    `// \`defaultPrevented\` semantics. We only need the relatedTarget +`,
    `// defaultPrevented surface, so MouseEvent suffices.`,
    `if (typeof globalThis.PointerEvent === "undefined") {`,
    `  (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent as unknown as typeof PointerEvent;`,
    `}`,
  ].join("\n");

  return [
    `// @generated:start imports`,
    importsBody,
    `import { NgIf } from "@angular/common";`,
    `// @generated:end`,
    ``,
    `// @generated:start fixture`,
    // Use the corrected version (without the duplicate imports block)
    `@Component({`,
    `  selector: "${rootTag}-fixture",`,
    `  standalone: true,`,
    `  imports: [`,
    `    NgIf,`,
    `    ${name}Component,`,
    `    ${name}TriggerComponent,`,
    `    ${name}TriggerDirective,`,
    `    ${name}ContentComponent,`,
    `  ],`,
    `  template: \``,
    `    <${rootTag}`,
    `      [open]="open"`,
    `      [defaultOpen]="defaultOpen"`,
    `      [disabled]="disabled"`,
    `      [closeOnEscape]="closeOnEscape"`,
    `      [closeOnBlur]="closeOnBlur"`,
    `      [onOpenChange]="onOpenChange"`,
    `    >`,
    `      <ng-container *ngIf="adopted">`,
    `        <a fsds${name}Trigger href="#help" data-testid="anchor" (pointerenter)="onConsumerPointerEnter && onConsumerPointerEnter($event)">Save</a>`,
    `      </ng-container>`,
    `      <ng-container *ngIf="!adopted">`,
    `        <${triggerTag} data-testid="trigger-host">Save</${triggerTag}>`,
    `      </ng-container>`,
    `      <${contentTag} data-testid="content">Help text</${contentTag}>`,
    `    </${rootTag}>`,
    `  \`,`,
    `})`,
    `class TooltipFixture {`,
    `  open?: boolean;`,
    `  defaultOpen?: boolean;`,
    `  disabled?: boolean;`,
    `  closeOnEscape?: boolean;`,
    `  closeOnBlur?: boolean;`,
    `  adopted = false;`,
    `  onOpenChange?: (v: boolean) => void;`,
    `  onConsumerPointerEnter?: (e: PointerEvent) => void;`,
    `}`,
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

function emitPopoverTests(ir: ComponentIR): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;
  const rootTag = `fsds-${kebab(name)}`;
  const triggerTag = `${rootTag}-trigger`;
  const contentTag = `${rootTag}-content`;
  const surface = ir.surface!;
  const positioningEnabled = surface.positioning?.strategy === "anchored";
  const portalsToBody = anchoredPortalsContentToBody({
    behavior: { portal: ir.behavior.portal },
    surface: { positioning: surface.positioning },
  });

  const testsBody = `function mount(setup: (host: PopoverFixture) => void = () => {}) {
  const fixture = TestBed.createComponent(PopoverFixture);
  setup(fixture.componentInstance);
  fixture.detectChanges();
  return fixture;
}

async function settle(): Promise<void> {
  // Resolve queued microtasks (substrate open-triggers defer via
  // queueMicrotask for consumer-preventDefault support).
  await Promise.resolve();
  await Promise.resolve();
}

function getAnchor(host: HTMLElement, adopted: boolean): HTMLElement {
  if (adopted) return host.querySelector("[data-testid='anchor']") as HTMLElement;
  // Default-host: <fsds-popover-trigger> renders a <button> inside
  // itself, which the directive registers as the anchor.
  return host.querySelector("[data-testid='trigger-host'] button") as HTMLElement;
}

function getContentEl(host: HTMLElement): HTMLElement | null {
  // Portaled content escapes the fixture root (moved to document.body
  // by the content component's body-append wiring while open), so we
  // must also check document.body — an in-tree-only query would miss
  // it once the portal move has run.
  const el = (host.querySelector("[data-testid='content']") ??
    document.body.querySelector("[data-testid='content']")) as HTMLElement | null;
  return el?.hasAttribute("data-${cssPrefix}-content") ? el : null;
}

beforeEach(() => {
  TestBed.configureTestingModule({ imports: [PopoverFixture] });
});

afterEach(() => {
  // Portaled content that a test left open moves its host to
  // document.body; TestBed teardown does NOT remove it (proven by
  // Dialog's own portal test, which does explicit fixture.destroy() +
  // manual node cleanup). Sweep stray body children the fixture may
  // have appended so tests don't leak DOM into later suites.
  document.body.querySelectorAll("[data-testid='content']").forEach((n) => n.remove());
});

describe("${name} — compound API surface (default-host)", () => {
  it("renders the trigger but not the content when closed", () => {
    const fixture = mount();
    const host = fixture.nativeElement as HTMLElement;
    expect(getAnchor(host, false)).toBeTruthy();
    expect(getContentEl(host)).toBeNull();
  });

  it("renders the content when defaultOpen=true", () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    expect(getContentEl(host)).toBeTruthy();
  });

  it("opens on click of the default <button>", async () => {
    const fixture = mount();
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("toggles closed on a second click of the default <button>", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
  });

  it("closes on Escape", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
  });

  it("closes on outside-click", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
  });

  it("click inside content does not count as outside-click", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const content = getContentEl(host)!;
    content.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("focus moving from anchor into content stays open (boundary)", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    const content = getContentEl(host)!;
    anchor.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: content }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("focus moving from content to outside closes (boundary-focusout)", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const content = getContentEl(host)!;
    content.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
  });

  it("focus moving from anchor to outside closes (boundary-focusout)", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
  });

  it("wires aria-controls + aria-expanded on the anchor when open", () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    const content = getContentEl(host)!;
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(anchor.getAttribute("aria-controls")).toBe(id);
    expect(anchor.getAttribute("aria-expanded")).toBe("true");
  });

  it("aria-expanded reflects closed state", () => {
    const fixture = mount();
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    expect(anchor.getAttribute("aria-expanded")).toBe("false");
  });

  it("content has no forced ARIA role (policy: defaultContentRole=null)", () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const content = getContentEl(host)!;
    expect(content.getAttribute("role")).toBeNull();
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = jest.fn();
    const fixture = mount((c) => { c.onOpenChange = spy; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("respects disabled — click does not open", async () => {
    const fixture = mount((c) => { c.disabled = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
  });

  it("controlled open prop overrides internal state", async () => {
    // Phase 1: mount with open=false; verify click does NOT open.
    const fixture = mount((c) => { c.open = false; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeNull();
    // Phase 2: mount a fresh fixture with open=true; verify content is
    // rendered. We mount fresh instead of mutating because jest-preset-
    // angular's strict change-detection rejects post-detectChanges
    // mutation of consumer @Input bindings.
    fixture.destroy();
    const fixture2 = mount((c) => { c.open = true; });
    const host2 = fixture2.nativeElement as HTMLElement;
    expect(getContentEl(host2)).toBeTruthy();
  });

  it("closeOnEscape=false prevents Escape dismissal", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; c.closeOnEscape = false; });
    const host = fixture.nativeElement as HTMLElement;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("closeOnOutsideClick=false prevents outside-click dismissal", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; c.closeOnOutsideClick = false; });
    const host = fixture.nativeElement as HTMLElement;
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("closeOnBlur=false prevents boundary-focusout dismissal", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; c.closeOnBlur = false; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, false);
    anchor.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("destroying the fixture removes document-level listeners", async () => {
    const spy = jest.fn();
    const fixture = mount((c) => { c.defaultOpen = true; c.onOpenChange = spy; });
    fixture.destroy();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("${name} — directive-based host adoption", () => {
  it("uses the adopted <a> as the actual anchor (no nested button)", () => {
    const fixture = mount((c) => { c.adopted = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, true);
    expect(anchor.tagName).toBe("A");
    expect(anchor.hasAttribute("data-${cssPrefix}-trigger")).toBe(true);
    expect(host.querySelector("button")).toBeNull();
  });

  it("adopted host opens on click", async () => {
    const fixture = mount((c) => { c.adopted = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, true);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    expect(getContentEl(host)).toBeTruthy();
  });

  it("adopted host receives aria-controls + aria-expanded when open", () => {
    const fixture = mount((c) => { c.adopted = true; c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, true);
    const content = getContentEl(host)!;
    expect(anchor.getAttribute("aria-controls")).toBe(content.getAttribute("id"));
    expect(anchor.getAttribute("aria-expanded")).toBe("true");
  });

  it("consumer event.preventDefault() suppresses the surface handler", async () => {
    const surfaceSpy = jest.fn();
    const fixture = mount((c) => {
      c.adopted = true;
      c.onOpenChange = surfaceSpy;
      c.onConsumerClick = (e) => e.preventDefault();
    });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, true);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    fixture.detectChanges();
    expect(surfaceSpy).not.toHaveBeenCalled();
    expect(getContentEl(host)).toBeNull();
  });
});${emitPositioningAndPortalTests({
    name,
    cssPrefix,
    positioningEnabled,
    portalsToBody,
    openExpr:
      'getAnchor(fixture.nativeElement as HTMLElement, false).dispatchEvent(new MouseEvent("click", { bubbles: true }))',
  })}`;

  // CODEGEN-EMIT-LINT-HYGIENE-01: the @jest/globals specifier set derives
  // from the emitted test body (see the Tooltip emitter's note).
  const importsBody = [
    jestGlobalsImportLine(testsBody),
    `import { Component } from "@angular/core";`,
    `import { TestBed } from "@angular/core/testing";`,
    `import { ${name}Component } from "../${name}.component";`,
    `import { ${name}TriggerComponent } from "../${name}Trigger.component";`,
    `import { ${name}TriggerDirective } from "../${name}Trigger.directive";`,
    `import { ${name}ContentComponent } from "../${name}Content.component";`,
  ].join("\n");

  return [
    `// @generated:start imports`,
    importsBody,
    `import { NgIf } from "@angular/common";`,
    `// @generated:end`,
    ``,
    `// @generated:start fixture`,
    `@Component({`,
    `  selector: "${rootTag}-fixture",`,
    `  standalone: true,`,
    `  imports: [`,
    `    NgIf,`,
    `    ${name}Component,`,
    `    ${name}TriggerComponent,`,
    `    ${name}TriggerDirective,`,
    `    ${name}ContentComponent,`,
    `  ],`,
    `  template: \``,
    `    <${rootTag}`,
    `      [open]="open"`,
    `      [defaultOpen]="defaultOpen"`,
    `      [disabled]="disabled"`,
    `      [closeOnEscape]="closeOnEscape"`,
    `      [closeOnBlur]="closeOnBlur"`,
    `      [closeOnOutsideClick]="closeOnOutsideClick"`,
    `      [onOpenChange]="onOpenChange"`,
    `    >`,
    `      <ng-container *ngIf="adopted">`,
    `        <a fsds${name}Trigger href="#open" data-testid="anchor" (click)="onConsumerClick && onConsumerClick($event)">Open</a>`,
    `      </ng-container>`,
    `      <ng-container *ngIf="!adopted">`,
    `        <${triggerTag} data-testid="trigger-host">Open</${triggerTag}>`,
    `      </ng-container>`,
    `      <${contentTag} data-testid="content">Body</${contentTag}>`,
    `    </${rootTag}>`,
    `  \`,`,
    `})`,
    `class PopoverFixture {`,
    `  open?: boolean;`,
    `  defaultOpen?: boolean;`,
    `  disabled?: boolean;`,
    `  closeOnEscape?: boolean;`,
    `  closeOnBlur?: boolean;`,
    `  closeOnOutsideClick?: boolean;`,
    `  adopted = false;`,
    `  onOpenChange?: (v: boolean) => void;`,
    `  onConsumerClick?: (e: MouseEvent) => void;`,
    `}`,
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

interface PositioningAndPortalTestsArgs {
  name: string;
  cssPrefix: string;
  positioningEnabled: boolean;
  portalsToBody: boolean;
  /** JS expression (string) that dispatches the default-host open-trigger event. */
  openExpr: string;
}

/**
 * Shared positioning + portal test block appended to both the
 * Tooltip and Popover generated suites. jsdom cannot measure real
 * layout (getBoundingClientRect returns all-zero rects and has no
 * layout engine backing it), so these tests assert PRESENCE and
 * ATTRIBUTES only (data-placement exists, style contains
 * "position: fixed", portaled host lives under document.body) — never
 * coordinate values. Coordinate math is pinned separately in
 * createAnchoredPosition's own unit tests against mocked rects.
 */
function emitPositioningAndPortalTests(args: PositioningAndPortalTestsArgs): string {
  const { name, cssPrefix, positioningEnabled, portalsToBody } = args;
  if (!positioningEnabled && !portalsToBody) return "";

  const positioningTests = positioningEnabled
    ? `
  it("applies position: fixed and a data-placement attribute to the content host once open", async () => {
    const fixture = mount();
    ${args.openExpr};
    await settle();
    fixture.detectChanges();
    const content = getContentEl(fixture.nativeElement as HTMLElement)!;
    expect(content).toBeTruthy();
    expect(content.style.position).toBe("fixed");
    expect(content.hasAttribute("data-placement")).toBe(true);
    expect(["top", "bottom", "left", "right"]).toContain(content.getAttribute("data-placement"));
  });

  it("does not carry position/data-placement while closed", () => {
    const fixture = mount();
    const host = fixture.nativeElement as HTMLElement;
    expect(getContentEl(host)).toBeNull();
  });`
    : "";

  const portalTests = portalsToBody
    ? `
  it("moves the content host to document.body while open", async () => {
    const fixture = mount();
    const host = fixture.nativeElement as HTMLElement;
    ${args.openExpr};
    await settle();
    fixture.detectChanges();
    const content = document.body.querySelector("[data-testid='content']") as HTMLElement | null;
    expect(content).toBeTruthy();
    expect(content!.hasAttribute("data-${cssPrefix}-content")).toBe(true);
    expect(host.contains(content)).toBe(false);
    expect(document.body.contains(content)).toBe(true);
  });

  it("restores the content host to its original in-tree position (not a direct child of body) on close", async () => {
    // jest-preset-angular attaches the fixture root to document.body,
    // so "restored" content is still technically under body (via the
    // fixture's own tree) — the load-bearing assertion is that it is
    // no longer a DIRECT child of body (the portal-appended shape)
    // and is back inside the surface's own host element.
    const fixture = mount((c) => { c.defaultOpen = true; });
    const host = fixture.nativeElement as HTMLElement;
    const contentWhileOpen = getContentEl(host);
    // Confirm it portaled first: a direct child of body, outside host.
    expect(contentWhileOpen).not.toBeNull();
    expect(contentWhileOpen!.parentElement).toBe(document.body);
    expect(host.contains(contentWhileOpen)).toBe(false);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    fixture.detectChanges();

    // Closed: the content host element (data-testid persists — it's a
    // static template attribute, not open-state-reflected) is back
    // under the surface root, no longer a direct child of body.
    const contentAfterClose = document.body.querySelector("[data-testid='content']") as HTMLElement | null;
    expect(contentAfterClose).not.toBeNull();
    expect(contentAfterClose!.parentElement).not.toBe(document.body);
    expect(host.contains(contentAfterClose)).toBe(true);
  });

  it("removing the fixture while open restores the content host instead of leaving it appended directly to document.body", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    const contentWhileOpen = document.body.querySelector("[data-testid='content']") as HTMLElement | null;
    expect(contentWhileOpen).not.toBeNull();
    expect(contentWhileOpen!.parentElement).toBe(document.body);
    fixture.destroy();
    // ngOnDestroy restores the content host to its original parent
    // (the surface root's own template tree) rather than leaving it
    // appended directly to body — even though Angular's TestBed does
    // not detach the fixture's native element from body on destroy().
    const contentAfterDestroy = document.body.querySelector("[data-testid='content']") as HTMLElement | null;
    expect(contentAfterDestroy).not.toBeNull();
    expect(contentAfterDestroy!.parentElement).not.toBe(document.body);
  });`
    : "";

  return `

describe("${name} — anchored positioning + portal (FEAT-ANCHORED-SURFACE-XFW-01)", () => {${positioningTests}${portalTests}
});`;
}
