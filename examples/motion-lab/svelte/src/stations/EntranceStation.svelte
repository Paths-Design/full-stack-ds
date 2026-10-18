<script lang="ts">
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { Button, Card, CardContent, CardHeader } from "@full-stack-ds/svelte";
  import { motionProperty, prefersReducedMotion, readMotionTokens, seconds } from "@motion/tokens.js";

  let section: HTMLElement;
  let readout = $state("resolving tokens…");

  const describe = (): string => {
    const tokens = readMotionTokens();
    return (
      `motion.duration.medium2 = ${tokens.durationMs("medium2")}ms · ` +
      `motion.easing.soft-enter = ${tokens.rawValue(motionProperty.easing("soft-enter"))}`
    );
  };

  function play(): void {
    const tokens = readMotionTokens();
    const card = section.querySelector<HTMLElement>('[data-fsds-component="card"]');
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
  }

  onMount(() => {
    readout = describe();
    const ctx = gsap.context(() => play(), section);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      if (!media.matches) return;
      const card = section.querySelector<HTMLElement>('[data-fsds-component="card"]');
      if (card) gsap.set(card, { clearProps: "all" });
    };
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
      ctx.revert();
    };
  });
</script>

<section class="station" bind:this={section}>
  <div class="station-header">
    <h2>1 · Entrance — whole component</h2>
    <Button onClick={play}>Replay</Button>
  </div>
  <p>
    An FSDS Card composes in with opacity + rise + scale. GSAP receives the token-resolved
    duration and a cubic-bézier ease function parsed from the token graph.
  </p>
  <code class="token-readout">{readout}</code>
  <div class="stage">
    <Card>
      <CardHeader>Token-driven entrance</CardHeader>
      <CardContent>
        The card element itself is the animation target, addressed by its public
        <code>data-fsds-component="card"</code> marker.
      </CardContent>
    </Card>
  </div>
</section>
