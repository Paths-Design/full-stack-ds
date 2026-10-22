<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useTruncate } from "./useTruncate.js";
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
  lines?: number;
  expandable?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  expandText?: string;
  collapseText?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  expandable: undefined,
  expanded: undefined,
  defaultExpanded: undefined,
});
const TruncateMessages = { expand: "Show more", collapse: "Show less" };
const fsdsMessages = useFsdsMessages("Truncate", TruncateMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { expandText: "expand", collapseText: "collapse" });
// @generated:end

// @generated:start hook
const behavior = useTruncate({
  expanded: () => props.expanded,
  defaultExpanded: props.defaultExpanded,
  onExpandedChange: (...args) => props.onExpandedChange?.(...args),
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "truncate",
  behavior.expanded.value ? "truncate--expanded" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" :data-testid="props.dataTestid" data-fsds-component="truncate" data-fsds-box="">
    <span :class="'truncate__content'" :style="{ '--fsds-truncate-content-lines': props.lines }">
      <slot />
    </span>
    <button v-if="props.expandable" :class="'truncate__toggle'" type="button" @click="() => behavior.setExpanded(!behavior.expanded.value)" :aria-expanded="behavior.expanded.value">
      {{ (behavior.expanded.value ? props.collapseText : props.expandText) }}
    </button>
  </div>
</template>
