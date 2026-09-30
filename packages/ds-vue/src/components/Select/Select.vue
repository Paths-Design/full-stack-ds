<script setup lang="ts">
// @generated:start imports
import { computed, useId } from "vue";
import { useSelect } from "./useSelect.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectSize = "sm" | "md" | "lg";
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
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  options: () => ([{"value":"alpha","label":"Alpha"},{"value":"beta","label":"Beta"},{"value":"gamma","label":"Gamma"}]),
  defaultValue: () => ("beta"),
  open: undefined,
  defaultOpen: true,
  multiple: undefined,
  disabled: undefined,
  triggerLabel: "Select an option",
  size: "md",
  searchable: undefined,
  empty: undefined,
  placeholder: "Select an option",
  searchLabel: "Search options",
});
// @generated:end

// @generated:start hook
const behavior = useSelect({
  value: () => props.value,
  defaultValue: props.defaultValue,
  onChange: props.onChange,
  open: () => props.open,
  defaultOpen: props.defaultOpen,
  onOpenChange: props.onOpenChange,
  multiple: () => props.multiple,
});
function bindInteractionAnchor(element: unknown): void { behavior.anchorRef.value = element instanceof HTMLElement ? element : null; }
function bindInteractionPanel(element: unknown): void { behavior.panelRef.value = element instanceof HTMLElement ? element : null; }
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "select",
  props.size ? `select--${props.size}` : null,
  props.position ? `select--${props.position}` : null,
  behavior.open.value ? "select--open" : null,
  props.disabled ? "select--disabled" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @generated:start fieldAssociation
const instanceId = useId();
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" role="combobox" aria-haspopup="listbox" :aria-label="props.triggerLabel" :aria-expanded="behavior.open.value" :aria-disabled="props.disabled" :aria-controls="props.open ? `${instanceId}-content` : undefined" :data-testid="props.dataTestid" data-fsds-component="select" data-fsds-box="">
    <button :class="'select__trigger'" :ref="bindInteractionAnchor" type="button" @click="() => behavior.setOpen(!behavior.open.value)" @keydown="behavior.handleTriggerKeydown" :disabled="props.disabled" :aria-label="props.triggerLabel" :aria-expanded="behavior.open.value" :aria-controls="props.open ? `${instanceId}-content` : undefined">
      <span :class="'select__text'">
        {{ ((props.options || []).filter(option => (Array.isArray(behavior.selection.value) ? behavior.selection.value : [behavior.selection.value]).includes(option.value)).map(option => option.label).join(', ') || props.placeholder) }}
      </span>
    </button>
    <div v-if="behavior.open.value" :class="'select__content'" :ref="bindInteractionPanel" role="listbox" @keydown="behavior.handleContentKeydown" tabindex="-1" :id="`${instanceId}-content`">
      <div v-if="props.searchable" :class="'select__search'">
        <input :class="'select__searchInput'" type="text" :aria-label="props.searchLabel" :disabled="props.disabled" />
      </div>
      <div :class="'select__options'">
        <button v-for="(item, index) in (props.options ?? [])" :key="index" :class="'select__option'" role="option" type="button" @click="() => behavior.setSelection(props.multiple ? ((Array.isArray(behavior.selection.value) ? behavior.selection.value : behavior.selection.value == null ? [] : [behavior.selection.value]).includes(item.value) ? (Array.isArray(behavior.selection.value) ? behavior.selection.value : behavior.selection.value == null ? [] : [behavior.selection.value]).filter((v) => v !== item.value) : [...(Array.isArray(behavior.selection.value) ? behavior.selection.value : behavior.selection.value == null ? [] : [behavior.selection.value]), item.value]) : item.value)" @keydown="(e) => behavior.handleOptionKeydown(e, item.value)" tabindex="-1" :aria-selected="(Array.isArray(behavior.selection.value) ? behavior.selection.value.includes(item.value) : item.value === behavior.selection.value)" :data-value="item.value" :disabled="item.disabled" :aria-disabled="item.disabled">
          <span>
            {{ item.label }}
          </span>
        </button>
      </div>
      <div v-if="props.empty" :class="'select__emptyState'"></div>
    </div>
  </div>
</template>
