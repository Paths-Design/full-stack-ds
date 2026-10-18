// @generated:start imports
import { Component, Input, type OnInit, type OnDestroy, computed, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
import { useTabsContext } from "./useTabs.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-tabs-tab",
  standalone: true,
  imports: [NgClass],
  template: `<button
  role="tab"
  type="button"
  [ngClass]="classes()"
  [attr.data-value]="value"
  [attr.id]="ctx.idBase + '-tab-' + value"
  [attr.aria-controls]="ctx.idBase + '-panel-' + value"
  [attr.aria-selected]="isActive()"
  [attr.tabindex]="isActive() ? 0 : -1"
  [disabled]="disabled"
  (click)="ctx.setActiveTab(value)"
><ng-content /></button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsTabComponent implements OnInit, OnDestroy {
  @Input({ required: true }) value!: string;
  @Input() disabled?: boolean;
  @Input() class?: string;
  @Input() dataTestid?: string;

  protected ctx = useTabsContext();

  isActive = computed(() => this.ctx.activeTab() === this.value);

  classes = computed(() =>
    [
      "tabs__tab",
      this.isActive() && "tabs__tab--active",
      this.class,
    ].filter(Boolean).join(" "),
  );

  ngOnInit(): void {
    this.ctx.registerTab(this.value);
  }

  ngOnDestroy(): void {
    this.ctx.unregisterTab(this.value);
  }
}
// @generated:end

// @custom:start trailing

// @custom:end