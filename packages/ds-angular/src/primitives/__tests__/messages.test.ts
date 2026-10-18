import { afterEach, describe, expect, it } from "@jest/globals";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { CarouselComponent } from "../../components/Carousel/Carousel.component";
import { PageNavigatorComponent } from "../../components/PageNavigator/PageNavigator.component";
import { provideFsdsMessages } from "../messages";
import type { FsdsMessageCatalog } from "../message-format";
import { messageCatalogContract, type CarouselView } from "../../../../ds-react/src/primitives/hooks/__tests__/messages.contract";

afterEach(() => {
  TestBed.resetTestingModule();
});

function required(root: ParentNode, selector: string): Element {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
}

function configure(catalog: FsdsMessageCatalog | undefined, imports: unknown[]) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: imports as never[],
    providers: catalog ? [provideFsdsMessages(catalog)] : [],
  });
}

messageCatalogContract(
  "angular",
  {
    async carousel(catalog, props = {}): Promise<CarouselView> {
      configure(catalog, [CarouselComponent]);
      const fixture = TestBed.createComponent(CarouselComponent);
      fixture.componentRef.setInput("slides", ["one", "two"]);
      if (props.label) fixture.componentRef.setInput("label", props.label);
      fixture.detectChanges();
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      return {
        region: required(root, ".carousel"),
        rotation: required(root, ".carousel__rotation"),
        previous: required(root, ".carousel__previous"),
        next: required(root, ".carousel__next"),
        picker: required(root, ".pagination"),
      };
    },
    async pageCount(catalog, pages) {
      configure(catalog, [PageNavigatorComponent]);
      const fixture = TestBed.createComponent(PageNavigatorComponent);
      fixture.componentRef.setInput("pages", pages);
      fixture.detectChanges();
      await fixture.whenStable();
      return (required(fixture.nativeElement as HTMLElement, ".page-navigator__context").textContent ?? "").trim();
    },
  },
  { describe, it, expect },
);

describe("angular provideFsdsMessages", () => {
  it("a signal catalog change re-renders consumers", async () => {
    const catalog = signal<FsdsMessageCatalog>({ Carousel: { regionLabel: "Premier" } });
    TestBed.configureTestingModule({ imports: [CarouselComponent], providers: [provideFsdsMessages(catalog)] });
    const fixture = TestBed.createComponent(CarouselComponent);
    fixture.componentRef.setInput("slides", ["one"]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(required(root, ".carousel").getAttribute("aria-label")).toBe("Premier");
    catalog.set({ Carousel: { regionLabel: "Second", rotationStart: "Lancer" } });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(required(root, ".carousel").getAttribute("aria-label")).toBe("Second");
    // The rotation control's text is runtime-owned; it follows the catalog too.
    expect(required(root, ".carousel__rotation").textContent).toBe("Lancer");
  });
});
