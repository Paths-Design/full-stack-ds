// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgFor } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
import { useShuttle } from "./useShuttle.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-shuttle",
  standalone: true,
  imports: [NgClass, NgFor],
  host: { "data-fsds-component": "shuttle" },
  template: `<ul [ngClass]="classes()" role="listbox" [attr.aria-label]="ariaLabel" data-fsds-box="">
  <ng-container *ngFor="let item of (behavior.selection() ?? []); let index = index; trackBy: trackByIndex">
    <li [ngClass]="'shuttle__item'" role="option" aria-selected="true">
      <span>
        {{ item }}
      </span>
    </li>
  </ng-container>
</ul>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShuttleComponent {
  @Input() ariaLabel?: string;
  private readonly inputValue = signal<string[] | undefined>(undefined);
  @Input() get value(): string[] | undefined { return this.inputValue(); }
  set value(value: string[] | undefined) { this.inputValue.set(value); }
  @Input() defaultValue?: string[] = ["alpha","beta","gamma"];
  @Input() onValueChange?: (value: string[]) => void;
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useShuttle>;
  protected get behavior(): ReturnType<typeof useShuttle> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useShuttle({
    value: () => this.value,
    defaultValue: this.defaultValue,
    onValueChange: (v) => this.onValueChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "shuttle",
      this.class,
    ].filter(Boolean).join(" ");
  }

  protected readonly trackByIndex = (index: number): number => index;
}

@Component({
  selector: "fsds-shuttle-item",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="li" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShuttleItemComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["shuttle__item", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
