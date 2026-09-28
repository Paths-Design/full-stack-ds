// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, effect, signal, ViewChild, ElementRef, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgFor } from "@angular/common";
import { createSequenceBudget } from "../../primitives/sequence-budget.js";
import { IconComponent } from "../Icon/Icon.component.js";
import { useCarousel } from "./useCarousel.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CarouselIndicator = "pagination" | "next" | "both";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-carousel",
  standalone: true,
  imports: [NgClass, NgFor, IconComponent],
  host: { "data-fsds-component": "carousel" },
  template: `<section [ngClass]="classes()" role="region" aria-roledescription="carousel" [attr.aria-label]="(label ?? 'Featured content')" data-fsds-box="" #sequenceRoot>
  <button [ngClass]="'carousel__rotation'" type="button" aria-label="Start slide rotation">
    {{ 'Start slide rotation' }}
  </button>
  <div [ngClass]="'carousel__viewport'" aria-live="off" aria-atomic="false">
    <ng-content />
  </div>
  <div [ngClass]="'carousel__controls'">
    <button [ngClass]="'carousel__previous'" type="button" aria-label="Previous slide">
      <fsds-icon name="arrow-left" size="sm"></fsds-icon>
    </button>
    <div [ngClass]="'carousel__pagination'" role="group" aria-label="Choose slide">
      <ng-container *ngFor="let item of ((slides ?? [])); let index = index">
        <button [ngClass]="'carousel__picker'" type="button" [attr.aria-label]="item">
          <span [ngClass]="'carousel__marker'" aria-hidden="true">
            <span [ngClass]="'carousel__fill'" aria-hidden="true"></span>
          </span>
        </button>
      </ng-container>
    </div>
    <button [ngClass]="'carousel__next'" type="button" aria-label="Next slide">
      <span [ngClass]="'carousel__ring'" aria-hidden="true"></span>
      <fsds-icon name="arrow-right" size="sm"></fsds-icon>
    </button>
  </div>
</section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent {
  private readonly inputSlides = signal<string[] | undefined>(undefined);
  @Input() get slides(): string[] | undefined { return this.inputSlides(); }
  set slides(value: string[] | undefined) { this.inputSlides.set(value); }
  private readonly inputIndex = signal<number | undefined>(undefined);
  @Input() get index(): number | undefined { return this.inputIndex(); }
  set index(value: number | undefined) { this.inputIndex.set(value); }
  @Input() defaultIndex?: number = 0;
  @Input() onIndexChange?: (index: number) => void;
  private readonly inputAutoPlay = signal<boolean | undefined>(undefined);
  @Input() get autoPlay(): boolean | undefined { return this.inputAutoPlay(); }
  set autoPlay(value: boolean | undefined) { this.inputAutoPlay.set(value); }
  private readonly inputDuration = signal<number | null | undefined>(undefined);
  @Input() get duration(): number | null | undefined { return this.inputDuration(); }
  set duration(value: number | null | undefined) { this.inputDuration.set(value); }
  @Input() indicator?: CarouselIndicator = "pagination";
  @Input() label?: string = "Featured content";
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useCarousel>;
  protected get behavior(): ReturnType<typeof useCarousel> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useCarousel({
    index: () => this.index,
    defaultIndex: this.defaultIndex,
    onIndexChange: (v) => this.onIndexChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }
  protected sequence = createSequenceBudget({"labels":{"start":"Start slide rotation","stop":"Stop slide rotation","item":"slide"},"transition":{"durationMs":250,"easing":"cubic-bezier(0.4, 0, 0.2, 1)","referenceWidth":320,"minMultiplier":0.5,"maxMultiplier":2},"parts":{"viewport":".carousel__viewport","previous":".carousel__previous","next":".carousel__next","rotation":".carousel__rotation","picker":".carousel__picker"},"progress":[{"selector":".carousel__fill","effect":"elapsed-width","steps":10},{"selector":".carousel__ring","effect":"elapsed-ring","steps":10}]});
  private sequenceCleanup = this.destroyRef.onDestroy(() => this.sequence.destroy());
  private sequenceEffect = effect(() => this.sequence.sync({
    index: this.behavior.slide(), labels: this.slides ?? [], autoPlay: this.autoPlay ?? false,
    durationMs: this.duration === undefined ? 6000 : this.duration,
    onIndexChange: (value) => this.behavior.setSlide(value),
  }));
  @ViewChild("sequenceRoot") set sequenceRoot(el: ElementRef<HTMLElement> | undefined) {
    this.sequence.bindRoot(el?.nativeElement);
  }

  classes(): string {
    return [
      "carousel",
      (this.indicator ?? "pagination") ? `carousel--${(this.indicator ?? "pagination")}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
