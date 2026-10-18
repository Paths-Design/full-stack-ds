import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Carousel } from "../../../components/Carousel/Carousel";
import { PageNavigator } from "../../../components/PageNavigator/PageNavigator";
import { FsdsMessagesProvider } from "../../messages";
import type { FsdsMessageCatalog } from "../../message-format";
import { messageCatalogContract, type CarouselView } from "./messages.contract";

afterEach(cleanup);

function required(root: ParentNode, selector: string): Element {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
}

function withCatalog(catalog: FsdsMessageCatalog | undefined, node: React.ReactElement) {
  return catalog ? <FsdsMessagesProvider messages={catalog}>{node}</FsdsMessagesProvider> : node;
}

messageCatalogContract(
  "react",
  {
    async carousel(catalog, props = {}): Promise<CarouselView> {
      const { container } = render(
        withCatalog(
          catalog,
          <Carousel slides={["one", "two"]} label={props.label}>
            <div>one</div>
            <div>two</div>
          </Carousel>,
        ),
      );
      return {
        region: required(container, ".carousel"),
        rotation: required(container, ".carousel__rotation"),
        previous: required(container, ".carousel__previous"),
        next: required(container, ".carousel__next"),
        picker: required(container, ".pagination"),
      };
    },
    async pageCount(catalog, pages) {
      const { container } = render(withCatalog(catalog, <PageNavigator pages={pages} />));
      return (required(container, ".page-navigator__context").textContent ?? "").trim();
    },
  },
  { describe, it, expect },
);

describe("react FsdsMessagesProvider", () => {
  it("nested providers merge per component and key, the inner entry winning", () => {
    const { container } = render(
      <FsdsMessagesProvider messages={{ Carousel: { regionLabel: "Outer", nextSlide: "Suivante" } }}>
        <FsdsMessagesProvider messages={{ Carousel: { regionLabel: "Inner" } }}>
          <Carousel slides={["one"]}>
            <div>one</div>
          </Carousel>
        </FsdsMessagesProvider>
      </FsdsMessagesProvider>,
    );
    expect(required(container, ".carousel").getAttribute("aria-label")).toBe("Inner");
    expect(required(container, ".carousel__next").getAttribute("aria-label")).toBe("Suivante");
  });

  it("a catalog change re-renders consumers", () => {
    const view = (catalog: FsdsMessageCatalog) => (
      <FsdsMessagesProvider messages={catalog}>
        <Carousel slides={["one"]}>
          <div>one</div>
        </Carousel>
      </FsdsMessagesProvider>
    );
    const { container, rerender } = render(view({ Carousel: { regionLabel: "Premier" } }));
    expect(required(container, ".carousel").getAttribute("aria-label")).toBe("Premier");
    rerender(view({ Carousel: { regionLabel: "Second", rotationStart: "Lancer" } }));
    expect(required(container, ".carousel").getAttribute("aria-label")).toBe("Second");
    // The rotation control's text is runtime-owned; it follows the catalog too.
    expect(required(container, ".carousel__rotation").textContent).toBe("Lancer");
    expect(required(container, ".carousel__rotation").getAttribute("aria-label")).toBe("Lancer");
  });
});
