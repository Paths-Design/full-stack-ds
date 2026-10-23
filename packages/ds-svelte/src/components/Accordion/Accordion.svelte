<script module lang="ts">
// @generated:start publicTypes
export type AccordionType = "single" | "multiple";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { toggleInteractionItem } from "../../primitives/interaction.js";
import { useAccordion, provideAccordionContext } from "./useAccordion.svelte.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
let _accordionIdCounter = 0;
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  type?: AccordionType;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  disabled?: boolean;
  class?: string;
  "data-testid"?: string;
  children?: import('svelte').Snippet;
}

let {
  type = "single",
  value,
  defaultValue,
  onValueChange,
  collapsible = false,
  disabled,
  class: className,
  "data-testid": dataTestid,
  children,
}: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useAccordion({
  value: () => value,
  defaultValue: () => defaultValue,
  onValueChange: () => onValueChange,
});

const idBase = `accordion-${++_accordionIdCounter}`;
let rootRef: HTMLElement | null = $state(null);

function isItemOpen(itemValue: string): boolean {
  const v = behavior.openness;
  return Array.isArray(v) ? v.includes(itemValue) : v === itemValue;
}

function toggleItem(itemValue: string): void {
  const v = behavior.openness;
  behavior.setOpenness(toggleInteractionItem(v, itemValue, type === "multiple", Boolean(collapsible)));
}

function handleKeyDown(e: KeyboardEvent): void {
  const key = e.key;
  if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") {
    return;
  }
  if (!rootRef) return;
  const triggers = Array.from(
    rootRef.querySelectorAll<HTMLButtonElement>("[data-disclosure-trigger]"),
  ).filter((el) => !el.disabled);
  if (triggers.length === 0) return;
  const currentIndex = triggers.indexOf(document.activeElement as HTMLButtonElement);
  let nextIndex = currentIndex;
  if (key === "ArrowDown") {
    nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % triggers.length;
  } else if (key === "ArrowUp") {
    nextIndex = currentIndex < 0 ? triggers.length - 1 : (currentIndex - 1 + triggers.length) % triggers.length;
  } else if (key === "Home") {
    nextIndex = 0;
  } else {
    nextIndex = triggers.length - 1;
  }
  e.preventDefault();
  triggers[nextIndex]?.focus();
}

provideAccordionContext({
  get openness() { return behavior.openness; },
  toggleItem,
  isItemOpen,
  get type() { return type ?? "single"; },
  get collapsible() { return collapsible ?? false; },
  get disabled() { return disabled ?? false; },
  idBase,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "accordion",
    type ? `accordion--${type}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div data-fsds-component="accordion" data-fsds-box="" bind:this={rootRef} class={classes} data-testid={dataTestid} onkeydown={handleKeyDown}>
  {@render children?.()}
</div>
