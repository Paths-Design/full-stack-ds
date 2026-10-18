<script lang="ts">
// @generated:start imports
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start props
interface Props {
  ariaLabel?: string;
  separator?: string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { ariaLabel: ariaLabelProp, separator, class: className, children }: Props = $props();
const BreadcrumbsMessages = { navigationLabel: "Breadcrumb" };
const fsdsMessages = useFsdsMessages("Breadcrumbs", BreadcrumbsMessages);
const ariaLabel = $derived(ariaLabelProp ?? fsdsMessages.current.navigationLabel);
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "breadcrumbs",
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<nav class={classes} aria-label={ariaLabel} data-fsds-component="breadcrumbs" data-fsds-box="">
  <ol class={'breadcrumbs__list'}>
    {@render children?.()}
  </ol>
</nav>
