<script setup lang="ts">
const props = withDefaults(defineProps<{ number: number; ending?: string }>(), { ending: "" });
</script>

<template>
  <span class="code-block__line"><span class="code-block__gutter" :data-line="props.number" aria-hidden="true"></span><slot />{{ props.ending }}</span>
</template>
