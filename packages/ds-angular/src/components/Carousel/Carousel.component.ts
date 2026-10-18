// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, effect, signal, ViewChild, ElementRef, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass } from "@angular/common";
import { createSequenceBudget } from "../../primitives/sequence-budget.js";
import { injectFsdsMessages } from "../../primitives/messages.js";
import { IconComponent } from "../Icon/Icon.component.js";
import { PaginationComponent } from "../Pagination/Pagination.component.js";
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
const CarouselMessages = { regionLabel: "Featured content", roleDescription: "carousel", rotationStart: "Start slide rotation", rotationStop: "Stop slide rotation", slideRoleDescription: "slide", slidePosition: "{index} of {count}", previousSlide: "Previous slide", nextSlide: "Next slide", chooseSlide: "Choose slide" };

@Component({
  selector: "fsds-carousel",
  standalone: true,
  imports: [NgClass, IconComponent, PaginationComponent],
  host: { "data-fsds-component": "carousel" },
  template: `<section [ngClass]="classes()" role="region" [attr.aria-label]="(label ?? fsdsMessages().regionLabel)" [attr.aria-roledescription]="fsdsMessages().roleDescription" data-fsds-box="" #sequenceRoot>
  <button [ngClass]="'carousel__rotation'" type="button" [attr.aria-label]="fsdsMessages().rotationStart">
    {{ fsdsMessages().rotationStart }}
  </button>
  <div [ngClass]="'carousel__viewport'" aria-live="off" aria-atomic="false">
    <ng-content />
  </div>
  <div [ngClass]="'carousel__controls'">
    <button [ngClass]="'carousel__previous'" type="button" [attr.aria-label]="fsdsMessages().previousSlide">
      <fsds-icon name="arrow-left" size="sm"></fsds-icon>
    </button>
    <fsds-pagination [ngClass]="'carousel__pagination'" presentation="indicators" [onIndexChange]="sequence.requestIndex" [label]="fsdsMessages().chooseSlide" [pages]="(slides ?? [])" [index]="behavior.slide()" [progress]="((indicator ?? 'pagination') === 'pagination' ? 'elapsed' : ((indicator ?? 'pagination') === 'next' ? 'none' : 'elapsed'))"></fsds-pagination>
    <button [ngClass]="'carousel__next'" type="button" [attr.aria-label]="fsdsMessages().nextSlide">
      <span [ngClass]="'carousel__ring'" aria-hidden="true"></span>
      <fsds-icon name="arrow-right" size="sm"></fsds-icon>
    </button>
  </div>
</section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent {
  protected readonly fsdsMessages = injectFsdsMessages("Carousel", CarouselMessages);
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
  private readonly inputIndicator = signal<CarouselIndicator | undefined>(undefined);
  @Input() get indicator(): CarouselIndicator | undefined { return this.inputIndicator() ?? "pagination"; }
  set indicator(value: CarouselIndicator | undefined) { this.inputIndicator.set(value); }
  @Input() label?: string;
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
  protected sequence = createSequenceBudget({"delegatedPicker":false,"transition":{"durationMs":250,"easing":"cubic-bezier(0.4, 0, 0.2, 1)","referenceWidth":320,"minMultiplier":0.5,"maxMultiplier":2},"parts":{"viewport":".carousel__viewport","previous":".carousel__previous","next":".carousel__next","rotation":".carousel__rotation","picker":".carousel__pagination .pagination__item"},"progress":[{"selector":".carousel__pagination .pagination__fill","effect":"elapsed-width","steps":10,"when":{"axis":"indicator","values":["pagination","both"]}},{"selector":".carousel__ring","effect":"elapsed-ring","steps":10,"when":{"axis":"indicator","values":["next","both"]}}]});
  private sequenceCleanup = this.destroyRef.onDestroy(() => this.sequence.destroy());
  private sequenceEffect = effect(() => this.sequence.sync({
    index: this.behavior.slide(), labels: this.slides ?? [], autoPlay: this.autoPlay ?? false,
    presentation: { "indicator": this.indicator },
    messages: { start: this.fsdsMessages().rotationStart, stop: this.fsdsMessages().rotationStop, item: this.fsdsMessages().slideRoleDescription, position: this.fsdsMessages().slidePosition },
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
