<script module lang="ts">
// @generated:start publicTypes
export type TooltipPlacement = "top" | "bottom" | "left" | "right" | "auto";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { useTooltip, provideTooltipContext, provideTooltipPlacement } from "./useTooltip.svelte.js";
// @generated:end
// @custom:start imports

// @custom:end
// @generated:start types

// @generated:end
// @custom:start types

// @custom:end
// @generated:start props
interface Props {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: TooltipPlacement;
  disabled?: boolean;
  closeOnEscape?: boolean;
  closeOnBlur?: boolean;
  class?: string;
  "data-testid"?: string;
  children?: import('svelte').Snippet;
}
let {
  open,
  defaultOpen,
  onOpenChange,
  placement,
  disabled,
  closeOnEscape,
  closeOnBlur,
  class: className,
  "data-testid": dataTestid,
  children,
}: Props = $props();
// @generated:end
// @generated:start hook
// Pass all reactive props as getters so Svelte 5 doesn't warn
// about state captured at initialization time.
const surface = useTooltip({
  open: () => open,
  defaultOpen: () => defaultOpen,
  onOpenChange: (next) => onOpenChange?.(next),
  disabled: () => disabled === true,
  closeOnEscape: () => closeOnEscape,
  closeOnBlur: () => closeOnBlur,
});
provideTooltipContext(surface);
provideTooltipPlacement(() => placement);
// @generated:end
// @generated:start classes
const classes = $derived(
  [
    "tooltip",
    placement ? `tooltip--${placement}` : null,
    disabled ? "tooltip--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end
// @custom:start trailing

// @custom:end
</script>
<span data-fsds-component="tooltip" data-fsds-box="" class={classes} data-testid={dataTestid}>
  {@render children?.()}
</span>