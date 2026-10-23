<script module lang="ts">
// @generated:start publicTypes
export type CheckboxSize = "sm" | "md" | "lg";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { useCheckbox } from "./useCheckbox.svelte.js";
import { useFieldAssociation } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

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
}

let { size = "md", checked, defaultChecked, onChange, indeterminate, disabled, name, value, ariaLabel, ariaLabelledby, class: className }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useCheckbox({
  checked: () => checked,
  defaultChecked: () => defaultChecked,
  onChange: () => onChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "checkbox",
    size ? `checkbox--${size}` : null,
    behavior.checked ? "checkbox--checked" : null,
    disabled ? "checkbox--disabled" : null,
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

<label class={classes} data-fsds-component="checkbox" data-fsds-box="">
  <input class={'checkbox__input'} type="checkbox" onchange={(e) => behavior.setChecked((e.currentTarget as HTMLInputElement).checked)} checked={behavior.checked} disabled={disabled} name={name} value={value} aria-label={ariaLabel} aria-labelledby={ariaLabelledby} aria-checked={(indeterminate ? "mixed" : behavior.checked)} indeterminate={indeterminate} id={fieldAssociation?.().controlId} aria-describedby={fieldAssociation?.().describedBy} />
  <span class={'checkbox__indicator'} aria-hidden="true"></span>
</label>
