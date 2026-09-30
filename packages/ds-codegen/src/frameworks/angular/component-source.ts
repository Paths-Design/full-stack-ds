import { sequenceConfig } from "../../sequence.js";
/**
 * Angular standalone component emission, IR-driven.
 *
 * Output shape (inline-template Angular 17+ standalone component):
 *
 *   // @generated:start imports
 *   import { Component, Input, computed, ChangeDetectionStrategy } from '@angular/core';
 *   import { NgClass } from '@angular/common';
 *   import { StackComponent } from '@full-stack-ds/angular/primitives';
 *   // @generated:end
 *   // @custom:start imports
 *   // @custom:end
 *
 *   // @generated:start types
 *   export type ButtonSize = 'small' | 'medium' | 'large';
 *   // @generated:end
 *   // @custom:start types
 *   // @custom:end
 *
 *   // @generated:start component
 *   @Component({ ... })
 *   export class ButtonComponent {
 *     @Input() size?: ButtonSize = 'medium';
 *     classes = computed(() => { ... });
 *   }
 *   // @generated:end
 *   // @custom:start trailing
 *   // @custom:end
 */
import type {
  BindingExpression,
  BindingPredicateOp,
  ComponentIR,
  DomNodeIR,
  IdRefIR,
  IterationIR,
  KeyboardActionIR,
  NormalizedChannelIR,
  PropTypeIR,
  ResolvedPropIR,
} from "../../ir.js";
import { componentNeedsInstanceId } from "../../id-relationships.js";
import {
  TABLE_COMPOSITION_TAGS,
  NATIVE_FOCUSABLE_TAGS,
  canonicalTsType,
  channelUpdateMethodName,
  compositeActivationMember,
  composeBindingProjectionExpression,
  composeChannelUpdateExpression,
  composeValueMapExpression,
  collectContentTransforms,
  groupKeyboardActionsByPart,
  isHighlightTransform,
  isMarkdownTransform,
  contentBindingOrTransformSource,
  keyboardModeGateProps,
  focusTargetProps,
} from "../../ir.js";
import {
  emitNonReactTypeAliases,
  translateNonReactType,
} from "../../non-react-types.js";
import { renderSections, type Section } from "../../preserve.js";
import {
  resolveSurfaceAutoDismiss,
  portalsRootToBody,
  selectorAnchoredRootPortal,
} from "../../semantics.js";
import { toKebab as sharedToKebab } from "../../contract.js";
import { resolveComponentRefImports } from "../component-ref-imports.js";
import { angularHighlightParts } from "../highlight-web-parts.js";
import {
  collectIconGlyphNodes,
  ICON_GLYPH_PATH_ATTRS,
  ICONOGRAPHY_MODULE,
  iconGlyphNameArg,
  iconGlyphPxExpr,
  iconGlyphSizeHintsLiteral,
} from "../icon-glyph.js";
import {
  isCompoundStateContainer,
  isDisclosureContainer,
  getInteractiveItemPart,
  getMultipleItemPart,
  getRegionPart,
  getGroupHostPart,
  getGroupHostOrnamentPart,
} from "../react/hook-source.js";

// Props we don't emit as @Input() — either Angular handles them natively
// (class/style) or they are React idioms with no Angular equivalent
// (children → ng-content, className → host binding via classRecipe).
const ANGULAR_RESERVED = new Set(["class", "style", "children", "className"]);

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Emit an Angular 17+ standalone component source file for a `ComponentIR`.
 *
 * Sections use the same ids as React/Vue so preservation round-trips
 * cleanly if a user has already edited a Vue version and copies the
 * custom regions over.
 */
export function generateAngularComponentSource(ir: ComponentIR): string {
  // Compound-state-container (Tabs-shaped): emit a fully wired root component
  // that provides the context token to its children.
  if (isDisclosureContainer(ir)) {
    return generateAngularDisclosureStateRootSource(ir);
  }
  if (isCompoundStateContainer(ir)) {
    return generateAngularCompoundStateRootSource(ir);
  }

  const importsBody = ir.dom ? generateDomTreeImports(ir) : generateImports(ir);
  const typesBody = generateTypes(ir);
  const compoundClasses = ir.compoundParts
    .map((part) => generateCompoundPartComponent(ir, part))
    .join("\n\n");
  const componentBody =
    (ir.dom ? generateDomTreeComponent(ir) : generateComponent(ir)) +
    (compoundClasses ? "\n\n" + compoundClasses : "");

  const blank = (): Section => ({ kind: "between", body: "" });
  const sections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    { kind: "generated", id: "types", body: typesBody },
    blank(),
    { kind: "custom", id: "types", body: "" },
    blank(),
    { kind: "generated", id: "component", body: componentBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
    blank(),
  ];

  return renderSections(sections, "line");
}

// ---------------------------------------------------------------------------
// Compound-state-container (Tabs-shaped) generation
// ---------------------------------------------------------------------------

/**
 * Generate the root Angular component for a compound-state-container (Tabs).
 * This component:
 *   - Calls useTabs() to get signal-based state
 *   - Provides the TabsContextToken via `providers` so child components can inject it
 *   - Exposes orientation/activationMode/loop/unmountInactive as WritableSignals
 *     so child components can track them reactively via Angular's signal system
 *   - Renders a plain <div> wrapper with BEM classes and <ng-content />
 */
function generateAngularCompoundStateRootSource(ir: ComponentIR): string {
  const { name, classRecipe } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "activeTab";
  const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);
  const setterName = `set${capitalize(channelName)}`;

  const importsBody = [
    `import { Component, Input, OnChanges, SimpleChanges, computed, signal, forwardRef, inject, DestroyRef, ChangeDetectionStrategy } from "@angular/core";`,
    `import { NgClass } from "@angular/common";`,
    `import { use${name}, ${name}ContextToken } from "./use${name}.js";`,
  ].join("\n");

  const typesBody = emitNonReactTypeAliases(ir).join("\n");

  // Build @Input declarations
  const propLines: string[] = [];
  const declaredProps = new Set<string>();
  for (const p of ir.styledProps) {
    if (ANGULAR_RESERVED.has(p.name)) continue;
    const propLine = generateInputProp(p);
    if (propLine) {
      propLines.push(propLine);
      declaredProps.add(p.name);
    }
  }
  for (const dim of Object.keys(ir.variants)) {
    if (declaredProps.has(dim) || ANGULAR_RESERVED.has(dim)) continue;
    propLines.push(`  @Input() ${dim}?: string;`);
    declaredProps.add(dim);
  }
  if (!declaredProps.has("idBase")) {
    propLines.push(`  @Input() idBase?: string;`);
    declaredProps.add("idBase");
  }
  if (!declaredProps.has("unmountInactive")) {
    propLines.push(`  @Input() unmountInactive?: boolean = true;`);
    declaredProps.add("unmountInactive");
  }
  if (!declaredProps.has("loop")) {
    propLines.push(`  @Input() loop?: boolean = true;`);
    declaredProps.add("loop");
  }
  if (!declaredProps.has("class")) {
    propLines.push(`  @Input() class?: string;`);
    declaredProps.add("class");
  }
  // onChange handler for the channel
  if (channel && !declaredProps.has(channel.changeHandlerProp)) {
    const valueType = channel.valueType ?? "unknown";
    propLines.push(`  @Input() ${channel.changeHandlerProp}?: (value: ${valueType}) => void;`);
  }

  // Build class modifiers
  // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: default-aware, see
  // `angularPropAccessor`'s doc comment.
  const styledByNameForClasses = new Map(ir.styledProps.map((p) => [p.name, p]));
  const classModifierLines: string[] = [];
  for (const mod of classRecipe.valueModifiers) {
    const acc = defaultAwareAngularClassPropAccessor(mod.propName, styledByNameForClasses);
    classModifierLines.push(
      `      ${acc} ? \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${acc}}\` : null,`,
    );
  }
  for (const mod of classRecipe.booleanModifiers) {
    const acc = defaultAwareAngularClassPropAccessor(mod.safeName, styledByNameForClasses);
    classModifierLines.push(
      `      ${acc} ? "${classRecipe.base}--${mod.safeName}" : null,`,
    );
  }

  // Hook call options
  const hookOptions: string[] = [];
  if (channel) {
    hookOptions.push(`    ${channel.valueProp}: () => this.${channel.valueProp},`);
    if (channel.defaultValueProp) {
      hookOptions.push(`    ${channel.defaultValueProp}: this.${channel.defaultValueProp},`);
    }
    hookOptions.push(`    ${channel.changeHandlerProp}: (v) => this.${channel.changeHandlerProp}?.(v),`);
  }
  hookOptions.push(`    idBase: this.idBase,`);
  hookOptions.push(`    destroyRef: this.destroyRef,`);

  // Build the contextValue object that is provided to child components.
  // Config values (orientation, activationMode, loop, unmountInactive) are
  // exposed as WritableSignals on the component so child components can
  // reactively read them with Angular's signal system.
  const contextValueLines: string[] = [
    `    get ${channelName}() { return self.behavior.${channelName}; },`,
    `    ${setterName}: (v) => self.behavior.${setterName}(v),`,
    `    registerTab: (v) => self.behavior.registerTab(v),`,
    `    unregisterTab: (v) => self.behavior.unregisterTab(v),`,
    `    get registeredTabs() { return self.behavior.registeredTabs; },`,
    `    get idBase() { return self.behavior.idBase; },`,
    `    // Config signals — child components read these to stay reactive`,
    `    get orientation() { return self._orientation; },`,
    `    get activationMode() { return self._activationMode; },`,
    `    get loop() { return self._loop; },`,
    `    get unmountInactive() { return self._unmountInactive; },`,
  ];

  // Build the hook options — channel values use signal-based getters
  // so createControllableState can track them reactively.
  const hookOptionsSignal: string[] = [];
  if (channel) {
    // Pass controlled value as a getter reading from _controlledValue signal
    // so createControllableState tracks it as a reactive dependency.
    hookOptionsSignal.push(`    ${channel.valueProp}: () => this._controlledValue(),`);
    if (channel.defaultValueProp) {
      hookOptionsSignal.push(`    ${channel.defaultValueProp}: this.${channel.defaultValueProp},`);
    }
    hookOptionsSignal.push(`    ${channel.changeHandlerProp}: (v) => this.${channel.changeHandlerProp}?.(v),`);
  }
  hookOptionsSignal.push(`    idBase: this.idBase,`);
  hookOptionsSignal.push(`    destroyRef: this.destroyRef,`);

  const componentBody = [
    `@Component({`,
    `  selector: "fsds-${toKebab(name)}",`,
    `  standalone: true,`,
    `  imports: [NgClass],`,
    `  providers: [`,
    `    {`,
    `      provide: ${name}ContextToken,`,
    `      useFactory: () => {`,
    `        // "self" is resolved at provide-time (same injector) so the token`,
    `        // value is the component instance itself acting as context.`,
    `        const self = inject(forwardRef(() => ${name}Component));`,
    `        const ctx: import("./use${name}.js").${name}ContextValue = {`,
    ...contextValueLines.map(l => `          ${l}`),
    `        };`,
    `        return ctx;`,
    `      },`,
    `      deps: [],`,
    `    },`,
    `  ],`,
    `  host: { "data-fsds-component": "${ir.cssPrefix}" },`,
    `  template: \`<div data-fsds-box="" [ngClass]="classes()"><ng-content /></div>\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${name}Component implements OnChanges {`,
    ...propLines,
    ``,
    `  // Signal mirrors of @Input values — reactive so computed() and child`,
    `  // components can track them as signal dependencies.`,
    `  // Controlled value: updated in ngOnChanges when the parent changes [value].`,
    `  _controlledValue = signal<string | undefined>(undefined);`,
    `  // Config signals — exposed to children via context getters.`,
    `  _orientation = signal<"horizontal" | "vertical">("horizontal");`,
    `  _activationMode = signal<"automatic" | "manual">("automatic");`,
    `  _loop = signal<boolean>(true);`,
    `  _unmountInactive = signal<boolean>(true);`,
    ``,
    `  ngOnChanges(changes: SimpleChanges): void {`,
    ...(channel ? [
      `    if (changes["${channel.valueProp}"]) this._controlledValue.set(this.${channel.valueProp});`,
    ] : []),
    `    if (changes["orientation"]) this._orientation.set(this.orientation ?? "horizontal");`,
    `    if (changes["activationMode"]) this._activationMode.set(this.activationMode ?? "automatic");`,
    `    if (changes["loop"]) this._loop.set(this.loop ?? true);`,
    `    if (changes["unmountInactive"]) this._unmountInactive.set(this.unmountInactive ?? true);`,
    `  }`,
    ``,
    `  private destroyRef = inject(DestroyRef);`,
    `  private initializedBehavior?: ReturnType<typeof use${name}>;`,
    `  protected get behavior(): ReturnType<typeof use${name}> {`,
    `    return this.initializedBehavior ??= use${name}({`,
    ...hookOptionsSignal,
    `    });`,
    `  }`,
    ``,
    `  classes = computed(() =>`,
    `    [`,
    `      "${classRecipe.base}",`,
    ...classModifierLines,
    `      this.class,`,
    `    ].filter(Boolean).join(" "),`,
    `  );`,
    `}`,
  ].join("\n");

  const blank = (): Section => ({ kind: "between", body: "" });
  const sections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    { kind: "generated", id: "types", body: typesBody },
    blank(),
    { kind: "custom", id: "types", body: "" },
    blank(),
    { kind: "generated", id: "component", body: componentBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
    blank(),
  ];

  return renderSections(sections, "line");
}

// ---------------------------------------------------------------------------
// Repeated-disclosure lowering (Accordion-shaped)
// ---------------------------------------------------------------------------

/** DFS for the DOM node whose part matches `partName`. */
function angularFindDomNode(
  root: NonNullable<ComponentIR["dom"]>,
  partName: string,
): NonNullable<ComponentIR["dom"]> | undefined {
  const stack: NonNullable<ComponentIR["dom"]>[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.part === partName) return node;
    if (node.children) stack.push(...node.children);
  }
  return undefined;
}

/** Returns the DOM node whose direct child has `part === partName`. */
function angularFindParentOf(
  root: NonNullable<ComponentIR["dom"]>,
  partName: string,
): NonNullable<ComponentIR["dom"]> | undefined {
  const stack: NonNullable<ComponentIR["dom"]>[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.children?.some((c) => c.part === partName)) return node;
    if (node.children) stack.push(...node.children);
  }
  return undefined;
}

/**
 * Root component for a repeated-disclosure container (Accordion). Provides the
 * disclosure context token: exposes the openness signal, per-item toggle/open,
 * and reactive type/collapsible/disabled signals. Hosts arrow-key navigation.
 */
function generateAngularDisclosureStateRootSource(ir: ComponentIR): string {
  const { name, classRecipe } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "openness";
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const setterName = `set${cap(channelName)}`;
  const hasCollapsible = ir.styledProps.some((p) => p.name === "collapsible");
  const hasDisabled = ir.styledProps.some((p) => p.name === "disabled");

  const importsBody = [
    `import { Component, Input, OnChanges, SimpleChanges, ElementRef, computed, signal, forwardRef, inject, DestroyRef, ChangeDetectionStrategy } from "@angular/core";`,
    `import { NgClass } from "@angular/common";`,
    `import { use${name}, ${name}ContextToken } from "./use${name}.js";`,
    `import { toggleInteractionItem } from "../../primitives/interaction.js";`,
  ].join("\n");

  const typesBody = emitNonReactTypeAliases(ir).join("\n");

  const propLines: string[] = [];
  const declaredProps = new Set<string>();
  for (const p of ir.styledProps) {
    if (ANGULAR_RESERVED.has(p.name)) continue;
    const propLine = generateInputProp(p);
    if (propLine) {
      propLines.push(propLine);
      declaredProps.add(p.name);
    }
  }
  for (const dim of Object.keys(ir.variants)) {
    if (declaredProps.has(dim) || ANGULAR_RESERVED.has(dim)) continue;
    propLines.push(`  @Input() ${dim}?: string;`);
    declaredProps.add(dim);
  }
  if (!declaredProps.has("class")) {
    propLines.push(`  @Input() class?: string;`);
    declaredProps.add("class");
  }
  if (channel && !declaredProps.has(channel.changeHandlerProp)) {
    const valueType = channel.valueType ?? "unknown";
    propLines.push(`  @Input() ${channel.changeHandlerProp}?: (value: ${valueType}) => void;`);
  }

  // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: default-aware, see
  // `angularPropAccessor`'s doc comment.
  const styledByNameForClasses = new Map(ir.styledProps.map((p) => [p.name, p]));
  const classModifierLines: string[] = [];
  for (const mod of classRecipe.valueModifiers) {
    const acc = defaultAwareAngularClassPropAccessor(mod.propName, styledByNameForClasses);
    classModifierLines.push(
      `      ${acc} ? \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${acc}}\` : null,`,
    );
  }
  for (const mod of classRecipe.booleanModifiers) {
    const acc = defaultAwareAngularClassPropAccessor(mod.safeName, styledByNameForClasses);
    classModifierLines.push(
      `      ${acc} ? "${classRecipe.base}--${mod.safeName}" : null,`,
    );
  }

  const hookOptionsSignal: string[] = [];
  if (channel) {
    hookOptionsSignal.push(`    ${channel.valueProp}: () => this._controlledValue(),`);
    if (channel.defaultValueProp) {
      hookOptionsSignal.push(`    ${channel.defaultValueProp}: this.${channel.defaultValueProp},`);
    }
    hookOptionsSignal.push(`    ${channel.changeHandlerProp}: (v) => this.${channel.changeHandlerProp}?.(v),`);
  }
  hookOptionsSignal.push(`    destroyRef: this.destroyRef,`);

  const contextValueLines: string[] = [
    `    get ${channelName}() { return self.behavior.${channelName}; },`,
    `    toggleItem: (v: string) => self.toggleItem(v),`,
    `    isItemOpen: (v: string) => self.isItemOpen(v),`,
    `    get type() { return self._type; },`,
    `    get collapsible() { return self._collapsible; },`,
    `    get disabled() { return self._disabled; },`,
    `    get idBase() { return self.idBase; },`,
  ];

  const componentBody = [
    `@Component({`,
    `  selector: "fsds-${toKebab(name)}",`,
    `  standalone: true,`,
    `  imports: [NgClass],`,
    `  providers: [`,
    `    {`,
    `      provide: ${name}ContextToken,`,
    `      useFactory: () => {`,
    `        const self = inject(forwardRef(() => ${name}Component));`,
    `        const ctx: import("./use${name}.js").${name}ContextValue = {`,
    ...contextValueLines.map((l) => `          ${l}`),
    `        };`,
    `        return ctx;`,
    `      },`,
    `      deps: [],`,
    `    },`,
    `  ],`,
    `  host: { "data-fsds-component": "${ir.cssPrefix}" },`,
    `  template: \`<div data-fsds-box="" [ngClass]="classes()" (keydown)="handleKeyDown($event)"><ng-content /></div>\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${name}Component implements OnChanges {`,
    ...propLines,
    ``,
    `  _controlledValue = signal<string | string[] | undefined>(undefined);`,
    `  _type = signal<"single" | "multiple">("single");`,
    `  _collapsible = signal<boolean>(false);`,
    `  _disabled = signal<boolean>(false);`,
    `  readonly idBase = \`${name.toLowerCase()}-\${++_${name.toLowerCase()}IdCounter}\`;`,
    ``,
    `  ngOnChanges(changes: SimpleChanges): void {`,
    ...(channel ? [`    if (changes["${channel.valueProp}"]) this._controlledValue.set(this.${channel.valueProp});`] : []),
    `    if (changes["type"]) this._type.set((this.type as "single" | "multiple") ?? "single");`,
    ...(hasCollapsible ? [`    if (changes["collapsible"]) this._collapsible.set(this.collapsible ?? false);`] : []),
    ...(hasDisabled ? [`    if (changes["disabled"]) this._disabled.set(this.disabled ?? false);`] : []),
    `  }`,
    ``,
    `  private destroyRef = inject(DestroyRef);`,
    `  private elRef = inject(ElementRef<HTMLElement>);`,
    `  private initializedBehavior?: ReturnType<typeof use${name}>;`,
    `  protected get behavior(): ReturnType<typeof use${name}> {`,
    `    return this.initializedBehavior ??= use${name}({`,
    ...hookOptionsSignal,
    `    });`,
    `  }`,
    ``,
    `  isItemOpen(itemValue: string): boolean {`,
    `    const v = this.behavior.${channelName}();`,
    `    return Array.isArray(v) ? v.includes(itemValue) : v === itemValue;`,
    `  }`,
    ``,
    `  toggleItem(itemValue: string): void {`,
    `    const v = this.behavior.${channelName}();`,
    `    this.behavior.${setterName}(toggleInteractionItem(v, itemValue, this._type() === "multiple", this._collapsible()));`,
    `  }`,
    ``,
    `  handleKeyDown(e: KeyboardEvent): void {`,
    `    const key = e.key;`,
    `    if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") {`,
    `      return;`,
    `    }`,
    `    const host = this.elRef.nativeElement as HTMLElement;`,
    `    const triggers = Array.from(`,
    `      host.querySelectorAll<HTMLButtonElement>("[data-disclosure-trigger]"),`,
    `    ).filter((el) => !el.disabled);`,
    `    if (triggers.length === 0) return;`,
    `    const currentIndex = triggers.indexOf(document.activeElement as HTMLButtonElement);`,
    `    let nextIndex = currentIndex;`,
    `    if (key === "ArrowDown") {`,
    `      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % triggers.length;`,
    `    } else if (key === "ArrowUp") {`,
    `      nextIndex = currentIndex < 0 ? triggers.length - 1 : (currentIndex - 1 + triggers.length) % triggers.length;`,
    `    } else if (key === "Home") {`,
    `      nextIndex = 0;`,
    `    } else {`,
    `      nextIndex = triggers.length - 1;`,
    `    }`,
    `    e.preventDefault();`,
    `    triggers[nextIndex]?.focus();`,
    `  }`,
    ``,
    `  classes = computed(() =>`,
    `    [`,
    `      "${classRecipe.base}",`,
    ...classModifierLines,
    `      this.class,`,
    `    ].filter(Boolean).join(" "),`,
    `  );`,
    `}`,
  ].join("\n");

  const counterPrelude = `let _${name.toLowerCase()}IdCounter = 0;`;

  const blank = (): Section => ({ kind: "between", body: "" });
  const sections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    { kind: "generated", id: "types", body: [counterPrelude, typesBody].filter((s) => s.length > 0).join("\n\n") },
    blank(),
    { kind: "custom", id: "types", body: "" },
    blank(),
    { kind: "generated", id: "component", body: componentBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
    blank(),
  ];

  return renderSections(sections, "line");
}

/** Sub-component files (Item/Trigger/Content) for a disclosure container. */
export function generateAngularDisclosureStateParts(
  ir: ComponentIR,
): Array<{ name: string; content: string }> {
  if (!isDisclosureContainer(ir)) return [];
  const { name, cssPrefix } = ir;
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  const multiplePart = getMultipleItemPart(ir);
  if (!itemPart || !regionPart || !multiplePart || !ir.dom) return [];

  const itemNode = angularFindDomNode(ir.dom, itemPart.name);
  const headerNode = angularFindParentOf(ir.dom, itemPart.name);
  const headerPartName = headerNode?.part;
  const headerTag = headerNode?.tag ?? "div";
  const chevronNode = itemNode?.children?.find(
    (c) => c.part !== undefined && c.tag !== "slot" && c.tag !== "children",
  );
  const innerNode = angularFindDomNode(ir.dom, regionPart.name);
  const innerChild = innerNode?.children?.find(
    (c) => c.part !== undefined && c.tag !== "slot" && c.tag !== "children",
  );
  const innerPartName = innerChild?.part;
  const innerTag = innerChild?.tag ?? "div";

  const itemName = `${name}${cap(multiplePart.name)}`;
  const triggerName = `${name}${cap(itemPart.name)}`;
  const contentName = `${name}${cap(regionPart.name)}`;

  const itemCssClass = `${cssPrefix}__${multiplePart.name}`;
  const triggerCssClass = `${cssPrefix}__${itemPart.name}`;
  const contentCssClass = `${cssPrefix}__${regionPart.name}`;

  // Item component (passive wrapper)
  const itemContent = [
    `// @generated:start imports`,
    `import { Component, Input, ChangeDetectionStrategy } from "@angular/core";`,
    `import { NgClass } from "@angular/common";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start component`,
    `@Component({`,
    `  selector: "fsds-${toKebab(itemName)}",`,
    `  standalone: true,`,
    `  imports: [NgClass],`,
    `  template: \`<div [ngClass]="classes()"><ng-content /></div>\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${itemName}Component {`,
    `  @Input() class?: string;`,
    `  @Input() dataTestid?: string;`,
    ``,
    `  classes(): string {`,
    `    return ["${itemCssClass}", this.class].filter(Boolean).join(" ");`,
    `  }`,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
  ].join("\n");

  // Trigger component
  const triggerTemplateOpen = headerPartName ? `<${headerTag} class="${cssPrefix}__${headerPartName}">` : "";
  const triggerTemplateClose = headerPartName ? `</${headerTag}>` : "";
  const chevronMarkup = chevronNode
    ? renderAngularDomNode(
        chevronNode,
        {
          classRecipe: cssPrefix,
          channelByName: new Map(),
          styledByName: new Map(),
          isRoot: false,
        },
        0,
      )
    : "";
  const triggerContent = [
    `// @generated:start imports`,
    `import { Component, Input, computed, ChangeDetectionStrategy } from "@angular/core";`,
    `import { NgClass } from "@angular/common";`,
    `import { use${name}Context } from "./use${name}.js";`,
    ...(chevronNode?.componentRef
      ? [`import { ${chevronNode.componentRef}Component } from "../${chevronNode.componentRef}/${chevronNode.componentRef}.component.js";`]
      : []),
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start component`,
    `@Component({`,
    `  selector: "fsds-${toKebab(triggerName)}",`,
    `  standalone: true,`,
    `  imports: [NgClass${chevronNode?.componentRef ? `, ${chevronNode.componentRef}Component` : ""}],`,
    `  template: \`${triggerTemplateOpen}<button`,
    `  type="button"`,
    `  [ngClass]="classes()"`,
    `  data-disclosure-trigger`,
    `  [attr.data-value]="value"`,
    `  [attr.id]="ctx.idBase + '-trigger-' + value"`,
    `  [attr.aria-controls]="ctx.idBase + '-content-' + value"`,
    `  [attr.aria-expanded]="isOpen()"`,
    `  [disabled]="ctx.disabled()"`,
    `  (click)="ctx.toggleItem(value)"`,
    `><ng-content />${chevronMarkup}</button>${triggerTemplateClose}\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${triggerName}Component {`,
    `  @Input({ required: true }) value!: string;`,
    `  @Input() class?: string;`,
    `  @Input() dataTestid?: string;`,
    ``,
    `  protected ctx = use${name}Context();`,
    ``,
    `  isOpen = computed(() => this.ctx.isItemOpen(this.value));`,
    ``,
    `  classes = computed(() =>`,
    `    [`,
    `      "${triggerCssClass}",`,
    `      this.isOpen() && "${triggerCssClass}--open",`,
    `      this.class,`,
    `    ].filter(Boolean).join(" "),`,
    `  );`,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
  ].join("\n");

  // Content component
  const contentInnerOpen = innerPartName ? `<${innerTag} class="${cssPrefix}__${innerPartName}">` : "";
  const contentInnerClose = innerPartName ? `</${innerTag}>` : "";
  const contentContent = [
    `// @generated:start imports`,
    `import { Component, Input, computed, ChangeDetectionStrategy } from "@angular/core";`,
    `import { NgClass } from "@angular/common";`,
    `import { use${name}Context } from "./use${name}.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start component`,
    `@Component({`,
    `  selector: "fsds-${toKebab(contentName)}",`,
    `  standalone: true,`,
    `  imports: [NgClass],`,
    `  template: \`<div`,
    `  role="region"`,
    `  [ngClass]="classes()"`,
    `  [attr.id]="ctx.idBase + '-content-' + value"`,
    `  [attr.aria-labelledby]="ctx.idBase + '-trigger-' + value"`,
    `  [attr.hidden]="!isOpen() ? true : null"`,
    `>${contentInnerOpen}<ng-content />${contentInnerClose}</div>\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${contentName}Component {`,
    `  @Input({ required: true }) value!: string;`,
    `  @Input() class?: string;`,
    `  @Input() dataTestid?: string;`,
    ``,
    `  protected ctx = use${name}Context();`,
    ``,
    `  isOpen = computed(() => this.ctx.isItemOpen(this.value));`,
    ``,
    `  classes = computed(() =>`,
    `    ["${contentCssClass}", this.class].filter(Boolean).join(" "),`,
    `  );`,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
  ].join("\n");

  return [
    { name: itemName, content: itemContent },
    { name: triggerName, content: triggerContent },
    { name: contentName, content: contentContent },
  ];
}

/**
 * Returns an array of `{ name, content }` for the sub-component files emitted
 * for a compound-state-container (e.g. TabsList, TabsTab, TabsPanel).
 *
 * These are separate @Component classes that inject the context token provided
 * by the root component.
 */
export function generateAngularCompoundStateParts(
  ir: ComponentIR,
): Array<{ name: string; content: string }> {
  if (!isCompoundStateContainer(ir) || isDisclosureContainer(ir)) return [];

  const { name, cssPrefix } = ir;
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  const groupPart = getGroupHostPart(ir);
  const ornamentPart = getGroupHostOrnamentPart(ir);

  if (!itemPart || !regionPart) return [];

  const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);
  const listName = `${name}${capitalize(groupPart?.name ?? "List")}`;
  const tabName = `${name}${capitalize(itemPart.name)}`;
  const panelName = `${name}${capitalize(regionPart.name)}`;

  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "activeTab";
  const setterName = `set${capitalize(channelName)}`;
  const listCssClass = `${cssPrefix}__${groupPart?.name ?? "list"}`;
  const tabCssClass = `${cssPrefix}__${itemPart.name}`;
  const panelCssClass = `${cssPrefix}__${regionPart.name}`;

  // ---------------------------------------------------------------------------
  // TabsList component
  // ---------------------------------------------------------------------------
  const listContent = [
    `// @generated:start imports`,
    `import { Component, Input, ElementRef, inject, ChangeDetectionStrategy } from "@angular/core";`,
    `import { NgClass } from "@angular/common";`,
    `import { use${name}Context } from "./use${name}.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start component`,
    `@Component({`,
    `  selector: "fsds-${toKebab(listName)}",`,
    `  standalone: true,`,
    `  imports: [NgClass],`,
    `  template: \`<div`,
    `  #listEl`,
    `  role="tablist"`,
    `  tabindex="-1"`,
    `  [ngClass]="classes()"`,
    `  [attr.aria-orientation]="ctx.orientation()"`,
    `  (keydown)="handleKeyDown($event)"`,
    `><ng-content />${ornamentPart ? `<span [ngClass]="'${cssPrefix}__${ornamentPart.name}'" aria-hidden="true"></span>` : ""}</div>\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${listName}Component {`,
    `  @Input() class?: string;`,
    `  @Input() dataTestid?: string;`,
    ``,
    `  protected ctx = use${name}Context();`,
    `  private elRef = inject(ElementRef<HTMLElement>);`,
    ``,
    `  classes(): string {`,
    `    return ["${listCssClass}", this.class].filter(Boolean).join(" ");`,
    `  }`,
    ``,
    `  handleKeyDown(e: KeyboardEvent): void {`,
    `    const tabs = this.ctx.registeredTabs();`,
    `    if (tabs.length === 0) return;`,
    `    const currentIndex = tabs.indexOf(this.ctx.${channelName}());`,
    `    const isHorizontal = this.ctx.orientation() !== "vertical";`,
    `    let nextIndex = currentIndex;`,
    ``,
    `    if (`,
    `      (isHorizontal && e.key === "ArrowRight") ||`,
    `      (!isHorizontal && e.key === "ArrowDown")`,
    `    ) {`,
    `      e.preventDefault();`,
    `      nextIndex = this.ctx.loop()`,
    `        ? (currentIndex + 1) % tabs.length`,
    `        : Math.min(currentIndex + 1, tabs.length - 1);`,
    `    } else if (`,
    `      (isHorizontal && e.key === "ArrowLeft") ||`,
    `      (!isHorizontal && e.key === "ArrowUp")`,
    `    ) {`,
    `      e.preventDefault();`,
    `      nextIndex = this.ctx.loop()`,
    `        ? (currentIndex - 1 + tabs.length) % tabs.length`,
    `        : Math.max(currentIndex - 1, 0);`,
    `    } else if (e.key === "Home") {`,
    `      e.preventDefault();`,
    `      nextIndex = 0;`,
    `    } else if (e.key === "End") {`,
    `      e.preventDefault();`,
    `      nextIndex = tabs.length - 1;`,
    `    } else if (e.key === "Enter" || e.key === " ") {`,
    `      if (this.ctx.activationMode() === "manual") {`,
    `        e.preventDefault();`,
    `        const host = this.elRef.nativeElement as HTMLElement;`,
    `        const focusedBtn = host.querySelector<HTMLButtonElement>('[role="tab"]:focus');`,
    `        if (focusedBtn) {`,
    `          const val = focusedBtn.getAttribute("data-value");`,
    `          if (val) this.ctx.${setterName}(val);`,
    `        }`,
    `      }`,
    `      return;`,
    `    } else {`,
    `      return;`,
    `    }`,
    ``,
    `    const targetValue = tabs[nextIndex];`,
    `    if (this.ctx.activationMode() === "automatic") {`,
    `      this.ctx.${setterName}(targetValue);`,
    `    }`,
    `    const host = this.elRef.nativeElement as HTMLElement;`,
    `    const btn = host.querySelector<HTMLButtonElement>(`,
    `      \`[role="tab"][data-value="\${targetValue}"]\`,`,
    `    );`,
    `    btn?.focus();`,
    `  }`,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
  ].join("\n");

  // ---------------------------------------------------------------------------
  // TabsTab component
  // ---------------------------------------------------------------------------
  const tabContent = [
    `// @generated:start imports`,
    `import { Component, Input, OnInit, OnDestroy, computed, inject, DestroyRef, ChangeDetectionStrategy } from "@angular/core";`,
    `import { NgClass } from "@angular/common";`,
    `import { use${name}Context } from "./use${name}.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start component`,
    `@Component({`,
    `  selector: "fsds-${toKebab(tabName)}",`,
    `  standalone: true,`,
    `  imports: [NgClass],`,
    `  template: \`<button`,
    `  role="tab"`,
    `  type="button"`,
    `  [ngClass]="classes()"`,
    `  [attr.data-value]="value"`,
    `  [attr.id]="ctx.idBase + '-tab-' + value"`,
    `  [attr.aria-controls]="ctx.idBase + '-panel-' + value"`,
    `  [attr.aria-selected]="isActive()"`,
    `  [attr.tabindex]="isActive() ? 0 : -1"`,
    `  [disabled]="disabled"`,
    `  (click)="ctx.${setterName}(value)"`,
    `><ng-content /></button>\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${tabName}Component implements OnInit, OnDestroy {`,
    `  @Input({ required: true }) value!: string;`,
    `  @Input() disabled?: boolean;`,
    `  @Input() class?: string;`,
    `  @Input() dataTestid?: string;`,
    ``,
    `  protected ctx = use${name}Context();`,
    ``,
    `  isActive = computed(() => this.ctx.${channelName}() === this.value);`,
    ``,
    `  classes = computed(() =>`,
    `    [`,
    `      "${tabCssClass}",`,
    `      this.isActive() && "${tabCssClass}--active",`,
    `      this.class,`,
    `    ].filter(Boolean).join(" "),`,
    `  );`,
    ``,
    `  ngOnInit(): void {`,
    `    this.ctx.registerTab(this.value);`,
    `  }`,
    ``,
    `  ngOnDestroy(): void {`,
    `    this.ctx.unregisterTab(this.value);`,
    `  }`,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
  ].join("\n");

  // ---------------------------------------------------------------------------
  // TabsPanel component
  // ---------------------------------------------------------------------------
  const panelContent = [
    `// @generated:start imports`,
    `import { Component, Input, computed, inject, ChangeDetectionStrategy } from "@angular/core";`,
    `import { NgClass, NgIf } from "@angular/common";`,
    `import { use${name}Context } from "./use${name}.js";`,
    `// @generated:end`,
    ``,
    `// @custom:start imports`,
    ``,
    `// @custom:end`,
    ``,
    `// @generated:start component`,
    `@Component({`,
    `  selector: "fsds-${toKebab(panelName)}",`,
    `  standalone: true,`,
    `  imports: [NgClass, NgIf],`,
    `  template: \`<div`,
    `  *ngIf="!ctx.unmountInactive() || isActive()"`,
    `  role="tabpanel"`,
    `  [ngClass]="classes()"`,
    `  [attr.id]="ctx.idBase + '-panel-' + value"`,
    `  [attr.aria-labelledby]="ctx.idBase + '-tab-' + value"`,
    `  [attr.tabindex]="0"`,
    `  [attr.hidden]="!isActive() ? true : null"`,
    `><ng-content /></div>\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${panelName}Component {`,
    `  @Input({ required: true }) value!: string;`,
    `  @Input() class?: string;`,
    `  @Input() dataTestid?: string;`,
    ``,
    `  protected ctx = use${name}Context();`,
    ``,
    `  isActive = computed(() => this.ctx.${channelName}() === this.value);`,
    ``,
    `  classes = computed(() =>`,
    `    ["${panelCssClass}", this.class].filter(Boolean).join(" "),`,
    `  );`,
    `}`,
    `// @generated:end`,
    ``,
    `// @custom:start trailing`,
    ``,
    `// @custom:end`,
  ].join("\n");

  return [
    { name: listName, content: listContent },
    { name: tabName, content: tabContent },
    { name: panelName, content: panelContent },
  ];
}

/**
 * Emit an additional @Component class for a compound part (e.g.
 * ModalHeader, ModalBody). Stateless wrapper: one BEM block class plus
 * the part's semantic element where applicable.
 */
function generateCompoundPartComponent(
  ir: ComponentIR,
  part: {
    name: string;
    semanticElement?: string;
    isExplicitSubcomponent?: true;
    layoutVariant?: string;
    nativeTag?: string;
  },
): string {
  const subName = `${ir.name}${part.name[0].toUpperCase()}${part.name.slice(1)}`;
  const className = `${subName}Component`;
  const cssClass = `${ir.cssPrefix}__${part.name}`;

  // Native-tag branch: emit an attribute selector so the host element
  // IS the native tag, supplied by the consumer's template. This is
  // the only way to host native table children inside <thead>/<tbody>
  // — element selectors (<fsds-table-row>) are invalid table content
  // and would be hoisted out by the browser parser.
  //
  // Selector convention: <nativeTag>[fsdsComponentNamePartName]
  //   e.g. `tr[fsdsTableRow]` for the row part of a Table component.
  // Consumer writes: `<tr fsdsTableRow>...</tr>`.
  if (part.nativeTag && TABLE_COMPOSITION_TAGS.has(part.nativeTag)) {
    const tag = part.nativeTag;
    // PascalCase attribute name from the subcomponent name. Angular
    // attribute selectors use camelCase by convention, so `TableRow`
    // becomes `fsdsTableRow` (lowercase first letter after the prefix).
    const attrSelector = `fsds${subName}`;
    return [
      `@Component({`,
      `  selector: "${tag}[${attrSelector}]",`,
      `  standalone: true,`,
      `  imports: [NgClass],`,
      `  template: \`<ng-content />\`,`,
      `  host: {`,
      `    "[class]": "classes()",`,
      `  },`,
      `  changeDetection: ChangeDetectionStrategy.OnPush,`,
      `})`,
      `export class ${className} {`,
      `  @Input() class?: string;`,
      `  @Input() dataTestid?: string;`,
      ``,
      `  classes(): string {`,
      `    return ["${cssClass}", this.class].filter(Boolean).join(" ");`,
      `  }`,
      `}`,
    ].join("\n");
  }

  const selector = toKebab(subName);
  const renderedTag = part.isExplicitSubcomponent
    ? part.nativeTag ?? part.semanticElement
    : part.semanticElement;
  const asAttr =
    renderedTag && renderedTag !== "div"
      ? ` as="${renderedTag}"`
      : "";
  const variantAttr =
    part.layoutVariant === "horizontal" ? ` variant="horizontal"` : "";
  const template = `<fsds-stack${asAttr}${variantAttr} [ngClass]="classes()"><ng-content /></fsds-stack>`;

  return [
    `@Component({`,
    `  selector: "fsds-${selector}",`,
    `  standalone: true,`,
    `  imports: [NgClass, StackComponent],`,
    `  template: \`${template}\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${className} {`,
    `  @Input() class?: string;`,
    `  @Input() dataTestid?: string;`,
    ``,
    // Plain getter (not computed signal): the class list only references
    // @Input properties, which aren't signals. A computed() would cache
    // the initial value forever.
    `  classes(): string {`,
    `    return ["${cssClass}", this.class].filter(Boolean).join(" ");`,
    `  }`,
    `}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

function generateImports(ir: ComponentIR): string {
  const coreNames = ["Component", "Input", "ChangeDetectionStrategy"];

  // `computed` is only used when the component has behavior channels (and
  // therefore signal-backed reads in the classes computation). Stack-only
  // and compound-part components emit a plain getter and don't need it.
  if (ir.behavior.normalizedChannels.length > 0) {
    coreNames.push("computed");
  }

  // HostBinding is needed when the root element is not the default host
  if (ir.root.element !== "div") {
    coreNames.push("HostBinding");
  }

  const lines: string[] = [
    `import { ${[...new Set(coreNames)].join(", ")} } from "@angular/core";`,
    `import { NgClass } from "@angular/common";`,
    `import { StackComponent } from "../../primitives/index.js";`,
  ];

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

function generateTypes(ir: ComponentIR): string {
  return emitNonReactTypeAliases(ir).join("\n");
}

// ---------------------------------------------------------------------------
// Component class
// ---------------------------------------------------------------------------

function generateComponent(ir: ComponentIR): string {
  const selector = toKebab(ir.name);
  const className = `${ir.name}Component`;
  const template = generateTemplate(ir);

  const lines: string[] = [
    `@Component({`,
    `  selector: "fsds-${selector}",`,
    `  standalone: true,`,
    `  imports: [NgClass, StackComponent],`,
    `  host: { "data-fsds-component": "${ir.cssPrefix}" },`,
    `  template: \`${template}\`,`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    `})`,
    `export class ${className} {`,
  ];

  // @Input() decorators (event handlers excluded — use @Output EventEmitter instead)
  const declaredProps = new Set<string>();
  for (const p of ir.styledProps) {
    if (ANGULAR_RESERVED.has(p.name)) continue;
    const propLine = generateInputProp(p);
    if (propLine) {
      lines.push(propLine);
      declaredProps.add(p.name);
    }
  }

  // Variant dimensions referenced in classes computed but not present as
  // styled props need their own @Input declarations so `this.<dim>` resolves.
  for (const dim of Object.keys(ir.variants)) {
    if (declaredProps.has(dim) || ANGULAR_RESERVED.has(dim)) continue;
    lines.push(`  @Input() ${dim}?: string;`);
    declaredProps.add(dim);
  }

  // classes = computed(() => ...)
  lines.push(``);
  lines.push(...generateClassesComputed(ir));

  lines.push(`}`);
  return lines.join("\n");
}

function generateInputProp(p: ResolvedPropIR): string | null {
  const type = lowerAngularPropType(p.propType);
  const defaultPart = p.defaultExpr !== undefined ? ` = ${p.defaultExpr}` : "";
  // Required props with no default need a definite-assignment assertion to
  // satisfy strictPropertyInitialization; optional props use `?:`.
  let modifier: string;
  if (p.required) {
    modifier = defaultPart ? ":" : "!:";
  } else {
    modifier = "?:";
  }
  // Function-typed props (callbacks like `onDismiss?: () => void`) are
  // consumer-callback inputs, NOT @Output() EventEmitters. Angular's
  // canonical event-source is the EventEmitter, but here the contract
  // declares a prop the consumer *passes in* — the component invokes
  // it on click. The dom-tree's events field references these via
  // `(click)="onDismiss && onDismiss()"`, so the @Input must exist or
  // the template fails ngc strictTemplates. Pre-IR-DOM-BINDING-
  // CAPABILITY-01 these were silently dropped and the rail caught the
  // ensuing template error.
  return `  @Input() ${p.safeName}${modifier} ${type}${defaultPart};`;
}

function generateClassesComputed(ir: ComponentIR): string[] {
  const { classRecipe } = ir;
  // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: default-aware, see
  // `angularPropAccessor`'s doc comment.
  const styledByName = new Map(ir.styledProps.map((p) => [p.name, p]));
  // Stack-only components read only @Input properties (plain JS, not
  // signals). A computed() would cache the initial value forever; emit a
  // plain method that re-evaluates on every call instead.
  const lines: string[] = [
    `  classes(): string {`,
    `    const parts: Array<string | null | undefined> = ["${classRecipe.base}"];`,
  ];

  for (const mod of classRecipe.valueModifiers) {
    const acc = defaultAwareAngularClassPropAccessor(mod.safeName, styledByName);
    lines.push(
      `    if (${acc}) parts.push(\`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${acc}}\`);`,
    );
  }

  for (const mod of classRecipe.booleanModifiers) {
    const acc = defaultAwareAngularClassPropAccessor(mod.safeName, styledByName);
    lines.push(
      `    if (${acc}) parts.push("${classRecipe.base}--${mod.safeName}");`,
    );
  }

  lines.push(`    return parts.filter(Boolean).join(" ");`);
  lines.push(`  }`);
  return lines;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

function generateTemplate(ir: ComponentIR): string {
  const { root } = ir;
  const asAttr = root.element !== "div" ? ` as="${root.element}"` : "";
  const roleAttr = root.effectiveRole ? ` role="${root.effectiveRole}"` : "";
  return `<fsds-stack${asAttr}${roleAttr} data-fsds-box="" [ngClass]="classes()"><ng-content /></fsds-stack>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Use the shared toKebab from contract.ts so Angular selectors match other
// codegen outputs. The previous local implementation inserted a hyphen before
// *every* capital letter and produced names like `fsds-o-t-p` that didn't
// match consumers (e.g., Lit test files use plan.testId via the shared util).
function toKebab(name: string): string {
  return sharedToKebab(name);
}

/**
 * Map React-convention type strings to Angular-safe equivalents via the
 * shared non-React translator (same logic as Vue / Lit / Svelte).
 */
function angularType(typeStr: string): string {
  return translateNonReactType(typeStr);
}

/**
 * Lower a framework-neutral PropTypeIR into an Angular/TS type expression. Reads
 * the structured `propType` (ref from `propType.to`, fallback via the legacy
 * string path on `propType.raw`, V1 kinds via the canonical string) so output is
 * byte-identical. (CODEGEN-PROP-TYPE-IR-PILOT-01, slice 2)
 */
function lowerAngularPropType(pt: PropTypeIR): string {
  switch (pt.kind) {
    case "ref":
      return angularType(pt.to);
    case "fallback":
      return angularType(pt.raw);
    default:
      return angularType(canonicalTsType(pt));
  }
}

// ---------------------------------------------------------------------------
// DOM-tree-driven component (B.2c)
// ---------------------------------------------------------------------------

/** Walk a DomNodeIR tree and return true if any node has ifProp === "children". */
function treeHasChildrenGuard(node: DomNodeIR): boolean {
  if (node.ifProp === "children") return true;
  return node.children.some(treeHasChildrenGuard);
}

/** Walk a DomNodeIR tree and return true if any node will render a
 *  `*ngIf` (i.e. has a non-null `ifProp`). Used to decide whether
 *  `NgIf` belongs in the standalone component's imports list.
 *  ICON-CATALOG-RUNTIME-DELIVERY-01: an `iconGlyph` node also emits a
 *  `*ngIf="... as glyph"` null-guard around the svg. */
function treeUsesNgIf(node: DomNodeIR): boolean {
  if (node.ifProp) return true;
  if (node.iconGlyph) return true;
  // FEAT-CODEBLOCK-HIGHLIGHT-01: a gated content transform emits an
  // `*ngIf` pair (tokens vs plain source degradation).
  if (isHighlightTransform(node.content) && node.content.gate !== undefined) {
    return true;
  }
  return node.children.some(treeUsesNgIf);
}

/** Walk a DomNodeIR tree and return true if any node declares
 *  iteration. Used to decide whether `NgFor` belongs in the
 *  standalone component's imports list.
 *  ICON-CATALOG-RUNTIME-DELIVERY-01: an `iconGlyph` node also emits a
 *  `*ngFor` loop over the resolved glyph's path records.
 *  FEAT-CODEBLOCK-HIGHLIGHT-01: a content transform emits a `*ngFor`
 *  loop over the tokenizer getter's token stream. */
function treeUsesNgFor(node: DomNodeIR): boolean {
  if (node.iteration) return true;
  if (node.iconGlyph) return true;
  if (isHighlightTransform(node.content)) return true;
  return node.children.some(treeUsesNgFor);
}

/** Walk a DomNodeIR tree and return true if any node has count
 *  iteration. Count iteration needs a class-body `arrayFromCount`
 *  helper because Angular templates can't construct arrays inline. */
function treeUsesCountIteration(node: DomNodeIR): boolean {
  if (node.iteration?.kind === "count") return true;
  return node.children.some(treeUsesCountIteration);
}

/** Walk a DomNodeIR tree and return true if any binding uses the
 *  `predicate:memberOf` operator. Angular templates can't reference
 *  the global `Array` object, so memberOf is lowered to a component
 *  helper method (`this.memberOf(L, R)`) injected only when needed.
 *  BINDING-EXPRESSION-V2-PREDICATE-01.
 *
 *  Source fact: Angular template parser rejects bare `Array.isArray`.
 *  Applies by: presence of `predicate:memberOf` in any binding
 *  expression on this DomNodeIR subtree.
 *  Removable when: Angular emitter has a generic mechanism for
 *  template-safe lowering of any global call. */
function treeUsesSelectionLabel(node: DomNodeIR): boolean {
  const check = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    const expr = value as Record<string, unknown>;
    return (expr.kind === "projection" && expr.op === "selectionLabel") || Object.values(expr).some(check);
  };
  return check(node);
}

function treeUsesMemberOfPredicate(node: DomNodeIR): boolean {
  const checkExpr = (expr: BindingExpression): boolean => {
    if (expr.kind === "predicate") {
      if (expr.op === "memberOf") return true;
      return checkExpr(expr.left) || checkExpr(expr.right);
    }
    return false;
  };
  for (const binding of Object.values(node.bindings)) {
    if (checkExpr(binding)) return true;
  }
  return node.children.some(treeUsesMemberOfPredicate);
}

/**
 * FEAT-CHANNEL-UPDATE-OPERATIONS-01. Collect every distinct
 * `channelUpdate` binding (from `events`) in the DomNodeIR tree, keyed by
 * `(op, channel)` so a channel wired to the same operation from two nodes
 * synthesizes one method. Angular lowers each to a class method (its
 * template expressions forbid the inline arrow/spread other frameworks use).
 */
function collectChannelUpdates(
  node: DomNodeIR,
  seen: Map<string, Extract<BindingExpression, { kind: "channelUpdate" }>> = new Map(),
): Map<string, Extract<BindingExpression, { kind: "channelUpdate" }>> {
  for (const binding of Object.values(node.events)) {
    if (binding.kind === "channelUpdate") {
      seen.set(`${binding.op}:${binding.channel}`, binding);
    }
  }
  for (const child of node.children) collectChannelUpdates(child, seen);
  return seen;
}

// Every controlled channel input must participate in Angular dependency
// tracking. This is framework input law, independent of interaction family.
function channelInputs(ir: ComponentIR): Map<string, NormalizedChannelIR> {
  return new Map(ir.behavior.normalizedChannels.map(channel => [channel.valueProp, channel]));
}

function generateDomTreeImports(ir: ComponentIR): string {
  const coreNames = [
    "Component",
    "Input",
    "computed",
    "DestroyRef",
    "inject",
    "ChangeDetectionStrategy",
  ];
  if (
    resolveSurfaceAutoDismiss(ir) &&
    ir.behavior.normalizedChannels.some((c) => c.valueType === "boolean")
  ) {
    coreNames.push("effect");
  }
  if (ir.motion.sequence) coreNames.push("effect", "signal", "ViewChild", "ElementRef");
  if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir) || ir.motion.countdown) coreNames.push("ViewChild", "ElementRef");
  if (channelInputs(ir).size > 0) coreNames.push("signal", "Injector", "runInInjectionContext", "untracked");
  // When any dom node uses `if: "children"`, the component needs AfterContentInit
  // and ElementRef to detect content projection at runtime.
  if (ir.dom && treeHasChildrenGuard(ir.dom)) {
    coreNames.push("AfterContentInit", "ElementRef");
  }
  // FEAT-PORTAL-MECHANISM-CROSS-FRAMEWORK-01: full-overlay surfaces relocate
  // their host element into document.body on init and remove it on destroy so
  // the fixed layer escapes any transform/overflow/filter ancestor. Needs
  // OnInit/OnDestroy lifecycle and ElementRef for the host node.
  const rootPortal = portalsRootToBody(ir);
  const selectorAnchor = selectorAnchoredRootPortal(ir);
  if (rootPortal || selectorAnchor) {
    coreNames.push("OnInit", "OnDestroy");
    if (!coreNames.includes("ElementRef")) coreNames.push("ElementRef");
  }
  // Selector-anchored root panel (coachmark tour): the whole panel portals
  // to body (same OnInit/OnDestroy relocation above) AND tracks a page
  // element resolved from the active step's selector via `effect()`,
  // driving `createAnchoredPosition`.
  if (selectorAnchor) {
    if (!coreNames.includes("effect")) coreNames.push("effect");
    coreNames.push("signal");
  }
  // Only import NgIf when the rendered template will actually use
  // `*ngIf`. Declaring it otherwise triggers ngc NG8113 (unused
  // directive in standalone imports) and clutters the public API
  // surface of the standalone component. Same pattern for NgFor
  // when `iterate` directives are present in the dom tree
  // (IR-DOM-ITERATE-CAPABILITY-01).
  const usesNgIf = ir.dom ? treeUsesNgIf(ir.dom) : false;
  const usesNgFor = ir.dom ? treeUsesNgFor(ir.dom) : false;
  const usesNgSwitch = Boolean(ir.root.polymorphicTagProp);
  const commonNames = ["NgClass"];
  if (usesNgIf) commonNames.push("NgIf");
  if (usesNgFor) commonNames.push("NgFor");
  if (usesNgSwitch) commonNames.push("NgSwitch", "NgSwitchCase");
  if (usesNgSwitch && ir.dom && (ir.dom.children.length > 0 || ir.dom.content)) commonNames.push("NgTemplateOutlet");
  // FEAT-MARKDOWN-CONTENT-TRANSFORM-01: the content ngFor + the companion
  // renderers' template directives ride the same import line.
  if (ir.dom && collectContentTransforms(ir.dom).some(isMarkdownTransform)) {
    commonNames.push("NgIf", "NgFor", "NgSwitch", "NgSwitchCase");
  }
  const commonImports = commonNames.join(", ");
  const lines: string[] = [
    `import { ${[...new Set(coreNames)].join(", ")} } from "@angular/core";`,
    `import { ${commonImports} } from "@angular/common";`,
  ];
  if (ir.motion.sequence) lines.push(`import { createSequenceBudget } from "../../primitives/sequence-budget.js";`);
  if (ir.interaction && ir.dom && ir.interaction.triggers.some(t => t.operation !== "select" && t.operation !== "toggle-item")) lines.push(`import { canActivateInteraction } from "../../primitives/interaction.js";`);
  if (ir.compoundParts.length > 0) {
    lines.push(`import { StackComponent } from "../../primitives/index.js";`);
  }
  // componentRef: import the referenced standalone component class
  // (CODEGEN-RECURSIVE-COMPOSITION-01). It is also added to the @Component
  // imports[] array; the template addresses it by selector.
  for (const refImport of resolveComponentRefImports(ir.name, ir.dom, "angular")) {
    lines.push(
      `import { ${refImport.identifier} } from "${refImport.specifier}";`,
    );
  }
  if (ir.behavior.normalizedChannels.length > 0) {
    lines.push(`import { use${ir.name} } from "./use${ir.name}.js";`);
  }
  if (
    resolveSurfaceAutoDismiss(ir) &&
    ir.behavior.normalizedChannels.some((c) => c.valueType === "boolean")
  ) {
    lines.push(`import { createAutoDismiss } from "../../primitives/index.js";`);
  }
  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: field-association provider/consumer.
  if (ir.fieldAssociation?.provides || ir.fieldAssociation?.consumerPart) {
    lines.push(
      `import { FieldAssociationService } from "../../primitives/index.js";`,
    );
  }
  // iconGlyph: import the catalog resolver from the committed package-root
  // module of @full-stack-ds/iconography (ICON-CATALOG-RUNTIME-DELIVERY-01).
  // Structural — driven by IR `iconGlyph` facts, never per-component lore.
  if (ir.dom && collectIconGlyphNodes(ir.dom).length > 0) {
    lines.push(`import { resolveIcon } from "${ICONOGRAPHY_MODULE}";`);
  }
  // content-transform: import the shared highlight tokenizer when the tree
  // carries a highlight fact (FEAT-CODEBLOCK-HIGHLIGHT-01). Structural —
  // driven by IR content-transform facts, never per-component name lore.
  if (ir.dom && collectContentTransforms(ir.dom).some((t) => t.transform === "highlight")) {
    lines.push(
      `import { prepareHighlightSource } from "../../primitives/highlight/tokenize.js";`,
    );
  }
  // content-transform: the markdown runtime when the tree carries a
  // markdown fact (FEAT-MARKDOWN-CONTENT-TRANSFORM-01). Structural.
  if (ir.dom && collectContentTransforms(ir.dom).some(isMarkdownTransform)) {
    lines.push(
      `import { parseMarkdown, type MarkdownBlock, type MarkdownMark } from "../../primitives/markdown/markdown.js";`,
    );
  }
  if (selectorAnchor) {
    lines.push(
      `import {`,
      `  createAnchoredPosition,`,
      `  type CreateAnchoredPositionResult,`,
      `} from "../../primitives/surfaces/createAnchoredPosition.js";`,
    );
  }
  return lines.join("\n");
}

/**
 * FEAT-A11Y-LABEL-ID-ASSOCIATION-01 — Angular lowering of generated
 * relationship ids. Ids derive from the class's `instanceId` field
 * (module-counter namespace). All expressions here are CLASS scope
 * (`this.` accessors) — template scope inlines only the simple cases.
 */
function angularCamelIdent(kebab: string): string {
  const segments = kebab.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return (
    segments[0] +
    segments
      .slice(1)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("")
  );
}

function angularIdRefGuardExpr(ref: IdRefIR, channelAccessors?: ReadonlyMap<string, string>): string | undefined {
  // slotGate is not lowerable in Angular (projected-content presence is
  // not statically knowable) — only the when clause gates.
  if (!ref.when) return undefined;
  const accessor = channelAccessors?.get(ref.when.prop) ?? `this.${ref.when.prop}`;
  if (ref.when.op === "eq") {
    return `${accessor} ${ref.when.negated ? "!==" : "==="} '${ref.when.value}'`;
  }
  return ref.when.negated ? `!${accessor}` : accessor;
}

function angularIdRefListExpr(
  refs: IdRefIR[],
  passthroughProp: string | undefined,
  channelAccessors?: ReadonlyMap<string, string>,
): string {
  const idFor = (slug: string) => `\`\${this.instanceId}-${slug}\``;
  if (refs.length === 0 && !passthroughProp) return "undefined";
  if (refs.length === 1 && !refs[0].when && !passthroughProp) {
    return idFor(refs[0].slug);
  }
  const parts = refs.map((ref) => {
    const guard = angularIdRefGuardExpr(ref, channelAccessors);
    return guard ? `${guard} ? ${idFor(ref.slug)} : null` : idFor(ref.slug);
  });
  if (passthroughProp) parts.push(`this.${passthroughProp}`);
  return `[${parts.join(", ")}].filter(Boolean).join(" ") || undefined`;
}

function generateDomTreeComponent(ir: ComponentIR): string {
  if (!ir.dom) throw new Error("generateDomTreeComponent requires ir.dom");
  const candidateHighlight = collectContentTransforms(ir.dom).find(isHighlightTransform);
  const highlight = candidateHighlight?.linePart && candidateHighlight.gutterPart ? candidateHighlight : undefined;

  const selector = toKebab(ir.name);
  const className = `${ir.name}Component`;
  const channels = ir.behavior.normalizedChannels;
  const channelByName = new Map(channels.map((c) => [c.name, c]));
  const hasHook = channels.length > 0;
  const controlledChannels = channelInputs(ir);
  const channelAccessors = new Map<string, string>();
  for (const ch of controlledChannels.values()) {
    channelAccessors.set(ch.valueProp, `this.behavior.${ch.name}()`);
    channelAccessors.set(ch.name, `this.behavior.${ch.name}()`);
  }

  const overlayClickTrigger = ir.behavior.normalizedDismissalTriggers.find(
    (t) => t.event === "overlayClick",
  );
  const booleanChannel = channels.find((c) => c.valueType === "boolean");
  const autoDismissActive = Boolean(
    resolveSurfaceAutoDismiss(ir) && booleanChannel,
  );
  // Selector-anchored root panel (coachmark / guided tour): computed once
  // and threaded through class-body generation, the template render
  // context (for the fixed-position/data-placement root attrs), and
  // lifecycle interface selection below.
  const selectorAnchor = selectorAnchoredRootPortal(ir);

  const styledByName = new Map(ir.styledProps.map((p) => [p.name, p]));

  // ICON-CATALOG-RUNTIME-DELIVERY-01: glyph nodes get a module-scope
  // size-hints const (when the glyph has sizeHints) plus a pair of class
  // getters resolving the requested pixel size and the catalog lookup.
  // Collected before the template renders so the getter names are known
  // for the node-identity lookup in `renderAngularDomNode`.
  const iconGlyphNodes = collectIconGlyphNodes(ir.dom);
  const iconGlyphIdents = new Map<
    DomNodeIR,
    { glyphGetter: string; pxGetter: string | undefined }
  >();
  for (const { node, glyph, suffix } of iconGlyphNodes) {
    const hintsIdent = glyph.sizeHints
      ? `ICON_GLYPH_SIZE_HINTS${suffix}`
      : undefined;
    // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: @Input() size is
    // optional-typed even when the contract declares a default
    // (class-field initializers only apply once, at construction), so a
    // bare `this.size` index into Record<string, number> both fails
    // TS2538 AND, if defaulted with the empty string instead of the
    // contract default, silently misses the hints map and falls through
    // to the natural SVG size. Fall back to the resolved prop's contract
    // default (e.g. Icon's `size` default "md") so undefined resolves to
    // the same hint react's parameter default resolves to; `""` only
    // when the prop declares no contract default.
    const sizeDefaultExpr = styledByName.get(glyph.sizePropName ?? "")?.defaultExpr;
    const pxExpr = iconGlyphPxExpr(
      glyph,
      glyph.sizePropName
        ? `(this.${glyph.sizePropName} ?? ${sizeDefaultExpr ?? '""'})`
        : undefined,
      hintsIdent,
    );
    const pxGetter = pxExpr === undefined ? undefined : `iconGlyphPx${suffix}`;
    iconGlyphIdents.set(node, { glyphGetter: `iconGlyph${suffix}`, pxGetter });
  }

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: instance-id namespace (module
  // counter, the Material pattern), field-association provider/consumer,
  // and class getters for idref attributes that need conditions/joining.
  const needsInstanceId = componentNeedsInstanceId(ir);
  const assocProvides = ir.fieldAssociation?.provides;
  const assocConsumerPart = ir.fieldAssociation?.consumerPart;
  const idRefGetters = new Map<DomNodeIR, Map<string, string>>();
  const idRefGetterLines: string[] = [];
  {
    const collect = (node: DomNodeIR) => {
      for (const refAttr of node.idRefAttrs) {
        const simple =
          refAttr.refs.length === 1 &&
          !refAttr.refs[0].when &&
          !refAttr.passthroughProp;
        if (simple) continue;
        const getterName = angularCamelIdent(
          `${node.part ?? "root"}-${refAttr.attribute}`,
        );
        let byAttr = idRefGetters.get(node);
        if (!byAttr) {
          byAttr = new Map();
          idRefGetters.set(node, byAttr);
        }
        byAttr.set(refAttr.attribute, getterName);
        idRefGetterLines.push(
          ``,
          `  get ${getterName}(): string | undefined {`,
          `    return ${angularIdRefListExpr(refAttr.refs, refAttr.passthroughProp, channelAccessors)};`,
          `  }`,
        );
      }
      node.children.forEach(collect);
    };
    collect(ir.dom);
  }

  // FEAT-CODEBLOCK-HIGHLIGHT-01: one class getter per content-transform
  // node wraps the shared tokenizer for template iteration — Angular
  // template expressions resolve against the component instance only,
  // so an imported module function is not directly callable from the
  // template. Getter names derive from the transform (document-order
  // suffix keeps multiple transforms disjoint), never the component.
  const contentTransformGetters = new Map<DomNodeIR, string>();
  const contentTransformGetterLines: string[] = [];
  {
    const transforms = collectContentTransforms(ir.dom).filter(
      (t): t is Extract<typeof t, { transform: "highlight" }> => t.transform === "highlight",
    );
    const collectNodes = (node: DomNodeIR): void => {
      if (isHighlightTransform(node.content)) {
        const transform = node.content;
        const index = transforms.indexOf(transform);
        const getterName =
          index <= 0 ? "highlightTokens" : `highlightTokens${index}`;
        contentTransformGetters.set(node, getterName);
        const sourceExpr = appendPath(
          defaultAwareAngularClassPropAccessor(transform.sourceProp, styledByName),
          transform.source.path,
        );
        const languageExpr = appendPath(
          defaultAwareAngularClassPropAccessor(transform.languageProp, styledByName),
          transform.language.path,
        );
        const tokensExpr = transform.tokensProp
          ? defaultAwareAngularClassPropAccessor(transform.tokensProp, styledByName)
          : "undefined";
        const gateExpr = transform.gateProp
          ? defaultAwareAngularClassPropAccessor(transform.gateProp, styledByName)
          : "true";
        contentTransformGetterLines.push(
          ``,
          `  get ${getterName}() {`,
          `    return prepareHighlightSource(${sourceExpr}, ${languageExpr}, { tokens: ${tokensExpr}, highlight: ${gateExpr} });`,
          `  }`,
        );
      }
      node.children.forEach(collectNodes);
    };
    collectNodes(ir.dom);
  }

  const ctx: AngularRenderContext = {
    classRecipe: ir.classRecipe.base,
    componentName: ir.name,
    channelByName,
    styledByName,
    isRoot: true,
    rootRole: ir.root.rootRole,
    countdownPart: ir.motion.countdown?.target.name,
    sequence: Boolean(ir.motion.sequence),
    autoDismissPause: autoDismissActive,
    rootPolymorphicTag: ir.root.polymorphicTagProp,
    iconGlyphIdents,
    contentTransformGetters,
    fieldAssociationConsumerPart: assocConsumerPart,
    idRefGetters,
    rootSelectorAnchored: selectorAnchor !== null,
    keyboardActionsByPart: groupKeyboardActionsByPart(ir.keyboardActions),
    compositeItemPart: ir.behavior.focus?.strategy === "roving" ? ir.compositeControl?.part.name : undefined,
    compositeMemberExpr: compositeActivationMember(ir.compositeControl),
    ...(overlayClickTrigger && booleanChannel
      ? {
          overlayClickSetter: `set${capitalizeAngular(booleanChannel.name)}`,
          overlayClickEnabledProp: overlayClickTrigger.enabledByProp,
          overlayClickTargetPart: overlayClickTrigger.targetPart,
        }
      : {}),
  };
  const rawTemplate = renderAngularDomNode(ir.dom, ctx, 0);
  const hasChildrenGuard = treeHasChildrenGuard(ir.dom);
  const usesProjectionProbe = Boolean(highlight && hasChildrenGuard);
  const template = usesProjectionProbe
    ? rawTemplate.replace("<ng-content />", `<span data-fsds-projection=""><ng-content /></span>`)
    : rawTemplate;
  const usesMemberOf = treeUsesMemberOfPredicate(ir.dom);
  const usesNgIf = treeUsesNgIf(ir.dom);
  const usesNgFor = treeUsesNgFor(ir.dom);
  const usesCountIteration = treeUsesCountIteration(ir.dom);
  const hasMarkdownTransform =
    ir.dom !== undefined &&
    collectContentTransforms(ir.dom).some(isMarkdownTransform);
  const decoratorImports = ["NgClass"];
  if (hasMarkdownTransform) {
    // Content ngFor over markdownBlocks + the companion renderers.
    decoratorImports.push("NgFor", "MarkdownBlockRendererComponent");
  }
  if (usesNgIf) decoratorImports.push("NgIf");
  if (usesNgFor) decoratorImports.push("NgFor");
  if (highlight) decoratorImports.push(`${ir.name}${capitalizeAngular(highlight.linePart!)}Component`, `${ir.name}${capitalizeAngular(highlight.tokenPart)}Component`);
  if (ir.root.polymorphicTagProp) {
    decoratorImports.push("NgSwitch", "NgSwitchCase");
    if (ir.dom.children.length > 0 || ir.dom.content) decoratorImports.push("NgTemplateOutlet");
  }
  // componentRef: each referenced standalone component class must be in the
  // @Component imports[] so Angular resolves its selector in this template.
  for (const refImport of resolveComponentRefImports(ir.name, ir.dom, "angular")) {
    decoratorImports.push(refImport.identifier);
  }

  const lines: string[] = [];
  if (highlight) lines.push(angularHighlightParts(ir, highlight), "");
  // ICON-CATALOG-RUNTIME-DELIVERY-01: module-scope size-hints maps, one per
  // glyph node that declares `sizeHints`, emitted ahead of the decorator
  // (matching the React emitter's module-scope const placement).
  for (const { glyph, suffix } of iconGlyphNodes) {
    if (glyph.sizeHints) {
      lines.push(
        `const ICON_GLYPH_SIZE_HINTS${suffix}: Record<string, number> = ` +
          `${iconGlyphSizeHintsLiteral(glyph.sizeHints)};`,
      );
      lines.push(``);
    }
  }
  // Module-scope instance counter (SSR-safe, the Angular Material id
  // pattern) — each construction takes the next namespace.
  if (needsInstanceId) {
    lines.push(`let nextInstanceId = 0;`);
    lines.push(``);
  }
  lines.push(...generateAngularMarkdownCompanions(ir));
  lines.push(`@Component({`);
  lines.push(`  selector: "fsds-${selector}",`);
  lines.push(`  standalone: true,`);
  lines.push(`  imports: [${decoratorImports.join(", ")}],`);
  if (assocProvides) {
    // Component-level provider: projected content (the slotted control)
    // sits inside this element's injector chain and resolves the SAME
    // service instance.
    lines.push(`  providers: [FieldAssociationService],`);
  }
  lines.push(`  host: { "data-fsds-component": "${ir.cssPrefix}" },`);
  lines.push(`  template: \`${template}\`,`);
  lines.push(`  changeDetection: ChangeDetectionStrategy.OnPush,`);
  lines.push(`})`);
  // When the dom tree has a children guard, the class implements AfterContentInit
  // so it can detect content projection and toggle `hasContent` for *ngIf.
  // Full-overlay portal surfaces additionally implement OnInit/OnDestroy to
  // relocate their host into document.body and clean up on teardown.
  // Selector-anchored root panels (coachmark tours) consume the same
  // OnInit/OnDestroy body-relocation — the whole panel portals, positioned
  // against a page element resolved from the active step's selector.
  const rootPortal = portalsRootToBody(ir) || selectorAnchor !== null;
  const lifecycleInterfaces: string[] = [];
  if (hasChildrenGuard && !usesProjectionProbe) lifecycleInterfaces.push("AfterContentInit");
  if (rootPortal) lifecycleInterfaces.push("OnInit", "OnDestroy");
  if (lifecycleInterfaces.length > 0) {
    lines.push(
      `export class ${className} implements ${lifecycleInterfaces.join(", ")} {`,
    );
  } else {
    lines.push(`export class ${className} {`);
  }

  // @Input declarations for all styled props (skipping reserved + event handlers)
  const declaredProps = new Set<string>();
  for (const p of ir.styledProps) {
    if (ANGULAR_RESERVED.has(p.name)) continue;
    const propLine = generateInputProp(p);
    if (controlledChannels.has(p.name) || resolveSurfaceAutoDismiss(ir)?.durationProp === p.name || (ir.motion.sequence && [ir.motion.sequence.itemsProp, ir.motion.sequence.timing.durationProp, ir.motion.sequence.timing.autoPlayProp].includes(p.name))) {
      const type = lowerAngularPropType(p.propType);
      lines.push(`  private readonly input${capitalizeAngular(p.safeName)} = signal<${type} | undefined>(undefined);`);
      lines.push(`  @Input() get ${p.safeName}(): ${type} | undefined { return this.input${capitalizeAngular(p.safeName)}(); }`);
      lines.push(`  set ${p.safeName}(value: ${type} | undefined) { this.input${capitalizeAngular(p.safeName)}.set(value); }`);
      declaredProps.add(p.name);
    } else if (propLine) {
      lines.push(propLine);
      declaredProps.add(p.name);
    }
  }
  // The dom-tree path's classes computed references `this.class` (the user's
  // arbitrary className passthrough). Declare it explicitly here since the
  // reserved set excludes it from the loop above.
  lines.push(`  @Input() class?: string;`);

  // FEAT-MARKDOWN-CONTENT-TRANSFORM-01: the markdown tree as a class
  // getter (plain getter, re-evaluated each CD pass — the Angular idiom
  // for derived render data), consumed by the content ngFor.
  if (ir.dom && collectContentTransforms(ir.dom).some(isMarkdownTransform)) {
    const mdTransform = collectContentTransforms(ir.dom).find(isMarkdownTransform)!;
    lines.push(``);
    lines.push(`  get markdownBlocks(): MarkdownBlock[] {`);
    lines.push(`    return parseMarkdown(this.${mdTransform.sourceProp} ?? "");`);
    lines.push(`  }`);
  }

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01 class members. The provider connects
  // a GETTER so the service reads current state (status switches help↔error)
  // on every change-detection pass.
  if (needsInstanceId) {
    lines.push(``);
    lines.push(
      `  protected readonly instanceId = \`fsds-${selector}-\${nextInstanceId++}\`;`,
    );
  }
  if (assocProvides) {
    lines.push(
      `  private fieldAssociation = inject(FieldAssociationService).connect(() => ({`,
      `    controlId: \`\${this.instanceId}-${assocProvides.controlSlug}\`,`,
      `    describedBy: ${angularIdRefListExpr(assocProvides.describedBy, undefined)},`,
      `  }));`,
    );
  }
  if (assocConsumerPart) {
    lines.push(
      `  protected fieldAssociation = inject(FieldAssociationService, { optional: true });`,
    );
  }
  // Event handlers (channel onChange) — emit as @Input callbacks. Angular
  // typically uses @Output for events, but for design-system parity (the
  // contract says onChange is a callback), we keep @Input.
  for (const ch of channels) {
    if (declaredProps.has(ch.changeHandlerProp)) continue;
    const valueType = ch.valueType ?? "unknown";
    lines.push(
      `  @Input() ${ch.changeHandlerProp}?: (value: ${valueType}) => void;`,
    );
    declaredProps.add(ch.changeHandlerProp);
  }
  for (const dim of Object.keys(ir.variants)) {
    if (declaredProps.has(dim) || ANGULAR_RESERVED.has(dim)) continue;
    lines.push(`  @Input() ${dim}?: string;`);
    declaredProps.add(dim);
  }

  if (domHasKeyboardPanel(ir)) {
    lines.push(`  @ViewChild("interactionAnchor") set interactionAnchor(element: ElementRef<HTMLElement> | undefined) {`);
    lines.push(`    this.behavior.anchorRef.nativeElement = element?.nativeElement ?? null;`);
    lines.push(`  }`);
  }
  if (ir.interaction?.focusContainer || domHasKeyboardPanel(ir)) {
    lines.push(`  @ViewChild("interactionPanel") set interactionPanel(element: ElementRef<HTMLElement> | undefined) {`);
    lines.push(`    this.behavior.panelRef.nativeElement = element?.nativeElement ?? null;`);
    lines.push(`  }`);
  }
  if (hasHook) {
    lines.push(``);
    lines.push(`  private destroyRef = inject(DestroyRef);`);
    // Build the hook call
    if (controlledChannels.size > 0) {
      lines.push(`  private injector = inject(Injector);`);
      lines.push(`  private initializedBehavior?: ReturnType<typeof use${ir.name}>;`);
      lines.push(`  protected get behavior(): ReturnType<typeof use${ir.name}> {`);
      lines.push(`    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => use${ir.name}({`);
    } else {
      lines.push(`  protected behavior = use${ir.name}({`);
    }
    for (const ch of channels) {
      lines.push(`    ${ch.valueProp}: () => this.${ch.valueProp},`);
      if (ch.defaultValueProp) {
        lines.push(`    ${ch.defaultValueProp}: this.${ch.defaultValueProp},`);
      }
      lines.push(
        `    ${ch.changeHandlerProp}: (v) => this.${ch.changeHandlerProp}?.(v),`,
      );
    }
    // Forward dismissal-trigger enabledBy props.
    for (const trigger of ir.behavior.normalizedDismissalTriggers) {
      if (!trigger.enabledByProp) continue;
      lines.push(
        `    ${trigger.enabledByProp}: this.${trigger.enabledByProp},`,
      );
    }
    // FEAT-A11Y-COMPOSITE-KEYBOARD-01: forward the mode gates the keyboard
    // select behavior reads, getter-shaped so the hook sees live @Input
    // values on every keydown.
    for (const gate of keyboardModeGateProps(ir)) {
      lines.push(`    ${gate}: () => this.${gate},`);
    }
    for (const { prop } of focusTargetProps(ir)) {
      lines.push(`    ${prop}: () => this.${prop},`);
    }
    const modalityGate = ir.surface?.modalityGate;
    if (modalityGate) {
      lines.push(`    ${modalityGate.prop}: () => this.${modalityGate.prop},`);
    }
    lines.push(`    destroyRef: this.destroyRef,`);
    lines.push(`  });`);
    if (controlledChannels.size > 0) {
      lines[lines.length - 1] = `  })));`;
      lines.push(`  }`);
    }
    // Ephemeral-surface auto-dismiss (WCAG 2.2.1). The effect tracks the
    // behavior's open signal; sync() restarts/clears the timer; pause
    // listeners land on the template root.
    const autoDismissPolicy = resolveSurfaceAutoDismiss(ir);
    const autoDismissChannel = autoDismissPolicy
      ? channels.find((c) => c.valueType === "boolean")
      : undefined;
    if (autoDismissPolicy && autoDismissChannel) {
      lines.push(
        ``,
        `  protected autoDismiss = createAutoDismiss({`,
        `    open: () => Boolean(this.behavior.${autoDismissChannel.name}()),`,
        `    durationMs: () => this.${autoDismissPolicy.durationProp} === undefined ? ${autoDismissPolicy.defaultMs ?? "undefined"} : this.${autoDismissPolicy.durationProp},`,
        ...(ir.motion.countdown ? [`    reducedMotionSteps: ${ir.motion.countdown.reducedMotion.steps},`] : []),
        `    onDismiss: () => this.behavior.set${capitalizeAngular(autoDismissChannel.name)}(false),`,
        `    destroyRef: this.destroyRef,`,
        `  });`,
        `  private autoDismissEffect = effect(() => this.autoDismiss.sync());`,
        ...(ir.motion.countdown ? [
          `  @ViewChild("countdownProgress") set countdownProgress(el: ElementRef<HTMLElement> | undefined) {`,
          `    this.autoDismiss.bindProgress(el?.nativeElement);`,
          `  }`,
        ] : []),
      );
    }
  }

  if (ir.interaction && ir.dom && ir.interaction.triggers.some(t => t.operation !== "select" && t.operation !== "toggle-item")) lines.push(`  protected canActivateInteraction = canActivateInteraction;`);

  if (ir.motion.sequence) {
    const seq = ir.motion.sequence;
    lines.push(`  protected sequence = createSequenceBudget(${sequenceConfig(seq, ir.cssPrefix)});`,
      `  private sequenceCleanup = this.destroyRef.onDestroy(() => this.sequence.destroy());`,
      `  private sequenceEffect = effect(() => this.sequence.sync({`,
      `    index: this.behavior.${seq.channel}(), labels: this.${seq.itemsProp} ?? [], autoPlay: this.${seq.timing.autoPlayProp} ?? false,`,
      `    durationMs: this.${seq.timing.durationProp} === undefined ? ${seq.timing.defaultMs} : this.${seq.timing.durationProp},`,
      `    onIndexChange: (value) => this.behavior.set${capitalizeAngular(seq.channel)}(value),`, `  }));`,
      `  @ViewChild("sequenceRoot") set sequenceRoot(el: ElementRef<HTMLElement> | undefined) {`,
      `    this.sequence.bindRoot(el?.nativeElement);`, `  }`);
  }
  // classes computed
  lines.push(``);
  lines.push(...generateDomTreeClassesComputed(ir));

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: getters for conditional/joined
  // idref attributes (plain getters, re-evaluated each CD pass — Angular
  // templates cannot reference `Boolean` for an inline filter).
  lines.push(...idRefGetterLines);

  // FEAT-CODEBLOCK-HIGHLIGHT-01: content-transform getters wrapping the
  // shared tokenizer (plain getters, same re-evaluation semantics as the
  // idref getters above).
  lines.push(...contentTransformGetterLines);

  // Helper handler methods. Named `handle<Name>Change` (NOT `on<Name>Change`)
  // to avoid colliding with the @Input() change-handler prop of the same
  // shape (the contract's onChange/onOpenChange/etc).
  //
  // Only emit handlers for primitive value types (string/number/boolean)
  // that map directly to `<input>` event semantics. Complex types like
  // Date or Date[] (Calendar) need consumer-side conversion — emitting a
  // string-to-Date setter call here produces a TS error under strict mode.
  // Templates currently don't bind these handlers anyway; consumers wire
  // their own when they need custom input handling.
  const PRIMITIVE_VALUE_TYPES = new Set(["string", "number", "boolean"]);
  const handlerChannels = channelsNeedingInputHandlers(ir);
  for (const ch of channels) {
    if (!PRIMITIVE_VALUE_TYPES.has(ch.valueType ?? "")) continue;
    // Host-aware lowering inlines a toggle for non-form hosts; only form
    // hosts still route through the element-state handler.
    if (!handlerChannels.has(ch.name)) continue;
    const handlerName = `handle${capitalizeAngular(ch.name)}Change`;
    const setter = `set${capitalizeAngular(ch.name)}`;
    const valueExpr =
      ch.valueType === "boolean"
        ? `(event.target as HTMLInputElement).checked`
        : ch.valueType === "number"
          ? `Number((event.target as HTMLInputElement).value)`
          : `(event.target as HTMLInputElement).value`;
    lines.push(``);
    lines.push(`  protected ${handlerName}(event: Event): void {`);
    lines.push(`    this.behavior.${setter}(${valueExpr});`);
    lines.push(`  }`);
  }

  // IR-DOM-ITERATE-CAPABILITY-01: count iteration needs a class-body
  // helper to materialize an array of length N for *ngFor's source.
  // Angular template parsers reject `new Array(n)` / `Array(n)` inline,
  // so we emit a memoized method. The helper is only injected when
  // some node in the dom tree actually has kind="count" iteration.
  if (usesCountIteration) {
    lines.push(``);
    lines.push(
      `  // Materializes an array of length N for *ngFor count-iteration.`,
    );
    lines.push(
      `  // Memoized by length so re-renders don't churn the iteration source.`,
    );
    lines.push(`  private _arrayFromCountCache = new Map<number, ReadonlyArray<undefined>>();`);
    lines.push(`  protected arrayFromCount(n: number | undefined): ReadonlyArray<undefined> {`);
    lines.push(`    const len = typeof n === "number" && n > 0 ? Math.floor(n) : 0;`);
    lines.push(`    let arr = this._arrayFromCountCache.get(len);`);
    lines.push(`    if (!arr) {`);
    lines.push(`      arr = Array.from({ length: len });`);
    lines.push(`      this._arrayFromCountCache.set(len, arr);`);
    lines.push(`    }`);
    lines.push(`    return arr;`);
    lines.push(`  }`);
  }

  // BINDING-EXPRESSION-V2-PREDICATE-01: predicate:memberOf helper.
  // Angular templates cannot reference the global `Array` object, so
  // `predicate:memberOf` lowers to a method call on the component
  // instance. The helper is only injected when at least one
  // `predicate:memberOf` appears in the IR. Identical runtime
  // semantics to the inline form used in React/Svelte/Lit.
  if (usesMemberOf) {
    lines.push(``);
    lines.push(
      `  // BindingExpressionV2 predicate:memberOf helper. Adapts to the runtime`,
    );
    lines.push(
      `  // shape of \`selection\`: scalar equality when not an array, set`,
    );
    lines.push(
      `  // membership otherwise. Used for channels typed \`T | T[]\`.`,
    );
    lines.push(
      `  protected memberOf(candidate: unknown, selection: unknown): boolean {`,
    );
    lines.push(
      `    return Array.isArray(selection) ? selection.includes(candidate) : candidate === selection;`,
    );
    lines.push(`  }`);
  }

  if (treeUsesSelectionLabel(ir.dom)) {
    lines.push(`  protected selectionLabel(options: readonly { value: string; label: string }[] | undefined, selection: string | string[] | undefined, fallback: string): string {`);
    lines.push(`    return ${composeBindingProjectionExpression("selectionLabel", "options", "selection", "fallback")};`);
    lines.push(`  }`);
  }

  // FEAT-CHANNEL-UPDATE-OPERATIONS-01: synthesize one method per distinct
  // (op, channel) named update operation used in the dom tree. Angular
  // template expressions forbid the inline arrow/spread/filter-callback the
  // other frameworks use, so the composed next value is computed here and
  // passed through the canonical `this.behavior.set<Channel>` setter — the
  // same setter every other wire uses, never a direct state write.
  for (const upd of collectChannelUpdates(ir.dom).values()) {
    const ch = channelByName.get(upd.channel);
    if (!ch) continue;
    const method = channelUpdateMethodName(upd.op, ch.name);
    const setter = `this.behavior.set${capitalizeAngular(ch.name)}`;
    const current = `this.behavior.${ch.name}()`;
    lines.push(``);
    if (upd.op === "setCharAt") {
      // params: ($event, index). Body sets the char at `index` from the
      // native input payload's last character.
      const body = composeChannelUpdateExpression("setCharAt", {
        current,
        setter,
        eventValue: "(event.target as HTMLInputElement).value",
        operands: ["index"],
      });
      lines.push(
        `  // Set the character at \`index\` to the last char of the input payload.`,
      );
      lines.push(`  protected ${method}(event: Event, index: number): void {`);
      lines.push(`    ${body};`);
      lines.push(`  }`);
    } else {
      // toggleMembership. params: (member, modeGate). Replace when modeGate
      // is false; toggle membership when true. Written as explicit statements
      // (not the shared inline composer) so a typed `string[]` local lets
      // Angular's strict tsc narrow `.filter`/`includes` on the `T | T[]`
      // channel — the getter-repeated inline form does not narrow across
      // calls. Semantics are identical to `composeChannelUpdateExpression`.
      lines.push(
        `  // Replace (single mode) or toggle \`member\`'s array membership (multi mode).`,
      );
      // `modeGate` is a template-supplied boolean prop, which Angular's
      // strict template typechecker (ngc) sees as `boolean | undefined` for
      // an optional @Input — so the param admits undefined (the `!modeGate`
      // guard already treats it as the single-mode replace branch).
      lines.push(
        `  protected ${method}(member: string, modeGate: boolean | undefined): void {`,
      );
      lines.push(`    if (!modeGate) {`);
      lines.push(`      ${setter}(member);`);
      lines.push(`      return;`);
      lines.push(`    }`);
      lines.push(`    const currentValue = ${current};`);
      lines.push(
        `    const arr: string[] = Array.isArray(currentValue)`,
      );
      lines.push(`      ? [...currentValue]`);
      lines.push(
        `      : currentValue == null ? [] : [currentValue];`,
      );
      lines.push(
        `    ${setter}(arr.includes(member) ? arr.filter((v) => v !== member) : [...arr, member]);`,
      );
      lines.push(`  }`);
    }
  }

  // Inject content-projection detection when the dom tree has an `if: "children"` node.
  // Mirrors Vue's `v-if="$slots.default"` / Svelte's `{#if children}`.
  if (hasChildrenGuard) {
    lines.push(``);
    if (usesProjectionProbe) {
      lines.push(`  private _el = inject(ElementRef<HTMLElement>);`);
      lines.push(`  protected get hasContent(): boolean {`);
      lines.push(`    const host = this._el.nativeElement as HTMLElement;`);
      lines.push(`    const projection = host.querySelector("[data-fsds-projection]");`);
      lines.push(`    const nodes: Node[] = projection ? Array.from(projection.childNodes) : [];`);
      lines.push(`    return nodes.some((node) =>`);
      lines.push(`      node.nodeType === Node.ELEMENT_NODE ||`);
      lines.push(`      (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== ""),`);
      lines.push(`    );`);
      lines.push(`  }`);
    } else {
    lines.push(
      `  // Tracks whether any content has been projected — used by *ngIf="hasContent".`,
    );
    lines.push(`  protected hasContent = false;`);
    lines.push(`  private _el = inject(ElementRef<HTMLElement>);`);
    lines.push(``);
    lines.push(`  ngAfterContentInit(): void {`);
    lines.push(
      `    // Check for any non-whitespace child nodes projected into this component.`,
    );
    lines.push(
      `    const nodes = Array.from((this._el.nativeElement as HTMLElement).childNodes);`,
    );
    lines.push(`    this.hasContent = nodes.some((n) =>`);
    lines.push(`      n.nodeType === Node.ELEMENT_NODE ||`);
    lines.push(
      `      (n.nodeType === Node.TEXT_NODE && n.textContent?.trim() !== ""),`,
    );
    lines.push(`    );`);
    lines.push(`  }`);
    }
  }

  // ICON-CATALOG-RUNTIME-DELIVERY-01: getters resolving the requested
  // pixel size (when the glyph has a size binding) and the catalog
  // lookup. Angular idiom is a getter — re-evaluates on every read, so
  // it stays reactive to @Input changes without a signal/computed()
  // dependency (glyph nodes appear on Stack-only components with no
  // behavior channels, same as `classes()` above). A miss (unknown icon
  // name) leaves the getter `undefined` and the template's `*ngIf`
  // null-guard renders nothing. `Number.NaN` deliberately matches no
  // authored size, so resolveIcon falls back to the smallest authored
  // variant.
  for (const { node, glyph, suffix } of iconGlyphNodes) {
    const { glyphGetter, pxGetter } = iconGlyphIdents.get(node)!;
    const hintsIdent = glyph.sizeHints
      ? `ICON_GLYPH_SIZE_HINTS${suffix}`
      : undefined;
    // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: fall back to the resolved
    // prop's contract default (not `""`) — see the identical comment on
    // the sibling collection loop above for the full rationale.
    const sizeDefaultExpr2 = styledByName.get(glyph.sizePropName ?? "")?.defaultExpr;
    const pxExpr = iconGlyphPxExpr(
      glyph,
      glyph.sizePropName
        ? `(this.${glyph.sizePropName} ?? ${sizeDefaultExpr2 ?? '""'})`
        : undefined,
      hintsIdent,
    );
    lines.push(``);
    if (pxGetter && pxExpr !== undefined) {
      lines.push(`  get ${pxGetter}(): number | undefined {`);
      lines.push(`    return ${pxExpr};`);
      lines.push(`  }`);
      lines.push(``);
    }
    const nameProp = styledByName.get(glyph.namePropName);
    lines.push(`  get ${glyphGetter}() {`);
    lines.push(
      `    return resolveIcon(${iconGlyphNameArg(
        `this.${glyph.namePropName}`,
        nameProp !== undefined && !nameProp.required,
      )}, ` +
        `${pxGetter ? `this.${pxGetter} ?? Number.NaN` : "Number.NaN"});`,
    );
    lines.push(`  }`);
  }

  // FEAT-PORTAL-MECHANISM-CROSS-FRAMEWORK-01: relocate the host element into
  // document.body so the fixed overlay layer escapes any transform/overflow/
  // filter ancestor's containing block. Angular has no CDK dependency in this
  // repo, so this is a plain lifecycle move via ElementRef. `_originParent`
  // remembers where the host lived so ngOnDestroy restores/removes it without
  // leaking a detached node. SSR-safe: guarded on `document` presence. The
  // moved subtree carries the full root markup, so backdrop-self-click
  // dismissal and every containment check still resolve against the same nodes.
  if (rootPortal) {
    // Reuse the ElementRef the children-guard path already injected as `_el`;
    // otherwise declare the portal's own host reference.
    if (!hasChildrenGuard) {
      lines.push(``);
      lines.push(`  private _el = inject(ElementRef<HTMLElement>);`);
    }
    lines.push(`  private _portalOriginParent: Node | null = null;`);
    lines.push(`  private _portalOriginNext: Node | null = null;`);
    lines.push(``);
    lines.push(`  ngOnInit(): void {`);
    lines.push(`    if (typeof document === "undefined") return;`);
    lines.push(`    const host = this._el.nativeElement as HTMLElement;`);
    lines.push(`    this._portalOriginParent = host.parentNode;`);
    lines.push(`    this._portalOriginNext = host.nextSibling;`);
    lines.push(`    document.body.appendChild(host);`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  ngOnDestroy(): void {`);
    lines.push(`    const host = this._el.nativeElement as HTMLElement;`);
    lines.push(`    // Restore to the original position when it still exists so`);
    lines.push(`    // Angular's own teardown removes it from the right place;`);
    lines.push(`    // otherwise detach it directly.`);
    lines.push(`    if (this._portalOriginParent && this._portalOriginParent.isConnected) {`);
    lines.push(`      this._portalOriginParent.insertBefore(host, this._portalOriginNext);`);
    lines.push(`    } else {`);
    lines.push(`      host.parentNode?.removeChild(host);`);
    lines.push(`    }`);
    lines.push(`  }`);
  }

  // Selector-anchored root panel (coachmark / guided tour): resolve the
  // active page element from the indexed selector prop, then position the
  // (portaled) root against it via createAnchoredPosition. The anchor
  // element lives outside this component's tree, so it is re-resolved
  // whenever the index channel or the selector array changes — driven by
  // an effect() (Angular has no dependency-array equivalent to React's
  // useEffect; effect() auto-tracks the signal reads inside its body).
  if (selectorAnchor) {
    const idxChannel = channels.find(
      (c) => c.name === selectorAnchor.indexChannel,
    );
    if (!idxChannel) {
      throw new Error(
        `${ir.name}: surface.anchor.selector.indexChannel "${selectorAnchor.indexChannel}" has no matching channel in the IR.`,
      );
    }
    const propIdent =
      ir.styledProps.find((p) => p.name === selectorAnchor.prop)?.safeName ??
      selectorAnchor.prop;
    const placementProp = ir.surface?.positioning?.placementProp;
    const collision = ir.surface?.positioning?.collision ?? "flip-shift";
    lines.push(``);
    lines.push(
      `  private _anchorTargetEl = signal<HTMLElement | null>(null);`,
    );
    lines.push(
      `  private _anchorResolveEffect = effect(() => {`,
      `    const steps = this.${propIdent} ?? [];`,
      `    const selector = steps[this.behavior.${idxChannel.name}()]?.${selectorAnchor.path};`,
      `    this._anchorTargetEl.set(`,
      `      typeof document === "undefined" || !selector`,
      `        ? null`,
      `        : document.querySelector<HTMLElement>(selector),`,
      `    );`,
      `  });`,
      ``,
      `  protected _position: CreateAnchoredPositionResult = createAnchoredPosition({`,
      `    anchor: () => this._anchorTargetEl(),`,
      `    content: () => this._el.nativeElement,`,
      `    open: () => true,`,
      `    placement: () => ${placementProp ? `this.${placementProp} ?? "auto"` : `"auto"`},`,
      `    collision: () => "${collision}",`,
      `    destroyRef: this.destroyRef,`,
      `  });`,
      `  private _anchorPositionEffect = effect(() => {`,
      `    this._anchorTargetEl();`,
      `    this._position.requestUpdate();`,
      `  });`,
    );
  }

  lines.push(`}`);
  return lines.join("\n");
}

/**
 * FEAT-MARKDOWN-CONTENT-TRANSFORM-01 — Angular lowering of the markdown
 * transform: two standalone companion renderers with element selectors
 * (`fsds-markdown-mark` / `fsds-markdown-block` — transform-derived, not
 * component-name lore), the idiomatic Angular
 * shape for mutually recursive template structures in one file. The mark
 * renderer is declared first (no class references); the block renderer
 * imports it by class; recursion inside templates goes through the
 * selectors, so no TDZ hazards. Tags/classes/attrs come from the IR.
 */
function generateAngularMarkdownCompanions(ir: ComponentIR): string[] {
  const transform = collectContentTransforms(ir.dom).find(isMarkdownTransform);
  if (!transform) return [];
  const prefix = ir.classRecipe.base;
  const b = transform.blockParts;
  const bt = transform.blockTags;
  const m = transform.markParts;
  const mt = transform.markTags;
  const blockClass = (part: string): string => `${prefix}__${part}`;
  const marksNgFor = `<fsds-markdown-mark *ngFor="let mark of blockChildren" [mark]="mark"></fsds-markdown-mark>`;
  const childMarksNgFor = `<fsds-markdown-mark *ngFor="let child of markChildren" [mark]="child"></fsds-markdown-mark>`;
  const itemsNgFor = `<fsds-markdown-block *ngFor="let item of blockItems" [block]="item"></fsds-markdown-block>`;
  return [
    ``,
    `@Component({`,
    `  selector: "fsds-markdown-mark",`,
    `  standalone: true,`,
    `  imports: [NgSwitch, NgSwitchCase, NgIf, NgFor],`,
    `  host: { "data-fsds-transform": "markdown-mark" },`,
    `  template: \`<ng-container [ngSwitch]="mark.kind">`,
    `    <ng-container *ngSwitchCase="'text'">{{ markText }}</ng-container>`,
    `    <${mt.code} *ngSwitchCase="'code'" class="${prefix}__${m.code}" data-mark-kind="code">{{ markText }}</${mt.code}>`,
    `    <${mt.emphasis} *ngSwitchCase="'emphasis'" class="${prefix}__${m.emphasis}" data-mark-kind="emphasis">${childMarksNgFor}</${mt.emphasis}>`,
    `    <${mt.strong} *ngSwitchCase="'strong'" class="${prefix}__${m.strong}" data-mark-kind="strong">${childMarksNgFor}</${mt.strong}>`,
    `    <ng-container *ngSwitchCase="'link'">`,
    `      <${mt.link} *ngIf="markHref !== null" class="${prefix}__${m.link}" data-mark-kind="link" [attr.href]="markHref">${childMarksNgFor}</${mt.link}>`,
    `      <ng-container *ngIf="markHref === null">${childMarksNgFor}</ng-container>`,
    `    </ng-container>`,
    `  </ng-container>\`,`,
    `})`,
    `export class MarkdownMarkRendererComponent {`,
    `  @Input() mark!: MarkdownMark;`,
    `  // ngSwitch does not narrow unions in templates (strict ngc); typed`,
    `  // getters carry the payload once, centrally.`,
    `  get markText(): string {`,
    `    return (this.mark as { text?: string }).text ?? "";`,
    `  }`,
    `  get markChildren(): MarkdownMark[] {`,
    `    return (this.mark as { children?: MarkdownMark[] }).children ?? [];`,
    `  }`,
    `  get markHref(): string | null {`,
    `    return (this.mark as { href?: string | null }).href ?? null;`,
    `  }`,
    `}`,
    ``,
    `@Component({`,
    `  selector: "fsds-markdown-block",`,
    `  standalone: true,`,
    `  imports: [NgSwitch, NgSwitchCase, NgIf, NgFor, MarkdownMarkRendererComponent],`,
    `  host: { "data-fsds-transform": "markdown-block" },`,
    `  template: \`<ng-container [ngSwitch]="block.kind">`,
    `    <${bt.heading} *ngSwitchCase="'heading'" class="${blockClass(b.heading)}" data-block-kind="heading" [attr.data-level]="blockLevel">${marksNgFor}</${bt.heading}>`,
    `    <${bt.paragraph} *ngSwitchCase="'paragraph'" class="${blockClass(b.paragraph)}" data-block-kind="paragraph">${marksNgFor}</${bt.paragraph}>`,
    `    <ng-container *ngSwitchCase="'list'">`,
    `      <${bt.orderedList} *ngIf="blockOrdered" class="${blockClass(b.orderedList)}" data-block-kind="orderedList">${itemsNgFor}</${bt.orderedList}>`,
    `      <${bt.unorderedList} *ngIf="!blockOrdered" class="${blockClass(b.unorderedList)}" data-block-kind="unorderedList">${itemsNgFor}</${bt.unorderedList}>`,
    `    </ng-container>`,
    `    <${bt.listItem} *ngSwitchCase="'listItem'" class="${blockClass(b.listItem)}" data-block-kind="listItem">${marksNgFor}</${bt.listItem}>`,
    `    <${bt.codeBlock} *ngSwitchCase="'codeBlock'" class="${blockClass(b.codeBlock)}" data-block-kind="codeBlock" [attr.data-language]="blockLanguage">{{ blockText }}</${bt.codeBlock}>`,
    `    <${bt.blockquote} *ngSwitchCase="'blockquote'" class="${blockClass(b.blockquote)}" data-block-kind="blockquote">${marksNgFor}</${bt.blockquote}>`,
    `  </ng-container>\`,`,
    `})`,
    `export class MarkdownBlockRendererComponent {`,
    `  @Input() block!: MarkdownBlock;`,
    `  // Same ngc-narrowing reason as the mark renderer's getters.`,
    `  get blockText(): string {`,
    `    return (this.block as { text?: string }).text ?? "";`,
    `  }`,
    `  get blockChildren(): MarkdownMark[] {`,
    `    return (this.block as { children?: MarkdownMark[] }).children ?? [];`,
    `  }`,
    `  get blockItems(): MarkdownBlock[] {`,
    `    return (this.block as { items?: MarkdownBlock[] }).items ?? [];`,
    `  }`,
    `  get blockLanguage(): string {`,
    `    return (this.block as { language?: string }).language ?? "";`,
    `  }`,
    `  get blockLevel(): number {`,
    `    return (this.block as { level?: number }).level ?? 1;`,
    `  }`,
    `  get blockOrdered(): boolean {`,
    `    return (this.block as { ordered?: boolean }).ordered === true;`,
    `  }`,
    `}`,
  ];
}

function generateDomTreeClassesComputed(ir: ComponentIR): string[] {
  const { classRecipe } = ir;
  const channels = ir.behavior.normalizedChannels;
  const channelValueProps = new Set(channels.map((c) => c.valueProp));
  const channelNames = new Set(channels.map((c) => c.name));
  // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: default-aware, see
  // `angularPropAccessor`'s doc comment.
  const styledByName = new Map(ir.styledProps.map((p) => [p.name, p]));
  // Angular's computed() only re-runs when tracked signal dependencies
  // change. Components with no behavior channels (e.g. AnimatedCard) read
  // only plain @Input properties — non-signals — so the computation would
  // cache the initial value forever. Emit a getter method instead so each
  // call reflects current @Input values.
  const hasSignalDeps = channels.length > 0 && channelInputs(ir).size === 0;
  const lines: string[] = hasSignalDeps
    ? [
        `  classes = computed(() =>`,
        `    [`,
        `      "${classRecipe.base}",`,
      ]
    : [
        `  classes(): string {`,
        `    return [`,
        `      "${classRecipe.base}",`,
      ];
  for (const mod of classRecipe.valueModifiers) {
    const acc = defaultAwareAngularClassPropAccessor(mod.propName, styledByName);
    lines.push(
      `      ${acc} ? \`${classRecipe.base}--${mod.valuePrefix ?? ""}\${${acc}}\` : null,`,
    );
  }
  for (const mod of classRecipe.booleanModifiers) {
    // Resolve the modifier's display value:
    // - When name matches channel valueProp (e.g. checked), use behavior.<channelName>()
    // - When name matches channel name (e.g. open with valueProp isOpen), use behavior.<name>()
    // - Otherwise reference the @Input prop directly
    if (channelValueProps.has(mod.propName)) {
      const ch = channels.find((c) => c.valueProp === mod.propName)!;
      lines.push(
        `      this.behavior.${ch.name}() ? "${classRecipe.base}--${mod.safeName}" : null,`,
      );
    } else if (channelNames.has(mod.propName)) {
      lines.push(
        `      this.behavior.${mod.propName}() ? "${classRecipe.base}--${mod.safeName}" : null,`,
      );
    } else {
      const acc = defaultAwareAngularClassPropAccessor(mod.safeName, styledByName);
      lines.push(
        `      ${acc} ? "${classRecipe.base}--${mod.safeName}" : null,`,
      );
    }
  }
  lines.push(`      this.class,`);
  if (hasSignalDeps) {
    lines.push(`    ].filter(Boolean).join(" "),`);
    lines.push(`  );`);
  } else {
    lines.push(`    ].filter(Boolean).join(" ");`);
    lines.push(`  }`);
  }
  return lines;
}

interface AngularRenderContext {
  /** Ancestor pre elements preserve template formatting as literal text. */
  preformatted?: boolean;
  classRecipe: string;
  componentName?: string;
  channelByName: Map<string, NormalizedChannelIR>;
  /** Prop-name → resolved styled-prop lookup, mirroring the lit emitter's `styledByName`. Populated at root construction and carried into nested contexts via the `{ ...ctx }` spread. */
  styledByName: Map<string, { type: string; defaultExpr?: string }>;
  isRoot: boolean;
  /**
   * Role synthesized on the rendered DOM root from `a11y.role` when the
   * authored tree does not already assign it. Parity with the React, Vue,
   * and Svelte render contexts.
   */
  rootRole?: string;
  /** When true, bind auto-dismiss pause listeners on the template root. */
  sequence?: boolean;
  autoDismissPause?: boolean;
  countdownPart?: string;
  overlayClickSetter?: string;
  overlayClickEnabledProp?: string;
  overlayClickTargetPart?: string;
  /**
   * Identifier names introduced by enclosing `*ngFor` iterations. After
   * BINDING-EXPRESSION-V2-01 the binding-side `prop:X` lowering no
   * longer consults this set — iteration locals reach the emitter as
   * `iterationLocal`-kind bindings via `ctx.enclosingIteration`. The
   * field is retained so future `if:` migration off this scope set can
   * happen separately if needed.
   */
  iterationScope?: Set<string>;
  /**
   * Nearest enclosing iteration directive. Resolution target for
   * `iterationLocal`-kind bindings.
   */
  enclosingIteration?: IterationIR;
  rootPolymorphicTag?: {
    propName: string;
    defaultTag: string;
    allowedTags: string[];
  };
  /**
   * Getter identifiers for nodes carrying `iconGlyph`
   * (ICON-CATALOG-RUNTIME-DELIVERY-01), keyed by node identity.
   * `glyphGetter` names the class getter resolving the catalog record via
   * `resolveIcon(...)`; `pxGetter` names the requested-pixel getter
   * (undefined when the glyph has no size binding). Populated once at the
   * root call from `collectIconGlyphNodes`; empty when the tree has no
   * glyph nodes.
   */
  iconGlyphIdents?: Map<DomNodeIR, { glyphGetter: string; pxGetter: string | undefined }>;

  /**
   * Class-getter names for nodes carrying a content transform
   * (FEAT-CODEBLOCK-HIGHLIGHT-01), keyed by node identity. Angular
   * template expressions resolve against the component instance only,
   * so the shared tokenizer must be wrapped in a class getter the
   * template's `*ngFor` can iterate. Populated once at the root call
   * from `collectContentTransforms`; empty when the tree has no
   * content-transform nodes.
   */
  contentTransformGetters?: Map<DomNodeIR, string>;
  /**
   * Selector-anchored root panel (coachmark / guided tour): the root
   * element gets the fixed-position/data-placement host attrs driven by
   * the class body's `_position` (createAnchoredPosition). Root-level
   * only — set once at `generateDomTreeComponent`'s top-level ctx.
   */
  rootSelectorAnchored?: boolean;
  /**
   * Anatomy part that consumes ambient field association.
   */
  fieldAssociationConsumerPart?: string;
  /**
   * Class-getter names for idref attributes that need conditions or
   * joining (FEAT-A11Y-LABEL-ID-ASSOCIATION-01), keyed by node identity
   * then attribute name. Simple single-ref attributes inline instead.
   */
  idRefGetters?: Map<DomNodeIR, Map<string, string>>;
  /**
   * FEAT-A11Y-COMPOSITE-KEYBOARD-01: realized keyboard actions keyed by the
   * declared `when` part. The walker lowers one `(keydown)` binding per
   * hosting part; the co-located hook emits the implementation from the
   * same IR facts.
   */
  keyboardActionsByPart?: Map<string, KeyboardActionIR[]>;
  /** The composite control's item part, when the IR declares one. */
  compositeItemPart?: string;
  /** Binding expression the item's click activation passes as the value. */
  compositeMemberExpr?: BindingExpression;
}

/**
 * FEAT-A11Y-COMPOSITE-KEYBOARD-01: whether any DOM node carries the
 * `keyboardPanel` fact — those nodes need the `interactionPanel` ViewChild
 * wiring even when the IR declares no focusContainer (the anchor-toggle open
 * path).
 */
function domHasKeyboardPanel(ir: ComponentIR): boolean {
  const walk = (node: DomNodeIR): boolean =>
    node.keyboardPanel === true || node.children.some(walk);
  return ir.dom ? walk(ir.dom) : false;
}

function renderAngularDomNode(
  node: DomNodeIR,
  ctx: AngularRenderContext,
  indent: number,
): string {
  // HTML preformatted context must carry only authored content. Suppress
  // generator whitespace while leaving interpolated source values untouched.
  const compact = ctx.preformatted || node.tag === "pre";
  if (compact) indent = 0;
  const childIndent = compact ? 0 : indent + 2;
  const separator = compact ? "" : "\n";
  const pad = " ".repeat(indent);

  if (node.tag === "slot" || node.tag === "children") {
    if (node.slotName) {
      return `${pad}<ng-content select="[slot=${node.slotName}]" />`;
    }
    return `${pad}<ng-content />`;
  }

  // IR-DOM-ITERATE-CAPABILITY-01: extend iterationScope for this node
  // and every descendant. Bindings on the iterated node and its subtree
  // resolve `prop:item` / `prop:index` as bare locals from the *ngFor
  // template scope, not via `safePropertyExpr` (which would route them
  // through the component-class accessor and prefix reserved names
  // with `this.`).
  if (node.iteration) {
    const extendedScope = new Set(ctx.iterationScope ?? []);
    extendedScope.add(node.iteration.indexVar);
    if (node.iteration.itemVar !== undefined) {
      extendedScope.add(node.iteration.itemVar);
    }
    ctx = {
      ...ctx,
      iterationScope: extendedScope,
      enclosingIteration: node.iteration,
    };
  }

  const attrs: string[] = [];
  // focusContainer (trap/portal panels) and keyboardPanel (a keyboard `open`
  // action's post-open focus target) both receive the interaction panel ref.
  if (node.focusContainer || node.keyboardPanel) attrs.push(`#interactionPanel`);
  if (node.keyboardAnchor) attrs.push(`#interactionAnchor`);
  const classParts: string[] = [];
  if (ctx.countdownPart && node.part === ctx.countdownPart) attrs.push(`hidden`);
  if (ctx.countdownPart && node.part === ctx.countdownPart) attrs.push(`#countdownProgress`);
  if (node.part) classParts.push(`'${ctx.classRecipe}__${node.part}'`);

  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === "class" || key === "className") {
      classParts.push(`'${value}'`);
      continue;
    }
    attrs.push(`${key}="${escapeAngularAttr(value)}"`);
  }

  // IR-DOM-BINDING-CAPABILITY-01: event bindings lower to Angular's
  // `(eventname)="..."` syntax. Distinct from attribute bindings because
  // Angular's template parser rejects `onClick` / `[onClick]` as event-
  // property attributes (security disallow). For `prop:X` events emit
  // `(click)="X && X()"` so the no-op case is silent; for `channel:X`
  // events the existing channel-onChange path in renderAngularBinding
  // produces `(click)="behavior.X()"`. Legacy `bindings.onX` is filtered
  // below to avoid double-emit.
  for (const [eventName, expr] of Object.entries(node.events)) {
    const activation = eventName === "click" ? node.activation : undefined;
    const disclosure = activation?.channel;
    if (disclosure) {
      const next = activation!.operation === "toggle" ? `!behavior.${disclosure.name}()` : String(activation!.operation === "open");
      attrs.push(`(click)="canActivateInteraction($event, ${activation!.cancelNativeDefault}) && behavior.set${capitalizeAngular(disclosure.name)}(${next})"`);
      continue;
    }
    const rendered = renderAngularEvent(eventName, expr, ctx, node.tag);
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: bind the realized keyboard actions onto
  // the declared `when` part's node. The handler ident is part-derived and
  // the co-located hook emits its implementation from the same IR facts.
  // Angular event bindings pass the event explicitly as `$event`. The
  // composite item part's handler receives the item value exactly as the
  // item's click activation passes it, so pointer and keyboard commits stay
  // semantically identical.
  const isCompositeItem = ctx.compositeItemPart !== undefined && node.part === ctx.compositeItemPart;
  if (node.keyboardActions && node.keyboardActions.length > 0 && node.part) {
    const handlerIdent = `behavior.handle${capitalizeAngular(node.part)}Keydown`;
    if (isCompositeItem && ctx.compositeMemberExpr) {
      const memberExpr = renderAngularBindingValue(ctx.compositeMemberExpr, ctx);
      if (memberExpr !== null) {
        attrs.push(`(keydown)="${handlerIdent}($event, ${memberExpr})"`);
      }
    } else {
      attrs.push(`(keydown)="${handlerIdent}($event)"`);
    }
    // A keyboard host that is not natively focusable must become
    // programmatically focusable so the delegated keys can fire and the
    // vue a11y lint holds; -1 keeps it out of tab order.
    if (isCompositeItem || !NATIVE_FOCUSABLE_TAGS.has(node.tag)) {
      attrs.push(`tabindex="-1"`);
    }
  } else if (isCompositeItem) {
    // Composite roving item without its own keydown: still a roving focus
    // target — focusable for the roving focus path but out of tab order
    // (APG roving tabindex with DOM focus tracking).
    attrs.push(`tabindex="-1"`);
  }

  // componentRef: look up each binding's IR classification (prop vs host attr)
  // so the emitter picks syntax without guessing (normal-form property 4).
  const refBindingByAttr = new Map(
    (node.componentInstance?.bindings ?? []).map((b) => [b.sourceAttr, b]),
  );
  for (const [key, expr] of Object.entries(node.bindings)) {
    // Dual-pathway dedup: parseDomNode mirrored `bindings.onX` to
    // `events.<x>` for back-compat. The canonical events loop above
    // already emitted the handler — skip the legacy attribute pass.
    if (/^on[A-Z]/.test(key)) {
      const evt = key.slice(2).toLowerCase();
      if (node.events[evt]) continue;
    }
    const rendered = renderAngularBinding(
      key,
      expr,
      ctx,
      node.tag,
      refBindingByAttr.get(key),
    );
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // IR-DOM-CSS-VAR-BINDING-01: lower `cssVarBindings` to Angular's
  // `[style.--fsds-foo]="expr"` per-property binding (one attr per
  // CSS variable). Angular 9+ accepts arbitrary CSS custom-property
  // names through the `[style.<name>]` syntax. A literal `style` attr
  // coexisting with cssVarBindings is rejected by the IR builder, so
  // we don't need to compose with an existing `style` declaration.
  for (const { varName, value } of node.cssVarBindings) {
    const valueExpr = renderAngularBindingValue(value, ctx);
    if (valueExpr === null) continue;
    attrs.push(`[style.${varName}]="${valueExpr}"`);
  }

  // DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01: propertyBindings
  // are DOM-property-only facts (e.g. `indeterminate`) with no HTML
  // attribute form. Angular's bare `[key]="expr"` syntax already binds a
  // DOM property directly (not via setAttribute) — the same mechanism
  // already used for `[checked]`/`[disabled]`/`[value]` above via
  // `angularAttrBinding`'s default branch. No ElementRef/effect() escape
  // hatch is needed: reusing `renderAngularBinding` guarantees these keys
  // never take the `[attr.x]` branch (they aren't `data-`/`aria-` prefixed
  // and won't appear in ANGULAR_ATTR_BINDING_OVERRIDES_BY_TAG), so the
  // property (not attribute) form is what gets emitted.
  for (const [key, expr] of Object.entries(node.propertyBindings)) {
    const rendered = renderAngularBinding(key, expr, ctx, node.tag);
    if (rendered === null) continue;
    attrs.push(rendered);
  }

  // FEAT-A11Y-LABEL-ID-ASSOCIATION-01: generated per-instance id on
  // relationship targets, and the lowered idref attributes on sources.
  // Angular cannot statically test projected-content presence, so
  // `slotGate` is not lowered here (documented divergence on IdRefIR).
  if (node.generatedIdSlug !== undefined) {
    attrs.push(`[attr.id]="instanceId + '-${node.generatedIdSlug}'"`);
  }
  for (const refAttr of node.idRefAttrs) {
    const getter = ctx.idRefGetters?.get(node)?.get(refAttr.attribute);
    if (getter) {
      attrs.push(`[attr.${refAttr.attribute}]="${getter}"`);
    } else {
      attrs.push(
        `[attr.${refAttr.attribute}]="instanceId + '-${refAttr.refs[0].slug}'"`,
      );
    }
  }

  if (
    ctx.fieldAssociationConsumerPart &&
    ctx.fieldAssociationConsumerPart === node.part
  ) {
    attrs.push(`[attr.id]="fieldAssociation?.current?.controlId"`);
    attrs.push(
      `[attr.aria-describedby]="fieldAssociation?.current?.describedBy"`,
    );
  }

  if (ctx.isRoot) {
    attrs.push(`data-fsds-box=""`);
    attrs.unshift(`[ngClass]="classes()"`);
    if (ctx.rootRole && !("role" in node.attrs) && !("role" in node.bindings)) {
      attrs.push(`role="${ctx.rootRole}"`);
    }
    if (ctx.sequence) attrs.push(`#sequenceRoot`);
    if (ctx.autoDismissPause) {
      attrs.push(
        `(pointerenter)="autoDismiss.pauseListeners.pointerenter()"`,
        `(pointerleave)="autoDismiss.pauseListeners.pointerleave()"`,
        `(focusin)="autoDismiss.pauseListeners.focusin()"`,
        `(focusout)="autoDismiss.pauseListeners.focusout($event)"`,
      );
    }
    // Selector-anchored root: fixed-position style computed against the
    // active step's page anchor, hidden until the first measurement so the
    // panel never flashes at (0,0).
    if (ctx.rootSelectorAnchored) {
      attrs.push(`[attr.data-placement]="_position.state().placement"`);
      attrs.push(`[style.position]="'fixed'"`);
      attrs.push(`[style.top.px]="_position.state().top"`);
      attrs.push(`[style.left.px]="_position.state().left"`);
      attrs.push(
        `[style.visibility]="_position.state().ready ? 'visible' : 'hidden'"`,
      );
    }
  } else if (
    ctx.overlayClickSetter &&
    ctx.overlayClickTargetPart !== undefined &&
    node.part === ctx.overlayClickTargetPart
  ) {
    // The overlay child node owns the dismissal click and the
    // `role="presentation"` hook the generated test queries by. Putting the
    // handler here (instead of on the root) means inner content clicks
    // don't bubble through a target===currentTarget guard, which never
    // matches when the test clicks the overlay child directly.
    // FIX-OVERLAY-CLICK-DISMISSAL-BINDING-01: the part is the contract's
    // declared dismissal `targetPart` (an IR fact), not a hardcoded
    // overlay/backdrop name guess.
    const guardExpr = ctx.overlayClickEnabledProp
      ? `${ctx.overlayClickEnabledProp} !== false && behavior.${ctx.overlayClickSetter}(false)`
      : `behavior.${ctx.overlayClickSetter}(false)`;
    attrs.push(`role="presentation"`);
    attrs.push(`(click)="${guardExpr}"`);
    if (classParts.length > 0) {
      if (classParts.length === 1) {
        attrs.unshift(`[ngClass]="${classParts[0]}"`);
      } else {
        attrs.unshift(`[ngClass]="[${classParts.join(", ")}]"`);
      }
    }
  } else if (classParts.length > 0) {
    if (classParts.length === 1) {
      attrs.unshift(`[ngClass]="${classParts[0]}"`);
    } else {
      attrs.unshift(`[ngClass]="[${classParts.join(", ")}]"`);
    }
  }

  // `if: "slot:<name>"` (node.ifSlot) renders unconditionally: which named
  // projections are filled is not statically knowable in Angular (same
  // divergence as IdRefIR.slotGate). An unfilled slot leaves the wrapper empty.
  let ifWrap = "";
  if (node.ifProp) {
    // Angular's *ngIf belongs to the structural directive system. Wrap the
    // element in <ng-container *ngIf="..."> to avoid placing *ngIf on the
    // root element which complicates class binding.
    ifWrap = node.ifProp; // handled below
  }

  const childCtx: AngularRenderContext = { ...ctx, isRoot: false, preformatted: compact };
  const renderedChildren = node.children.map((c) =>
    renderAngularDomNode(c, childCtx, childIndent),
  );

  // IR-DOM-BINDING-CAPABILITY-01: content binding lowers to Angular's
  // `{{ expr }}` interpolation as the element's text content. Mutually
  // exclusive with children — parseDomNode rejects the combination.
  //
  // FEAT-CODEBLOCK-HIGHLIGHT-01: a content transform instead renders one
  // `<span>` per token via `*ngFor` over the class getter wrapping the
  // shared tokenizer — the token part's class plus a `data-token` kind
  // attribute, with `{{ token.text }}` interpolation (text-only children,
  // so the source is never interpreted as markup). A declared gate
  // degrades to a single plain interpolation of the source binding.
  const contentLines: string[] = [];
  if (node.content) {
    if (isHighlightTransform(node.content)) {
      const transform = node.content;
      const sp = " ".repeat(childIndent);
      const tokenGetter = ctx.contentTransformGetters?.get(node);
      if (!tokenGetter) {
        throw new Error(
          `renderAngularDomNode: no content-transform getter registered for ` +
            `node (tag="${node.tag}", part="${node.part ?? "?"}")`,
        );
      }
      if (transform.linePart && transform.gutterPart) {
        contentLines.push(
          `${sp}<fsds-${ctx.classRecipe}-line *ngFor="let line of ${tokenGetter}.lines" [number]="line.number" [ending]="line.ending">` +
          `<ng-container *ngFor="let token of line.tokens">` +
          `<fsds-${ctx.classRecipe}-token *ngIf="line.highlighted" [kind]="token.kind">{{ token.text }}</fsds-${ctx.classRecipe}-token>` +
          `<ng-container *ngIf="!line.highlighted">{{ token.text }}</ng-container>` +
          `</ng-container></fsds-${ctx.classRecipe}-line>`,
        );
      } else {
        contentLines.push(`${sp}<span *ngFor="let line of ${tokenGetter}.lines">{{ line.tokens.map((token) => token.text).join('') + line.ending }}</span>`);
      }
    } else if (isMarkdownTransform(node.content)) {
      // FEAT-MARKDOWN-CONTENT-TRANSFORM-01: the content iterates the class
      // getter's structural parse through the companion block renderer; a
      // declared gate falls back to the plain interpolation.
      const transform = node.content;
      const sp = " ".repeat(childIndent);
      const blocks =
        `<fsds-markdown-block *ngFor="let block of markdownBlocks" [block]="block"></fsds-markdown-block>`;
      if (transform.gate !== undefined) {
        const gateExpr = defaultAwareAngularTemplatePropAccessor(
          transform.gateProp ?? transform.gate.prop,
          ctx.styledByName,
        );
        const sourceExpr = appendPath(
          defaultAwareAngularTemplatePropAccessor(
            transform.sourceProp,
            ctx.styledByName,
          ),
          transform.source.path,
        );
        contentLines.push(
          `${sp}<ng-container *ngIf="${gateExpr}">${blocks}</ng-container>`,
          `${sp}<ng-container *ngIf="!(${gateExpr})">{{ ${sourceExpr} }}</ng-container>`,
        );
      } else {
        contentLines.push(`${sp}${blocks}`);
      }
    } else {
      const contentExpr = renderAngularBindingValue(
        contentBindingOrTransformSource(node.content)!,
        ctx,
      );
      if (contentExpr !== null) {
        contentLines.push(`${" ".repeat(childIndent)}{{ ${contentExpr} }}`);
      }
    }
  }

  // ICON-CATALOG-RUNTIME-DELIVERY-01: a glyph node's svg surface comes
  // from the resolved catalog record — data-fsds-icon + viewBox +
  // width/height attrs here, one <path> per glyph path record as the
  // only content (the svg has no IR children — enforced upstream). The
  // `*ngIf="... as glyph" ` guard (applied below, once `body` is built)
  // aliases the getter so attrs and the *ngFor loop read the narrowed
  // non-undefined local rather than re-invoking the getter (and
  // re-risking a TS-narrowing mismatch across separate reads).
  const iconGlyphEntry = ctx.iconGlyphIdents?.get(node);
  const iconGlyphChildLines: string[] = [];
  if (iconGlyphEntry) {
    const { pxGetter } = iconGlyphEntry;
    attrs.push(`[attr.data-fsds-icon]="glyph.name"`);
    attrs.push(`[attr.viewBox]="glyph.viewBox"`);
    const sizeExpr = pxGetter
      ? `(this.${pxGetter} ?? glyph.size)`
      : `glyph.size`;
    attrs.push(`[attr.width]="${sizeExpr}"`);
    attrs.push(`[attr.height]="${sizeExpr}"`);
    const childPad = " ".repeat(childIndent);
    const pathAttrs = ICON_GLYPH_PATH_ATTRS.map(
      ({ recordKey, svgAttr }) => `[attr.${svgAttr}]="glyphPath.${recordKey}"`,
    ).join(" ");
    iconGlyphChildLines.push(
      `${childPad}<ng-container *ngFor="let glyphPath of glyph.paths">`,
      `${compact ? "" : `${childPad}  `}<path ${pathAttrs} />`,
      `${childPad}</ng-container>`,
    );
  }

  const allChildren = [
    ...contentLines,
    ...renderedChildren,
    ...iconGlyphChildLines,
  ];

  // componentRef: render the referenced component by its selector
  // (`fsds-<kebab>`, matching how that component declares its own selector).
  // The class is imported and added to the standalone `imports: []` array by
  // the dom-tree generator; bindings reach the component's @Input via the
  // `[prop]=` property form, driven by the IR's ComponentInstanceIR
  // classification (see angularAttrBinding's refBinding path).
  const tag = node.componentRef
    ? `fsds-${toKebab(node.componentRef)}`
    : node.tag;

  const renderElementBody = (tagName: string, extraAttrs: string[] = [], childLines = allChildren): string => {
    const branchAttrs = [...attrs, ...extraAttrs];
    const branchSelfCloses = VOID_HTML_ELEMENTS_ANGULAR.has(tagName);
    if (childLines.length === 0 && branchSelfCloses) {
      return `${pad}<${tagName}${formatAngularAttrs(branchAttrs)} />`;
    }
    if (childLines.length === 0) {
      return `${pad}<${tagName}${formatAngularAttrs(branchAttrs)}></${tagName}>`;
    }
    return [
      `${pad}<${tagName}${formatAngularAttrs(branchAttrs)}>`,
      ...childLines,
      `${pad}</${tagName}>`,
    ].join(separator);
  };

  let body: string;
  if (ctx.isRoot && ctx.rootPolymorphicTag && !node.componentRef) {
    const switchExpr = safePropertyExpr(ctx.rootPolymorphicTag.propName);
    // Angular assigns projected nodes to a single ng-content outlet. Repeating
    // it in switch branches strands the content in the last projection slot.
    // Declare the body once and instantiate it in the selected host instead.
    const projectedBody = allChildren.length > 0;
    const sharedContent = projectedBody
      ? [`${pad}<ng-template #fsdsPolymorphicBody>`, ...allChildren, `${pad}</ng-template>`]
      : [];
    const branchContent = projectedBody
      ? [`${pad}  <ng-container [ngTemplateOutlet]="fsdsPolymorphicBody" />`]
      : allChildren;
    body = [
      ...sharedContent,
      `${pad}<ng-container [ngSwitch]="${switchExpr} || '${ctx.rootPolymorphicTag.defaultTag}'">`,
      ...ctx.rootPolymorphicTag.allowedTags.map((tagName) =>
        renderElementBody(tagName, [`*ngSwitchCase="'${tagName}'"`], branchContent).replace(/^/gm, "  "),
      ),
      `${pad}</ng-container>`,
    ].join(separator);
  } else {
    body = renderElementBody(tag);
  }

  let withIfGuard = body;
  if (ifWrap) {
    if (ifWrap === "children") {
      // Guard the label wrapper on content-projection presence, mirroring
      // Vue's `v-if="$slots.default"` and Svelte's `{#if children}`.
      // Angular doesn't expose a synchronous "was anything projected?" API
      // without querying the DOM. We emit `*ngIf="hasContent"` and let the
      // class body generator inject `hasContent` + an `ngAfterContentInit` hook
      // that reads the host element's text/child nodes to determine presence.
      withIfGuard = [
        `${pad}<ng-container *ngIf="${node.ifNegated ? "!" : ""}hasContent">`,
        (compact ? body : body.replace(/^/gm, "  ")),
        `${pad}</ng-container>`,
      ].join(separator);
    } else {
      const matchingChannel = [...ctx.channelByName.values()].find(
        (c) => c.valueProp === ifWrap || c.name === ifWrap,
      );
      const expr = matchingChannel
        ? `behavior.${matchingChannel.name}()`
        : ifWrap;
      const condition = node.ifNegated ? `!${expr}` : expr;
      withIfGuard = [
        `${pad}<ng-container *ngIf="${condition}">`,
        (compact ? body : body.replace(/^/gm, "  ")),
        `${pad}</ng-container>`,
      ].join(separator);
    }
  }

  // iconGlyph null-guard: an unknown icon name resolves the getter to
  // undefined and the svg (whose attrs/paths dereference the aliased
  // `glyph` local) must not render at all. `*ngIf="getter as glyph"`
  // both narrows and aliases in one directive — Angular's idiom for
  // "guard on a value, then reuse it without re-invoking the getter".
  if (iconGlyphEntry) {
    withIfGuard = [
      `${pad}<ng-container *ngIf="${iconGlyphEntry.glyphGetter} as glyph">`,
      (compact ? withIfGuard : withIfGuard.replace(/^/gm, "  ")),
      `${pad}</ng-container>`,
    ].join(separator);
  }

  // IR-DOM-ITERATE-CAPABILITY-01: apply the *ngFor wrap as the outermost
  // layer using <ng-container *ngFor>. Doctrine: iteration outside,
  // if-guard inside — each iteration re-evaluates *ngIf against the
  // per-iteration scope. Angular's microsyntax for *ngFor:
  //   *ngFor="let item of items; let index = index"
  //     - left `index` is the local alias bound from the right side's
  //       built-in `index` template-variable name (which Angular
  //       exposes as the 0-based iteration index).
  //   *ngFor="let _ of arrayN; let index = index"
  //     - for count iteration we need an array-of-length-N as the
  //       source. We emit it inline via the class field `_${sourceProp}Range`
  //       to avoid `new Array(n)` expressions in templates (Angular's
  //       template parser rejects `new` and most JS-side constructions).
  //     - Simpler: bind it as `arrayFromCount(${sourceProp})` where
  //       `arrayFromCount` is a class-body helper injected when at
  //       least one count iteration is present.
  //
  // To keep this commit a pure no-op for existing components, the
  // count-iteration helper is only injected when the dom tree
  // actually has a count iteration somewhere. The helper detection
  // lives in generateRootComponent / generateClassBody; this emitter
  // produces the bare call.
  if (node.iteration) {
    const { kind, source, indexVar, itemVar } = node.iteration;
    // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: route iteration source
    // through the binding-value renderer. Angular templates accept bare
    // identifiers, but `safePropertyExpr` prefixes Angular-reserved
    // names with `this.`, and channel-driven sources resolve to
    // `behavior.X()` rather than the raw `@Input X`. Going through the
    // value renderer keeps the dispatch source-uniform.
    const sourceExpr = renderAngularBindingValue(source, ctx);
    if (sourceExpr === null) {
      throw new Error(
        `Angular emitter: iteration source could not be lowered (source kind=${source.kind})`,
      );
    }
    // FIX-COUNT-ITERATION-DEFAULT-THREADING-01 / FIX-UNDEFINED-PROP-
    // ACCESSOR-DEFAULTING-01: an array- or count-kind iteration source
    // that is a bare prop binding must fall back to the prop's CONTRACT
    // default when the input resolves to `undefined` at runtime (parity
    // with react's parameter default / vue's withDefaults / svelte's
    // `export let`). Originally this call site applied its own `??
    // default` on top of a bare `sourceExpr`; now that
    // `angularPropAccessor` (reached via `renderAngularBindingValue`) is
    // itself default-aware, `sourceExpr` already carries `(x ??
    // contractDefault)` for any prop with a declared default — stacking
    // a second `?? []` here is redundant at best (the lit sibling of
    // this fix caught the array-kind case as a `tsc` TS2869 unreachable-
    // branch error for Select.options/Walkthrough.steps; Angular's
    // inline template isn't type-checked the same way, but the
    // redundant fallback is the same defect). `arrayFromCount` itself
    // stays a plain shared helper (undefined -> 0) because it's memoized
    // across every count-iteration call site in the component and must
    // not hardcode one specific prop's default. Bare-prop sources with
    // NO contract default fall through to the unwrapped/helper
    // undefined->0 behavior — `sourceExpr` itself already reflects that
    // (accessor only wraps props that declare a default).
    const sourceHasAccessorDefault =
      source.kind === "prop" &&
      ctx.styledByName.get(source.prop)?.defaultExpr !== undefined;
    const ngForExpr =
      kind === "array"
        ? `let ${itemVar} of (${sourceHasAccessorDefault ? sourceExpr : `${sourceExpr} ?? []`}); let ${indexVar} = index`
        : `let _ of arrayFromCount(${sourceExpr}); let ${indexVar} = index`;
    return [
      `${pad}<ng-container *ngFor="${ngForExpr}">`,
      (compact ? withIfGuard : withIfGuard.replace(/^/gm, "  ")),
      `${pad}</ng-container>`,
    ].join(separator);
  }
  return withIfGuard;
}

// Angular's `[prop]="expr"` binds a DOM *property* — fine for things like
// `[disabled]`, `[hidden]`, etc., but invalid for arbitrary attributes like
// `data-*` and `aria-*`. Those need the `[attr.name]="expr"` form, which
// binds an HTML attribute. Additionally, `as` is reserved in Angular
// templates (microsyntax for *ngFor), so any expression that evaluates to a
// bare `as` parses as a keyword — using `[attr.X]` form sidesteps that.
//
// Some bindings name a real HTML attribute but are NOT a writable IDL
// property on the chosen element. Example: `<label form="...">` — the
// HTML spec gives `HTMLLabelElement.form` as read-only (it reflects the
// containing form), so Angular's `[form]` property binding fails ngc
// strictTemplates (NG8002). The contract intent is to set the HTML
// attribute, not the IDL property, so we coerce to `[attr.X]` here.
//
// Source of truth: HTMLLabelElement.form is read-only per HTML spec
// (https://html.spec.whatwg.org/#htmllabelelement). Maintained as a
// per-tag attribute set; entries here are derived from real DOM-IDL
// facts, not from "tests are failing".
const ANGULAR_ATTR_BINDING_OVERRIDES_BY_TAG: Record<string, ReadonlySet<string>> = {
  label: new Set(["form"]),
  // HTMLImageElement's unsigned-long setters turn undefined into zero.
  // Attribute binding removes an unset dimension so intrinsic sizing survives.
  // https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-width
  img: new Set(["width", "height"]),
  svg: new Set(["height", "width"]),
  time: new Set(["datetime"]),
};

function angularAttrBinding(
  attr: string,
  tag?: string,
  refBinding?: { kind: "prop" | "attribute"; targetProp?: string },
): string {
  // componentRef: the IR already CLASSIFIED this binding against the target's
  // prop surface (ComponentInstanceIR). kind:"prop" → `[targetProp]=` property
  // binding (reaches the @Input); kind:"attribute" → `[attr.X]=` host attribute
  // passthrough. The emitter never guesses prop-vs-attribute (normal-form
  // property 4) — it reads the resolved fact.
  if (refBinding) {
    return refBinding.kind === "prop"
      ? `[${refBinding.targetProp}]`
      : `[attr.${attr}]`;
  }
  if (attr === "role" || attr.startsWith("data-") || attr.startsWith("aria-")) {
    return `[attr.${attr}]`;
  }
  if (tag && ANGULAR_ATTR_BINDING_OVERRIDES_BY_TAG[tag]?.has(attr)) {
    return `[attr.${attr}]`;
  }
  return `[${attr}]`;
}

// Angular templates reserve certain identifiers as microsyntax keywords:
// `as` (used by *ngIf/*ngFor for aliasing), `let`, `of`, etc. Any prop
// whose name matches one of those parses as a keyword when emitted as a
// bare expression. Prefixing with `this.` disambiguates without changing
// semantics — Angular accepts both `foo` and `this.foo` for component
// properties.
const ANGULAR_TEMPLATE_KEYWORDS = new Set([
  "as",
  "let",
  "of",
  "in",
  "trackBy",
  "true",
  "false",
  "null",
  "undefined",
]);

function safePropertyExpr(prop: string): string {
  return ANGULAR_TEMPLATE_KEYWORDS.has(prop) ? `this.${prop}` : prop;
}

/**
 * Lower a `prop:X` reference to an Angular template expression. When `X`
 * is an in-scope iteration alias (item/index introduced by an enclosing
 * `*ngFor`), emit the bare identifier — Angular's *ngFor introduces
 * those names as template locals distinct from component-class fields.
 * The class-field path is via `safePropertyExpr`, which prefixes
 * Angular-reserved names with `this.`; iteration aliases must NOT take
 * that path (a future contract that picks `let` or `of` as an alias
 * name is the author's bug, but our codegen shouldn't silently emit
 * `this.let` for a template local). IR-DOM-ITERATE-CAPABILITY-01.
 */
/**
 * FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: mirrors the lit emitter's
 * `litPropAccessor` defaulting. Angular `@Input() x?: T = default`
 * applies the class-field default once at construction; a later explicit
 * `undefined` assignment does not re-run it, so a bare `this.x` read
 * downstream can observe `undefined` even though the contract declares a
 * default — unlike react (parameter default), vue (`withDefaults`), and
 * svelte (`export let`), whose defaulting is parameter-evaluation, not
 * one-shot field initialization. When the resolved prop carries a
 * contract `defaultExpr`, wrap the read as `(x ?? default)` so every
 * downstream consumer — conditional/predicate bindings, class modifiers,
 * future binding kinds — inherits parity from the accessor primitive.
 * Props with no contract default keep the bare read.
 */
function angularPropAccessor(propName: string, ctx: AngularRenderContext): string {
  // Post-V2 (BINDING-EXPRESSION-V2-01): iteration locals reach the
  // emitter as `iterationLocal`-kind bindings and never as `prop:`
  // bindings; the legacy `iterationScope.has(propName)` shortcut is
  // intentionally removed.
  return defaultAwareAngularTemplatePropAccessor(propName, ctx.styledByName);
}

/**
 * Shared default-wrapping logic behind `angularPropAccessor`, for
 * ANGULAR TEMPLATE expressions (inline `template:` strings), where bare
 * identifiers resolve implicitly against the component instance —
 * `safePropertyExpr` only prefixes `this.` for template-keyword
 * collisions (`as`, `let`, …). Factored out so the handful of
 * template-producing call sites that only have `ir.styledProps` in scope
 * (running before an `AngularRenderContext` exists) can apply the
 * identical defaulting rule without threading a full render context
 * through generation functions that don't otherwise need one.
 *
 * NOT for TypeScript class-body code (`computed(() => …)`, `classes()`
 * methods) — those need `defaultAwareAngularClassPropAccessor` below,
 * which always emits `this.` because bare identifiers don't resolve to
 * instance fields outside a template.
 */
function defaultAwareAngularTemplatePropAccessor(
  propName: string,
  styledByName: ReadonlyMap<string, { type: string; defaultExpr?: string }>,
): string {
  const bare = safePropertyExpr(propName);
  const defaultExpr = styledByName.get(propName)?.defaultExpr;
  return defaultExpr === undefined
    ? bare
    : `(${bare} ?? ${angularTemplateSafeDefaultExpr(defaultExpr)})`;
}

/**
 * `ResolvedPropIR.defaultExpr` is a TypeScript-source literal (ir.ts
 * `defaultExpr()`): double-quoted for string props (`"Dismiss"`) or
 * JSON.stringify'd for array props (`[{"value":"alpha",...}]`, whose keys
 * and string values are also double-quoted). Every Angular `[attr]="..."`
 * template binding this accessor feeds into is itself `"`-delimited at
 * the HTML-tokenizer level — splicing a double-quoted literal in
 * verbatim prematurely closes that attribute (confirmed via a runtime
 * probe: OTP's `[attr.aria-label]="(label ?? "One-time password")"`
 * broke the Angular JIT compiler with "Opening tag not terminated").
 * This is the exact defect class `renderAngularBindingValue`'s `literal`
 * case already works around (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-
 * INDETERMINATE-01) — swap every `"` for `'`. JSON strings never contain
 * a raw (unescaped) `"` internally, so this is a safe 1:1 substitution
 * for the string/array shapes `defaultExpr` can take; boolean/number
 * defaultExprs contain no quotes and pass through unchanged. Known limit
 * (shared with the `literal` case): a default value containing an
 * apostrophe would still break — no corpus default does today.
 */
function angularTemplateSafeDefaultExpr(defaultExpr: string): string {
  return defaultExpr.includes('"') ? defaultExpr.replace(/"/g, "'") : defaultExpr;
}

/**
 * FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: default-aware prop accessor
 * for TypeScript CLASS-BODY code (the `classes()` / `computed(() => …)`
 * class-modifier generators), where a bare identifier does NOT resolve
 * to the instance field — `this.` is required. Distinct from
 * `defaultAwareAngularTemplatePropAccessor`, which is for inline
 * Angular template strings where `this.` is implicit and only added for
 * keyword collisions.
 */
function defaultAwareAngularClassPropAccessor(
  propName: string,
  styledByName: ReadonlyMap<string, { type: string; defaultExpr?: string }>,
): string {
  const bare = `this.${propName}`;
  const defaultExpr = styledByName.get(propName)?.defaultExpr;
  return defaultExpr === undefined ? bare : `(${bare} ?? ${defaultExpr})`;
}

/**
 * Append a dotted property path to a base Angular template expression.
 * BINDING-EXPRESSION-V2-PATH-01.
 */
function appendPath(base: string, path: readonly string[] | undefined): string {
  if (!path || path.length === 0) return base;
  return `${base}.${path.join(".")}`;
}

/**
 * Resolve an `iterationLocal`-kind binding to the Angular `*ngFor`
 * template-local name. The Angular emit shape is
 * `*ngFor="let item of items; let index = index"` — the bare
 * identifier matches the iteration's declared `itemVar` / `indexVar`.
 */
function angularIterationLocalName(
  local: "index" | "item",
  ctx: AngularRenderContext,
): string | null {
  const it = ctx.enclosingIteration;
  if (!it) return null;
  if (local === "index") return it.indexVar;
  return it.itemVar ?? null;
}

const ANGULAR_FORM_HOSTS = new Set(["input", "textarea", "select"]);

/** Channels whose onChange is bound on a form host somewhere in the dom tree. */
function channelsNeedingInputHandlers(ir: ComponentIR): Set<string> {
  const out = new Set<string>();
  const visit = (node: DomNodeIR | undefined): void => {
    if (!node) return;
    const isFormHost = ANGULAR_FORM_HOSTS.has(node.tag);
    const collect = (expr: BindingExpression): void => {
      if (expr.kind === "channel" && isFormHost) out.add(expr.channel);
    };
    for (const expr of Object.values(node.events)) collect(expr);
    for (const [name, expr] of Object.entries(node.bindings)) {
      if (name.startsWith("on")) collect(expr);
    }
    for (const child of node.children) visit(child);
  };
  visit(ir.dom);
  return out;
}

/**
 * Host-aware channel event lowering (FIX-CHANNEL-EVENT-LOWERING-001):
 * reading element state (.checked/.value) is only valid on form hosts.
 * A channel click on a button/div host toggles the boolean channel,
 * matching react/vue/svelte/react-native.
 */
function angularChannelEventBinding(
  eventName: string,
  ch: NormalizedChannelIR,
  tag: string | undefined,
): string {
  if (ch.callbackKind === "event") {
    return `(${eventName})="${ch.changeHandlerProp}?.($event)"`;
  }
  if (!ANGULAR_FORM_HOSTS.has(tag ?? "") && ch.valueType === "boolean") {
    const setter = `set${capitalizeAngular(ch.name)}`;
    return `(${eventName})="behavior.${setter}(!behavior.${ch.name}())"`;
  }
  const handlerName = `handle${capitalizeAngular(ch.name)}Change`;
  return `(${eventName})="${handlerName}($event)"`;
}

function renderAngularBinding(
  attr: string,
  expr: BindingExpression,
  ctx: AngularRenderContext,
  tag?: string,
  refBinding?: { kind: "prop" | "attribute"; targetProp?: string },
): string | null {
  switch (expr.kind) {
    case "prop":
      return `${angularAttrBinding(attr, tag, refBinding)}="${appendPath(angularPropAccessor(expr.prop, ctx), expr.path)}"`;
    case "literal":
      return `${attr}="${escapeAngularAttr(expr.value)}"`;
    case "iterationLocal": {
      const name = angularIterationLocalName(expr.local, ctx);
      return name ? `${angularAttrBinding(attr, tag, refBinding)}="${appendPath(name, expr.path)}"` : null;
    }
    case "projection": {
      const lowered = renderAngularBindingValue(expr, ctx);
      return lowered === null
        ? null
        : `${angularAttrBinding(attr, tag, refBinding)}="${lowered}"`;
    }
    case "valueMap": {
      const lowered = renderAngularBindingValue(expr, ctx);
      return lowered === null
        ? null
        : `${angularAttrBinding(attr, tag, refBinding)}="${lowered}"`;
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") {
        return `${angularAttrBinding(attr, tag, refBinding)}="${appendPath(`behavior.${ch.name}()`, expr.path)}"`;
      }
      if (expr.field === "defaultValue") {
        if (!ch.defaultValueProp) return null;
        return `${angularAttrBinding(attr, tag, refBinding)}="${safePropertyExpr(ch.defaultValueProp)}"`;
      }
      // onChange synthesis — bind to a method on the component.
      // Event-shaped channels pass the raw event to the consumer's
      // @Input handler; consumer drives state externally.
      const eventName = mapJsxEventToAngular(attr);
      return angularChannelEventBinding(eventName, ch, tag);
    }
    case "channelCall": {
      // FEAT-BINDING-CALL-WITH-ARG-01: invoke the channel's setter WITH the
      // per-item payload. Emits `(click)="behavior.setSelection(item.value)"`.
      // The `(event)="..."` value is a "-delimited Angular template; the arg
      // is rendered via renderAngularBindingValue, which single-quotes string
      // literals (the aria-checked quote-collision precedent) so an embedded
      // literal never prematurely closes the attribute.
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      const eventName = mapJsxEventToAngular(attr);
      const setter = `set${capitalizeAngular(ch.name)}`;
      const argExpr = renderAngularBindingValue(expr.arg, ctx);
      if (argExpr === null) return null;
      return `(${eventName})="behavior.${setter}(${argExpr})"`;
    }
    case "channelUpdate": {
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: Angular template expressions
      // forbid arrow functions, spread, and array-method callbacks, so the
      // composed update cannot be inlined the way React/Vue/Svelte/Lit do it.
      // Instead the wire calls a synthesized component method (see
      // `emitChannelUpdateMethods`) that computes the next value and passes
      // it through the canonical `this.behavior.set<Channel>` setter. The
      // operands are rendered as template expressions here (so iteration
      // locals resolve to the `*ngFor` alias) and passed into the method;
      // `setCharAt` additionally forwards `$event` for the native payload.
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      const eventName = mapJsxEventToAngular(attr);
      const method = channelUpdateMethodName(expr.op, ch.name);
      const operandExprs = expr.operands.map((o) => renderAngularBindingValue(o, ctx));
      if (operandExprs.some((o) => o === null)) return null;
      const args =
        expr.op === "setCharAt"
          ? ["$event", ...(operandExprs as string[])]
          : (operandExprs as string[]);
      return `(${eventName})="${method}(${args.join(", ")})"`;
    }
    case "predicate": {
      // BINDING-EXPRESSION-V2-PREDICATE-01. `lowered` is already a valid
      // Angular template-expression string (comparison operators, prop
      // accessors, JSON.stringify'd literals with real embedded quotes) —
      // NOT HTML text. escapeAngularAttr would corrupt embedded `"` (e.g.
      // from a literal operand) into `&quot;`, which Angular's expression
      // parser reads as literal entity characters, not a quote — breaking
      // the expression (confirmed via runtime probe: aria-checked read
      // "false" for a checked, non-indeterminate Checkbox instead of
      // "true"). The outer `[attr]="..."` delimiter is parsed by
      // Angular's own template compiler, same as the unescaped channel/
      // prop branches above (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-
      // INDETERMINATE-01 found this via Checkbox's aria-checked, the
      // first conditional binding with a literal string operand used in
      // attribute position).
      const lowered = renderAngularPredicate(expr, ctx);
      return lowered === null
        ? null
        : `${angularAttrBinding(attr, tag)}="${lowered}"`;
    }
    case "conditional": {
      const lowered = renderAngularBindingValue(expr, ctx);
      return lowered === null
        ? null
        : `${angularAttrBinding(attr, tag)}="${lowered}"`;
    }
  }
}

/**
 * Lower a content binding to the bare Angular template expression that
 * goes inside `{{ ... }}`. Mirrors the prop/channel/literal switch in
 * renderAngularBinding but without the attribute scaffolding.
 */
function renderAngularBindingValue(
  expr: BindingExpression,
  ctx: AngularRenderContext,
): string | null {
  switch (expr.kind) {
    case "prop":
      return appendPath(angularPropAccessor(expr.prop, ctx), expr.path);
    case "literal":
      // Single-quoted, not JSON.stringify's double-quoted form: this
      // result gets spliced into `[attr]="..."` (conditional/predicate/
      // style callers), a "-delimited Angular template attribute. A
      // double-quoted literal would prematurely close that attribute for
      // Angular's template lexer, which reads attribute values with an
      // HTML-attribute tokenizer BEFORE parsing the expression inside —
      // confirmed via a runtime probe on Checkbox's aria-checked
      // conditional (the first literal-string operand used in attribute
      // position): the "false"-branch silently evaluated wrong because
      // `&quot;` inside the parsed expression is literal entity text, not
      // a quote character (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-
      // INDETERMINATE-01). Single quotes have no such collision in any
      // of this function's call sites.
      return `'${expr.value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
    case "iterationLocal": {
      const name = angularIterationLocalName(expr.local, ctx);
      return name ? appendPath(name, expr.path) : null;
    }
    case "projection": {
      const source = renderAngularBindingValue(expr.source, ctx);
      return source === null
        ? null
        : expr.op === "selectionLabel"
          ? `selectionLabel(${source}, ${renderAngularBindingValue(expr.selection, ctx)}, ${renderAngularBindingValue(expr.fallback, ctx)})`
          : composeBindingProjectionExpression(expr.op, source);
    }
    case "valueMap": {
      const source = renderAngularBindingValue(expr.source, ctx);
      return source === null
        ? null
        : composeValueMapExpression(
            expr,
            source,
            (value) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`,
          );
    }
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      if (expr.field === "value") return appendPath(`behavior.${ch.name}()`, expr.path);
      if (expr.field === "defaultValue" && ch.defaultValueProp) {
        return safePropertyExpr(ch.defaultValueProp);
      }
      return null;
    }
    case "channelCall":
      // FEAT-BINDING-CALL-WITH-ARG-01: event-position only; produces a
      // handler, not a value. The IR rejects it in value positions.
      return null;
    case "channelUpdate":
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: event-position only; produces a
      // handler, not a value. The IR rejects it in value positions.
      return null;
    case "predicate":
      // BINDING-EXPRESSION-V2-PREDICATE-01.
      return renderAngularPredicate(expr, ctx);
    case "conditional": {
      const condition = renderAngularBindingValue(expr.condition, ctx);
      const whenTrue = renderAngularBindingValue(expr.whenTrue, ctx);
      const whenFalse = renderAngularBindingValue(expr.whenFalse, ctx);
      if (condition === null || whenTrue === null || whenFalse === null) return null;
      return `(${condition} ? ${whenTrue} : ${whenFalse})`;
    }
  }
}

/**
 * Lower a predicate-kind binding to an Angular template-expression
 * string. Operand accessors come from `renderAngularBindingValue` so
 * they pick up the idiomatic Angular shapes (`X` for props on this,
 * `behavior.X()` for channel signals via standard `()` invocation,
 * iter locals from `*ngFor`).
 */
function renderAngularPredicate(
  expr: BindingExpression & { kind: "predicate" },
  ctx: AngularRenderContext,
): string | null {
  const left = renderAngularBindingValue(expr.left, ctx);
  const right = renderAngularBindingValue(expr.right, ctx);
  if (left === null || right === null) return null;
  return loweredAngularPredicate(expr.op, left, right);
}

function loweredAngularPredicate(op: BindingPredicateOp, left: string, right: string): string {
  switch (op) {
    case "eq":
      return `(${left} === ${right})`;
    case "contains":
      return `((${left} ?? []).includes(${right}))`;
    case "memberOf":
      // Angular template expressions cannot reference globals like
      // `Array`, so memberOf delegates to a component-instance helper
      // method (`this.memberOf`) injected by the class generator when
      // any predicate:memberOf appears in the IR. The helper has
      // identical runtime semantics to the React/Svelte/Lit inline
      // form: `Array.isArray(s) ? s.includes(c) : c === s`.
      return `memberOf(${left}, ${right})`;
  }
}

/**
 * Lower an entry from `node.events` (keyed by unprefixed event name like
 * `click`) into Angular's `(eventname)="..."` form. For `prop:X` events
 * we emit `(click)="X && X()"` so that an unset handler is a silent
 * no-op rather than a runtime "is not a function" throw. Channel-routed
 * events delegate to the existing onChange logic.
 */
function renderAngularEvent(
  eventName: string,
  expr: BindingExpression,
  ctx: AngularRenderContext,
  tag?: string,
): string | null {
  switch (expr.kind) {
    case "prop":
      return `(${eventName})="${angularPropAccessor(expr.prop, ctx)} && ${angularPropAccessor(expr.prop, ctx)}()"`;
    case "literal":
      // Rare — usually events should be wired to a callback. Pass the
      // literal through as the expression body.
      return `(${eventName})="${escapeAngularAttr(expr.value)}"`;
    case "iterationLocal": {
      // Iteration locals are values, not callables. Drop the binding —
      // the IR validator would already have rejected a contract that
      // routes iter:index to an event.
      void ctx;
      return null;
    }
    case "projection":
      return null;
    case "valueMap":
      return null;
    case "channel": {
      const ch = ctx.channelByName.get(expr.channel);
      if (!ch) return null;
      return angularChannelEventBinding(eventName, ch, tag);
    }
    case "channelCall": {
      // FEAT-BINDING-CALL-WITH-ARG-01: delegate to the channelCall path in
      // renderAngularBinding by re-deriving the synthetic JSX-attr name (which
      // mapJsxEventToAngular maps back to `eventName`).
      const jsxAttr = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      return renderAngularBinding(jsxAttr, expr, ctx, tag);
    }
    case "channelUpdate": {
      // FEAT-CHANNEL-UPDATE-OPERATIONS-01: delegate to renderAngularBinding,
      // which emits the `(event)="apply<Op><Channel>(...)"` method wire.
      const jsxAttr = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      return renderAngularBinding(jsxAttr, expr, ctx, tag);
    }
    case "predicate":
      // BINDING-EXPRESSION-V2-PREDICATE-01: validator rejects this at
      // IR-build; the case keeps the switch exhaustive.
      return null;
    case "conditional":
      return null;
  }
}

function mapJsxEventToAngular(attr: string): string {
  if (attr === "onChange") return "change";
  if (attr === "onClick") return "click";
  if (attr === "onInput") return "input";
  if (attr === "onKeyDown") return "keydown";
  if (attr === "onFocus") return "focus";
  if (attr === "onBlur") return "blur";
  if (attr.startsWith("on") && attr.length > 2) {
    return attr.slice(2).toLowerCase();
  }
  return attr;
}

function escapeAngularAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}

function formatAngularAttrs(attrs: string[]): string {
  if (attrs.length === 0) return "";
  return " " + attrs.join(" ");
}

function capitalizeAngular(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

const VOID_HTML_ELEMENTS_ANGULAR = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);
