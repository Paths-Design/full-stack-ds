<script module lang="ts">
// @generated:start publicTypes
export type PopoverPlacement = "top" | "bottom" | "left" | "right" | "auto";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { usePopover, providePopoverContext, providePopoverPlacement } from "./usePopover.svelte.js";
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
  placement?: PopoverPlacement;
  disabled?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
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
  closeOnOutsideClick,
  closeOnBlur,
  class: className,
  "data-testid": dataTestid,
  children,
}: Props = $props();
// @generated:end
// @generated:start hook
// Pass all reactive props as getters so Svelte 5 doesn't warn
// about state captured at initialization time.
const surface = usePopover({
  open: () => open,
  defaultOpen: () => defaultOpen,
  onOpenChange: (next) => onOpenChange?.(next),
  disabled: () => disabled === true,
  closeOnEscape: () => closeOnEscape,
  closeOnOutsideClick: () => closeOnOutsideClick,
  closeOnBlur: () => closeOnBlur,
});
providePopoverContext(surface);
providePopoverPlacement(() => placement);
// @generated:end
// @generated:start classes
const classes = $derived(
  [
    "popover",
    placement ? `popover--${placement}` : null,
    disabled ? "popover--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end
// @custom:start trailing

// @custom:end
</script>
<span data-fsds-component="popover" data-fsds-box="" class={classes} data-testid={dataTestid}>
  {@render children?.()}
</span>