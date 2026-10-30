<script module lang="ts">
// @generated:start publicTypes
export type AlertNoticeStatus = "info" | "success" | "warning" | "error";
export type AlertNoticeLevel = "page" | "section" | "inline";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

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
  children?: import('svelte').Snippet;
}

let { status, level, dismissible, onDismiss, dismissLabel: dismissLabelProp, icon, class: className, children }: Props = $props();
const AlertNoticeMessages = { dismiss: "Dismiss" };
const fsdsMessages = useFsdsMessages("AlertNotice", AlertNoticeMessages);
const dismissLabel = $derived(dismissLabelProp ?? fsdsMessages.current.dismiss);
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "alert-notice",
    status ? `alert-notice--${status}` : null,
    level ? `alert-notice--${level}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} role="alert" data-fsds-component="alert-notice" data-fsds-box="">
  {#if icon}
  <span class={'alert-notice__icon'} aria-hidden="true">{icon}</span>
  {/if}
  {@render children?.()}
  {#if dismissible}
  <button class={'alert-notice__dismiss'} type="button" onclick={onDismiss} aria-label={dismissLabel}></button>
  {/if}
</div>
