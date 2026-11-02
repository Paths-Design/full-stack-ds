import { createRef, forwardRef, Fragment, useImperativeHandle, useState, type ReactNode } from "react";
import { Text, View, type TextProps } from "react-native";
import TestRenderer, { act, type ReactTestRenderer, type ReactTestRendererJSON } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderSeparatedChildren, renderTextChildren } from "./text-children";

type TextPresentation = Pick<TextProps, "style" | "numberOfLines">;
type HostTree = ReactTestRendererJSON | string | number | null | HostTree[];
const mounted: ReactTestRenderer[] = [];
function mount(children: ReactNode, textProps?: TextPresentation) {
  let renderer!: ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<View>{renderTextChildren(children, textProps)}</View>); });
  mounted.push(renderer);
  return renderer;
}
function rawTextParents(tree: HostTree, parent?: string): { parent: string | undefined; value: string }[] {
  if (tree === null) return [];
  if (Array.isArray(tree)) return tree.flatMap(child => rawTextParents(child, parent));
  if (typeof tree === "string" || typeof tree === "number") return parent === "Text" ? [] : [{ parent, value: String(tree) }];
  return (tree.children ?? []).flatMap(child => rawTextParents(child, tree.type));
}
function textContent(tree: HostTree): string {
  if (tree === null) return "";
  if (Array.isArray(tree)) return tree.map(textContent).join("");
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  return (tree.children ?? []).map(textContent).join("");
}
afterEach(() => {
  act(() => { for (const renderer of mounted.splice(0)) renderer.unmount(); });
  vi.restoreAllMocks();
});

describe("separated native authored children", () => {
  function mountSeparated(children: ReactNode, separator = "|", props?: TextPresentation) {
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<View>{renderSeparatedChildren(children, separator, props)}</View>); });
    mounted.push(renderer);
    return renderer;
  }
  function separators(renderer: ReactTestRenderer) {
    return renderer.root.findAllByType("Text" as never).filter(node => node.props.accessible === false && node.props.accessibilityElementsHidden === true && node.props.importantForAccessibility === "no-hide-descendants");
  }
  it.each([
    { children: [null, undefined, false, true, "", [], <Fragment key="empty">{null}{false}{""}</Fragment>], text: "", count: 0 },
    { children: [null, false, "Alpha", undefined, ""], text: "Alpha", count: 0 },
    { children: [0, [null, 0n, ""], <Fragment key="tail">{false}{"終"}</Fragment>], text: "0|0|終", count: 2 },
  ])("separates authored leaves into $text", ({ children, text, count }) => {
    const renderer = mountSeparated(children);
    expect(textContent(renderer.toJSON())).toBe(text);
    expect(separators(renderer)).toHaveLength(count);
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
  });
  it("consumes synchronous iterables once across Fragment boundaries and preserves opaque native content", () => {
    let iterations = 0;
    let calls = 0;
    const ownedStyle = { color: "#abcdef" };
    function Opaque() { calls++; return <><Text>inside-a</Text><Text>inside-b</Text></>; }
    const iterable: Iterable<ReactNode> = { *[Symbol.iterator]() { iterations++; yield null; yield <Text key="owned" testID="owned" style={ownedStyle} numberOfLines={5}>native</Text>; yield <Fragment key="arabic">مرحبا</Fragment>; } };
    const projected = renderSeparatedChildren(["A", [0, <Fragment key="nested">{iterable}</Fragment>], <Opaque key="opaque" />], "|");
    expect(iterations).toBe(1);
    expect(calls).toBe(0);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<View>{projected}</View>); });
    mounted.push(renderer);
    expect(calls).toBe(1);
    expect(textContent(renderer.toJSON())).toBe("A|0|native|مرحبا|inside-ainside-b");
    expect(separators(renderer)).toHaveLength(4);
    const owned = renderer.root.findAllByType("Text" as never).find(node => node.props.testID === "owned")!;
    expect(owned.props.style).toBe(ownedStyle);
    expect(owned.props.numberOfLines).toBe(5);
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
  });
  it("renders hostile separators literally without forwarding interactions or accessibility overrides", () => {
    const hostile = "←\"'\\\n|終";
    const onPress = vi.fn();
    const style = [{ color: "#123456" }];
    const widened: TextProps & { focusable?: boolean } = { style, accessible: true, accessibilityElementsHidden: false, importantForAccessibility: "yes", focusable: true, onPress, onLongPress: onPress, accessibilityRole: "button" };
    const renderer = mountSeparated(["Alpha", "Beta", "Gamma"], hostile, widened);
    expect(textContent(renderer.toJSON())).toBe(`Alpha${hostile}Beta${hostile}Gamma`);
    const decoration = separators(renderer);
    expect(decoration).toHaveLength(2);
    for (const node of decoration) {
      expect(node.children.join("")).toBe(hostile);
      expect(node.props.style).toBe(style);
      expect(node.props.focusable).toBeUndefined();
      expect(node.props.onPress).toBeUndefined();
      expect(node.props.onLongPress).toBeUndefined();
      expect(node.props.accessibilityRole).toBeUndefined();
    }
    expect(onPress).not.toHaveBeenCalled();
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
  });
  it("avoids generated sibling key collisions", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const renderer = mountSeparated(["prefix", <Text key="fsds:separated:0">reserved</Text>, <Fragment key="fsds:separated:0:">also-reserved</Fragment>, <Text key="0">zero</Text>]);
    expect(textContent(renderer.toJSON())).toBe("prefix|reserved|also-reserved|zero");
    expect(separators(renderer)).toHaveLength(3);
    expect(errors.mock.calls.map(call => call.map(String).join(" ")).filter(message => /same key|unique.*key/i.test(message))).toEqual([]);
  });
  it("retains keyed state and refs through nested reorder and empty separator updates", () => {
    type CounterHandle = { increment(): void };
    let instances = 0;
    let iterations = 0;
    const Counter = forwardRef<CounterHandle, { name: string }>(function Counter({ name }, ref) {
      const [instance] = useState(() => ++instances);
      const [count, setCount] = useState(0);
      useImperativeHandle(ref, () => ({ increment: () => setCount(value => value + 1) }), []);
      return <Text testID={name}>{name}:{instance}:{count}</Text>;
    });
    const refA = createRef<CounterHandle>();
    const refB = createRef<CounterHandle>();
    const content = (reverse: boolean) => {
      const iterable: Iterable<ReactNode> = { *[Symbol.iterator]() { iterations++; yield <Counter key="same" name="a" ref={refA} />; yield <Fragment key="inner">nested</Fragment>; } };
      const group = <Fragment key="group">{[0, iterable]}</Fragment>;
      const sibling = <Counter key="same" name="b" ref={refB} />;
      return reverse ? [sibling, group] : [group, sibling];
    };
    const renderer = mountSeparated(content(false));
    const firstA = refA.current;
    const firstB = refB.current;
    expect(firstA).not.toBeNull(); expect(firstB).not.toBeNull();
    act(() => { refA.current!.increment(); refB.current!.increment(); });
    const counterText = (id: string) => renderer.root.findAllByType("Text" as never).find(node => node.props.testID === id)!.children.join("");
    const stateA = counterText("a"); const stateB = counterText("b");
    expect(stateA).toMatch(/^a:\d+:1$/); expect(stateB).toMatch(/^b:\d+:1$/);
    expect(textContent(renderer.toJSON())).toBe(`0|${stateA}|nested|${stateB}`);
    act(() => { renderer.update(<View>{renderSeparatedChildren(content(true), "")}</View>); });
    expect(separators(renderer)).toHaveLength(0);
    expect(textContent(renderer.toJSON())).toBe(`${stateB}0${stateA}nested`);
    expect(counterText("a")).toBe(stateA); expect(counterText("b")).toBe(stateB);
    expect(refA.current).toBe(firstA); expect(refB.current).toBe(firstB);
    act(() => { renderer.update(<View>{renderSeparatedChildren(content(false), "›")}</View>); });
    expect(textContent(renderer.toJSON())).toBe(`0›${stateA}›nested›${stateB}`);
    expect(separators(renderer)).toHaveLength(3);
    expect(instances).toBe(2); expect(iterations).toBe(3);
    expect(refA.current).toBe(firstA); expect(refB.current).toBe(firstB);
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
  });
});

describe("projected native text children (aliased host boundary)", () => {
  it("detects a raw primitive under a non-Text host", () => {
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<View>{123}</View>); });
    mounted.push(renderer);
    expect(rawTextParents(renderer.toJSON())).toEqual([{ parent: "View", value: "123" }]);
  });
  it.each([0, 12345.67, -1, 0n, 123456789012345678901234567890n, "مرحبا 👩🏽‍💻 １２３", "12\u202f345,67\u00a0€"])("places %s inside Text", value => {
    const renderer = mount(value);
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
    expect(textContent(renderer.toJSON())).toBe(String(value));
    expect(renderer.root.findAllByType("Text" as never)).toHaveLength(1);
  });
  it("updates scalar content without retaining the prior value", () => {
    const renderer = mount(0);
    act(() => { renderer.update(<View>{renderTextChildren(12345.67)}</View>); });
    expect(textContent(renderer.toJSON())).toBe("12345.67");
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
  });
  it("preserves scalar order through nested arrays, fragments and supplied native hosts", () => {
    const suppliedText = <Text testID="supplied" style={{ color: "red" }}>native</Text>;
    const suppliedView = <View key="consumer" testID="consumer"><Text>view</Text></View>;
    const renderer = mount(["start", [0, <Fragment key="nested">中<>{9}{suppliedText}</></Fragment>], suppliedView, "end"]);
    expect(textContent(renderer.toJSON())).toBe("start0中9nativeviewend");
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
    expect(renderer.root.findAllByType("Text" as never).find(node => node.props.testID === "supplied")!.props.style).toEqual({ color: "red" });
    expect(renderTextChildren(suppliedText)).toBe(suppliedText);
    expect(renderTextChildren(suppliedView)).toBe(suppliedView);
    const consumerOwned = <View>consumer-owned</View>;
    expect(renderTextChildren(consumerOwned)).toBe(consumerOwned);
  });
  it("materializes synchronous iterable children once and wraps their scalar leaves", () => {
    let iterations = 0;
    const iterable: Iterable<ReactNode> = { *[Symbol.iterator]() { iterations++; yield "first"; yield 0; yield <Fragment key="fragment">آخر</Fragment>; } };
    const renderer = mount(iterable);
    expect(iterations).toBe(1);
    expect(textContent(renderer.toJSON())).toBe("first0آخر");
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
    expect(renderer.root.findAllByType("Text" as never)).toHaveLength(1);
  });
  it.each([
    { name: "array", children: [0, " long text"] },
    { name: "fragment", children: <Fragment key="body">{0}{" long text"}</Fragment> },
    { name: "nested structural tree", children: [0, [false, <Fragment key="body">{" long"}<>{" text"}{null}</></Fragment>], undefined] },
    { name: "bigint structural tree", children: [0n, <Fragment key="body">{" long"}<>{" text"}</></Fragment>] },
  ])("uses one line-limited Text block for a scalar-only $name", ({ children }) => {
    const style: TextProps["style"] = [{ color: "#123456" }, { fontWeight: "700" }];
    const renderer = mount(children, { style, numberOfLines: 2 });
    const texts = renderer.root.findAllByType("Text" as never);
    expect(texts).toHaveLength(1);
    expect(texts[0].props.style).toBe(style);
    expect(texts[0].props.numberOfLines).toBe(2);
    expect(textContent(renderer.toJSON())).toBe("0 long text");
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
    expect(renderer.toJSON()).toMatchObject({ type: "View", children: [{ type: "Text" }] });
  });
  it("keeps a numeric value and nested unit fragments in one text flow across updates", () => {
    const content = (number: number, unit: string) => [number, <Fragment key="units">{" "}<>{unit}</></Fragment>];
    const renderer = mount(content(12345.67, "kg"));
    expect(textContent(renderer.toJSON())).toBe("12345.67 kg");
    expect(renderer.root.findAllByType("Text" as never)).toHaveLength(1);
    act(() => { renderer.update(<View>{renderTextChildren(content(0, "公斤"))}</View>); });
    expect(textContent(renderer.toJSON())).toBe("0 公斤");
    expect(renderer.root.findAllByType("Text" as never)).toHaveLength(1);
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
  });
  it("groups a one-pass iterable inside mixed content without moving the consumer element", () => {
    let iterations = 0;
    const iterable: Iterable<ReactNode> = { *[Symbol.iterator]() { iterations++; yield 0; yield " tail"; } };
    const own = <Text key="own" testID="own" numberOfLines={5}>consumer</Text>;
    const renderer = mount([own, iterable], { numberOfLines: 2 });
    expect(iterations).toBe(1);
    const texts = renderer.root.findAllByType("Text" as never);
    expect(texts).toHaveLength(2);
    expect(texts[0].props.testID).toBe("own");
    expect(texts[0].props.numberOfLines).toBe(5);
    expect(texts[1].props.numberOfLines).toBe(2);
    expect(texts[1].children.join("")).toBe("0 tail");
    expect(textContent(renderer.toJSON())).toBe("consumer0 tail");
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
  });
  it("forwards the exact style and line limit to every generated Text only", () => {
    const style: TextProps["style"] = [{ color: "#123456" }, { fontWeight: "700" }];
    const suppliedStyle: TextProps["style"] = { color: "#abcdef" };
    const renderer = mount(["first", <Fragment key="group">{0}</Fragment>, <Text key="own" testID="own" style={suppliedStyle} numberOfLines={5}>own</Text>], { style, numberOfLines: 2 });
    const texts = renderer.root.findAllByType("Text" as never);
    expect(texts).toHaveLength(3);
    expect(texts.slice(0, 2).map(node => node.props.numberOfLines)).toEqual([2, 2]);
    for (const text of texts.slice(0, 2)) expect(text.props.style).toBe(style);
    expect(texts[2].props.style).toBe(suppliedStyle);
    expect(texts[2].props.numberOfLines).toBe(5);
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
  });
  it("keeps generated Text keys distinct from every supplied sibling key", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const keyed = [<Text key="0">zero</Text>, <Text key="fsds:text:0">reserved</Text>, <Text key="fsds:text:0:">also-reserved</Text>];
    const normalized = renderTextChildren(["prefix", ...keyed]) as ReactNode[];
    for (let index = 0; index < keyed.length; index++) expect(normalized[index + 1]).toBe(keyed[index]);
    const renderer = mount(["prefix", ...keyed]);
    expect(textContent(renderer.toJSON())).toBe("prefixzeroreservedalso-reserved");
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
    expect(errors.mock.calls.map(call => call.map(String).join(" ")).filter(message => /same key|unique.*key/i.test(message))).toEqual([]);
  });
  it("preserves keyed consumer state and refs when fragments and siblings move", () => {
    type CounterHandle = { increment(): void };
    let instances = 0;
    const Counter = forwardRef<CounterHandle, { name: string }>(function Counter({ name }, ref) {
      const [instance] = useState(() => ++instances);
      const [count, setCount] = useState(0);
      useImperativeHandle(ref, () => ({ increment: () => setCount(value => value + 1) }), []);
      return <Text testID={name}>{name}:{instance}:{count}</Text>;
    });
    const refA = createRef<CounterHandle>();
    const refB = createRef<CounterHandle>();
    const content = (reverse: boolean) => {
      const group = <Fragment key="group"><Counter key="a" name="a" ref={refA} />{0}</Fragment>;
      const sibling = <Counter key="b" name="b" ref={refB} />;
      return reverse ? [sibling, "changed", group] : ["prefix", group, sibling];
    };
    const renderer = mount(content(false));
    const firstA = refA.current;
    const firstB = refB.current;
    expect(firstA).not.toBeNull(); expect(firstB).not.toBeNull();
    act(() => { refA.current!.increment(); refB.current!.increment(); });
    const counterText = (id: string) => renderer.root.findAllByType("Text" as never).find(node => node.props.testID === id)!.children.join("");
    const stateA = counterText("a"), stateB = counterText("b");
    expect(stateA).toMatch(/^a:\d+:1$/); expect(stateB).toMatch(/^b:\d+:1$/);
    act(() => { renderer.update(<View>{renderTextChildren(content(true))}</View>); });
    expect(counterText("a")).toBe(stateA); expect(counterText("b")).toBe(stateB);
    expect(instances).toBe(2); expect(refA.current).toBe(firstA); expect(refB.current).toBe(firstB);
    expect(textContent(renderer.toJSON())).toBe(`${stateB}changed${stateA}0`);
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
  });
  it("preserves empty React children semantics", () => {
    for (const input of [false, true, null, undefined]) expect(renderTextChildren(input)).toBe(input);
    const renderer = mount([false, true, null, undefined, [], <Fragment key="empty" />]);
    expect(renderer.toJSON()).toMatchObject({ type: "View", children: null });
    expect(rawTextParents(renderer.toJSON())).toEqual([]);
    const emptyText = mount("");
    expect(textContent(emptyText.toJSON())).toBe("");
    expect(emptyText.root.findAllByType("Text" as never)).toHaveLength(1);
    expect(rawTextParents(emptyText.toJSON())).toEqual([]);
  });
});
