<script module lang="ts">
// @generated:start publicTypes
export type TextElement = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type TextVariant = "display" | "headline" | "title" | "body" | "caption" | "overline" | "code";
export type TextSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type TextWeight = "light" | "normal" | "medium" | "semibold" | "bold";
export type TextAlign = "left" | "center" | "right" | "justify";
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
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
  as?: TextElement;
  variant?: TextVariant;
  size?: TextSize;
  weight?: TextWeight;
  align?: TextAlign;
  transform?: TextTransform;
  truncate?: boolean;
  class?: string;
  children?: import('svelte').Snippet;
}

let { as, variant, size, weight, align, transform, truncate, class: className, children }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "text",
    variant ? `text--${variant}` : null,
    size ? `text--${size}` : null,
    weight ? `text--${weight}` : null,
    align ? `text--${align}` : null,
    transform ? `text--${transform}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<svelte:element this={as ?? "p"} class={classes} data-truncate={(truncate ? "true" : "false")} data-fsds-component="text" data-fsds-box="">
  {@render children?.()}
</svelte:element>
