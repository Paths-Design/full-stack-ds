<script setup lang="ts">
// @generated:start imports
import { ref, computed } from "vue";
import { isRtl } from "../../primitives/direction/direction.js";
import { useTabsContext } from "./useTabs.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start props
interface Props {
  class?: string;
  dataTestid?: string;
}

const props = defineProps<Props>();
// @generated:end

// @generated:start classes
const classNames = computed(() =>
  ["tabs__list", props.class].filter(Boolean).join(" "),
);
// @generated:end

// @generated:start trailing
const ctx = useTabsContext();

const listRef = ref<HTMLElement | null>(null);

function handleKeyDown(e: KeyboardEvent): void {
  const tabs = ctx.registeredTabs.value;
  if (tabs.length === 0) return;
  const currentIndex = tabs.indexOf(ctx.activeTab.value);
  const isHorizontal = ctx.orientation !== "vertical";
  // A horizontal list follows the inline direction: the arrow pointing
  // toward the inline end moves to the next tab.
  const rtl = isRtl(e.currentTarget);
  const towardEnd = rtl ? e.key === "ArrowLeft" : e.key === "ArrowRight";
  const towardStart = rtl ? e.key === "ArrowRight" : e.key === "ArrowLeft";
  let nextIndex = currentIndex;

  if (
    (isHorizontal && towardEnd) ||
    (!isHorizontal && e.key === "ArrowDown")
  ) {
    e.preventDefault();
    nextIndex = ctx.loop
      ? (currentIndex + 1) % tabs.length
      : Math.min(currentIndex + 1, tabs.length - 1);
  } else if (
    (isHorizontal && towardStart) ||
    (!isHorizontal && e.key === "ArrowUp")
  ) {
    e.preventDefault();
    nextIndex = ctx.loop
      ? (currentIndex - 1 + tabs.length) % tabs.length
      : Math.max(currentIndex - 1, 0);
  } else if (e.key === "Home") {
    e.preventDefault();
    nextIndex = 0;
  } else if (e.key === "End") {
    e.preventDefault();
    nextIndex = tabs.length - 1;
  } else if (e.key === "Enter" || e.key === " ") {
    if (ctx.activationMode === "manual") {
      e.preventDefault();
      const focusedBtn = listRef.value?.querySelector<HTMLButtonElement>("[role=\"tab\"]:focus");
      if (focusedBtn) {
        const val = focusedBtn.getAttribute("data-value");
        if (val) ctx.setActiveTab(val);
      }
    }
    return;
  } else {
    return;
  }

  const targetValue = tabs[nextIndex];
  if (ctx.activationMode === "automatic") {
    ctx.setActiveTab(targetValue);
  }
  const btn = listRef.value?.querySelector<HTMLButtonElement>(
    `[role="tab"][data-value="${targetValue}"]`,
  );
  btn?.focus();
}
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div
    ref="listRef"
    role="tablist"
    tabindex="-1"
    :class="classNames"
    :data-testid="props.dataTestid"
    :aria-orientation="ctx.orientation"
    @keydown="handleKeyDown"
  >
    <slot />
    <span :class="'tabs__indicator'" aria-hidden="true"></span>
  </div>
</template>
