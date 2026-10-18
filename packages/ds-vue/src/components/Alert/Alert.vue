<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import Button from "../Button/Button.vue";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type AlertIntent = "info" | "success" | "warning" | "danger";
export type AlertLevel = "inline" | "section" | "page";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  intent?: AlertIntent;
  level?: AlertLevel;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  icon?: unknown;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  dismissible: undefined,
});
const AlertMessages = { dismiss: "Dismiss" };
const fsdsMessages = useFsdsMessages("Alert", AlertMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { dismissLabel: "dismiss" });
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "alert",
  props.intent ? `alert--${props.intent}` : null,
  props.level ? `alert--${props.level}` : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" role="alert" :data-testid="props.dataTestid" data-fsds-component="alert" data-fsds-box="">
    <span v-if="props.icon" :class="'alert__icon'" aria-hidden="true">
      {{ props.icon }}
    </span>
    <slot />
    <Button v-if="props.dismissible" :class="'alert__dismiss'" type="button" @click="props.onDismiss?.()" :ariaLabel="props.dismissLabel" />
  </div>
</template>
