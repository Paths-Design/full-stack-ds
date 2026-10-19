// Hand-written behavioral companion to the generated Details scaffold.
import { describe, expect, it } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Details } from "../Details";

function mountDetails(props: Record<string, unknown> = { summary: "More" }) {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(<Details testID="subject" summary="M" {...props} />);
  });
  return renderer!;
}

const host = (r: ReactTestRenderer) =>
  r.root.findAllByProps({ testID: "subject" }).at(-1)!;

/** Host Pressables (string type); the test shim's wrapper component carries the same props. */
const summaries = (root: ReturnType<typeof host>) =>
  root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityState !== undefined);
const texts = (root: ReturnType<typeof host>) =>
  root.findAll((node) => String(node.type) === "Text").map((node) => node.props.children).filter((c) => typeof c === "string");

describe("Details — behavioral surfaces", () => {
  it.each([false, true])("exposes the declared disabled=%s state on the summary", (disabled) => {
    const root = host(mountDetails({ disabled }));
    expect(summaries(root).map(node => node.props.accessibilityState)).toEqual([{ disabled }]);
  });

  it("pressing the summary opens the content and reports the open state", () => {
    const opened: boolean[] = [];
    const renderer = mountDetails({ children: "Body text", onOpenChange: (next: boolean) => opened.push(next) });
    expect(texts(host(renderer))).not.toContain("Body text");
    act(() => summaries(host(renderer))[0]!.props.onPress());
    expect(texts(host(renderer))).toContain("Body text");
    expect(opened).toEqual([true]);
    act(() => summaries(host(renderer))[0]!.props.onPress());
    expect(texts(host(renderer))).not.toContain("Body text");
    expect(opened).toEqual([true, false]);
  });

  it("a disabled summary is a disabled Pressable, so the platform blocks its press", () => {
    expect(summaries(host(mountDetails({ disabled: true })))[0]!.props.disabled).toBe(true);
    expect(summaries(host(mountDetails({ disabled: false })))[0]!.props.disabled).toBe(false);
  });

  it("renders string children", () => {
    const renderer = mountDetails({ children: "More info" });
    expect(host(renderer).findAllByType("Text" as never).length).toBeGreaterThan(0);
  });

  it("layers the inline variant style entry", () => {
    const plain = host(mountDetails({ children: "x" }));
    const inline = host(mountDetails({ variant: "inline", children: "x" }));
    expect(inline.props.style[1]).toBeTruthy();
    expect(inline.props.style).not.toEqual(plain.props.style);
  });
});
