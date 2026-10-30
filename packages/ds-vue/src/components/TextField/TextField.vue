<script setup lang="ts">
// @generated:start imports
import { computed, useId } from "vue";
import { useTextField } from "./useTextField.js";
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
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  ariaDescribedby?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  invalid: undefined,
  disabled: undefined,
  required: undefined,
});
// @generated:end

// @generated:start hook
const behavior = useTextField({
  value: () => props.value,
  defaultValue: props.defaultValue,
  onChange: (...args) => props.onChange?.(...args),
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "text-field",
  props.invalid ? "text-field--invalid" : null,
  props.disabled ? "text-field--disabled" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @generated:start fieldAssociation
const instanceId = useId();
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" :data-testid="props.dataTestid" data-fsds-component="text-field" data-fsds-box="">
    <label :class="'text-field__label'" :id="`${instanceId}-label`">
      <slot name="label" />
    </label>
    <input :class="'text-field__field'" @input="(e) => behavior.setValue((e.target as HTMLInputElement).value)" :type="props.type" :value="behavior.value.value" :disabled="props.disabled" :name="props.name" :required="props.required" :aria-invalid="props.invalid" :aria-labelledby="$slots.label ? `${instanceId}-label` : undefined" :aria-describedby="[$slots.description ? `${instanceId}-description` : null, $slots.error && props.invalid ? `${instanceId}-error` : null, props.ariaDescribedby].filter(Boolean).join(' ') || undefined" />
    <span :class="'text-field__description'" :id="`${instanceId}-description`">
      <slot name="description" />
    </span>
    <span :class="'text-field__error'" role="alert" :id="`${instanceId}-error`">
      <slot name="error" />
    </span>
  </div>
</template>
