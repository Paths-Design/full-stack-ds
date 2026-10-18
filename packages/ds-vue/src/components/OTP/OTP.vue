<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useOTP } from "./useOTP.js";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type OTPMode = "numeric" | "alphanumeric";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  mode?: OTPMode;
  disabled?: boolean;
  readOnly?: boolean;
  label?: string;
  fieldLabel?: string;
  ariaDescribedby?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  length: 6,
  mode: "numeric",
  disabled: undefined,
  readOnly: undefined,
});
const OTPMessages = { groupLabel: "One-time password", fieldLabel: "One-time password digit" };
const fsdsMessages = useFsdsMessages("OTP", OTPMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { label: "groupLabel", fieldLabel: "fieldLabel" });
// @generated:end

// @generated:start hook
const behavior = useOTP({
  value: () => props.value,
  defaultValue: props.defaultValue,
  onChange: props.onChange,
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "otp",
  props.mode ? `otp--${props.mode}` : null,
  props.disabled ? "otp--disabled" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" role="group" :aria-label="props.label" :aria-describedby="props.ariaDescribedby" :data-testid="props.dataTestid" data-fsds-component="otp" data-fsds-box="">
    <div :class="'otp__group'">
      <input v-for="(_, index) in Array(props.length)" :key="index" :class="'otp__field'" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="1" @input="(e) => behavior.setValue(String(behavior.value.value ?? '').padEnd(index, ' ').slice(0, index) + String((e.target as HTMLInputElement).value ?? '').slice(-1) + String(behavior.value.value ?? '').slice(index + 1))" :disabled="props.disabled" :aria-label="props.fieldLabel" :aria-readonly="props.readOnly" :data-otp-index="index" />
    </div>
  </div>
</template>
