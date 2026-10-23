<script module lang="ts">
// @generated:start publicTypes
export type OTPMode = "numeric" | "alphanumeric";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { useOTP } from "./useOTP.svelte.js";
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

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
}

let { length = 6, value, defaultValue, onChange, onComplete, mode = "numeric", disabled, readOnly, label: labelProp, fieldLabel: fieldLabelProp, ariaDescribedby, class: className }: Props = $props();
const OTPMessages = { groupLabel: "One-time password", fieldLabel: "One-time password digit" };
const fsdsMessages = useFsdsMessages("OTP", OTPMessages);
const label = $derived(labelProp ?? fsdsMessages.current.groupLabel);
const fieldLabel = $derived(fieldLabelProp ?? fsdsMessages.current.fieldLabel);
// @generated:end

// @generated:start hook
const behavior = useOTP({
  value: () => value,
  defaultValue: () => defaultValue,
  onChange: () => onChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "otp",
    mode ? `otp--${mode}` : null,
    disabled ? "otp--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} role="group" aria-label={label} aria-describedby={ariaDescribedby} data-fsds-component="otp" data-fsds-box="">
  <div class={'otp__group'}>
    {#each Array(length) as _, index (index)}
    <input class={'otp__field'} type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="1" oninput={(e) => behavior.setValue(String(behavior.value ?? '').padEnd(index, ' ').slice(0, index) + String((e.currentTarget as HTMLInputElement).value ?? '').slice(-1) + String(behavior.value ?? '').slice(index + 1))} disabled={disabled} aria-label={fieldLabel} aria-readonly={readOnly} data-otp-index={index} />
    {/each}
  </div>
</div>
