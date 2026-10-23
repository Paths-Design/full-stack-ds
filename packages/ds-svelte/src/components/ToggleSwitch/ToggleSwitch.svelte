<script module lang="ts">
// @generated:start publicTypes
export type ToggleSwitchSize = "small" | "medium" | "large";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { useToggleSwitch } from "./useToggleSwitch.svelte.js";
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
  size?: ToggleSwitchSize;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedby?: string;
  class?: string;
}

let { checked, defaultChecked, onChange, size = "medium", disabled, ariaLabel, ariaDescribedby, class: className }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useToggleSwitch({
  checked: () => checked,
  defaultChecked: () => defaultChecked,
  onChange: () => onChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "toggle-switch",
    size ? `toggle-switch--${size}` : null,
    behavior.checked ? "toggle-switch--checked" : null,
    disabled ? "toggle-switch--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<button class={classes} type="button" onclick={() => behavior.setChecked(!behavior.checked)} aria-checked={behavior.checked} aria-label={ariaLabel} aria-describedby={ariaDescribedby} disabled={disabled} data-fsds-component="toggle-switch" data-fsds-box="" role="switch"></button>
