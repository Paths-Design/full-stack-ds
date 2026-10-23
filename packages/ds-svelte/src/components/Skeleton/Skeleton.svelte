<script module lang="ts">
// @generated:start publicTypes
export type SkeletonVariant = "block" | "text" | "avatar" | "media" | "dataviz" | "actions";
export type SkeletonAnimate = "shimmer" | "wipe" | "pulse" | "none";
export type SkeletonDensity = "compact" | "regular" | "spacious";
export type SkeletonRadius = "sm" | "md" | "lg";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports

// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  variant?: SkeletonVariant;
  animate?: SkeletonAnimate;
  density?: SkeletonDensity;
  aspectRatio?: string;
  lines?: number;
  radius?: SkeletonRadius;
  decorative?: boolean;
  ariaLabel?: string;
  class?: string;
}

let { variant = "block", animate = "shimmer", density = "regular", aspectRatio, lines, radius, decorative = true, ariaLabel, class: className }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "skeleton",
    variant ? `skeleton--${variant}` : null,
    animate ? `skeleton--${animate}` : null,
    density ? `skeleton--${density}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} role={(decorative ? "presentation" : "status")} aria-busy={(decorative ? "false" : "true")} aria-hidden={(decorative ? "true" : "false")} aria-label={ariaLabel} data-fsds-component="skeleton" data-fsds-box="">
  {#if lines}
  <div class={'skeleton__stack'}>
    {#each Array(lines) as _, index (index)}
    <div class={'skeleton__row'}>
      <div class={'skeleton__shape'} aria-hidden="true"></div>
    </div>
    {/each}
  </div>
  {/if}
</div>
