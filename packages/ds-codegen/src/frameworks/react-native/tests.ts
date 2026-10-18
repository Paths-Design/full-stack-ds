import type { ComponentIR } from "../../ir.js";
import { collectCollapseIntents } from "../../ir.js";
import {
  compoundSelectionSubcomponentNames,
  isCompoundSelectionContainer,
  rnAutoDismiss,
  rnModalityGateProp,
  stateStyleFacts,
  variantStyleFacts,
  type JoinedStyleEntry,
  type VariantStyleFact,
} from "./component-source.js";
import {
  rnAnchoredSurface,
  rnSurfaceLowering,
  type RnAnchoredSurfaceLowering,
  type RnSurfaceLowering,
} from "./surface-emit.js";

export function generateReactNativeTest(ir: ComponentIR): string {
  const runtimeTest = runtimeTestBody(ir);
  if (runtimeTest) return runtimeTest;
  return [
    "// @generated:start imports",
    `import { describe, it } from "vitest";`,
    `import type { ComponentProps } from "react";`,
    // Type-surface smoke test: the component is referenced only in
    // `ComponentProps<typeof X>` type position, so its import is a type
    // import — a value import here is an eslint consistent-type-imports
    // finding on every generated type-surface test.
    `import type { ${ir.name} } from "../${ir.name}";`,
    "// @generated:end",
    "",
    "// @generated:start tests",
    `describe("${ir.name} React Native type surface", () => {`,
    `${INDENT}it("accepts generated props", () => {`,
    `${INDENT}${INDENT}type ${ir.name}SmokeProps = ComponentProps<typeof ${ir.name}>;`,
    `${INDENT}${INDENT}const smokeProps = {} as ${ir.name}SmokeProps;`,
    `${INDENT}${INDENT}void smokeProps;`,
    `${INDENT}});`,
    `});`,
    "// @generated:end",
    "",
  ].join("\n");
}

function runtimeTestBody(ir: ComponentIR): string | null {
  const anchored = rnAnchoredSurface(ir);
  if (anchored) return anchoredSurfaceTest(ir, anchored);
  const surface = rnSurfaceLowering(ir);
  if (surface?.openChannel) return surfaceTest(ir, surface);
  if (isCompoundSelectionContainer(ir)) return compoundSelectionTest(ir);
  if (isNativeToggle(ir)) return nativeToggleTest(ir);
  if (isTextInput(ir)) return textInputTest(ir);
  if (isCheckbox(ir)) return checkboxTest(ir);
  if (isFieldLayoutPattern(ir)) return fieldLayoutTest(ir);
  if (isButton(ir)) return buttonTest(ir);
  if (isProgressbar(ir)) return progressTest(ir);
  if (isExpandableDisclosure(ir)) return expandableTest(ir);
  return null;
}

function renderImports(ir: ComponentIR, extraImports: string[] = []): string[] {
  const importedNames = [ir.name, ...extraImports].join(", ");
  return [
    "// @generated:start imports",
    `import { describe, expect, it } from "vitest";`,
    `import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";`,
    `import { ${importedNames} } from "../${ir.name}";`,
    "// @generated:end",
    "",
    "// @generated:start tests",
  ];
}

function renderFooter(): string[] {
  return ["// @generated:end", ""];
}

function rendererHelper(jsx: string): string[] {
  return [
    `${INDENT}let renderer: ReactTestRenderer | undefined;`,
    `${INDENT}act(() => {`,
    `${INDENT}${INDENT}renderer = TestRenderer.create(${jsx});`,
    `${INDENT}});`,
  ];
}

const INDENT = "  ";

function nativeToggleTest(ir: ComponentIR): string {
  return [
    ...renderImports(ir),
    `describe("${ir.name} React Native", () => {`,
    `${INDENT}it("renders native switch state and change handler", () => {`,
    ...rendererHelper(`<${ir.name} checked={false} onChange={() => undefined} testID="subject" />`),
    `${INDENT}${INDENT}const subject = renderer!.root.findAllByProps({ testID: "subject" }).at(-1)!;`,
    `${INDENT}${INDENT}expect(subject.props.accessibilityRole).toBe("switch");`,
    `${INDENT}${INDENT}expect(subject.props.value).toBe(false);`,
    `${INDENT}${INDENT}expect(subject.props.onValueChange).toEqual(expect.any(Function));`,
    `${INDENT}});`,
    `});`,
    ...renderFooter(),
  ].join("\n");
}

/**
 * Compound-selection (tab-family) interaction proof: press-driven selection,
 * accessibilityState flip, inactive-panel omission under default
 * unmountInactive, controlled-value override, and the outside-provider throw.
 * Subcomponent and channel prop names derive from the IR — no literals.
 */
function compoundSelectionTest(ir: ComponentIR): string {
  const channel = ir.behavior.normalizedChannels[0]!;
  const { listName, tabName, panelName } =
    compoundSelectionSubcomponentNames(ir);
  const defaultProp = channel.defaultValueProp ?? "defaultValue";
  const changeProp = channel.changeHandlerProp;
  const valueProp = channel.valueProp;
  const base = INDENT.repeat(3);
  const mountJsx = (openProp: string, openValue: string) =>
    [
      `<${ir.name} ${openProp}=${JSON.stringify(openValue)} ${changeProp}={(value: string) => changes.push(value)}>`,
      `${base}<${listName}>`,
      `${base}${INDENT}<${tabName} value="a" testID="tab-a">A</${tabName}>`,
      `${base}${INDENT}<${tabName} value="b" testID="tab-b">B</${tabName}>`,
      `${base}</${listName}>`,
      `${base}<${panelName} value="a" testID="panel-a">Content A</${panelName}>`,
      `${base}<${panelName} value="b" testID="panel-b">Content B</${panelName}>`,
      `</${ir.name}>,`,
    ].join("\n");

  return [
    ...renderImports(ir, [listName, tabName, panelName]),
    `describe("${ir.name} React Native compound selection", () => {`,
    `${INDENT}it("pressing a tab drives ${changeProp} and flips accessibilityState.selected", () => {`,
    `${INDENT}${INDENT}const changes: string[] = [];`,
    ...rendererHelper(mountJsx(defaultProp, "a")),
    `${INDENT}${INDENT}const tabB = renderer!.root.findAllByProps({ testID: "tab-b" }).at(-1)!;`,
    `${INDENT}${INDENT}expect(tabB.props.accessibilityRole).toBe("tab");`,
    `${INDENT}${INDENT}expect(tabB.props.accessibilityState).toMatchObject({ selected: false });`,
    `${INDENT}${INDENT}act(() => {`,
    `${INDENT}${INDENT}${INDENT}tabB.props.onPress();`,
    `${INDENT}${INDENT}});`,
    `${INDENT}${INDENT}expect(changes).toEqual(["b"]);`,
    `${INDENT}${INDENT}expect(tabB.props.accessibilityState).toMatchObject({ selected: true });`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => String(node.type) === "View" && node.props.testID === "panel-b").length).toBe(1);`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => String(node.type) === "View" && node.props.testID === "panel-a").length).toBe(0);`,
    `${INDENT}});`,
    ``,
    `${INDENT}it("controlled ${valueProp} overrides internal selection state", () => {`,
    `${INDENT}${INDENT}const changes: string[] = [];`,
    ...rendererHelper(mountJsx(valueProp, "a")),
    `${INDENT}${INDENT}const tabB = renderer!.root.findAllByProps({ testID: "tab-b" }).at(-1)!;`,
    `${INDENT}${INDENT}act(() => {`,
    `${INDENT}${INDENT}${INDENT}tabB.props.onPress();`,
    `${INDENT}${INDENT}});`,
    `${INDENT}${INDENT}expect(changes).toEqual(["b"]);`,
    `${INDENT}${INDENT}expect(tabB.props.accessibilityState).toMatchObject({ selected: false });`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => String(node.type) === "View" && node.props.testID === "panel-b").length).toBe(0);`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => String(node.type) === "View" && node.props.testID === "panel-a").length).toBe(1);`,
    `${INDENT}});`,
    ``,
    `${INDENT}it("throws when a tab renders outside the compound provider", () => {`,
    `${INDENT}${INDENT}expect(() => {`,
    `${INDENT}${INDENT}${INDENT}act(() => {`,
    `${INDENT}${INDENT}${INDENT}${INDENT}TestRenderer.create(<${tabName} value="a">A</${tabName}>);`,
    `${INDENT}${INDENT}${INDENT}});`,
    `${INDENT}${INDENT}}).toThrow(/compound component used outside/);`,
    `${INDENT}});`,
    `});`,
    ...renderFooter(),
  ].join("\n");
}

function textInputTest(ir: ComponentIR): string {
  return [
    ...renderImports(ir),
    `describe("${ir.name} React Native", () => {`,
    `${INDENT}it("renders text input value and change handler", () => {`,
    ...rendererHelper(`<${ir.name} value="Ada" onChange={() => undefined} placeholder="Name" testID="subject" />`),
    `${INDENT}${INDENT}const subject = renderer!.root.findAllByProps({ testID: "subject" }).at(-1)!;`,
    `${INDENT}${INDENT}expect(subject.props.value).toBe("Ada");`,
    `${INDENT}${INDENT}expect(subject.props.placeholder).toBe("Name");`,
    `${INDENT}${INDENT}expect(subject.props.onChangeText).toEqual(expect.any(Function));`,
    `${INDENT}});`,
    `});`,
    ...renderFooter(),
  ].join("\n");
}

function checkboxTest(ir: ComponentIR): string {
  return [
    ...renderImports(ir),
    `describe("${ir.name} React Native", () => {`,
    `${INDENT}it("renders checkbox semantics and press handler", () => {`,
    ...rendererHelper(`<${ir.name} checked={true} onChange={() => undefined} testID="subject" />`),
    `${INDENT}${INDENT}const subject = renderer!.root.findAllByProps({ testID: "subject" }).at(-1)!;`,
    `${INDENT}${INDENT}expect(subject.props.accessibilityRole).toBe("checkbox");`,
    `${INDENT}${INDENT}expect(subject.props.accessibilityState).toMatchObject({ checked: true });`,
    `${INDENT}${INDENT}expect(subject.props.onPress).toEqual(expect.any(Function));`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => node.props.children === "x").length).toBeGreaterThan(0);`,
    `${INDENT}});`,
    `});`,
    ...renderFooter(),
  ].join("\n");
}

function fieldLayoutTest(ir: ComponentIR): string {
  return [
    ...renderImports(ir),
    `describe("${ir.name} React Native", () => {`,
    `${INDENT}it("renders label, control, help, and error slots from props", () => {`,
    ...rendererHelper(`<${ir.name} name="email" label="Email" helpText="Use work email" error="Required" testID="subject">Control</${ir.name}>`),
    `${INDENT}${INDENT}const subject = renderer!.root.findAllByProps({ testID: "subject" }).at(-1)!;`,
    `${INDENT}${INDENT}expect(subject).toBeTruthy();`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => node.props.children === "Email").length).toBeGreaterThan(0);`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => node.props.children === "Control").length).toBeGreaterThan(0);`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => node.props.children === "Use work email").length).toBeGreaterThan(0);`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => node.props.children === "Required").length).toBeGreaterThan(0);`,
    `${INDENT}});`,
    `});`,
    ...renderFooter(),
  ].join("\n");
}

/**
 * The component's consumer-facing activation handler prop — a callback-kind
 * prop named `onClick`/`onPress`/`onActivate`. The RN button maps it internally
 * to the Pressable's `onPress`. Defaults to `onPress` for components that don't
 * declare one (back-compat with the pre-handler-prop shape).
 */
function activationHandlerProp(ir: ComponentIR): string {
  const handler = ir.styledProps.find(
    (p) =>
      p.propType.kind === "callback" &&
      /^on(Click|Press|Activate)$/.test(p.safeName),
  );
  return handler?.safeName ?? "onPress";
}

function buttonTest(ir: ComponentIR): string {
  const proof = variantBackgroundProof(ir);
  const imports = renderImports(ir);
  const expectedRole = ir.dom?.bindings["aria-pressed"] ? "togglebutton" : "button";
  const handlerProp = activationHandlerProp(ir);
  if (proof) {
    imports.splice(
      imports.indexOf("// @generated:end"),
      0,
      `import { FsdsThemeProvider } from "../../../tokens";`,
    );
  }
  return [
    ...imports,
    `describe("${ir.name} React Native", () => {`,
    `${INDENT}it("renders button semantics and press passthrough", () => {`,
    ...rendererHelper(`<${ir.name} ${handlerProp}={() => undefined} testID="subject">Save</${ir.name}>`),
    `${INDENT}${INDENT}const subject = renderer!.root.findAllByProps({ testID: "subject" }).at(-1)!;`,
    `${INDENT}${INDENT}expect(subject.props.accessibilityRole).toBe(${JSON.stringify(expectedRole)});`,
    `${INDENT}${INDENT}expect(subject.props.onPress).toEqual(expect.any(Function));`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => node.props.children === "Save").length).toBeGreaterThan(0);`,
    `${INDENT}});`,
    ...pressedAccessibilityStateTestBody(ir),
    ...(proof ? variantBackgroundTestBody(ir, proof) : []),
    ...pressedStateTestBody(ir),
    `});`,
    ...renderFooter(),
  ].join("\n");
}

function pressedAccessibilityStateTestBody(ir: ComponentIR): string[] {
  const root = ir.dom;
  if (!root) return [];
  const binding = root.bindings["aria-pressed"];
  if (!binding || binding.kind !== "prop") return [];
  const propName = binding.prop;
  return [
    `${INDENT}it("maps aria-pressed to React Native toggle-button accessibility state", () => {`,
    ...rendererHelper(`<${ir.name} ${propName}={true} testID="subject">Save</${ir.name}>`),
    `${INDENT}${INDENT}const subject = renderer!.root.findAllByProps({ testID: "subject" }).at(-1)!;`,
    `${INDENT}${INDENT}expect(subject.props.accessibilityRole).toBe("togglebutton");`,
    `${INDENT}${INDENT}expect(subject.props.accessibilityState).toMatchObject({ selected: true });`,
    `${INDENT}});`,
  ];
}

/**
 * When the root (or its default-variant override) realizes a pressed state
 * with a themeless-resolvable background distinct from the rest background,
 * prove the style-function lowering by invoking it for both states.
 *
 * The rendered subject uses the contract's DEFAULT variant values, so the
 * pressed background it actually shows is the default variant's override
 * when one exists (variantEntries), falling back to the root entry. Reading
 * rootEntries alone would assert the wrong color for any component whose
 * default variant restyles the pressed state — e.g. Button's default
 * `variant=primary` overrides pressed to a darker primary blue, distinct
 * from the root's neutral interaction-active gray.
 */
function pressedStateTestBody(ir: ComponentIR): string[] {
  const pressedState = stateStyleFacts(ir).find((state) => state.stateKey === "pressed");
  if (!pressedState) return [];

  // Resolve the default variant's keys for each axis that restyles this
  // state, so we can prefer the override the rendered subject actually uses.
  // Two keys per fact: styleKey (root_variant_<v>) indexes variantEntries;
  // scopeKey (variant_<v>) indexes tokenScopes[].scope. Both are needed.
  const defaultVariantStyleKeys = new Set<string>();
  const defaultVariantScopeKeys = new Set<string>();
  for (const fact of variantStyleFacts(ir)) {
    if (!pressedState.variantEntries.has(fact.styleKey)) continue;
    // A fact qualifies as "default" for its axis iff its value matches the
    // axis's declared default expression (e.g. variant="primary"). The
    // classRecipe modifier carries defaultExpr per axis; compare against it.
    const modifier = ir.classRecipe.valueModifiers.find((m) => m.propName === fact.axis);
    if (!modifier?.defaultExpr) continue;
    if (normalizeVariantLiteral(modifier.defaultExpr) === fact.value) {
      defaultVariantStyleKeys.add(fact.styleKey);
      defaultVariantScopeKeys.add(fact.scopeKey);
    }
  }

  // Prefer a default-variant override; fall back to root.
  let pressedBg: JoinedStyleEntry | undefined;
  for (const styleKey of defaultVariantStyleKeys) {
    const entry = pressedState.variantEntries
      .get(styleKey)
      ?.find((e) => e.rnProp === "backgroundColor" && e.rawValue !== undefined);
    if (entry) {
      pressedBg = entry;
      break;
    }
  }
  if (!pressedBg) {
    pressedBg = pressedState.rootEntries.find(
      (entry) => entry.rnProp === "backgroundColor" && entry.rawValue !== undefined,
    );
  }

  const restBg = defaultVariantBackgroundRawValue(ir, defaultVariantScopeKeys);
  if (!pressedBg?.rawValue || !restBg || pressedBg.rawValue === restBg) return [];
  return [
    `${INDENT}it("realizes pressed state styles via the style function", () => {`,
    ...rendererHelper(`<${ir.name} testID="subject">Save</${ir.name}>`),
    `${INDENT}${INDENT}const subject = renderer!.root.findAllByProps({ testID: "subject" }).at(-1)!;`,
    `${INDENT}${INDENT}expect(typeof subject.props.style).toBe("function");`,
    `${INDENT}${INDENT}const styleOf = subject.props.style as (state: { pressed: boolean }) => unknown;`,
    `${INDENT}${INDENT}const flatten = (style: unknown): Record<string, unknown> =>`,
    `${INDENT}${INDENT}${INDENT}Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]).filter(Boolean));`,
    `${INDENT}${INDENT}expect(flatten(styleOf({ pressed: true })).backgroundColor).toBe(${JSON.stringify(pressedBg.rawValue)});`,
    `${INDENT}${INDENT}expect(flatten(styleOf({ pressed: false })).backgroundColor).toBe(${JSON.stringify(restBg)});`,
    `${INDENT}});`,
  ];
}

/**
 * The classRecipe stores the axis default as a TS expression (e.g.
 * `"primary"` or `'primary'`). Strip the quotes so it compares equal to the
 * bare variant value on the VariantStyleFact.
 */
function normalizeVariantLiteral(expr: string): string {
  const trimmed = expr.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Themeless-resolved rest background the rendered subject actually shows.
 * Mirrors the pressed-bg precedence: prefer a default-variant scope when one
 * of the given styleKeys matches (the subject renders with default variant
 * values), falling back to the root scope. Reads the same name suffixes the
 * component's style resolver keys on for the background property.
 */
function defaultVariantBackgroundRawValue(
  ir: ComponentIR,
  defaultVariantStyleKeys: Set<string>,
): string | undefined {
  const matches = (scopeId: string) =>
    defaultVariantStyleKeys.has(scopeId) || scopeId === "root";
  // Prefer default-variant scopes first; only fall back to root if no variant
  // scope restyles the background.
  const order = [
    ...ir.tokenScopes.filter((s) => defaultVariantStyleKeys.has(s.scope)),
    ...ir.tokenScopes.filter((s) => s.scope === "root"),
  ];
  for (const scope of order) {
    if (!matches(scope.scope) && scope.scope !== "root") continue;
    const token = scope.values.find((value) =>
      [".color.background.default", ".color.bg.default", ".color.bg"].some((suffix) =>
        value.name.endsWith(suffix),
      ),
    );
    if (token?.rawValue !== undefined) return token.rawValue;
  }
  return undefined;
}

interface VariantProof {
  axisSafeName: string;
  a: { value: string; expected: string };
  b: { value: string; expected: string };
  themeTokens: Record<string, string>;
}

/**
 * Pick two values of one variant axis whose backgroundColor realizations have
 * distinct sources (different refs, or ref vs literal), and derive the theme
 * + expected colors that prove both lower through the token scopes.
 */
function variantBackgroundProof(ir: ComponentIR): VariantProof | null {
  const withBackground = variantStyleFacts(ir).filter((fact) =>
    fact.viewEntries.some((entry) => entry.rnProp === "backgroundColor"),
  );
  const byAxis = new Map<string, VariantStyleFact[]>();
  for (const fact of withBackground) {
    byAxis.set(fact.axis, [...(byAxis.get(fact.axis) ?? []), fact]);
  }
  const background = (fact: VariantStyleFact): JoinedStyleEntry =>
    fact.viewEntries.find((entry) => entry.rnProp === "backgroundColor")!;
  const sourceKey = (entry: JoinedStyleEntry): string =>
    entry.resolvesTo ?? `literal:${entry.rawValue ?? ""}`;
  const PALETTE = ["#101010", "#202020"];
  for (const facts of byAxis.values()) {
    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        const entryA = background(facts[i]!);
        const entryB = background(facts[j]!);
        if (sourceKey(entryA) === sourceKey(entryB)) continue;
        const themeTokens: Record<string, string> = {};
        const expectedFor = (entry: JoinedStyleEntry, color: string): string | null => {
          if (!entry.isLiteral && entry.resolvesTo) {
            themeTokens[entry.resolvesTo] = color;
            return color;
          }
          return entry.rawValue ?? null;
        };
        const expectedA = expectedFor(entryA, PALETTE[0]!);
        const expectedB = expectedFor(entryB, PALETTE[1]!);
        if (expectedA === null || expectedB === null || expectedA === expectedB) continue;
        return {
          axisSafeName: facts[i]!.axisSafeName,
          a: { value: facts[i]!.value, expected: expectedA },
          b: { value: facts[j]!.value, expected: expectedB },
          themeTokens,
        };
      }
    }
  }
  return null;
}

function variantBackgroundTestBody(ir: ComponentIR, proof: VariantProof): string[] {
  const themeLiteral = JSON.stringify({ tokens: proof.themeTokens });
  return [
    `${INDENT}it("realizes distinct ${proof.axisSafeName} backgrounds from token scopes", () => {`,
    `${INDENT}${INDENT}let renderer: ReactTestRenderer | undefined;`,
    `${INDENT}${INDENT}act(() => {`,
    `${INDENT}${INDENT}${INDENT}renderer = TestRenderer.create(`,
    `${INDENT}${INDENT}${INDENT}${INDENT}<FsdsThemeProvider value={${themeLiteral}}>`,
    `${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}<${ir.name} ${proof.axisSafeName}=${JSON.stringify(proof.a.value)} testID="variant-a">A</${ir.name}>`,
    `${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}<${ir.name} ${proof.axisSafeName}=${JSON.stringify(proof.b.value)} testID="variant-b">B</${ir.name}>`,
    `${INDENT}${INDENT}${INDENT}${INDENT}</FsdsThemeProvider>,`,
    `${INDENT}${INDENT}${INDENT});`,
    `${INDENT}${INDENT}});`,
    `${INDENT}${INDENT}const flatten = (style: unknown): Record<string, unknown> =>`,
    `${INDENT}${INDENT}${INDENT}Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]).filter(Boolean));`,
    `${INDENT}${INDENT}const restStyle = (node: { props: { style?: unknown } }): unknown =>`,
    `${INDENT}${INDENT}${INDENT}typeof node.props.style === "function"`,
    `${INDENT}${INDENT}${INDENT}${INDENT}? (node.props.style as (state: { pressed: boolean }) => unknown)({ pressed: false })`,
    `${INDENT}${INDENT}${INDENT}${INDENT}: node.props.style;`,
    `${INDENT}${INDENT}const variantA = renderer!.root.findAllByProps({ testID: "variant-a" }).at(-1)!;`,
    `${INDENT}${INDENT}const variantB = renderer!.root.findAllByProps({ testID: "variant-b" }).at(-1)!;`,
    `${INDENT}${INDENT}expect(flatten(restStyle(variantA)).backgroundColor).toBe(${JSON.stringify(proof.a.expected)});`,
    `${INDENT}${INDENT}expect(flatten(restStyle(variantB)).backgroundColor).toBe(${JSON.stringify(proof.b.expected)});`,
    `${INDENT}});`,
  ];
}

function progressTest(ir: ComponentIR): string {
  return [
    ...renderImports(ir),
    `describe("${ir.name} React Native", () => {`,
    `${INDENT}it("renders progressbar accessibility value and fill width", () => {`,
    ...rendererHelper(`<${ir.name} value={42} label="Loading" testID="subject" />`),
    `${INDENT}${INDENT}const subject = renderer!.root.findAllByProps({ testID: "subject" }).at(-1)!;`,
    `${INDENT}${INDENT}expect(subject.props.accessibilityRole).toBe("progressbar");`,
    `${INDENT}${INDENT}expect(subject.props.accessibilityValue).toMatchObject({ min: 0, max: 100, now: 42 });`,
    `${INDENT}${INDENT}const fill = renderer!.root.findAll((node) => Array.isArray(node.props.style) && node.props.style.some((entry: { width?: string }) => entry?.width === "42%"))[0];`,
    `${INDENT}${INDENT}expect(fill).toBeTruthy();`,
    `${INDENT}});`,
    `});`,
    ...renderFooter(),
  ].join("\n");
}

function expandableTest(ir: ComponentIR): string {
  const channel = ir.behavior.normalizedChannels.find(
    (candidate) => candidate.name === "expanded",
  );
  const handlerProp = channel?.changeHandlerProp;
  const lineProp = hasStyledProp(ir, "maxLines")
    ? "maxLines"
    : hasStyledProp(ir, "lines")
      ? "lines"
      : null;
  const collapsedLabelProp = hasStyledProp(ir, "showMoreLabel")
    ? "showMoreLabel"
    : hasStyledProp(ir, "expandText")
      ? "expandText"
      : null;
  const expandedLabelProp = hasStyledProp(ir, "showLessLabel")
    ? "showLessLabel"
    : hasStyledProp(ir, "collapseText")
      ? "collapseText"
      : null;
  const expandableProp = hasStyledProp(ir, "expandable") ? " expandable" : "";
  const linePropAssignment = lineProp ? ` ${lineProp}={2}` : "";
  const collapsedLabelAssignment = collapsedLabelProp
    ? ` ${collapsedLabelProp}="More"`
    : "";
  const expandedLabelAssignment = expandedLabelProp
    ? ` ${expandedLabelProp}="Less"`
    : "";
  const baseProps = `${expandableProp}${linePropAssignment}${collapsedLabelAssignment}${expandedLabelAssignment}`;
  return [
    ...renderImports(ir),
    `describe("${ir.name} React Native", () => {`,
    `${INDENT}it("renders collapsed content and expanded trigger state", () => {`,
    ...rendererHelper(`<${ir.name} expanded={false}${baseProps} testID="subject">Long copy</${ir.name}>`),
    `${INDENT}${INDENT}const trigger = renderer!.root.findByProps({ accessibilityRole: "button" });`,
    `${INDENT}${INDENT}expect(trigger.props.accessibilityState).toMatchObject({ expanded: false });`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => node.props.children === "More").length).toBeGreaterThan(0);`,
    `${INDENT}${INDENT}const content = renderer!.root.findAll((node) => node.props.children === "Long copy").at(-1);`,
    ...(lineProp ? [`${INDENT}${INDENT}expect(content?.props.numberOfLines).toBe(2);`] : []),
    `${INDENT}});`,
    ...(handlerProp
      ? [
          `${INDENT}it("updates uncontrolled state and fires the change callback on trigger press", () => {`,
          `${INDENT}${INDENT}const seen: boolean[] = [];`,
          ...rendererHelper(
            `<${ir.name}${baseProps} ${handlerProp}={(next: boolean) => seen.push(next)} testID="subject">Long copy</${ir.name}>`,
          ),
          `${INDENT}${INDENT}const trigger = renderer!.root.findByProps({ accessibilityRole: "button" });`,
          `${INDENT}${INDENT}expect(trigger.props.accessibilityState).toMatchObject({ expanded: false });`,
          `${INDENT}${INDENT}act(() => { trigger.props.onPress(); });`,
          `${INDENT}${INDENT}expect(seen).toEqual([true]);`,
          `${INDENT}${INDENT}const pressed = renderer!.root.findByProps({ accessibilityRole: "button" });`,
          `${INDENT}${INDENT}expect(pressed.props.accessibilityState).toMatchObject({ expanded: true });`,
          `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => node.props.children === "Less").length).toBeGreaterThan(0);`,
          `${INDENT}});`,
        ]
      : []),
    `});`,
    ...renderFooter(),
  ].join("\n");
}

/**
 * Anchored-surface tests (tooltip/popover RN adaptation): trigger
 * interaction opens through the channel, the content renders in a
 * transparent Modal, and backdrop press dismisses.
 */
function anchoredSurfaceTest(ir: ComponentIR, lowering: RnAnchoredSurfaceLowering): string {
  const channel = lowering.openChannel;
  const handler = channel.changeHandlerProp;
  const trigger = lowering.triggerEvent;
  const lines: string[] = [
    "// @generated:start imports",
    `import { describe, expect, it } from "vitest";`,
    `import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";`,
    `import { Modal } from "react-native";`,
    `import { ${ir.name} } from "../${ir.name}";`,
    "// @generated:end",
    "",
    "// @generated:start tests",
    `describe("${ir.name} React Native", () => {`,
    `${INDENT}it("opens the anchored surface from the trigger interaction", () => {`,
    `${INDENT}${INDENT}const seen: boolean[] = [];`,
    ...rendererHelper(
      `<${ir.name} ${handler}={(next: boolean) => seen.push(next)} content="Surface body" testID="subject">Anchor</${ir.name}>`,
    ),
    `${INDENT}${INDENT}const modalBefore = renderer!.root.findByType(Modal);`,
    `${INDENT}${INDENT}expect(modalBefore.props.visible).toBe(false);`,
    `${INDENT}${INDENT}const anchor = renderer!.root.findAllByProps({ testID: "subject" }).at(-1)!;`,
    `${INDENT}${INDENT}act(() => { anchor.props.${trigger}(); });`,
    `${INDENT}${INDENT}expect(seen).toEqual([true]);`,
    `${INDENT}${INDENT}const modal = renderer!.root.findByType(Modal);`,
    `${INDENT}${INDENT}expect(modal.props.visible).toBe(true);`,
    `${INDENT}${INDENT}expect(modal.props.transparent).toBe(true);`,
    `${INDENT}${INDENT}// The surface container is absolutely positioned (anchored). Exact`,
    `${INDENT}${INDENT}// measured coords come from native layout (measureInWindow), which`,
    `${INDENT}${INDENT}// react-test-renderer does not run — so we assert the positioning`,
    `${INDENT}${INDENT}// style is applied, not specific pixel values.`,
    `${INDENT}${INDENT}const content = renderer!.root.findAll((node) => typeof node.type === "string" && Array.isArray(node.props.style) && node.props.style.some((entry: { position?: string }) => entry?.position === "absolute")).at(-1);`,
    `${INDENT}${INDENT}expect(content).toBeTruthy();`,
    `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => typeof node.type === "string" && node.props.children === "Surface body").length).toBeGreaterThan(0);`,
    `${INDENT}});`,
  ];
  if (lowering.backdropDismiss) {
    lines.push(
      `${INDENT}it("dismisses on backdrop press", () => {`,
      `${INDENT}${INDENT}const seen: boolean[] = [];`,
      ...rendererHelper(
        `<${ir.name} ${handler}={(next: boolean) => seen.push(next)} content="Surface body" testID="subject">Anchor</${ir.name}>`,
      ),
      `${INDENT}${INDENT}const anchor = renderer!.root.findAllByProps({ testID: "subject" }).at(-1)!;`,
      `${INDENT}${INDENT}act(() => { anchor.props.${trigger}(); });`,
      `${INDENT}${INDENT}const backdrop = renderer!.root.findAll((node) => typeof node.type === "string" && node.props.accessible === false && typeof node.props.onPress === "function").at(-1)!;`,
      `${INDENT}${INDENT}act(() => { backdrop.props.onPress(); });`,
      `${INDENT}${INDENT}expect(seen).toEqual([true, false]);`,
      `${INDENT}${INDENT}expect(renderer!.root.findByType(Modal).props.visible).toBe(false);`,
      `${INDENT}});`,
    );
  }
  lines.push(`});`, ...renderFooter());
  return lines.join("\n");
}

/**
 * Presence-surface tests, derived from the lowering facts:
 *   modal mode    → Modal visibility binding, onRequestClose (escape),
 *                   overlay press (outside-click) each fire the change
 *                   callback with false.
 *   non-blocking  → no Modal in the tree; content toggles with the channel.
 */
/**
 * `surface.modalityProp` false: RN's Modal is modal by construction, so the
 * panel must leave the Modal host — in-tree, no overlay, and the Android back
 * press delivered by BackHandler instead of Modal.onRequestClose.
 */
function nonModalSurfaceTests(ir: ComponentIR, lowering: RnSurfaceLowering, modalProp: string): string[] {
  const channel = lowering.openChannel!;
  const openProp = channel.valueProp;
  const handler = channel.changeHandlerProp;
  // Host nodes only: the shim's components wrap a host element with the same props.
  const overlayQuery = `renderer!.root.findAll((node) => typeof node.type === "string" && node.props.accessible === false && typeof node.props.onPress === "function")`;
  const bodyQuery = `renderer!.root.findAll((node) => typeof node.type === "string" && node.props.children === "Body")`;
  // An open non-modal mount holds a BackHandler listener; unmount so it cannot leak into later tests.
  const unmount = `${INDENT}${INDENT}act(() => { renderer!.unmount(); });`;
  const lines = [
    `${INDENT}it("renders in-tree with no Modal host and no overlay when ${modalProp} is false", () => {`,
    ...rendererHelper(`<${ir.name} ${openProp} ${modalProp}={false} testID="subject">Body</${ir.name}>`),
    `${INDENT}${INDENT}expect(renderer!.root.findAllByType(Modal)).toHaveLength(0);`,
    `${INDENT}${INDENT}expect(${bodyQuery}.length).toBeGreaterThan(0);`,
    `${INDENT}${INDENT}expect(${overlayQuery}).toHaveLength(0);`,
    unmount,
    `${INDENT}});`,
    `${INDENT}it("renders nothing in-tree while closed when ${modalProp} is false", () => {`,
    ...rendererHelper(`<${ir.name} ${openProp}={false} ${modalProp}={false} testID="subject">Body</${ir.name}>`),
    `${INDENT}${INDENT}expect(renderer!.toJSON()).toBeNull();`,
    unmount,
    `${INDENT}});`,
  ];
  if (lowering.outsideDeclared) {
    lines.push(
      `${INDENT}it("keeps the Modal host and overlay when ${modalProp} is omitted", () => {`,
      ...rendererHelper(`<${ir.name} ${openProp} testID="subject">Body</${ir.name}>`),
      `${INDENT}${INDENT}expect(renderer!.root.findAllByType(Modal)).toHaveLength(1);`,
      `${INDENT}${INDENT}expect(${overlayQuery}).toHaveLength(1);`,
      unmount,
      `${INDENT}});`,
    );
  }
  if (lowering.escapeDeclared) {
    const enabledBy = lowering.escapeTrigger?.enabledByProp;
    lines.push(
      `${INDENT}it("dismisses on hardware back only while open and non-modal", () => {`,
      `${INDENT}${INDENT}const seen: boolean[] = [];`,
      ...rendererHelper(`<${ir.name} ${openProp} ${handler}={(next: boolean) => seen.push(next)} testID="subject">Body</${ir.name}>`),
      // Modal: Modal.onRequestClose owns the back press, so no listener.
      `${INDENT}${INDENT}expect(BackHandler.listenerCount()).toBe(0);`,
      `${INDENT}${INDENT}act(() => { renderer!.update(<${ir.name} ${openProp} ${modalProp}={false} ${handler}={(next: boolean) => seen.push(next)} testID="subject">Body</${ir.name}>); });`,
      `${INDENT}${INDENT}let consumed = false;`,
      `${INDENT}${INDENT}act(() => { consumed = BackHandler.press(); });`,
      `${INDENT}${INDENT}expect(consumed).toBe(true);`,
      `${INDENT}${INDENT}expect(seen).toEqual([false]);`,
      unmount,
      `${INDENT}${INDENT}expect(BackHandler.listenerCount()).toBe(0);`,
      `${INDENT}});`,
    );
    if (enabledBy) {
      lines.push(
        `${INDENT}it("hands hardware back to navigation when ${enabledBy} is false", () => {`,
        `${INDENT}${INDENT}const seen: boolean[] = [];`,
        ...rendererHelper(`<${ir.name} ${openProp} ${modalProp}={false} ${enabledBy}={false} ${handler}={(next: boolean) => seen.push(next)} testID="subject">Body</${ir.name}>`),
        `${INDENT}${INDENT}let consumed = true;`,
        `${INDENT}${INDENT}act(() => { consumed = BackHandler.press(); });`,
        `${INDENT}${INDENT}expect(consumed).toBe(false);`,
        `${INDENT}${INDENT}expect(seen).toEqual([]);`,
        unmount,
        `${INDENT}});`,
      );
    }
  }
  return lines;
}

function surfaceTest(ir: ComponentIR, lowering: RnSurfaceLowering): string {
  const channel = lowering.openChannel!;
  const openProp = channel.valueProp;
  const handler = channel.changeHandlerProp;
  const liveRegionBinding = ir.dom?.bindings["aria-live"];
  const liveRegionProp = liveRegionBinding?.kind === "prop" ? liveRegionBinding.prop : null;
  const liveRegionProps = liveRegionProp ? ` ${liveRegionProp}="assertive"` : "";
  const liveRegionExpectation = liveRegionProp
    ? `node.props.accessibilityLiveRegion === "assertive"`
    : `node.props.accessibilityLiveRegion !== undefined`;
  const usesTimers =
    lowering.mode !== "modal" && rnAutoDismiss(ir)?.defaultMs !== undefined;
  const lines: string[] = [
    "// @generated:start imports",
    `import { describe, expect, it${usesTimers ? ", vi" : ""} } from "vitest";`,
    `import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";`,
    `import { Modal } from "react-native";`,
    ...(rnModalityGateProp(ir) && lowering.escapeDeclared
      ? [`import { BackHandler } from "../../../test-react-native";`]
      : []),
    `import { ${ir.name} } from "../${ir.name}";`,
    "// @generated:end",
    "",
    "// @generated:start tests",
    `describe("${ir.name} React Native", () => {`,
  ];
  if (lowering.mode === "modal") {
    lines.push(
      `${INDENT}it("renders a native modal bound to the open channel", () => {`,
      `${INDENT}${INDENT}const seen: boolean[] = [];`,
      ...rendererHelper(
        `<${ir.name} ${openProp} ${handler}={(next: boolean) => seen.push(next)} testID="subject">Body</${ir.name}>`,
      ),
      `${INDENT}${INDENT}const modal = renderer!.root.findByType(Modal);`,
      `${INDENT}${INDENT}expect(modal.props.visible).toBe(true);`,
      `${INDENT}${INDENT}expect(modal.props.transparent).toBe(true);`,
    );
    if (lowering.escapeDeclared) {
      lines.push(
        `${INDENT}${INDENT}act(() => { modal.props.onRequestClose(); });`,
        `${INDENT}${INDENT}expect(seen).toEqual([false]);`,
      );
    }
    lines.push(`${INDENT}});`);
    lines.push(
      `${INDENT}it("hides the modal when closed", () => {`,
      ...rendererHelper(`<${ir.name} ${openProp}={false} testID="subject">Body</${ir.name}>`),
      `${INDENT}${INDENT}const modal = renderer!.root.findByType(Modal);`,
      `${INDENT}${INDENT}expect(modal.props.visible).toBe(false);`,
      `${INDENT}});`,
    );
    const modalProp = rnModalityGateProp(ir);
    if (modalProp) lines.push(...nonModalSurfaceTests(ir, lowering, modalProp));
    if (lowering.outsideDeclared) {
      lines.push(
        `${INDENT}it("dismisses on overlay press", () => {`,
        `${INDENT}${INDENT}const seen: boolean[] = [];`,
        ...rendererHelper(
          `<${ir.name} ${openProp} ${handler}={(next: boolean) => seen.push(next)} testID="subject">Body</${ir.name}>`,
        ),
        `${INDENT}${INDENT}const overlay = renderer!.root.findAll((node) => node.props.accessible === false && typeof node.props.onPress === "function").at(-1)!;`,
        `${INDENT}${INDENT}act(() => { overlay.props.onPress(); });`,
        `${INDENT}${INDENT}expect(seen).toEqual([false]);`,
        `${INDENT}});`,
      );
    }
  } else {
    lines.push(
      `${INDENT}it("renders a non-blocking live region without a modal host", () => {`,
      ...rendererHelper(`<${ir.name} ${openProp}${liveRegionProps} testID="subject">Body</${ir.name}>`),
      `${INDENT}${INDENT}expect(renderer!.root.findAllByType(Modal)).toHaveLength(0);`,
      `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => ${liveRegionExpectation}).length).toBeGreaterThan(0);`,
      `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => typeof node.type === "string" && node.props.children === "Body").length).toBeGreaterThan(0);`,
      `${INDENT}});`,
      `${INDENT}it("hides content when the open channel is false", () => {`,
      ...rendererHelper(`<${ir.name} ${openProp}={false} testID="subject">Body</${ir.name}>`),
      `${INDENT}${INDENT}expect(renderer!.root.findAll((node) => typeof node.type === "string" && node.props.children === "Body")).toHaveLength(0);`,
      `${INDENT}});`,
    );
    const autoDismiss = rnAutoDismiss(ir);
    if (autoDismiss?.defaultMs !== undefined) {
      lines.push(
        `${INDENT}it("auto-dismisses after the token presence budget elapses", () => {`,
        `${INDENT}${INDENT}vi.useFakeTimers();`,
        `${INDENT}${INDENT}const seen: boolean[] = [];`,
        ...rendererHelper(
          `<${ir.name} ${openProp} ${handler}={(next: boolean) => seen.push(next)} testID="subject">Body</${ir.name}>`,
        ),
        `${INDENT}${INDENT}act(() => { vi.advanceTimersByTime(${autoDismiss.defaultMs - 1}); });`,
        `${INDENT}${INDENT}expect(seen).toEqual([]);`,
        `${INDENT}${INDENT}act(() => { vi.advanceTimersByTime(1); });`,
        `${INDENT}${INDENT}expect(seen).toEqual([false]);`,
        `${INDENT}${INDENT}renderer?.unmount();`,
        `${INDENT}${INDENT}vi.useRealTimers();`,
        `${INDENT}});`,
        `${INDENT}it("never auto-dismisses when ${autoDismiss.durationProp} is null", () => {`,
        `${INDENT}${INDENT}vi.useFakeTimers();`,
        `${INDENT}${INDENT}const seen: boolean[] = [];`,
        ...rendererHelper(
          `<${ir.name} ${openProp} ${autoDismiss.durationProp}={null} ${handler}={(next: boolean) => seen.push(next)} testID="subject">Body</${ir.name}>`,
        ),
        `${INDENT}${INDENT}act(() => { vi.advanceTimersByTime(600000); });`,
        `${INDENT}${INDENT}expect(seen).toEqual([]);`,
        `${INDENT}${INDENT}renderer?.unmount();`,
        `${INDENT}${INDENT}vi.useRealTimers();`,
        `${INDENT}});`,
      );
    }
  }
  lines.push(`});`, ...renderFooter());
  return lines.join("\n");
}

function isNativeToggle(ir: ComponentIR): boolean {
  return collectCollapseIntents(ir).has("native-toggle-affordance");
}

function isTextInput(ir: ComponentIR): boolean {
  return ir.dom?.tag === "input" && ir.behavior.form?.inputType !== "checkbox" && Boolean(ir.behavior.normalizedChannels[0]);
}

/**
 * Mirrors `isCheckboxControl` in component-source.ts — the test plan and the
 * component lowering must agree on what a checkbox is, and both read the
 * contract's `form.inputType` (via `ir.behavior.form`) rather than probing the root DOM tag.
 */
function isCheckbox(ir: ComponentIR): boolean {
  return (
    ir.behavior.form?.inputType === "checkbox" && !isNativeToggle(ir)
  );
}

function isButton(ir: ComponentIR): boolean {
  return (
    ir.behavior.normalizedChannels.length === 0 &&
    (ir.dom?.tag === "button" || ir.dom?.attrs.role === "button")
  );
}

function isProgressbar(ir: ComponentIR): boolean {
  return ir.dom?.attrs.role === "progressbar";
}

function isExpandableDisclosure(ir: ComponentIR): boolean {
  return (
    ir.behavior.normalizedChannels.some((channel) => channel.name === "expanded") &&
    (hasStyledProp(ir, "maxLines") || hasStyledProp(ir, "lines"))
  );
}

function hasStyledProp(ir: ComponentIR, safeName: string): boolean {
  return ir.styledProps.some((prop) => prop.safeName === safeName);
}

function isFieldLayoutPattern(ir: ComponentIR): boolean {
  const partNames = new Set(ir.parts.map((part) => part.name));
  const propNames = new Set(ir.styledProps.map((prop) => prop.safeName));
  return (
    partNames.has("label") &&
    partNames.has("control") &&
    partNames.has("meta") &&
    propNames.has("label") &&
    propNames.has("helpText") &&
    propNames.has("error")
  );
}
