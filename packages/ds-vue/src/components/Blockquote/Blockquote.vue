<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type BlockquoteVariant = "default" | "bordered" | "highlighted";
export type BlockquoteSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  cite?: string;
  variant?: BlockquoteVariant;
  size?: BlockquoteSize;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = defineProps<Props>();
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "blockquote",
  props.variant ? `blockquote--${props.variant}` : null,
  props.size ? `blockquote--${props.size}` : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <blockquote :class="classNames" :cite="props.cite" :data-testid="props.dataTestid" data-fsds-component="blockquote" data-fsds-box="">
    <slot />
  </blockquote>
</template>
