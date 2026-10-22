// Hand-written behavioral companion to the generated Shuttle scaffold.
import { describe, expect, it } from "vitest";
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { Shuttle } from "../Shuttle";

const OPTIONS = ["alpha", "beta", "gamma", "delta"];

function mountShuttle(props: Record<string, unknown> = {}) {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(<Shuttle options={OPTIONS} testID="subject" {...props} />);
  });
  return renderer!;
}

/** Host nodes only (string type): the test shim wraps a same-named host carrying identical props. */
const hosts = (r: ReactTestRenderer, type: string) => r.root.findAll((n) => String(n.type) === type);
const textOf = (node: ReactTestInstance): string =>
  node.findAll((n) => String(n.type) === "Text").map((n) => n.props.children).filter((c) => typeof c === "string").join("");
/** The two lists, found by the catalog names they carry. */
const list = (r: ReactTestRenderer, name: "Available" | "Selected") => {
  const found = hosts(r, "View").find((n) => n.props.accessibilityLabel === name);
  if (!found) throw new Error(`no ${name} list`);
  return found;
};
const items = (r: ReactTestRenderer, name: "Available" | "Selected") =>
  list(r, name).findAll((n) => String(n.type) === "Pressable" && typeof n.props.onPress === "function");
const keys = (r: ReactTestRenderer, name: "Available" | "Selected") => items(r, name).map(textOf);
const item = (r: ReactTestRenderer, name: "Available" | "Selected", key: string) => items(r, name).find((n) => textOf(n) === key)!;
const control = (r: ReactTestRenderer, label: "Add" | "Remove") =>
  hosts(r, "Pressable").find((n) => n.props.accessibilityRole === "button" && textOf(n) === label)!;

describe("Shuttle — dual-listbox transfer", () => {
  it("lists the options outside the value as available and the value as selected", () => {
    const r = mountShuttle({ defaultValue: ["delta", "alpha"] });
    expect(keys(r, "Available")).toEqual(["beta", "gamma"]);
    expect(keys(r, "Selected")).toEqual(["delta", "alpha"]);
  });

  it("a press marks an item as selected, a button with a selected accessibility state", () => {
    const r = mountShuttle({ defaultValue: ["delta"] });
    expect(item(r, "Available", "beta").props.accessibilityRole).toBe("button");
    expect(item(r, "Available", "beta").props.accessibilityState).toEqual({ selected: false });
    expect(control(r, "Add").props.accessibilityState).toEqual({ disabled: true });
    act(() => item(r, "Available", "beta").props.onPress());
    expect(item(r, "Available", "beta").props.accessibilityState).toEqual({ selected: true });
    expect(control(r, "Add").props.accessibilityState).toEqual({ disabled: false });
    expect(control(r, "Remove").props.accessibilityState).toEqual({ disabled: true });
  });

  it("Add and Remove move the marked items and report the value", () => {
    const calls: string[][] = [];
    const r = mountShuttle({ defaultValue: ["delta"], onValueChange: (value: string[]) => calls.push([...value]) });
    act(() => item(r, "Available", "gamma").props.onPress());
    act(() => item(r, "Available", "alpha").props.onPress());
    act(() => control(r, "Add").props.onPress());
    expect(keys(r, "Selected")).toEqual(["delta", "alpha", "gamma"]);
    act(() => item(r, "Selected", "delta").props.onPress());
    act(() => control(r, "Remove").props.onPress());
    expect(calls).toEqual([["delta", "alpha", "gamma"], ["alpha", "gamma"]]);
    expect(keys(r, "Available")).toEqual(["beta", "delta"]);
  });
});
