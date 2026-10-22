<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useFieldAssociation } from "../../primitives/index.js";
import { useSwitch } from "./useSwitch.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SwitchSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: SwitchSize;
  disabled?: boolean;
  name?: string;
  value?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  checked: undefined,
  defaultChecked: undefined,
  size: "md",
  disabled: undefined,
});
// @generated:end

// @generated:start hook
const behavior = useSwitch({
  checked: () => props.checked,
  defaultChecked: props.defaultChecked,
  onChange: (...args) => props.onChange?.(...args),
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "switch",
  props.size ? `switch--${props.size}` : null,
  behavior.checked.value ? "switch--checked" : null,
  props.disabled ? "switch--disabled" : null,
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
  <label :class="classNames" :data-testid="props.dataTestid" data-fsds-component="switch" data-fsds-box="">
    <input :class="'switch__input'" type="checkbox" role="switch" @change="(e) => behavior.setChecked((e.target as HTMLInputElement).checked)" :checked="behavior.checked.value" :disabled="props.disabled" :name="props.name" :value="props.value" :id="fieldAssociation?.controlId" :aria-describedby="fieldAssociation?.describedBy" />
    <span :class="'switch__track'" aria-hidden="true">
      <span :class="'switch__thumb'"></span>
    </span>
    <slot />
  </label>
</template>
