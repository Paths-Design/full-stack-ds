/**
 * Behavioral contract for the generated Shuttle's dual-listbox transfer,
 * shared by every web runtime. Each package supplies a harness that mounts
 * its generated Shuttle and flushes its own update and post-render cycle;
 * the obligations below are the same in every framework.
 */
export interface ShuttleTestProps {
  options?: string[];
  value?: string[];
  defaultValue?: string[];
  ariaLabel?: string;
  onValueChange?: (value: string[]) => void;
}

export interface ShuttleView {
  /** The generated `.shuttle` root element. */
  root: Element;
  /** Run an interaction, then flush the framework's updates and post-render effects. */
  act(interaction: () => void): Promise<void>;
}

export interface ShuttleHarness {
  mount(props: ShuttleTestProps): Promise<ShuttleView>;
}

type TestBody = () => void | Promise<void>;
export interface ShuttleTestRunner {
  describe(name: string, body: () => void): void;
  it(name: string, body: TestBody): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect(value: unknown): any;
}

const OPTIONS = ["alpha", "beta", "gamma", "delta"];
const list = (root: Element, side: "available" | "selected") => {
  const found = root.querySelector(`[role="listbox"][data-side="${side}"]`);
  if (!found) throw new Error(`no ${side} listbox`);
  return found;
};
const options = (root: Element, side: "available" | "selected") =>
  [...list(root, side).querySelectorAll<HTMLElement>('[role="option"]')];
const keys = (root: Element, side: "available" | "selected") => options(root, side).map((option) => option.getAttribute("data-value"));
const option = (root: Element, side: "available" | "selected", key: string) => {
  const found = options(root, side).find((candidate) => candidate.getAttribute("data-value") === key);
  if (!found) throw new Error(`no ${side} option ${key}`);
  return found;
};
const marked = (root: Element, side: "available" | "selected") =>
  options(root, side).filter((candidate) => candidate.getAttribute("aria-selected") === "true").map((candidate) => candidate.getAttribute("data-value"));
const tabStops = (root: Element, side: "available" | "selected") =>
  options(root, side).filter((candidate) => candidate.getAttribute("tabindex") === "0").map((candidate) => candidate.getAttribute("data-value"));
const button = (root: Element, part: "add" | "remove") => {
  const found = root.querySelector<HTMLButtonElement>(`.shuttle__${part}`);
  if (!found) throw new Error(`no ${part} button`);
  return found;
};
const active = (root: Element) => (root.getRootNode() as Document | ShadowRoot).activeElement as HTMLElement | null;
function press(target: HTMLElement, key: string) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(event);
  return event;
}

export function shuttleContract(framework: string, harness: ShuttleHarness, runner: ShuttleTestRunner): void {
  const { describe, it, expect } = runner;
  const spy = () => {
    const calls: string[][] = [];
    return { calls, onValueChange: (value: string[]) => { calls.push([...value]); } };
  };

  describe(`${framework} Shuttle transfer`, () => {
    it("lists the options outside the value as available and the value as selected, in two multiselectable listboxes named from the catalog", async () => {
      const { root } = await harness.mount({ options: OPTIONS, defaultValue: ["delta", "alpha"] });
      expect(keys(root, "available")).toEqual(["beta", "gamma"]);
      expect(keys(root, "selected")).toEqual(["delta", "alpha"]);
      for (const side of ["available", "selected"] as const) {
        expect(list(root, side).getAttribute("aria-multiselectable")).toBe("true");
      }
      expect(list(root, "available").getAttribute("aria-label")).toBe("Available");
      expect(list(root, "selected").getAttribute("aria-label")).toBe("Selected");
      expect([button(root, "add").textContent?.trim(), button(root, "remove").textContent?.trim()]).toEqual(["Add", "Remove"]);
    });

    it("a click marks an option through aria-selected and enables only the button that moves it", async () => {
      const view = await harness.mount({ options: OPTIONS, defaultValue: ["delta"] });
      expect(marked(view.root, "available")).toEqual([]);
      expect(options(view.root, "available").map((candidate) => candidate.getAttribute("aria-selected"))).toEqual(["false", "false", "false"]);
      expect([button(view.root, "add").disabled, button(view.root, "remove").disabled]).toEqual([true, true]);
      await view.act(() => option(view.root, "available", "beta").click());
      expect(marked(view.root, "available")).toEqual(["beta"]);
      expect([button(view.root, "add").disabled, button(view.root, "remove").disabled]).toEqual([false, true]);
      await view.act(() => option(view.root, "available", "beta").click());
      expect(marked(view.root, "available")).toEqual([]);
      expect(button(view.root, "add").disabled).toBe(true);
    });

    it("Add moves the marked options to the end of the value in options order, reports it and clears the marks", async () => {
      const changes = spy();
      const view = await harness.mount({ options: OPTIONS, defaultValue: ["delta"], onValueChange: changes.onValueChange });
      await view.act(() => option(view.root, "available", "gamma").click());
      await view.act(() => option(view.root, "available", "alpha").click());
      await view.act(() => button(view.root, "add").click());
      expect(changes.calls).toEqual([["delta", "alpha", "gamma"]]);
      expect(keys(view.root, "available")).toEqual(["beta"]);
      expect(keys(view.root, "selected")).toEqual(["delta", "alpha", "gamma"]);
      expect([...marked(view.root, "available"), ...marked(view.root, "selected")]).toEqual([]);
    });

    it("Remove moves the marked selected options back to the available list in options order", async () => {
      const changes = spy();
      const view = await harness.mount({ options: OPTIONS, defaultValue: ["delta", "alpha", "gamma"], onValueChange: changes.onValueChange });
      await view.act(() => option(view.root, "selected", "alpha").click());
      await view.act(() => button(view.root, "remove").click());
      expect(changes.calls).toEqual([["delta", "gamma"]]);
      expect(keys(view.root, "available")).toEqual(["alpha", "beta"]);
    });

    it("gives each list one tab stop that the arrows, Home and End move without wrapping, and focus follows it", async () => {
      const view = await harness.mount({ options: OPTIONS, defaultValue: [] });
      expect(tabStops(view.root, "available")).toEqual(["alpha"]);
      await view.act(() => { option(view.root, "available", "alpha").focus(); press(option(view.root, "available", "alpha"), "ArrowDown"); });
      expect(tabStops(view.root, "available")).toEqual(["beta"]);
      expect(active(view.root)?.getAttribute("data-value")).toBe("beta");
      await view.act(() => press(option(view.root, "available", "beta"), "End"));
      expect(tabStops(view.root, "available")).toEqual(["delta"]);
      await view.act(() => press(option(view.root, "available", "delta"), "ArrowDown"));
      expect(tabStops(view.root, "available")).toEqual(["delta"]);
      await view.act(() => press(option(view.root, "available", "delta"), "Home"));
      expect(tabStops(view.root, "available")).toEqual(["alpha"]);
      expect(active(view.root)?.getAttribute("data-value")).toBe("alpha");
    });

    it("Space marks the focused option and Enter moves the marked options, taking both keys' defaults", async () => {
      const changes = spy();
      const view = await harness.mount({ options: OPTIONS, defaultValue: ["delta"], onValueChange: changes.onValueChange });
      let event: KeyboardEvent | undefined;
      await view.act(() => { event = press(option(view.root, "available", "beta"), " "); });
      expect(event!.defaultPrevented).toBe(true);
      expect(marked(view.root, "available")).toEqual(["beta"]);
      await view.act(() => press(option(view.root, "available", "gamma"), " "));
      await view.act(() => { event = press(option(view.root, "available", "gamma"), "Enter"); });
      expect(event!.defaultPrevented).toBe(true);
      expect(changes.calls).toEqual([["delta", "beta", "gamma"]]);
    });

    it("Enter with nothing marked moves the focused option, and focus stays in its list on the nearest remaining option", async () => {
      const changes = spy();
      const view = await harness.mount({ options: OPTIONS, defaultValue: ["delta"], onValueChange: changes.onValueChange });
      await view.act(() => { option(view.root, "available", "beta").focus(); press(option(view.root, "available", "beta"), "Enter"); });
      expect(changes.calls).toEqual([["delta", "beta"]]);
      expect(keys(view.root, "available")).toEqual(["alpha", "gamma"]);
      expect(active(view.root)?.getAttribute("data-value")).toBe("gamma");
      expect(tabStops(view.root, "available")).toEqual(["gamma"]);
    });

    it("leaves Tab and other keys to the platform", async () => {
      const view = await harness.mount({ options: OPTIONS, defaultValue: [] });
      let event: KeyboardEvent | undefined;
      await view.act(() => { event = press(option(view.root, "available", "alpha"), "Tab"); });
      expect(event!.defaultPrevented).toBe(false);
      expect(tabStops(view.root, "available")).toEqual(["alpha"]);
    });

    it("a controlled value that does not follow a transfer keeps both lists and reports the request", async () => {
      const changes = spy();
      const view = await harness.mount({ options: OPTIONS, value: ["delta"], onValueChange: changes.onValueChange });
      await view.act(() => option(view.root, "available", "alpha").click());
      await view.act(() => button(view.root, "add").click());
      expect(changes.calls).toEqual([["delta", "alpha"]]);
      expect(keys(view.root, "selected")).toEqual(["delta"]);
      expect(keys(view.root, "available")).toEqual(["alpha", "beta", "gamma"]);
      // The request consumed the marks even though the value did not follow.
      expect(marked(view.root, "available")).toEqual([]);
    });

    it("keys act on the list they are pressed in: Enter on a selected option moves it back", async () => {
      const changes = spy();
      const view = await harness.mount({ options: OPTIONS, defaultValue: ["delta", "alpha"], onValueChange: changes.onValueChange });
      await view.act(() => { option(view.root, "selected", "alpha").focus(); press(option(view.root, "selected", "alpha"), "Enter"); });
      expect(changes.calls).toEqual([["delta"]]);
      expect(keys(view.root, "available")).toEqual(["alpha", "beta", "gamma"]);
      expect(active(view.root)?.getAttribute("data-value")).toBe("delta");
    });
  });
}
