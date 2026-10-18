import { html, nothing } from "lit";
import { gsap } from "gsap";
import {
  motionProperty,
  readMotionTokens,
  seconds,
} from "@motion/tokens.js";
import { MotionStationElement } from "./station-base.js";

/**
 * The DS loop writer is disabled through the component's own public prop
 * (animate="none"), so the consumer exclusively owns the opacity channel —
 * the substrate's adapter-takeover rule, from the consuming side.
 *
 * Lit boundary note: the skeleton's internal `.skeleton__shape` parts render
 * inside the component's open shadow root. This lane pulses the component
 * HOSTS (three single-line skeletons) rather than reaching through
 * `shadowRoot` — the cleaner boundary. Reaching an open shadow root is a
 * platform-standard option and is recorded as a lane finding in the README.
 */
export class PartTakeoverStationElement extends MotionStationElement {
  readout = "";

  private pulse: gsap.core.Tween | undefined;

  private describe(): string {
    const tokens = readMotionTokens();
    return (
      `pulse motion.duration.medium = ${tokens.durationMs("medium")}ms · ` +
      `motion.easing.continuous = ${tokens.rawValue(motionProperty.easing("continuous"))} · ` +
      `host stagger motion.stagger.md = ${tokens.staggerMs("md")}ms`
    );
  }

  protected sync(reduced: boolean): void {
    this.readout = this.describe();
    this.requestUpdate();
    this.pulse?.kill();
    this.pulse = undefined;
    const hosts = this.querySelectorAll<HTMLElement>('[data-fsds-component="skeleton"]');
    if (reduced || !hosts.length) {
      gsap.set(hosts, { clearProps: "all" });
      return;
    }
    const tokens = readMotionTokens();
    this.pulse = gsap.to(hosts, {
      opacity: 0.45,
      duration: seconds(tokens.durationMs("medium")),
      ease: tokens.ease("continuous"),
      yoyo: true,
      repeat: -1,
      stagger: seconds(tokens.staggerMs("md")),
      overwrite: true,
    });
  }

  render() {
    return html`
      <section class="station">
        <div class="station-header">
          <h2>4 · Part takeover — one channel, exclusively owned</h2>
        </div>
        <p>
          The Skeleton ships with its own shimmer loop; the lane switches it off through the
          public <code>animate="none"</code> prop and takes over: three single-line skeleton
          hosts pulse on token timing while the component internals stay untouched.
        </p>
        <code class="token-readout">${this.readout ?? nothing}</code>
        <div class="stage stage-column takeover-column">
          <fsds-skeleton class="takeover-line" .variant=${"text"} .lines=${1} .animate=${"none"}></fsds-skeleton>
          <fsds-skeleton class="takeover-line" .variant=${"text"} .lines=${1} .animate=${"none"}></fsds-skeleton>
          <fsds-skeleton class="takeover-line" .variant=${"text"} .lines=${1} .animate=${"none"}></fsds-skeleton>
        </div>
        <p class="footnote">
          Under reduced motion the takeover stops and the hosts rest at full opacity — one
          writer per property, and the reduced presentation is the component's own static
          skeleton.
        </p>
      </section>
    `;
  }
}

customElements.define("ml-part-takeover-station", PartTakeoverStationElement);
