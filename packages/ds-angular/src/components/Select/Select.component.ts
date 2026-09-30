// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, ViewChild, ElementRef, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgIf, NgFor } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
import { useSelect } from "./useSelect.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
let nextInstanceId = 0;

@Component({
  selector: "fsds-select",
  standalone: true,
  imports: [NgClass, NgIf, NgFor],
  host: { "data-fsds-component": "select" },
  template: `<div [ngClass]="classes()" role="combobox" aria-haspopup="listbox" [attr.aria-label]="(triggerLabel ?? 'Select an option')" [attr.aria-expanded]="behavior.open()" [attr.aria-disabled]="disabled" [attr.aria-controls]="rootAriaControls" data-fsds-box="">
  <button [ngClass]="'select__trigger'" #interactionAnchor type="button" (click)="behavior.setOpen(!behavior.open())" (keydown)="behavior.handleTriggerKeydown($event)" [disabled]="disabled" [attr.aria-label]="(triggerLabel ?? 'Select an option')" [attr.aria-expanded]="behavior.open()" [attr.aria-controls]="triggerAriaControls">
    <span [ngClass]="'select__text'">
      {{ selectionLabel((options ?? [{'value':'alpha','label':'Alpha'},{'value':'beta','label':'Beta'},{'value':'gamma','label':'Gamma'}]), behavior.selection(), (placeholder ?? 'Select an option')) }}
    </span>
  </button>
  <ng-container *ngIf="behavior.open()">
    <div [ngClass]="'select__content'" #interactionPanel role="listbox" (keydown)="behavior.handleContentKeydown($event)" tabindex="-1" [attr.id]="instanceId + '-content'">
      <ng-container *ngIf="searchable">
        <div [ngClass]="'select__search'">
          <input [ngClass]="'select__searchInput'" type="text" [attr.aria-label]="(searchLabel ?? 'Search options')" [disabled]="disabled" />
        </div>
      </ng-container>
      <div [ngClass]="'select__options'">
        <ng-container *ngFor="let item of ((options ?? [{'value':'alpha','label':'Alpha'},{'value':'beta','label':'Beta'},{'value':'gamma','label':'Gamma'}])); let index = index">
          <button [ngClass]="'select__option'" role="option" type="button" (click)="applyToggleMembershipSelection(item.value, multiple)" (keydown)="behavior.handleOptionKeydown($event, item.value)" tabindex="-1" [attr.aria-selected]="memberOf(item.value, behavior.selection())" [attr.data-value]="item.value" [disabled]="item.disabled" [attr.aria-disabled]="item.disabled">
            <span>
              {{ item.label }}
            </span>
          </button>
        </ng-container>
      </div>
      <ng-container *ngIf="empty">
        <div [ngClass]="'select__emptyState'"></div>
      </ng-container>
    </div>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent {
  @Input() options: SelectOption[] = [{"value":"alpha","label":"Alpha"},{"value":"beta","label":"Beta"},{"value":"gamma","label":"Gamma"}];
  private readonly inputValue = signal<string | string[] | undefined>(undefined);
  @Input() get value(): string | string[] | undefined { return this.inputValue(); }
  set value(value: string | string[] | undefined) { this.inputValue.set(value); }
  @Input() defaultValue?: string | string[] = "beta";
  @Input() onChange?: (value: string | string[]) => void;
  private readonly inputOpen = signal<boolean | undefined>(undefined);
  @Input() get open(): boolean | undefined { return this.inputOpen(); }
  set open(value: boolean | undefined) { this.inputOpen.set(value); }
  @Input() defaultOpen?: boolean = true;
  @Input() onOpenChange?: (open: boolean) => void;
  @Input() multiple?: boolean;
  @Input() disabled?: boolean;
  @Input() triggerLabel?: string = "Select an option";
  @Input() size?: SelectSize = "md";
  @Input() filterFn?: (option: SelectOption, searchTerm: string) => boolean;
  @Input() searchable?: boolean;
  @Input() empty?: boolean;
  @Input() placeholder?: string = "Select an option";
  @Input() searchLabel?: string = "Search options";
  @Input() class?: string;

  protected readonly instanceId = `fsds-select-${nextInstanceId++}`;
  @Input() position?: string;
  @ViewChild("interactionAnchor") set interactionAnchor(element: ElementRef<HTMLElement> | undefined) {
    this.behavior.anchorRef.nativeElement = element?.nativeElement ?? null;
  }
  @ViewChild("interactionPanel") set interactionPanel(element: ElementRef<HTMLElement> | undefined) {
    this.behavior.panelRef.nativeElement = element?.nativeElement ?? null;
  }

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useSelect>;
  protected get behavior(): ReturnType<typeof useSelect> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useSelect({
    value: () => this.value,
    defaultValue: this.defaultValue,
    onChange: (v) => this.onChange?.(v),
    open: () => this.open,
    defaultOpen: this.defaultOpen,
    onOpenChange: (v) => this.onOpenChange?.(v),
    multiple: () => this.multiple,
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "select",
      (this.size ?? "md") ? `select--${(this.size ?? "md")}` : null,
      this.position ? `select--${this.position}` : null,
      this.behavior.open() ? "select--open" : null,
      this.disabled ? "select--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  get rootAriaControls(): string | undefined {
    return [this.behavior.open() ? `${this.instanceId}-content` : null].filter(Boolean).join(" ") || undefined;
  }

  get triggerAriaControls(): string | undefined {
    return [this.behavior.open() ? `${this.instanceId}-content` : null].filter(Boolean).join(" ") || undefined;
  }

  // BindingExpressionV2 predicate:memberOf helper. Adapts to the runtime
  // shape of `selection`: scalar equality when not an array, set
  // membership otherwise. Used for channels typed `T | T[]`.
  protected memberOf(candidate: unknown, selection: unknown): boolean {
    return Array.isArray(selection) ? selection.includes(candidate) : candidate === selection;
  }
  protected selectionLabel(options: readonly { value: string; label: string }[] | undefined, selection: string | string[] | undefined, fallback: string): string {
    return ((options || []).filter(option => (Array.isArray(selection) ? selection : [selection]).includes(option.value)).map(option => option.label).join(', ') || fallback);
  }

  // Replace (single mode) or toggle `member`'s array membership (multi mode).
  protected applyToggleMembershipSelection(member: string, modeGate: boolean | undefined): void {
    if (!modeGate) {
      this.behavior.setSelection(member);
      return;
    }
    const currentValue = this.behavior.selection();
    const arr: string[] = Array.isArray(currentValue)
      ? [...currentValue]
      : currentValue == null ? [] : [currentValue];
    this.behavior.setSelection(arr.includes(member) ? arr.filter((v) => v !== member) : [...arr, member]);
  }
}

@Component({
  selector: "fsds-select-trigger",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="button" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectTriggerComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["select__trigger", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-select-content",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectContentComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["select__content", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-select-option",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="li" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectOptionComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["select__option", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
