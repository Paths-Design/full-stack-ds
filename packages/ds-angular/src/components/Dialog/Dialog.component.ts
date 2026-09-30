// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, ViewChild, ElementRef, signal, Injector, runInInjectionContext, untracked, OnInit, OnDestroy } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { canActivateInteraction } from "../../primitives/interaction.js";
import { StackComponent } from "../../primitives/index.js";
import { useDialog } from "./useDialog.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
let nextInstanceId = 0;

@Component({
  selector: "fsds-dialog",
  standalone: true,
  imports: [NgClass, NgIf],
  host: { "data-fsds-component": "dialog" },
  template: `<div [ngClass]="classes()" data-fsds-box="">
  <ng-container *ngIf="behavior.openness()">
    <div [ngClass]="'dialog__backdrop'" aria-hidden="true" role="presentation" (click)="closeOnBackdropClick !== false && behavior.setOpenness(false)"></div>
  </ng-container>
  <ng-container *ngIf="behavior.openness()">
    <div [ngClass]="'dialog__modal'" #interactionPanel role="dialog" [attr.aria-modal]="(modal ?? true)" [attr.aria-label]="ariaLabel" [attr.aria-labelledby]="modalAriaLabelledby" [attr.aria-describedby]="modalAriaDescribedby">
      <div [ngClass]="'dialog__header'">
        <h2 [ngClass]="'dialog__title'" [attr.id]="instanceId + '-title'">
          <ng-content select="[slot=title]" />
        </h2>
        <button [ngClass]="'dialog__closeButton'" type="button" aria-label="Close dialog" (click)="canActivateInteraction($event, false) && behavior.setOpenness(false)"></button>
      </div>
      <div [ngClass]="'dialog__body'" [attr.id]="instanceId + '-body'">
        <ng-content />
      </div>
      <div [ngClass]="'dialog__footer'">
        <ng-content select="[slot=footer]" />
      </div>
    </div>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent implements OnInit, OnDestroy {
  private readonly inputOpen = signal<boolean | undefined>(undefined);
  @Input() get open(): boolean | undefined { return this.inputOpen(); }
  set open(value: boolean | undefined) { this.inputOpen.set(value); }
  @Input() defaultOpen?: boolean;
  @Input() onOpenChange?: (open: boolean) => void;
  @Input() modal?: boolean = true;
  @Input() size?: DialogSize = "md";
  @Input() dismissible?: boolean = true;
  @Input() closeOnEscape?: boolean = true;
  @Input() closeOnBackdropClick?: boolean = true;
  @Input() initialFocus?: string;
  @Input() returnFocus?: string;
  @Input() ariaLabel?: string;
  @Input() ariaLabelledby?: string;
  @Input() ariaDescribedby?: string;
  @Input() class?: string;

  protected readonly instanceId = `fsds-dialog-${nextInstanceId++}`;
  @ViewChild("interactionPanel") set interactionPanel(element: ElementRef<HTMLElement> | undefined) {
    this.behavior.panelRef.nativeElement = element?.nativeElement ?? null;
  }

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useDialog>;
  protected get behavior(): ReturnType<typeof useDialog> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useDialog({
    open: () => this.open,
    defaultOpen: this.defaultOpen,
    onOpenChange: (v) => this.onOpenChange?.(v),
    closeOnEscape: this.closeOnEscape,
    closeOnBackdropClick: this.closeOnBackdropClick,
    initialFocus: () => this.initialFocus,
    returnFocus: () => this.returnFocus,
    modal: () => this.modal,
    destroyRef: this.destroyRef,
  })));
  }
  protected canActivateInteraction = canActivateInteraction;

  classes(): string {
    return [
      "dialog",
      (this.size ?? "md") ? `dialog--${(this.size ?? "md")}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  get modalAriaLabelledby(): string | undefined {
    return [!this.ariaLabel ? `${this.instanceId}-title` : null, this.ariaLabelledby].filter(Boolean).join(" ") || undefined;
  }

  get modalAriaDescribedby(): string | undefined {
    return [`${this.instanceId}-body`, this.ariaDescribedby].filter(Boolean).join(" ") || undefined;
  }

  private _el = inject(ElementRef<HTMLElement>);
  private _portalOriginParent: Node | null = null;
  private _portalOriginNext: Node | null = null;

  ngOnInit(): void {
    if (typeof document === "undefined") return;
    const host = this._el.nativeElement as HTMLElement;
    this._portalOriginParent = host.parentNode;
    this._portalOriginNext = host.nextSibling;
    document.body.appendChild(host);
  }

  ngOnDestroy(): void {
    const host = this._el.nativeElement as HTMLElement;
    // Restore to the original position when it still exists so
    // Angular's own teardown removes it from the right place;
    // otherwise detach it directly.
    if (this._portalOriginParent && this._portalOriginParent.isConnected) {
      this._portalOriginParent.insertBefore(host, this._portalOriginNext);
    } else {
      host.parentNode?.removeChild(host);
    }
  }
}

@Component({
  selector: "fsds-dialog-header",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogHeaderComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["dialog__header", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-dialog-title",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="h3" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogTitleComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["dialog__title", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-dialog-body",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogBodyComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["dialog__body", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-dialog-footer",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack variant="horizontal" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogFooterComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["dialog__footer", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
