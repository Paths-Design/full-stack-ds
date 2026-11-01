<script lang="ts">
// @generated:start imports
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start props
interface Props {
  responsive?: boolean;
  contentLabel?: string;
  ariaLabel?: string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { responsive = true, contentLabel: contentLabelProp, ariaLabel, class: className, children }: Props = $props();
const TableMessages = { content: "Table content" };
const fsdsMessages = useFsdsMessages("Table", TableMessages);
const contentLabel = $derived(contentLabelProp ?? fsdsMessages.current.content);
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "table",
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} role="region" data-responsive={(responsive ? "true" : "false")} tabindex={(responsive ? 0 : -1)} aria-label={contentLabel} data-fsds-component="table" data-fsds-box="">
  <table class={'table__container'} aria-label={ariaLabel}>
    {@render children?.()}
  </table>
</div>
