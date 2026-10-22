<script setup lang="ts">
// @generated:start imports
import { computed, useId } from "vue";
import { useDetails } from "./useDetails.js";
import Icon from "../Icon/Icon.vue";
import { canActivateInteraction } from "../../primitives/interaction.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type DetailsVariant = "default" | "inline" | "compact";
export type DetailsIcon = "left" | "right" | "none";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  summary: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  variant?: DetailsVariant;
  icon?: DetailsIcon;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  open: undefined,
  defaultOpen: undefined,
  disabled: undefined,
  variant: "default",
  icon: "left",
});
// @generated:end

// @generated:start hook
const behavior = useDetails({
  open: () => props.open,
  defaultOpen: props.defaultOpen,
  onOpenChange: (...args) => props.onOpenChange?.(...args),
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "details",
  props.variant ? `details--${props.variant}` : null,
  props.icon ? `details--${props.icon}` : null,
  behavior.open.value ? "details--open" : null,
  props.disabled ? "details--disabled" : null,
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
  <details :class="classNames" :open="behavior.open.value" :data-testid="props.dataTestid" data-fsds-component="details" data-fsds-box="">
    <summary :class="'details__summary'" @click="(e: MouseEvent) => { if (canActivateInteraction(e, true)) behavior.setOpen(!behavior.open.value); }" :aria-disabled="props.disabled" :aria-controls="behavior.open.value ? `${instanceId}-content` : undefined">
      <span :class="'details__summaryContent'">
        <Icon :class="'details__icon'" name="chevron-down" size="sm" />
        <span :class="'details__summaryText'">
          {{ props.summary }}
        </span>
      </span>
    </summary>
    <div v-if="behavior.open.value" :class="'details__content'" :id="`${instanceId}-content`">
      <slot />
    </div>
  </details>
</template>
