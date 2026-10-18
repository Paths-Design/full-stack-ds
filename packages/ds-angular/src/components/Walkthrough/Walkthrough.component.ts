// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, effect, signal, ElementRef, Injector, runInInjectionContext, untracked, type OnInit, type OnDestroy } from "@angular/core";
import { NgClass, NgFor } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
import { useWalkthrough } from "./useWalkthrough.js";
import {
  createAnchoredPosition,
  type CreateAnchoredPositionResult,
} from "../../primitives/surfaces/createAnchoredPosition.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type WalkthroughStepSpec = { anchor: string; title: string; description?: string };
export type WalkthroughPlacement = "top" | "bottom" | "left" | "right" | "auto";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
let nextInstanceId = 0;

@Component({
  selector: "fsds-walkthrough",
  standalone: true,
  imports: [NgClass, NgFor],
  host: { "data-fsds-component": "walkthrough" },
  template: `<div [ngClass]="classes()" role="status" [attr.aria-label]="(label ?? 'Feature tour')" data-fsds-box="" [attr.data-placement]="_position.state().placement" [style.position]="'fixed'" [style.top.px]="_position.state().top" [style.left.px]="_position.state().left" [style.visibility]="_position.state().ready ? 'visible' : 'hidden'">
  <div [ngClass]="'walkthrough__content'" role="group" [attr.aria-labelledby]="instanceId + '-title'" [attr.aria-describedby]="instanceId + '-description'">
    <h3 [ngClass]="'walkthrough__title'" [attr.aria-label]="(label ?? 'Feature tour')" [attr.id]="instanceId + '-title'">
      <ng-content select="[slot=title]" />
    </h3>
    <p [ngClass]="'walkthrough__description'" [attr.id]="instanceId + '-description'">
      <ng-content select="[slot=description]" />
    </p>
  </div>
  <div [ngClass]="'walkthrough__controls'">
    <button [ngClass]="'walkthrough__skip'" type="button" (click)="onSkip && onSkip()" aria-label="Skip tour">
      {{ 'Skip' }}
    </button>
    <button [ngClass]="'walkthrough__prev'" type="button" (click)="onPrevious && onPrevious()" aria-label="Previous step" [disabled]="(previousDisabled ?? false)">
      {{ 'Previous' }}
    </button>
    <div [ngClass]="'walkthrough__dots'">
      <ng-container *ngFor="let item of ((steps ?? [{'anchor':'#step-1','title':'Welcome to the tour'},{'anchor':'#step-2','title':'Browse your dashboard'},{'anchor':'#step-3','title':'Configure preferences'}])); let index = index">
        <button [ngClass]="'walkthrough__dot'" type="button" (click)="behavior.setStep(index)" [attr.aria-label]="item.title" [attr.data-step-index]="index"></button>
      </ng-container>
    </div>
    <span [ngClass]="'walkthrough__counter'">
      {{ progressLabel }}
    </span>
    <button [ngClass]="'walkthrough__next'" type="button" (click)="onNext && onNext()" [attr.aria-label]="(nextLabel ?? 'Next')">
      {{ (nextLabel ?? 'Next') }}
    </button>
  </div>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalkthroughComponent implements OnInit, OnDestroy {
  @Input() steps?: WalkthroughStepSpec[] = [{"anchor":"#step-1","title":"Welcome to the tour"},{"anchor":"#step-2","title":"Browse your dashboard"},{"anchor":"#step-3","title":"Configure preferences"}];
  private readonly inputIndex = signal<number | undefined>(undefined);
  @Input() get index(): number | undefined { return this.inputIndex(); }
  set index(value: number | undefined) { this.inputIndex.set(value); }
  @Input() defaultIndex?: number = 0;
  @Input() onStepChange?: (index: number) => void;
  @Input() onComplete?: () => void;
  @Input() onSkip?: () => void;
  @Input() label?: string = "Feature tour";
  @Input() storageKey?: string;
  @Input() autoStart?: boolean = false;
  @Input() closeOnOutsideClick?: boolean = false;
  @Input() placement?: WalkthroughPlacement = "auto";
  @Input() onPrevious?: () => void;
  @Input() onNext?: () => void;
  @Input() previousDisabled?: boolean = false;
  @Input() nextLabel?: string = "Next";
  @Input() progressLabel?: string;
  @Input() class?: string;

  protected readonly instanceId = `fsds-walkthrough-${nextInstanceId++}`;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useWalkthrough>;
  protected get behavior(): ReturnType<typeof useWalkthrough> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useWalkthrough({
    index: () => this.index,
    defaultIndex: this.defaultIndex,
    onStepChange: (v) => this.onStepChange?.(v),
    closeOnOutsideClick: this.closeOnOutsideClick,
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "walkthrough",
      (this.placement ?? "auto") ? `walkthrough--${(this.placement ?? "auto")}` : null,
      this.class,
    ].filter(Boolean).join(" ");
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

  private _anchorTargetEl = signal<HTMLElement | null>(null);
  private _anchorResolveEffect = effect(() => {
    const steps = this.steps ?? [];
    const selector = steps[this.behavior.step()]?.anchor;
    this._anchorTargetEl.set(
      typeof document === "undefined" || !selector
        ? null
        : document.querySelector<HTMLElement>(selector),
    );
  });

  protected _position: CreateAnchoredPositionResult = createAnchoredPosition({
    anchor: () => this._anchorTargetEl(),
    content: () => this._el.nativeElement,
    open: () => true,
    placement: () => this.placement ?? "auto",
    collision: () => "flip-shift",
    destroyRef: this.destroyRef,
  });
  private _anchorPositionEffect = effect(() => {
    this._anchorTargetEl();
    this._position.requestUpdate();
  });
}

@Component({
  selector: "fsds-walkthrough-content",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalkthroughContentComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["walkthrough__content", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-walkthrough-title",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="h3" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalkthroughTitleComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["walkthrough__title", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-walkthrough-description",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="p" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalkthroughDescriptionComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["walkthrough__description", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
