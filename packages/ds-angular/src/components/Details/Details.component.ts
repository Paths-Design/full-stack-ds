// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { canActivateInteraction } from "../../primitives/interaction.js";
import { StackComponent } from "../../primitives/index.js";
import { IconComponent } from "../Icon/Icon.component.js";
import { useDetails } from "./useDetails.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type DetailsVariant = "default" | "inline" | "compact";
export type DetailsIcon = "left" | "right" | "none";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
let nextInstanceId = 0;

@Component({
  selector: "fsds-details",
  standalone: true,
  imports: [NgClass, NgIf, IconComponent],
  host: { "data-fsds-component": "details" },
  template: `<details [ngClass]="classes()" [open]="behavior.open()" data-fsds-box="">
  <summary [ngClass]="'details__summary'" (click)="canActivateInteraction($event, true) && behavior.setOpen(!behavior.open())" [attr.aria-disabled]="disabled" [attr.aria-controls]="summaryAriaControls">
    <span [ngClass]="'details__summaryContent'">
      <fsds-icon [ngClass]="'details__icon'" name="chevron-down" size="sm"></fsds-icon>
      <span [ngClass]="'details__summaryText'">
        {{ summary }}
      </span>
    </span>
  </summary>
  <ng-container *ngIf="behavior.open()">
    <div [ngClass]="'details__content'" [attr.id]="instanceId + '-content'">
      <ng-content />
    </div>
  </ng-container>
</details>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailsComponent {
  @Input() summary!: string;
  private readonly inputOpen = signal<boolean | undefined>(undefined);
  @Input() get open(): boolean | undefined { return this.inputOpen(); }
  set open(value: boolean | undefined) { this.inputOpen.set(value); }
  @Input() defaultOpen?: boolean;
  @Input() onOpenChange?: (open: boolean) => void;
  @Input() disabled?: boolean;
  @Input() variant?: DetailsVariant = "default";
  @Input() icon?: DetailsIcon = "left";
  @Input() class?: string;

  protected readonly instanceId = `fsds-details-${nextInstanceId++}`;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useDetails>;
  protected get behavior(): ReturnType<typeof useDetails> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useDetails({
    open: () => this.open,
    defaultOpen: this.defaultOpen,
    onOpenChange: (v) => this.onOpenChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }
  protected canActivateInteraction = canActivateInteraction;

  classes(): string {
    return [
      "details",
      (this.variant ?? "default") ? `details--${(this.variant ?? "default")}` : null,
      (this.icon ?? "left") ? `details--${(this.icon ?? "left")}` : null,
      this.behavior.open() ? "details--open" : null,
      this.disabled ? "details--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  get summaryAriaControls(): string | undefined {
    return [this.behavior.open() ? `${this.instanceId}-content` : null].filter(Boolean).join(" ") || undefined;
  }
}

@Component({
  selector: "fsds-details-content",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailsContentComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["details__content", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
