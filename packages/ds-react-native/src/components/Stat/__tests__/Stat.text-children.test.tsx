import { afterEach, describe, expect, it } from "vitest";
import { Fragment, type ReactElement } from "react";
import TestRenderer, { act, type ReactTestRenderer, type ReactTestRendererJSON } from "react-test-renderer";
import { Text, View, StyleSheet } from "react-native";
import { Stat } from "../Stat";
import { Button } from "../../Button/Button";
import { Tooltip } from "../../Tooltip/Tooltip";
import { Truncate } from "../../Truncate/Truncate";
import { CodeBlock } from "../../CodeBlock/CodeBlock";
import { Stack } from "../../../primitives/stack";

const mounted: ReactTestRenderer[] = [];
afterEach(() => act(() => mounted.splice(0).forEach(renderer => renderer.unmount())));
function mount(element: ReactElement) {
  let renderer: ReactTestRenderer | undefined;
  act(() => { renderer = TestRenderer.create(element); });
  mounted.push(renderer!);
  return renderer!;
}
function invalidText(tree: ReactTestRendererJSON | ReactTestRendererJSON[] | string | number | null, parent = "root"): string[] {
  if (tree === null) return [];
  if (typeof tree === "string" || typeof tree === "number") return parent === "Text" ? [] : [`${parent}: ${tree}`];
  if (Array.isArray(tree)) return tree.flatMap(child => invalidText(child, parent));
  return (tree.children ?? []).flatMap(child => invalidText(child, tree.type));
}
const textHosts = (renderer: ReactTestRenderer) => renderer.root.findAllByType("Text" as never);

describe("generated native projected text hosts", () => {
  it("keeps an explicit zero override instead of selecting highlighted source fallback", () => {
    const renderer = mount(<CodeBlock code="fallback source" language="typescript">{0}</CodeBlock>);
    expect(invalidText(renderer.toJSON())).toEqual([]);
    expect(textHosts(renderer)).toHaveLength(1);
    expect(textHosts(renderer)[0].children.join("")).toBe("0");
    act(() => renderer.update(<CodeBlock code="fallback source" language="typescript" />));
    expect(textHosts(renderer).flatMap(node => node.children).join("")).toContain("fallback source");
  });
  it.each([0, 12345.67, "١٬٢٣٤"])("renders Stat value %s inside native Text", children => {
    const renderer = mount(<Stat size="lg" trend="up">{children}</Stat>);
    expect(invalidText(renderer.toJSON())).toEqual([]);
    const label = textHosts(renderer).find(node => node.props.children === children);
    expect(label).toBeDefined();
    expect(StyleSheet.flatten(label!.props.style)).toMatchObject({ fontSize: 32 });
  });

  it("updates zero and text presentation without losing values", () => {
    const renderer = mount(<Stat size="lg" trend="up">12345.67</Stat>);
    const first = textHosts(renderer)[0]!;
    const up = StyleSheet.flatten(first.props.style) as { fontSize: number; color: string };
    expect(up.fontSize).toBe(32);
    act(() => renderer.update(<Stat size="sm" trend="down">{0}</Stat>));
    expect(invalidText(renderer.toJSON())).toEqual([]);
    const second = textHosts(renderer)[0]!;
    expect(second.props.children).toBe(0);
    const down = StyleSheet.flatten(second.props.style) as { fontSize: number; color: string };
    expect(down.fontSize).toBe(18);
    expect(down.color).not.toBe(up.color);
  });

  it("normalizes arrays and nested fragments beside supplied native elements", () => {
    const renderer = mount(<Stat>{[0, "٠", <Fragment key="nested"><>{7}</><View><Text testID="supplied">kept</Text></View></Fragment>]}</Stat>);
    expect(invalidText(renderer.toJSON())).toEqual([]);
    expect(textHosts(renderer).map(node => node.props.children)).toEqual([0, "٠", 7, "kept"]);
    expect(renderer.root.findByProps({ testID: "supplied" }).props.children).toBe("kept");
  });

  it("uses native Text for scalar Stack and Button children", () => {
    const renderer = mount(<Stack>{0}<Button disabled>{[0, "日本語"]}</Button></Stack>);
    expect(invalidText(renderer.toJSON())).toEqual([]);
    expect(textHosts(renderer).flatMap(node => node.children)).toEqual(["0", "0", "日本語"]);
    expect(textHosts(renderer)).toHaveLength(2);
  });

  it("normalizes anchored trigger and content props using the real generated Tooltip", () => {
    const renderer = mount(<Tooltip content={[0, "日本語"]}>{0}</Tooltip>);
    expect(invalidText(renderer.toJSON())).toEqual([]);
    expect(textHosts(renderer).flatMap(node => node.children)).toEqual(["0", "0", "日本語"]);
    expect(textHosts(renderer)).toHaveLength(2);
  });

  it.each([
    { name: "array", children: [0, " long text"] },
    { name: "fragment", children: <>{0}{" long text"}</> },
  ])("keeps one line-limited block for projected scalar $name content", ({ children }) => {
    const renderer = mount(<Truncate lines={2}>{children}</Truncate>);
    expect(invalidText(renderer.toJSON())).toEqual([]);
    expect(textHosts(renderer)).toHaveLength(1);
    expect(textHosts(renderer)[0].children.join("")).toBe("0 long text");
    expect(textHosts(renderer)[0].props.numberOfLines).toBe(2);
  });
});
