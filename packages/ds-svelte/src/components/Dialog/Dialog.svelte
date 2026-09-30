<script lang="ts">
// @generated:start imports
import { canActivateInteraction } from "../../primitives/interaction.js";
import { useDialog } from "./useDialog.svelte.js";
import { portal } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  size?: DialogSize;
  dismissible?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  initialFocus?: string;
  returnFocus?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  class?: string;
  children?: import('svelte').Snippet;
  footer?: import('svelte').Snippet;
  title?: import('svelte').Snippet;
}

let { open, defaultOpen, onOpenChange, modal = true, size = "md", dismissible = true, closeOnEscape = true, closeOnBackdropClick = true, initialFocus, returnFocus, ariaLabel, ariaLabelledby, ariaDescribedby, class: className, children, footer, title }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useDialog({
  open: () => open,
  defaultOpen: () => defaultOpen,
  onOpenChange: () => onOpenChange,
  closeOnEscape: () => closeOnEscape,
  closeOnBackdropClick: () => closeOnBackdropClick,
  initialFocus: () => initialFocus,
  returnFocus: () => returnFocus,
  modal: () => modal,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "dialog",
    size ? `dialog--${size}` : null,
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

<div class={classes} data-fsds-component="dialog" data-fsds-box="" use:portal={{ enabled: true }}>
  {#if behavior.openness}
  <div class={'dialog__backdrop'} aria-hidden="true" onclick={(e) => { if (e.target === e.currentTarget) { closeOnBackdropClick !== false && behavior.setOpenness(false); } }}></div>
  {/if}
  {#if behavior.openness}
  <div class={'dialog__modal'} bind:this={behavior.panelRef.el} role="dialog" aria-modal={modal} aria-label={ariaLabel} aria-labelledby={[title && !ariaLabel ? `${instanceId}-title` : null, ariaLabelledby].filter(Boolean).join(' ') || undefined} aria-describedby={[`${instanceId}-body`, ariaDescribedby].filter(Boolean).join(' ') || undefined}>
    <div class={'dialog__header'}>
      <h2 class={'dialog__title'} id={`${instanceId}-title`}>
        {@render title?.()}
      </h2>
      <button class={'dialog__closeButton'} type="button" aria-label="Close dialog" onclick={(e) => { if (canActivateInteraction(e, false)) behavior.setOpenness(false); }}></button>
    </div>
    <div class={'dialog__body'} id={`${instanceId}-body`}>
      {@render children?.()}
    </div>
    <div class={'dialog__footer'}>
      {@render footer?.()}
    </div>
  </div>
  {/if}
</div>
