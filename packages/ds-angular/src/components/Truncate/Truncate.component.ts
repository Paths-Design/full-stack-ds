// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { injectFsdsMessages } from "../../primitives/messages.js";
import { StackComponent } from "../../primitives/index.js";
import { useTruncate } from "./useTruncate.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
const TruncateMessages = { expand: "Show more", collapse: "Show less" };

@Component({
  selector: "fsds-truncate",
  standalone: true,
  imports: [NgClass, NgIf],
  host: { "data-fsds-component": "truncate" },
  template: `<div [ngClass]="classes()" data-fsds-box="">
  <span [ngClass]="'truncate__content'" [style.--fsds-truncate-content-lines]="lines">
    <ng-content />
  </span>
  <ng-container *ngIf="expandable">
    <button [ngClass]="'truncate__toggle'" type="button" (click)="behavior.setExpanded(!behavior.expanded())" [attr.aria-expanded]="behavior.expanded()">
      {{ (behavior.expanded() ? (collapseText ?? fsdsMessages().collapse) : (expandText ?? fsdsMessages().expand)) }}
    </button>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TruncateComponent {
  protected readonly fsdsMessages = injectFsdsMessages("Truncate", TruncateMessages);
  @Input() lines?: number;
  @Input() expandable?: boolean;
  private readonly inputExpanded = signal<boolean | undefined>(undefined);
  @Input() get expanded(): boolean | undefined { return this.inputExpanded(); }
  set expanded(value: boolean | undefined) { this.inputExpanded.set(value); }
  @Input() defaultExpanded?: boolean;
  @Input() onExpandedChange?: (expanded: boolean) => void;
  @Input() expandText?: string;
  @Input() collapseText?: string;
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useTruncate>;
  protected get behavior(): ReturnType<typeof useTruncate> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useTruncate({
    expanded: () => this.expanded,
    defaultExpanded: this.defaultExpanded,
    onExpandedChange: (v) => this.onExpandedChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "truncate",
      this.behavior.expanded() ? "truncate--expanded" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-truncate-content",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TruncateContentComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["truncate__content", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
