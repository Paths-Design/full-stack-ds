// @generated:start imports
import { Component, Input, ElementRef, inject, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
import { isRtl } from "../../primitives/direction/direction.js";
import { useTabsContext } from "./useTabs.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-tabs-list",
  standalone: true,
  imports: [NgClass],
  template: `<div
  #listEl
  role="tablist"
  tabindex="-1"
  [ngClass]="classes()"
  [attr.aria-orientation]="ctx.orientation()"
  (keydown)="handleKeyDown($event)"
><ng-content /><span [ngClass]="'tabs__indicator'" aria-hidden="true"></span></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsListComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  protected ctx = useTabsContext();
  private elRef = inject(ElementRef<HTMLElement>);

  classes(): string {
    return ["tabs__list", this.class].filter(Boolean).join(" ");
  }

  handleKeyDown(e: KeyboardEvent): void {
    const tabs = this.ctx.registeredTabs();
    if (tabs.length === 0) return;
    const currentIndex = tabs.indexOf(this.ctx.activeTab());
    const isHorizontal = this.ctx.orientation() !== "vertical";
    // A horizontal list follows the inline direction: the arrow pointing
    // toward the inline end moves to the next tab.
    const rtl = isRtl(e.currentTarget);
    const towardEnd = rtl ? e.key === "ArrowLeft" : e.key === "ArrowRight";
    const towardStart = rtl ? e.key === "ArrowRight" : e.key === "ArrowLeft";
    let nextIndex = currentIndex;

    if (
      (isHorizontal && towardEnd) ||
      (!isHorizontal && e.key === "ArrowDown")
    ) {
      e.preventDefault();
      nextIndex = this.ctx.loop()
        ? (currentIndex + 1) % tabs.length
        : Math.min(currentIndex + 1, tabs.length - 1);
    } else if (
      (isHorizontal && towardStart) ||
      (!isHorizontal && e.key === "ArrowUp")
    ) {
      e.preventDefault();
      nextIndex = this.ctx.loop()
        ? (currentIndex - 1 + tabs.length) % tabs.length
        : Math.max(currentIndex - 1, 0);
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = tabs.length - 1;
    } else if (e.key === "Enter" || e.key === " ") {
      if (this.ctx.activationMode() === "manual") {
        e.preventDefault();
        const host = this.elRef.nativeElement as HTMLElement;
        const focusedBtn = host.querySelector<HTMLButtonElement>('[role="tab"]:focus');
        if (focusedBtn) {
          const val = focusedBtn.getAttribute("data-value");
          if (val) this.ctx.setActiveTab(val);
        }
      }
      return;
    } else {
      return;
    }

    const targetValue = tabs[nextIndex];
    if (this.ctx.activationMode() === "automatic") {
      this.ctx.setActiveTab(targetValue);
    }
    const host = this.elRef.nativeElement as HTMLElement;
    const btn = host.querySelector<HTMLButtonElement>(
      `[role="tab"][data-value="${targetValue}"]`,
    );
    btn?.focus();
  }
}
// @generated:end

// @custom:start trailing

// @custom:end