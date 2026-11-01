<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
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
  responsive?: boolean;
  contentLabel?: string;
  ariaLabel?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  responsive: true,
});
const TableMessages = { content: "Table content" };
const fsdsMessages = useFsdsMessages("Table", TableMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { contentLabel: "content" });
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "table",
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" role="region" :data-responsive="(props.responsive ? 'true' : 'false')" :tabindex="(props.responsive ? '0' : '-1')" :aria-label="props.contentLabel" :data-testid="props.dataTestid" data-fsds-component="table" data-fsds-box="">
    <table :class="'table__container'" :aria-label="props.ariaLabel">
      <slot />
    </table>
  </div>
</template>
