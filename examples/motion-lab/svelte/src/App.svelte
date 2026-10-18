<script lang="ts">
  import { onMount } from "svelte";
  import { prefersReducedMotion } from "@motion/tokens.js";

  import EntranceStation from "./stations/EntranceStation.svelte";
  import StaggerStation from "./stations/StaggerStation.svelte";
  import ScrambleStation from "./stations/ScrambleStation.svelte";
  import PartTakeoverStation from "./stations/PartTakeoverStation.svelte";
  import GlyphLoopStation from "./stations/GlyphLoopStation.svelte";

  let reducedMotion = $state(prefersReducedMotion());

  onMount(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => (reducedMotion = media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  });
</script>

<div class="app">
  <header class="app-header">
    <h1>FSDS Motion Lab</h1>
    <span class="pref-chip" data-on={reducedMotion}>
      prefers-reduced-motion: {reducedMotion ? "reduce" : "no-preference"}
    </span>
  </header>
  <p class="app-intro">
    A consumer-side proof: every effect on this page is driven by GSAP against FSDS public
    exports, and every duration, easing curve, and stagger interval is read at runtime from the
    <code>--fsds-core-motion-*</code> custom properties that
    <code>@full-stack-ds/tokens/tokens.css</code> lowers onto the root — nothing is hardcoded in
    this lane. Each station names the tokens it resolved. Components are addressed only through
    their public DOM surface (<code>data-fsds-component</code> markers and part classes).
  </p>

  <EntranceStation />
  <StaggerStation />
  <ScrambleStation />
  <PartTakeoverStation />
  <GlyphLoopStation />
</div>
