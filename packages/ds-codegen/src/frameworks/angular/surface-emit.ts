/**
 * Angular emitter — Anchored Presence Surface path.
 *
 * Activated for any contract whose IR has a `surface` block of an
 * anchored-presence kind (Tooltip, Popover, ...). Surface kind
 * eligibility is decided by `isPartAnchoredSurface` in shared
 * semantics, and per-kind policy (`AnchoredSurfacePolicy`) drives
 * default content role and public dismissal props. This emitter
 * MUST NOT branch on component identity or on `surface.kind` for
 * any rule that could be expressed by the policy.
 *
 * Emits the compound API:
 *
 *   <fsds-popover>
 *     <fsds-popover-trigger>Open</fsds-popover-trigger>          <!-- default-host -->
 *     <fsds-popover-content>Body</fsds-popover-content>
 *   </fsds-popover>
 *
 *   <fsds-popover>
 *     <a fsdsPopoverTrigger href="#open">Open</a>                <!-- adopted host -->
 *     <fsds-popover-content>Body</fsds-popover-content>
 *   </fsds-popover>
 *
 * Host adoption is **attribute-directive based**, Angular's native
 * idiom. The `[fsds<Name>Trigger]` directive inject(s) ElementRef +
 * the <Name>ContextToken; registers its host element as the anchor;
 * applies ARIA + data marker via @HostBinding; and lets the substrate
 * install open-trigger/dismissal DOM listeners directly on it.
 *
 * The default-host `<fsds-<name>-trigger>` component reuses the
 * directive internally on its own rendered <button>, so both modes
 * funnel through the same anchor-registration path.
 */
import type { ComponentIR, SurfaceIR } from "../../ir.js";
import {
  anchoredPortalsContentToBody,
  isPartAnchoredSurface,
  resolveAnchoredSurfacePolicy,
  type AnchoredSurfacePolicy,
  type PublicDismissalProp,
} from "../../semantics.js";
import { TYPE_ONLY_ANGULAR_CORE } from "./emitted-imports.js";

export interface AngularSurfaceFiles {
  rootComponent: string;
  triggerComponent: string;
  triggerDirective: string;
  contentComponent: string;
  composable: string;
}

export function isSurfaceComponent(ir: ComponentIR): boolean {
  return ir.surface !== undefined && isPartAnchoredSurface(ir.surface);
}

export function generateAngularSurfaceFiles(ir: ComponentIR): AngularSurfaceFiles {
  const surface = ir.surface;
  if (!surface) {
    throw new Error(
      `generateAngularSurfaceFiles called on ${ir.name} without ir.surface`,
    );
  }
  const policy = resolveAnchoredSurfacePolicy(surface);
  return {
    rootComponent: emitRootComponent(ir, surface, policy),
    triggerComponent: emitTriggerComponent(ir, surface),
    triggerDirective: emitTriggerDirective(ir, surface),
    contentComponent: emitContentComponent(ir, surface, policy),
    composable: emitComposable(ir, surface),
  };
}

function kebab(name: string): string {
  return name.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
}

function tagFor(name: string): string {
  return `fsds-${kebab(name)}`;
}

function emitRootComponent(
  ir: ComponentIR,
  surface: SurfaceIR,
  policy: AnchoredSurfacePolicy,
): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;
  const placementValues = ir.variants["placement"];
  const placementTypeAlias = placementValues
    ? `export type ${name}Placement = ${placementValues.map((v) => `"${v}"`).join(" | ")};\n`
    : "";
  const rootTag = tagFor(name);
  const openTriggers = JSON.stringify(surface.openTriggers);
  const anchorRelation = surface.anchor?.relation ?? "describedby";
  const positioningEnabled = surface.positioning?.strategy === "anchored";

  // Policy-derived dismissal-array assembly. For each declared
  // dismissal mode:
  //   - public + runtime-toggleable modes (escape, blur,
  //     outside-click) gate behind `this._<closeOnProp>() !== false`
  //     so toggling the @Input at runtime drives a substrate remount.
  //   - internal-only modes (pointer-leave, ...) are always-on.
  const dismissalParts = policy.publicDismissalProps.map((spec) =>
    spec.prop && spec.runtimeToggleable
      ? `this._${spec.prop}() !== false ? "${spec.mode}" as const : null`
      : `"${spec.mode}" as const`,
  );
  const dismissalExpr = dismissalParts.join(",\n      ");

  // Policy-derived public @Input + private signal mirror for each
  // consumer-facing dismissal flag. Entries with `prop: null` (e.g.
  // tooltip's pointer-leave) don't surface to the consumer.
  const publicDismissalProps = policy.publicDismissalProps.filter(
    (spec): spec is PublicDismissalProp & { prop: string } =>
      spec.prop !== null,
  );
  const closeOnInputLines = publicDismissalProps.map(
    (spec) => `  @Input() ${spec.prop}?: boolean;`,
  );
  const closeOnSignalLines = publicDismissalProps.map(
    (spec) => `  private _${spec.prop} = signal<boolean | undefined>(undefined);`,
  );
  // Each runtime-toggleable closeOn* @Input mirrors into its signal
  // and asks the substrate to remount so the new dismissal array
  // takes effect mid-life.
  const closeOnNgOnChangesBlocks = publicDismissalProps
    .filter((spec) => spec.runtimeToggleable)
    .flatMap((spec) => [
      `    if (changes["${spec.prop}"]) {`,
      `      this._${spec.prop}.set(this.${spec.prop});`,
      `      this.behavior?.requestRemount();`,
      `    }`,
    ]);

  return [
    `// @generated:start imports`,
    `import {`,
    `  Component,`,
    `  Input,`,
    `  type OnChanges,`,
    `  type OnInit,`,
    `  type SimpleChanges,`,
    `  computed,`,
    `  signal,`,
    `  forwardRef,`,
    `  inject,`,
    `  DestroyRef,`,
    `  ChangeDetectionStrategy,`,
    `} from "@angular/core";`,
    `import { NgClass } from "@angular/common";`,
    `import { use${name}, ${name}ContextToken, type ${name}ContextValue } from "./use${name}.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start types`,
    placementTypeAlias.trimEnd(),
    `// @generated:end`,
    ``,
    `// @custom:start types`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start component`,
    `@Component({`,
    `  selector: "${rootTag}",`,
    `  standalone: true,`,
    `  imports: [NgClass],`,
    `  providers: [`,
    `    {`,
    `      provide: ${name}ContextToken,`,
    `      useFactory: () => {`,
    `        const self = inject(forwardRef(() => ${name}Component));`,
    `        const ctx: ${name}ContextValue = {`,
    `          get open() { return self.behavior.open; },`,
    `          setOpen: (v) => self.behavior.setOpen(v),`,
    `          get contentId() { return self.behavior.contentId; },`,
    `          anchorRelation: "${anchorRelation}",`,
    `          registerAnchor: (n) => self.behavior.registerAnchor(n),`,
    `          registerContent: (n) => self.behavior.registerContent(n),`,
    `          getAnchorNode: () => self.behavior.getAnchorNode(),`,
    `          getContentNode: () => self.behavior.getContentNode(),`,
    positioningEnabled ? `          getPlacement: () => self.placement,` : "",
    `        };`,
    `        return ctx;`,
    `      },`,
    `      deps: [],`,
    `    },`,
    `  ],`,
    `  host: { "data-fsds-component": "${ir.cssPrefix}" },`,
    `  template: \`<span data-fsds-box="" [ngClass]="classes()"><ng-content /></span>\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${name}Component implements OnChanges, OnInit {`,
    `  @Input() open?: boolean;`,
    `  @Input() defaultOpen?: boolean;`,
    `  @Input() onOpenChange?: (open: boolean) => void;`,
    placementValues ? `  @Input() placement?: ${name}Placement;` : "",
    `  @Input() disabled?: boolean;`,
    ...closeOnInputLines,
    `  @Input() class?: string;`,
    ``,
    `  // Signal mirrors of @Input values. The root owns its own`,
    `  // uncontrolled state here so we can seed it from defaultOpen in`,
    `  // ngOnInit (Angular sets @Input values after constructor but`,
    `  // before ngOnInit) without routing through onOpenChange.`,
    `  private _controlledOpen = signal<boolean | undefined>(undefined);`,
    `  private _uncontrolledOpen = signal<boolean>(false);`,
    `  private _disabled = signal<boolean>(false);`,
    ...closeOnSignalLines,
    ``,
    `  ngOnChanges(changes: SimpleChanges): void {`,
    `    if (changes["open"]) this._controlledOpen.set(this.open);`,
    `    if (changes["disabled"]) this._disabled.set(this.disabled === true);`,
    ...closeOnNgOnChangesBlocks,
    `  }`,
    ``,
    `  ngOnInit(): void {`,
    `    // Seed uncontrolled state from defaultOpen. Silent — does NOT`,
    `    // fire onOpenChange because we mutate the signal directly`,
    `    // instead of routing through the substrate's setOpen.`,
    `    if (this.defaultOpen === true && this.open === undefined) {`,
    `      this._uncontrolledOpen.set(true);`,
    `    }`,
    `  }`,
    ``,
    `  private destroyRef = inject(DestroyRef);`,
    `  // The substrate reads open via a unified getter that picks`,
    `  // controlled or uncontrolled. We pass defaultOpen=false (the`,
    `  // root component handles seeding in ngOnInit above).`,
    `  protected behavior = use${name}({`,
    `    open: () => {`,
    `      const controlled = this._controlledOpen();`,
    `      return controlled === undefined ? this._uncontrolledOpen() : controlled;`,
    `    },`,
    `    defaultOpen: false,`,
    `    onOpenChange: (v) => {`,
    `      // Substrate's setOpen routes through here. If we are`,
    `      // uncontrolled, mirror to our local signal too so future`,
    `      // open() reads pick up the change.`,
    `      if (this._controlledOpen() === undefined) this._uncontrolledOpen.set(v);`,
    `      this.onOpenChange?.(v);`,
    `    },`,
    `    openTriggers: () => ${openTriggers},`,
    `    dismissal: () => this._buildDismissal(),`,
    `    disabled: () => this._disabled(),`,
    `    destroyRef: this.destroyRef,`,
    `  });`,
    ``,
    `  private _buildDismissal() {`,
    `    return [`,
    `      ${dismissalExpr}`,
    `    ].filter((d): d is Exclude<typeof d, null> => d !== null);`,
    `  }`,
    ``,
    `  classes = computed(() =>`,
    `    [`,
    `      "${cssPrefix}",`,
    placementValues
      ? `      this.placement ? \`${cssPrefix}--\${this.placement}\` : null,`
      : "",
    `      this.disabled ? "${cssPrefix}--disabled" : null,`,
    `      this.class,`,
    `    ].filter(Boolean).join(" "),`,
    `  );`,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    ``,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function emitTriggerDirective(ir: ComponentIR, surface: SurfaceIR): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;
  const anchorRelation = surface.anchor?.relation ?? "describedby";

  // ARIA host bindings keyed on the anchor relation. The directive
  // applies these via @HostBinding so the consumer's element (or our
  // default <button>) gets the right ARIA reactively.
  const ariaHostBindings = (() => {
    if (anchorRelation === "describedby") {
      return [
        `  @HostBinding("attr.aria-describedby") get _ariaDescribedBy(): string | null {`,
        `    const ctx = this.ctx;`,
        `    return ctx && ctx.open() ? ctx.contentId : null;`,
        `  }`,
      ].join("\n");
    }
    if (anchorRelation === "controls-expanded") {
      return [
        `  @HostBinding("attr.aria-controls") get _ariaControls(): string | null {`,
        `    return this.ctx ? this.ctx.contentId : null;`,
        `  }`,
        ``,
        `  @HostBinding("attr.aria-expanded") get _ariaExpanded(): string | null {`,
        `    return this.ctx ? (this.ctx.open() ? "true" : "false") : null;`,
        `  }`,
      ].join("\n");
    }
    if (anchorRelation === "labelledby") {
      return [
        `  @HostBinding("attr.aria-labelledby") get _ariaLabelledBy(): string | null {`,
        `    const ctx = this.ctx;`,
        `    return ctx && ctx.open() ? ctx.contentId : null;`,
        `  }`,
      ].join("\n");
    }
    return `  // no ARIA host binding for anchor relation "${anchorRelation}"`;
  })();

  return [
    `// @generated:start imports`,
    `import {`,
    `  Directive,`,
    `  ElementRef,`,
    `  HostBinding,`,
    `  type OnInit,`,
    `  type OnDestroy,`,
    `  inject,`,
    `} from "@angular/core";`,
    // CODEGEN-EMIT-LINT-HYGIENE-01: the directive body consumes only the
    // context TOKEN (it registers the host with the root's controller);
    // the Value type is never referenced — do not import it.
    `import { ${name}ContextToken } from "./use${name}.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start directive`,
    `/**`,
    ` * Attribute directive that lets a consumer adopt their own`,
    ` * element as the Tooltip anchor:`,
    ` *`,
    ` *   <fsds-tooltip>`,
    ` *     <a fsdsTooltipTrigger href="#help">Save</a>`,
    ` *     <fsds-tooltip-content>Help</fsds-tooltip-content>`,
    ` *   </fsds-tooltip>`,
    ` *`,
    ` * Registers the host element as the anchor with the nearest`,
    ` * Tooltip root context. Applies ARIA + data marker via host`,
    ` * bindings. DOM event listeners (pointerenter, focus, etc.) are`,
    ` * installed by the substrate's AnchoredSurfaceController on the`,
    ` * host element directly.`,
    ` */`,
    `@Directive({`,
    `  selector: "[fsds${name}Trigger]",`,
    `  standalone: true,`,
    `})`,
    `export class ${name}TriggerDirective implements OnInit, OnDestroy {`,
    `  private elRef = inject(ElementRef<HTMLElement>);`,
    `  protected ctx = inject(${name}ContextToken, { optional: true });`,
    ``,
    `  @HostBinding("attr.data-${cssPrefix}-trigger") get _dataMarker(): string {`,
    `    return "";`,
    `  }`,
    ``,
    ariaHostBindings,
    ``,
    `  ngOnInit(): void {`,
    `    if (!this.ctx) {`,
    `      throw new Error(`,
    `        "[fsds${name}Trigger] used outside of <${tagFor(name)}>.",`,
    `      );`,
    `    }`,
    `    this.ctx.registerAnchor(this.elRef.nativeElement);`,
    `  }`,
    ``,
    `  ngOnDestroy(): void {`,
    `    this.ctx?.registerAnchor(null);`,
    `  }`,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    ``,
  ].join("\n");
}

function emitTriggerComponent(ir: ComponentIR, _surface: SurfaceIR): string {
  const name = ir.name;
  const triggerTag = `${tagFor(name)}-trigger`;
  return [
    `// @generated:start imports`,
    `import { Component, ChangeDetectionStrategy } from "@angular/core";`,
    `import { ${name}TriggerDirective } from "./${name}Trigger.directive.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start component`,
    `/**`,
    ` * Default-host trigger component. Renders a <button> and adopts`,
    ` * it as the anchor via the same [fsds${name}Trigger] directive`,
    ` * consumers use for their own elements. Both default-host and`,
    ` * host-adoption funnel through the directive's registration.`,
    ` */`,
    `@Component({`,
    `  selector: "${triggerTag}",`,
    `  standalone: true,`,
    `  imports: [${name}TriggerDirective],`,
    `  template: \`<button type="button" fsds${name}Trigger><ng-content /></button>\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${name}TriggerComponent {}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    ``,
  ].join("\n");
}

function emitContentComponent(
  ir: ComponentIR,
  surface: SurfaceIR,
  policy: AnchoredSurfacePolicy,
): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;
  // Policy-derived default content role. `null` means: do not force
  // an ARIA role on the content host. Popover-kind surfaces let the
  // anchor relation (controls-expanded) carry the semantics; tooltip-
  // kind surfaces default to role="tooltip" unless the contract
  // overrides via `anatomy.parts.<content>.aria.role`.
  const contentRole = policy.defaultContentRole;
  const contentTag = `${tagFor(name)}-content`;
  // Role-reflection host binding. Emitted only when policy yields a
  // non-null role; otherwise the content host carries no `role` attr.
  const roleHostBindingLines = contentRole
    ? [
        `  @HostBinding("attr.role") get _role(): string | null {`,
        `    return this.isOpen() ? "${contentRole}" : null;`,
        `  }`,
        ``,
      ]
    : [];

  // Positioning + portal are driven by the contract and are
  // independent flags (see docs/codegen-authority.md):
  //   - surface.positioning.strategy === "anchored" → instantiate
  //     createAnchoredPosition against the anchor/content nodes the
  //     surface substrate already registers, and apply fixed-position
  //     host bindings (style + data-placement).
  //   - anchoredPortalsContentToBody(ir) → body-append this
  //     component's host element while open, mirroring the Dialog
  //     root-portal idiom (ngOnInit/ngOnDestroy save/restore original
  //     position). Portaling escapes ancestor stacking contexts and
  //     `overflow` clipping; the anchor/trigger stays in place.
  const positioningEnabled = surface.positioning?.strategy === "anchored";
  const collision = surface.positioning?.collision ?? "flip-shift";
  const portalsToBody = anchoredPortalsContentToBody({
    behavior: { portal: ir.behavior.portal },
    surface: { positioning: surface.positioning },
  });

  const positioningImportLines = positioningEnabled
    ? [
        `import {`,
        `  createAnchoredPosition,`,
        `  type CreateAnchoredPositionResult,`,
        `} from "../../primitives/surfaces/createAnchoredPosition.js";`,
      ]
    : [];

  const positioningFieldLines = positioningEnabled
    ? [
        ``,
        `  // Positioning substrate. Fed with getters for the anchor/`,
        `  // content nodes the surface registers and the resolved`,
        `  // placement input; recomputed whenever open/anchor/content`,
        `  // change via requestUpdate() below.`,
        `  private _position: CreateAnchoredPositionResult = createAnchoredPosition({`,
        `    anchor: () => this.ctx?.getAnchorNode() ?? null,`,
        `    content: () => this.ctx?.getContentNode() ?? null,`,
        `    open: () => this.isOpen(),`,
        `    placement: () => this.ctx?.getPlacement() ?? "auto",`,
        `    collision: () => "${collision}",`,
        `    destroyRef: inject(DestroyRef),`,
        `  });`,
      ]
    : [];

  const positioningHostBindingLines = positioningEnabled
    ? [
        `  @HostBinding("attr.data-placement") get _dataPlacement(): string | null {`,
        `    return this.isOpen() ? this._position.state().placement : null;`,
        `  }`,
        ``,
        `  @HostBinding("style.position") get _stylePosition(): string | null {`,
        `    return this.isOpen() ? "fixed" : null;`,
        `  }`,
        ``,
        `  @HostBinding("style.top.px") get _styleTop(): number | null {`,
        `    return this.isOpen() ? this._position.state().top : null;`,
        `  }`,
        ``,
        `  @HostBinding("style.left.px") get _styleLeft(): number | null {`,
        `    return this.isOpen() ? this._position.state().left : null;`,
        `  }`,
        ``,
        `  @HostBinding("style.visibility") get _styleVisibility(): string | null {`,
        `    if (!this.isOpen()) return null;`,
        `    return this._position.state().ready ? "visible" : "hidden";`,
        `  }`,
        ``,
      ]
    : [];

  const portalFieldLines = portalsToBody
    ? [
        ``,
        `  // Body-portal bookkeeping: saved so ngOnDestroy can restore`,
        `  // the host to its original in-tree position (Dialog root-`,
        `  // portal precedent). Anchored content has no in-tree`,
        `  // positioning context to lose (it's already position:`,
        `  // fixed against viewport coordinates), so portaling only`,
        `  // needs to escape ancestor stacking/overflow — it does not`,
        `  // need to preserve layout flow the way a non-anchored root`,
        `  // portal would.`,
        `  private _portalOriginParent: Node | null = null;`,
        `  private _portalOriginNext: Node | null = null;`,
        `  private _portalAppended = false;`,
      ]
    : [];

  const ngAfterViewInitBody = [
    `  ngAfterViewInit(): void {`,
    `    this.ctx?.registerContent(this.elRef.nativeElement);`,
    positioningEnabled ? `    this._position.requestUpdate();` : "",
    `  }`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const portalSyncBody = portalsToBody
    ? [
        ``,
        `  // Body-append while open; restore to the original in-tree`,
        `  // position on close (or destroy). Runs after each`,
        `  // \`isOpen()\`-affecting change because *ngIf on the`,
        `  // \`<ng-container>\` only gates the projected content — the`,
        `  // host element itself is always in the DOM for host`,
        `  // bindings to apply to, so the portal move is host-driven`,
        `  // here rather than template-driven.`,
        `  private _syncPortal(): void {`,
        `    if (typeof document === "undefined") return;`,
        `    const host = this.elRef.nativeElement;`,
        `    if (this.isOpen()) {`,
        `      if (this._portalAppended) return;`,
        `      this._portalOriginParent = host.parentNode;`,
        `      this._portalOriginNext = host.nextSibling;`,
        `      document.body.appendChild(host);`,
        `      this._portalAppended = true;`,
        `    } else {`,
        `      if (!this._portalAppended) return;`,
        `      if (this._portalOriginParent && this._portalOriginParent.isConnected) {`,
        `        this._portalOriginParent.insertBefore(host, this._portalOriginNext);`,
        `      } else {`,
        `        host.parentNode?.removeChild(host);`,
        `      }`,
        `      this._portalAppended = false;`,
        `    }`,
        `  }`,
      ].join("\n")
    : "";

  const ngOnDestroyBody = [
    `  ngOnDestroy(): void {`,
    `    this.ctx?.registerContent(null);`,
    portalsToBody
      ? [
          `    if (this._portalAppended && typeof document !== "undefined") {`,
          `      const host = this.elRef.nativeElement;`,
          `      if (this._portalOriginParent && this._portalOriginParent.isConnected) {`,
          `        this._portalOriginParent.insertBefore(host, this._portalOriginNext);`,
          `      } else {`,
          `        host.parentNode?.removeChild(host);`,
          `      }`,
          `      this._portalAppended = false;`,
          `    }`,
        ].join("\n")
      : "",
    `  }`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  // isOpen() drives both the positioning recompute and the portal
  // move. Angular's OnPush + signal-computed `isOpen` doesn't offer a
  // template-level "value changed" hook, so we re-derive from a
  // computed effect-free read inside the host-binding getters
  // (positioning) and re-run the portal sync from ngDoCheck, which
  // OnPush components still receive on signal-triggered CD runs.
  const ngDoCheckBody =
    positioningEnabled || portalsToBody
      ? [
          ``,
          `  private _lastOpen = false;`,
          `  ngDoCheck(): void {`,
          `    const open = this.isOpen();`,
          `    if (open === this._lastOpen) return;`,
          `    this._lastOpen = open;`,
          positioningEnabled ? `    this._position.requestUpdate();` : "",
          portalsToBody ? `    this._syncPortal();` : "",
          `  }`,
        ]
          .filter((line) => line !== "")
          .join("\n")
      : "";

  const lifecycleInterfaces = [
    "AfterViewInit",
    "OnDestroy",
    positioningEnabled || portalsToBody ? "DoCheck" : "",
  ].filter((v) => v !== "");

  // CODEGEN-EMIT-LINT-HYGIENE-01: lifecycle interfaces are always
  // type-only references (implements clauses / signatures) — import them
  // with inline type markers.
  const coreImportNames = [
    "Component",
    "ElementRef",
    "HostBinding",
    "AfterViewInit",
    "OnDestroy",
    positioningEnabled || portalsToBody ? "DoCheck" : "",
    "inject",
    "computed",
    positioningEnabled ? "DestroyRef" : "",
    "ChangeDetectionStrategy",
  ]
    .filter((v) => v !== "")
    .map((n) => (TYPE_ONLY_ANGULAR_CORE.has(n) ? `type ${n}` : n));

  return [
    `// @generated:start imports`,
    `import {`,
    ...coreImportNames.map((n) => `  ${n},`),
    `} from "@angular/core";`,
    `import { NgIf } from "@angular/common";`,
    `import { ${name}ContextToken } from "./use${name}.js";`,
    ...positioningImportLines,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start component`,
    `@Component({`,
    `  selector: "${contentTag}",`,
    `  standalone: true,`,
    `  imports: [NgIf],`,
    `  template: \`<ng-container *ngIf="isOpen()"><ng-content /></ng-container>\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${name}ContentComponent implements ${lifecycleInterfaces.join(", ")} {`,
    `  private elRef = inject(ElementRef<HTMLElement>);`,
    `  protected ctx = inject(${name}ContextToken, { optional: true });`,
    ``,
    `  // The substrate uses content.contains(relatedTarget) for grace-`,
    `  // path checks. We register the host element so contains() sees`,
    `  // the consumer's projected children too (they live in light DOM`,
    `  // under us). Open-state is reflected via host bindings on the`,
    `  // same host element so ARIA + the data marker apply to the`,
    `  // exact node the substrate registered.`,
    `  protected isOpen = computed(() => this.ctx?.open() ?? false);`,
    ...positioningFieldLines,
    ...portalFieldLines,
    ``,
    `  @HostBinding("attr.id") get _id(): string | null {`,
    `    return this.isOpen() && this.ctx ? this.ctx.contentId : null;`,
    `  }`,
    ``,
    ...roleHostBindingLines,
    `  @HostBinding("attr.data-${cssPrefix}-content") get _dataMarker(): string | null {`,
    `    return this.isOpen() ? "" : null;`,
    `  }`,
    ``,
    ...positioningHostBindingLines,
    ngAfterViewInitBody,
    portalSyncBody,
    ngDoCheckBody,
    ``,
    ngOnDestroyBody,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    ``,
  ].join("\n");
}

function emitComposable(ir: ComponentIR, surface: SurfaceIR): string {
  const name = ir.name;
  const anchorRelation = surface.anchor?.relation ?? "describedby";
  const positioningEnabled = surface.positioning?.strategy === "anchored";
  const placementValues = ir.variants["placement"];
  const placementType = placementValues ? `${name}Placement` : "string";
  // Type-only import of the placement alias from the root component
  // file. Safe against a circular runtime import (the root component
  // imports use${name} for values) because this is `import type` —
  // erased entirely at compile time, no runtime module cycle.
  const placementTypeImportLine =
    positioningEnabled && placementValues
      ? `import type { ${placementType} } from "./${name}.component.js";`
      : "";
  return [
    `// @generated:start imports`,
    [
      `import { InjectionToken, type Signal } from "@angular/core";`,
      `import {`,
      `  createAnchoredSurface,`,
      `  type CreateAnchoredSurfaceOptions,`,
      `  type CreateAnchoredSurfaceResult,`,
      `} from "../../primitives/surfaces/createAnchoredSurface.js";`,
      placementTypeImportLine,
    ]
      .filter((line) => line !== "")
      .join("\n"),
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start types`,
    [
      `export interface ${name}ContextValue {`,
      `  open: Signal<boolean>;`,
      `  setOpen: (next: boolean) => void;`,
      `  contentId: string;`,
      `  anchorRelation: "${anchorRelation}";`,
      `  registerAnchor: (node: HTMLElement | null) => void;`,
      `  registerContent: (node: HTMLElement | null) => void;`,
      `  getAnchorNode: () => HTMLElement | null;`,
      `  getContentNode: () => HTMLElement | null;`,
      positioningEnabled
        ? `  getPlacement: () => ${placementType} | undefined;`
        : "",
      `}`,
    ]
      .filter((line) => line !== "")
      .join("\n"),
    `// @generated:end`,
    ``,
    `// @custom:start types`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start context`,
    `export const ${name}ContextToken = new InjectionToken<${name}ContextValue>(`,
    `  "${name}Context",`,
    `);`,
    `// @generated:end`,
    ``,
    `// @generated:start hook`,
    `// anchorRelation is contract-derived for this surface kind and`,
    `// is set by use${name} itself — consumers don't pass it.`,
    `export type Use${name}Options = Omit<CreateAnchoredSurfaceOptions, "anchorRelation">;`,
    ``,
    `export function use${name}(options: Use${name}Options): CreateAnchoredSurfaceResult {`,
    `  return createAnchoredSurface({`,
    `    ...options,`,
    `    anchorRelation: "${anchorRelation}",`,
    `  });`,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
    ``,
  ].join("\n");
}
