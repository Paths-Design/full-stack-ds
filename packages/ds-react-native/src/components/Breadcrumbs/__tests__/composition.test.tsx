import { Text, StyleSheet } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it } from "vitest";
import { Breadcrumbs } from "../Breadcrumbs";

const mounted: ReactTestRenderer[] = [];
afterEach(() => { act(() => { mounted.splice(0).forEach(renderer => renderer.unmount()); }); });

describe("Breadcrumbs authored native composition", () => {
  it("updates decorative text and localized naming without changing authored children", () => {
    const children = [<Text key="home" testID="home" accessibilityRole="link">الرئيسية</Text>, <Text key="products" testID="products">製品</Text>, <Text key="current" testID="current">現在</Text>];
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Breadcrumbs ariaLabel="مسار التنقل">{children}</Breadcrumbs>); });
    mounted.push(renderer);
    const authored = renderer.root.findAllByType("Text" as never).filter(node => node.props.testID);
    expect(authored.map(node => node.children.join(""))).toEqual(["الرئيسية", "製品", "現在"]);
    const decoration = () => renderer.root.findAllByType("Text" as never).filter(node => node.props.accessible === false);
    expect(decoration().map(node => node.children.join(""))).toEqual(["/", "/"]);
    const list = renderer.root.findAllByType("View" as never)[1];
    expect(StyleSheet.flatten(list.props.style)).toMatchObject({ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 });
    expect(renderer.root.findAllByType("View" as never)[0].props.accessibilityLabel).toBe("مسار التنقل");
    act(() => { renderer.update(<Breadcrumbs ariaLabel="パンくず" separator="›">{children}</Breadcrumbs>); });
    expect(decoration().map(node => node.children.join(""))).toEqual(["›", "›"]);
    for (const node of decoration()) {
      expect(node.props.accessibilityElementsHidden).toBe(true);
      expect(node.props.importantForAccessibility).toBe("no-hide-descendants");
      expect(node.props.onPress).toBeUndefined();
    }
    expect(renderer.root.findAllByType("View" as never)[0].props.accessibilityLabel).toBe("パンくず");
    expect(renderer.root.findAllByType("Text" as never).filter(node => node.props.testID)).toEqual(authored);
    act(() => { renderer.update(<Breadcrumbs separator="">{children}</Breadcrumbs>); });
    expect(decoration()).toHaveLength(0);
    expect(renderer.root.findAllByType("Text" as never).filter(node => node.props.testID)).toEqual(authored);
    act(() => { renderer.update(<Breadcrumbs separator={undefined}>{children}</Breadcrumbs>); });
    expect(decoration().map(node => node.children.join(""))).toEqual(["/", "/"]);
  });
});
