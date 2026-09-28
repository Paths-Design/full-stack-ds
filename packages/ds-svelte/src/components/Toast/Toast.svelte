<script lang="ts">
// @generated:start imports
import { useToast } from "./useToast.svelte.js";
import { createAutoDismiss } from "../../primitives/index.js";
import { portal } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
type ToastVariant = "info" | "success" | "warning" | "error";
type ToastPoliteness = "polite" | "assertive";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  variant?: ToastVariant;
  politeness?: ToastPoliteness;
  duration?: number | null;
  class?: string;
  children?: import('svelte').Snippet;
  action?: import('svelte').Snippet;
}

let { open, onOpenChange, title, variant = "info", politeness = "polite", duration, class: className, children, action }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useToast({
  open: () => open,
  onOpenChange: () => onOpenChange,
});

const autoDismiss = createAutoDismiss({
  open: () => Boolean(behavior.open),
  durationMs: () => duration === undefined ? 6000 : duration,
    reducedMotionSteps: 10,
  onDismiss: () => behavior.setOpen(false),
});
$effect(() => {
  autoDismiss.sync();
});
$effect(() => () => autoDismiss.destroy());
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "toast",
    variant ? `toast--${variant}` : null,
    politeness ? `toast--${politeness}` : null,
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

<div class={classes} aria-label="Notifications" aria-live={politeness} data-fsds-component="toast" data-fsds-box="" use:portal={{ enabled: true }} onpointerenter={autoDismiss.pauseListeners.onpointerenter} onpointerleave={autoDismiss.pauseListeners.onpointerleave} onfocusin={autoDismiss.pauseListeners.onfocusin} onfocusout={autoDismiss.pauseListeners.onfocusout} role="region">
  {#if behavior.open}
  <div class={'toast__item'} role="status" aria-labelledby={title ? `${instanceId}-title` : undefined}>
    <div class={'toast__row'}>
      {#if title}
      <div class={'toast__title'} id={`${instanceId}-title`}>{title}</div>
      {/if}
      <div class={'toast__description'}>
        {@render children?.()}
      </div>
      {#if action}
      <div class={'toast__action'}>
        {@render action?.()}
      </div>
      {/if}
      <button class={'toast__close'} type="button" aria-label="Dismiss" onclick={() => behavior.setOpen(!behavior.open)}></button>
    </div>
    <div class={'toast__progress'} hidden use:autoDismiss.bindProgress aria-hidden="true"></div>
  </div>
  {/if}
</div>
