// @generated:start imports
import {
  Component,
  Input,
  type OnChanges,
  type OnInit,
  type SimpleChanges,
  computed,
  signal,
  forwardRef,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { NgClass } from "@angular/common";
import { usePopover, PopoverContextToken, type PopoverContextValue } from "./usePopover.js";
// @generated:end
// @custom:start imports

// @custom:end
// @generated:start types
export type PopoverPlacement = "top" | "bottom" | "left" | "right" | "auto";
// @generated:end
// @custom:start types

// @custom:end
// @generated:start component
@Component({
  selector: "fsds-popover",
  standalone: true,
  imports: [NgClass],
  providers: [
    {
      provide: PopoverContextToken,
      useFactory: () => {
        const self = inject(forwardRef(() => PopoverComponent));
        const ctx: PopoverContextValue = {
          get open() { return self.behavior.open; },
          setOpen: (v) => self.behavior.setOpen(v),
          get contentId() { return self.behavior.contentId; },
          anchorRelation: "controls-expanded",
          registerAnchor: (n) => self.behavior.registerAnchor(n),
          registerContent: (n) => self.behavior.registerContent(n),
          getAnchorNode: () => self.behavior.getAnchorNode(),
          getContentNode: () => self.behavior.getContentNode(),
          getPlacement: () => self.placement,
        };
        return ctx;
      },
      deps: [],
    },
  ],
  host: { "data-fsds-component": "popover" },
  template: `<span data-fsds-box="" [ngClass]="classes()"><ng-content /></span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopoverComponent implements OnChanges, OnInit {
  @Input() open?: boolean;
  @Input() defaultOpen?: boolean;
  @Input() onOpenChange?: (open: boolean) => void;
  @Input() placement?: PopoverPlacement;
  @Input() disabled?: boolean;
  @Input() closeOnEscape?: boolean;
  @Input() closeOnOutsideClick?: boolean;
  @Input() closeOnBlur?: boolean;
  @Input() class?: string;
  // Signal mirrors of @Input values. The root owns its own
  // uncontrolled state here so we can seed it from defaultOpen in
  // ngOnInit (Angular sets @Input values after constructor but
  // before ngOnInit) without routing through onOpenChange.
  private _controlledOpen = signal<boolean | undefined>(undefined);
  private _uncontrolledOpen = signal<boolean>(false);
  private _disabled = signal<boolean>(false);
  private _closeOnEscape = signal<boolean | undefined>(undefined);
  private _closeOnOutsideClick = signal<boolean | undefined>(undefined);
  private _closeOnBlur = signal<boolean | undefined>(undefined);
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["open"]) this._controlledOpen.set(this.open);
    if (changes["disabled"]) this._disabled.set(this.disabled === true);
    if (changes["closeOnEscape"]) {
      this._closeOnEscape.set(this.closeOnEscape);
      this.behavior?.requestRemount();
    }
    if (changes["closeOnOutsideClick"]) {
      this._closeOnOutsideClick.set(this.closeOnOutsideClick);
      this.behavior?.requestRemount();
    }
    if (changes["closeOnBlur"]) {
      this._closeOnBlur.set(this.closeOnBlur);
      this.behavior?.requestRemount();
    }
  }
  ngOnInit(): void {
    // Seed uncontrolled state from defaultOpen. Silent — does NOT
    // fire onOpenChange because we mutate the signal directly
    // instead of routing through the substrate's setOpen.
    if (this.defaultOpen === true && this.open === undefined) {
      this._uncontrolledOpen.set(true);
    }
  }
  private destroyRef = inject(DestroyRef);
  // The substrate reads open via a unified getter that picks
  // controlled or uncontrolled. We pass defaultOpen=false (the
  // root component handles seeding in ngOnInit above).
  protected behavior = usePopover({
    open: () => {
      const controlled = this._controlledOpen();
      return controlled === undefined ? this._uncontrolledOpen() : controlled;
    },
    defaultOpen: false,
    onOpenChange: (v) => {
      // Substrate's setOpen routes through here. If we are
      // uncontrolled, mirror to our local signal too so future
      // open() reads pick up the change.
      if (this._controlledOpen() === undefined) this._uncontrolledOpen.set(v);
      this.onOpenChange?.(v);
    },
    openTriggers: () => ["click"],
    dismissal: () => this._buildDismissal(),
    disabled: () => this._disabled(),
    destroyRef: this.destroyRef,
  });
  private _buildDismissal() {
    return [
      this._closeOnEscape() !== false ? "escape" as const : null,
      this._closeOnOutsideClick() !== false ? "outside-click" as const : null,
      this._closeOnBlur() !== false ? "blur" as const : null
    ].filter((d): d is Exclude<typeof d, null> => d !== null);
  }
  classes = computed(() =>
    [
      "popover",
      this.placement ? `popover--${this.placement}` : null,
      this.disabled ? "popover--disabled" : null,
      this.class,
    ].filter(Boolean).join(" "),
  );
}
// @generated:end
// @custom:start trailing

// @custom:end