<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useRadioGroup } from "./useRadioGroup.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type RadioGroupOption = { value: string; label: string; disabled?: boolean; description?: string };
export type RadioGroupOrientation = "vertical" | "horizontal";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  options?: RadioGroupOption[];
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
  orientation?: RadioGroupOrientation;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  options: () => ([{"value":"alpha","label":"Alpha"},{"value":"beta","label":"Beta"}]),
  orientation: "vertical",
});
// @generated:end

// @generated:start hook
const behavior = useRadioGroup({
  value: () => props.value,
  defaultValue: props.defaultValue,
  onChange: (...args) => props.onChange?.(...args),
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "radio-group",
  props.orientation ? `radio-group--${props.orientation}` : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <fieldset :class="classNames" role="radiogroup" :aria-label="props.ariaLabel" :data-testid="props.dataTestid" data-fsds-component="radio-group" data-fsds-box="">
    <label v-for="(item, index) in (props.options ?? [])" :key="index" :class="'radio-group__item'" :data-checked="(item.value === behavior.selection.value)" :data-disabled="item.disabled" :title="item.description">
      <input :class="'radio-group__option'" type="radio" @change="() => behavior.setSelection(item.value)" :name="props.name" :value="item.value" :checked="(item.value === behavior.selection.value)" :disabled="item.disabled" :aria-label="item.label" :aria-checked="(item.value === behavior.selection.value)" />
      <span :class="'radio-group__label'">
        {{ item.label }}
      </span>
    </label>
  </fieldset>
</template>
