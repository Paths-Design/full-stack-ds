// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
import { injectFsdsMessages } from "../../primitives/messages.js";
import { StackComponent } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types


function fsdsDecorativeContent(value: unknown): string {
  const text = String(value ?? "");
  return text === "" ? "none" : '"' + Array.from(text, character => "\\" + character.codePointAt(0)!.toString(16) + " ").join("") + '" / ""';
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
const BreadcrumbsMessages = { navigationLabel: "Breadcrumb" };

@Component({
  selector: "fsds-breadcrumbs",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "breadcrumbs" },
  template: `<nav [ngClass]="classes()" [attr.aria-label]="(ariaLabel ?? fsdsMessages().navigationLabel)" data-fsds-box="">
  <ol [ngClass]="'breadcrumbs__list'" [style.--fsds-breadcrumbs-child-separator]="fsdsDecorativeContent((separator ?? '/'))">
    <ng-content />
  </ol>
</nav>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent {
  protected readonly fsdsDecorativeContent = fsdsDecorativeContent;
  protected readonly fsdsMessages = injectFsdsMessages("Breadcrumbs", BreadcrumbsMessages);
  @Input() ariaLabel?: string;
  @Input() separator?: string = "/";
  @Input() class?: string;

  classes(): string {
    return [
      "breadcrumbs",
      this.class,
    ].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-breadcrumbs-list",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="ul" variant="horizontal" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsListComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["breadcrumbs__list", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "li[fsdsBreadcrumbsItem], fsds-breadcrumbs-item",
  standalone: true,
  template: `<ng-content />`,
  host: { "[class]": "classes()", "role": "listitem", "[attr.data-testid]": "dataTestid" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsItemComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;
  classes(): string { return ["breadcrumbs__item", this.class].filter(Boolean).join(" "); }
}
// @generated:end

// @custom:start trailing

// @custom:end
