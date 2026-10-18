import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref, type Component } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import Carousel from "../../components/Carousel/Carousel.vue";
import PageNavigator from "../../components/PageNavigator/PageNavigator.vue";
import { FsdsMessagesProvider } from "../messages";
import type { FsdsMessageCatalog } from "../message-format";
import { messageCatalogContract, type CarouselView } from "../../../../ds-react/src/primitives/hooks/__tests__/messages.contract";

const mounted: VueWrapper[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
});

function required(root: ParentNode, selector: string): Element {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
}

async function mountUnder(catalog: FsdsMessageCatalog | undefined, child: () => ReturnType<typeof h>) {
  // A fresh host per mount, so queries never reach an earlier mount's tree.
  const host = document.body.appendChild(document.createElement("div"));
  const wrapper = mount(
    defineComponent({
      render: () => (catalog ? h(FsdsMessagesProvider, { messages: catalog }, { default: child }) : child()),
    }),
    { attachTo: host },
  );
  mounted.push(wrapper);
  await nextTick();
  return host;
}

messageCatalogContract(
  "vue",
  {
    async carousel(catalog, props = {}): Promise<CarouselView> {
      const root = await mountUnder(catalog, () =>
        h(Carousel as Component, { slides: ["one", "two"], ...(props.label ? { label: props.label } : {}) }, {
          default: () => [h("div", "one"), h("div", "two")],
        }),
      );
      return {
        region: required(root, ".carousel"),
        rotation: required(root, ".carousel__rotation"),
        previous: required(root, ".carousel__previous"),
        next: required(root, ".carousel__next"),
        picker: required(root, ".pagination"),
      };
    },
    async pageCount(catalog, pages) {
      const root = await mountUnder(catalog, () => h(PageNavigator as Component, { pages }));
      return (required(root, ".page-navigator__context").textContent ?? "").trim();
    },
  },
  { describe, it, expect },
);

describe("vue FsdsMessagesProvider", () => {
  it("a reactive catalog change re-renders consumers", async () => {
    const catalog = ref<FsdsMessageCatalog>({ Carousel: { regionLabel: "Premier" } });
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(FsdsMessagesProvider, { messages: catalog.value }, {
            default: () => h(Carousel as Component, { slides: ["one"] }, { default: () => h("div", "one") }),
          }),
      }),
    );
    mounted.push(wrapper);
    await nextTick();
    expect(wrapper.find(".carousel").attributes("aria-label")).toBe("Premier");
    catalog.value = { Carousel: { regionLabel: "Second", rotationStart: "Lancer" } };
    await nextTick();
    expect(wrapper.find(".carousel").attributes("aria-label")).toBe("Second");
    // The rotation control's text is runtime-owned; it follows the catalog too.
    expect(required(wrapper.element.parentElement ?? wrapper.element, ".carousel__rotation").textContent).toBe("Lancer");
    expect(required(wrapper.element.parentElement ?? wrapper.element, ".carousel__rotation").getAttribute("aria-label")).toBe("Lancer");
  });
});
