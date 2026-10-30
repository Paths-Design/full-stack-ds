<script setup lang="ts">
// @generated:start imports
import { computed, useId } from "vue";
import { useSheet } from "./useSheet.js";
import { canActivateInteraction } from "../../primitives/interaction.js";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SheetSide = "top" | "right" | "bottom" | "left";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: SheetSide;
  modal?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  open: undefined,
  defaultOpen: undefined,
  side: "right",
  modal: true,
});
const SheetMessages = { close: "Close sheet" };
const fsdsMessages = useFsdsMessages("Sheet", SheetMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, {  });
// @generated:end

// @generated:start hook
const behavior = useSheet({
  open: () => props.open,
  defaultOpen: props.defaultOpen,
  onOpenChange: (...args) => props.onOpenChange?.(...args),
  modal: () => props.modal,
});
function bindInteractionPanel(element: unknown): void { behavior.panelRef.value = element instanceof HTMLElement ? element : null; }
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "sheet",
  props.side ? `sheet--${props.side}` : null,
  behavior.openness.value ? "sheet--open" : null,
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
    <div :class="classNames" :data-testid="props.dataTestid" data-fsds-component="sheet" data-fsds-box="">
      <div v-if="behavior.openness.value" :class="'sheet__overlay'" aria-hidden="true" @click.self="behavior.setOpenness(false)"></div>
      <div v-if="behavior.openness.value" :class="'sheet__content'" :ref="bindInteractionPanel" role="dialog" :aria-modal="props.modal" :aria-label="props.ariaLabel" :data-side="props.side" :aria-labelledby="[$slots.title && !props.ariaLabel ? `${instanceId}-title` : null, props.ariaLabelledby].filter(Boolean).join(' ') || undefined" :aria-describedby="[$slots.description ? `${instanceId}-description` : null, props.ariaDescribedby].filter(Boolean).join(' ') || undefined">
        <div :class="'sheet__header'">
          <h2 :class="'sheet__title'" :id="`${instanceId}-title`">
            <slot name="title" />
          </h2>
          <p :class="'sheet__description'" :id="`${instanceId}-description`">
            <slot name="description" />
          </p>
          <button :class="'sheet__close'" type="button" @click="(e: MouseEvent) => { if (canActivateInteraction(e, false)) behavior.setOpenness(false); }" :aria-label="fsdsMessages.close"></button>
        </div>
        <div :class="'sheet__body'">
          <slot />
        </div>
        <div :class="'sheet__footer'">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
