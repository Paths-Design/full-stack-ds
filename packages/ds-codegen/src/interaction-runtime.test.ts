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
};
const runtime = {} as Runtime;
new Function("exports", ts.transpileModule(INTERACTION_RUNTIME_SOURCE, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(runtime);
afterEach(() => document.body.replaceChildren());

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
