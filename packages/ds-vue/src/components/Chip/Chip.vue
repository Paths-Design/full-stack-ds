<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import Button from "../Button/Button.vue";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type ChipType = "button" | "submit" | "reset";
export type ChipVariant = "default" | "selected" | "dismissible";
export type ChipSize = "small" | "medium" | "large";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  type?: ChipType;
  variant?: ChipVariant;
  size?: ChipSize;
  disabled?: boolean;
  icon?: unknown;
  title?: string;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  onClick?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  disabled: undefined,
  ariaExpanded: undefined,
  ariaPressed: undefined,
  dismissible: undefined,
});
const ChipMessages = { dismiss: "Remove" };
const fsdsMessages = useFsdsMessages("Chip", ChipMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { dismissLabel: "dismiss" });
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "chip",
  props.variant ? `chip--${props.variant}` : null,
  props.size ? `chip--${props.size}` : null,
  props.disabled ? "chip--disabled" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <span :class="classNames" :data-testid="props.dataTestid" data-fsds-component="chip" data-fsds-box="">
    <Button :class="'chip__action'" variant="ghost" @click="props.onClick?.()" :type="props.type" :disabled="props.disabled" :ariaLabel="props.ariaLabel" :ariaExpanded="props.ariaExpanded" :ariaPressed="props.ariaPressed">
      <span v-if="props.icon" :class="'chip__icon'" aria-hidden="true">
        {{ props.icon }}
      </span>
      <span :class="'chip__text'">
        <slot />
      </span>
    </Button>
    <Button v-if="props.dismissible" :class="'chip__dismiss'" type="button" variant="ghost" @click="props.onDismiss?.()" :disabled="props.disabled" :ariaLabel="props.dismissLabel" />
  </span>
</template>
