// Hand-written behavioral companion to the generated Links scaffold.
import { afterEach, describe, expect, it, vi } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Linking, StyleSheet } from "react-native";
import { Links } from "../Links";
import { resolveLinksTokens } from "../Links.tokens";

// Host-level proof: the real generated component runs, native navigation is
// observed at its boundary. This mock does not establish OS press dispatch.
vi.mock("react-native", async importOriginal => ({
  ...await importOriginal<typeof import("react-native")>(),
  Linking: { openURL: vi.fn(async () => undefined) },
}));

const mounted: ReactTestRenderer[] = [];
afterEach(() => {
  act(() => mounted.splice(0).forEach(renderer => renderer.unmount()));
  vi.clearAllMocks();
});

function mountLinks(props: Record<string, unknown> = {}) {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(<Links testID="subject" {...props} />);
  });
  mounted.push(renderer!);
  return renderer!;
}

const host = (r: ReactTestRenderer) =>
  r.root.findAllByProps({ testID: "subject" }).at(-1)!;

describe("Links — behavioral surfaces", () => {
  it("carries the link role", () => {
    expect(host(mountLinks()).props.accessibilityRole).toBe("link");
  });

  it("renders string children", () => {
    const renderer = mountLinks({ children: "Docs" });
    expect(host(renderer).findAllByType("Text" as never).length).toBeGreaterThan(0);
  });

  it("guards disabled activation at the handler as well as the Pressable boundary", () => {
    const onClick = vi.fn();
    const subject = host(mountLinks({ disabled: true, href: "https://example.test/docs", onClick }));
    expect(subject.type).toBe("Pressable");
    expect(subject.props.disabled).toBe(true);
    expect(subject.props.accessibilityState.disabled).toBe(true);
    act(() => subject.props.onPress(activationEvent()));
    expect(onClick).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("calls the consumer once before navigating once, and exposes cancellation", () => {
    const order: string[] = [];
    const onClick = vi.fn(() => order.push("callback"));
    vi.mocked(Linking.openURL).mockImplementationOnce(async () => { order.push("navigation"); });
    const renderer = mountLinks({ href: "https://example.test/docs", onClick });
    const event = activationEvent();
    act(() => host(renderer).props.onPress(event));
    expect(onClick).toHaveBeenCalledExactlyOnceWith(event);
    expect(Linking.openURL).toHaveBeenCalledExactlyOnceWith("https://example.test/docs");
    expect(order).toEqual(["callback", "navigation"]);
    vi.clearAllMocks();
    act(() => renderer.update(<Links testID="subject" href="https://example.test/docs" onClick={event => event.preventDefault()} />));
    act(() => host(renderer).props.onPress(activationEvent()));
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("preserves navigation with no callback and suppresses already-cancelled activation", () => {
    const onClick = vi.fn();
    const renderer = mountLinks({ href: "https://example.test/docs", onClick });
    act(() => host(renderer).props.onPress(activationEvent(true)));
    expect(onClick).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
    act(() => renderer.update(<Links testID="subject" href="https://example.test/docs" />));
    act(() => host(renderer).props.onPress(activationEvent()));
    expect(Linking.openURL).toHaveBeenCalledExactlyOnceWith("https://example.test/docs");
  });

  it("paints the disabled text token and restores enabled appearance and activation on rerender", () => {
    const renderer = mountLinks({ disabled: true, href: "https://example.test/docs", children: "Docs" });
    const textColor = () => StyleSheet.flatten(host(renderer).findByType("Text" as never).props.style).color;
    const tokens = resolveLinksTokens().root!;
    expect(tokens["links.color.foreground.disabled"]).toEqual(expect.any(String));
    expect(tokens["links.color.foreground.disabled"]).not.toBe(tokens["links.color.foreground.default"]);
    expect(textColor()).toBe(tokens["links.color.foreground.disabled"]);
    act(() => renderer.update(<Links testID="subject" disabled={false} href="https://example.test/docs">Docs</Links>));
    expect(textColor()).toBe(tokens["links.color.foreground.default"]);
    expect(host(renderer).props.disabled).toBe(false);
    expect(host(renderer).props.accessibilityState.disabled).toBe(false);
    act(() => host(renderer).props.onPress(activationEvent()));
    expect(Linking.openURL).toHaveBeenCalledExactlyOnceWith("https://example.test/docs");
  });
});

function activationEvent(cancelled = false) {
  return { defaultPrevented: cancelled, preventDefault() { this.defaultPrevented = true; } };
}
