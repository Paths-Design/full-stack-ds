// @generated:start imports
import { describe, expect, it, beforeEach, afterEach, jest } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { TooltipComponent } from "../Tooltip.component";
import { TooltipTriggerComponent } from "../TooltipTrigger.component";
import { TooltipTriggerDirective } from "../TooltipTrigger.directive";
import { TooltipContentComponent } from "../TooltipContent.component";

// jsdom doesn't ship PointerEvent. Polyfill via MouseEvent so the
// substrate's pointerenter/pointerleave listeners receive an event
// object with the right `type`, `relatedTarget`, `cancelable`, and
// `defaultPrevented` semantics. We only need the relatedTarget +
// defaultPrevented surface, so MouseEvent suffices.
if (typeof globalThis.PointerEvent === "undefined") {
  (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent as unknown as typeof PointerEvent;
}
import { NgIf } from "@angular/common";
// @generated:end

// @generated:start fixture
@Component({
  selector: "fsds-tooltip-fixture",
  standalone: true,
  imports: [
    NgIf,
    TooltipComponent,
    TooltipTriggerComponent,
    TooltipTriggerDirective,
    TooltipContentComponent,
  ],
  template: `
    <fsds-tooltip
      [open]="open"
      [defaultOpen]="defaultOpen"
      [disabled]="disabled"
      [closeOnEscape]="closeOnEscape"
      [closeOnBlur]="closeOnBlur"
      [onOpenChange]="onOpenChange"
    >
      <ng-container *ngIf="adopted">
        <a fsdsTooltipTrigger href="#help" data-testid="anchor" (pointerenter)="onConsumerPointerEnter && onConsumerPointerEnter($event)">Save</a>
      </ng-container>
      <ng-container *ngIf="!adopted">
        <fsds-tooltip-trigger data-testid="trigger-host">Save</fsds-tooltip-trigger>
      </ng-container>
      <fsds-tooltip-content data-testid="content">Help text</fsds-tooltip-content>
    </fsds-tooltip>
  `,
})
class TooltipFixture {
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  closeOnEscape?: boolean;
  closeOnBlur?: boolean;
  adopted = false;
  onOpenChange?: (v: boolean) => void;
  onConsumerPointerEnter?: (e: PointerEvent) => void;
}
// @generated:end

// @generated:start tests
function mount(setup: (host: TooltipFixture) => void = () => {}) {
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
  return el?.hasAttribute("data-tooltip-content") ? el : null;
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

describe("Tooltip — compound API surface (default-host)", () => {
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

describe("Tooltip — directive-based host adoption", () => {
  it("uses the adopted <a> as the actual anchor (no nested button)", () => {
    const fixture = mount((c) => { c.adopted = true; });
    const host = fixture.nativeElement as HTMLElement;
    const anchor = getAnchor(host, true);
    expect(anchor.tagName).toBe("A");
    expect(anchor.hasAttribute("data-tooltip-trigger")).toBe(true);
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
});

describe("Tooltip — anchored positioning + portal (FEAT-ANCHORED-SURFACE-XFW-01)", () => {
  it("applies position: fixed and a data-placement attribute to the content host once open", async () => {
    const fixture = mount();
    getAnchor(fixture.nativeElement as HTMLElement, false).dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
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
  });
  it("moves the content host to document.body while open", async () => {
    const fixture = mount();
    const host = fixture.nativeElement as HTMLElement;
    getAnchor(fixture.nativeElement as HTMLElement, false).dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle();
    fixture.detectChanges();
    const content = document.body.querySelector("[data-testid='content']") as HTMLElement | null;
    expect(content).toBeTruthy();
    expect(content!.hasAttribute("data-tooltip-content")).toBe(true);
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
  });
});

describe("Tooltip — accessibility", () => {
  // `region` asks whether all page content is landmark-contained, a page
  // question; a single component under test cannot answer it.
  const componentAxeOptions = { rules: { region: { enabled: false } } };

  it("has no unexpected axe violations when closed", async () => {
    const fixture = mount();
    await fixture.whenStable();
    expect(getAnchor(fixture.nativeElement as HTMLElement, false)).not.toBeNull();
    const results = await axe.run(fixture.nativeElement as HTMLElement, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("has no unexpected axe violations when open", async () => {
    const fixture = mount((c) => { c.defaultOpen = true; });
    await settle();
    fixture.detectChanges();
    expect(getContentEl(fixture.nativeElement as HTMLElement)).not.toBeNull();
    const results = await axe.run(document.body, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
