// @vitest-environment jsdom
// The runtime under test binds DOM listeners on real host elements; three
// tests observe document-level behavior (disabled/aria-disabled blocking,
// listener disposal). The codegen package's coverage config runs node by
// default (no React); this file is the DOM-observing exception.
// FIX-CODEGEN-COVERAGE-ENV-01
import { afterEach, describe, expect, it, vi } from "vitest";
import ts from "typescript";
import { INTERACTION_RUNTIME_SOURCE } from "./interaction-runtime.js";

type Runtime = {
  bindInteractionEvents(host: HTMLElement, handlers: Record<string, (event: Event) => void>): () => void;
  canActivateInteraction(event: Event, cancel?: boolean): boolean;
  toggleInteractionItem(value: string | string[], item: string, multiple: boolean, collapsible: boolean): string | string[];
  requestInteractionChange<T>(controlled: T | undefined, next: T, commit: (value: T) => void, notify: (value: T) => void): void;
  requestNativeRadioChange(event: { currentTarget: EventTarget | null }, request: () => void, readAccepted: () => string | undefined): void;
  requestNativeTextChange(event: { currentTarget: EventTarget | null; isComposing?: boolean }, request: () => void, readAccepted: () => string | undefined, afterRequest?: (restore: () => void) => void): void;
};
const runtime = {} as Runtime;
new Function("exports", ts.transpileModule(INTERACTION_RUNTIME_SOURCE, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(runtime);
afterEach(() => document.body.replaceChildren());

describe("native text ownership", () => {
  function input(tag = "input") {
    const target = document.createElement(tag) as HTMLInputElement | HTMLTextAreaElement;
    target.value = "edited"; document.body.append(target); target.focus(); return target;
  }
  it.each(["input", "textarea"])("restores refused %s text once with focus and isolation", async tag => {
    const target = input(tag); const other = input(); target.focus(); const request = vi.fn();
    runtime.requestNativeTextChange({ currentTarget: target }, request, () => "accepted");
    await Promise.resolve();
    expect(target.value).toBe("accepted"); expect(other.value).toBe("edited");
    expect(request).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(target);
  });
  it("reads after the request without equal-value writes or caret reset", async () => {
    const target = input(); target.setSelectionRange(2, 2);
    const setter = vi.spyOn(target, "value", "set"); let accepted = "before";
    const request = vi.fn(() => { accepted = "edited"; });
    runtime.requestNativeTextChange({ currentTarget: target }, request, () => accepted);
    await Promise.resolve();
    expect(target.value).toBe("edited"); expect(target.selectionStart).toBe(2);
    expect(setter).not.toHaveBeenCalled(); expect(request).toHaveBeenCalledTimes(1);
  });
  it("restores before propagating a callback exception and clears undefined", () => {
    const target = input(); const failure = new Error("consumer failed");
    expect(() => runtime.requestNativeTextChange({ currentTarget: target }, () => { throw failure; }, () => undefined)).toThrow(failure);
    expect(target.value).toBe(""); expect(document.activeElement).toBe(target);
  });
  it("ignores absent unrelated and file hosts", () => {
    const request = vi.fn(); const read = vi.fn(() => "accepted");
    const file = input() as HTMLInputElement; file.type = "file";
    for (const target of [null, document.createElement("div"), file]) runtime.requestNativeTextChange({ currentTarget: target }, request, read);
    expect(request).toHaveBeenCalledTimes(3); expect(read).not.toHaveBeenCalled(); expect(file.value).toBe("");
  });
  it("retains a composing draft until compositionend then reads latest accepted state", () => {
    const target = input(); const frames: FrameRequestCallback[] = [];
    const frame = vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.push(callback); return frames.length; });
    let accepted = "before"; const request = vi.fn();
    try {
      runtime.requestNativeTextChange({ currentTarget: target, isComposing: true }, request, () => accepted);
      target.value = "編集中";
      runtime.requestNativeTextChange({ currentTarget: target, isComposing: true }, request, () => accepted);
      expect(target.value).toBe("編集中"); expect(frames).toHaveLength(0);
      target.dispatchEvent(new CompositionEvent("compositionend"));
      expect(frames).toHaveLength(1); expect(target.value).toBe("編集中");
      accepted = "accepted later"; frames[0](0);
      expect(target.value).toBe("accepted later"); expect(request).toHaveBeenCalledTimes(2);
      expect(document.activeElement).toBe(target);
    } finally { frame.mockRestore(); }
  });
  it("lets final input reconcile and rejects a stale frame during a new composition", async () => {
    const target = input(); const frames: FrameRequestCallback[] = [];
    const frame = vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.push(callback); return frames.length; });
    try {
      runtime.requestNativeTextChange({ currentTarget: target, isComposing: true }, () => {}, () => "old");
      target.dispatchEvent(new CompositionEvent("compositionend"));
      runtime.requestNativeTextChange({ currentTarget: target }, () => {}, () => "final");
      await Promise.resolve();
      expect(target.value).toBe("final"); target.value = "新";
      runtime.requestNativeTextChange({ currentTarget: target, isComposing: true }, () => {}, () => "new");
      frames[0](0); expect(target.value).toBe("新");
    } finally { frame.mockRestore(); }
  });
  it("waits for queued parent propagation without writing old text", async () => {
    const target = input(); target.setSelectionRange(2, 2);
    const setter = vi.spyOn(target, "value", "set"); let accepted = "before";
    runtime.requestNativeTextChange({ currentTarget: target }, () => {
      queueMicrotask(() => { accepted = "edited"; });
    }, () => accepted);
    await Promise.resolve();
    expect(target.value).toBe("edited"); expect(target.selectionStart).toBe(2);
    expect(setter).not.toHaveBeenCalled();
  });
  it("uses the supplied renderer flush before reading accepted state", () => {
    const target = input(); let finish: () => void = () => { throw new Error("flush missing"); };
    let accepted = "before";
    runtime.requestNativeTextChange({ currentTarget: target }, () => {}, () => accepted, restore => { finish = restore; });
    expect(target.value).toBe("edited"); accepted = "after-render"; finish();
    expect(target.value).toBe("after-render");
  });
  it("does not schedule or read a host disposed by its request", () => {
    const target = input(); const schedule = vi.fn(); const read = vi.fn(() => "accepted");
    runtime.requestNativeTextChange({ currentTarget: target }, () => target.remove(), read, schedule);
    expect(schedule).not.toHaveBeenCalled(); expect(read).not.toHaveBeenCalled();
    expect(target.isConnected).toBe(false);
  });
  it("preserves the callback error when it also disposes the host", () => {
    const target = input(); const read = vi.fn(() => { throw new Error("disposed getter"); });
    const failure = new Error("consumer failed");
    expect(() => runtime.requestNativeTextChange({ currentTarget: target }, () => { target.remove(); throw failure; }, read)).toThrow(failure);
    expect(read).not.toHaveBeenCalled();
  });
  it("does not overwrite a new composing draft with an older queued request", async () => {
    const target = input();
    runtime.requestNativeTextChange({ currentTarget: target }, () => {}, () => "old");
    target.value = "新";
    runtime.requestNativeTextChange({ currentTarget: target, isComposing: true }, () => {}, () => "old");
    await Promise.resolve(); expect(target.value).toBe("新");
  });
  it("does not read a disposed composing control after removal", () => {
    const target = input(); let finish: FrameRequestCallback = () => { throw new Error("frame missing"); };
    const frame = vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { finish = callback; return 1; });
    const read = vi.fn(() => "accepted");
    try {
      runtime.requestNativeTextChange({ currentTarget: target, isComposing: true }, () => {}, read);
      target.dispatchEvent(new CompositionEvent("compositionend")); target.remove(); finish(0);
      expect(read).not.toHaveBeenCalled(); expect(target.value).toBe("edited");
    } finally { frame.mockRestore(); }
  });
});

function radio(parent: Element | DocumentFragment, name: string, value: string, checked = false) {
  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  parent.append(input);
  input.checked = checked;
  return input;
}

describe("native radio ownership", () => {
  it("restores every peer after refusal while retaining the activated radio's focus", () => {
    const accepted = radio(document.body, "choice", "alpha", true);
    const activated = radio(document.body, "choice", "gamma");
    activated.checked = true;
    activated.focus();
    const request = vi.fn(() => expect(activated.checked).toBe(true));
    runtime.requestNativeRadioChange({ currentTarget: activated }, request, () => "alpha");
    expect(request).toHaveBeenCalledTimes(1);
    expect([accepted.checked, activated.checked]).toEqual([true, false]);
    expect(document.activeElement).toBe(activated);
  });

  it("reads the accepted value after a single uncontrolled or accepted request", () => {
    const first = radio(document.body, "choice", "alpha", true);
    const next = radio(document.body, "choice", "gamma");
    let accepted = "alpha";
    const request = vi.fn(() => { accepted = "gamma"; });
    runtime.requestNativeRadioChange({ currentTarget: next }, request, () => accepted);
    expect(request).toHaveBeenCalledTimes(1);
    expect([first.checked, next.checked]).toEqual([false, true]);
  });

  it("restores the group before propagating the original callback exception", () => {
    const first = radio(document.body, "choice", "alpha", true);
    const next = radio(document.body, "choice", "gamma", true);
    const failure = new Error("consumer failure");
    expect(() => runtime.requestNativeRadioChange({ currentTarget: next }, () => { throw failure; }, () => "alpha")).toThrow(failure);
    expect([first.checked, next.checked]).toEqual([true, false]);
  });

  it("isolates names and form owners, including external form-associated peers", () => {
    const form = document.createElement("form");
    form.id = "first-form";
    const otherForm = document.createElement("form");
    document.body.append(form, otherForm);
    const name = 'choice["value"]';
    const first = radio(form, name, "alpha", true);
    const next = radio(form, name, "gamma", true);
    const external = radio(document.body, name, "external");
    external.setAttribute("form", form.id);
    const unrelatedName = radio(form, "other", "gamma", true);
    const unrelatedForm = radio(otherForm, name, "gamma", true);
    runtime.requestNativeRadioChange({ currentTarget: next }, () => {}, () => "external");
    expect([first.checked, next.checked, external.checked]).toEqual([false, false, true]);
    expect([unrelatedName.checked, unrelatedForm.checked]).toEqual([true, true]);
  });

  it("isolates shadow roots even when name and form owner match", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const outside = radio(document.body, "choice", "gamma", true);
    const first = radio(shadow, "choice", "alpha");
    const next = radio(shadow, "choice", "gamma", true);
    runtime.requestNativeRadioChange({ currentTarget: next }, () => {}, () => "alpha");
    expect([first.checked, next.checked, outside.checked]).toEqual([true, false, true]);
  });

  it("treats empty names as independent controls and reconciles detached targets", () => {
    const independent = radio(document.body, "", "alpha", true);
    const unnamed = radio(document.body, "", "gamma", true);
    runtime.requestNativeRadioChange({ currentTarget: unnamed }, () => {}, () => "alpha");
    expect([independent.checked, unnamed.checked]).toEqual([true, false]);
    const detached = radio(document.createDocumentFragment(), "choice", "gamma", true);
    detached.remove();
    runtime.requestNativeRadioChange({ currentTarget: detached }, () => {}, () => undefined);
    expect(detached.checked).toBe(false);
  });

  it("does not read or reconcile checked state for an absent or non-radio host", () => {
    const request = vi.fn();
    const read = vi.fn(() => "alpha");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    runtime.requestNativeRadioChange({ currentTarget: null }, request, read);
    runtime.requestNativeRadioChange({ currentTarget: checkbox }, request, read);
    expect(request).toHaveBeenCalledTimes(2);
    expect(read).not.toHaveBeenCalled();
    expect(checkbox.checked).toBe(true);
  });
});

describe("shared interaction runtime", () => {
  it.each([false, true])("respects consumer cancellation with native cancellation=%s", cancel => {
    const event = new Event("click", { cancelable: true });
    event.preventDefault();
    expect(runtime.canActivateInteraction(event, cancel)).toBe(false);
  });
  it("suppresses native default while allowing one governed activation", () => {
    const event = new Event("click", { cancelable: true });
    expect(runtime.canActivateInteraction(event, true)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });
  it.each(["disabled", "aria-disabled"])("blocks a %s host", attr => {
    const host = document.createElement("button");
    host.setAttribute(attr, "true");
    const decisions: boolean[] = [];
    host.addEventListener("click", event => decisions.push(runtime.canActivateInteraction(event)));
    host.dispatchEvent(new Event("click"));
    expect(decisions).toEqual([false]);
  });
  it.each([undefined, false, true])("writes only uncontrolled state, controlled=%s", controlled => {
    const commit = vi.fn(); const notify = vi.fn();
    runtime.requestInteractionChange(controlled, true, commit, notify);
    expect(commit.mock.calls).toEqual(controlled === undefined ? [[true]] : []);
    expect(notify.mock.calls).toEqual([[true]]);
  });
  it("preserves single, collapsible and multiple selection policy", () => {
    expect(runtime.toggleInteractionItem("a", "b", false, false)).toBe("b");
    expect(runtime.toggleInteractionItem("a", "a", false, false)).toBe("a");
    expect(runtime.toggleInteractionItem("a", "a", false, true)).toBe("");
    const original = ["a", "b"];
    expect(runtime.toggleInteractionItem(original, "a", true, true)).toEqual(["b"]);
    expect(runtime.toggleInteractionItem(original, "c", true, true)).toEqual(["a", "b", "c"]);
    expect(original).toEqual(["a", "b"]);
  });
  it("disposes only its own listeners when several bindings share one host", () => {
    const host = document.createElement("button");
    const first = vi.fn(); const second = vi.fn();
    const unbindFirst = runtime.bindInteractionEvents(host, { click: first });
    const unbindSecond = runtime.bindInteractionEvents(host, { click: second });
    host.click();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    unbindFirst(); host.click();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    unbindSecond(); host.click();
    expect(second).toHaveBeenCalledTimes(2);
  });

});
