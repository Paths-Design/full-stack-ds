<script lang="ts">
// @generated:start imports
import { useTruncate } from "./useTruncate.svelte.js";
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start props
interface Props {
  lines?: number;
  expandable?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  expandText?: string;
  collapseText?: string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { lines, expandable, expanded, defaultExpanded, onExpandedChange, expandText: expandTextProp, collapseText: collapseTextProp, class: className, children }: Props = $props();
const TruncateMessages = { expand: "Show more", collapse: "Show less" };
const fsdsMessages = useFsdsMessages("Truncate", TruncateMessages);
const expandText = $derived(expandTextProp ?? fsdsMessages.current.expand);
const collapseText = $derived(collapseTextProp ?? fsdsMessages.current.collapse);
// @generated:end

// @generated:start hook
const behavior = useTruncate({
  expanded: () => expanded,
  defaultExpanded: () => defaultExpanded,
  onExpandedChange: () => onExpandedChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "truncate",
    behavior.expanded ? "truncate--expanded" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} data-fsds-component="truncate" data-fsds-box="">
  <span class={'truncate__content'} style:--fsds-truncate-content-lines={lines}>
    {@render children?.()}
  </span>
  {#if expandable}
  <button class={'truncate__toggle'} type="button" onclick={() => behavior.setExpanded(!behavior.expanded)} aria-expanded={behavior.expanded}>{(behavior.expanded ? collapseText : expandText)}</button>
  {/if}
</div>
