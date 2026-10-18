// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgSwitch, NgSwitchCase, NgTemplateOutlet } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CodeSnippetElement = "code" | "kbd" | "samp";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-code-snippet",
  standalone: true,
  imports: [NgClass, NgSwitch, NgSwitchCase, NgTemplateOutlet],
  host: { "data-fsds-component": "code-snippet" },
  template: `<ng-template #fsdsPolymorphicBody>
  {{ text }}
</ng-template>
<ng-container [ngSwitch]="this.as || 'code'">
  <code [ngClass]="classes()" spellcheck="false" data-fsds-box="" *ngSwitchCase="'code'">
    <ng-container [ngTemplateOutlet]="fsdsPolymorphicBody" />
  </code>
  <kbd [ngClass]="classes()" spellcheck="false" data-fsds-box="" *ngSwitchCase="'kbd'">
    <ng-container [ngTemplateOutlet]="fsdsPolymorphicBody" />
  </kbd>
  <samp [ngClass]="classes()" spellcheck="false" data-fsds-box="" *ngSwitchCase="'samp'">
    <ng-container [ngTemplateOutlet]="fsdsPolymorphicBody" />
  </samp>
</ng-container>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeSnippetComponent {
  @Input() text!: string;
  @Input() as?: CodeSnippetElement = "code";
  @Input() class?: string;

  classes(): string {
    return [
      "code-snippet",
      (this.as ?? "code") ? `code-snippet--${(this.as ?? "code")}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
