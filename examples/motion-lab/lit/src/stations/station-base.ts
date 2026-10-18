import { LitElement } from "lit";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@motion/tokens.js";

/**
 * Light-DOM station base for the Lit lane. Lane chrome (app.css) styles the
 * station shell; the FSDS elements keep their own shadow styles. Each
 * station implements `sync(reduced)` — its full presentation for a
 * preference state — and receives a scoped gsap context that is reverted on
 * disconnect. `play()` entry points re-check the preference themselves so a
 * replay under reduce settles instantly instead of animating.
 */
export abstract class MotionStationElement extends LitElement {
  private context: gsap.Context | null = null;
  private media: MediaQueryList | null = null;

  createRenderRoot(): HTMLElement {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.media = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.media.addEventListener("change", this.onPreference);
  }

  disconnectedCallback(): void {
    this.media?.removeEventListener("change", this.onPreference);
    this.context?.revert();
    this.context = null;
    super.disconnectedCallback();
  }

  protected firstUpdated(): void {
    this.context = gsap.context(() => {
      this.sync(prefersReducedMotion());
    }, this);
  }

  /** Re-present the whole station for a reduced-motion state. */
  protected abstract sync(reduced: boolean): void;

  private onPreference = (): void => {
    this.sync(this.media?.matches ?? false);
  };
}
