import type { FsdsMessageCatalog } from "../../message-format";

/**
 * Behavioral contract for the generated components' message catalog, shared
 * by every web runtime (each package supplies a harness that mounts the
 * generated Carousel / PageNavigator under its own provider idiom).
 *
 * Carousel carries each kind of message reference: an attribute bound to a
 * message (`aria-roledescription`), content bound to a message (the rotation
 * button), a message-defaulted prop (`label` → `regionLabel`) and a message
 * passed to a child component (Pagination's `label` ← `chooseSlide`).
 * PageNavigator carries a parameterized content message (`pageCount`).
 */
export interface CarouselView {
  region: Element;
  rotation: Element;
  previous: Element;
  next: Element;
  /** The composed Pagination's labelled root. */
  picker: Element;
}

export interface MessageCatalogHarness {
  carousel(catalog: FsdsMessageCatalog | undefined, props?: { label?: string }): Promise<CarouselView>;
  /** Rendered text of PageNavigator's page-count context over `pages`. */
  pageCount(catalog: FsdsMessageCatalog | undefined, pages: string[]): Promise<string>;
}

type TestBody = () => void | Promise<void>;
export interface MessageTestRunner {
  describe(name: string, body: () => void): void;
  it(name: string, body: TestBody): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect(value: unknown): any;
}

const text = (element: Element) => (element.textContent ?? "").trim();

export function messageCatalogContract(framework: string, harness: MessageCatalogHarness, runner: MessageTestRunner): void {
  const { describe, it, expect } = runner;

  describe(`${framework} generated components resolve text from the message catalog`, () => {
    it("with no catalog every text is the contract default", async () => {
      const view = await harness.carousel(undefined);
      expect(view.region.getAttribute("aria-label")).toBe("Featured content");
      expect(view.region.getAttribute("aria-roledescription")).toBe("carousel");
      expect(text(view.rotation)).toBe("Start slide rotation");
      expect(view.previous.getAttribute("aria-label")).toBe("Previous slide");
      expect(view.picker.getAttribute("aria-label")).toBe("Choose slide");
    });

    it("provided keys replace attribute, content and message-defaulted prop text", async () => {
      const view = await harness.carousel({
        Carousel: {
          roleDescription: "carrousel",
          rotationStart: "Lancer le défilement",
          regionLabel: "À la une",
        },
      });
      expect(view.region.getAttribute("aria-roledescription")).toBe("carrousel");
      expect(text(view.rotation)).toBe("Lancer le défilement");
      expect(view.rotation.getAttribute("aria-label")).toBe("Lancer le défilement");
      expect(view.region.getAttribute("aria-label")).toBe("À la une");
    });

    it("keys a partial catalog omits keep their contract default", async () => {
      const view = await harness.carousel({ Carousel: { nextSlide: "Diapositive suivante" } });
      expect(view.next.getAttribute("aria-label")).toBe("Diapositive suivante");
      expect(view.previous.getAttribute("aria-label")).toBe("Previous slide");
      expect(view.region.getAttribute("aria-label")).toBe("Featured content");
    });

    it("an explicit prop wins over the catalog entry for its message", async () => {
      const view = await harness.carousel({ Carousel: { regionLabel: "À la une" } }, { label: "Product highlights" });
      expect(view.region.getAttribute("aria-label")).toBe("Product highlights");
    });

    it("entries are scoped to their component", async () => {
      // Pagination's own catalog entry does not reach Carousel, and the
      // Carousel's resolved picker label — an explicit prop on the child —
      // outranks the child's catalog default.
      const view = await harness.carousel({
        Pagination: { navigationLabel: "Choisir la page" },
        Carousel: { chooseSlide: "Choisir la diapositive" },
      });
      expect(view.picker.getAttribute("aria-label")).toBe("Choisir la diapositive");
      expect(view.region.getAttribute("aria-label")).toBe("Featured content");
    });

    it("a parameterized message renders its params in the translator's word order", async () => {
      expect(await harness.pageCount(undefined, ["a", "b", "c"])).toBe("of 3");
      expect(await harness.pageCount({ PageNavigator: { pageCount: "{count} pages au total" } }, ["a", "b", "c"])).toBe(
        "3 pages au total",
      );
    });
  });
}
