<script lang="ts">
// @generated:start imports
import { useShuttle } from "./useShuttle.svelte.js";
import { createReactiveTransferList } from "../../primitives/transfer-list.svelte.js";
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start props
interface Props {
  ariaLabel?: string;
  options?: string[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  class?: string;
}

let { ariaLabel, options = ["alpha","beta","gamma","delta","epsilon"], value, defaultValue = [], onValueChange, class: className }: Props = $props();
const ShuttleMessages = { availableLabel: "Available", selectedLabel: "Selected", add: "Add", remove: "Remove" };
const fsdsMessages = useFsdsMessages("Shuttle", ShuttleMessages);
// @generated:end

// @generated:start hook
const behavior = useShuttle({
  value: () => value,
  defaultValue: () => defaultValue,
  onValueChange: () => onValueChange,
});
const transfer = createReactiveTransferList(() => ({ options: options, value: behavior.selection, onValueChange: behavior.setSelection }));
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "shuttle",
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} role="group" aria-label={ariaLabel} data-fsds-component="shuttle" data-fsds-box="">
  <ul class={'shuttle__list'} role="listbox" aria-multiselectable="true" data-side="available" onkeydown={transfer.keydown} aria-label={fsdsMessages.current.availableLabel}>
    {#each (transfer.state.available ?? []) as item, index (index)}
    <li class={'shuttle__item'} role="option" onclick={() => transfer.toggle(item)} aria-selected={item.marked} tabindex={item.tabIndex} data-value={item.key}>
      <span>{item.label}</span>
    </li>
    {/each}
  </ul>
  <div class={'shuttle__controls'}>
    <button class={'shuttle__add'} type="button" onclick={transfer.add} disabled={transfer.state.addDisabled}>{fsdsMessages.current.add}</button>
    <button class={'shuttle__remove'} type="button" onclick={transfer.remove} disabled={transfer.state.removeDisabled}>{fsdsMessages.current.remove}</button>
  </div>
  <ul class={'shuttle__list'} role="listbox" aria-multiselectable="true" data-side="selected" onkeydown={transfer.keydown} aria-label={fsdsMessages.current.selectedLabel}>
    {#each (transfer.state.selected ?? []) as item, index (index)}
    <li class={'shuttle__item'} role="option" onclick={() => transfer.toggle(item)} aria-selected={item.marked} tabindex={item.tabIndex} data-value={item.key}>
      <span>{item.label}</span>
    </li>
    {/each}
  </ul>
</div>
