import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it } from "vitest";
import { createElement, type ReactElement } from "react";
import { Carousel } from "../Carousel";
import { PageNavigator } from "../../PageNavigator/PageNavigator";
import { FsdsMessagesProvider } from "../../../primitives/messages";
import type { FsdsMessageCatalog } from "../../../primitives/message-format";

// React Native realizes the same catalog through accessibilityLabel and Text
// content. It has no roledescription surface, so the web contract's
// aria-roledescription case has no native counterpart here.
let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
});

async function mount(catalog: FsdsMessageCatalog | undefined, node: ReactElement): Promise<ReactTestRenderer> {
  const element = catalog ? <FsdsMessagesProvider messages={catalog}>{node}</FsdsMessagesProvider> : node;
  await act(async () => {
    tree = create(element);
  });
  return tree!;
}

const labelled = (renderer: ReactTestRenderer, type: string) =>
  renderer.root.findAll((node) => String(node.type) === type).map((node) => node.props.accessibilityLabel as string | undefined);
const textOf = (node: ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("");
const texts = (renderer: ReactTestRenderer) =>
  renderer.root.findAll((node) => String(node.type) === "Text").map(textOf);

function carousel(props: { label?: string } = {}) {
  const slides = ["First", "Second", "Third"].map((label) => createElement("View", { key: label }, label));
  return (
    <Carousel slides={["First", "Second"]} duration={1000} label={props.label}>
      {slides}
    </Carousel>
  );
}

describe("react-native generated components resolve text from the message catalog", () => {
  it("with no catalog every text is the contract default", async () => {
    const renderer = await mount(undefined, carousel());
    expect(labelled(renderer, "View")).toContain("Featured content");
    expect(labelled(renderer, "Pressable")).toEqual(expect.arrayContaining(["Start slide rotation", "Previous slide", "Next slide"]));
    expect(texts(renderer)).toContain("Start slide rotation");
  });

  it("provided keys replace label and content text; omitted keys keep the contract default", async () => {
    const renderer = await mount(
      { Carousel: { regionLabel: "À la une", rotationStart: "Lancer le défilement", nextSlide: "Diapositive suivante" } },
      carousel(),
    );
    expect(labelled(renderer, "View")).toContain("À la une");
    expect(labelled(renderer, "Pressable")).toEqual(
      expect.arrayContaining(["Lancer le défilement", "Diapositive suivante", "Previous slide"]),
    );
    expect(texts(renderer)).toContain("Lancer le défilement");
  });

  it("an explicit prop wins over the catalog entry for its message", async () => {
    const renderer = await mount({ Carousel: { regionLabel: "À la une" } }, carousel({ label: "Product highlights" }));
    const views = labelled(renderer, "View");
    expect(views).toContain("Product highlights");
    expect(views).not.toContain("À la une");
  });

  it("a slide without a consumer label is named by the position template in the translator's order", async () => {
    const renderer = await mount({ Carousel: { slidePosition: "{count} 枚中 {index} 枚目" } }, carousel());
    expect(labelled(renderer, "View")).toContain("3 枚中 3 枚目");
  });

  it("a parameterized content message formats its params", async () => {
    const renderer = await mount({ PageNavigator: { pageCount: "{count} pages au total" } }, <PageNavigator pages={["a", "b", "c"]} />);
    expect(texts(renderer)).toContain("3 pages au total");
  });
});
