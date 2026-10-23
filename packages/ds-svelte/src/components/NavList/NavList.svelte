<script module lang="ts">
// @generated:start publicTypes
export type NavListOrientation = "vertical" | "horizontal";
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
  orientation?: NavListOrientation;
  ariaLabel?: string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { orientation = "vertical", ariaLabel, class: className, children }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "nav-list",
    orientation ? `nav-list--${orientation}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<nav class={classes} aria-label={ariaLabel} data-fsds-component="nav-list" data-fsds-box="">
  <ul class={'nav-list__list'}>
    {@render children?.()}
  </ul>
</nav>
