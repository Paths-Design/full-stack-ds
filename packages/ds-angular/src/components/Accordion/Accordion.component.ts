// @generated:start imports
import { Component, Input, type OnChanges, type SimpleChanges, ElementRef, computed, signal, forwardRef, inject, DestroyRef, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
import { useAccordion, AccordionContextToken } from "./useAccordion.js";
import { toggleInteractionItem } from "../../primitives/interaction.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
let _accordionIdCounter = 0;

export type AccordionType = "single" | "multiple";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-accordion",
  standalone: true,
  imports: [NgClass],
  providers: [
    {
      provide: AccordionContextToken,
      useFactory: () => {
        const self = inject(forwardRef(() => AccordionComponent));
        const ctx: import("./useAccordion.js").AccordionContextValue = {
              get openness() { return self.behavior.openness; },
              toggleItem: (v: string) => self.toggleItem(v),
              isItemOpen: (v: string) => self.isItemOpen(v),
              get type() { return self._type; },
              get collapsible() { return self._collapsible; },
              get disabled() { return self._disabled; },
              get idBase() { return self.idBase; },
        };
        return ctx;
      },
      deps: [],
    },
  ],
  host: { "data-fsds-component": "accordion" },
  template: `<div data-fsds-box="" [ngClass]="classes()" (keydown)="handleKeyDown($event)"><ng-content /></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionComponent implements OnChanges {
  @Input() type?: AccordionType = "single";
  @Input() value?: string | string[];
  @Input() defaultValue?: string | string[];
  @Input() onValueChange?: (value: string | string[]) => void;
  @Input() collapsible?: boolean = false;
  @Input() disabled?: boolean;
  @Input() class?: string;

  _controlledValue = signal<string | string[] | undefined>(undefined);
  _type = signal<"single" | "multiple">("single");
  _collapsible = signal<boolean>(false);
  _disabled = signal<boolean>(false);
  readonly idBase = `accordion-${++_accordionIdCounter}`;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["value"]) this._controlledValue.set(this.value);
    if (changes["type"]) this._type.set((this.type as "single" | "multiple") ?? "single");
    if (changes["collapsible"]) this._collapsible.set(this.collapsible ?? false);
    if (changes["disabled"]) this._disabled.set(this.disabled ?? false);
  }

  private destroyRef = inject(DestroyRef);
  private elRef = inject(ElementRef<HTMLElement>);
  private initializedBehavior?: ReturnType<typeof useAccordion>;
  protected get behavior(): ReturnType<typeof useAccordion> {
    return this.initializedBehavior ??= useAccordion({
    value: () => this._controlledValue(),
    defaultValue: this.defaultValue,
    onValueChange: (v) => this.onValueChange?.(v),
    destroyRef: this.destroyRef,
    });
  }

  isItemOpen(itemValue: string): boolean {
    const v = this.behavior.openness();
    return Array.isArray(v) ? v.includes(itemValue) : v === itemValue;
  }

  toggleItem(itemValue: string): void {
    const v = this.behavior.openness();
    this.behavior.setOpenness(toggleInteractionItem(v, itemValue, this._type() === "multiple", this._collapsible()));
  }

  handleKeyDown(e: KeyboardEvent): void {
    const key = e.key;
    if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") {
      return;
    }
    const host = this.elRef.nativeElement as HTMLElement;
    const triggers = Array.from(
      host.querySelectorAll<HTMLButtonElement>("[data-disclosure-trigger]"),
    ).filter((el) => !el.disabled);
    if (triggers.length === 0) return;
    const currentIndex = triggers.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = currentIndex;
    if (key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % triggers.length;
    } else if (key === "ArrowUp") {
      nextIndex = currentIndex < 0 ? triggers.length - 1 : (currentIndex - 1 + triggers.length) % triggers.length;
    } else if (key === "Home") {
      nextIndex = 0;
    } else {
      nextIndex = triggers.length - 1;
    }
    e.preventDefault();
    triggers[nextIndex]?.focus();
  }

  classes = computed(() =>
    [
      "accordion",
      (this.type ?? "single") ? `accordion--${(this.type ?? "single")}` : null,
      this.disabled ? "accordion--disabled" : null,
      this.class,
    ].filter(Boolean).join(" "),
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
