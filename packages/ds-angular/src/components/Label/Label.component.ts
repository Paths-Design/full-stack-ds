// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-label",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "label" },
  template: `<label [ngClass]="classes()" [htmlFor]="htmlFor" [attr.form]="form" data-fsds-box="">
  <ng-content />
</label>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelComponent {
  @Input() htmlFor?: string;
  @Input() form?: string;
  @Input() class?: string;

  classes(): string {
    return [
      "label",
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
