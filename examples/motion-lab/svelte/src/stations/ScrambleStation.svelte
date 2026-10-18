<script lang="ts">
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { Button } from "@full-stack-ds/svelte";
  import { motionProperty, prefersReducedMotion, readMotionTokens, seconds } from "@motion/tokens.js";

  let section: HTMLElement;
  let readout = $state("resolving tokens…");

  const PHRASE = "TOKENS DRIVE MOTION";
  const chars = [...PHRASE];
  const POOL = "!<>-_\\/[]{}—=+*^?#";

  const describe = (): string => {
    const tokens = readMotionTokens();
    return (
      `per-char swap cadence motion.duration.short1 = ${tokens.durationMs("short1")}ms · ` +
      `per-char offset motion.stagger.xs = ${tokens.staggerMs("xs")}ms · ` +
      `settle easing ${tokens.rawValue(motionProperty.easing("standard"))}`
    );
  };

  function charSpans(): HTMLElement[] {
    return Array.from(section.querySelectorAll<HTMLElement>(".scramble-char"));
  }

  function settle(): void {
    for (const span of charSpans()) span.textContent = span.dataset.char ?? "";
  }

  /** Per-character symbol swap: the consumer fabricates stable-identity glyph
   * parts (one span per character, keyed by data-index/data-char) and lets the
   * timeline cycle them through a symbol pool before settling. */
  function play(): void {
    const tokens = readMotionTokens();
    const spans = charSpans();
    if (prefersReducedMotion()) {
      settle();
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
  }

  onMount(() => {
    readout = describe();
    const ctx = gsap.context(() => settle(), section);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => media.matches && settle();
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
      ctx.revert();
      settle();
    };
  });
</script>

<section class="station" bind:this={section}>
  <div class="station-header">
    <h2>3 · Scramble — per-character symbol swap</h2>
    <Button onClick={play}>Scramble</Button>
  </div>
  <p>
    A SplitText-style text effect from the consuming side: the lane splits its own label into
    per-character spans with stable identity (<code>data-index</code>/<code>data-char</code>) —
    never re-derived from glyph position — then cycles each through a symbol pool and settles.
    Under reduced motion the phrase is simply always settled.
  </p>
  <code class="token-readout">{readout}</code>
  <div class="stage">
    <span class="scramble" aria-label={PHRASE}>
      {#each chars as char, index (index)}
        {#if char === " "}
          <span class="scramble-char" data-char="&nbsp;" data-index={index}>&nbsp;</span>
        {:else}
          <span class="scramble-char" data-char={char} data-index={index}>{char}</span>
        {/if}
      {/each}
    </span>
  </div>
</section>
