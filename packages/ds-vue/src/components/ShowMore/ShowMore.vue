<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useShowMore } from "./useShowMore.js";
import { canActivateInteraction } from "../../primitives/interaction.js";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

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
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  expanded: undefined,
  defaultExpanded: undefined,
  maxLines: 3,
});
const ShowMoreMessages = { showMore: "Show more", showLess: "Show less" };
const fsdsMessages = useFsdsMessages("ShowMore", ShowMoreMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { showMoreLabel: "showMore", showLessLabel: "showLess" });
// @generated:end

// @generated:start hook
const behavior = useShowMore({
  expanded: () => props.expanded,
  defaultExpanded: props.defaultExpanded,
  onExpandedChange: props.onExpandedChange,
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "show-more",
  behavior.expanded.value ? "show-more--expanded" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" :data-testid="props.dataTestid" data-fsds-component="show-more" data-fsds-box="">
    <div :class="'show-more__content'" :style="{ '--fsds-show-more-content-max-lines': props.maxLines }">
      <slot />
    </div>
    <button :class="'show-more__trigger'" type="button" @click="(e: MouseEvent) => { if (canActivateInteraction(e, false)) behavior.setExpanded(!behavior.expanded.value); }" :aria-expanded="behavior.expanded.value">
      {{ (behavior.expanded.value ? props.showLessLabel : props.showMoreLabel) }}
    </button>
  </div>
</template>
