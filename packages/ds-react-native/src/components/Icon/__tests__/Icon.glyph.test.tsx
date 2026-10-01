import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it } from "vitest";
import { resolveIcon } from "@full-stack-ds/iconography";
import { Icon } from "../Icon";
import { NavTree } from "../../NavTree/NavTree";
import { NativeGlyph } from "../../../primitives/glyph";
import { FsdsThemeProvider } from "../../../tokens";

describe("generated native icon glyphs", () => {
  let tree: ReactTestRenderer;
  afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
  const hosts = (type: string) => tree.root.findAll(node => String(node.type) === type);
  it("renders catalog paths and updates when the bound name changes", async () => {
    await act(async () => { tree = create(<Icon name="arrow-left" size="sm" />); });
    expect(hosts("Path").map(node => node.props.d)).toEqual(resolveIcon("arrow-left", 16)!.paths.map(path => path.d));
    expect(hosts("Svg")[0].props.viewBox).toBe(resolveIcon("arrow-left", 16)!.viewBox);
    await act(async () => tree.update(<Icon name="arrow-right" size="lg" />));
    expect(hosts("Path").map(node => node.props.d)).toEqual(resolveIcon("arrow-right", 24)!.paths.map(path => path.d));
    expect(tree.root.findByType(NativeGlyph).props.size).toBe(24);
  });
  it("renders no glyph for an unknown name and preserves the containing label", async () => {
    await act(async () => { tree = create(<Icon name="not-in-the-catalog" decorative={false} ariaLabel="Account status" />); });
    expect(hosts("Path")).toHaveLength(0);
    expect(hosts("View").filter(node => node.props.accessibilityLabel === "Account status")).toHaveLength(1);
    await act(async () => tree.update(<Icon name="check" decorative={false} ariaLabel="Account status" />));
    expect(hosts("Svg")[0].props.accessible).toBe(false);
    expect(hosts("Svg")[0].props.importantForAccessibility).toBe("no-hide-descendants");
    expect(hosts("View").filter(node => node.props.accessibilityLabel === "Account status")).toHaveLength(1);
  });
  it("uses the themed frame and explicit native paint without changing the authored paths", async () => {
    await act(async () => { tree = create(<FsdsThemeProvider value={{ tokens: { "icon.size.md": "36px" } }}><Icon name="check" size="md" /></FsdsThemeProvider>); });
    const glyph = tree.root.findByType(NativeGlyph);
    const frame = glyph.findAll(node => String(node.type) === "View")[0];
    expect(frame.props.style.at(-1)).toEqual({ width: 36, height: 36 });
    await act(async () => tree.update(<Icon name="check" size="lg" style={{ color: "#123456", width: 40, height: 40 }} />));
    expect(hosts("Svg")[0].props.color).toBe("#123456");
    expect(hosts("Path").map(node => node.props.strokeWidth)).toEqual(resolveIcon("check", 24)!.paths.map(path => path.strokeWidth));
  });
  it("binds a nested optional glyph without applying the containing component's layout", async () => {
    await act(async () => { tree = create(<NavTree label="Inbox" icon="arrow-left" iconSize="md" style={{ padding: 40 }} />); });
    expect(hosts("Path").map(node => node.props.d)).toEqual(resolveIcon("arrow-left", 20)!.paths.map(path => path.d));
    const glyph = tree.root.findByType(NativeGlyph);
    expect(glyph.props.size).toBe(20);
    expect(glyph.props.style).toBeUndefined();
    expect(glyph.props.frameStyle).toBeUndefined();
    await act(async () => tree.update(<NavTree label="Inbox" />));
    expect(hosts("Path")).toHaveLength(0);
  });
});
