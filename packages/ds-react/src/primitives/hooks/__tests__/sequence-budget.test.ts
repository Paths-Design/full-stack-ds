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
      sequence = create({ transition: { durationMs: 250, easing: "ease", referenceWidth: 320, minMultiplier: 0.5, maxMultiplier: 2 }, labels: { start: "Start slide rotation", stop: "Stop slide rotation", item: "slide" }, parts: { viewport: ".viewport", previous: ".previous", next: ".next", rotation: ".rotation", picker: ".picker" }, progress: [{ selector: ".fill", effect: "elapsed-width", steps: 10 }, { selector: ".ring", effect: "elapsed-ring", steps: 10 }] });
      options = { index: 0, labels: ["A", "B", "C"], autoPlay: true, durationMs: 1000, onIndexChange: vi.fn() };
      sequence.bindRoot(root);
      sequence.sync(options);
    });
    afterEach(() => { sequence.destroy(); root.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

    const holdMotion = () => {
      const animations: { finish: () => void; cancel: ReturnType<typeof vi.fn> }[] = [];
      for (const slide of Array.from(select(".viewport").children) as HTMLElement[]) {
        slide.animate = (() => {
          let finish!: () => void;
          const finished = new Promise<void>(resolve => { finish = resolve; });
          const cancel = vi.fn();
          animations.push({ finish, cancel });
          return { finished, cancel } as unknown as Animation;
        }) as HTMLElement["animate"];
      }
      return animations;
    };
    it("preserves Stop intent through pointerdown, focus and click, then allows explicit Start", () => {
      const rotation = select(".rotation");
      rotation.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
      rotation.focus();
      rotation.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      expect(rotation.textContent).toBe("Start slide rotation");
      vi.advanceTimersByTime(2000);
      expect(options.onIndexChange).not.toHaveBeenCalled();
      rotation.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
      rotation.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      expect(rotation.textContent).toBe("Stop slide rotation");
      vi.advanceTimersByTime(1000);
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    });
    it("does not carry abandoned pointer intent into keyboard activation", () => {
      const rotation = select(".rotation");
      rotation.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
      rotation.focus();
      rotation.click(); // Keyboard and assistive activation has no pointer click count.
      expect(rotation.textContent).toBe("Stop slide rotation");
      vi.advanceTimersByTime(1000);
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    });
    it("releases outgoing content before a new owner takes control", async () => {
      const animations = holdMotion();
      const outgoing = select(".viewport").children[0] as HTMLElement;
      sequence.sync({ ...options, index: 1 });
      const releasedAnimations = [...animations];
      expect(releasedAnimations).toHaveLength(2);
      const owner = document.createElement("aside");
      root.append(owner);
      owner.append(outgoing);
      await Promise.resolve(); // Observe the actual consumer removal.
      for (const animation of releasedAnimations) expect(animation.cancel).toHaveBeenCalledOnce();
      expect(outgoing.hidden).toBe(false);
      expect(outgoing.style.display).toBe("");
      expect(outgoing.getAttribute("aria-hidden")).toBeNull();
      expect(outgoing.style.position).toBe("");
      outgoing.style.display = "grid";
      outgoing.setAttribute("aria-label", "New owner");
      animations.forEach(animation => animation.finish());
      await Promise.resolve(); await Promise.resolve();
      sequence.sync({ ...options, index: 1, labels: ["B", "C"] });
      expect(outgoing.hidden).toBe(false);
      expect(outgoing.style.display).toBe("grid");
      expect(outgoing.getAttribute("aria-label")).toBe("New owner");
    });
    it.each(["composition", "duration"])("keeps reading time paused through %s changes during movement", async change => {
      const animations = holdMotion();
      options = { ...options, index: 1 };
      sequence.sync(options);
      if (change === "composition") sequence.sync({ ...options, labels: [] });
      else options = { ...options, durationMs: 2000 };
      sequence.sync(options);
      const duration = options.durationMs!;
      vi.advanceTimersByTime(500);
      expect(sequence.snapshot().paused).toBe(true);
      expect(sequence.snapshot().remainingMs).toBe(duration);
      animations.forEach(animation => animation.finish());
      await Promise.resolve(); await Promise.resolve();
      vi.advanceTimersByTime(duration - 1);
      expect(options.onIndexChange).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(2);
    });

    it.each(["contents", "inline"])("owns a transformable %s boundary without reparenting consumer content", display => {
      sequence.destroy();
      const slide = select(".viewport").children[0] as HTMLElement;
      const child = slide.firstElementChild;
      slide.style.setProperty("display", display, "important");
      sequence.sync(options);
      expect(slide.style.display).toBe("flow-root");
      expect(slide.parentElement).toBe(select(".viewport"));
      expect(slide.firstElementChild).toBe(child);
      const animations = holdMotion();
      sequence.sync({ ...options, index: 1 });
      expect(animations).toHaveLength(2);
      expect(slide.style.display).toBe("flow-root");
      sequence.destroy();
      expect(slide.style.display).toBe(display);
      expect(slide.style.getPropertyPriority("display")).toBe("important");
      expect(slide.parentElement).toBe(select(".viewport"));
    });
    it("retains the display of an already transformable inline image", () => {
      sequence.destroy();
      const image = document.createElement("img");
      image.style.display = "inline";
      select(".viewport").children[0].replaceWith(image);
      sequence.sync(options);
      expect(image.style.display).toBe("inline");
      sequence.destroy();
      expect(image.style.display).toBe("inline");
    });
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
      expect(select(".rotation").hidden).toBe(true);
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
    it("slides in the requested direction and gives the new content a full budget after movement", async () => {
      const animations: { frames: Keyframe[]; duration: number; finish: () => void; cancel: ReturnType<typeof vi.fn> }[] = [];
      vi.spyOn(select(".viewport"), "getBoundingClientRect").mockReturnValue({ width: 1280 } as DOMRect);
      for (const slide of Array.from(select(".viewport").children) as HTMLElement[]) {
        slide.animate = ((frames: Keyframe[], timing: KeyframeAnimationOptions) => {
          let finish!: () => void;
          const finished = new Promise<void>(resolve => { finish = resolve; });
          const cancel = vi.fn();
          animations.push({ frames, duration: Number(timing.duration), finish, cancel });
          return { finished, cancel } as unknown as Animation;
        }) as HTMLElement["animate"];
      }
      options.onIndexChange = (index) => { options = { ...options, index }; sequence.sync(options); };
      sequence.sync(options);
      select(".previous").click();
      expect(options.index).toBe(2);
      expect(animations[0].frames[1].transform).toBe("translateX(100%)");
      expect(animations[1].frames[0].transform).toBe("translateX(-100%)");
      expect(animations[0].duration).toBe(500);
      expect(select(".viewport").children[0].getAttribute("aria-hidden")).toBe("true");
      expect((select(".viewport").children[0] as HTMLElement).hidden).toBe(false);
      vi.advanceTimersByTime(2000);
      expect(options.index).toBe(2);
      expect(sequence.snapshot().remainingMs).toBe(1000);
      animations.forEach(animation => animation.finish());
      await Promise.resolve(); await Promise.resolve();
      expect((select(".viewport").children[0] as HTMLElement).hidden).toBe(true);
      vi.advanceTimersByTime(999);
      expect(options.index).toBe(2);
      vi.advanceTimersByTime(1);
      expect(options.index).toBe(0);
      expect(animations[2].frames[1].transform).toBe("translateX(-100%)");
      expect(animations[3].frames[0].transform).toBe("translateX(100%)");
      media.matches = true; media.dispatchEvent(new Event("change"));
      expect(animations[2].cancel).toHaveBeenCalled();
      expect((select(".viewport").children[2] as HTMLElement).hidden).toBe(true);
    });
    it("returns consumer styles and semantics before reconnecting slide elements", () => {
      const second = select(".viewport").children[1] as HTMLElement;
      expect(second.style.display).toBe("none");
      sequence.destroy();
      expect(second.style.display).toBe("flex");
      expect(second.hidden).toBe(false);
      expect(second.inert).toBeFalsy();
      expect(second.getAttribute("aria-roledescription")).toBeNull();
      sequence.sync({ ...options, index: 1 });
      expect(second.hidden).toBe(false);
      expect(second.style.display).toBe("flex");
      expect(second.getAttribute("aria-label")).toBe("B");
    });
    it("cleans clocks and reconnects without accumulating listeners", () => {
      sequence.destroy(); vi.advanceTimersByTime(2000);
      expect(options.onIndexChange).not.toHaveBeenCalled();
      sequence.sync(options); vi.advanceTimersByTime(1000);
      expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    });
  });
}
