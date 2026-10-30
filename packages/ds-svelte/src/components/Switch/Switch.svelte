<script module lang="ts">
// @generated:start publicTypes
export type SwitchSize = "sm" | "md" | "lg";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { useSwitch } from "./useSwitch.svelte.js";
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
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: SwitchSize;
  disabled?: boolean;
  name?: string;
  value?: string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { checked, defaultChecked, onChange, size = "md", disabled, name, value, class: className, children }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useSwitch({
  checked: () => checked,
  defaultChecked: () => defaultChecked,
  onChange: () => onChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "switch",
    size ? `switch--${size}` : null,
    behavior.checked ? "switch--checked" : null,
    disabled ? "switch--disabled" : null,
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

<label class={classes} data-fsds-component="switch" data-fsds-box="">
  <input class={'switch__input'} type="checkbox" role="switch" onchange={(e) => behavior.setChecked((e.currentTarget as HTMLInputElement).checked)} checked={behavior.checked} disabled={disabled} name={name} value={value} id={fieldAssociation?.().controlId} aria-describedby={fieldAssociation?.().describedBy} />
  <span class={'switch__track'} aria-hidden="true">
    <span class={'switch__thumb'}></span>
  </span>
  {@render children?.()}
</label>
