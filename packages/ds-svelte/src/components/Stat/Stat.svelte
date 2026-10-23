<script module lang="ts">
// @generated:start publicTypes
export type StatSize = "sm" | "md" | "lg";
export type StatTrend = "up" | "down" | "neutral";
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
  size?: StatSize;
  trend?: StatTrend;
  class?: string;
  children?: import('svelte').Snippet;
}

let { size = "md", trend, class: className, children }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "stat",
    size ? `stat--${size}` : null,
    trend ? `stat--${trend}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} data-fsds-component="stat" data-fsds-box="">
  {@render children?.()}
</div>
