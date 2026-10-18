<script lang="ts">
// @generated:start imports
import { useWalkthrough } from "./useWalkthrough.svelte.js";
import { portal } from "../../primitives/index.js";
import { createAnchoredPosition, type AnchoredPlacement } from "../../primitives/surfaces/createAnchoredPosition.svelte.js";
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
type WalkthroughStepSpec = { anchor: string; title: string; description?: string };
type WalkthroughPlacement = "top" | "bottom" | "left" | "right" | "auto";
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
  description?: import('svelte').Snippet;
  title?: import('svelte').Snippet;
}

let { steps = [{"anchor":"#step-1","title":"Welcome to the tour"},{"anchor":"#step-2","title":"Browse your dashboard"},{"anchor":"#step-3","title":"Configure preferences"}], index, defaultIndex = 0, onStepChange, onComplete, onSkip, label: labelProp, storageKey, autoStart = false, closeOnOutsideClick = false, placement = "auto", onPrevious, onNext, previousDisabled = false, nextLabel: nextLabelProp, progressLabel, class: className, description, title }: Props = $props();
const WalkthroughMessages = { tourLabel: "Feature tour", skip: "Skip", skipTour: "Skip tour", previous: "Previous", previousStep: "Previous step", next: "Next" };
const fsdsMessages = useFsdsMessages("Walkthrough", WalkthroughMessages);
const label = $derived(labelProp ?? fsdsMessages.current.tourLabel);
const nextLabel = $derived(nextLabelProp ?? fsdsMessages.current.next);
// @generated:end

// @generated:start hook
const behavior = useWalkthrough({
  index: () => index,
  defaultIndex: () => defaultIndex,
  onStepChange: () => onStepChange,
  closeOnOutsideClick: () => closeOnOutsideClick,
});
// @generated:end

// @generated:start anchoredPosition
let anchoredRootEl = $state<HTMLElement | null>(null);
let anchorTargetEl = $state<HTMLElement | null>(null);
$effect(() => {
  const selector = (steps ?? [])[behavior.step]?.anchor;
  anchorTargetEl = selector ? document.querySelector<HTMLElement>(selector) : null;
});
const anchoredPosition = createAnchoredPosition({
  anchor: () => anchorTargetEl,
  content: () => anchoredRootEl,
  open: () => true,
  placement: () => (placement) as AnchoredPlacement | "auto",
  collision: () => "flip-shift",
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "walkthrough",
    placement ? `walkthrough--${placement}` : null,
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

<div class={classes} role="status" aria-label={label} data-fsds-component="walkthrough" data-fsds-box="" use:portal={{ enabled: true }} bind:this={anchoredRootEl} data-placement={anchoredPosition.state.placement} style="position: fixed; top: {anchoredPosition.state.top}px; left: {anchoredPosition.state.left}px; visibility: {anchoredPosition.state.ready ? 'visible' : 'hidden'};">
  <div class={'walkthrough__content'} role="group" aria-labelledby={title ? `${instanceId}-title` : undefined} aria-describedby={description ? `${instanceId}-description` : undefined}>
    <h3 class={'walkthrough__title'} aria-label={label} id={`${instanceId}-title`}>
      {@render title?.()}
    </h3>
    <p class={'walkthrough__description'} id={`${instanceId}-description`}>
      {@render description?.()}
    </p>
  </div>
  <div class={'walkthrough__controls'}>
    <button class={'walkthrough__skip'} type="button" onclick={onSkip} aria-label={fsdsMessages.current.skipTour}>{fsdsMessages.current.skip}</button>
    <button class={'walkthrough__prev'} type="button" onclick={onPrevious} aria-label={fsdsMessages.current.previousStep} disabled={previousDisabled}>{fsdsMessages.current.previous}</button>
    <div class={'walkthrough__dots'}>
      {#each (steps ?? []) as item, index (index)}
      <button class={'walkthrough__dot'} type="button" onclick={() => behavior.setStep(index)} aria-label={item.title} data-step-index={index}></button>
      {/each}
    </div>
    <span class={'walkthrough__counter'}>{progressLabel}</span>
    <button class={'walkthrough__next'} type="button" onclick={onNext} aria-label={nextLabel}>{nextLabel}</button>
  </div>
</div>
