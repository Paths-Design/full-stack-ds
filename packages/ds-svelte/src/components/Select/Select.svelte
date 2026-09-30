<script lang="ts">
// @generated:start imports
import { useSelect } from "./useSelect.svelte.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
type SelectOption = { value: string; label: string; disabled?: boolean };
type SelectSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  options?: SelectOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  multiple?: boolean;
  disabled?: boolean;
  triggerLabel?: string;
  size?: SelectSize;
  filterFn?: (option: SelectOption, searchTerm: string) => boolean;
  searchable?: boolean;
  empty?: boolean;
  placeholder?: string;
  searchLabel?: string;
  position?: string;
  class?: string;
}

let { options = [{"value":"alpha","label":"Alpha"},{"value":"beta","label":"Beta"},{"value":"gamma","label":"Gamma"}], value, defaultValue = "beta", onChange, open, defaultOpen = true, onOpenChange, multiple, disabled, triggerLabel = "Select an option", size = "md", filterFn, searchable, empty, placeholder = "Select an option", searchLabel = "Search options", position, class: className }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useSelect({
  value: () => value,
  defaultValue: () => defaultValue,
  onChange: () => onChange,
  open: () => open,
  defaultOpen: () => defaultOpen,
  onOpenChange: () => onOpenChange,
  multiple: () => multiple,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "select",
    size ? `select--${size}` : null,
    position ? `select--${position}` : null,
    behavior.open ? "select--open" : null,
    disabled ? "select--disabled" : null,
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

<div class={classes} role="combobox" aria-haspopup="listbox" aria-label={triggerLabel} aria-expanded={behavior.open} aria-disabled={disabled} aria-controls={open ? `${instanceId}-content` : undefined} data-fsds-component="select" data-fsds-box="">
  <button class={'select__trigger'} bind:this={behavior.anchorRef.el} type="button" onclick={() => behavior.setOpen(!behavior.open)} onkeydown={behavior.handleTriggerKeydown} disabled={disabled} aria-label={triggerLabel} aria-expanded={behavior.open} aria-controls={open ? `${instanceId}-content` : undefined}>
    <span class={'select__text'}>{((options || []).filter(option => (Array.isArray(behavior.selection) ? behavior.selection : [behavior.selection]).includes(option.value)).map(option => option.label).join(', ') || placeholder)}</span>
  </button>
  {#if behavior.open}
  <div class={'select__content'} bind:this={behavior.panelRef.el} role="listbox" onkeydown={behavior.handleContentKeydown} tabindex="-1" id={`${instanceId}-content`}>
    {#if searchable}
    <div class={'select__search'}>
      <input class={'select__searchInput'} type="text" aria-label={searchLabel} disabled={disabled} />
    </div>
    {/if}
    <div class={'select__options'}>
      {#each (options ?? []) as item, index (index)}
      <button class={'select__option'} role="option" type="button" onclick={() => behavior.setSelection(multiple ? ((Array.isArray(behavior.selection) ? behavior.selection : behavior.selection == null ? [] : [behavior.selection]).includes(item.value) ? (Array.isArray(behavior.selection) ? behavior.selection : behavior.selection == null ? [] : [behavior.selection]).filter((v) => v !== item.value) : [...(Array.isArray(behavior.selection) ? behavior.selection : behavior.selection == null ? [] : [behavior.selection]), item.value]) : item.value)} onkeydown={(e) => behavior.handleOptionKeydown(e, item.value)} tabindex="-1" aria-selected={(Array.isArray(behavior.selection) ? behavior.selection.includes(item.value) : item.value === behavior.selection)} data-value={item.value} disabled={item.disabled} aria-disabled={item.disabled}>
        <span>{item.label}</span>
      </button>
      {/each}
    </div>
    {#if empty}
    <div class={'select__emptyState'}></div>
    {/if}
  </div>
  {/if}
</div>
