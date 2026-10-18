<script setup lang="ts">
// @generated:start imports
import { computed, shallowRef, type ComponentPublicInstance, useId, watchEffect } from "vue";
import { useWalkthrough } from "./useWalkthrough.js";
import { useAnchoredPosition } from "../../primitives/surfaces/useAnchoredPosition.js";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type WalkthroughStepSpec = { anchor: string; title: string; description?: string };
export type WalkthroughPlacement = "top" | "bottom" | "left" | "right" | "auto";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  steps?: WalkthroughStepSpec[];
  index?: number;
  defaultIndex?: number;
  onStepChange?: (index: number) => void;
  onComplete?: () => void;
  onSkip?: () => void;
  label?: string;
  storageKey?: string;
  autoStart?: boolean;
  closeOnOutsideClick?: boolean;
  placement?: WalkthroughPlacement;
  onPrevious?: () => void;
  onNext?: () => void;
  previousDisabled?: boolean;
  nextLabel?: string;
  progressLabel?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  steps: () => ([{"anchor":"#step-1","title":"Welcome to the tour"},{"anchor":"#step-2","title":"Browse your dashboard"},{"anchor":"#step-3","title":"Configure preferences"}]),
  defaultIndex: 0,
  autoStart: false,
  closeOnOutsideClick: false,
  placement: "auto",
  previousDisabled: false,
});
const WalkthroughMessages = { tourLabel: "Feature tour", skip: "Skip", skipTour: "Skip tour", previous: "Previous", previousStep: "Previous step", next: "Next" };
const fsdsMessages = useFsdsMessages("Walkthrough", WalkthroughMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { label: "tourLabel", nextLabel: "next" });
// @generated:end

// @generated:start hook
const behavior = useWalkthrough({
  index: () => props.index,
  defaultIndex: props.defaultIndex,
  onStepChange: props.onStepChange,
  closeOnOutsideClick: props.closeOnOutsideClick,
});
// @generated:end

// @generated:start anchoredPosition
const anchoredRootEl = shallowRef<HTMLElement | null>(null);
function setAnchoredRootEl(el: Element | ComponentPublicInstance | null): void {
  anchoredRootEl.value = el instanceof HTMLElement ? el : null;
}
const anchorTargetEl = shallowRef<HTMLElement | null>(null);
watchEffect(
  () => {
    const selector = (props.steps ?? [])[behavior.step.value]?.anchor;
    anchorTargetEl.value = selector ? document.querySelector<HTMLElement>(selector) : null;
  },
  { flush: "post" },
);
const anchoredPosition = useAnchoredPosition({
  anchor: () => anchorTargetEl.value,
  content: () => anchoredRootEl.value,
  open: () => true,
  placement: () => props.placement,
  collision: () => "flip-shift",
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "walkthrough",
  props.placement ? `walkthrough--${props.placement}` : null,
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
    <div :class="classNames" role="status" :aria-label="props.label" :data-testid="props.dataTestid" data-fsds-component="walkthrough" data-fsds-box="" :ref="setAnchoredRootEl" :data-placement="anchoredPosition.placement" :style="{ position: 'fixed', top: `${anchoredPosition.top}px`, left: `${anchoredPosition.left}px`, visibility: anchoredPosition.ready ? 'visible' : 'hidden' }">
      <div :class="'walkthrough__content'" role="group" :aria-labelledby="$slots.title ? `${instanceId}-title` : undefined" :aria-describedby="$slots.description ? `${instanceId}-description` : undefined">
        <h3 :class="'walkthrough__title'" :aria-label="props.label" :id="`${instanceId}-title`">
          <slot name="title" />
        </h3>
        <p :class="'walkthrough__description'" :id="`${instanceId}-description`">
          <slot name="description" />
        </p>
      </div>
      <div :class="'walkthrough__controls'">
        <button :class="'walkthrough__skip'" type="button" @click="props.onSkip?.()" :aria-label="fsdsMessages.skipTour">
          {{ fsdsMessages.skip }}
        </button>
        <button :class="'walkthrough__prev'" type="button" @click="props.onPrevious?.()" :aria-label="fsdsMessages.previousStep" :disabled="props.previousDisabled">
          {{ fsdsMessages.previous }}
        </button>
        <div :class="'walkthrough__dots'">
          <button v-for="(item, index) in (props.steps ?? [])" :key="index" :class="'walkthrough__dot'" type="button" @click="() => behavior.setStep(index)" :aria-label="item.title" :data-step-index="index"></button>
        </div>
        <span :class="'walkthrough__counter'">
          {{ props.progressLabel }}
        </span>
        <button :class="'walkthrough__next'" type="button" @click="props.onNext?.()" :aria-label="props.nextLabel">
          {{ props.nextLabel }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
