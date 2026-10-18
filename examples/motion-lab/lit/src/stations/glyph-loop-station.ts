import { html, nothing } from "lit";
import { gsap } from "gsap";
import {
  motionProperty,
  prefersReducedMotion,
  readMotionTokens,
  seconds,
} from "@motion/tokens.js";
import { MotionStationElement } from "./station-base.js";

export class GlyphLoopStationElement extends MotionStationElement {
  readout = "";

  private spin: gsap.core.Tween | undefined;

  private describe(): string {
    const tokens = readMotionTokens();
    return (
      `loop motion.duration.medium1 = ${tokens.durationMs("medium1")}ms · ` +
      `loop easing ${tokens.rawValue(motionProperty.easing("linear"))} · ` +
      `path reveal motion.duration.short3 = ${tokens.durationMs("short3")}ms · ` +
      `path stagger motion.stagger.sm = ${tokens.staggerMs("sm")}ms`
    );
  }

  private icons(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>('[data-fsds-component="icon"]'));
  }

  private paths(): HTMLElement[] {
    // The multi-path icon is the second figure. Its <svg> renders inside the
    // icon element's open shadow root; the lane snapshots the path list once
    // per interaction (stable DOM order, captured — not re-derived mid-flight).
    const svg = this.icons()[1]?.shadowRoot?.querySelector("svg");
    if (!svg) throw new Error("glyph station: multi-path icon svg not found in open shadow root");
    return Array.from(svg.querySelectorAll<HTMLElement>("path"));
  }

  revealPaths = (): void => {
    const els = this.paths();
    if (prefersReducedMotion()) {
      gsap.set(els, { clearProps: "all" });
      return;
    }
    const tokens = readMotionTokens();
    gsap.fromTo(
      els,
      { opacity: 0, scale: 0.55, transformOrigin: "center" },
      {
        opacity: 1,
        scale: 1,
        duration: seconds(tokens.durationMs("short3")),
        ease: tokens.ease("soft-enter"),
        stagger: seconds(tokens.staggerMs("sm")),
        overwrite: true,
      },
    );
  };

  protected sync(reduced: boolean): void {
    this.readout = this.describe();
    this.requestUpdate();
    this.spin?.kill();
    this.spin = undefined;
    const loopHost = this.icons()[0];
    if (!loopHost) return;
    if (reduced) {
      gsap.set(loopHost, { clearProps: "all" });
      return;
    }
    const tokens = readMotionTokens();
    this.spin = gsap.to(loopHost, {
      rotation: 360,
      duration: seconds(tokens.durationMs("medium1")),
      ease: tokens.ease("linear"),
      repeat: -1,
      overwrite: true,
    });
  }

  render() {
    return html`
      <section class="station">
        <div class="station-header">
          <h2>5 · Glyphs — whole SVG loop, per-path reveal</h2>
          <fsds-button .onClick=${this.revealPaths}>Reveal paths</fsds-button>
        </div>
        <p>
          Left: a whole FSDS Icon host rotates forever on the token graph's linear easing at
          <code>motion.duration.medium1</code> (host rotation carries the shadow-rendered
          glyph). Right: a multi-path icon reveals its individual
          <code>&lt;path&gt;</code> elements with a token-staggered fade+scale, addressed
          through the icon's open shadow root.
        </p>
        <code class="token-readout">${this.readout ?? nothing}</code>
        <div class="stage glyph-stage">
          <figure class="glyph-figure">
            <fsds-icon .name=${"arrow-up-down"} .size=${"lg"}></fsds-icon>
            <figcaption>whole-glyph loop</figcaption>
          </figure>
          <figure class="glyph-figure">
            <fsds-icon .name=${"circle-dot"} .size=${"lg"}></fsds-icon>
            <figcaption>per-path staggered reveal</figcaption>
          </figure>
        </div>
        <p class="footnote">
          Boundary note: FSDS iconography does not export semantic part identities for icon
          internals, so the per-path reveal captures the path list as a stable snapshot. If
          icon internals ever gain named parts, this lane should bind to those instead.
        </p>
      </section>
    `;
  }
}

customElements.define("ml-glyph-loop-station", GlyphLoopStationElement);
