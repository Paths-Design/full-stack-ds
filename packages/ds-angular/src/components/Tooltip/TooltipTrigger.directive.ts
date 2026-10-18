// @generated:start imports
import {
  Directive,
  ElementRef,
  HostBinding,
  type OnInit,
  type OnDestroy,
  inject,
} from "@angular/core";
import { TooltipContextToken } from "./useTooltip.js";
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
  selector: "[fsdsTooltipTrigger]",
  standalone: true,
})
export class TooltipTriggerDirective implements OnInit, OnDestroy {
  private elRef = inject(ElementRef<HTMLElement>);
  protected ctx = inject(TooltipContextToken, { optional: true });

  @HostBinding("attr.data-tooltip-trigger") get _dataMarker(): string {
    return "";
  }

  @HostBinding("attr.aria-describedby") get _ariaDescribedBy(): string | null {
    const ctx = this.ctx;
    return ctx && ctx.open() ? ctx.contentId : null;
  }

  ngOnInit(): void {
    if (!this.ctx) {
      throw new Error(
        "[fsdsTooltipTrigger] used outside of <fsds-tooltip>.",
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
