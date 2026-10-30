<script module lang="ts">
// @generated:start publicTypes
export type ProgressVariant = "linear" | "circular";
export type ProgressSize = "sm" | "md" | "lg";
export type ProgressIntent = "info" | "success" | "warning" | "danger";
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
  value?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  intent?: ProgressIntent;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number, max: number) => string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { value, variant, size, intent, label, showValue, formatValue, class: className, children }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "progress",
    variant ? `progress--${variant}` : null,
    size ? `progress--${size}` : null,
    intent ? `progress--${intent}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100" aria-label={label} data-fsds-component="progress" data-fsds-box="">
  <span class={'progress__track'} aria-hidden="true">
    <span class={'progress__fill'} style:--fsds-progress-fill-width={value}></span>
  </span>
  {#if showValue}
  <span class={'progress__value'}>
    {@render children?.()}
  </span>
  {/if}
</div>
