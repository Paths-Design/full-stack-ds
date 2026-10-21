// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgFor } from "@angular/common";
import { createReactiveTransferList } from "../../primitives/transfer-list-signal.js";
import { injectFsdsMessages } from "../../primitives/messages.js";
import { useShuttle } from "./useShuttle.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
const ShuttleMessages = { availableLabel: "Available", selectedLabel: "Selected", add: "Add", remove: "Remove" };

@Component({
  selector: "fsds-shuttle",
  standalone: true,
  imports: [NgClass, NgFor],
  host: { "data-fsds-component": "shuttle" },
  template: `<div [ngClass]="classes()" role="group" [attr.aria-label]="ariaLabel" data-fsds-box="">
  <ul [ngClass]="'shuttle__list'" role="listbox" aria-multiselectable="true" data-side="available" (keydown)="transfer.keydown($event)" [attr.aria-label]="fsdsMessages().availableLabel">
    <ng-container *ngFor="let item of (transfer.state.available ?? []); let index = index; trackBy: trackByIndex">
      <li [ngClass]="'shuttle__item'" role="option" (click)="transfer.toggle(item)" [attr.aria-selected]="item.marked" [tabindex]="item.tabIndex" [attr.data-value]="item.key">
        <span>
          {{ item.label }}
        </span>
      </li>
    </ng-container>
  </ul>
  <div [ngClass]="'shuttle__controls'">
    <button [ngClass]="'shuttle__add'" type="button" (click)="transfer.add()" [disabled]="transfer.state.addDisabled">
      {{ fsdsMessages().add }}
    </button>
    <button [ngClass]="'shuttle__remove'" type="button" (click)="transfer.remove()" [disabled]="transfer.state.removeDisabled">
      {{ fsdsMessages().remove }}
    </button>
  </div>
  <ul [ngClass]="'shuttle__list'" role="listbox" aria-multiselectable="true" data-side="selected" (keydown)="transfer.keydown($event)" [attr.aria-label]="fsdsMessages().selectedLabel">
    <ng-container *ngFor="let item of (transfer.state.selected ?? []); let index = index; trackBy: trackByIndex">
      <li [ngClass]="'shuttle__item'" role="option" (click)="transfer.toggle(item)" [attr.aria-selected]="item.marked" [tabindex]="item.tabIndex" [attr.data-value]="item.key">
        <span>
          {{ item.label }}
        </span>
      </li>
    </ng-container>
  </ul>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShuttleComponent {
  protected readonly fsdsMessages = injectFsdsMessages("Shuttle", ShuttleMessages);
  @Input() ariaLabel?: string;
  private readonly inputOptions = signal<string[] | undefined>(undefined);
  @Input() get options(): string[] | undefined { return this.inputOptions() ?? ["alpha","beta","gamma","delta","epsilon"]; }
  set options(value: string[] | undefined) { this.inputOptions.set(value); }
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
  protected transfer = createReactiveTransferList(() => ({ options: this.options, value: this.behavior.selection(), onValueChange: (next) => this.behavior.setSelection(next) }));
  private transferCleanup = this.destroyRef.onDestroy(() => this.transfer.destroy());
  ngAfterViewChecked(): void { this.transfer.afterRender(); }

  classes(): string {
    return [
      "shuttle",
      this.class,
    ].filter(Boolean).join(" ");
  }

  protected readonly trackByIndex = (index: number): number => index;
}
// @generated:end

// @custom:start trailing

// @custom:end
