// @generated:start imports
import { Component, Input, type OnChanges, type SimpleChanges, computed, signal, forwardRef, inject, DestroyRef, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
import { useTabs, TabsContextToken } from "./useTabs.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type TabsOrientation = "horizontal" | "vertical";
export type TabsAppearance = "underline" | "pills";
export type TabsActivationMode = "automatic" | "manual";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-tabs",
  standalone: true,
  imports: [NgClass],
  providers: [
    {
      provide: TabsContextToken,
      useFactory: () => {
        // "self" is resolved at provide-time (same injector) so the token
        // value is the component instance itself acting as context.
        const self = inject(forwardRef(() => TabsComponent));
        const ctx: import("./useTabs.js").TabsContextValue = {
              get activeTab() { return self.behavior.activeTab; },
              setActiveTab: (v) => self.behavior.setActiveTab(v),
              registerTab: (v) => self.behavior.registerTab(v),
              unregisterTab: (v) => self.behavior.unregisterTab(v),
              get registeredTabs() { return self.behavior.registeredTabs; },
              get idBase() { return self.behavior.idBase; },
              // Config signals — child components read these to stay reactive
              get orientation() { return self._orientation; },
              get activationMode() { return self._activationMode; },
              get loop() { return self._loop; },
              get unmountInactive() { return self._unmountInactive; },
        };
        return ctx;
      },
      deps: [],
    },
  ],
  host: { "data-fsds-component": "tabs" },
  template: `<div data-fsds-box="" [ngClass]="classes()"><ng-content /></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent implements OnChanges {
  @Input() value?: string;
  @Input() defaultValue?: string;
  @Input() onValueChange?: (value: string) => void;
  @Input() orientation?: TabsOrientation = "horizontal";
  @Input() appearance?: TabsAppearance = "underline";
  @Input() activationMode?: TabsActivationMode = "automatic";
  @Input() loop?: boolean = true;
  @Input() unmountInactive?: boolean;
  @Input() idBase?: string;
  @Input() class?: string;

  // Signal mirrors of @Input values — reactive so computed() and child
  // components can track them as signal dependencies.
  // Controlled value: updated in ngOnChanges when the parent changes [value].
  _controlledValue = signal<string | undefined>(undefined);
  // Config signals — exposed to children via context getters.
  _orientation = signal<"horizontal" | "vertical">("horizontal");
  _activationMode = signal<"automatic" | "manual">("automatic");
  _loop = signal<boolean>(true);
  _unmountInactive = signal<boolean>(true);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["value"]) this._controlledValue.set(this.value);
    if (changes["orientation"]) this._orientation.set(this.orientation ?? "horizontal");
    if (changes["activationMode"]) this._activationMode.set(this.activationMode ?? "automatic");
    if (changes["loop"]) this._loop.set(this.loop ?? true);
    if (changes["unmountInactive"]) this._unmountInactive.set(this.unmountInactive ?? true);
  }

  private destroyRef = inject(DestroyRef);
  private initializedBehavior?: ReturnType<typeof useTabs>;
  protected get behavior(): ReturnType<typeof useTabs> {
    return this.initializedBehavior ??= useTabs({
    value: () => this._controlledValue(),
    defaultValue: this.defaultValue,
    onValueChange: (v) => this.onValueChange?.(v),
    idBase: this.idBase,
    destroyRef: this.destroyRef,
    });
  }

  classes = computed(() =>
    [
      "tabs",
      (this.orientation ?? "horizontal") ? `tabs--${(this.orientation ?? "horizontal")}` : null,
      (this.appearance ?? "underline") ? `tabs--${(this.appearance ?? "underline")}` : null,
      (this.activationMode ?? "automatic") ? `tabs--${(this.activationMode ?? "automatic")}` : null,
      this.class,
    ].filter(Boolean).join(" "),
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
