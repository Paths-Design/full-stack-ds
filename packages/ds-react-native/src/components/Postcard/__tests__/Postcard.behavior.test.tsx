import { afterEach, describe, expect, it } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Postcard, type PostcardProps } from "../Postcard";
import { FsdsMessagesProvider, type FsdsMessageCatalog } from "../../../primitives/messages";

const base: PostcardProps = {
  postId: "post-001",
  author: { name: "ليلى — 日本語", handle: "@layla", avatar: "" },
  timestamp: "2031-03-14T12:00:00Z",
  stats: { likes: 42, replies: 0, reposts: 14 },
  children: "A multilingual post body",
};
const mounted: ReactTestRenderer[] = [];
afterEach(() => act(() => mounted.splice(0).forEach(renderer => renderer.unmount())));

function element(props: PostcardProps, messages: FsdsMessageCatalog = {}) {
  return <FsdsMessagesProvider messages={messages}><Postcard {...props} testID="post" /></FsdsMessagesProvider>;
}
function mount(props = base, messages: FsdsMessageCatalog = {}) {
  let renderer: ReactTestRenderer | undefined;
  act(() => { renderer = TestRenderer.create(element(props, messages)); });
  mounted.push(renderer!);
  return renderer!;
}
const text = (renderer: ReactTestRenderer) => renderer.root.findAllByType("Text" as never).map(node => node.props.children);
const host = (renderer: ReactTestRenderer) => renderer.root.findAllByProps({ testID: "post" }).at(-1)!;

describe("Postcard engagement on native hosts", () => {
  it("gives every advertised count a visible contextual label, including zero", () => {
    const renderer = mount();
    expect(text(renderer)).toEqual(expect.arrayContaining(["Likes: 42", "Replies: 0", "Reposts: 14", base.children]));
    expect(host(renderer).props.accessibilityLabel).toBe("Post by ليلى — 日本語");
  });

  it("updates both counts and catalog text while missing translations retain their defaults", () => {
    const renderer = mount();
    const originalHost = host(renderer);
    act(() => renderer.update(element({ ...base, stats: { likes: 7, replies: 3, reposts: 0 } }, {
      Postcard: { likes: "{count} mentions J’aime", replies: "Réponses : {count}" },
    })));
    expect(host(renderer)).toBe(originalHost);
    expect(text(renderer)).toEqual(expect.arrayContaining(["7 mentions J’aime", "Réponses : 3", "Reposts: 0", base.children]));
    expect(text(renderer)).not.toContain("Likes: 42");
    expect(text(renderer)).not.toContain("Reposts: 14");
  });

  it("preserves consumer-formatted numerals and translated word order", () => {
    const renderer = mount({ ...base, stats: { likes: "١٬٢٣٤", replies: "٠", reposts: "١٤" } }, {
      Postcard: { likes: "{count} إعجاب", replies: "ردود: {count}", reposts: "إعادة نشر: {count}", postLabel: "منشور بقلم {name}" },
    });
    expect(text(renderer)).toEqual(expect.arrayContaining(["١٬٢٣٤ إعجاب", "ردود: ٠", "إعادة نشر: ١٤", base.children]));
    expect(host(renderer).props.accessibilityLabel).toBe("منشور بقلم ليلى — 日本語");
  });
});
