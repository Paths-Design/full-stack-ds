// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, effect, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgFor } from "@angular/common";
import { createReactivePagedSet } from "../../primitives/paging-signal.js";
import { usePagination } from "./usePagination.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type PaginationPresentation = "indicators" | "pages";
export type PaginationProgress = "none" | "elapsed";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-pagination",
  standalone: true,
  imports: [NgClass, NgFor],
  host: { "data-fsds-component": "pagination" },
  template: `<div [ngClass]="classes()" role="group" [attr.aria-label]="(label ?? 'Choose page')" data-fsds-box="">
  <ng-container *ngFor="let item of ((pages ?? [])); let index = index">
    <button [ngClass]="'pagination__item'" type="button" (click)="pagedSet.request(index)" [attr.aria-label]="item" [attr.aria-current]="(index === behavior.page())" [disabled]="(disabled ?? false)" [attr.data-current]="(index === behavior.page())">
      <span [ngClass]="'pagination__marker'" aria-hidden="true">
        <span [ngClass]="'pagination__fill'" aria-hidden="true"></span>
      </span>
      <span [ngClass]="'pagination__label'" aria-hidden="true">
        {{ item }}
      </span>
    </button>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  private readonly inputPages = signal<string[] | undefined>(undefined);
  @Input() get pages(): string[] | undefined { return this.inputPages(); }
  set pages(value: string[] | undefined) { this.inputPages.set(value); }
  private readonly inputIndex = signal<number | undefined>(undefined);
  @Input() get index(): number | undefined { return this.inputIndex(); }
  set index(value: number | undefined) { this.inputIndex.set(value); }
  @Input() defaultIndex?: number = 0;
  @Input() onIndexChange?: (index: number) => void;
  @Input() presentation?: PaginationPresentation = "indicators";
  @Input() label?: string = "Choose page";
  private readonly inputDisabled = signal<boolean | undefined>(undefined);
  @Input() get disabled(): boolean | undefined { return this.inputDisabled(); }
  set disabled(value: boolean | undefined) { this.inputDisabled.set(value); }
  @Input() progress?: PaginationProgress = "none";
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof usePagination>;
  protected get behavior(): ReturnType<typeof usePagination> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => usePagination({
    index: () => this.index,
    defaultIndex: this.defaultIndex,
    onIndexChange: (v) => this.onIndexChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }
  protected pagedSet = createReactivePagedSet();
  private pagedCleanup = this.destroyRef.onDestroy(() => this.pagedSet.destroy());
  private pagedEffect = effect(() => this.pagedSet.sync({ index: this.behavior.page(), items: this.pages ?? [],
    count: undefined, disabled: this.disabled, onIndexChange: (value) => this.behavior.setPage(value) }));

  classes(): string {
    return [
      "pagination",
      (this.presentation ?? "indicators") ? `pagination--${(this.presentation ?? "indicators")}` : null,
      (this.progress ?? "none") ? `pagination--${(this.progress ?? "none")}` : null,
      (this.disabled ?? false) ? "pagination--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
