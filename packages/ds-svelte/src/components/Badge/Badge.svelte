<script module lang="ts">
// @generated:start publicTypes
export type BadgeVariant = "default" | "status" | "counter" | "tag";
export type BadgeIntent = "info" | "success" | "warning" | "danger";
export type BadgeSize = "sm" | "md" | "lg";
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
  variant?: BadgeVariant;
  intent?: BadgeIntent;
  size?: BadgeSize;
  icon?: unknown;
  showStatusIcon?: boolean;
  class?: string;
  children?: import('svelte').Snippet;
}

let { variant, intent, size, icon, showStatusIcon, class: className, children }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "badge",
    variant ? `badge--${variant}` : null,
    intent ? `badge--${intent}` : null,
    size ? `badge--${size}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<span class={classes} data-fsds-component="badge" data-fsds-box="">
  {#if icon}
  <span class={'badge__icon'} aria-hidden="true">{icon}</span>
  {/if}
  <span class={'badge__content'}>
    {@render children?.()}
  </span>
</span>
