<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useShuttle } from "./useShuttle.js";
import { useTransferList } from "../../primitives/hooks/useTransferList.js";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  ariaLabel?: string;
  options?: string[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  options: () => (["alpha","beta","gamma","delta","epsilon"]),
  defaultValue: () => ([]),
});
const ShuttleMessages = { availableLabel: "Available", selectedLabel: "Selected", add: "Add", remove: "Remove" };
const fsdsMessages = useFsdsMessages("Shuttle", ShuttleMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, {  });
// @generated:end

// @generated:start hook
const behavior = useShuttle({
  value: () => props.value,
  defaultValue: props.defaultValue,
  onValueChange: (...args) => props.onValueChange?.(...args),
});
const transfer = useTransferList(() => ({ options: props.options, value: behavior.selection.value, onValueChange: behavior.setSelection }));
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "shuttle",
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" role="group" :aria-label="props.ariaLabel" :data-testid="props.dataTestid" data-fsds-component="shuttle" data-fsds-box="">
    <ul :class="'shuttle__list'" role="listbox" aria-multiselectable="true" data-side="available" @keydown="transfer.keydown" :aria-label="fsdsMessages.availableLabel">
      <li v-for="(item, index) in (transfer.state.available ?? [])" :key="index" :class="'shuttle__item'" role="option" @click="() => transfer.toggle(item)" :aria-selected="item.marked" :tabindex="item.tabIndex" :data-value="item.key">
        <span>
          {{ item.label }}
        </span>
      </li>
    </ul>
    <div :class="'shuttle__controls'">
      <button :class="'shuttle__add'" type="button" @click="transfer.add" :disabled="transfer.state.addDisabled">
        {{ fsdsMessages.add }}
      </button>
      <button :class="'shuttle__remove'" type="button" @click="transfer.remove" :disabled="transfer.state.removeDisabled">
        {{ fsdsMessages.remove }}
      </button>
    </div>
    <ul :class="'shuttle__list'" role="listbox" aria-multiselectable="true" data-side="selected" @keydown="transfer.keydown" :aria-label="fsdsMessages.selectedLabel">
      <li v-for="(item, index) in (transfer.state.selected ?? [])" :key="index" :class="'shuttle__item'" role="option" @click="() => transfer.toggle(item)" :aria-selected="item.marked" :tabindex="item.tabIndex" :data-value="item.key">
        <span>
          {{ item.label }}
        </span>
      </li>
    </ul>
  </div>
</template>
