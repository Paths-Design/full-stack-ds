import { html, nothing } from "lit";
import { gsap } from "gsap";
import {
  motionProperty,
  prefersReducedMotion,
  readMotionTokens,
  seconds,
} from "@motion/tokens.js";
import { MotionStationElement } from "./station-base.js";

const PHRASE = "TOKENS DRIVE MOTION";
const CHARS = [...PHRASE];
const POOL = "!<>-_\\/[]{}—=+*^?#";

export class ScrambleStationElement extends MotionStationElement {
  readout = "";

  private describe(): string {
    const tokens = readMotionTokens();
    return (
      `per-char swap cadence motion.duration.short1 = ${tokens.durationMs("short1")}ms · ` +
      `per-char offset motion.stagger.xs = ${tokens.staggerMs("xs")}ms · ` +
      `settle easing ${tokens.rawValue(motionProperty.easing("standard"))}`
    );
  }

  private spans(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>(".scramble-char"));
  }

  private settle(): void {
    for (const span of this.spans()) span.textContent = span.dataset.char ?? "";
  }

  /** Per-character symbol swap: the consumer fabricates stable-identity glyph
   * parts (one span per character, keyed by data-index/data-char) and lets
   * the timeline cycle them through a symbol pool before settling. */
  play = (): void => {
    const tokens = readMotionTokens();
    const spans = this.spans();
    if (prefersReducedMotion()) {
      this.settle();
      return;
    }
    const timeline = gsap.timeline({ overwrite: true, defaults: { ease: "none" } });
    for (const [index, span] of spans.entries()) {
      const state = { n: 0 };
      timeline.to(
        state,
        {
          duration: seconds(tokens.durationMs("short1")),
          repeat: 3,
          onUpdate: () => {
            span.textContent = POOL[Math.floor(Math.random() * POOL.length)];
          },
          onComplete: () => {
            span.textContent = span.dataset.char ?? "";
          },
        },
        seconds(index * tokens.staggerMs("xs")),
      );
    }
  };

  protected sync(reduced: boolean): void {
    this.readout = this.describe();
    this.requestUpdate();
    if (reduced) this.settle();
  }

  render() {
    return html`
      <section class="station">
        <div class="station-header">
          <h2>3 · Scramble — per-character symbol swap</h2>
          <fsds-button .onClick=${this.play}>Scramble</fsds-button>
        </div>
        <p>
          A SplitText-style text effect from the consuming side: the lane splits its own label
          into per-character spans with stable identity
          (<code>data-index</code>/<code>data-char</code>) — never re-derived from glyph
          position — then cycles each through a symbol pool and settles. Under reduced motion
          the phrase is simply always settled.
        </p>
        <code class="token-readout">${this.readout ?? nothing}</code>
        <div class="stage">
          <span class="scramble" aria-label=${PHRASE}>
            ${CHARS.map(
              (char, index) =>
                html`<span
                  class="scramble-char"
                  data-char=${char === " " ? "\u00a0" : char}
                  data-index=${index}
                  >${char === " " ? html`&nbsp;` : char}</span
                >`,
            )}
          </span>
        </div>
      </section>
    `;
  }
}

customElements.define("ml-scramble-station", ScrambleStationElement);
