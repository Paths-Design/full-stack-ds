<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start props
interface Props {
  class?: string;
  dataTestid?: string;
  id?: string;
  style?: string;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  title?: string;
  colSpan?: number;
  rowSpan?: number;
  headers?: string;
  scope?: "col" | "row" | "colgroup" | "rowgroup";
  abbr?: string;
  ariaSort?: "none" | "ascending" | "descending" | "other";
}

const props = defineProps<Props>();
// @generated:end

// @generated:start classes
const classNames = computed(() =>
  ["table__headerCell", props.class].filter(Boolean).join(" "),
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <th :class="classNames" :data-testid="props.dataTestid" :id="props.id" :style="props.style" :lang="props.lang" :dir="props.dir" :title="props.title" :colspan="props.colSpan" :rowspan="props.rowSpan" :headers="props.headers" :scope="props.scope" :abbr="props.abbr" :aria-sort="props.ariaSort">
    <slot />
  </th>
</template>
