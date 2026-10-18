import { html, nothing } from "lit";
import { gsap } from "gsap";
import {
  motionProperty,
  prefersReducedMotion,
  readMotionTokens,
  seconds,
} from "@motion/tokens.js";
import { MotionStationElement } from "./station-base.js";

const INTENTS = ["info", "success", "warning", "danger", "info", "success"] as const;

export class StaggerStationElement extends MotionStationElement {
  readout = "";

  private describe(): string {
    const tokens = readMotionTokens();
    return (
      `motion.duration.short2 = ${tokens.durationMs("short2")}ms · ` +
      `motion.easing.quick-enter = ${tokens.rawValue(motionProperty.easing("quick-enter"))} · ` +
      `motion.stagger.sm = ${tokens.staggerMs("sm")}ms`
    );
  }

  play = (): void => {
    const tokens = readMotionTokens();
    const items = this.querySelectorAll<HTMLElement>('[data-fsds-component="badge"]');
    if (prefersReducedMotion()) {
      gsap.set(items, { clearProps: "all" });
      return;
    }
    gsap.fromTo(
      items,
      { opacity: 0, y: 14, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: seconds(tokens.durationMs("short2")),
        ease: tokens.ease("quick-enter"),
        stagger: seconds(tokens.staggerMs("sm")),
        overwrite: true,
      },
    );
  };

  protected sync(reduced: boolean): void {
    this.readout = this.describe();
    this.requestUpdate();
    const items = this.querySelectorAll<HTMLElement>('[data-fsds-component="badge"]');
    if (reduced) {
      gsap.set(items, { clearProps: "all" });
      return;
    }
    this.play();
  }

  render() {
    return html`
      <section class="station">
        <div class="station-header">
          <h2>2 · Stagger — repeated instances</h2>
          <fsds-button .onClick=${this.play}>Replay</fsds-button>
        </div>
        <p>
          Six badges reveal with GSAP's stagger option. The per-item interval is the token
          graph's <code>motion.stagger.sm</code>, converted to seconds — repeated parts keep
          stable DOM order, so the stagger attaches to identity, not to coincidence.
        </p>
        <code class="token-readout">${this.readout ?? nothing}</code>
        <div class="stage stage-row">
          ${INTENTS.map(
            (intent, index) =>
              html`<fsds-badge .intent=${intent} .variant=${"status"}>item ${index + 1}</fsds-badge>`,
          )}
        </div>
      </section>
    `;
  }
}

customElements.define("ml-stagger-station", StaggerStationElement);
