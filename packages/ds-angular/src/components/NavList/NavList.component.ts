// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type NavListOrientation = "vertical" | "horizontal";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-nav-list",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "nav-list" },
  template: `<nav [ngClass]="classes()" [attr.aria-label]="ariaLabel" data-fsds-box="">
  <ul [ngClass]="'nav-list__list'">
    <ng-content />
  </ul>
</nav>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavListComponent {
  @Input() orientation?: NavListOrientation = "vertical";
  @Input() ariaLabel?: string;
  @Input() class?: string;

  classes(): string {
    return [
      "nav-list",
      (this.orientation ?? "vertical") ? `nav-list--${(this.orientation ?? "vertical")}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-nav-list-list",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="ul" variant="horizontal" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavListListComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["nav-list__list", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-nav-list-item",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="li" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavListItemComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["nav-list__item", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
