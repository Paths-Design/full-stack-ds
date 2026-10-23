<script module lang="ts">
// @generated:start publicTypes
export type RadioGroupOption = { value: string; label: string; disabled?: boolean; description?: string };
export type RadioGroupOrientation = "vertical" | "horizontal";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { useRadioGroup } from "./useRadioGroup.svelte.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  options?: RadioGroupOption[];
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
  orientation?: RadioGroupOrientation;
  class?: string;
}

let { options = [{"value":"alpha","label":"Alpha"},{"value":"beta","label":"Beta"}], name, value, defaultValue, onChange, ariaLabel, orientation = "vertical", class: className }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useRadioGroup({
  value: () => value,
  defaultValue: () => defaultValue,
  onChange: () => onChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "radio-group",
    orientation ? `radio-group--${orientation}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<fieldset class={classes} role="radiogroup" aria-label={ariaLabel} data-fsds-component="radio-group" data-fsds-box="">
  {#each (options ?? []) as item, index (index)}
  <label class={'radio-group__item'} data-checked={(item.value === behavior.selection)} data-disabled={item.disabled} title={item.description}>
    <input class={'radio-group__option'} type="radio" onchange={() => behavior.setSelection(item.value)} name={name} value={item.value} checked={(item.value === behavior.selection)} disabled={item.disabled} aria-label={item.label} aria-checked={(item.value === behavior.selection)} />
    <span class={'radio-group__label'}>{item.label}</span>
  </label>
  {/each}
</fieldset>
