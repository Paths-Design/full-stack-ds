<script module lang="ts">
// @generated:start publicTypes
export type BlockquoteVariant = "default" | "bordered" | "highlighted";
export type BlockquoteSize = "sm" | "md" | "lg";
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
  cite?: string;
  variant?: BlockquoteVariant;
  size?: BlockquoteSize;
  class?: string;
  children?: import('svelte').Snippet;
}

let { cite, variant, size, class: className, children }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "blockquote",
    variant ? `blockquote--${variant}` : null,
    size ? `blockquote--${size}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<blockquote class={classes} data-fsds-component="blockquote" data-fsds-box="">
  {@render children?.()}
</blockquote>
