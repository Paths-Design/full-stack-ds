<script setup lang="ts">
// @generated:start imports
import { toggleInteractionItem } from "../../primitives/interaction.js";
import { computed, ref } from "vue";
import { useAccordion, provideAccordionContext } from "./useAccordion.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
let _accordionIdCounter = 0;

export type AccordionType = "single" | "multiple";
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
  idBase?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  type: "single",
  collapsible: false,
});
// @generated:end

// @generated:start hook
const { openness, setOpenness } = useAccordion({
  value: () => props.value,
  defaultValue: props.defaultValue,
  onValueChange: (...args) => props.onValueChange?.(...args),
});

const idBase = props.idBase ?? `accordion-${++_accordionIdCounter}`;
const rootRef = ref<HTMLElement | null>(null);

function isItemOpen(itemValue: string): boolean {
  const v = openness.value;
  return Array.isArray(v) ? v.includes(itemValue) : v === itemValue;
}

function toggleItem(itemValue: string): void {
  const v = openness.value;
  setOpenness(toggleInteractionItem(v, itemValue, props.type === "multiple", Boolean(props.collapsible)));
}

function handleKeyDown(e: KeyboardEvent): void {
  const key = e.key;
  if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") {
    return;
  }
  const root = rootRef.value;
  if (!root) return;
  const triggers = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-disclosure-trigger]"),
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
  openness,
  toggleItem,
  isItemOpen,
  get type() { return props.type ?? "single"; },
  get collapsible() { return props.collapsible ?? false; },
  get disabled() { return props.disabled ?? false; },
  idBase,
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "accordion",
  props.type ? `accordion--${props.type}` : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div
    data-fsds-component="accordion" data-fsds-box=""
    ref="rootRef"
    :class="classNames"
    :data-testid="props.dataTestid"
    @keydown="handleKeyDown"
  >
    <slot />
  </div>
</template>
