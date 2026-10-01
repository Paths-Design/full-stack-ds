// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, effect, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { createReactivePagedSet } from "../../primitives/paging-signal.js";
import { ButtonComponent } from "../Button/Button.component.js";
import { IconComponent } from "../Icon/Icon.component.js";
import { InputComponent } from "../Input/Input.component.js";
import { PaginationComponent } from "../Pagination/Pagination.component.js";
import { usePageNavigator } from "./usePageNavigator.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type PageNavigatorPresentation = "indicators" | "pages";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-page-navigator",
  standalone: true,
  imports: [NgClass, NgIf, ButtonComponent, IconComponent, InputComponent, PaginationComponent],
  host: { "data-fsds-component": "page-navigator" },
  template: `<div [ngClass]="classes()" role="group" [attr.aria-label]="(label ?? 'Page navigation')" data-fsds-box="">
  <fsds-button [ngClass]="'page-navigator__previous'" type="button" [onClick]="pagedSet.previous" [disabled]="pagedSet.state.previousDisabled" [ariaLabel]="(previousLabel ?? 'Previous page')">
    <fsds-icon [ngClass]="'page-navigator__previousIcon'" name="arrow-left" size="sm"></fsds-icon>
  </fsds-button>
  <div [ngClass]="'page-navigator__field'" (keydown)="pagedSet.commitOnEnter($event)" (focusout)="pagedSet.commit()">
    <fsds-input [ngClass]="'page-navigator__input'" type="number" [onChange]="pagedSet.edit" [value]="pagedSet.state.draft" [disabled]="pagedSet.state.disabled" [ariaLabel]="(pageLabel ?? 'Current page')"></fsds-input>
  </div>
  <span [ngClass]="'page-navigator__context'">
    {{ (ofLabel ?? 'of') }}
  </span>
  <span [ngClass]="'page-navigator__total'">
    {{ pagedSet.state.count }}
  </span>
  <fsds-button [ngClass]="'page-navigator__commit'" type="button" [onClick]="pagedSet.commit" [disabled]="pagedSet.state.disabled" [ariaLabel]="(commitLabel ?? 'Go')">
    <span>
      {{ (commitLabel ?? 'Go') }}
    </span>
  </fsds-button>
  <fsds-button [ngClass]="'page-navigator__next'" type="button" [onClick]="pagedSet.next" [disabled]="pagedSet.state.nextDisabled" [ariaLabel]="(nextLabel ?? 'Next page')">
    <fsds-icon [ngClass]="'page-navigator__nextIcon'" name="arrow-right" size="sm"></fsds-icon>
  </fsds-button>
  <ng-container *ngIf="showChoices">
    <fsds-pagination [ngClass]="'page-navigator__choices'" [onIndexChange]="pagedSet.request" [pages]="(pages ?? [])" [index]="behavior.page()" [presentation]="(presentation ?? 'indicators')" [label]="(label ?? 'Page navigation')" [disabled]="pagedSet.state.disabled"></fsds-pagination>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageNavigatorComponent {
  private readonly inputPages = signal<string[] | undefined>(undefined);
  @Input() get pages(): string[] | undefined { return this.inputPages(); }
  set pages(value: string[] | undefined) { this.inputPages.set(value); }
  private readonly inputIndex = signal<number | undefined>(undefined);
  @Input() get index(): number | undefined { return this.inputIndex(); }
  set index(value: number | undefined) { this.inputIndex.set(value); }
  @Input() defaultIndex?: number = 0;
  @Input() onIndexChange?: (index: number) => void;
  @Input() presentation?: PageNavigatorPresentation = "indicators";
  @Input() label?: string = "Page navigation";
  private readonly inputDisabled = signal<boolean | undefined>(undefined);
  @Input() get disabled(): boolean | undefined { return this.inputDisabled(); }
  set disabled(value: boolean | undefined) { this.inputDisabled.set(value); }
  private readonly inputPageCount = signal<number | undefined>(undefined);
  @Input() get pageCount(): number | undefined { return this.inputPageCount(); }
  set pageCount(value: number | undefined) { this.inputPageCount.set(value); }
  @Input() pageLabel?: string = "Current page";
  @Input() previousLabel?: string = "Previous page";
  @Input() nextLabel?: string = "Next page";
  @Input() ofLabel?: string = "of";
  @Input() commitLabel?: string = "Go";
  @Input() showChoices?: boolean = false;
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof usePageNavigator>;
  protected get behavior(): ReturnType<typeof usePageNavigator> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => usePageNavigator({
    index: () => this.index,
    defaultIndex: this.defaultIndex,
    onIndexChange: (v) => this.onIndexChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }
  protected pagedSet = createReactivePagedSet();
  private pagedCleanup = this.destroyRef.onDestroy(() => this.pagedSet.destroy());
  private pagedEffect = effect(() => this.pagedSet.sync({ index: this.behavior.page(), items: this.pages ?? [],
    count: this.pageCount, disabled: this.disabled, onIndexChange: (value) => this.behavior.setPage(value) }));

  classes(): string {
    return [
      "page-navigator",
      (this.disabled ?? false) ? "page-navigator--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
