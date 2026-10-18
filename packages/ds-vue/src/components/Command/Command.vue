<script setup lang="ts">
// @generated:start imports
import { computed, useId } from "vue";
import { useCommand } from "./useCommand.js";
import Icon from "../Icon/Icon.vue";
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
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  searchLabel?: string;
  emptyMessage?: string;
  label?: string;
  shouldFilter?: boolean;
  filter?: ((value: string, search: string) => number) | undefined;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  open: undefined,
  defaultOpen: undefined,
  shouldFilter: true,
});
const CommandMessages = { searchPlaceholder: "Search...", searchLabel: "Search commands", emptyResults: "No results found.", dialogLabel: "Command palette" };
const fsdsMessages = useFsdsMessages("Command", CommandMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { placeholder: "searchPlaceholder", searchLabel: "searchLabel", emptyMessage: "emptyResults", label: "dialogLabel" });
// @generated:end

// @generated:start hook
const behavior = useCommand({
  open: () => props.open,
  defaultOpen: props.defaultOpen,
  onOpenChange: props.onOpenChange,
  search: () => props.search,
  defaultSearch: props.defaultSearch,
  onSearchChange: props.onSearchChange,
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "command",
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
  <Teleport to="body">
    <div :class="classNames" :data-testid="props.dataTestid" data-fsds-component="command" data-fsds-box="">
      <div v-if="behavior.open.value" :class="'command__overlay'" aria-hidden="true" @click.self="behavior.setOpen(false)"></div>
      <div v-if="behavior.open.value" :class="'command__dialog'" role="dialog" aria-modal="true" :aria-label="props.label">
        <div :class="'command__inputWrapper'">
          <Icon :class="'command__searchIcon'" name="search" size="sm" />
          <input :class="'command__input'" type="search" role="combobox" aria-autocomplete="list" @input="(e) => behavior.setSearch((e.target as HTMLInputElement).value)" :aria-expanded="behavior.open.value" :aria-label="props.searchLabel" :placeholder="props.placeholder" :value="behavior.search.value" :id="`${instanceId}-input`" :aria-controls="`${instanceId}-list`" />
        </div>
        <div :class="'command__list'" role="listbox" :id="`${instanceId}-list`" :aria-labelledby="`${instanceId}-input`">
          <div :class="'command__empty'"></div>
          <slot name="items" />
          <div :class="'command__separator'" role="separator" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
