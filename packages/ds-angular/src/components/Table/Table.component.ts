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
  selector: "fsds-table",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "table" },
  template: `<div [ngClass]="classes()" data-fsds-box="">
  <table [ngClass]="'table__container'" [attr.aria-label]="ariaLabel">
    <ng-content />
  </table>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent {
  @Input() responsive?: boolean;
  @Input() ariaLabel?: string;
  @Input() class?: string;

  classes(): string {
    return [
      "table",
      this.class,
    ].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "caption[fsdsTableCaption]",
  standalone: true,
  imports: [NgClass],
  template: `<ng-content />`,
  host: {
    "[class]": "classes()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCaptionComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["table__caption", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "thead[fsdsTableHead]",
  standalone: true,
  imports: [NgClass],
  template: `<ng-content />`,
  host: {
    "[class]": "classes()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableHeadComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["table__head", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "tbody[fsdsTableBody]",
  standalone: true,
  imports: [NgClass],
  template: `<ng-content />`,
  host: {
    "[class]": "classes()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableBodyComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["table__body", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "tfoot[fsdsTableFooter]",
  standalone: true,
  imports: [NgClass],
  template: `<ng-content />`,
  host: {
    "[class]": "classes()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableFooterComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["table__footer", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "tr[fsdsTableRow]",
  standalone: true,
  imports: [NgClass],
  template: `<ng-content />`,
  host: {
    "[class]": "classes()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableRowComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["table__row", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "th[fsdsTableHeaderCell]",
  standalone: true,
  imports: [NgClass],
  template: `<ng-content />`,
  host: {
    "[class]": "classes()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableHeaderCellComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["table__headerCell", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "td[fsdsTableCell]",
  standalone: true,
  imports: [NgClass],
  template: `<ng-content />`,
  host: {
    "[class]": "classes()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCellComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["table__cell", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
