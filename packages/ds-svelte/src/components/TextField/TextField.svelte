<script lang="ts">
// @generated:start imports
import { requestNativeTextChange } from "../../primitives/interaction.js";
import { useTextField } from "./useTextField.svelte.js";
// @generated:end

// @custom:start imports

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
  description?: import('svelte').Snippet;
  error?: import('svelte').Snippet;
  label?: import('svelte').Snippet;
}

let { type, value, defaultValue, onChange, invalid, disabled, required, name, ariaDescribedby, class: className, description, error, label }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useTextField({
  value: () => value,
  defaultValue: () => defaultValue,
  onChange: () => onChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "text-field",
    invalid ? "text-field--invalid" : null,
    disabled ? "text-field--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @generated:start fieldAssociation
const instanceId = $props.id();
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} data-fsds-component="text-field" data-fsds-box="">
  <label class={'text-field__label'} id={`${instanceId}-label`}>
    {@render label?.()}
  </label>
  <input class={'text-field__field'} oninput={(e) => requestNativeTextChange(e, () => behavior.setValue((e.currentTarget as HTMLInputElement).value), () => behavior.value)} type={type} value={behavior.value} disabled={disabled} name={name} required={required} aria-invalid={invalid} aria-labelledby={label ? `${instanceId}-label` : undefined} aria-describedby={[description ? `${instanceId}-description` : null, error && invalid ? `${instanceId}-error` : null, ariaDescribedby].filter(Boolean).join(' ') || undefined} />
  <span class={'text-field__description'} id={`${instanceId}-description`}>
    {@render description?.()}
  </span>
  <span class={'text-field__error'} role="alert" id={`${instanceId}-error`}>
    {@render error?.()}
  </span>
</div>
