<script lang="ts">
// @generated:start imports
import { canActivateInteraction } from "../../primitives/interaction.js";
import { useShowMore } from "./useShowMore.svelte.js";
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start props
interface Props {
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  maxLines?: number;
  showMoreLabel?: string;
  showLessLabel?: string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { expanded, defaultExpanded, onExpandedChange, maxLines = 3, showMoreLabel: showMoreLabelProp, showLessLabel: showLessLabelProp, class: className, children }: Props = $props();
const ShowMoreMessages = { showMore: "Show more", showLess: "Show less" };
const fsdsMessages = useFsdsMessages("ShowMore", ShowMoreMessages);
const showMoreLabel = $derived(showMoreLabelProp ?? fsdsMessages.current.showMore);
const showLessLabel = $derived(showLessLabelProp ?? fsdsMessages.current.showLess);
// @generated:end

// @generated:start hook
const behavior = useShowMore({
  expanded: () => expanded,
  defaultExpanded: () => defaultExpanded,
  onExpandedChange: () => onExpandedChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "show-more",
    behavior.expanded ? "show-more--expanded" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} data-fsds-component="show-more" data-fsds-box="">
  <div class={'show-more__content'} style:--fsds-show-more-content-max-lines={maxLines}>
    {@render children?.()}
  </div>
  <button class={'show-more__trigger'} type="button" onclick={(e) => { if (canActivateInteraction(e, false)) behavior.setExpanded(!behavior.expanded); }} aria-expanded={behavior.expanded}>{(behavior.expanded ? showLessLabel : showMoreLabel)}</button>
</div>
