<script setup lang="ts">
import { ref } from "vue";
import Input from "../../../packages/ds-vue/src/components/Input/Input.vue";
const props = defineProps<{ onRequest: (value: string) => void }>();
const value = ref("alpha");
const accepting = ref(false);
function setValue(next: string) { value.value = next; }
function setAccepting(next: boolean) { accepting.value = next; }
defineExpose({ setValue, setAccepting });
</script>
<template>
  <Input type="text" ariaLabel="Same mounted input" :value="value"
    :onChange="(next: string) => { props.onRequest(next); if (accepting) value = next; }" />
</template>
