// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { DetailsComponent } from "../Details.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(DetailsComponent);
  fixture.componentInstance["summary"] = "placeholder" as never;
  return fixture;
}

describe("Details — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DetailsComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(DetailsComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("details");
  });

  it("toggles the open channel from the summary click", () => {
    const fixture = createFixture();
    const seen: boolean[] = [];
    fixture.componentInstance.onOpenChange = (v: boolean) => seen.push(v);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(".details__summary") as HTMLElement;
    host.click();
    expect(seen).toEqual([true]);
  });

  it("applies variant=default variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.variant = "default";
    expect(classTokens(fixture.componentInstance)).toContain("details--default");
  });

  it("applies variant=inline variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.variant = "inline";
    expect(classTokens(fixture.componentInstance)).toContain("details--inline");
  });

  it("applies variant=compact variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.variant = "compact";
    expect(classTokens(fixture.componentInstance)).toContain("details--compact");
  });

  it("applies icon=left variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.icon = "left";
    expect(classTokens(fixture.componentInstance)).toContain("details--left");
  });

  it("applies icon=right variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.icon = "right";
    expect(classTokens(fixture.componentInstance)).toContain("details--right");
  });

  it("applies icon=none variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.icon = "none";
    expect(classTokens(fixture.componentInstance)).toContain("details--none");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
