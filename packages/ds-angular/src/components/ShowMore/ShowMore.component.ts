// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass } from "@angular/common";
import { canActivateInteraction } from "../../primitives/interaction.js";
import { StackComponent } from "../../primitives/index.js";
import { useShowMore } from "./useShowMore.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-show-more",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "show-more" },
  template: `<div [ngClass]="classes()" data-fsds-box="">
  <div [ngClass]="'show-more__content'" [style.--fsds-show-more-content-max-lines]="(maxLines ?? 3)">
    <ng-content />
  </div>
  <button [ngClass]="'show-more__trigger'" type="button" (click)="canActivateInteraction($event, false) && behavior.setExpanded(!behavior.expanded())" [attr.aria-expanded]="behavior.expanded()">
    {{ (behavior.expanded() ? (showLessLabel ?? 'Show less') : (showMoreLabel ?? 'Show more')) }}
  </button>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowMoreComponent {
  private readonly inputExpanded = signal<boolean | undefined>(undefined);
  @Input() get expanded(): boolean | undefined { return this.inputExpanded(); }
  set expanded(value: boolean | undefined) { this.inputExpanded.set(value); }
  @Input() defaultExpanded?: boolean;
  @Input() onExpandedChange?: (expanded: boolean) => void;
  @Input() maxLines?: number = 3;
  @Input() showMoreLabel?: string = "Show more";
  @Input() showLessLabel?: string = "Show less";
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useShowMore>;
  protected get behavior(): ReturnType<typeof useShowMore> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useShowMore({
    expanded: () => this.expanded,
    defaultExpanded: this.defaultExpanded,
    onExpandedChange: (v) => this.onExpandedChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }
  protected canActivateInteraction = canActivateInteraction;

  classes(): string {
    return [
      "show-more",
      this.behavior.expanded() ? "show-more--expanded" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-show-more-content",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowMoreContentComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["show-more__content", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-show-more-trigger",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="button" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowMoreTriggerComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["show-more__trigger", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
