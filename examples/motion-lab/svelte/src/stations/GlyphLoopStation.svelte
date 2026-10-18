<script lang="ts">
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { Button, Icon } from "@full-stack-ds/svelte";
  import { motionProperty, prefersReducedMotion, readMotionTokens, seconds } from "@motion/tokens.js";

  let section: HTMLElement;
  let readout = $state("resolving tokens…");

  const describe = (): string => {
    const tokens = readMotionTokens();
    return (
      `loop motion.duration.medium1 = ${tokens.durationMs("medium1")}ms · ` +
      `loop easing ${tokens.rawValue(motionProperty.easing("linear"))} · ` +
      `path reveal motion.duration.short3 = ${tokens.durationMs("short3")}ms · ` +
      `path stagger motion.stagger.sm = ${tokens.staggerMs("sm")}ms`
    );
  };

  let spin: gsap.core.Tween | undefined;

  function paths(): HTMLElement[] {
    const svg = section.querySelectorAll<HTMLElement>('[data-fsds-component="icon"] svg')[1];
    if (!svg) throw new Error("glyph station: multi-path icon svg not found");
    return Array.from(svg.querySelectorAll<HTMLElement>("path"));
  }

  function revealPaths(): void {
    const els = paths();
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
  }

  function sync(reduced: boolean): void {
    spin?.kill();
    spin = undefined;
    const loopSvg = section.querySelectorAll<HTMLElement>('[data-fsds-component="icon"] svg')[0];
    if (!loopSvg) throw new Error("glyph station: loop icon svg not found");
    if (reduced) {
      gsap.set(loopSvg, { clearProps: "all" });
      gsap.set(paths(), { clearProps: "all" });
      return;
    }
    const tokens = readMotionTokens();
    spin = gsap.to(loopSvg, {
      rotation: 360,
      duration: seconds(tokens.durationMs("medium1")),
      ease: tokens.ease("linear"),
      repeat: -1,
      overwrite: true,
    });
  }

  onMount(() => {
    readout = describe();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ctx = gsap.context(() => sync(media.matches), section);
    const onChange = () => sync(media.matches);
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
      ctx.revert();
      spin?.kill();
    };
  });
</script>

<section class="station" bind:this={section}>
  <div class="station-header">
    <h2>5 · Glyphs — whole SVG loop, per-path reveal</h2>
    <Button onClick={revealPaths}>Reveal paths</Button>
  </div>
  <p>
    Left: a whole FSDS Icon glyph rotates forever on the token graph's linear easing at
    <code>motion.duration.medium1</code>. Right: a multi-path icon reveals its individual
    <code>&lt;path&gt;</code> elements with a token-staggered fade+scale.
  </p>
  <code class="token-readout">{readout}</code>
  <div class="stage glyph-stage">
    <figure class="glyph-figure">
      <Icon name="arrow-up-down" size="lg" />
      <figcaption>whole-glyph loop</figcaption>
    </figure>
    <figure class="glyph-figure">
      <Icon name="circle-dot" size="lg" />
      <figcaption>per-path staggered reveal</figcaption>
    </figure>
  </div>
  <p class="footnote">
    Boundary note: FSDS iconography does not export semantic part identities for icon internals,
    so the per-path reveal captures the path list once at setup and addresses it as a stable
    snapshot. If icon internals ever gain named parts, this lane should bind to those instead.
  </p>
</section>
