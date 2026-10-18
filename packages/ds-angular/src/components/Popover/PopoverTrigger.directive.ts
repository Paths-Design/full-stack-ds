// @generated:start imports
import {
  Directive,
  ElementRef,
  HostBinding,
  type OnInit,
  type OnDestroy,
  inject,
} from "@angular/core";
import { PopoverContextToken } from "./usePopover.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start directive
/**
 * Attribute directive that lets a consumer adopt their own
 * element as the Tooltip anchor:
 *
 *   <fsds-tooltip>
 *     <a fsdsTooltipTrigger href="#help">Save</a>
 *     <fsds-tooltip-content>Help</fsds-tooltip-content>
 *   </fsds-tooltip>
 *
 * Registers the host element as the anchor with the nearest
 * Tooltip root context. Applies ARIA + data marker via host
 * bindings. DOM event listeners (pointerenter, focus, etc.) are
 * installed by the substrate's AnchoredSurfaceController on the
 * host element directly.
 */
@Directive({
  selector: "[fsdsPopoverTrigger]",
  standalone: true,
})
export class PopoverTriggerDirective implements OnInit, OnDestroy {
  private elRef = inject(ElementRef<HTMLElement>);
  protected ctx = inject(PopoverContextToken, { optional: true });

  @HostBinding("attr.data-popover-trigger") get _dataMarker(): string {
    return "";
  }

  @HostBinding("attr.aria-controls") get _ariaControls(): string | null {
    return this.ctx ? this.ctx.contentId : null;
  }

  @HostBinding("attr.aria-expanded") get _ariaExpanded(): string | null {
    return this.ctx ? (this.ctx.open() ? "true" : "false") : null;
  }

  ngOnInit(): void {
    if (!this.ctx) {
      throw new Error(
        "[fsdsPopoverTrigger] used outside of <fsds-popover>.",
      );
    }
    this.ctx.registerAnchor(this.elRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.ctx?.registerAnchor(null);
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
