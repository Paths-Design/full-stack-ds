<script lang="ts">
// @generated:start imports
import { requestNativeTextChange } from "../../primitives/interaction.js";
import { useInput } from "./useInput.svelte.js";
import { useFieldAssociation } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

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
}

let { type, value, defaultValue, onChange, placeholder, disabled, invalid, required, name, ariaLabel, ariaLabelledby, class: className }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useInput({
  value: () => value,
  defaultValue: () => defaultValue,
  onChange: () => onChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "input",
    disabled ? "input--disabled" : null,
    invalid ? "input--invalid" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @generated:start fieldAssociation
const fieldAssociation = useFieldAssociation();
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<input class={classes} oninput={(e) => requestNativeTextChange(e, () => behavior.setValue((e.currentTarget as HTMLInputElement).value), () => behavior.value)} type={type} value={behavior.value} disabled={disabled} aria-invalid={invalid} placeholder={placeholder} name={name} required={required} aria-label={ariaLabel} aria-labelledby={ariaLabelledby} id={fieldAssociation?.().controlId} aria-describedby={fieldAssociation?.().describedBy} data-fsds-component="input" data-fsds-box="" />
