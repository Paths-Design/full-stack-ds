<script module lang="ts">
// @generated:start publicTypes
export type FieldStatus = "idle" | "validating" | "valid" | "invalid";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { useField } from "./useField.svelte.js";
import { provideFieldAssociation } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  name: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  validate?: ((value: string, context: { name: string; touched: boolean; dirty: boolean }) => string | string[] | null | Promise<string | string[] | null>);
  status?: FieldStatus;
  validating?: boolean;
  class?: string;
  control?: import('svelte').Snippet;
  error?: import('svelte').Snippet;
  help?: import('svelte').Snippet;
  label?: import('svelte').Snippet;
  validatingIndicator?: import('svelte').Snippet;
}

let { name, id, required, disabled, readOnly, value, defaultValue, onChange, validate, status, validating, class: className, control, error, help, label, validatingIndicator }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useField({
  value: () => value,
  defaultValue: () => defaultValue,
  onChange: () => onChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "field",
    status ? `field--${status}` : null,
    disabled ? "field--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @generated:start fieldAssociation
const instanceId = $props.id();
const fieldAssociationValue = $derived({
  controlId: `${instanceId}-control`,
  describedBy: [help && status !== 'invalid' ? `${instanceId}-help` : null, error && status === 'invalid' ? `${instanceId}-error` : null].filter(Boolean).join(' ') || undefined,
});
provideFieldAssociation(() => fieldAssociationValue);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} aria-labelledby={label ? `${instanceId}-label` : undefined} data-fsds-component="field" data-fsds-box="" role="group">
  <div class={'field__header'}>
    <label class={'field__label'} id={`${instanceId}-label`} for={`${instanceId}-control`}>
      {@render label?.()}
    </label>
  </div>
  <div class={'field__control'}>
    {@render control?.()}
  </div>
  <div class={'field__meta'}>
    <span class={'field__help'} id={`${instanceId}-help`}>
      {@render help?.()}
    </span>
    <span class={'field__error'} id={`${instanceId}-error`}>
      {@render error?.()}
    </span>
    {#if validating}
    <span class={'field__validatingIndicator'}>
      {@render validatingIndicator?.()}
    </span>
    {/if}
  </div>
</div>
