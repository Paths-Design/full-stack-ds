<script lang="ts">
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { Skeleton } from "@full-stack-ds/svelte";
  import { motionProperty, readMotionTokens, seconds } from "@motion/tokens.js";

  let section: HTMLElement;
  let readout = $state("resolving tokens…");

  const describe = (): string => {
    const tokens = readMotionTokens();
    return (
      `pulse motion.duration.medium = ${tokens.durationMs("medium")}ms · ` +
      `motion.easing.continuous = ${tokens.rawValue(motionProperty.easing("continuous"))} · ` +
      `shape stagger motion.stagger.md = ${tokens.staggerMs("md")}ms`
    );
  };

  let pulse: gsap.core.Tween | undefined;

  /** The DS loop writer is disabled by the component's own public prop
   * (animate="none"), so the consumer exclusively owns the opacity channel on
   * the shape parts — the substrate's adapter-takeover rule, from the
   * consuming side. Under reduced motion the skeleton is simply static,
   * which is the DS's own reduced presentation for loops. */
  function sync(reduced: boolean): void {
    pulse?.kill();
    pulse = undefined;
    const shapes = section.querySelectorAll<HTMLElement>(".skeleton__shape");
    if (reduced || !shapes.length) {
      gsap.set(shapes, { clearProps: "all" });
      return;
    }
    const tokens = readMotionTokens();
    pulse = gsap.to(shapes, {
      opacity: 0.45,
      duration: seconds(tokens.durationMs("medium")),
      ease: tokens.ease("continuous"),
      yoyo: true,
      repeat: -1,
      stagger: seconds(tokens.staggerMs("md")),
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
      pulse?.kill();
    };
  });
</script>

<section class="station" bind:this={section}>
  <div class="station-header">
    <h2>4 · Part takeover — one part inside a component</h2>
  </div>
  <p>
    The Skeleton ships with its own shimmer loop; the lane switches it off through the public
    <code>animate="none"</code> prop and takes over exclusively: only the
    <code>.skeleton__shape</code> parts pulse, on token timing, while the component root and its
    other parts stay untouched.
  </p>
  <code class="token-readout">{readout}</code>
  <div class="stage stage-column">
    <Skeleton variant="text" lines={3} animate="none" />
  </div>
  <p class="footnote">
    Under reduced motion the takeover stops and the shapes rest at full opacity — one writer per
    property, and the reduced presentation is the component's own static skeleton.
  </p>
</section>
