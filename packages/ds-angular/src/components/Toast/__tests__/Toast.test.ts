// @generated:start imports
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { ToastComponent } from "../Toast.component";
// @generated:end

// @generated:start tests
describe("Toast — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    expect(fixture.componentInstance).toBeInstanceOf(ToastComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    expect(classTokens(fixture.componentInstance)).toContain("toast");
  });

  it("applies variant=info variant class", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.variant = "info";
    expect(classTokens(fixture.componentInstance)).toContain("toast--info");
  });

  it("applies variant=success variant class", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.variant = "success";
    expect(classTokens(fixture.componentInstance)).toContain("toast--success");
  });

  it("applies variant=warning variant class", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.variant = "warning";
    expect(classTokens(fixture.componentInstance)).toContain("toast--warning");
  });

  it("applies variant=error variant class", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.variant = "error";
    expect(classTokens(fixture.componentInstance)).toContain("toast--error");
  });

  it("applies politeness=polite variant class", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.politeness = "polite";
    expect(classTokens(fixture.componentInstance)).toContain("toast--polite");
  });

  it("applies politeness=assertive variant class", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.politeness = "assertive";
    expect(classTokens(fixture.componentInstance)).toContain("toast--assertive");
  });
});

describe("Toast — Escape dismissal", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastComponent] });
  });

  it("closes on Escape key", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    const onOpenChangeSpy = jest.fn();
    fixture.componentInstance.open = true;
    fixture.componentInstance.onOpenChange = onOpenChangeSpy;
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [ToastComponent],
  template: "<fsds-toast [open]=\"open\" aria-label=\"Test Toast\"><span>content</span></fsds-toast>",
})
class ToastAxeHost {
  readonly open = true;
}

describe("Toast — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [ToastAxeHost] });
    const fixture = TestBed.createComponent(ToastAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = document.body.querySelector<HTMLElement>(".toast");
    expect(root).not.toBeNull();
    const results = await axe.run(root as HTMLElement, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

import { afterEach } from "@jest/globals";

// Host that projects real `[slot=action]` content, mirroring the
// Popover/Tooltip fixture-component idiom above: Angular's *ngIf can't
// statically know which named ng-content projections are filled, so
// Toast.component.ts renders the `.toast__action` wrapper unconditionally
// (a documented cross-framework divergence) — these tests pin both the
// filled and unfilled shapes plus the live-region a11y roles.
@Component({
  standalone: true,
  imports: [ToastComponent],
  template: `<fsds-toast
    data-testid="toast-root"
    [open]="open"
    [politeness]="politeness"
  >
    <button slot="action">Undo</button>
  </fsds-toast>`,
})
class ToastActionHostComponent {
  open = true;
  politeness?: "polite" | "assertive";
}

function getPortaledRoot(
  fixtureHost: HTMLElement,
  testid: string,
): HTMLElement {
  // Toast moves its own host element (`<fsds-toast>`) to document.body in
  // ngOnInit, so the fixture tree no longer contains it once mounted —
  // fall back to a document.body lookup, the same idiom Popover/Tooltip
  // use above for their portaled content.
  const root = (fixtureHost.querySelector(`[data-testid="${testid}"]`) ??
    document.body.querySelector(
      `[data-testid="${testid}"]`,
    )) as HTMLElement | null;
  if (!root) throw new Error(`expected [data-testid="${testid}"] in fixture or document.body`);
  return root;
}

describe("Toast — action slot projection", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastActionHostComponent] });
  });

  afterEach(() => {
    // Portaled toast hosts append directly to document.body; TestBed
    // teardown does not remove them, so sweep stray nodes between tests
    // (see Popover's afterEach above for the same idiom).
    document.body
      .querySelectorAll('[data-testid="toast-root"]')
      .forEach((n) => n.remove());
  });

  it("renders a projected [slot=action] button inside .toast__action", () => {
    const fixture = TestBed.createComponent(ToastActionHostComponent);
    fixture.detectChanges();
    const root = getPortaledRoot(fixture.nativeElement as HTMLElement, "toast-root");
    const action = root.querySelector(".toast__action");
    const button = action?.querySelector("button");
    expect(button?.textContent?.trim()).toBe("Undo");
  });

  it("renders .toast__action with no element children when nothing is projected into it (Angular cannot statically detect named-slot fill, so the wrapper is unconditional by design — unlike frameworks that omit it)", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    const action = (fixture.nativeElement as HTMLElement).querySelector(".toast__action");
    expect(action).not.toBeNull();
    expect(action!.children.length).toBe(0);
  });
});

describe("Toast — live-region a11y roles", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastComponent] });
  });

  it("gives the viewport root role=region and aria-label=Notifications", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.detectChanges();
    const viewport = (fixture.nativeElement as HTMLElement).querySelector(".toast");
    expect(viewport?.getAttribute("role")).toBe("region");
    expect(viewport?.getAttribute("aria-label")).toBe("Notifications");
  });

  it("defaults aria-live to polite", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.detectChanges();
    const viewport = (fixture.nativeElement as HTMLElement).querySelector(".toast");
    expect(viewport?.getAttribute("aria-live")).toBe("polite");
  });

  it("sets aria-live to assertive when politeness=assertive", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.politeness = "assertive";
    fixture.detectChanges();
    const viewport = (fixture.nativeElement as HTMLElement).querySelector(".toast");
    expect(viewport?.getAttribute("aria-live")).toBe("assertive");
  });

  it("gives the open toast item role=status", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    const item = (fixture.nativeElement as HTMLElement).querySelector(".toast__item");
    expect(item?.getAttribute("role")).toBe("status");
  });

  it("never assigns role=alert anywhere in the rendered toast", () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});

// @custom:end
