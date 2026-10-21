// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { FieldComponent } from "../Field.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(FieldComponent);
  fixture.componentInstance["name"] = "placeholder" as never;
  return fixture;
}

describe("Field — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FieldComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(FieldComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("field");
  });

  it("applies status=idle variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "idle";
    expect(classTokens(fixture.componentInstance)).toContain("field--idle");
  });

  it("applies status=validating variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "validating";
    expect(classTokens(fixture.componentInstance)).toContain("field--validating");
  });

  it("applies status=valid variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "valid";
    expect(classTokens(fixture.componentInstance)).toContain("field--valid");
  });

  it("applies status=invalid variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "invalid";
    expect(classTokens(fixture.componentInstance)).toContain("field--invalid");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [FieldComponent],
  template: "<fsds-field [name]=\"name\"><span slot=\"label\">Test Field label</span></fsds-field>",
})
class FieldAxeHost {
  readonly name = "placeholder";
}

describe("Field — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [FieldAxeHost] });
    const fixture = TestBed.createComponent(FieldAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".field");
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
