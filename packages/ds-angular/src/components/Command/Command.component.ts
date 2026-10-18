// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, ElementRef, Injector, runInInjectionContext, untracked, type OnInit, type OnDestroy } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
import { IconComponent } from "../Icon/Icon.component.js";
import { useCommand } from "./useCommand.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
let nextInstanceId = 0;

@Component({
  selector: "fsds-command",
  standalone: true,
  imports: [NgClass, NgIf, IconComponent],
  host: { "data-fsds-component": "command" },
  template: `<div [ngClass]="classes()" data-fsds-box="">
  <ng-container *ngIf="behavior.open()">
    <div [ngClass]="'command__overlay'" aria-hidden="true" role="presentation" (click)="behavior.setOpen(false)"></div>
  </ng-container>
  <ng-container *ngIf="behavior.open()">
    <div [ngClass]="'command__dialog'" role="dialog" aria-modal="true" [attr.aria-label]="(label ?? 'Command palette')">
      <div [ngClass]="'command__inputWrapper'">
        <fsds-icon [ngClass]="'command__searchIcon'" name="search" size="sm"></fsds-icon>
        <input [ngClass]="'command__input'" type="search" role="combobox" aria-autocomplete="list" (input)="handleSearchChange($event)" [attr.aria-expanded]="behavior.open()" [attr.aria-label]="(searchLabel ?? 'Search commands')" [placeholder]="(placeholder ?? 'Search...')" [value]="behavior.search()" [attr.id]="instanceId + '-input'" [attr.aria-controls]="instanceId + '-list'" />
      </div>
      <div [ngClass]="'command__list'" role="listbox" [attr.id]="instanceId + '-list'" [attr.aria-labelledby]="instanceId + '-input'">
        <div [ngClass]="'command__empty'"></div>
        <ng-content select="[slot=items]" />
        <div [ngClass]="'command__separator'" role="separator" aria-hidden="true"></div>
      </div>
    </div>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandComponent implements OnInit, OnDestroy {
  private readonly inputOpen = signal<boolean | undefined>(undefined);
  @Input() get open(): boolean | undefined { return this.inputOpen(); }
  set open(value: boolean | undefined) { this.inputOpen.set(value); }
  @Input() defaultOpen?: boolean;
  @Input() onOpenChange?: (open: boolean) => void;
  private readonly inputSearch = signal<string | undefined>(undefined);
  @Input() get search(): string | undefined { return this.inputSearch(); }
  set search(value: string | undefined) { this.inputSearch.set(value); }
  @Input() defaultSearch?: string;
  @Input() onSearchChange?: (value: string) => void;
  @Input() placeholder?: string = "Search...";
  @Input() searchLabel?: string = "Search commands";
  @Input() emptyMessage?: string = "No results found.";
  @Input() label?: string = "Command palette";
  @Input() shouldFilter?: boolean = true;
  @Input() filter?: ((value: string, search: string) => number) | undefined;
  @Input() class?: string;

  protected readonly instanceId = `fsds-command-${nextInstanceId++}`;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useCommand>;
  protected get behavior(): ReturnType<typeof useCommand> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useCommand({
    open: () => this.open,
    defaultOpen: this.defaultOpen,
    onOpenChange: (v) => this.onOpenChange?.(v),
    search: () => this.search,
    defaultSearch: this.defaultSearch,
    onSearchChange: (v) => this.onSearchChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "command",
      this.class,
    ].filter(Boolean).join(" ");
  }

  protected handleSearchChange(event: Event): void {
    this.behavior.setSearch((event.target as HTMLInputElement).value);
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
}

@Component({
  selector: "fsds-command-list",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="ul" variant="horizontal" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandListComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["command__list", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-command-group",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandGroupComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["command__group", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-command-group-heading",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandGroupHeadingComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["command__groupHeading", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-command-group-items",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandGroupItemsComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["command__groupItems", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-command-item",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="li" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandItemComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["command__item", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-command-item-icon",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="span" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandItemIconComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["command__itemIcon", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-command-item-content",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandItemContentComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["command__itemContent", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-command-item-label",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="span" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandItemLabelComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["command__itemLabel", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-command-item-description",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="span" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandItemDescriptionComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["command__itemDescription", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
