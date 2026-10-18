import { afterEach, describe, expect, it } from "vitest";
import { flushSync, tick, type Component } from "svelte";
import { cleanup, render } from "@testing-library/svelte";
import MessagesHarness from "./fixtures/MessagesHarness.svelte";
import { messageCatalogContract, type CarouselView } from "../../../../ds-react/src/primitives/hooks/__tests__/messages.contract";

afterEach(cleanup);

const Harness = MessagesHarness as unknown as Component<Record<string, unknown>>;

function required(root: ParentNode, selector: string): Element {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
}

messageCatalogContract(
  "svelte",
  {
    async carousel(catalog, props = {}): Promise<CarouselView> {
      const { container } = render(Harness, { props: { catalog, subject: "carousel", label: props.label } });
      await tick();
      return {
        region: required(container, ".carousel"),
        rotation: required(container, ".carousel__rotation"),
        previous: required(container, ".carousel__previous"),
        next: required(container, ".carousel__next"),
        picker: required(container, ".pagination"),
      };
    },
    async pageCount(catalog, pages) {
      const { container } = render(Harness, { props: { catalog, subject: "page-navigator", pages } });
      await tick();
      return (required(container, ".page-navigator__context").textContent ?? "").trim();
    },
  },
  { describe, it, expect },
);

describe("svelte setFsdsMessages", () => {
  it("a catalog change re-renders consumers", async () => {
    const { container, rerender } = render(Harness, {
      props: { catalog: { Carousel: { regionLabel: "Premier" } }, subject: "carousel" },
    });
    await tick();
    expect(required(container, ".carousel").getAttribute("aria-label")).toBe("Premier");
    await rerender({ catalog: { Carousel: { regionLabel: "Second", rotationStart: "Lancer" } }, subject: "carousel" });
    flushSync();
    expect(required(container, ".carousel").getAttribute("aria-label")).toBe("Second");
    // The rotation control's text is runtime-owned; it follows the catalog too.
    expect(required(container, ".carousel__rotation").textContent).toBe("Lancer");
    expect(required(container, ".carousel__rotation").getAttribute("aria-label")).toBe("Lancer");
  });
});
