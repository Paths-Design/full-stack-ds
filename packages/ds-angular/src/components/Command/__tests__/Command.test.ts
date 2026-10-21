// @generated:start imports
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { CommandComponent } from "../Command.component";
// @generated:end

// @generated:start tests
describe("Command — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CommandComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(CommandComponent);
    expect(fixture.componentInstance).toBeInstanceOf(CommandComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(CommandComponent);
    expect(classTokens(fixture.componentInstance)).toContain("command");
  });
});

describe("Command — Escape dismissal", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CommandComponent] });
  });

  it("closes on Escape key", () => {
    const fixture = TestBed.createComponent(CommandComponent);
    const onOpenChangeSpy = jest.fn();
    fixture.componentInstance.open = true;
    fixture.componentInstance.onOpenChange = onOpenChangeSpy;
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

describe("Command — overlay-click dismissal", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CommandComponent] });
  });

  it("closes on overlay click", () => {
    const fixture = TestBed.createComponent(CommandComponent);
    const onOpenChangeSpy = jest.fn();
    fixture.componentInstance.open = true;
    fixture.componentInstance.onOpenChange = onOpenChangeSpy;
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('[role="presentation"]') as HTMLElement;
    overlay?.click();
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [CommandComponent],
  template: "<fsds-command [open]=\"open\" [label]=\"label\"></fsds-command>",
})
class CommandAxeHost {
  readonly open = true;
  readonly label = "Test Command";
}

describe("Command — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [CommandAxeHost] });
    const fixture = TestBed.createComponent(CommandAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = document.body.querySelector<HTMLElement>(".command");
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

// @custom:end
