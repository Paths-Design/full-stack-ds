<script module lang="ts">
// @generated:start publicTypes
export type SpinnerSize = "xs" | "sm" | "md" | "lg";
export type SpinnerThickness = "hairline" | "regular" | "bold";
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
  size?: SpinnerSize;
  thickness?: SpinnerThickness;
  ariaHidden?: boolean;
  label?: string;
  inline?: boolean;
  showAfterMs?: number;
  class?: string;
}

let { size, thickness, ariaHidden, label, inline, showAfterMs, class: className }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "spinner",
    size ? `spinner--${size}` : null,
    thickness ? `spinner--${thickness}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} aria-label={label} aria-hidden={ariaHidden} data-fsds-component="spinner" data-fsds-box="" role="status">
  <span class={'spinner__visual'} aria-hidden="true"></span>
</div>
