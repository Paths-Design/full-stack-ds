import { afterEach, describe, expect, it } from "vitest";
import type { LitElement } from "lit";
import "../../components/Carousel/Carousel";
import "../../components/PageNavigator/PageNavigator";
import { setFsdsMessages } from "../messages";
import type { FsdsMessageCatalog } from "../message-format";
import { messageCatalogContract, type CarouselView } from "../../../../ds-react/src/primitives/hooks/__tests__/messages.contract";

afterEach(() => {
  setFsdsMessages(undefined);
  document.body.replaceChildren();
});

function required(root: ParentNode | null | undefined, selector: string): Element {
  const element = root?.querySelector(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
}

async function create(tag: string, props: Record<string, unknown>): Promise<LitElement> {
  const element = document.createElement(tag) as LitElement;
  Object.assign(element, props);
  document.body.append(element);
  await element.updateComplete;
  return element;
}

async function carousel(catalog: FsdsMessageCatalog | undefined, props: { label?: string } = {}): Promise<CarouselView> {
  // Lit has no tree-scoped provider: the catalog is the module registry.
  setFsdsMessages(catalog);
  const host = await create("fsds-carousel", { slides: ["one", "two"], ...(props.label ? { label: props.label } : {}) });
  const pagination = required(host.shadowRoot, "fsds-pagination") as LitElement;
  await pagination.updateComplete;
  return {
    region: required(host.shadowRoot, ".carousel"),
    rotation: required(host.shadowRoot, ".carousel__rotation"),
    previous: required(host.shadowRoot, ".carousel__previous"),
    next: required(host.shadowRoot, ".carousel__next"),
    picker: required(pagination.shadowRoot, ".pagination"),
  };
}

messageCatalogContract(
  "lit",
  {
    carousel,
    async pageCount(catalog, pages) {
      setFsdsMessages(catalog);
      const host = await create("fsds-page-navigator", { pages });
      return (required(host.shadowRoot, ".page-navigator__context").textContent ?? "").trim();
    },
  },
  { describe, it, expect },
);

describe("lit FsdsMessagesController", () => {
  it("a registry change re-renders connected components", async () => {
    const view = await carousel({ Carousel: { regionLabel: "Premier" } });
    expect(view.region.getAttribute("aria-label")).toBe("Premier");
    setFsdsMessages({ Carousel: { regionLabel: "Second", rotationStart: "Lancer" } });
    const host = document.body.querySelector("fsds-carousel") as LitElement;
    await host.updateComplete;
    expect(required(host.shadowRoot, ".carousel").getAttribute("aria-label")).toBe("Second");
    // The rotation control's text is runtime-owned; it follows the catalog too.
    expect(required(host.shadowRoot, ".carousel__rotation").textContent).toBe("Lancer");
    expect(required(host.shadowRoot, ".carousel__rotation").getAttribute("aria-label")).toBe("Lancer");
  });

  it("a disconnected component stops listening", async () => {
    await carousel({ Carousel: { regionLabel: "Premier" } });
    const host = document.body.querySelector("fsds-carousel") as LitElement;
    host.remove();
    setFsdsMessages({ Carousel: { regionLabel: "Second" } });
    await host.updateComplete;
    expect(required(host.shadowRoot, ".carousel").getAttribute("aria-label")).toBe("Premier");
  });
});
