<script module lang="ts">
// @generated:start publicTypes
export type AlertIntent = "info" | "success" | "warning" | "danger";
export type AlertLevel = "inline" | "section" | "page";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import Button from "../Button/Button.svelte";
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
  intent?: AlertIntent;
  level?: AlertLevel;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  icon?: unknown;
  class?: string;
  children?: import('svelte').Snippet;
}

let { intent, level, dismissible, onDismiss, dismissLabel: dismissLabelProp, icon, class: className, children }: Props = $props();
const AlertMessages = { dismiss: "Dismiss" };
const fsdsMessages = useFsdsMessages("Alert", AlertMessages);
const dismissLabel = $derived(dismissLabelProp ?? fsdsMessages.current.dismiss);
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "alert",
    intent ? `alert--${intent}` : null,
    level ? `alert--${level}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} role="alert" data-fsds-component="alert" data-fsds-box="">
  {#if icon}
  <span class={'alert__icon'} aria-hidden="true">{icon}</span>
  {/if}
  {@render children?.()}
  {#if dismissible}
  <Button class={'alert__dismiss'} type="button" onClick={onDismiss} ariaLabel={dismissLabel} />
  {/if}
</div>
