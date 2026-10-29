// Hand-written behavioral companion to the generated Badge scaffold.
import { describe, expect, it } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { View } from "react-native";
import { Badge } from "../Badge";
import { FsdsThemeProvider } from "../../../tokens";

function mountBadge(props: Record<string, unknown> = {}) {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(<Badge testID="subject" {...props} />);
  });
  return renderer!;
}

describe("Badge — behavioral surfaces", () => {
  it("renders string children inside a content layer", () => {
    const renderer = mountBadge({ children: "New" });
    const subject = renderer.root.findAllByProps({ testID: "subject" }).at(-1)!;
    expect(subject.findAllByType("Text" as never).length).toBeGreaterThan(0);
  });

  it("layers variant, intent, and size style entries", () => {
    const plain = mountBadge().root.findAllByProps({ testID: "subject" }).at(-1)!;
    const full = mountBadge({
      variant: "solid",
      intent: "danger",
      size: "lg",
    }).root.findAllByProps({ testID: "subject" }).at(-1)!;
    expect(full.props.style.slice(1, 4).some(Boolean)).toBe(true);
    expect(full.props.style).not.toEqual(plain.props.style);
  });

  it("renders the icon slot when an icon element is provided", () => {
    const renderer = mountBadge({
      icon: <View />,
    });
    const subject = renderer.root.findAllByProps({ testID: "subject" }).at(-1)!;
    expect(subject.findAllByProps({ accessible: false }).length).toBeGreaterThan(0);
  });

  it("paints nested content from the theme and large text variant", () => {
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <FsdsThemeProvider value={{ tokens: { "badge.color.foreground.primary": "#345678" } }}>
          <Badge size="lg">New</Badge>
        </FsdsThemeProvider>,
      );
    });
    const content = renderer!.root.findAllByType("Text" as never).find((node) => node.children.includes("New"));
    expect(content).toBeDefined();
    const paint = Object.assign({}, ...(content!.props.style as Record<string, unknown>[]).filter(Boolean));
    expect(paint).toMatchObject({ color: "#345678", fontSize: 14, fontWeight: "500" });
  });
});
