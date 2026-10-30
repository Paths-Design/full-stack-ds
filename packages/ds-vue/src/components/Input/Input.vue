<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useFieldAssociation } from "../../primitives/index.js";
import { useInput } from "./useInput.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  name?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  disabled: undefined,
  invalid: undefined,
  required: undefined,
});
// @generated:end

// @generated:start hook
const behavior = useInput({
  value: () => props.value,
  defaultValue: props.defaultValue,
  onChange: (...args) => props.onChange?.(...args),
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "input",
  props.disabled ? "input--disabled" : null,
  props.invalid ? "input--invalid" : null,
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
  <input :class="classNames" @input="(e) => behavior.setValue((e.target as HTMLInputElement).value)" :type="props.type" :value="behavior.value.value" :disabled="props.disabled" :aria-invalid="props.invalid" :placeholder="props.placeholder" :name="props.name" :required="props.required" :aria-label="props.ariaLabel" :aria-labelledby="props.ariaLabelledby" :id="fieldAssociation?.controlId" :aria-describedby="fieldAssociation?.describedBy" :data-testid="props.dataTestid" data-fsds-component="input" data-fsds-box="" />
</template>
