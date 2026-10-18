import { LitElement, html } from "lit";
import { prefersReducedMotion } from "@motion/tokens.js";

export class MotionLabAppElement extends LitElement {
  private reduced = false;

  private media: MediaQueryList | null = null;

  createRenderRoot(): HTMLElement {
    // Light DOM: lane chrome (app.css) styles the app shell; the FSDS
    // elements keep their own shadow-scoped styles.
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.reduced = prefersReducedMotion();
    this.media = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.media.addEventListener("change", this.onPreference);
  }

  disconnectedCallback(): void {
    this.media?.removeEventListener("change", this.onPreference);
    super.disconnectedCallback();
  }

  private onPreference = (): void => {
    this.reduced = this.media?.matches ?? false;
  };

  render() {
    return html`
      <div class="app">
        <header class="app-header">
          <h1>FSDS Motion Lab</h1>
          <span class="pref-chip" data-on=${this.reduced ? "true" : "false"}>
            prefers-reduced-motion: ${this.reduced ? "reduce" : "no-preference"}
          </span>
        </header>
        <p class="app-intro">
          A consumer-side proof: every effect on this page is driven by GSAP against FSDS public
          exports, and every duration, easing curve, and stagger interval is read at runtime from
          the <code>--fsds-core-motion-*</code> custom properties that
          <code>@full-stack-ds/tokens/tokens.css</code> lowers onto the root — nothing is
          hardcoded in this lane. Each station names the tokens it resolved. Components are
          addressed only through their public DOM surface (host elements,
          <code>data-fsds-component</code> markers, and open shadow roots).
        </p>
        <ml-entrance-station></ml-entrance-station>
        <ml-stagger-station></ml-stagger-station>
        <ml-scramble-station></ml-scramble-station>
        <ml-part-takeover-station></ml-part-takeover-station>
        <ml-glyph-loop-station></ml-glyph-loop-station>
      </div>
    `;
  }
}

customElements.define("ml-app", MotionLabAppElement);
