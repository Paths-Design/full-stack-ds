import { html, nothing } from "lit";
import { gsap } from "gsap";
import {
  motionProperty,
  prefersReducedMotion,
  readMotionTokens,
  seconds,
} from "@motion/tokens.js";
import { MotionStationElement } from "./station-base.js";

export class EntranceStationElement extends MotionStationElement {
  readout = "";

  private card(): HTMLElement | null {
    return this.querySelector('[data-fsds-component="card"]');
  }

  private describe(): string {
    const tokens = readMotionTokens();
    return (
      `motion.duration.medium2 = ${tokens.durationMs("medium2")}ms · ` +
      `motion.easing.soft-enter = ${tokens.rawValue(motionProperty.easing("soft-enter"))}`
    );
  }

  play = (): void => {
    const tokens = readMotionTokens();
    const card = this.card();
    if (!card) throw new Error("entrance station: card not found by its public marker");
    if (prefersReducedMotion()) {
      gsap.set(card, { clearProps: "all" });
      return;
    }
    gsap.fromTo(
      card,
      { opacity: 0, y: 24, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: seconds(tokens.durationMs("medium2")),
        ease: tokens.ease("soft-enter"),
        overwrite: true,
      },
    );
  };

  protected sync(reduced: boolean): void {
    this.readout = this.describe();
    this.requestUpdate();
    const card = this.card();
    if (!card) return;
    if (reduced) {
      gsap.set(card, { clearProps: "all" });
      return;
    }
    this.play();
  }

  render() {
    return html`
      <section class="station">
        <div class="station-header">
          <h2>1 · Entrance — whole component</h2>
          <fsds-button .onClick=${this.play}>Replay</fsds-button>
        </div>
        <p>
          An FSDS Card composes in with opacity + rise + scale. GSAP receives the token-resolved
          duration and a cubic-bézier ease function parsed from the token graph. The card host
          element itself is the target, found by its public marker.
        </p>
        <code class="token-readout">${this.readout ?? nothing}</code>
        <div class="stage">
          <fsds-card>
            <fsds-card-header>Token-driven entrance</fsds-card-header>
            <fsds-card-content>
              Under Lit the card keeps its own shadow styles; the consumer animates the host
              element from outside the shadow boundary.
            </fsds-card-content>
          </fsds-card>
        </div>
      </section>
    `;
  }
}

customElements.define("ml-entrance-station", EntranceStationElement);
