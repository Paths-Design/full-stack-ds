// @generated:start imports
import { Component, Input, computed, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { useTabsContext } from "./useTabs.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-tabs-panel",
  standalone: true,
  imports: [NgClass, NgIf],
  template: `<div
  *ngIf="!ctx.unmountInactive() || isActive()"
  role="tabpanel"
  [ngClass]="classes()"
  [attr.id]="ctx.idBase + '-panel-' + value"
  [attr.aria-labelledby]="ctx.idBase + '-tab-' + value"
  [attr.tabindex]="0"
  [attr.hidden]="!isActive() ? true : null"
><ng-content /></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsPanelComponent {
  @Input({ required: true }) value!: string;
  @Input() class?: string;
  @Input() dataTestid?: string;

  protected ctx = useTabsContext();

  isActive = computed(() => this.ctx.activeTab() === this.value);

  classes = computed(() =>
    ["tabs__panel", this.class].filter(Boolean).join(" "),
  );
}
// @generated:end

// @custom:start trailing

// @custom:end