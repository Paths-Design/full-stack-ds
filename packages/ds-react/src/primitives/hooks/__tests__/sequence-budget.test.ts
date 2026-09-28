import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSequenceBudget as react, type SequenceOptions } from "../../sequence-budget";
import { createSequenceBudget as vue } from "../../../../../ds-vue/src/primitives/sequence-budget";
import { createSequenceBudget as svelte } from "../../../../../ds-svelte/src/primitives/sequence-budget";
import { createSequenceBudget as angular } from "../../../../../ds-angular/src/primitives/sequence-budget";
import { createSequenceBudget as lit } from "../../../../../ds-lit/src/primitives/sequence-budget";

for (const [name, create] of Object.entries({ react, vue, svelte, angular, lit })) {
  describe(`${name} sequence budget`, () => {
    let sequence: ReturnType<typeof create>;
    let root: HTMLElement;
    let options: SequenceOptions;
    let media: EventTarget & { matches: boolean };
    const select = (selector: string) => root.querySelector<HTMLElement>(selector)!;
    const fire = (type: string) => root.dispatchEvent(new Event(type));
    const progress = (selector: string) => Number(select(selector).style.getPropertyValue("--sequence-progress"));
    beforeEach(() => {
      vi.useFakeTimers();
      vi.spyOn(document, "hidden", "get").mockReturnValue(false);
      media = Object.assign(new EventTarget(), { matches: false });
      vi.stubGlobal("matchMedia", () => media);
      root = document.createElement("section");
      root.innerHTML = '<button class="rotation"></button><div class="viewport"><article>A<button>Action A</button></article><article style="display:flex">B<button>Action B</button></article><article>C</article></div><button class="previous"></button><button class="picker"><span class="fill"></span></button><button class="picker"><span class="fill"></span></button><button class="picker"><span class="fill"></span></button><button class="next"><span class="ring"></span></button>';
      document.body.append(root);
      sequence = create({ labels: { start: "Start slide rotation", stop: "Stop slide rotation", item: "slide" }, parts: { viewport: ".viewport", previous: ".previous", next: ".next", rotation: ".rotation", picker: ".picker" }, progress: [{ selector: ".fill", effect: "elapsed-width", steps: 10 }, { selector: ".ring", effect: "elapsed-ring", steps: 10 }] });
      options = { index: 0, labels: ["A", "B", "C"], autoPlay: true, durationMs: 1000, onIndexChange: vi.fn() };
      sequence.bindRoot(root);
      sequence.sync(options);
    });
    afterEach(() => { sequence.destroy(); root.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

    it("shares the elapsed fraction and makes one request against an unacknowledged index", () => {
      vi.advanceTimersByTime(400);
      expect(progress(".fill")).toBeCloseTo(0.4, 1);
      expect(progress(".ring")).toBe(progress(".fill"));
      vi.advanceTimersByTime(600);
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
      vi.advanceTimersByTime(5000);
      sequence.sync(options);
      expect(options.onIndexChange).toHaveBeenCalledTimes(1);
      expect(progress(".ring")).toBe(1);
    });
    it("acknowledges index changes with a fresh budget and wraps at the end", () => {
      options.onIndexChange = vi.fn((index: number) => { options = { ...options, index }; sequence.sync(options); });
      sequence.sync(options);
      vi.advanceTimersByTime(1000);
      expect(options.index).toBe(1);
      expect(progress(".ring")).toBe(0);
      expect(select(".viewport").children[0].hasAttribute("hidden")).toBe(true);
      expect(select(".viewport").children[1].getAttribute("style")).toBe("display: flex;");
      vi.advanceTimersByTime(2000);
      expect(options.index).toBe(0);
      expect(options.onIndexChange).toHaveBeenCalledTimes(3);
    });
    it("stops on focus until explicit restart, retaining hover and document pauses", () => {
      vi.advanceTimersByTime(400);
      fire("pointerenter"); fire("focusin");
      vi.spyOn(document, "hidden", "get").mockReturnValue(true);
      document.dispatchEvent(new Event("visibilitychange"));
      fire("pointerleave"); fire("focusout");
      vi.spyOn(document, "hidden", "get").mockReturnValue(false);
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(2000);
      expect(sequence.snapshot().remainingMs).toBe(600);
      expect(select(".rotation").textContent).toBe("Start slide rotation");
      select(".rotation").click();
      vi.advanceTimersByTime(599);
      expect(options.onIndexChange).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    });
    it("does not resume a focus-stopped sequence when autoplay props toggle", () => {
      fire("focusin"); fire("focusout");
      sequence.sync({ ...options, autoPlay: false });
      sequence.sync({ ...options, autoPlay: true });
      vi.advanceTimersByTime(3000);
      expect(options.onIndexChange).not.toHaveBeenCalled();
      expect(select(".rotation").getAttribute("aria-label")).toBe("Start slide rotation");
      select(".rotation").click(); vi.advanceTimersByTime(1000);
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    });
    it("allows manual navigation with no timer and keeps inactive interactive content inert", () => {
      options = { ...options, autoPlay: false, durationMs: null };
      sequence.sync(options);
      select(".previous").click();
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(2);
      expect(select(".ring").hidden).toBe(true);
      const inactive = select(".viewport").children[1] as HTMLElement;
      expect(inactive.hidden).toBe(true);
      expect(inactive.inert).toBe(true);
      expect(inactive.style.getPropertyPriority("display")).toBe("important");
      expect(select(".viewport").getAttribute("aria-live")).toBe("polite");
      vi.advanceTimersByTime(5000);
      expect(options.onIndexChange).toHaveBeenCalledTimes(1);
    });
    it("steps both projections under reduced motion without altering the deadline", () => {
      vi.advanceTimersByTime(450);
      media.matches = true; media.dispatchEvent(new Event("change"));
      expect(progress(".ring")).toBe(0.4);
      expect(progress(".fill")).toBe(0.4);
      vi.advanceTimersByTime(549);
      expect(options.onIndexChange).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    });
    it("resets a changed duration without clearing hover or stopped rotation", () => {
      vi.advanceTimersByTime(400); fire("pointerenter"); fire("focusin");
      options = { ...options, durationMs: 2000 }; sequence.sync(options);
      select(".rotation").click();
      vi.advanceTimersByTime(3000);
      expect(sequence.snapshot().remainingMs).toBe(2000);
      fire("pointerleave"); vi.advanceTimersByTime(1999);
      expect(options.onIndexChange).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    });
    it("disables navigation and time when labels do not match composed children", () => {
      options = { ...options, labels: ["A"] }; sequence.sync(options);
      select(".next").click(); vi.advanceTimersByTime(5000);
      expect(options.onIndexChange).not.toHaveBeenCalled();
      expect((select(".next") as HTMLButtonElement).disabled).toBe(true);
      expect(select(".ring").hidden).toBe(true);
    });
    it("does not let nested sequence controls navigate the outer sequence", () => {
      const nested = document.createElement("div");
      nested.dataset.sequenceRoot = ""; nested.innerHTML = '<button class="next">Nested</button>';
      select(".viewport").children[0].append(nested);
      nested.querySelector("button")!.click();
      expect(options.onIndexChange).not.toHaveBeenCalled();
      (root.lastElementChild as HTMLElement).click();
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    });
    it("cleans clocks and reconnects without accumulating listeners", () => {
      sequence.destroy(); vi.advanceTimersByTime(2000);
      expect(options.onIndexChange).not.toHaveBeenCalled();
      sequence.sync(options); vi.advanceTimersByTime(1000);
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    });
  });
}
