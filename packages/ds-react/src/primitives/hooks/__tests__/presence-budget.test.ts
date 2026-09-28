import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPresenceBudget as react } from "../../presence-budget";
import { createPresenceBudget as vue } from "../../../../../ds-vue/src/primitives/presence-budget";
import { createPresenceBudget as svelte } from "../../../../../ds-svelte/src/primitives/presence-budget";
import { createPresenceBudget as angular } from "../../../../../ds-angular/src/primitives/presence-budget";
import { createPresenceBudget as lit } from "../../../../../ds-lit/src/primitives/presence-budget";

for (const [name, create] of Object.entries({ react, vue, svelte, angular, lit })) {
  describe(`${name} presence budget`, () => {
    let budget: ReturnType<typeof create>;
    let dismiss: ReturnType<typeof vi.fn>;
    let bar: HTMLDivElement;
    let media: EventTarget & { matches: boolean };
    beforeEach(() => {
      vi.useFakeTimers();
      vi.spyOn(document, "hidden", "get").mockReturnValue(false);
      media = Object.assign(new EventTarget(), { matches: false });
      vi.stubGlobal("matchMedia", () => media);
      dismiss = vi.fn();
      budget = create(dismiss, 10);
      bar = document.createElement("div");
      budget.bindProgress(bar);
    });
    afterEach(() => {
      budget.destroy();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });
    const fraction = () => Number(bar.style.transform.slice(7, -1));

    it("projects active time and reaches zero at the single dismissal deadline", () => {
      budget.sync(true, 1000);
      expect(bar.hidden).toBe(false);
      vi.advanceTimersByTime(400);
      expect(fraction()).toBeCloseTo(0.6, 1);
      expect(budget.snapshot().remainingMs).toBe(600);
      vi.advanceTimersByTime(599);
      expect(dismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fraction()).toBe(0);
      expect(dismiss).toHaveBeenCalledTimes(1);
      budget.sync(true, 1000);
      vi.advanceTimersByTime(10000);
      expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it("composes hover, focus and hidden-document pauses without granting fresh time", () => {
      budget.sync(true, 1000);
      vi.advanceTimersByTime(400);
      budget.pause("hover");
      budget.pause("focus");
      vi.spyOn(document, "hidden", "get").mockReturnValue(true);
      document.dispatchEvent(new Event("visibilitychange"));
      budget.resume("hover");
      budget.resume("focus");
      vi.advanceTimersByTime(10000);
      expect(budget.snapshot().remainingMs).toBe(600);
      expect(fraction()).toBe(0.6);
      expect(dismiss).not.toHaveBeenCalled();
      vi.spyOn(document, "hidden", "get").mockReturnValue(false);
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(599);
      expect(dismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it("keeps focus pause while focus moves within the owner", () => {
      const owner = document.createElement("div");
      const child = owner.appendChild(document.createElement("button"));
      budget.sync(true, 1000);
      budget.pause("focus");
      budget.focusOut({ currentTarget: owner, relatedTarget: child });
      vi.advanceTimersByTime(2000);
      expect(dismiss).not.toHaveBeenCalled();
      budget.focusOut({ currentTarget: owner, relatedTarget: null });
      vi.advanceTimersByTime(1000);
      expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it("resets changed budgets preserving pause reasons and resets on reopen", () => {
      budget.sync(true, 1000);
      vi.advanceTimersByTime(300);
      budget.pause("hover");
      budget.sync(true, 2000);
      vi.advanceTimersByTime(4000);
      expect(budget.snapshot().remainingMs).toBe(2000);
      budget.resume("hover");
      vi.advanceTimersByTime(1999);
      expect(dismiss).not.toHaveBeenCalled();
      budget.sync(false, 2000);
      expect(bar.hidden).toBe(true);
      budget.sync(true, 2000);
      vi.advanceTimersByTime(1999);
      expect(dismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it.each([null, undefined, 0, -1, NaN, Infinity])("disables invalid budget %s", (duration) => {
      budget.sync(true, 1000);
      budget.pause();
      budget.sync(true, duration);
      budget.resume();
      vi.advanceTimersByTime(60000);
      expect(bar.hidden).toBe(true);
      expect(dismiss).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("changes only presentation when reduced motion toggles", () => {
      budget.sync(true, 1000);
      vi.advanceTimersByTime(450);
      media.matches = true;
      media.dispatchEvent(new Event("change"));
      expect(fraction()).toBe(0.6);
      vi.advanceTimersByTime(40);
      expect(fraction()).toBe(0.6);
      media.matches = false;
      media.dispatchEvent(new Event("change"));
      expect(fraction()).toBeCloseTo(0.51, 2);
      vi.advanceTimersByTime(510);
      expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it("detaches projection without stopping the budget and destroys scheduling", () => {
      budget.sync(true, 1000);
      budget.bindProgress(null);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(1000);
      expect(dismiss).toHaveBeenCalledTimes(1);
      budget.sync(true, 2000);
      budget.bindProgress(bar);
      budget.destroy();
      document.dispatchEvent(new Event("visibilitychange"));
      media.dispatchEvent(new Event("change"));
      budget.resume();
      vi.advanceTimersByTime(10000);
      expect(dismiss).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });
  });
}
