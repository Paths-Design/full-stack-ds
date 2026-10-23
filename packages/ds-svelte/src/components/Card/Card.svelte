<script module lang="ts">
// @generated:start publicTypes
export type CardDensity = "default" | "inset";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { Stack } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  interactive?: boolean;
  density?: CardDensity;
  class?: string;
  children?: import('svelte').Snippet;
}

let { interactive, density = "default", class: className, children }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "card",
    density ? `card--${density}` : null,
    interactive ? "card--interactive" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<Stack role="group" data-fsds-component="card" data-fsds-box="" class={classes}>
  {@render children?.()}
</Stack>
