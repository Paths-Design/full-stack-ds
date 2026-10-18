// @generated:start imports
import {
  Component,
  ElementRef,
  HostBinding,
  type AfterViewInit,
  type OnDestroy,
  type DoCheck,
  inject,
  computed,
  DestroyRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { NgIf } from "@angular/common";
import { PopoverContextToken } from "./usePopover.js";
import {
  createAnchoredPosition,
  type CreateAnchoredPositionResult,
} from "../../primitives/surfaces/createAnchoredPosition.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-popover-content",
  standalone: true,
  imports: [NgIf],
  template: `<ng-container *ngIf="isOpen()"><ng-content /></ng-container>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopoverContentComponent implements AfterViewInit, OnDestroy, DoCheck {
  private elRef = inject(ElementRef<HTMLElement>);
  protected ctx = inject(PopoverContextToken, { optional: true });

  // The substrate uses content.contains(relatedTarget) for grace-
  // path checks. We register the host element so contains() sees
  // the consumer's projected children too (they live in light DOM
  // under us). Open-state is reflected via host bindings on the
  // same host element so ARIA + the data marker apply to the
  // exact node the substrate registered.
  protected isOpen = computed(() => this.ctx?.open() ?? false);

  // Positioning substrate. Fed with getters for the anchor/
  // content nodes the surface registers and the resolved
  // placement input; recomputed whenever open/anchor/content
  // change via requestUpdate() below.
  private _position: CreateAnchoredPositionResult = createAnchoredPosition({
    anchor: () => this.ctx?.getAnchorNode() ?? null,
    content: () => this.ctx?.getContentNode() ?? null,
    open: () => this.isOpen(),
    placement: () => this.ctx?.getPlacement() ?? "auto",
    collision: () => "flip-shift",
    destroyRef: inject(DestroyRef),
  });

  // Body-portal bookkeeping: saved so ngOnDestroy can restore
  // the host to its original in-tree position (Dialog root-
  // portal precedent). Anchored content has no in-tree
  // positioning context to lose (it's already position:
  // fixed against viewport coordinates), so portaling only
  // needs to escape ancestor stacking/overflow — it does not
  // need to preserve layout flow the way a non-anchored root
  // portal would.
  private _portalOriginParent: Node | null = null;
  private _portalOriginNext: Node | null = null;
  private _portalAppended = false;

  @HostBinding("attr.id") get _id(): string | null {
    return this.isOpen() && this.ctx ? this.ctx.contentId : null;
  }

  @HostBinding("attr.data-popover-content") get _dataMarker(): string | null {
    return this.isOpen() ? "" : null;
  }

  @HostBinding("attr.data-placement") get _dataPlacement(): string | null {
    return this.isOpen() ? this._position.state().placement : null;
  }

  @HostBinding("style.position") get _stylePosition(): string | null {
    return this.isOpen() ? "fixed" : null;
  }

  @HostBinding("style.top.px") get _styleTop(): number | null {
    return this.isOpen() ? this._position.state().top : null;
  }

  @HostBinding("style.left.px") get _styleLeft(): number | null {
    return this.isOpen() ? this._position.state().left : null;
  }

  @HostBinding("style.visibility") get _styleVisibility(): string | null {
    if (!this.isOpen()) return null;
    return this._position.state().ready ? "visible" : "hidden";
  }

  ngAfterViewInit(): void {
    this.ctx?.registerContent(this.elRef.nativeElement);
    this._position.requestUpdate();
  }

  // Body-append while open; restore to the original in-tree
  // position on close (or destroy). Runs after each
  // `isOpen()`-affecting change because *ngIf on the
  // `<ng-container>` only gates the projected content — the
  // host element itself is always in the DOM for host
  // bindings to apply to, so the portal move is host-driven
  // here rather than template-driven.
  private _syncPortal(): void {
    if (typeof document === "undefined") return;
    const host = this.elRef.nativeElement;
    if (this.isOpen()) {
      if (this._portalAppended) return;
      this._portalOriginParent = host.parentNode;
      this._portalOriginNext = host.nextSibling;
      document.body.appendChild(host);
      this._portalAppended = true;
    } else {
      if (!this._portalAppended) return;
      if (this._portalOriginParent && this._portalOriginParent.isConnected) {
        this._portalOriginParent.insertBefore(host, this._portalOriginNext);
      } else {
        host.parentNode?.removeChild(host);
      }
      this._portalAppended = false;
    }
  }
  private _lastOpen = false;
  ngDoCheck(): void {
    const open = this.isOpen();
    if (open === this._lastOpen) return;
    this._lastOpen = open;
    this._position.requestUpdate();
    this._syncPortal();
  }

  ngOnDestroy(): void {
    this.ctx?.registerContent(null);
    if (this._portalAppended && typeof document !== "undefined") {
      const host = this.elRef.nativeElement;
      if (this._portalOriginParent && this._portalOriginParent.isConnected) {
        this._portalOriginParent.insertBefore(host, this._portalOriginNext);
      } else {
        host.parentNode?.removeChild(host);
      }
      this._portalAppended = false;
    }
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
