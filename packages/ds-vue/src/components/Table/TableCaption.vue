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
}

const props = defineProps<Props>();
// @generated:end

// @generated:start classes
const classNames = computed(() =>
  ["table__caption", props.class].filter(Boolean).join(" "),
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <caption :class="classNames" :data-testid="props.dataTestid" :id="props.id" :style="props.style" :lang="props.lang" :dir="props.dir" :title="props.title">
    <slot />
  </caption>
</template>
