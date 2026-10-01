<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { usePagination } from "./usePagination.js";
import { usePagedSet } from "../../primitives/hooks/usePaging.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type PaginationPresentation = "indicators" | "pages";
export type PaginationProgress = "none" | "elapsed";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  pages?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  presentation?: PaginationPresentation;
  label?: string;
  disabled?: boolean;
  progress?: PaginationProgress;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  pages: () => ([]),
  defaultIndex: 0,
  presentation: "indicators",
  label: "Choose page",
  disabled: false,
  progress: "none",
});
// @generated:end

// @generated:start hook
const behavior = usePagination({
  index: () => props.index,
  defaultIndex: props.defaultIndex,
  onIndexChange: props.onIndexChange,
});
const pagedSet = usePagedSet(() => ({ index: behavior.page.value, items: props.pages,
  count: undefined, disabled: props.disabled, onIndexChange: behavior.setPage }));
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "pagination",
  props.presentation ? `pagination--${props.presentation}` : null,
  props.progress ? `pagination--${props.progress}` : null,
  props.disabled ? "pagination--disabled" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" role="group" :aria-label="props.label" :data-testid="props.dataTestid" data-fsds-component="pagination" data-fsds-box="">
    <button v-for="(item, index) in (props.pages ?? [])" :key="index" :class="'pagination__item'" type="button" @click="() => pagedSet.request(index)" :aria-label="item" :aria-current="(index === behavior.page.value)" :disabled="props.disabled" :data-current="(index === behavior.page.value)">
      <span :class="'pagination__marker'" aria-hidden="true">
        <span :class="'pagination__fill'" aria-hidden="true"></span>
      </span>
      <span :class="'pagination__label'" aria-hidden="true">
        {{ item }}
      </span>
    </button>
  </div>
</template>
