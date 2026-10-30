// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { computeTransferList, createTransferList, type TransferListOptions, type TransferListState } from "./transfer-list.js";

const options = (over: Partial<TransferListOptions> = {}): TransferListOptions => ({
  options: ["alpha", "beta", "gamma", "delta", "epsilon"],
  value: ["delta", "alpha"],
  onValueChange: () => {},
  ...over,
});
const keys = (items: TransferListState["available"]) => items.map((item) => item.key);
const marked = (items: TransferListState["available"]) => items.filter((item) => item.marked).map((item) => item.key);
const stops = (items: TransferListState["available"]) => items.filter((item) => item.tabIndex === 0).map((item) => item.key);

/** Two rendered lists inside a group, as every web target renders them. The
 * group element persists across renders, as a component's root does. */
function render(state: TransferListState) {
  let root = document.body.firstElementChild;
  if (root?.getAttribute("role") !== "group") {
    root = document.createElement("div");
    root.setAttribute("role", "group");
    document.body.replaceChildren(root);
  }
  root.replaceChildren();
  for (const side of ["available", "selected"] as const) {
    const list = document.createElement("ul");
    list.setAttribute("role", "listbox");
    list.setAttribute("data-side", side);
    for (const item of state[side]) {
      const option = document.createElement("li");
      option.setAttribute("role", "option");
      option.setAttribute("data-value", item.key);
      option.tabIndex = item.tabIndex;
      list.append(option);
    }
    root.append(list);
  }
  return root;
}
const list = (root: Element, side: string) => root.querySelector(`[data-side="${side}"]`)!;
const option = (root: Element, side: string, key: string) => list(root, side).querySelector(`[data-value="${key}"]`) as HTMLElement;
function press(root: Element, side: string, key: string, on: string) {
  const preventDefault = vi.fn();
  return { event: { key, target: option(root, side, on), currentTarget: list(root, side), preventDefault }, preventDefault };
}

describe("transfer list derivation", () => {
  it("lists the options outside the value in options order, and the value in transfer order", () => {
    const state = computeTransferList(options(), { available: new Set(), selected: new Set() }, {});
    expect(keys(state.available)).toEqual(["beta", "gamma", "epsilon"]);
    expect(keys(state.selected)).toEqual(["delta", "alpha"]);
    expect(state.available.map((item) => item.label)).toEqual(["beta", "gamma", "epsilon"]);
    expect(state.available.every((item) => item.side === "available")).toBe(true);
    expect(state.selected.every((item) => item.side === "selected")).toBe(true);
  });

  it("reads absent options or value as none", () => {
    const state = computeTransferList({ onValueChange: () => {} }, { available: new Set(), selected: new Set() }, {});
    expect([state.available, state.selected]).toEqual([[], []]);
    const onValueChange = vi.fn();
    const list = createTransferList();
    list.sync({ options: ["alpha"], onValueChange });
    list.toggle(list.state.available[0]);
    list.add();
    expect(onValueChange).toHaveBeenCalledWith(["alpha"]);
  });

  it("gives each list one tab stop, the first item until another is focused", () => {
    const state = computeTransferList(options(), { available: new Set(), selected: new Set() }, { selected: "alpha" });
    expect(stops(state.available)).toEqual(["beta"]);
    expect(stops(state.selected)).toEqual(["alpha"]);
  });

  it("disables each button until its source list has a marked item", () => {
    const none = computeTransferList(options(), { available: new Set(), selected: new Set() }, {});
    expect([none.addDisabled, none.removeDisabled]).toEqual([true, true]);
    const some = computeTransferList(options(), { available: new Set(["gamma"]), selected: new Set() }, {});
    expect([some.addDisabled, some.removeDisabled]).toEqual([false, true]);
  });

  it("drops a mark whose item is no longer on that side", () => {
    const state = computeTransferList(options({ value: ["delta", "alpha", "gamma"] }), { available: new Set(["gamma", "beta"]), selected: new Set() }, {});
    expect(marked(state.available)).toEqual(["beta"]);
    expect(state.addDisabled).toBe(false);
  });
});

describe("transfer list marks and transfers", () => {
  it("toggles an item's mark and reports it as marked", () => {
    const list = createTransferList();
    list.sync(options());
    list.toggle(list.state.available[1]);
    expect(marked(list.sync(options()).available)).toEqual(["gamma"]);
    list.toggle(list.state.available[1]);
    expect(marked(list.sync(options()).available)).toEqual([]);
  });

  it("adds the marked available items to the end of the value in options order and clears the marks", () => {
    const onValueChange = vi.fn();
    const list = createTransferList();
    list.sync(options({ onValueChange }));
    list.toggle(list.state.available[2]);
    list.toggle(list.state.available[0]);
    list.add();
    expect(onValueChange).toHaveBeenCalledWith(["delta", "alpha", "beta", "epsilon"]);
    const next = list.sync(options({ onValueChange, value: ["delta", "alpha", "beta", "epsilon"] }));
    expect(keys(next.available)).toEqual(["gamma"]);
    expect(marked(next.available)).toEqual([]);
  });

  it("removes the marked selected items and keeps the rest in order", () => {
    const onValueChange = vi.fn();
    const list = createTransferList();
    list.sync(options({ onValueChange, value: ["delta", "alpha", "gamma"] }));
    list.toggle(list.state.selected[1]);
    list.remove();
    expect(onValueChange).toHaveBeenCalledWith(["delta", "gamma"]);
  });

  it("does nothing when a button runs with no marked item", () => {
    const onValueChange = vi.fn();
    const list = createTransferList();
    list.sync(options({ onValueChange }));
    list.add();
    list.remove();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("notifies subscribers when a mark changes", () => {
    const list = createTransferList();
    list.sync(options());
    const listener = vi.fn();
    list.subscribe(listener);
    const before = list.version;
    list.toggle(list.state.available[0]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(list.version).toBe(before + 1);
  });
});

describe("transfer list keyboard", () => {
  it("moves the tab stop within a list with the arrows, Home and End, and never wraps", () => {
    const list = createTransferList();
    let root = render(list.sync(options()));
    const down = press(root, "available", "ArrowDown", "beta");
    list.keydown(down.event);
    expect(down.preventDefault).toHaveBeenCalled();
    expect(stops(list.sync(options()).available)).toEqual(["gamma"]);
    root = render(list.state);
    list.keydown(press(root, "available", "End", "gamma").event);
    expect(stops(list.sync(options()).available)).toEqual(["epsilon"]);
    root = render(list.state);
    list.keydown(press(root, "available", "ArrowDown", "epsilon").event);
    expect(stops(list.sync(options()).available)).toEqual(["epsilon"]);
    root = render(list.state);
    list.keydown(press(root, "available", "Home", "epsilon").event);
    expect(stops(list.sync(options()).available)).toEqual(["beta"]);
    root = render(list.state);
    list.keydown(press(root, "available", "ArrowUp", "beta").event);
    expect(stops(list.sync(options()).available)).toEqual(["beta"]);
  });

  it("acts on the list the key was pressed in", () => {
    const list = createTransferList();
    const root = render(list.sync(options()));
    list.keydown(press(root, "selected", "ArrowDown", "delta").event);
    const state = list.sync(options());
    expect(stops(state.selected)).toEqual(["alpha"]);
    expect(stops(state.available)).toEqual(["beta"]);
  });

  it("toggles the focused item's mark with Space", () => {
    const list = createTransferList();
    const root = render(list.sync(options()));
    const space = press(root, "available", " ", "gamma");
    list.keydown(space.event);
    expect(space.preventDefault).toHaveBeenCalled();
    expect(marked(list.sync(options()).available)).toEqual(["gamma"]);
  });

  it("moves the marked items to the other list with Enter", () => {
    const onValueChange = vi.fn();
    const list = createTransferList();
    list.sync(options({ onValueChange }));
    list.toggle(list.state.available[0]);
    list.toggle(list.state.available[2]);
    const root = render(list.state);
    list.keydown(press(root, "available", "Enter", "gamma").event);
    expect(onValueChange).toHaveBeenCalledWith(["delta", "alpha", "beta", "epsilon"]);
  });

  it("moves the focused item with Enter when nothing is marked", () => {
    const onValueChange = vi.fn();
    const list = createTransferList();
    const root = render(list.sync(options({ onValueChange })));
    list.keydown(press(root, "selected", "Enter", "alpha").event);
    expect(onValueChange).toHaveBeenCalledWith(["delta"]);
  });

  it("accumulates moves pressed before the list re-renders, from the item the last key targeted", () => {
    const list = createTransferList();
    const root = render(list.sync(options()));
    // DOM focus stays on beta: no render runs between the two presses.
    list.keydown(press(root, "available", "ArrowDown", "beta").event);
    list.keydown(press(root, "available", "ArrowDown", "beta").event);
    expect(stops(list.sync(options()).available)).toEqual(["epsilon"]);
  });

  it("marks the item a pending move targeted with Space", () => {
    const list = createTransferList();
    const root = render(list.sync(options()));
    list.keydown(press(root, "available", "ArrowDown", "beta").event);
    list.keydown(press(root, "available", " ", "beta").event);
    expect(marked(list.sync(options()).available)).toEqual(["gamma"]);
  });

  it("builds a second Enter before the re-render on the value the first reported, and keeps focus on an item that remains", () => {
    const onValueChange = vi.fn();
    const list = createTransferList();
    const root = render(list.sync(options({ onValueChange })));
    list.keydown(press(root, "available", "Enter", "beta").event);
    list.keydown(press(root, "available", "Enter", "beta").event);
    expect(onValueChange.mock.calls).toEqual([[["delta", "alpha", "beta"]], [["delta", "alpha", "beta", "gamma"]]]);
    const next = render(list.sync(options({ onValueChange, value: ["delta", "alpha", "beta", "gamma"] })));
    list.afterRender();
    expect(document.activeElement).toBe(option(next, "available", "epsilon"));
  });

  it("hands focus after a second Enter before the re-render to an item still in the list, never one the first moved", () => {
    const onValueChange = vi.fn();
    const list = createTransferList();
    const root = render(list.sync(options({ onValueChange })));
    // gamma moves and focus is pending on epsilon; Enter again moves epsilon,
    // and the nearest item that remains is beta, not the moved gamma.
    list.keydown(press(root, "available", "Enter", "gamma").event);
    list.keydown(press(root, "available", "Enter", "gamma").event);
    expect(onValueChange).toHaveBeenLastCalledWith(["delta", "alpha", "gamma", "epsilon"]);
    const next = render(list.sync(options({ onValueChange, value: ["delta", "alpha", "gamma", "epsilon"] })));
    list.afterRender();
    expect(document.activeElement).toBe(option(next, "available", "beta"));
  });

  it("drops a reported value the next sync does not carry, as a controlled value that refused it", () => {
    const onValueChange = vi.fn();
    const list = createTransferList();
    list.sync(options({ onValueChange }));
    list.toggle(list.state.available[0]);
    list.add();
    expect(keys(list.sync(options({ onValueChange })).available)).toEqual(["beta", "gamma", "epsilon"]);
    list.toggle(list.state.available[1]);
    list.add();
    expect(onValueChange).toHaveBeenLastCalledWith(["delta", "alpha", "gamma"]);
  });

  it("leaves other keys to the platform", () => {
    const list = createTransferList();
    const root = render(list.sync(options()));
    const tab = press(root, "available", "Tab", "beta");
    list.keydown(tab.event);
    expect(tab.preventDefault).not.toHaveBeenCalled();
  });
});

describe("transfer list focus after render", () => {
  it.each(["available", "selected"] as const)("keeps focus and the tab stop on a retained %s item when a controlled parent rejects a button transfer", (side) => {
    const core = createTransferList();
    const values = ["alpha", "beta", "gamma"];
    const onValueChange = vi.fn();
    const controlled = options({ options: values, value: side === "available" ? [] : values, onValueChange });
    let root = render(core.sync(controlled));
    for (const item of core.state[side]) core.toggle(item);
    const button = document.createElement("button");
    root.append(button);
    button.focus();
    core[side === "available" ? "add" : "remove"]({ currentTarget: button });
    expect(onValueChange.mock.calls).toEqual([[side === "available" ? values : []]]);
    root = render(core.sync(controlled));
    core.afterRender();
    expect(document.activeElement).toBe(option(root, side, "alpha"));
    expect(stops(core.state[side])).toEqual(["alpha"]);
    expect(marked(core.state[side])).toEqual([]);
  });

  it("focuses the item an arrow moved to once it renders", () => {
    const list = createTransferList();
    let root = render(list.sync(options()));
    option(root, "available", "beta").focus();
    list.keydown(press(root, "available", "ArrowDown", "beta").event);
    root = render(list.sync(options()));
    list.afterRender();
    expect(document.activeElement).toBe(option(root, "available", "gamma"));
  });

  it("keeps focus in the source list on the nearest remaining item after Enter", () => {
    const onValueChange = vi.fn();
    const list = createTransferList();
    let root = render(list.sync(options({ onValueChange })));
    list.keydown(press(root, "available", "Enter", "gamma").event);
    root = render(list.sync(options({ onValueChange, value: ["delta", "alpha", "gamma"] })));
    list.afterRender();
    expect(document.activeElement).toBe(option(root, "available", "epsilon"));
  });

  it("follows the moved item to the other list when its list empties", () => {
    const onValueChange = vi.fn();
    const all = ["alpha", "beta"];
    const list = createTransferList();
    let root = render(list.sync(options({ options: all, value: ["alpha"], onValueChange })));
    list.keydown(press(root, "available", "Enter", "beta").event);
    root = render(list.sync(options({ options: all, value: ["alpha", "beta"], onValueChange })));
    list.afterRender();
    expect(document.activeElement).toBe(option(root, "selected", "beta"));
  });

  it("does not take focus when nothing asked for it", () => {
    const list = createTransferList();
    render(list.sync(options()));
    document.body.focus();
    list.afterRender();
    expect(document.activeElement).toBe(document.body);
  });
});
