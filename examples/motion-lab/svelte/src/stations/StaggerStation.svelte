<script lang="ts">
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { Badge, Button } from "@full-stack-ds/svelte";
  import { motionProperty, prefersReducedMotion, readMotionTokens, seconds } from "@motion/tokens.js";

  let section: HTMLElement;
  let readout = $state("resolving tokens…");

  const intents = ["info", "success", "warning", "danger", "info", "success"] as const;

  const describe = (): string => {
    const tokens = readMotionTokens();
    return (
      `motion.duration.short2 = ${tokens.durationMs("short2")}ms · ` +
      `motion.easing.quick-enter = ${tokens.rawValue(motionProperty.easing("quick-enter"))} · ` +
      `motion.stagger.sm = ${tokens.staggerMs("sm")}ms`
    );
  };

  function play(): void {
    const tokens = readMotionTokens();
    const items = section.querySelectorAll<HTMLElement>('[data-fsds-component="badge"]');
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
  }

  onMount(() => {
    readout = describe();
    const ctx = gsap.context(() => play(), section);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      if (!media.matches) return;
      const items = section.querySelectorAll<HTMLElement>('[data-fsds-component="badge"]');
      if (items.length) gsap.set(items, { clearProps: "all" });
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
    <h2>2 · Stagger — repeated instances</h2>
    <Button onClick={play}>Replay</Button>
  </div>
  <p>
    Six badges reveal with GSAP's stagger option. The per-item interval is the token graph's
    <code>motion.stagger.sm</code>, converted to seconds — repeated parts keep stable DOM order,
    so the stagger attaches to identity, not to coincidence.
  </p>
  <code class="token-readout">{readout}</code>
  <div class="stage stage-row">
    {#each intents as intent, i (i)}
      <Badge intent={intent}>item {i + 1}</Badge>
    {/each}
  </div>
</section>
