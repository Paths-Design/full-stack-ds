<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type AlertNoticeStatus = "info" | "success" | "warning" | "error";
export type AlertNoticeLevel = "page" | "section" | "inline";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  status?: AlertNoticeStatus;
  level?: AlertNoticeLevel;
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
const AlertNoticeMessages = { dismiss: "Dismiss" };
const fsdsMessages = useFsdsMessages("AlertNotice", AlertNoticeMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { dismissLabel: "dismiss" });
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "alert-notice",
  props.status ? `alert-notice--${props.status}` : null,
  props.level ? `alert-notice--${props.level}` : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" role="alert" :data-testid="props.dataTestid" data-fsds-component="alert-notice" data-fsds-box="">
    <span v-if="props.icon" :class="'alert-notice__icon'" aria-hidden="true">
      {{ props.icon }}
    </span>
    <slot />
    <button v-if="props.dismissible" :class="'alert-notice__dismiss'" type="button" @click="props.onDismiss?.()" :aria-label="props.dismissLabel"></button>
  </div>
</template>
