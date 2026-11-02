<script lang="ts">
// @generated:start imports
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types


function fsdsCssString(value: unknown): string {
  return '"' + Array.from(String(value ?? ""), character => "\\" + character.codePointAt(0)!.toString(16) + " ").join("") + '"';
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  ariaLabel?: string;
  separator?: string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { ariaLabel: ariaLabelProp, separator = "/", class: className, children }: Props = $props();
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
  <ol class={'breadcrumbs__list'} style:--fsds-breadcrumbs-child-separator={fsdsCssString(separator)}>
    {@render children?.()}
  </ol>
</nav>
