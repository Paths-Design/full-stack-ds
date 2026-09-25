<script setup lang="ts">
const props = defineProps<{ kind: "comment" | "definition" | "keyword" | "plain" | "property" | "punctuation" | "static" | "string" | "tag" }>();
</script>

<template>
  <span class="code-block__token" :data-token="props.kind"><slot /></span>
</template>
