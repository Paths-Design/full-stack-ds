<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useFieldAssociation } from "../../primitives/index.js";
import { useCheckbox } from "./useCheckbox.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CheckboxSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  size?: CheckboxSize;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  name?: string;
  value?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  size: "md",
  checked: undefined,
  defaultChecked: undefined,
  indeterminate: undefined,
  disabled: undefined,
});
// @generated:end

// @generated:start hook
const behavior = useCheckbox({
  checked: () => props.checked,
  defaultChecked: props.defaultChecked,
  onChange: (...args) => props.onChange?.(...args),
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "checkbox",
  props.size ? `checkbox--${props.size}` : null,
  behavior.checked.value ? "checkbox--checked" : null,
  props.disabled ? "checkbox--disabled" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @generated:start fieldAssociation
const fieldAssociation = useFieldAssociation();
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <label :class="classNames" :data-testid="props.dataTestid" data-fsds-component="checkbox" data-fsds-box="">
    <input :class="'checkbox__input'" type="checkbox" @change="(e) => behavior.setChecked((e.target as HTMLInputElement).checked)" :checked="behavior.checked.value" :disabled="props.disabled" :name="props.name" :value="props.value" :aria-label="props.ariaLabel" :aria-labelledby="props.ariaLabelledby" :aria-checked="(props.indeterminate ? 'mixed' : behavior.checked.value)" :indeterminate="props.indeterminate" :id="fieldAssociation?.controlId" :aria-describedby="fieldAssociation?.describedBy" />
    <span :class="'checkbox__indicator'" aria-hidden="true"></span>
  </label>
</template>
