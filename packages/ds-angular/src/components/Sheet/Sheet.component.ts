// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, ViewChild, ElementRef, Injector, runInInjectionContext, untracked, type OnInit, type OnDestroy } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { injectFsdsMessages } from "../../primitives/messages.js";
import { canActivateInteraction } from "../../primitives/interaction.js";
import { StackComponent } from "../../primitives/index.js";
import { useSheet } from "./useSheet.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SheetSide = "top" | "right" | "bottom" | "left";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
let nextInstanceId = 0;

const SheetMessages = { close: "Close sheet" };

@Component({
  selector: "fsds-sheet",
  standalone: true,
  imports: [NgClass, NgIf],
  host: { "data-fsds-component": "sheet" },
  template: `<div [ngClass]="classes()" data-fsds-box="">
  <ng-container *ngIf="behavior.openness()">
    <div [ngClass]="'sheet__overlay'" aria-hidden="true" role="presentation" (click)="behavior.setOpenness(false)"></div>
  </ng-container>
  <ng-container *ngIf="behavior.openness()">
    <div [ngClass]="'sheet__content'" #interactionPanel role="dialog" [attr.aria-modal]="(modal ?? true)" [attr.aria-label]="ariaLabel" [attr.data-side]="(side ?? 'right')" [attr.aria-labelledby]="contentAriaLabelledby" [attr.aria-describedby]="contentAriaDescribedby">
      <div [ngClass]="'sheet__header'">
        <h2 [ngClass]="'sheet__title'" [attr.id]="instanceId + '-title'">
          <ng-content select="[slot=title]" />
        </h2>
        <p [ngClass]="'sheet__description'" [attr.id]="instanceId + '-description'">
          <ng-content select="[slot=description]" />
        </p>
        <button [ngClass]="'sheet__close'" type="button" (click)="canActivateInteraction($event, false) && behavior.setOpenness(false)" [attr.aria-label]="fsdsMessages().close"></button>
      </div>
      <div [ngClass]="'sheet__body'">
        <ng-content />
      </div>
      <div [ngClass]="'sheet__footer'">
        <ng-content select="[slot=footer]" />
      </div>
    </div>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetComponent implements OnInit, OnDestroy {
  protected readonly fsdsMessages = injectFsdsMessages("Sheet", SheetMessages);
  private readonly inputOpen = signal<boolean | undefined>(undefined);
  @Input() get open(): boolean | undefined { return this.inputOpen(); }
  set open(value: boolean | undefined) { this.inputOpen.set(value); }
  @Input() defaultOpen?: boolean;
  @Input() onOpenChange?: (open: boolean) => void;
  @Input() side?: SheetSide = "right";
  @Input() modal?: boolean = true;
  @Input() ariaLabel?: string;
  @Input() ariaLabelledby?: string;
  @Input() ariaDescribedby?: string;
  @Input() class?: string;

  protected readonly instanceId = `fsds-sheet-${nextInstanceId++}`;
  @ViewChild("interactionPanel") set interactionPanel(element: ElementRef<HTMLElement> | undefined) {
    this.behavior.panelRef.nativeElement = element?.nativeElement ?? null;
  }

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useSheet>;
  protected get behavior(): ReturnType<typeof useSheet> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useSheet({
    open: () => this.open,
    defaultOpen: this.defaultOpen,
    onOpenChange: (v) => this.onOpenChange?.(v),
    modal: () => this.modal,
    destroyRef: this.destroyRef,
  })));
  }
  protected canActivateInteraction = canActivateInteraction;

  classes(): string {
    return [
      "sheet",
      (this.side ?? "right") ? `sheet--${(this.side ?? "right")}` : null,
      this.behavior.openness() ? "sheet--open" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  get contentAriaLabelledby(): string | undefined {
    return [!this.ariaLabel ? `${this.instanceId}-title` : null, this.ariaLabelledby].filter(Boolean).join(" ") || undefined;
  }

  get contentAriaDescribedby(): string | undefined {
    return [`${this.instanceId}-description`, this.ariaDescribedby].filter(Boolean).join(" ") || undefined;
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
  selector: "fsds-sheet-content",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetContentComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["sheet__content", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-sheet-header",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHeaderComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["sheet__header", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-sheet-title",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="h3" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTitleComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["sheet__title", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-sheet-description",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="p" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetDescriptionComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["sheet__description", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-sheet-body",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetBodyComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["sheet__body", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-sheet-footer",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack variant="horizontal" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFooterComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["sheet__footer", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
