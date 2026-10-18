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
import { useTooltip, TooltipContextToken, type TooltipContextValue } from "./useTooltip.js";
// @generated:end
// @custom:start imports

// @custom:end
// @generated:start types
export type TooltipPlacement = "top" | "bottom" | "left" | "right" | "auto";
// @generated:end
// @custom:start types

// @custom:end
// @generated:start component
@Component({
  selector: "fsds-tooltip",
  standalone: true,
  imports: [NgClass],
  providers: [
    {
      provide: TooltipContextToken,
      useFactory: () => {
        const self = inject(forwardRef(() => TooltipComponent));
        const ctx: TooltipContextValue = {
          get open() { return self.behavior.open; },
          setOpen: (v) => self.behavior.setOpen(v),
          get contentId() { return self.behavior.contentId; },
          anchorRelation: "describedby",
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
  host: { "data-fsds-component": "tooltip" },
  template: `<span data-fsds-box="" [ngClass]="classes()"><ng-content /></span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent implements OnChanges, OnInit {
  @Input() open?: boolean;
  @Input() defaultOpen?: boolean;
  @Input() onOpenChange?: (open: boolean) => void;
  @Input() placement?: TooltipPlacement;
  @Input() disabled?: boolean;
  @Input() closeOnEscape?: boolean;
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
  private _closeOnBlur = signal<boolean | undefined>(undefined);
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["open"]) this._controlledOpen.set(this.open);
    if (changes["disabled"]) this._disabled.set(this.disabled === true);
    if (changes["closeOnEscape"]) {
      this._closeOnEscape.set(this.closeOnEscape);
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
  protected behavior = useTooltip({
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
    openTriggers: () => ["hover","focus"],
    dismissal: () => this._buildDismissal(),
    disabled: () => this._disabled(),
    destroyRef: this.destroyRef,
  });
  private _buildDismissal() {
    return [
      this._closeOnEscape() !== false ? "escape" as const : null,
      this._closeOnBlur() !== false ? "blur" as const : null,
      "pointer-leave" as const
    ].filter((d): d is Exclude<typeof d, null> => d !== null);
  }
  classes = computed(() =>
    [
      "tooltip",
      this.placement ? `tooltip--${this.placement}` : null,
      this.disabled ? "tooltip--disabled" : null,
      this.class,
    ].filter(Boolean).join(" "),
  );
}
// @generated:end
// @custom:start trailing

// @custom:end