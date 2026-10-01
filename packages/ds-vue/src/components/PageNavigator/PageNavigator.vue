<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { usePageNavigator } from "./usePageNavigator.js";
import Button from "../Button/Button.vue";
import Icon from "../Icon/Icon.vue";
import Input from "../Input/Input.vue";
import Pagination from "../Pagination/Pagination.vue";
import { usePagedSet } from "../../primitives/hooks/usePaging.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type PageNavigatorPresentation = "indicators" | "pages";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  pages?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  presentation?: PageNavigatorPresentation;
  label?: string;
  disabled?: boolean;
  pageCount?: number;
  pageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  ofLabel?: string;
  commitLabel?: string;
  showChoices?: boolean;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  pages: () => ([]),
  defaultIndex: 0,
  presentation: "indicators",
  label: "Page navigation",
  disabled: false,
  pageLabel: "Current page",
  previousLabel: "Previous page",
  nextLabel: "Next page",
  ofLabel: "of",
  commitLabel: "Go",
  showChoices: false,
});
// @generated:end

// @generated:start hook
const behavior = usePageNavigator({
  index: () => props.index,
  defaultIndex: props.defaultIndex,
  onIndexChange: props.onIndexChange,
});
const pagedSet = usePagedSet(() => ({ index: behavior.page.value, items: props.pages,
  count: props.pageCount, disabled: props.disabled, onIndexChange: behavior.setPage }));
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "page-navigator",
  props.disabled ? "page-navigator--disabled" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" role="group" :aria-label="props.label" :data-testid="props.dataTestid" data-fsds-component="page-navigator" data-fsds-box="">
    <Button :class="'page-navigator__previous'" type="button" :onClick="pagedSet.previous" :disabled="pagedSet.state.previousDisabled" :ariaLabel="props.previousLabel">
      <Icon :class="'page-navigator__previousIcon'" name="arrow-left" size="sm" />
    </Button>
    <div :class="'page-navigator__field'" @keydown="pagedSet.commitOnEnter" @focusout="pagedSet.commit">
      <Input :class="'page-navigator__input'" type="number" :onChange="pagedSet.edit" :value="pagedSet.state.draft" :disabled="pagedSet.state.disabled" :ariaLabel="props.pageLabel" />
    </div>
    <span :class="'page-navigator__context'">
      {{ props.ofLabel }}
    </span>
    <span :class="'page-navigator__total'">
      {{ pagedSet.state.count }}
    </span>
    <Button :class="'page-navigator__commit'" type="button" :onClick="pagedSet.commit" :disabled="pagedSet.state.disabled" :ariaLabel="props.commitLabel">
      <span>
        {{ props.commitLabel }}
      </span>
    </Button>
    <Button :class="'page-navigator__next'" type="button" :onClick="pagedSet.next" :disabled="pagedSet.state.nextDisabled" :ariaLabel="props.nextLabel">
      <Icon :class="'page-navigator__nextIcon'" name="arrow-right" size="sm" />
    </Button>
    <Pagination v-if="props.showChoices" :class="'page-navigator__choices'" :onIndexChange="pagedSet.request" :pages="props.pages" :index="behavior.page.value" :presentation="props.presentation" :label="props.label" :disabled="pagedSet.state.disabled" />
  </div>
</template>
