<script setup lang="ts">
// @generated:start imports
import { computed, useId } from "vue";
import { useDialog } from "./useDialog.js";
import { canActivateInteraction } from "../../primitives/interaction.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
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
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  open: undefined,
  defaultOpen: undefined,
  modal: true,
  size: "md",
  dismissible: true,
  closeOnEscape: true,
  closeOnBackdropClick: true,
});
// @generated:end

// @generated:start hook
const behavior = useDialog({
  open: () => props.open,
  defaultOpen: props.defaultOpen,
  onOpenChange: props.onOpenChange,
  closeOnEscape: props.closeOnEscape,
  closeOnBackdropClick: props.closeOnBackdropClick,
  initialFocus: () => props.initialFocus,
  returnFocus: () => props.returnFocus,
  modal: () => props.modal,
});
function bindInteractionPanel(element: unknown): void { behavior.panelRef.value = element instanceof HTMLElement ? element : null; }
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "dialog",
  props.size ? `dialog--${props.size}` : null,
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
    <div :class="classNames" :data-testid="props.dataTestid" data-fsds-component="dialog" data-fsds-box="">
      <div v-if="behavior.openness.value" :class="'dialog__backdrop'" aria-hidden="true" @click.self="props.closeOnBackdropClick !== false && behavior.setOpenness(false)"></div>
      <div v-if="behavior.openness.value" :class="'dialog__modal'" :ref="bindInteractionPanel" role="dialog" :aria-modal="props.modal" :aria-label="props.ariaLabel" :aria-labelledby="[$slots.title && !props.ariaLabel ? `${instanceId}-title` : null, props.ariaLabelledby].filter(Boolean).join(' ') || undefined" :aria-describedby="[`${instanceId}-body`, props.ariaDescribedby].filter(Boolean).join(' ') || undefined">
        <div :class="'dialog__header'">
          <h2 :class="'dialog__title'" :id="`${instanceId}-title`">
            <slot name="title" />
          </h2>
          <button :class="'dialog__closeButton'" type="button" aria-label="Close dialog" @click="(e: MouseEvent) => { if (canActivateInteraction(e, false)) behavior.setOpenness(false); }"></button>
        </div>
        <div :class="'dialog__body'" :id="`${instanceId}-body`">
          <slot />
        </div>
        <div :class="'dialog__footer'">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
