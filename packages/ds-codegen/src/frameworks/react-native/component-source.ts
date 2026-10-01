import { pagedBindingExpression } from "../../paging.js";
import { matchesTokenRole } from "../token-role.js";
import type {
  BindingExpression,
  ComponentInstanceIR,
  ComponentIR,
  DomNodeIR,
  HighlightTransformIR,
  NormalizedChannelIR,
  NormalizedDismissalTriggerIR,
  ResolvedPropIR,
} from "../../ir.js";
import { collectCollapseIntents, collectContentTransforms, composeBindingProjectionExpression, composeChannelUpdateExpression, composeValueMapExpression, isContentTransform } from "../../ir.js";
import { nativeRootClipping } from "../../ir.js";
import { resolveComponentRefImports } from "../component-ref-imports.js";
import {
  rnAnchoredSurface,
  rnSurfaceLowering,
  type RnAnchoredSurfaceLowering,
  type RnSurfaceLowering,
} from "./surface-emit.js";
import { resolveSurfaceAutoDismiss } from "../../semantics.js";
import { consumedNativeTokenScopes, reactNativeTokenReads } from "./token-consumption.js";
import {
  getGroupHostOrnamentPart,
  getGroupHostPart,
  getInteractiveItemPart,
  getRegionPart,
  isCompoundStateContainer,
  isDisclosureContainer,
} from "../react/hook-source.js";

export interface ReactNativeComponentFiles {
  componentFile: string;
  stylesFile: string;
  tokensFile: string;
}

const INDENT = "  ";
const VOID_RN_COMPONENTS = new Set(["TextInput", "RNImage", "RNSwitch"]);
const RESERVED_PROPS = new Set(["children", "style", "testID"]);
const GLOBAL_TYPE_NAMES = new Set([
  "Array",
  "Date",
  "NonNullable",
  "Omit",
  "Partial",
  "Pick",
  "Promise",
  "ReactNode",
  "Record",
  "Required",
]);

interface RuntimeUsage {
  props: Set<string>;
  channels: Set<string>;
  channelSetters: Set<string>;
  channelValues: Set<string>;
}

/**
 * Compound-state (tab-selection) containers: the same `multiple+interactive`
 * item part + region part gate the web emitters consume from
 * react/hook-source, minus the disclosure family (Accordion-shaped items) —
 * the RN lowering is the touch-native reading of the same IR facts: no
 * keyboard host, no roving tabindex, press-driven selection.
 */
export function isCompoundSelectionContainer(ir: ComponentIR): boolean {
  return isCompoundStateContainer(ir) && !isDisclosureContainer(ir);
}

/**
 * Subcomponent names the compound-selection lowering derives from the
 * resolved anatomy parts. Shared with the test generator so generated tests
 * import exactly the emitted names — no component-name literals in either.
 */
export function compoundSelectionSubcomponentNames(ir: ComponentIR): {
  listName: string;
  tabName: string;
  panelName: string;
} {
  const groupPart = getGroupHostPart(ir);
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  return {
    listName: `${ir.name}${capitalize(groupPart?.name ?? "list")}`,
    tabName: `${ir.name}${capitalize(itemPart?.name ?? "tab")}`,
    panelName: `${ir.name}${capitalize(regionPart?.name ?? "panel")}`,
  };
}

export function generateReactNativeComponentSource(
  ir: ComponentIR,
): ReactNativeComponentFiles {
  const componentFile = generateReactNativeComponentFile(ir);
  const stylesFile = generateReactNativeStylesFile(ir);
  const tokenScopes = consumedNativeTokenScopes(ir, reactNativeTokenReads([componentFile, stylesFile]));
  return {
    componentFile,
    stylesFile,
    tokensFile: generateReactNativeTokensFile({ ...ir, tokenScopes }),
  };
}

function generateReactNativeComponentFile(ir: ComponentIR): string {
  const sections: string[] = [];
  sections.push(emitImports(ir));
  sections.push(emitTypes(ir));
  sections.push(emitProps(ir));
  sections.push(
    isCompoundSelectionContainer(ir)
      ? emitCompoundSelectionComponent(ir)
      : nativeHighlightTransform(ir)
        ? emitHighlightPresentation(ir, nativeHighlightTransform(ir)!)
        : emitComponent(ir),
  );
  return sections.filter(Boolean).join("\n\n") + "\n";
}

function nativeHighlightTransform(ir: ComponentIR): HighlightTransformIR | undefined {
  return collectContentTransforms(ir.dom).find(
    (transform): transform is HighlightTransformIR => transform.transform === "highlight" && Boolean(transform.linePart && transform.gutterPart),
  );
}

function emitHighlightPresentation(ir: ComponentIR, transform: HighlightTransformIR): string {
  const lineName = `${ir.name}${capitalize(transform.linePart!)}`;
  const tokenName = `${ir.name}${capitalize(transform.tokenPart)}`;
  const sourceProp = transform.sourceProp;
  const suppliedProp = transform.tokensProp ?? "undefined";
  const gateProp = transform.gateProp ?? "undefined";
  const lineNumbersProp = transform.lineNumbersProp ?? "undefined";
  const palettePrefix = `${ir.cssPrefix}.${transform.tokenPart}.color.`;
  const palette = ir.tokenScopes.flatMap((scope) => scope.values)
    .filter((value) => value.name.startsWith(palettePrefix))
    .map((value) => ({ kind: value.name.slice(palettePrefix.length), slot: value.name }));
  const gutterColor = `${ir.cssPrefix}.${transform.gutterPart}.color.number`;
  const gutterGap = `${ir.cssPrefix}.${transform.gutterPart}.size.gap`;
  const lines = ["// @generated:start component"];
  lines.push(`export interface ${lineName}Props { number: number; showLineNumbers?: boolean; children?: ReactNode }`);
  lines.push(`export function ${lineName}({ number, showLineNumbers = false, children }: ${lineName}Props) {`);
  lines.push(`  const fsdsTheme = useFsdsTheme();`);
  lines.push(`  const tokens = useMemo(() => resolve${ir.name}Tokens(fsdsTheme), [fsdsTheme]);`);
  lines.push(`  const styles = useMemo(() => create${ir.name}Styles(fsdsTheme), [fsdsTheme]);`);
  lines.push(`  return <View style={{ flexDirection: "row" }}><RNText accessible={false} style={{ display: showLineNumbers ? "flex" : "none", minWidth: 32, textAlign: "right", color: tokens.root?.[${JSON.stringify(gutterColor)}] as string | undefined, marginRight: tokens.root?.[${JSON.stringify(gutterGap)}] as number | undefined }}>{number}</RNText><RNText style={styles.rootText}>{children}</RNText></View>;`);
  lines.push(`}`);
  lines.push(`export interface ${tokenName}Props { kind: ${ir.name}TokenType; children?: ReactNode }`);
  lines.push(`export function ${tokenName}({ kind, children }: ${tokenName}Props) {`);
  lines.push(`  const fsdsTheme = useFsdsTheme();`);
  lines.push(`  const tokens = useMemo(() => resolve${ir.name}Tokens(fsdsTheme), [fsdsTheme]);`);
  lines.push(`  const colors: Partial<Record<${ir.name}TokenType, string | undefined>> = {`);
  for (const { kind, slot } of palette) lines.push(`    ${JSON.stringify(kind)}: tokens.root?.[${JSON.stringify(slot)}] as string | undefined,`);
  lines.push(`  };`);
  lines.push(`  return <RNText style={{ color: colors[kind] }}>{children}</RNText>;`);
  lines.push(`}`);
  lines.push(`export function ${ir.name}({ ${sourceProp}, ${suppliedProp}: suppliedTokens, ${gateProp} = true, ${lineNumbersProp} = false, children, style, testID, accessibilityLabel, accessibilityLabelledBy }: ${ir.name}Props) {`);
  lines.push(`  const fsdsTheme = useFsdsTheme();`);
  lines.push(`  const styles = useMemo(() => create${ir.name}Styles(fsdsTheme), [fsdsTheme]);`);
  lines.push(`  const source = useMemo(() => prepareSourceLines(${sourceProp}, suppliedTokens, ${gateProp}), [${sourceProp}, suppliedTokens, ${gateProp}]);`);
  lines.push(`  return <View testID={testID} style={[styles.root, style]} accessible accessibilityLabel={accessibilityLabel ?? ${sourceProp}} accessibilityLabelledBy={accessibilityLabelledBy}>`);
  lines.push(`    {children ? (typeof children === "string" ? <RNText style={styles.rootText}>{children}</RNText> : children) : source.lines.map((line) => <${lineName} key={line.number} number={line.number} showLineNumbers={${lineNumbersProp}}>{line.tokens.map((token, index) => source.highlighted ? <${tokenName} key={index} kind={token.kind}>{token.text}</${tokenName}> : token.text)}</${lineName}>)}`);
  lines.push(`  </View>;`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

/**
 * Compound-state (tab-selection) lowering for React Native — the touch-native
 * reading of the same IR facts the web emitters consume. Emitted shape:
 * a context created through the ported createCompoundContext primitive, a
 * provider root that owns the selection channel (emitChannelState
 * controllable semantics inlined), and per-part subcomponents named from the
 * resolved anatomy parts (list → View, tab → Pressable, panel → View).
 *
 * Documented divergences (never contract facts): no keyboard navigation or
 * roving tabindex on touch; the indicator ornament is a static View; RN has
 * no tablist/tabpanel accessibility roles, so only the tab role is lowered;
 * `unmountInactive: false` renders inactive panels mounted-but-suppressed
 * (accessible={false} + display:none inline) instead of DOM-hidden.
 */
function emitCompoundSelectionComponent(ir: ComponentIR): string {
  const name = ir.name;
  const channel = ir.behavior.normalizedChannels[0];
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  const groupPart = getGroupHostPart(ir);
  const ornamentPart = getGroupHostOrnamentPart(ir);
  if (!channel || !itemPart || !regionPart) {
    throw new Error(
      `compound-state lowering for ${name} requires a channel, an interactive item part, and a region part`,
    );
  }
  const capChannel = capitalize(channel.name);
  const setterName = `set${capChannel}`;
  const controlled = `controlled${capChannel}`;
  const internal = `uncontrolled${capChannel}`;
  const setInternal = `setUncontrolled${capChannel}`;
  const listName = `${name}${capitalize(groupPart?.name ?? "list")}`;
  const tabName = `${name}${capitalize(itemPart.name)}`;
  const panelName = `${name}${capitalize(regionPart.name)}`;

  const propByName = new Map(ir.styledProps.map((p) => [p.name, p]));
  const variantAxes = realizedVariantAxes(ir);
  const variantFacts = variantStyleFacts(ir);
  const axisStyleConsts = variantAxes
    .map((axis) => {
      const factsForAxis = variantFacts.filter((fact) => fact.axis === axis);
      const hasViewEntries = factsForAxis.some(
        (fact) => fact.viewEntries.length > 0,
      );
      return hasViewEntries
        ? variantStyleConstName(factsForAxis[0]!.axisSafeName)
        : null;
    })
    .filter((constName): constName is string => constName !== null);

  const orientationType = propByName.has("orientation")
    ? `${name}Orientation`
    : `"horizontal" | "vertical"`;
  const activationType = propByName.has("activationMode")
    ? `${name}ActivationMode`
    : `"automatic" | "manual"`;

  // Destructure order: channel props → behavior props → variant axes → the
  // standard RN tail. Each name enters once.
  const destructured: string[] = [];
  const handled = new Set<string>();
  const pushProp = (entry: string, propName: string) => {
    if (handled.has(propName)) return;
    destructured.push(entry);
    handled.add(propName);
  };
  pushProp(`${channel.valueProp}: ${controlled}`, channel.valueProp);
  if (channel.defaultValueProp) {
    pushProp(channel.defaultValueProp, channel.defaultValueProp);
  }
  pushProp(channel.changeHandlerProp, channel.changeHandlerProp);
  const behaviorDefaults: Record<string, string> = {
    orientation: `"horizontal"`,
    activationMode: `"automatic"`,
    loop: "true",
    unmountInactive: "true",
  };
  for (const propName of [
    "orientation",
    "activationMode",
    "loop",
    "unmountInactive",
    "idBase",
  ]) {
    const prop = propByName.get(propName);
    if (!prop) continue;
    const fallback = behaviorDefaults[propName];
    const def = prop.defaultExpr ?? fallback;
    pushProp(def ? `${prop.safeName} = ${def}` : prop.safeName, propName);
  }
  for (const axis of variantAxes) {
    const axisSafeName = variantFacts.find((fact) => fact.axis === axis)
      ?.axisSafeName;
    if (!axisSafeName || handled.has(axisSafeName)) continue;
    const prop = propByName.get(axisSafeName);
    const def = prop?.defaultExpr;
    pushProp(def ? `${axisSafeName} = ${def}` : axisSafeName, axisSafeName);
  }
  for (const tailProp of [
    "children",
    "style",
    "testID",
    "accessibilityLabel",
    "accessibilityLabelledBy",
  ]) {
    pushProp(tailProp, tailProp);
  }

  const rootStyleEntries = ["styles.root", ...axisStyleConsts, "style"];

  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(`export interface ${name}ContextValue {`);
  lines.push(`  ${channel.name}: string;`);
  lines.push(`  ${setterName}: (value: string) => void;`);
  lines.push(`  registerTab: (value: string) => void;`);
  lines.push(`  unregisterTab: (value: string) => void;`);
  lines.push(`  registeredTabs: string[];`);
  lines.push(`  idBase: string;`);
  lines.push(`  orientation: ${orientationType};`);
  lines.push(`  activationMode: ${activationType};`);
  lines.push(`  loop: boolean;`);
  lines.push(`  unmountInactive: boolean;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(
    `const [${name}ContextProvider, use${name}Context] = createCompoundContext<${name}ContextValue>("${name}");`,
  );
  lines.push(`export { use${name}Context };`);
  lines.push(``);
  lines.push(`export function ${name}({`);
  for (const entry of destructured) lines.push(`${INDENT}${entry},`);
  lines.push(`}: ${name}Props) {`);
  lines.push(`${INDENT}const fsdsTheme = useFsdsTheme();`);
  lines.push(
    `${INDENT}const styles = useMemo(() => create${name}Styles(fsdsTheme), [fsdsTheme]);`,
  );
  lines.push(...emitVariantStyleConsts(ir));
  lines.push(
    `${INDENT}const [${internal}, ${setInternal}] = useState<string>((${channel.defaultValueProp} ?? "") as string);`,
  );
  lines.push(`${INDENT}const ${channel.name} = ${controlled} ?? ${internal};`);
  lines.push(
    `${INDENT}const ${setterName} = useCallback((next: string) => {`,
  );
  lines.push(
    `${INDENT}${INDENT}if (${controlled} === undefined) ${setInternal}(next);`,
  );
  lines.push(`${INDENT}${INDENT}${channel.changeHandlerProp}?.(next);`);
  lines.push(`${INDENT}}, [${controlled}, ${channel.changeHandlerProp}]);`);
  lines.push(`${INDENT}const [registeredTabs, setRegisteredTabs] = useState<string[]>([]);`);
  lines.push(`${INDENT}const registerTab = useCallback((value: string) => {`);
  lines.push(
    `${INDENT}${INDENT}setRegisteredTabs((tabs) => (tabs.includes(value) ? tabs : [...tabs, value]));`,
  );
  lines.push(`${INDENT}}, []);`);
  lines.push(
    `${INDENT}const unregisterTab = useCallback((value: string) => {`,
  );
  lines.push(
    `${INDENT}${INDENT}setRegisteredTabs((tabs) => tabs.filter((tab) => tab !== value));`,
  );
  lines.push(`${INDENT}}, []);`);
  // Hook calls must be unconditional (react-hooks/rules-of-hooks): stage the
  // generated id first, then coalesce the caller's idBase against it — the
  // same shape the react emitter uses in hook-source.ts.
  lines.push(
    `${INDENT}const generatedIdBase = useId().replace(/:/g, "");`,
  );
  lines.push(`${INDENT}const resolvedIdBase = idBase ?? generatedIdBase;`);
  lines.push(``);
  lines.push(`${INDENT}return (`);
  lines.push(`${INDENT}${INDENT}<${name}ContextProvider`);
  lines.push(`${INDENT}${INDENT}${INDENT}value={{`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${channel.name},`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${setterName},`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}registeredTabs,`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}registerTab,`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}unregisterTab,`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}${INDENT}idBase: resolvedIdBase,`,
  );
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}orientation,`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}activationMode,`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}loop,`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}unmountInactive,`);
  lines.push(`${INDENT}${INDENT}${INDENT}}}`);
  lines.push(`${INDENT}${INDENT}>`);
  lines.push(`${INDENT}${INDENT}${INDENT}<View`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}testID={testID}`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}${INDENT}style={[${rootStyleEntries.join(", ")}]}`,
  );
  lines.push(
    `${INDENT}${INDENT}${INDENT}${INDENT}accessibilityLabel={accessibilityLabel}`,
  );
  lines.push(
    `${INDENT}${INDENT}${INDENT}${INDENT}accessibilityLabelledBy={accessibilityLabelledBy}`,
  );
  lines.push(`${INDENT}${INDENT}${INDENT}>`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}${INDENT}{typeof children === "string" ? <RNText>{children}</RNText> : children}`,
  );
  lines.push(`${INDENT}${INDENT}${INDENT}</View>`);
  lines.push(`${INDENT}${INDENT}</${name}ContextProvider>`);
  lines.push(`${INDENT});`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export interface ${listName}Props {`);
  lines.push(`${INDENT}children?: ReactNode;`);
  lines.push(`${INDENT}testID?: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function ${listName}({ children, testID }: ${listName}Props) {`);
  lines.push(`${INDENT}use${name}Context();`);
  lines.push(`${INDENT}const fsdsTheme = useFsdsTheme();`);
  lines.push(
    `${INDENT}const styles = useMemo(() => create${name}Styles(fsdsTheme), [fsdsTheme]);`,
  );
  lines.push(``);
  lines.push(`${INDENT}return (`);
  lines.push(`${INDENT}${INDENT}<View testID={testID} style={styles.${groupPart?.name ?? "list"}}>`);
  lines.push(`${INDENT}${INDENT}${INDENT}{children}`);
  if (ornamentPart) {
    lines.push(
      `${INDENT}${INDENT}${INDENT}<View style={styles.${ornamentPart.name}} accessible={false} />`,
    );
  }
  lines.push(`${INDENT}${INDENT}</View>`);
  lines.push(`${INDENT});`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export interface ${tabName}Props {`);
  lines.push(`${INDENT}value: string;`);
  lines.push(`${INDENT}disabled?: boolean;`);
  lines.push(`${INDENT}children?: ReactNode;`);
  lines.push(`${INDENT}testID?: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(
    `export function ${tabName}({ value, disabled, children, testID }: ${tabName}Props) {`,
  );
  lines.push(`${INDENT}const ctx = use${name}Context();`);
  lines.push(`${INDENT}const isActive = ctx.${channel.name} === value;`);
  lines.push(`${INDENT}const fsdsTheme = useFsdsTheme();`);
  lines.push(
    `${INDENT}const styles = useMemo(() => create${name}Styles(fsdsTheme), [fsdsTheme]);`,
  );
  lines.push(`${INDENT}const { registerTab, unregisterTab } = ctx;`);
  lines.push(`${INDENT}const valueRef = useRef(value);`);
  lines.push(`${INDENT}valueRef.current = value;`);
  lines.push(`${INDENT}useEffect(() => {`);
  lines.push(`${INDENT}${INDENT}registerTab(valueRef.current);`);
  lines.push(
    `${INDENT}${INDENT}return () => unregisterTab(valueRef.current);`,
  );
  lines.push(`${INDENT}}, [registerTab, unregisterTab]);`);
  lines.push(``);
  lines.push(`${INDENT}return (`);
  lines.push(`${INDENT}${INDENT}<Pressable`);
  lines.push(`${INDENT}${INDENT}${INDENT}testID={testID}`);
  lines.push(`${INDENT}${INDENT}${INDENT}style={styles.${itemPart.name}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}accessibilityRole="tab"`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}accessibilityState={{ selected: isActive, disabled: disabled === true }}`,
  );
  lines.push(`${INDENT}${INDENT}${INDENT}disabled={disabled}`);
  lines.push(`${INDENT}${INDENT}${INDENT}onPress={() => {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}if (disabled) return;`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}ctx.${setterName}(value);`);
  lines.push(`${INDENT}${INDENT}${INDENT}}}`);
  lines.push(`${INDENT}${INDENT}>`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}{typeof children === "string" ? <RNText>{children}</RNText> : children}`,
  );
  lines.push(`${INDENT}${INDENT}</Pressable>`);
  lines.push(`${INDENT});`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export interface ${panelName}Props {`);
  lines.push(`${INDENT}value: string;`);
  lines.push(`${INDENT}children?: ReactNode;`);
  lines.push(`${INDENT}testID?: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(
    `export function ${panelName}({ value, children, testID }: ${panelName}Props) {`,
  );
  lines.push(`${INDENT}const ctx = use${name}Context();`);
  lines.push(`${INDENT}const isActive = ctx.${channel.name} === value;`);
  lines.push(`${INDENT}const fsdsTheme = useFsdsTheme();`);
  lines.push(
    `${INDENT}const styles = useMemo(() => create${name}Styles(fsdsTheme), [fsdsTheme]);`,
  );
  lines.push(``);
  lines.push(
    `${INDENT}if (ctx.unmountInactive && !isActive) return null;`,
  );
  lines.push(``);
  lines.push(`${INDENT}return (`);
  lines.push(`${INDENT}${INDENT}<View`);
  lines.push(`${INDENT}${INDENT}${INDENT}testID={testID}`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}style={[styles.${regionPart.name}, isActive ? undefined : { display: "none" }]}`,
  );
  lines.push(`${INDENT}${INDENT}${INDENT}accessible={isActive}`);
  lines.push(`${INDENT}${INDENT}>`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}{typeof children === "string" ? <RNText>{children}</RNText> : children}`,
  );
  lines.push(`${INDENT}${INDENT}</View>`);
  lines.push(`${INDENT});`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

function emitImports(ir: ComponentIR): string {
  const usage = collectRuntimeUsage(ir);
  const rnValueImports = new Set<string>();
  const rnTypeImports = new Set<string>(["StyleProp", rootStyleType(ir)]);
  if (usesNativeToggle(ir)) {
    rnValueImports.add("Switch as RNSwitch");
  } else {
    collectRnComponents(ir.dom, rnValueImports, ir);
  }
  if (usesLinking(ir.dom)) rnValueImports.add("Linking");
  if (
    (!usesNativeToggle(ir) && hasChildrenSlotUnderNonTextParent(ir.dom)) ||
    isCheckboxControl(ir)
  ) {
    rnValueImports.add("Text as RNText");
  }
  if (isCheckboxControl(ir)) rnValueImports.add("View");
  if (isCheckboxControl(ir)) rnValueImports.add("Pressable");
  if (rootPressableAcceptsOnPress(ir)) rnTypeImports.add("GestureResponderEvent");
  if (treeHasBindingName(ir.dom, "role")) rnTypeImports.add("AccessibilityRole");
  const surfaceLowering = rnSurfaceLowering(ir);
  if (surfaceLowering?.mode === "modal") {
    rnValueImports.add("Modal");
    if (surfaceOverlayDismiss(ir)) rnValueImports.add("Pressable");
  }
  if (rnInTreeBackDismiss(ir)) rnValueImports.add("BackHandler");
  if (rnAnchoredSurface(ir)) {
    rnValueImports.add("Dimensions");
    rnValueImports.add("Modal");
    rnValueImports.add("Pressable");
    rnValueImports.add("Text as RNText");
    rnValueImports.add("View");
  }
  if (isCompoundSelectionContainer(ir)) {
    rnValueImports.add("Pressable");
    rnValueImports.add("Text as RNText");
    rnValueImports.add("View");
  }
  if (
    !usesNativeToggle(ir) &&
    !isCheckboxControl(ir) &&
    ir.dom &&
    !rootIsTextComponent(ir) &&
    rootRendersTextWrapper(ir) &&
    variantStyleFacts(ir).some((fact) => fact.textEntries.length > 0)
  ) {
    rnTypeImports.add("TextStyle");
  }
  const reactImports = new Set(["ReactNode"]);
  if (usage.channelSetters.size > 0) {
    reactImports.add("useCallback");
  }
  if (rnAutoDismiss(ir) || rnInTreeBackDismiss(ir)) {
    reactImports.add("useEffect");
  }
  if (rnAnchoredSurface(ir)) {
    reactImports.add("useCallback");
    reactImports.add("useRef");
    reactImports.add("useState");
  }
  if (isCompoundSelectionContainer(ir)) {
    reactImports.add("useCallback");
    reactImports.add("useEffect");
    reactImports.add("useId");
    reactImports.add("useRef");
  }
  if (usage.channels.size > 0) {
    reactImports.add("useState");
  }
  reactImports.add("useMemo");

  return [
    "// @generated:start imports",
    rnTypeImports.size > 0
      ? `import type { ${Array.from(rnTypeImports).sort().join(", ")} } from "react-native";`
      : "",
    rnValueImports.size > 0
      ? `import { ${Array.from(rnValueImports).sort().join(", ")} } from "react-native";`
      : "",
    `import { ${Array.from(reactImports)
      .sort()
      .map((name) => (name === "ReactNode" ? "type ReactNode" : name))
      .join(", ")} } from "react";`,
    ir.pagedSet ? `import { usePagedSet } from "../../primitives/hooks/usePaging";` : "",
    `import { useFsdsTheme } from "../../tokens";`,
    `import { create${ir.name}Styles } from "./${ir.name}.styles";`,
    usesNativeToggle(ir) || rnAutoDismiss(ir) || nativeHighlightTransform(ir) || ir.motion.sequence
      ? `import { resolve${ir.name}Tokens } from "./${ir.name}.tokens";`
      : "",
    nativeHighlightTransform(ir)
      ? `import { prepareSourceLines } from "../../primitives/highlight/source-model";`
      : "",
    isCompoundSelectionContainer(ir)
      ? `import { createCompoundContext } from "../../primitives/hooks";`
      : "",
    ir.motion.sequence
      ? `import { useSequence, SequenceChildren } from "../../primitives/useSequence";`
      : "",
    // componentRef: import each referenced DS-RN sibling component
    // (CODEGEN-RECURSIVE-COMPOSITION-01). Named imports, relative sibling path.
    ...resolveComponentRefImports(ir.name, ir.dom, "react-native").map(
      (r) => `import { ${r.identifier} } from "${r.specifier}";`,
    ),
    "// @generated:end",
  ].filter(Boolean).join("\n");
}

function collectRnComponents(
  node: DomNodeIR | undefined,
  imports: Set<string>,
  ir?: ComponentIR,
): void {
  if (!node) {
    imports.add("View");
    return;
  }
  if (node.tag === "children" || node.tag === "slot") return;
  // componentRef nodes import a sibling DS component (collected separately by
  // collectRnComponentRefImports), not an RN primitive — skip the primitive
  // mapping but still recurse into children (which may use primitives).
  if (node.componentInstance) {
    for (const child of node.children) collectRnComponents(child, imports, ir);
    return;
  }
  if (node.content) imports.add("Text as RNText");
  // Resolve through the same IR-aware path emitNode uses, so a View-fallback
  // part that is text-bearing (and therefore renders as RNText) is imported.
  const component = ir ? rnComponentForNodeInIr(ir, node) : rnComponentForNode(node);
  imports.add(
    component === "RNText"
      ? "Text as RNText"
      : component === "RNImage"
        ? "Image as RNImage"
        : component,
  );
  for (const child of node.children) collectRnComponents(child, imports, ir);
}

function usesLinking(node: DomNodeIR | undefined): boolean {
  if (!node) return false;
  if (node.tag === "a" && Boolean(node.bindings.href)) return true;
  return node.children.some((child) => usesLinking(child));
}

function hasChildrenSlotUnderNonTextParent(node: DomNodeIR | undefined): boolean {
  if (!node) return false;
  const component = rnComponentForNode(node);
  if (
    component !== "RNText" &&
    !VOID_RN_COMPONENTS.has(component) &&
    node.children.length === 0 &&
    node.part === "root"
  ) {
    return true;
  }
  if (
    component !== "RNText" &&
    !VOID_RN_COMPONENTS.has(component) &&
    node.children.some(
      (child) =>
        child.tag === "children" || (child.tag === "slot" && !child.slotName),
    )
  ) {
    return true;
  }
  return node.children.some((child) => hasChildrenSlotUnderNonTextParent(child));
}

function emitTypes(ir: ComponentIR): string {
  const lines = ["// @generated:start types"];
  const emitted = new Set<string>();
  for (const [typeName, def] of Object.entries(ir.definedTypes)) {
    if (def.kind === "union" && def.values) {
      lines.push(
        `export type ${typeName} = ${def.values.map((v) => JSON.stringify(v)).join(" | ")};`,
      );
      emitted.add(typeName);
    } else if (def.kind === "alias" && def.alias) {
      lines.push(`export type ${typeName} = ${stripReactNamespace(def.alias)};`);
      emitted.add(typeName);
    } else {
      lines.push(`export type ${typeName} = unknown;`);
      emitted.add(typeName);
    }
  }
  for (const prop of ir.styledProps) {
    for (const ref of collectTypeRefs(prop)) {
      if (ref === "ReactNode" || emitted.has(ref) || ir.definedTypes[ref]) continue;
      lines.push(`export type ${ref} = unknown;`);
      emitted.add(ref);
    }
  }
  lines.push("// @generated:end");
  return lines.join("\n");
}

function collectTypeRefs(prop: ResolvedPropIR): string[] {
  const refs = new Set(prop.typeRefs);
  const matches = prop.type.match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? [];
  for (const match of matches) {
    if (!GLOBAL_TYPE_NAMES.has(match)) refs.add(match);
  }
  for (const global of GLOBAL_TYPE_NAMES) refs.delete(global);
  return [...refs];
}

function stripReactNamespace(value: string): string {
  return value.replace(/\bReact\.ReactNode\b/g, "ReactNode");
}

function emitProps(ir: ComponentIR): string {
  const lines = ["// @generated:start props", `export interface ${ir.name}Props {`];
  const emitted = new Set<string>();
  for (const prop of ir.styledProps) {
    if (RESERVED_PROPS.has(prop.name)) continue;
    lines.push(`${INDENT}${prop.safeName}${prop.required ? "" : "?"}: ${rnPropType(ir, prop)};`);
    emitted.add(prop.safeName);
  }
  // Anchored surfaces host their content part through a synthesized
  // `content` slot prop — the RN platform adaptation for the web compound
  // <Surface.Content> API (the contract stays neutral).
  if (rnAnchoredSurface(ir) && !emitted.has("content")) {
    lines.push(`${INDENT}content?: ReactNode;`);
    emitted.add("content");
  }
  // ARCH-COMPOSER-SLOT-PROJECTION-001: named slots are a `slots` object prop,
  // mirroring the React surface, so each region projects distinct content.
  const namedSlots = collectRnNamedSlots(ir.dom);
  if (namedSlots.length > 0) {
    lines.push(`${INDENT}slots?: {`);
    for (const slotName of namedSlots) {
      lines.push(`${INDENT}${INDENT}${slotName}?: ReactNode;`);
    }
    lines.push(`${INDENT}};`);
  }
  // Variant axes without a contract-declared prop still get a prop on web
  // (the class recipe synthesizes it); mirror that here with the value union.
  for (const modifier of synthesizedVariantProps(ir)) {
    if (emitted.has(modifier.safeName)) continue;
    const values = ir.variants[modifier.propName] ?? [];
    lines.push(
      `${INDENT}${modifier.safeName}?: ${values.map((value) => JSON.stringify(value)).join(" | ")};`,
    );
    emitted.add(modifier.safeName);
  }
  if (!emitted.has("children")) lines.push(`${INDENT}children?: ReactNode;`);
  if (rootPressableAcceptsOnPress(ir)) {
    lines.push(`${INDENT}onPress?: (event: GestureResponderEvent) => void;`);
  }
  lines.push(`${INDENT}style?: StyleProp<${rootStyleType(ir)}>;`);
  lines.push(`${INDENT}testID?: string;`);
  lines.push(`${INDENT}accessibilityLabel?: string;`);
  lines.push(`${INDENT}accessibilityLabelledBy?: string | string[];`);
  lines.push("}");
  lines.push("// @generated:end");
  return lines.join("\n");
}

function rnPropType(ir: ComponentIR, prop: ResolvedPropIR): string {
  if (prop.propType.kind === "node") return "ReactNode";
  const unresolved = new Set(ir.unresolvedTypeRefs.map((ref) => ref.ref));
  if (prop.typeRefs.some((ref) => unresolved.has(ref))) return "unknown";
  return prop.type.replace(/\bReactNode\b/g, "ReactNode");
}

function collectRuntimeUsage(ir: ComponentIR): RuntimeUsage {
  const usage: RuntimeUsage = {
    props: new Set(["style", "testID", "accessibilityLabel", "accessibilityLabelledBy"]),
    channels: new Set(),
    channelSetters: new Set(),
    channelValues: new Set(),
  };
  if (ir.pagedSet) {
    usage.channels.add(ir.pagedSet.channel);
    usage.channelValues.add(ir.pagedSet.channel);
    usage.channelSetters.add(ir.pagedSet.channel);
    for (const name of [ir.pagedSet.itemsProp, ir.pagedSet.countProp, ir.pagedSet.disabledProp]) if (name) usage.props.add(safePropName(ir, name));
  }
  if (rootPressableAcceptsOnPress(ir)) usage.props.add("onPress");
  if (ir.motion.sequence) {
    const sequence = ir.motion.sequence;
    usage.channels.add(sequence.channel);
    usage.channelValues.add(sequence.channel);
    usage.channelSetters.add(sequence.channel);
    for (const prop of [sequence.itemsProp, sequence.timing.autoPlayProp, sequence.timing.durationProp]) addPropIfPresent(ir, usage, prop);
  }

  if (usesNativeToggle(ir)) {
    const channel = ir.behavior.normalizedChannels[0];
    if (channel) {
      usage.channels.add(channel.name);
      usage.channelValues.add(channel.name);
      usage.channelSetters.add(channel.name);
    }
    addPropIfPresent(ir, usage, "disabled");
    addPropIfPresent(ir, usage, "size");
  return usage;
  }

  if (isCheckboxControl(ir)) {
    const channel = ir.behavior.normalizedChannels[0];
    if (channel) {
      usage.channels.add(channel.name);
      usage.channelValues.add(channel.name);
      usage.channelSetters.add(channel.name);
    }
    addPropIfPresent(ir, usage, "disabled");
    addPropIfPresent(ir, usage, "indeterminate");
    usage.props.add("children");
    return usage;
  }

  const anchored = rnAnchoredSurface(ir);
  if (anchored) {
    usage.channels.add(anchored.openChannel.name);
    usage.channelValues.add(anchored.openChannel.name);
    usage.channelSetters.add(anchored.openChannel.name);
    usage.props.add("children");
    usage.props.add("content");
    if (anchored.placementProp) addPropIfPresent(ir, usage, anchored.placementProp);
    addPropIfPresent(ir, usage, "disabled");
    if (anchored.escapeDeclared && anchored.escapeTrigger?.enabledByProp) {
      addPropIfPresent(ir, usage, anchored.escapeTrigger.enabledByProp);
    }
    if (anchored.backdropDismiss && anchored.backdropTrigger?.enabledByProp) {
      addPropIfPresent(ir, usage, anchored.backdropTrigger.enabledByProp);
    }
    return usage;
  }

  collectNodeRuntimeUsage(ir.dom, ir, usage);
  // Selected styling/accessibility synthesized from an attribute-state block
  // reads the channel even when the authored event only invokes its setter.
  const selection = selectionLowering(ir);
  if (selection) {
    usage.channels.add(selection.channel.name);
    usage.channelValues.add(selection.channel.name);
  }
  if (!ir.dom) usage.props.add("children");
  if (ir.dom) {
    const partSizeAxes = emSizedPartAxes(ir);
    for (const fact of variantStyleFacts(ir)) {
      if (
        fact.viewEntries.length === 0 &&
        fact.textEntries.length === 0 &&
        !partSizeAxes.has(fact.axis)
      ) {
        continue;
      }
      usage.props.add(fact.axisSafeName);
    }
    if (loweredStateKeys(ir).includes("disabled")) {
      addPropIfPresent(ir, usage, "disabled");
    }
    const lowering = rnSurfaceLowering(ir);
    if (lowering?.openChannel) {
      usage.channels.add(lowering.openChannel.name);
      usage.channelValues.add(lowering.openChannel.name);
      usage.channelSetters.add(lowering.openChannel.name);
      const autoDismiss = rnAutoDismiss(ir);
      if (autoDismiss) addPropIfPresent(ir, usage, autoDismiss.durationProp);
      if (lowering.escapeDeclared && lowering.escapeTrigger?.enabledByProp) {
        addPropIfPresent(ir, usage, lowering.escapeTrigger.enabledByProp);
      }
      if (lowering.outsideDeclared && lowering.outsideTrigger?.enabledByProp) {
        addPropIfPresent(ir, usage, lowering.outsideTrigger.enabledByProp);
      }
    }
  }
  return usage;
}

function addPropIfPresent(ir: ComponentIR, usage: RuntimeUsage, propName: string): void {
  const prop = findProp(ir, propName);
  if (prop) usage.props.add(prop.safeName);
}

function collectNodeRuntimeUsage(
  node: DomNodeIR | undefined,
  ir: ComponentIR,
  usage: RuntimeUsage,
): void {
  if (!node) return;
  if (node.tag === "children" || node.tag === "slot") {
    // A named slot projects `slots.<name>` (ARCH-COMPOSER-SLOT-PROJECTION-001);
    // only the default, unnamed projection consumes the children prop.
    if (!node.slotName) usage.props.add("children");
    return;
  }
  // componentRef: the node renders a DS-RN sibling component. Collect the host
  // props its classified bindings/events reference (bypassing the RN-primitive
  // support filters — those gate native components, not DS components). The
  // `if`-guard prop is collected too. Children recurse.
  if (node.componentInstance) {
    if (node.ifProp) collectGuardRuntimeUsage(node.ifProp, ir, usage);
    for (const b of node.componentInstance.bindings) {
      if (b.kind === "prop") collectBindingRuntimeUsage(b.expr, ir, usage);
    }
    for (const ev of node.componentInstance.events) {
      collectBindingRuntimeUsage(ev.expr, ir, usage, "setter");
    }
    for (const child of node.children) collectNodeRuntimeUsage(child, ir, usage);
    return;
  }
  const component = rnComponentForNode(node);
  if (node.ifProp) collectGuardRuntimeUsage(node.ifProp, ir, usage);
  if (node.iteration) collectBindingRuntimeUsage(node.iteration.source, ir, usage);
  // FEAT-CODEBLOCK-HIGHLIGHT-01: a content transform degrades to plain
  // text on React Native (no DOM spans) — only the source binding is read.
  if (node.content) {
    collectBindingRuntimeUsage(
      isContentTransform(node.content) ? node.content.source : node.content,
      ir,
      usage,
    );
  }
  // DOM CSS bindings do not themselves establish native consumption. Collect
  // only the bindings used by the native fill-width and text-lines lowerings.
  for (const binding of [nativeFillWidthBinding(node), nativeMaxLinesBinding(node)]) {
    if (binding) collectBindingRuntimeUsage(binding.value, ir, usage);
  }
  for (const [name, binding] of Object.entries(node.bindings)) {
    if (!isSupportedBindingForComponent(name, component)) continue;
    collectBindingRuntimeUsage(binding, ir, usage);
  }
  for (const [eventName, binding] of Object.entries(node.events)) {
    if (!eventPropFor(component, eventName)) continue;
    collectBindingRuntimeUsage(binding, ir, usage, "setter");
  }
  for (const child of node.children) {
    collectNodeRuntimeUsage(child, ir, usage);
  }
  if (
    // A content binding early-returns in emitNodeChildren — the children-slot
    // fallback never renders for such roots, so it consumes no prop.
    !node.content &&
    node.children.length === 0 &&
    node.part === "root" &&
    !VOID_RN_COMPONENTS.has(component)
  ) {
    usage.props.add("children");
  }
}

function collectBindingRuntimeUsage(
  binding: BindingExpression,
  ir: ComponentIR,
  usage: RuntimeUsage,
  channelPurpose: "value" | "setter" = "value",
): void {
  if (binding.kind === "paged") { if (binding.arg) collectBindingRuntimeUsage(binding.arg, ir, usage); return; }
  if (binding.kind === "prop") {
    const safeName = safePropName(ir, binding.prop);
    usage.props.add(safeName);
    return;
  }
  if (binding.kind === "channel") {
    usage.channels.add(binding.channel);
    usage.channelValues.add(binding.channel);
    if (channelPurpose === "setter" || binding.field === "onChange") {
      usage.channelSetters.add(binding.channel);
    }
    return;
  }
  if (binding.kind === "iterationLocal" || binding.kind === "literal") return;
  if (binding.kind === "valueMap") {
    collectBindingRuntimeUsage(binding.source, ir, usage, channelPurpose);
    return;
  }
  if (binding.kind === "projection") {
    collectBindingRuntimeUsage(binding.source, ir, usage, channelPurpose);
    if (binding.op === "selectionLabel") {
      collectBindingRuntimeUsage(binding.selection, ir, usage, channelPurpose);
      collectBindingRuntimeUsage(binding.fallback, ir, usage, channelPurpose);
    }
    return;
  }
  if (binding.kind === "conditional") {
    collectBindingRuntimeUsage(binding.condition, ir, usage, channelPurpose);
    collectBindingRuntimeUsage(binding.whenTrue, ir, usage, channelPurpose);
    collectBindingRuntimeUsage(binding.whenFalse, ir, usage, channelPurpose);
    return;
  }
  if (binding.kind === "channelCall") {
    // FEAT-BINDING-CALL-WITH-ARG-01: the call invokes the channel's setter,
    // so mark the channel as a setter usage, then walk the payload argument.
    usage.channels.add(binding.channel);
    usage.channelSetters.add(binding.channel);
    collectBindingRuntimeUsage(binding.arg, ir, usage, channelPurpose);
    return;
  }
  if (binding.kind === "channelUpdate") {
    // FEAT-CHANNEL-UPDATE-OPERATIONS-01: the operation composes and sets the
    // channel value; mark it as a value + setter usage, then walk operands.
    usage.channels.add(binding.channel);
    usage.channelValues.add(binding.channel);
    usage.channelSetters.add(binding.channel);
    for (const operand of binding.operands) {
      collectBindingRuntimeUsage(operand, ir, usage, channelPurpose);
    }
    return;
  }
  collectBindingRuntimeUsage(binding.left, ir, usage, channelPurpose);
  collectBindingRuntimeUsage(binding.right, ir, usage, channelPurpose);
}

function collectGuardRuntimeUsage(
  ifProp: string,
  ir: ComponentIR,
  usage: RuntimeUsage,
): void {
  if (ifProp === "children") {
    usage.props.add("children");
    return;
  }
  const channel = channelForIfProp(ir, ifProp);
  if (channel) {
    usage.channels.add(channel.name);
    usage.channelValues.add(channel.name);
    return;
  }
  usage.props.add(safePropName(ir, ifProp));
}

function emitComponent(ir: ComponentIR): string {
  const lines = ["// @generated:start component"];
  if (selectionLowering(ir)) {
    // Shared equality across primitive and Date channel payloads: Dates
    // compare by epoch, everything else by SameValueZero.
    lines.push(
      "const isEntrySelected = (candidate: unknown, current: unknown): boolean => {",
      `${INDENT}if (current === null || current === undefined) return false;`,
      `${INDENT}const list = Array.isArray(current) ? current : [current];`,
      `${INDENT}return list.some((entry) =>`,
      `${INDENT}${INDENT}typeof entry === "object" && entry !== null && "getTime" in entry`,
      `${INDENT}${INDENT}${INDENT}? (entry as Date).getTime() === (candidate as Date).getTime()`,
      `${INDENT}${INDENT}${INDENT}: entry === candidate);`,
      "};",
      "",
    );
  }
  const usage = collectRuntimeUsage(ir);
  const destructured = propDestructureEntries(ir, usage);
  lines.push(`export function ${ir.name}({`);
  for (const entry of destructured) lines.push(`${INDENT}${entry},`);
  lines.push(`}: ${ir.name}Props) {`);
  lines.push(`${INDENT}const fsdsTheme = useFsdsTheme();`);
  lines.push(`${INDENT}const styles = useMemo(() => create${ir.name}Styles(fsdsTheme), [fsdsTheme]);`);
  if (usesNativeToggle(ir) || rnAutoDismiss(ir) || ir.motion.sequence) {
    lines.push(`${INDENT}const tokens = useMemo(() => resolve${ir.name}Tokens(fsdsTheme), [fsdsTheme]);`);
  }
  for (const channel of ir.behavior.normalizedChannels.filter((candidate) =>
    usage.channels.has(candidate.name),
  )) {
    lines.push(...emitChannelState(ir, channel, usage.channelSetters.has(channel.name), usage.channelValues.has(channel.name)));
  }
  if (ir.pagedSet) {
    const page = ir.pagedSet;
    lines.push(`  const pagedSet = usePagedSet({ index: ${page.channel}, items: ${safePropName(ir, page.itemsProp)},`,
      `    count: ${page.countProp ? safePropName(ir, page.countProp) : "undefined"}, disabled: ${page.disabledProp ? safePropName(ir, page.disabledProp) : "false"}, onIndexChange: set${capitalize(page.channel)}Value });`);
  }
  const autoDismiss = rnAutoDismiss(ir);
  // Source: normalized sequence IR. Applies by capability, never component
  // identity. Remove only if the native sequence runtime contract changes.
  if (ir.motion.sequence) {
    const sequence = ir.motion.sequence;
    const duration = safePropName(ir, sequence.timing.durationProp);
    const transition = sequence.transition;
    const tokenRead = (name: string, fallback: string | number) => {
      const scope = ir.tokenScopes.find(scope => scope.values.some(value => value.name === name))?.scope;
      if (!scope) throw new Error(`NATIVE_SEQUENCE_TOKEN_MISSING: ${ir.name}.${name}`);
      return `tokens.${scope}?.[${JSON.stringify(name)}] ?? ${JSON.stringify(fallback)}`;
    };
    const movement = transition ? `, { durationMs: Number(${tokenRead(transition.durationToken, transition.durationMs)}), easing: String(${tokenRead(transition.easingToken, transition.easing)}), referenceWidth: ${transition.referenceWidth}, minMultiplier: ${transition.minMultiplier}, maxMultiplier: ${transition.maxMultiplier} }` : "";
    lines.push(`${INDENT}const sequence = useSequence({`,
      `${INDENT}${INDENT}index: ${sequence.channel}, labels: ${safePropName(ir, sequence.itemsProp)},`,
      `${INDENT}${INDENT}autoPlay: ${safePropName(ir, sequence.timing.autoPlayProp)},`,
      `${INDENT}${INDENT}durationMs: ${duration} === undefined ? Number(tokens.root?.[${JSON.stringify(sequence.timing.durationToken)}] ?? ${sequence.timing.defaultMs}) : ${duration},`,
      `${INDENT}${INDENT}onIndexChange: set${capitalize(sequence.channel)}Value,`,
      `${INDENT}}, children${movement});`);
  }
  if (autoDismiss) {
    const setter = `set${capitalize(autoDismiss.channel.name)}Value`;
    const tokenExpr = autoDismiss.tokenSlot
      ? `(tokens.root?.[${JSON.stringify(autoDismiss.tokenSlot)}] as number | undefined)`
      : String(autoDismiss.defaultMs ?? "undefined");
    lines.push(
      `${INDENT}const autoDismissDuration = ${autoDismiss.durationProp} === undefined ? ${tokenExpr} : ${autoDismiss.durationProp};`,
      `${INDENT}useEffect(() => {`,
      `${INDENT}${INDENT}if (!${autoDismiss.channel.name} || typeof autoDismissDuration !== "number" || autoDismissDuration <= 0) return;`,
      `${INDENT}${INDENT}const timer = setTimeout(() => ${setter}(false), autoDismissDuration);`,
      `${INDENT}${INDENT}return () => clearTimeout(timer);`,
      `${INDENT}}, [${autoDismiss.channel.name}, autoDismissDuration, ${setter}]);`,
      "",
    );
  }
  const anchoredSurface = rnAnchoredSurface(ir);
  if (anchoredSurface) {
    lines.push(...emitAnchoredSurfaceReturn(ir, anchoredSurface));
  } else if (usesNativeToggle(ir)) {
    lines.push(...emitNativeToggleReturn(ir));
  } else if (isCheckboxControl(ir)) {
    lines.push(...emitCheckboxReturn(ir));
  } else {
    lines.push(...emitVariantStyleConsts(ir));
    const surfaceModal =
      ir.dom !== undefined ? rnSurfaceModalLowering(ir) : null;
    const modalProp = surfaceModal ? rnModalityGateProp(ir) : undefined;
    const rendered = emitNode(ir.dom, ir, surfaceModal && !modalProp ? 3 : 2) ?? [
      `${INDENT}${INDENT}<View`,
      `${INDENT}${INDENT}${INDENT}testID={testID}`,
      `${INDENT}${INDENT}${INDENT}style={[styles.root, style]}`,
      `${INDENT}${INDENT}${INDENT}accessibilityLabel={accessibilityLabel}`,
      `${INDENT}${INDENT}${INDENT}accessibilityLabelledBy={accessibilityLabelledBy}`,
      `${INDENT}${INDENT}>`,
      `${INDENT}${INDENT}${INDENT}{children}`,
      `${INDENT}${INDENT}</View>`,
    ].join("\n");
    if (surfaceModal && modalProp) {
      if (rnInTreeBackDismiss(ir)) lines.push(...emitInTreeBackDismiss(ir, surfaceModal, modalProp));
      lines.push(`${INDENT}const surfaceTree = (`, rendered, `${INDENT});`);
      // Non-modal: the panel lives in the consumer's tree, not a Modal host.
      lines.push(`${INDENT}if (!${modalProp}) return ${surfaceModal.openChannel!.name} ? surfaceTree : null;`);
    }
    lines.push(`${INDENT}return (`);
    if (surfaceModal) {
      const channel = surfaceModal.openChannel!;
      const animation =
        surfaceModal.surface.positioning?.strategy === "centered" ? "fade" : "slide";
      lines.push(`${INDENT}${INDENT}<Modal`);
      lines.push(`${INDENT}${INDENT}${INDENT}visible={Boolean(${channel.name})}`);
      lines.push(`${INDENT}${INDENT}${INDENT}transparent`);
      lines.push(`${INDENT}${INDENT}${INDENT}animationType=${JSON.stringify(animation)}`);
      if (surfaceModal.escapeDeclared) {
        lines.push(
          `${INDENT}${INDENT}${INDENT}onRequestClose={${surfaceDismissHandlerExpr(ir, surfaceModal, surfaceModal.escapeTrigger)}}`,
        );
      }
      lines.push(`${INDENT}${INDENT}>`);
      lines.push(modalProp ? `${INDENT}${INDENT}${INDENT}{surfaceTree}` : rendered);
      lines.push(`${INDENT}${INDENT}</Modal>`);
    } else {
      lines.push(rendered);
    }
    lines.push(`${INDENT});`);
  }
  lines.push("}");
  lines.push("// @generated:end");
  return lines.join("\n");
}

/** Modal-mode surface lowering, present only when the open channel resolved. */
function rnSurfaceModalLowering(ir: ComponentIR): RnSurfaceLowering | null {
  const lowering = rnSurfaceLowering(ir);
  if (!lowering || lowering.mode !== "modal" || !lowering.openChannel) return null;
  return lowering;
}

/**
 * The modality prop of a Modal-hosted surface (`surface.modalityProp`), or
 * undefined when the contract declares none. RN's Modal is modal by
 * construction, so a false value must leave the Modal host entirely: the
 * panel renders in-tree, touches outside it reach the rest of the screen,
 * and no overlay renders.
 */
export function rnModalityGateProp(ir: ComponentIR): string | undefined {
  const gate = ir.surface?.modalityGate;
  if (!gate || !rnSurfaceModalLowering(ir)) return undefined;
  return safePropName(ir, gate.prop);
}

/**
 * In-tree back dismissal: Modal.onRequestClose carries the escape dismissal
 * while modal; once the panel is in-tree nothing delivers the Android back
 * press, so a BackHandler subscription takes over while open and non-modal.
 */
function rnInTreeBackDismiss(ir: ComponentIR): boolean {
  const lowering = rnSurfaceModalLowering(ir);
  return rnModalityGateProp(ir) !== undefined && lowering?.escapeDeclared === true;
}

function emitInTreeBackDismiss(ir: ComponentIR, lowering: RnSurfaceLowering, modalProp: string): string[] {
  const channel = lowering.openChannel!.name;
  const setter = `set${capitalize(channel)}Value`;
  const trigger = lowering.escapeTrigger;
  const enabledBy = trigger?.enabledByProp ? safePropName(ir, trigger.enabledByProp) : undefined;
  const deps = [modalProp, channel, setter, ...(enabledBy ? [enabledBy] : [])];
  return [
    `${INDENT}useEffect(() => {`,
    `${INDENT}${INDENT}if (${modalProp} || !${channel}) return undefined;`,
    `${INDENT}${INDENT}const subscription = BackHandler.addEventListener("hardwareBackPress", () => {`,
    // Returning false hands the press back to navigation when dismissal is off.
    ...(enabledBy
      ? [`${INDENT}${INDENT}${INDENT}if (!(${enabledBy} ?? ${trigger!.defaultEnabled})) return false;`]
      : []),
    `${INDENT}${INDENT}${INDENT}${setter}(false);`,
    `${INDENT}${INDENT}${INDENT}return true;`,
    `${INDENT}${INDENT}});`,
    `${INDENT}${INDENT}return () => subscription.remove();`,
    `${INDENT}}, [${deps.join(", ")}]);`,
    "",
  ];
}

/**
 * Auto-dismiss lowering: an open-channel surface with timeout dismissal and
 * a timing.autoDismissProp. The budget reads the *.timing.auto-dismiss token
 * scope (theme-reactive) with the duration prop as consumer override.
 */
export function rnAutoDismiss(ir: ComponentIR): {
  durationProp: string;
  tokenSlot: string | undefined;
  defaultMs: number | undefined;
  channel: NormalizedChannelIR;
} | null {
  const lowering = rnSurfaceLowering(ir);
  if (!lowering?.openChannel) return null;
  const policy = resolveSurfaceAutoDismiss(ir);
  if (!policy) return null;
  return { ...policy, channel: lowering.openChannel };
}

/** Anatomy part lowering to a dismissing Pressable overlay (outside-click). */
function surfaceOverlayPartName(ir: ComponentIR): string | undefined {
  const lowering = rnSurfaceModalLowering(ir);
  if (!lowering || !lowering.outsideDeclared) return undefined;
  return ir.parts.find((part) => part.details?.role === "overlay")?.name;
}

function surfaceOverlayDismiss(ir: ComponentIR): boolean {
  return surfaceOverlayPartName(ir) !== undefined;
}

/**
 * Dismiss handler expression, gated by the dismissal trigger's enabledBy
 * prop when the contract declares one (e.g. closeOnBackdropClick).
 */
function surfaceDismissHandlerExpr(
  ir: ComponentIR,
  lowering: RnSurfaceLowering,
  trigger: NormalizedDismissalTriggerIR | undefined,
): string {
  const setter = `set${capitalize(lowering.openChannel!.name)}Value`;
  if (trigger?.enabledByProp) {
    return `() => { if (${safePropName(ir, trigger.enabledByProp)} ?? ${trigger.defaultEnabled}) ${setter}(false); }`;
  }
  return `() => ${setter}(false)`;
}

function emitCheckboxReturn(ir: ComponentIR): string[] {
  const channel = ir.behavior.normalizedChannels[0];
  if (!channel) return [];
  const valueName = channel.name;
  const setterName = `set${capitalize(channel.name)}Value`;
  const disabledProp = findProp(ir, "disabled") ? "disabled" : "false";
  const indeterminateProp = findProp(ir, "indeterminate") ? "indeterminate" : "false";
  const lines: string[] = [];
  lines.push(`${INDENT}return (`);
  lines.push(`${INDENT}${INDENT}<Pressable`);
  lines.push(`${INDENT}${INDENT}${INDENT}testID={testID}`);
  // `input` collapses into the root Pressable (RN has no native checkbox
  // element), so the collapsed node carries BOTH parts' styles — a collapse
  // must not drop a part's declared styling.
  lines.push(`${INDENT}${INDENT}${INDENT}style={[styles.root, styles.input, style]}`);
  lines.push(`${INDENT}${INDENT}${INDENT}disabled={${disabledProp}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}onPress={() => ${setterName}(!${valueName})}`);
  lines.push(`${INDENT}${INDENT}${INDENT}accessibilityLabel={accessibilityLabel}`);
  lines.push(`${INDENT}${INDENT}${INDENT}accessibilityLabelledBy={accessibilityLabelledBy}`);
  lines.push(`${INDENT}${INDENT}${INDENT}accessibilityRole="checkbox"`);
  lines.push(`${INDENT}${INDENT}${INDENT}accessibilityState={{ checked: ${indeterminateProp} ? "mixed" : Boolean(${valueName}), disabled: ${disabledProp} }}`);
  lines.push(`${INDENT}${INDENT}>`);
  lines.push(`${INDENT}${INDENT}${INDENT}<View style={[styles.indicator, ${valueName} || ${indeterminateProp} ? styles.indicator_checked : undefined]}>`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}<RNText style={styles.indicatorMark}>{${indeterminateProp} ? "-" : ${valueName} ? "x" : ""}</RNText>`);
  lines.push(`${INDENT}${INDENT}${INDENT}</View>`);
  lines.push(`${INDENT}${INDENT}${INDENT}{typeof children === "string" ? <RNText style={styles.label}>{children}</RNText> : children}`);
  lines.push(`${INDENT}${INDENT}</Pressable>`);
  lines.push(`${INDENT});`);
  return lines;
}

function propDestructureEntries(ir: ComponentIR, usage: RuntimeUsage): string[] {
  const entries: string[] = [];
  const emitted = new Set<string>();
  for (const prop of ir.styledProps) {
    if (RESERVED_PROPS.has(prop.name)) continue;
    const channel = ir.behavior.normalizedChannels.find((c) => c.valueProp === prop.name);
    const channelIsUsed = channel ? usage.channels.has(channel.name) : false;
    if (!usage.props.has(prop.safeName) && !channelIsUsed) continue;
    if (channel && channelIsUsed) {
      entries.push(`${prop.safeName}: controlled${capitalize(channel.name)}`);
    } else {
      const suffix = prop.defaultExpr ? ` = ${prop.defaultExpr}` : "";
      entries.push(`${prop.safeName}${suffix}`);
    }
    emitted.add(prop.safeName);
  }
  for (const modifier of synthesizedVariantProps(ir)) {
    if (emitted.has(modifier.safeName) || !usage.props.has(modifier.safeName)) continue;
    const suffix = modifier.defaultExpr ? ` = ${modifier.defaultExpr}` : "";
    entries.push(`${modifier.safeName}${suffix}`);
    emitted.add(modifier.safeName);
  }
  for (const channel of ir.behavior.normalizedChannels) {
    if (!usage.channels.has(channel.name)) continue;
    if (channel.defaultValueProp && !emitted.has(channel.defaultValueProp)) {
      entries.push(
        `${channel.defaultValueProp} = ${defaultForChannel(channel)}`,
      );
      emitted.add(channel.defaultValueProp);
    }
    if (usage.channelSetters.has(channel.name) && !emitted.has(channel.changeHandlerProp)) {
      entries.push(channel.changeHandlerProp);
      emitted.add(channel.changeHandlerProp);
    }
  }
  if (rnAnchoredSurface(ir) && !emitted.has("content")) {
    entries.push("content");
    emitted.add("content");
  }
  if (collectRnNamedSlots(ir.dom).length > 0) entries.push("slots");
  if (usage.props.has("children")) entries.push("children");
  if (rootPressableAcceptsOnPress(ir)) entries.push("onPress");
  entries.push("style", "testID", "accessibilityLabel", "accessibilityLabelledBy");
  return entries;
}

function emitChannelState(
  ir: ComponentIR,
  channel: NormalizedChannelIR,
  needsSetter: boolean,
  needsValue: boolean,
): string[] {
  const cap = capitalize(channel.name);
  const controlled = `controlled${cap}`;
  const value = channel.name;
  const setter = `set${cap}Value`;
  const internal = `uncontrolled${cap}`;
  const setInternal = `setUncontrolled${cap}`;
  const handler = channel.changeHandlerProp;
  const type = tsTypeForChannel(ir, channel);
  const initial = channel.defaultValueProp
    ? `${channel.defaultValueProp} ?? ${defaultForChannel(channel)}`
    : defaultForChannel(channel);
  const lines: string[] = [];
  lines.push(
    `${INDENT}const [${needsValue ? internal : ""}${needsSetter ? `, ${setInternal}` : ""}] = useState<${type}>((${initial}) as ${type});`,
  );
  if (needsValue) lines.push(`${INDENT}const ${value} = ${controlled} ?? ${internal};`);
  if (needsSetter) {
    lines.push(`${INDENT}const ${setter} = useCallback((next: ${type}) => {`);
    lines.push(`${INDENT}${INDENT}if (${controlled} === undefined) ${setInternal}(next);`);
    lines.push(`${INDENT}${INDENT}${handler}?.(next);`);
    lines.push(`${INDENT}}, [${controlled}, ${handler}]);`);
  }
  lines.push("");
  return lines;
}

/**
 * One lookup const per realized variant axis, selecting the per-variant
 * StyleSheet entry from the axis prop value. Raw contract values key the map
 * (they may contain hyphens, e.g. "extra-large"), sanitized keys name the
 * registered styles.
 */
function emitVariantStyleConsts(ir: ComponentIR): string[] {
  if (!ir.dom) return [];
  const facts = variantStyleFacts(ir);
  const rootIsText = rootIsTextComponent(ir);
  const lines: string[] = [];
  for (const axis of realizedVariantAxes(ir)) {
    const axisFacts = facts.filter((fact) => fact.axis === axis);
    const safeName = axisFacts[0]!.axisSafeName;
    const viewPairs = axisFacts
      .filter((fact) =>
        (rootIsText ? fact.viewEntries.length + fact.textEntries.length : fact.viewEntries.length) > 0,
      )
      .map((fact) => `${JSON.stringify(fact.value)}: styles.${fact.styleKey}`);
    if (viewPairs.length > 0) {
      lines.push(
        `${INDENT}const ${variantStyleConstName(safeName)} = ${safeName} !== undefined ? ({ ${viewPairs.join(", ")} } as Record<string, ${rootStyleType(ir)} | undefined>)[${safeName}] : undefined;`,
      );
    }
    if (!rootIsText && rootRendersTextWrapper(ir)) {
      const textPairs = axisFacts
        .filter((fact) => fact.textEntries.length > 0)
        .map((fact) => `${JSON.stringify(fact.value)}: styles.${fact.textStyleKey}`);
      if (textPairs.length > 0) {
        lines.push(
          `${INDENT}const ${textVariantStyleConstName(safeName)} = ${safeName} !== undefined ? ({ ${textPairs.join(", ")} } as Record<string, TextStyle | undefined>)[${safeName}] : undefined;`,
        );
      }
    }
    for (const state of stateStyleFacts(ir)) {
      if (!loweredStateKeys(ir).includes(state.stateKey)) continue;
      const statePairs = axisFacts
        .filter((fact) => state.variantEntries.has(fact.styleKey))
        .map(
          (fact) =>
            `${JSON.stringify(fact.value)}: styles.${fact.styleKey}_${state.stateKey}`,
        );
      if (statePairs.length > 0) {
        lines.push(
          `${INDENT}const ${stateVariantStyleConstName(state.stateKey, safeName)} = ${safeName} !== undefined ? ({ ${statePairs.join(", ")} } as Record<string, ${rootStyleType(ir)} | undefined>)[${safeName}] : undefined;`,
        );
      }
    }
  }
  // Em-sized parts select their per-variant geometry entry from the same
  // axis prop that drives the root/text variant consts above.
  for (const part of emSizedParts(ir)) {
    // A componentRef owns its visual geometry through its own props/styles.
    // The host component must not emit a dead local selection constant for
    // the replaced DOM part (for example Button.spinner -> Spinner).
    if (findDomNodeForPart(ir.dom, part.part)?.componentInstance) continue;
    const pairs = facts
      .filter((fact) => fact.axis === part.axis)
      .filter((fact) => emSizeStyleEntries(fact, part.factor).length > 0)
      .map(
        (fact) =>
          `${JSON.stringify(fact.value)}: styles.${part.styleKey}_variant_${sanitizeStyleKey(fact.value)}`,
      );
    if (pairs.length === 0) continue;
    lines.push(
      `${INDENT}const ${part.styleKey}StyleFor${capitalize(part.axisSafeName)} = ${part.axisSafeName} !== undefined ? ({ ${pairs.join(", ")} } as Record<string, ViewStyle | undefined>)[${part.axisSafeName}] : undefined;`,
    );
  }
  return lines;
}

function findDomNodeForPart(
  node: DomNodeIR,
  part: string,
): DomNodeIR | undefined {
  if (node.part === part) return node;
  for (const child of node.children) {
    const match = findDomNodeForPart(child, part);
    if (match) return match;
  }
  return undefined;
}

/**
 * Whether the generated root renders an RNText wrapper for string children
 * or bound text content (the spot rootText styling attaches to).
 */
/**
 * Variant-axis modifiers that need a synthesized prop on the RN surface:
 * either not contract-declared at all, or declared (web synthesizes from the
 * class recipe either way; styledProps-declared axes are emitted normally).
 */
function synthesizedVariantProps(
  ir: ComponentIR,
): ComponentIR["classRecipe"]["valueModifiers"] {
  if (usesNativeToggle(ir)) return [];
  const declared = new Set(ir.styledProps.map((prop) => prop.safeName));
  return ir.classRecipe.valueModifiers.filter(
    (modifier) => !declared.has(modifier.safeName),
  );
}

function rootRendersTextWrapper(ir: ComponentIR): boolean {
  const node = ir.dom;
  if (!node) return false;
  const component = rnComponentForNode(node);
  if (component === "RNText" || VOID_RN_COMPONENTS.has(component)) return false;
  if (node.content) return true;
  if (node.children.length === 0 && node.part === "root") return true;
  return node.children.some(
    (child) => child.tag === "children" || child.tag === "slot",
  );
}

/**
 * Whether each interactive state can be lowered for this component's root:
 * pressed needs a Pressable host; disabled needs a disabled prop to read.
 */
function loweredStateKeys(ir: ComponentIR): RnStateKey[] {
  if (!ir.dom || usesNativeToggle(ir)) return [];
  const rootIsPressable = rnComponentForNode(ir.dom) === "Pressable";
  const hasDisabledProp = Boolean(findProp(ir, "disabled"));
  return stateStyleFacts(ir)
    .map((state) => state.stateKey)
    .filter((stateKey) =>
      stateKey === "pressed" ? rootIsPressable : hasDisabledProp,
    );
}

/**
 * Per-state style expressions joining the root style array, in emit order:
 * the root-scope state entry first, then per-axis variant-state lookup
 * consts (emitted by emitVariantStyleConsts).
 */
function stateStyleExpressions(ir: ComponentIR): Map<RnStateKey, string[]> {
  const out = new Map<RnStateKey, string[]>();
  const lowered = new Set(loweredStateKeys(ir));
  for (const state of stateStyleFacts(ir)) {
    if (!lowered.has(state.stateKey)) continue;
    const exprs: string[] = [];
    if (state.rootEntries.length > 0) {
      exprs.push(`styles.root_state_${state.stateKey}`);
    }
    for (const axis of realizedVariantAxes(ir)) {
      const axisFacts = variantStyleFacts(ir).filter((fact) => fact.axis === axis);
      if (axisFacts.some((fact) => state.variantEntries.has(fact.styleKey))) {
        exprs.push(stateVariantStyleConstName(state.stateKey, axisFacts[0]!.axisSafeName));
      }
    }
    if (exprs.length > 0) out.set(state.stateKey, exprs);
  }
  return out;
}

function stateVariantStyleConstName(stateKey: RnStateKey, axisSafeName: string): string {
  return `${stateKey}StyleFor${capitalize(axisSafeName)}`;
}

/** Variant style const names that should join the root style array. */
function rootVariantStyleConstNames(ir: ComponentIR): string[] {
  if (!ir.dom || usesNativeToggle(ir)) return [];
  const facts = variantStyleFacts(ir);
  const rootIsText = rootIsTextComponent(ir);
  const names: string[] = [];
  for (const axis of realizedVariantAxes(ir)) {
    const axisFacts = facts.filter((fact) => fact.axis === axis);
    const hasView = axisFacts.some((fact) =>
      (rootIsText ? fact.viewEntries.length + fact.textEntries.length : fact.viewEntries.length) > 0,
    );
    if (hasView) names.push(variantStyleConstName(axisFacts[0]!.axisSafeName));
  }
  return names;
}

/**
 * Style expression for the root text wrapper (string children / root content)
 * when the root host cannot carry text props itself: the base rootText entry
 * plus any per-axis text variant consts.
 */
function rootTextStyleExpression(ir: ComponentIR): string | null {
  if (!ir.dom || usesNativeToggle(ir) || rootIsTextComponent(ir)) return null;
  if (!rootRendersTextWrapper(ir)) return null;
  const parts: string[] = [];
  const hasBase = joinedScopeStyleEntries(ir, "root").some(
    (entry) => entry.layer === "text",
  );
  if (hasBase) parts.push("styles.rootText");
  for (const axis of realizedVariantAxes(ir)) {
    const axisFacts = variantStyleFacts(ir).filter((fact) => fact.axis === axis);
    if (axisFacts.some((fact) => fact.textEntries.length > 0)) {
      parts.push(textVariantStyleConstName(axisFacts[0]!.axisSafeName));
    }
  }
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0]! : `[${parts.join(", ")}]`;
}

/**
 * Anchored presence surface (tooltip/popover) — RN platform adaptation.
 * The trigger renders children inside a Pressable whose position is
 * measured via measureInWindow when opening; the surface content renders
 * in a transparent Modal absolutely positioned from that rect. Divergences
 * (documented; contract-neutral): outside content is inert while open,
 * hover/focus open-triggers lower to long-press, pointer-leave dismissal
 * lowers to backdrop press.
 */
function emitAnchoredSurfaceReturn(
  ir: ComponentIR,
  lowering: RnAnchoredSurfaceLowering,
): string[] {
  const channel = lowering.openChannel;
  const value = channel.name;
  const setter = `set${capitalize(channel.name)}Value`;
  const placement = lowering.placementProp
    ? safePropName(ir, lowering.placementProp)
    : undefined;
  const hasDisabled = Boolean(findProp(ir, "disabled"));
  const triggerToggle =
    lowering.triggerEvent === "onPress"
      ? `() => { if (${value}) { ${setter}(false); } else { openFromAnchor(); } }`
      : `() => openFromAnchor()`;
  const escapeHandler = lowering.escapeDeclared
    ? lowering.escapeTrigger?.enabledByProp
      ? `() => { if (${safePropName(ir, lowering.escapeTrigger.enabledByProp)} ?? ${lowering.escapeTrigger.defaultEnabled}) ${setter}(false); }`
      : `() => ${setter}(false)`
    : undefined;
  const backdropHandler = lowering.backdropDismiss
    ? lowering.backdropTrigger?.enabledByProp
      ? `() => { if (${safePropName(ir, lowering.backdropTrigger.enabledByProp)} ?? ${lowering.backdropTrigger.defaultEnabled}) ${setter}(false); }`
      : `() => ${setter}(false)`
    : undefined;

  const lines: string[] = [];
  lines.push(
    `${INDENT}const anchorRef = useRef<View>(null);`,
    `${INDENT}const [anchorRect, setAnchorRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);`,
    `${INDENT}const openFromAnchor = useCallback(() => {`,
    ...(hasDisabled ? [`${INDENT}${INDENT}if (disabled) return;`] : []),
    `${INDENT}${INDENT}const node = anchorRef.current;`,
    `${INDENT}${INDENT}if (!node) {`,
    `${INDENT}${INDENT}${INDENT}${setter}(true);`,
    `${INDENT}${INDENT}${INDENT}return;`,
    `${INDENT}${INDENT}}`,
    `${INDENT}${INDENT}node.measureInWindow((x, y, width, height) => {`,
    `${INDENT}${INDENT}${INDENT}setAnchorRect({ x, y, width, height });`,
    `${INDENT}${INDENT}${INDENT}${setter}(true);`,
    `${INDENT}${INDENT}});`,
    `${INDENT}}, [${hasDisabled ? "disabled, " : ""}${setter}]);`,
    `${INDENT}const contentPosition = (() => {`,
    `${INDENT}${INDENT}if (!anchorRect) return { position: "absolute" as const, left: 0, top: 0 };`,
    `${INDENT}${INDENT}const gap = 8;`,
    `${INDENT}${INDENT}const windowSize = Dimensions.get("window");`,
    ...(placement
      ? [
          `${INDENT}${INDENT}if (${placement} === "top") return { position: "absolute" as const, left: anchorRect.x, bottom: windowSize.height - anchorRect.y + gap };`,
          `${INDENT}${INDENT}if (${placement} === "left") return { position: "absolute" as const, right: windowSize.width - anchorRect.x + gap, top: anchorRect.y };`,
          `${INDENT}${INDENT}if (${placement} === "right") return { position: "absolute" as const, left: anchorRect.x + anchorRect.width + gap, top: anchorRect.y };`,
        ]
      : []),
    `${INDENT}${INDENT}void windowSize;`,
    `${INDENT}${INDENT}return { position: "absolute" as const, left: anchorRect.x, top: anchorRect.y + anchorRect.height + gap };`,
    `${INDENT}})();`,
    "",
    `${INDENT}return (`,
    `${INDENT}${INDENT}<>`,
    `${INDENT}${INDENT}${INDENT}<Pressable`,
    `${INDENT}${INDENT}${INDENT}${INDENT}ref={anchorRef}`,
    `${INDENT}${INDENT}${INDENT}${INDENT}testID={testID}`,
    `${INDENT}${INDENT}${INDENT}${INDENT}style={[styles.trigger, style]}`,
    ...(hasDisabled ? [`${INDENT}${INDENT}${INDENT}${INDENT}disabled={disabled}`] : []),
    `${INDENT}${INDENT}${INDENT}${INDENT}${lowering.triggerEvent}={${triggerToggle}}`,
    `${INDENT}${INDENT}${INDENT}${INDENT}accessibilityLabel={accessibilityLabel}`,
    `${INDENT}${INDENT}${INDENT}${INDENT}accessibilityLabelledBy={accessibilityLabelledBy}`,
    // A contract aria-expanded relationship FROM the trigger lowers to RN's
    // accessibilityState.expanded (the native-mobile surface for that state);
    // driven by the contract fact, not a Popover name check. Gated on the same
    // open channel the web families bind aria-expanded to.
    ...(triggerDeclaresAriaExpanded(ir)
      ? [`${INDENT}${INDENT}${INDENT}${INDENT}accessibilityState={{ expanded: Boolean(${value}) }}`]
      : []),
    `${INDENT}${INDENT}${INDENT}>`,
    `${INDENT}${INDENT}${INDENT}${INDENT}{typeof children === "string" ? <RNText>{children}</RNText> : children}`,
    `${INDENT}${INDENT}${INDENT}</Pressable>`,
    `${INDENT}${INDENT}${INDENT}<Modal`,
    `${INDENT}${INDENT}${INDENT}${INDENT}visible={Boolean(${value})}`,
    `${INDENT}${INDENT}${INDENT}${INDENT}transparent`,
    `${INDENT}${INDENT}${INDENT}${INDENT}animationType="fade"`,
    ...(escapeHandler
      ? [`${INDENT}${INDENT}${INDENT}${INDENT}onRequestClose={${escapeHandler}}`]
      : []),
    `${INDENT}${INDENT}${INDENT}>`,
    `${INDENT}${INDENT}${INDENT}${INDENT}<Pressable`,
    `${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}`,
    ...(backdropHandler
      ? [`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}onPress={${backdropHandler}}`]
      : []),
    `${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}accessible={false}`,
    `${INDENT}${INDENT}${INDENT}${INDENT}>`,
    `${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}<View style={[styles.content, contentPosition]}>`,
    `${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}{typeof content === "string" ? <RNText>{content}</RNText> : content}`,
    `${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}</View>`,
    `${INDENT}${INDENT}${INDENT}${INDENT}</Pressable>`,
    `${INDENT}${INDENT}${INDENT}</Modal>`,
    `${INDENT}${INDENT}</>`,
    `${INDENT});`,
  );
  return lines;
}

function emitNativeToggleReturn(ir: ComponentIR): string[] {
  const channel = ir.behavior.normalizedChannels[0];
  if (!channel) {
    throw new Error(
      `generateReactNativeComponentSource: ${ir.name} declares native-toggle-affordance but no channel.`,
    );
  }
  const valueName = channel.name;
  const setterName = `set${capitalize(channel.name)}Value`;
  const disabledProp = findProp(ir, "disabled") ? "disabled" : "false";
  // Track/thumb colors resolve from the slots the CONTRACT actually declares,
  // matched by semantic suffix — the canonical `color.track.background.*`
  // names when present (Switch), else the component's own background slots
  // (`color.background.default` / `.checked`, ToggleSwitch). A component that
  // declares no thumb slot renders the platform thumb color.
  const trackFalseSlot = declaredTokenSlotName(ir, [
    "color.track.background",
    "color.background.default",
  ]);
  const trackTrueSlot = declaredTokenSlotName(ir, [
    "color.track.background",
    "color.background.checked",
  ]);
  const thumbSlot = declaredTokenSlotName(ir, ["color.thumb.background"]);
  const trackFalse = trackFalseSlot
    ? tokenStringAccess(ir, "root", trackFalseSlot)
    : undefined;
  const trackTrue = trackTrueSlot
    ? tokenStringFallbackAccess(ir, trackTrueSlot, ["checked", "root"])
    : undefined;
  const thumbColor = thumbSlot
    ? tokenStringFallbackAccess(ir, thumbSlot, ["checked", "root"])
    : undefined;
  const styleName = variantStyleExpression(ir);
  const lines: string[] = [];
  lines.push(`${INDENT}return (`);
  lines.push(`${INDENT}${INDENT}<RNSwitch`);
  lines.push(`${INDENT}${INDENT}${INDENT}testID={testID}`);
  lines.push(`${INDENT}${INDENT}${INDENT}style={[${styleName}, style]}`);
  lines.push(`${INDENT}${INDENT}${INDENT}value={${valueName}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}onValueChange={${setterName}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}disabled={${disabledProp}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}accessibilityLabel={accessibilityLabel}`);
  lines.push(`${INDENT}${INDENT}${INDENT}accessibilityLabelledBy={accessibilityLabelledBy}`);
  lines.push(`${INDENT}${INDENT}${INDENT}accessibilityRole="switch"`);
  lines.push(`${INDENT}${INDENT}${INDENT}accessibilityState={{ checked: ${valueName}, disabled: ${disabledProp} }}`);
  if (trackFalse || trackTrue) {
    lines.push(
      `${INDENT}${INDENT}${INDENT}trackColor={{ false: ${trackFalse ?? "undefined"}, true: ${trackTrue ?? "undefined"} }}`,
    );
  }
  if (trackFalse) {
    lines.push(`${INDENT}${INDENT}${INDENT}ios_backgroundColor={${trackFalse}}`);
  }
  if (thumbColor) {
    lines.push(`${INDENT}${INDENT}${INDENT}thumbColor={${thumbColor}}`);
  }
  lines.push(`${INDENT}${INDENT}/>`); 
  lines.push(`${INDENT});`);
  return lines;
}

function emitNode(
  node: DomNodeIR | undefined,
  ir: ComponentIR,
  depth: number,
  keyExpr?: string,
): string | null {
  if (!node) return null;
  // No native countdown executor is admitted; omit its decorative carrier.
  if (ir.motion.countdown && ir.motion.countdown.target.name === node.part) return null;
  if (node.tag === "children" || node.tag === "slot") {
    // ARCH-COMPOSER-SLOT-PROJECTION-001: project named slots distinctly via the
    // `slots` prop (parity with React/Vue/Lit/Angular), not a single `{children}`
    // sprayed into every region. The default (unnamed) slot stays `{children}`.
    if (node.slotName) return `${INDENT.repeat(depth)}{slots?.${node.slotName}}`;
    return `${INDENT.repeat(depth)}{children}`;
  }
  if (node.componentInstance) return emitComponentRefNode(node, node.componentInstance, ir, depth);
  if (node.iteration) return emitIteration(node, ir, depth);


  // Native has no label activation forwarding or radio widget. Collapse a
  // label's nested radio into one accessible, visible press target.
  const radio = node.tag === "label"
    ? node.children.find(child => child.tag === "input" && child.attrs.type === "radio")
    : undefined;
  if (radio?.bindings.checked) {
    const target: DomNodeIR = {
      ...node, tag: "button", attrs: { ...node.attrs, role: "radio" },
      bindings: { ...node.bindings, ...radio.bindings },
      events: { ...node.events, ...radio.events },
      children: node.children.filter(child => child !== radio),
    };
    const pad = INDENT.repeat(depth);
    const attrs = emitNodeProps(target, ir, "Pressable", depth + 1, keyExpr)
      .filter(line => !line.trimStart().startsWith("style="));
    attrs.push(`${pad}${INDENT}style={[styles.${styleKeyForPart(node.part)}${selectionStyleAppendix(node, ir)}, { flexDirection: "row", alignItems: "center", minHeight: 44 }]}`);
    const checked = bindingExpr(radio.bindings.checked, ir);
    const rendered = [`${pad}<Pressable`, ...attrs, `${pad}>`,
      `${pad}${INDENT}<RNText accessible={false}>{${checked} ? "◉ " : "○ "}</RNText>`,
      ...emitNodeChildren(target, ir, depth + 1), `${pad}</Pressable>`].join("\n");
    return applyIfGuard(rendered, node, ir, pad);
  }

  const isOverlay = node.part !== undefined && node.part === surfaceOverlayPartName(ir);
  const component = isOverlay ? "Pressable" : rnComponentForNodeInIr(ir, node);
  const attrs = emitNodeProps(node, ir, component, depth + 1, keyExpr);
  const childLines = emitNodeChildren(node, ir, depth + 1);
  const pad = INDENT.repeat(depth);
  let rendered: string;
  if (VOID_RN_COMPONENTS.has(component) || childLines.length === 0) {
    rendered = [`${pad}<${component}`, ...attrs, `${pad}/>`].join("\n");
  } else {
    rendered = [`${pad}<${component}`, ...attrs, `${pad}>`, ...childLines, `${pad}</${component}>`].join("\n");
  }
  // A non-modal surface renders no overlay (the web backdrop is hidden too).
  return applyIfGuard(rendered, node, ir, pad, isOverlay ? rnModalityGateProp(ir) : undefined);
}

/**
 * Emit a `componentRef` node as the referenced DS-RN component
 * (CODEGEN-RECURSIVE-COMPOSITION-01). The RN DS components are generated from
 * the SAME contracts as the web build, so the IR's resolved prop names
 * (`ariaLabel`, `src`, `alt`, …) map directly to RN component props — no
 * HTML→primitive translation. Consumes the classified ComponentInstanceIR:
 *   - kind:"prop" binding → `targetProp={expr}`
 *   - kind:"attribute" binding → skipped (RN components don't take host attrs)
 *   - events: `click` → RN's `onPress` convention, others → `on<Event>`
 *   - static attrs that are props → `prop="value"`; children recurse.
 */
function emitComponentRefNode(
  node: DomNodeIR,
  instance: ComponentInstanceIR,
  ir: ComponentIR,
  depth: number,
): string {
  const pad = INDENT.repeat(depth);
  const propPad = INDENT.repeat(depth + 1);
  const component = instance.ref;
  const props: string[] = [];

  for (const b of instance.bindings) {
    if (b.kind !== "prop" || !b.targetProp) continue;
    props.push(`${propPad}${b.targetProp}={${bindingExpr(b.expr, ir)}}`);
  }
  for (const a of instance.attrs) {
    if (a.kind !== "prop" || !a.targetProp) continue;
    props.push(`${propPad}${a.targetProp}="${a.value}"`);
  }
  for (const ev of instance.events) {
    // Prefer the target's RESOLVED handler prop (e.g. `onClick`, from the
    // referenced component's contract). Only when the target declares no
    // handler prop fall back to RN's native press convention (`click` →
    // `onPress`) so an undeclared event still wires to a pressable.
    const handlerProp =
      ev.targetHandlerProp ??
      (ev.name === "click"
        ? "onPress"
        : `on${ev.name.charAt(0).toUpperCase()}${ev.name.slice(1)}`);
    props.push(`${propPad}${handlerProp}={${bindingExpr(ev.expr, ir)}}`);
  }

  const childLines = emitNodeChildren(node, ir, depth + 1);
  let rendered: string;
  if (childLines.length === 0) {
    rendered = [`${pad}<${component}`, ...props, `${pad}/>`].join("\n");
  } else {
    rendered = [
      `${pad}<${component}`,
      ...props,
      `${pad}>`,
      ...childLines,
      `${pad}</${component}>`,
    ].join("\n");
  }
  return applyIfGuard(rendered, node, ir, pad);
}

function emitNodeChildren(node: DomNodeIR, ir: ComponentIR, depth: number): string[] {
  const sequence = ir.motion.sequence;
  if (sequence && node.part === sequence.viewport) return [`${INDENT.repeat(depth)}<SequenceChildren sequence={sequence} labels={${safePropName(ir, sequence.itemsProp)}} />`];
  if (sequence && node.part === sequence.rotation) return [`${INDENT.repeat(depth)}<RNText>{sequence.playing ? ${JSON.stringify(sequence.labels.stop)} : ${JSON.stringify(sequence.labels.start)}}</RNText>`];
  const textStyleExpr = node === ir.dom ? rootTextStyleExpression(ir) : null;
  const textStyleProp = textStyleExpr ? ` style={${textStyleExpr}}` : "";
  if (node.content) {
    // FEAT-CODEBLOCK-HIGHLIGHT-01: a content transform degrades to plain
    // text on React Native — RNText renders the source binding verbatim;
    // there are no DOM spans to realize token parts.
    const contentBinding = isContentTransform(node.content)
      ? node.content.source
      : node.content;
    return [
      `${INDENT.repeat(depth)}<RNText${rnComponentForNode(node) === "RNText" ? "" : textStyleProp}>{${bindingExpr(contentBinding, ir)}}</RNText>`,
    ];
  }
  const lines: string[] = [];
  for (const child of node.children) {
    if (child.tag === "slot" && child.slotName) {
      // ARCH-COMPOSER-SLOT-PROJECTION-001: a named slot projects its own
      // `slots.<name>` content, distinct from the default `{children}`.
      lines.push(`${INDENT.repeat(depth)}{slots?.${child.slotName}}`);
      continue;
    }
    if (child.tag === "children" || child.tag === "slot") {
      lines.push(
        emitChildrenSlot(rnComponentForNode(node), depth, maxLinesExpressionForNode(node, ir), textStyleProp),
      );
      continue;
    }
    const rendered = emitNode(child, ir, depth);
    if (rendered) lines.push(rendered);
  }
  if (node.children.length === 0 && node.part === "root") {
    lines.push(
      emitChildrenSlot(rnComponentForNode(node), depth, maxLinesExpressionForNode(node, ir), textStyleProp),
    );
  }
  return lines;
}

function emitChildrenSlot(
  parentComponent: string,
  depth: number,
  numberOfLinesExpr?: string,
  textStyleProp = "",
): string {
  const pad = INDENT.repeat(depth);
  if (parentComponent === "RNText") return `${pad}{children}`;
  const linesProp = numberOfLinesExpr ? ` numberOfLines={${numberOfLinesExpr}}` : "";
  return `${pad}{typeof children === "string" ? <RNText${linesProp}${textStyleProp}>{children}</RNText> : children}`;
}

function emitNodeProps(
  node: DomNodeIR,
  ir: ComponentIR,
  component: string,
  depth: number,
  keyExpr?: string,
): string[] {
  const pad = INDENT.repeat(depth);
  const props: string[] = [];
  const styleKey = styleKeyForPart(node.part);
  const isRootNode = node === ir.dom;
  const dynamicStyleEntries = rnDynamicStyleEntries(node, ir, component);
  const dynamicStyle = dynamicStyleEntries.length > 0
    ? `, { ${dynamicStyleEntries.join(", ")} }`
    : "";
  const fillWidthBinding = nativeFillWidthBinding(node);
  if (fillWidthBinding) {
    const fillExpr = bindingExpr(fillWidthBinding.value, ir);
    props.push(`${pad}style={[styles.${styleKey}, { width: \`\${Math.max(0, Math.min(100, Number(${fillExpr} ?? 0)))}%\` }]}`);
  } else if (isRootNode) {
    const variantConsts = rootVariantStyleConstNames(ir)
      .map((name) => `, ${name}`)
      .join("");
    const stateExprs = stateStyleExpressions(ir);
    const pressedExprs = stateExprs.get("pressed") ?? [];
    const disabledExprs = stateExprs.get("disabled") ?? [];
    const stateParts = [
      ...pressedExprs.map((expr) => `pressed ? ${expr} : undefined`),
      ...disabledExprs.map((expr) => `disabled ? ${expr} : undefined`),
    ]
      .map((part) => `, ${part}`)
      .join("");
    props.push(`${pad}testID={testID}`);
    if (pressedExprs.length > 0) {
      props.push(
        `${pad}style={({ pressed }) => [styles.${styleKey}${variantConsts}${stateParts}${dynamicStyle}, style]}`,
      );
    } else {
      props.push(`${pad}style={[styles.${styleKey}${variantConsts}${stateParts}${dynamicStyle}, style]}`);
    }
  } else if (dynamicStyleEntries.length > 0) {
    props.push(
      `${pad}style={[styles.${styleKey}${dynamicStyle}${selectionStyleAppendix(node, ir)}]}`,
    );
  } else if (emPartSizeConsts(node, ir).length > 0) {
    const consts = emPartSizeConsts(node, ir)
      .map((name) => `, ${name}`)
      .join("");
    props.push(
      `${pad}style={[styles.${styleKey}${consts}${selectionStyleAppendix(node, ir)}]}`,
    );
  } else if (selectionStyleAppendix(node, ir)) {
    props.push(
      `${pad}style={[styles.${styleKey}${selectionStyleAppendix(node, ir)}]}`,
    );
  } else {
    props.push(`${pad}style={styles.${styleKey}}`);
  }
  if (keyExpr) props.unshift(`${pad}key={${keyExpr}}`);

  if (node.part !== undefined && node.part === surfaceOverlayPartName(ir)) {
    const lowering = rnSurfaceModalLowering(ir)!;
    props.push(
      `${pad}onPress={${surfaceDismissHandlerExpr(ir, lowering, lowering.outsideTrigger)}}`,
    );
  }

  const accessibilityState: string[] = [];
  const sequence = ir.motion.sequence;
  if (sequence) {
    if (isRootNode) props.push(`${pad}onTouchStart={sequence.touchStart}`, `${pad}onTouchEnd={sequence.touchEnd}`, `${pad}onTouchCancel={sequence.touchEnd}`);
    const action = node.part === sequence.next ? "next" : node.part === sequence.previous ? "previous" : undefined;
    const isRotation = node.part === sequence.rotation;
    const isPicker = node.part === sequence.picker;
    if (action || isRotation || isPicker) {
      props.push(`${pad}disabled={!sequence.valid}`, `${pad}onFocus={sequence.stop}`);
      accessibilityState.push("disabled: !sequence.valid");
      if (action) props.push(`${pad}onPress={sequence.${action}}`);
      if (isRotation) props.push(`${pad}onPressIn={sequence.rotatePressIn}`, `${pad}onPress={sequence.rotate}`,
        `${pad}accessibilityLabel={sequence.playing ? ${JSON.stringify(sequence.labels.stop)} : ${JSON.stringify(sequence.labels.start)}}`);
      if (isPicker) {
        props.push(`${pad}onPress={() => sequence.select(index)}`);
        accessibilityState.push("selected: index === sequence.index");
      }
      if (!isRotation && node.attrs["aria-label"]) props.push(`${pad}accessibilityLabel=${JSON.stringify(node.attrs["aria-label"])}`);
    }
  }
  let hasAccessibilityLabel = false;
  let hasAccessibilityLabelledBy = false;
  for (const [name, value] of Object.entries(node.attrs)) {
    const mapped = staticAttributeProp(name, value);
    if (mapped) props.push(`${pad}${mapped}`);
  }
  for (const [name, binding] of Object.entries(node.bindings)) {
    const expr = bindingExpr(binding, ir);
    if (name === "disabled") {
      if (component === "TextInput") {
        const readOnly = textInputReadOnlyExpr(node, ir);
        props.push(`${pad}editable={!(${expr}${readOnly ? ` || ${readOnly}` : ""})}`);
      }
      else props.push(`${pad}disabled={${expr}}`);
      accessibilityState.push(`disabled: ${expr}`);
      continue;
    }
    if (name === "aria-label") {
      props.push(
        `${pad}accessibilityLabel={${isRootNode ? `accessibilityLabel ?? ${expr}` : expr}}`,
      );
      hasAccessibilityLabel = true;
      continue;
    }
    if (name === "aria-labelledby") {
      props.push(
        `${pad}accessibilityLabelledBy={${isRootNode ? `accessibilityLabelledBy ?? ${expr}` : expr}}`,
      );
      hasAccessibilityLabelledBy = true;
      continue;
    }
    if (name === "aria-hidden") {
      props.push(`${pad}accessible={!(${rnBooleanishExpr(expr)})}`);
      continue;
    }
    if (name === "role") {
      props.push(
        `${pad}accessibilityRole={((${expr} === "presentation" ? "none" : ${expr}) as AccessibilityRole)}`,
      );
      continue;
    }
    if (name === "aria-disabled") {
      if (node.bindings.disabled) continue;
      accessibilityState.push(`disabled: ${rnBooleanishExpr(expr)}`);
      continue;
    }
    if (name === "aria-checked") {
      if (node.bindings.checked) continue;
      accessibilityState.push(`checked: ${rnBooleanishExpr(expr)}`);
      continue;
    }
    if (name === "aria-expanded") {
      accessibilityState.push(`expanded: ${rnBooleanishExpr(expr)}`);
      continue;
    }
    if (name === "aria-pressed") {
      accessibilityState.push(`selected: ${rnBooleanishExpr(expr)}`);
      continue;
    }
    if (name === "aria-current") {
      // Native accessibility has a selected state rather than ARIA's current
      // token vocabulary. Preserve boolean and named-current bindings.
      accessibilityState.push(`selected: Boolean(${expr}) && String(${expr}) !== "false"`);
      continue;
    }
    if (name === "aria-selected") {
      accessibilityState.push(`selected: ${rnBooleanishExpr(expr)}`);
      continue;
    }
    if (name === "aria-busy") {
      accessibilityState.push(`busy: ${rnBooleanishExpr(expr)}`);
      continue;
    }
    if (name === "aria-live") {
      props.push(`${pad}accessibilityLiveRegion={${expr}}`);
      continue;
    }
    if (name === "checked") {
      accessibilityState.push(`checked: Boolean(${expr})`);
      continue;
    }
    if (name === "aria-valuenow") {
      props.push(`${pad}accessibilityValue={{ min: 0, max: 100, now: Number(${expr} ?? 0) }}`);
      continue;
    }
    if (name === "value" && component === "TextInput") {
      props.push(`${pad}value={String(${expr} ?? "")}`);
      continue;
    }
    if (name === "placeholder" && component === "TextInput") {
      props.push(`${pad}placeholder={${expr}}`);
      continue;
    }
    if (name === "src" && component === "RNImage") {
      props.push(`${pad}source={${expr} ? { uri: String(${expr}) } : undefined}`);
      continue;
    }
    if (name === "alt" && component === "RNImage") {
      props.push(
        `${pad}accessibilityLabel={${isRootNode ? `accessibilityLabel ?? ${expr}` : expr}}`,
      );
      hasAccessibilityLabel = true;
      continue;
    }
    if ((name === "width" || name === "height") && component === "RNImage") {
      continue;
    }
    if ((name === "loading" || name === "sizes") && component === "RNImage") {
      continue;
    }
    if (name === "type" && component === "TextInput") {
      props.push(`${pad}secureTextEntry={${expr} === "password"}`);
      continue;
    }
    if ((name === "aria-readonly" || name === "readonly") && component === "TextInput") {
      props.push(`${pad}readOnly={Boolean(${expr})}`);
      continue;
    }
    if (name === "href" && component === "Pressable") {
      props.push(`${pad}onPress={() => { if (${expr}) void Linking.openURL(String(${expr})); }}`);
      continue;
    }
  }
  for (const [eventName, binding] of Object.entries(node.events)) {
    const eventProp = eventPropFor(component, eventName);
    if (!eventProp) continue;
    props.push(`${pad}${eventProp}={${eventHandlerExpr(component, eventName, binding, ir, node.activation)}}`);
  }
  const hasOnPressEvent = Object.keys(node.events).some(
    (eventName) => eventPropFor(component, eventName) === "onPress",
  );
  if (isRootNode && component === "Pressable" && node.tag !== "a" && !hasOnPressEvent) {
    props.push(`${pad}onPress={onPress}`);
  }
  if (isRootNode && !hasAccessibilityLabel) {
    props.push(`${pad}accessibilityLabel={accessibilityLabel}`);
  }
  if (isRootNode && !hasAccessibilityLabelledBy) {
    props.push(`${pad}accessibilityLabelledBy={accessibilityLabelledBy}`);
  }
  if (!node.bindings.role) {
    const role = node.attrs.role ?? roleFromNode(node);
    const accessibilityRole = rnAccessibilityRole(
      role,
      component,
      node.bindings["aria-pressed"] !== undefined,
    );
    if (accessibilityRole) props.push(`${pad}accessibilityRole=${JSON.stringify(accessibilityRole)}`);
  }
  const selection = selectionLowering(ir);
  if (selection && selection.subjectNode === node) {
    accessibilityState.push(
      `selected: isEntrySelected(${selection.itemLocal}, ${selection.channel.name})`,
    );
  }
  if (accessibilityState.length > 0) {
    props.push(`${pad}accessibilityState={{ ${accessibilityState.join(", ")} }}`);
  }
  return props;
}

function rnComponentForNode(node: DomNodeIR): string {
  if (node.tag === "a") return "Pressable";
  if (node.tag === "input" && (node.attrs.type === "checkbox" || node.attrs.type === "radio")) return "Pressable";
  if (node.tag === "input") return "TextInput";
  if (node.tag === "img" || node.tag === "image") return "RNImage";
  if (node.tag === "button" || node.attrs.role === "button") return "Pressable";
  if (node.tag === "p" || node.tag === "strong" || node.tag === "em" || node.tag === "small") return "RNText";
  return "View";
}

/**
 * A part is text-bearing when its resolved style carries any text-layer
 * property (`color`, `fontSize`, …). RN's `<View>` rejects `TextStyle` fields,
 * so such a part must render as `<Text>`. Derived from the style map's
 * `layer === "text"` classification — no component names, no slot heuristics —
 * so it generalizes to every composer's text regions (label, help, error, …)
 * instead of being special-cased per component.
 */
function partIsTextBearing(ir: ComponentIR, node: DomNodeIR): boolean {
  // The structural component decision already covers native text tags and
  // interactive elements; only the View-fallthrough parts can be misrouted.
  if (rnComponentForNode(node) !== "View") return false;
  if (node.part === undefined) return false;
  const styleLiteral = nativeStyleForKey(ir, styleKeyForPart(node.part));
  return textStyleFields().some((field) => styleLiteral.includes(`${field}:`));
}

/** RN style fields classified as text-layer (`color`, `fontSize`, …). */
function textStyleFields(): string[] {
  return Object.values(CSS_TO_RN_STYLE)
    .filter((m) => m.layer === "text")
    .map((m) => m.prop);
}

function rnComponentForNodeInIr(ir: ComponentIR, node: DomNodeIR): string {
  const base = rnComponentForNode(node);
  if (base === "View" && partIsTextBearing(ir, node)) return "RNText";
  return base;
}

/** Distinct named-slot names referenced in the DOM tree, in first-seen order. */
function collectRnNamedSlots(node: DomNodeIR | undefined): string[] {
  const names: string[] = [];
  const walk = (n: DomNodeIR | undefined): void => {
    if (!n) return;
    if (n.tag === "slot" && n.slotName && !names.includes(n.slotName)) {
      names.push(n.slotName);
    }
    for (const child of n.children) walk(child);
  };
  walk(node);
  return names;
}

function rnBooleanishExpr(expr: string): string {
  return `String(${expr}) === "true"`;
}

function treeHasBindingName(node: DomNodeIR | undefined, name: string): boolean {
  if (!node) return false;
  if (node.bindings[name]) return true;
  return node.children.some((child) => treeHasBindingName(child, name));
}

function isSupportedBindingForComponent(name: string, component: string): boolean {
  if (name.startsWith("data-")) return false;
  if (name === "aria-describedby") return false;
  if (name === "name" || name === "required" || name === "aria-invalid") return false;
  if (name === "htmlFor" || name === "form") return false;
  if (name === "type") return component === "TextInput";
  if (component === "RNImage") {
    return ["src", "alt", "width", "height"].includes(name);
  }
  if (component === "Pressable" && name === "href") return true;
  if (name === "target" || name === "rel") return false;
  if ((name === "aria-readonly" || name === "readonly") && component === "TextInput") {
    return true;
  }
  return !["src", "alt", "width", "height", "loading", "sizes"].includes(name);
}

function textInputReadOnlyExpr(node: DomNodeIR, ir: ComponentIR): string | undefined {
  const binding = node.bindings["aria-readonly"] ?? node.bindings.readonly;
  return binding ? `Boolean(${bindingExpr(binding, ir)})` : undefined;
}

function applyIfGuard(
  rendered: string,
  node: DomNodeIR,
  ir: ComponentIR,
  pad: string,
  extraGuard?: string,
): string {
  if (!node.ifProp && !node.ifSlot && !extraGuard) return rendered;
  // `if: "slot:<name>"`: the named slot arrives on the same `slots` prop the
  // slot node itself renders from.
  const expr = node.ifSlot
    ? `slots?.${node.ifSlot}`
    : node.ifProp
      ? ifGuardExpr(node.ifProp, ir)
      : undefined;
  const nodeGuard = expr === undefined ? undefined : node.ifNegated ? `!(${expr})` : expr;
  const guard = [nodeGuard, extraGuard].filter(Boolean).join(" && ");
  return [`${pad}{${guard} ? (`, rendered, `${pad}) : null}`].join("\n");
}

function ifGuardExpr(ifProp: string, ir: ComponentIR): string {
  if (ifProp === "children") return "children";
  const channel = channelForIfProp(ir, ifProp);
  if (channel) return channel.name;
  return safePropName(ir, ifProp);
}

function channelForIfProp(
  ir: ComponentIR,
  ifProp: string,
): NormalizedChannelIR | undefined {
  return ir.behavior.normalizedChannels.find(
    (channel) => channel.name === ifProp || channel.valueProp === ifProp,
  );
}

function rnDynamicStyleEntries(
  node: DomNodeIR,
  ir: ComponentIR,
  component: string,
): string[] {
  if (component !== "RNImage") return [];
  const entries: string[] = [];
  const width = node.bindings.width;
  const height = node.bindings.height;
  if (width) entries.push(`width: Number(${bindingExpr(width, ir)} ?? 0) || undefined`);
  if (height) entries.push(`height: Number(${bindingExpr(height, ir)} ?? 0) || undefined`);
  return entries;
}

function roleFromNode(node: DomNodeIR): string | undefined {
  if (node.tag === "a") return "link";
  if (node.tag === "button") return "button";
  if (node.tag === "img") return "image";
  if (node.tag === "input" && node.attrs.type === "checkbox") return "checkbox";
  if (node.tag === "input" && node.attrs.type === "radio") return "radio";
  return undefined;
}

function rnAccessibilityRole(
  role: string | undefined,
  component: string,
  hasPressedState = false,
): string | undefined {
  if (!role) return component === "RNText" ? "text" : undefined;
  if (role === "presentation") return "none";
  if (role === "switch") return "switch";
  if (role === "button" && hasPressedState) return "togglebutton";
  if (role === "button") return "button";
  if (role === "checkbox") return "checkbox";
  if (role === "radio" || role === "radiogroup") return role;
  if (role === "progressbar") return "progressbar";
  if (role === "img") return "image";
  if (role === "link") return "link";
  if (role === "tab") return "tab";
  if (role === "menu") return "menu";
  if (role === "menuitem") return "menuitem";
  if (role === "alert") return "alert";
  return undefined;
}

function rootPressableAcceptsOnPress(ir: ComponentIR): boolean {
  if (!ir.dom) return false;
  if (ir.dom.tag === "a") return false;
  return rnComponentForNode(ir.dom) === "Pressable" && Object.keys(ir.dom.events).length === 0;
}

function rootStyleType(ir: ComponentIR): "ImageStyle" | "TextStyle" | "ViewStyle" {
  const component = ir.dom ? rnComponentForNode(ir.dom) : "View";
  if (component === "RNImage") return "ImageStyle";
  if (component === "RNText") return "TextStyle";
  return "ViewStyle";
}

function staticAttributeProp(name: string, value: string): string | null {
  if (name === "id") return `nativeID=${JSON.stringify(value)}`;
  if (name === "aria-hidden" && value === "true") return "accessible={false}";
  if (name === "alt") return `accessibilityLabel=${JSON.stringify(value)}`;
  if (name === "aria-live" && (value === "polite" || value === "assertive")) {
    return `accessibilityLiveRegion=${JSON.stringify(value)}`;
  }
  return null;
}

function eventPropFor(component: string, eventName: string): string | null {
  if (
    component === "Pressable" &&
    (eventName === "click" || eventName === "press" || eventName === "change")
  ) {
    return "onPress";
  }
  if (component === "TextInput" && (eventName === "input" || eventName === "change")) {
    return "onChangeText";
  }
  return null;
}

function eventHandlerExpr(
  component: string,
  eventName: string,
  binding: BindingExpression,
  ir: ComponentIR,
  activation?: DomNodeIR["activation"],
): string {
  if (activation && eventName === "click") {
    const { channel, operation } = activation;
    const next = operation === "toggle" ? `!${channel.name}` : String(operation === "open");
    return `() => set${capitalize(channel.name)}Value(${next})`;
  }
  if (binding.kind === "paged") return pagedBindingExpression(binding, "pagedSet", binding.arg ? bindingExpr(binding.arg, ir) : undefined);
  if (binding.kind === "prop") {
    const propName = safePropName(ir, binding.prop);
    return `() => ${propName}?.()`;
  }
  if (binding.kind === "channelCall") {
    // FEAT-BINDING-CALL-WITH-ARG-01: invoke the channel's setter WITH the
    // per-item payload argument (replaces the self-assign no-op that a bare
    // non-boolean channel-click produced).
    const channel = ir.behavior.normalizedChannels.find((c) => c.name === binding.channel);
    if (channel) {
      const setter = `set${capitalize(channel.name)}Value`;
      return `() => ${setter}(${bindingExpr(binding.arg, ir)})`;
    }
    return "() => undefined";
  }
  if (binding.kind === "channelUpdate") {
    // FEAT-CHANNEL-UPDATE-OPERATIONS-01: compose the next value and pass it
    // through the channel's canonical setter. React Native is not in the
    // admission rail; for a native text input the payload arrives as the
    // `onChangeText` string arg, so setCharAt takes `(text)` and reads it
    // directly (no DOM event). toggleMembership needs no event.
    const channel = ir.behavior.normalizedChannels.find((c) => c.name === binding.channel);
    if (channel) {
      const setter = `set${capitalize(channel.name)}Value`;
      const operands = binding.operands.map((o) => bindingExpr(o, ir));
      const body = composeChannelUpdateExpression(binding.op, {
        current: channel.name,
        setter,
        eventValue: "text",
        operands,
      });
      const param = binding.op === "setCharAt" ? "(text: string)" : "()";
      return `${param} => ${body}`;
    }
    return "() => undefined";
  }
  if (binding.kind === "channel" && binding.field === "onChange") {
      const channel = ir.behavior.normalizedChannels.find((c) => c.name === binding.channel);
    if (channel) {
      const setter = `set${capitalize(channel.name)}Value`;
      if (
        component === "Pressable" ||
        eventName === "click" ||
        eventName === "press"
      ) {
        return channel.valueType === "boolean"
          ? `() => ${setter}(!${channel.name})`
          : `() => ${setter}(${channel.name})`;
      }
      return `(next: ${tsTypeForChannel(ir, channel)}) => ${setter}(next)`;
    }
  }
  if (binding.kind === "valueMap") return "() => undefined";
  return "() => undefined";
}

function bindingExpr(binding: BindingExpression, ir: ComponentIR): string {
  if (binding.kind === "paged") return pagedBindingExpression(binding, "pagedSet", binding.arg ? bindingExpr(binding.arg, ir) : undefined);
  if (binding.kind === "prop") {
    const propName = safePropName(ir, binding.prop);
    return pathExpr(propName, binding.path);
  }
  if (binding.kind === "channel") {
    if (binding.forwardValue === "sequence") return "sequence.select";
    if (binding.forwardValue === "pagedSet") return "pagedSet.request";
    if (binding.forwardValue) return `set${capitalize(binding.channel)}Value`;
    if (binding.field === "value") return pathExpr(binding.channel, binding.path);
    if (binding.field === "defaultValue") return pathExpr(binding.channel, binding.path);
    return binding.channel;
  }
  if (binding.kind === "literal") return JSON.stringify(binding.value);
  if (binding.kind === "iterationLocal") {
    return pathExpr(binding.local, binding.path);
  }
  if (binding.kind === "valueMap") {
    return composeValueMapExpression(binding, bindingExpr(binding.source, ir));
  }
  if (binding.kind === "projection") {
    return composeBindingProjectionExpression(
      binding.op,
      bindingExpr(binding.source, ir),
      ...(binding.op === "selectionLabel" ? [bindingExpr(binding.selection, ir), bindingExpr(binding.fallback, ir)] : []),
    );
  }
  if (binding.kind === "conditional") {
    return `(${bindingExpr(binding.condition, ir)} ? ${bindingExpr(binding.whenTrue, ir)} : ${bindingExpr(binding.whenFalse, ir)})`;
  }
  if (binding.kind === "channelCall") {
    // FEAT-BINDING-CALL-WITH-ARG-01: `channelCall` is an event-position form
    // (it lowers to a `() => setter(arg)` handler via `eventHandlerExpr`) and
    // the IR rejects it in value positions. Reaching here is an IR-build bug.
    throw new Error(
      `channel:${binding.channel}.onChange(...) call form is event-position ` +
      `only; it must not reach the value-expression renderer.`,
    );
  }
  if (binding.kind === "channelUpdate") {
    // FEAT-CHANNEL-UPDATE-OPERATIONS-01: `channelUpdate` is an event-position
    // form (the IR rejects it in value positions). Reaching here is a bug.
    throw new Error(
      `channel:${binding.channel}.onChange:${binding.op}(...) update-operation ` +
      `form is event-position only; it must not reach the value-expression renderer.`,
    );
  }
  const left = bindingExpr(binding.left, ir);
  const right = bindingExpr(binding.right, ir);
  if (binding.op === "eq") return `${left} === ${right}`;
  if (binding.op === "contains") return `Array.isArray(${left}) && ${left}.includes(${right})`;
  return `Array.isArray(${right}) ? ${right}.includes(${left}) : ${left} === ${right}`;
}

function pathExpr(base: string, path: string[] | undefined): string {
  if (!path || path.length === 0) return base;
  return [base, ...path].join(".");
}

function safePropName(ir: ComponentIR, propName: string): string {
  return ir.styledProps.find((p) => p.name === propName)?.safeName ?? propName;
}

function emitIteration(node: DomNodeIR, ir: ComponentIR, depth: number): string {
  const iteration = node.iteration;
  if (!iteration) return emitNode({ ...node, iteration: undefined }, ir, depth) ?? "";
  const pad = INDENT.repeat(depth);
  const childNode: DomNodeIR = { ...node, iteration: undefined };
  const indexVar = iteration.indexVar;
  const rendered = emitNode(childNode, ir, depth + 2, indexVar) ?? "";
  if (iteration.kind === "array") {
    const source = bindingExpr(iteration.source, ir);
    const itemVar = iteration.itemVar ?? "item";
    return [
      `${pad}{(${source} ?? []).map((${itemVar}, ${indexVar}) => (`,
      rendered,
      `${pad}${INDENT}))}`,
    ].join("\n");
  }
  const source = bindingExpr(iteration.source, ir);
  return [
    `${pad}{Array.from({ length: Number(${source} ?? 0) }).map((_, ${indexVar}) => (`,
    rendered,
    `${pad}${INDENT}))}`,
  ].join("\n");
}

function generateReactNativeStylesFile(ir: ComponentIR): string {
  const keys = new Set<string>(["root"]);
  for (const part of ir.parts) keys.add(styleKeyForPart(part.name));
  if (isCheckboxControl(ir)) {
    keys.add("indicator_checked");
    keys.add("indicatorMark");
    keys.add("label");
  }
  if (usesNativeToggle(ir)) {
    for (const value of Object.values(ir.variants).flat()) {
      keys.add(`root_${sanitizeStyleKey(value)}`);
    }
  }

  // Variant realization: per-variant entries joined from cssBlocks × token
  // scopes, plus a rootText layer when the root host cannot carry text props.
  const extraStyles = new Map<string, string>();
  let needsTextStyleImport = false;
  if (!usesNativeToggle(ir)) {
    const rootIsText = rootIsTextComponent(ir);
    const rootJoin = joinedScopeStyleEntries(ir, "root");
    const rootTextEntries = rootJoin.filter((entry) => entry.layer === "text");
    if (!rootIsText && rootTextEntries.length > 0) {
      extraStyles.set("rootText", styleObjectLiteral(rootTextEntries));
    }
    for (const fact of variantStyleFacts(ir)) {
      const viewEntries = rootIsText
        ? [...fact.viewEntries, ...fact.textEntries]
        : fact.viewEntries;
      if (viewEntries.length > 0) {
        extraStyles.set(fact.styleKey, styleObjectLiteral(viewEntries));
      }
      if (!rootIsText && fact.textEntries.length > 0) {
        extraStyles.set(fact.textStyleKey, styleObjectLiteral(fact.textEntries));
      }
    }
    for (const part of emSizedParts(ir)) {
      for (const fact of variantStyleFacts(ir)) {
        if (fact.axis !== part.axis) continue;
        const entries = emSizeStyleEntries(fact, part.factor);
        if (entries.length === 0) continue;
        extraStyles.set(
          `${part.styleKey}_variant_${sanitizeStyleKey(fact.value)}`,
          styleObjectLiteral(entries),
        );
      }
    }
    const selection = selectionLowering(ir);
    if (selection) {
      extraStyles.set(selection.styleKey, styleObjectLiteral(selection.entries));
    }
    for (const state of stateStyleFacts(ir)) {
      if (state.rootEntries.length > 0) {
        extraStyles.set(`root_state_${state.stateKey}`, styleObjectLiteral(state.rootEntries));
      }
      for (const [variantStyleKey, entries] of state.variantEntries) {
        extraStyles.set(`${variantStyleKey}_${state.stateKey}`, styleObjectLiteral(entries));
      }
    }
    for (const key of extraStyles.keys()) keys.add(key);
  }

  const styleByKey = new Map<string, string>();
  for (const key of Array.from(keys).sort()) {
    const style = extraStyles.has(key)
      ? extraStyles.get(key)!
      : usesNativeToggle(ir) && key.startsWith("root_")
        ? nativeToggleSizeStyle(ir, key.slice("root_".length))
        : key === "root" && rootIsTextComponent(ir)
          ? mergeRootTextIntoRootStyle(ir)
          : nativeStyleForKey(ir, key);
    styleByKey.set(key, style);
  }
  needsTextStyleImport = [...styleByKey.values()].some((style) =>
    style.includes("TextStyle["),
  );
  const needsViewStyleImport = [...styleByKey.values()].some((style) =>
    style.includes("ViewStyle["),
  );
  const styleTypeImports = [
    ...(needsTextStyleImport ? ["TextStyle"] : []),
    ...(needsViewStyleImport ? ["ViewStyle"] : []),
  ].sort();
  const needsDefinedStyle = [...styleByKey.values()].some((style) =>
    style.includes("definedStyle("),
  );

  const lines = [
    "// @generated:start imports",
    `import { ${[...styleByKey.values()].some(style => style.includes("Platform.select")) ? "Platform, " : ""}StyleSheet } from "react-native";`,
    ...(styleTypeImports.length > 0
      ? [`import type { ${styleTypeImports.join(", ")} } from "react-native";`]
      : []),
    needsDefinedStyle
      ? `import { definedStyle, type FsdsTheme } from "../../tokens";`
      : `import type { FsdsTheme } from "../../tokens";`,
    `import { resolve${ir.name}Tokens } from "./${ir.name}.tokens";`,
    "// @generated:end",
    "",
    "// @generated:start styles",
    `export function create${ir.name}Styles(theme?: FsdsTheme) {`,
    `${INDENT}const tokens = resolve${ir.name}Tokens(theme);`,
    `${INDENT}return StyleSheet.create({`,
  ];
  for (const [key, style] of styleByKey) {
    lines.push(`${INDENT}${INDENT}${key}: ${style},`);
  }
  lines.push(`${INDENT}});`);
  lines.push("}");
  lines.push("");
  lines.push(`export const styles = create${ir.name}Styles();`);
  lines.push("// @generated:end");
  return lines.join("\n") + "\n";
}

/**
 * When the root host is RNText it can carry text props directly, so the
 * root-scope text-layer join folds into the root style instead of a separate
 * rootText wrapper entry.
 */
function mergeRootTextIntoRootStyle(ir: ComponentIR): string {
  const base = nativeStyleForKey(ir, "root");
  const textEntries = joinedScopeStyleEntries(ir, "root").filter(
    (entry) => entry.layer === "text",
  );
  if (textEntries.length === 0) return base;
  const textLiteral = styleObjectLiteral(textEntries);
  if (base === "{}") return textLiteral;
  return `{ ...${base}, ...${textLiteral} }`;
}

/**
 * Variant style realization (FEAT-MOBILE-RN-001 slice 1).
 *
 * The web targets realize variants by re-declaring component token CSS vars
 * under value-modifier selectors (`.button--primary`) while the property
 * bindings stay constant on the root block. The RN projection replays that
 * exact join: the root `cssBlocks` declarations say which CSS property reads
 * which CSS var, the `variant_*` token scopes say which vars a variant
 * re-declares, and the table below is the only framework knowledge — how a
 * CSS property lowers to a `ViewStyle`/`TextStyle` field. No component names,
 * no slot-name heuristics.
 */
interface RnStylePropMapping {
  prop: string;
  cast: string;
  layer: "view" | "text";
}

const CSS_TO_RN_STYLE: Record<string, RnStylePropMapping> = {
  "background-color": { prop: "backgroundColor", cast: "string | undefined", layer: "view" },
  background: { prop: "backgroundColor", cast: "string | undefined", layer: "view" },
  "border-color": { prop: "borderColor", cast: "string | undefined", layer: "view" },
  "border-width": { prop: "borderWidth", cast: "number | undefined", layer: "view" },
  "border-radius": { prop: "borderRadius", cast: "number | undefined", layer: "view" },
  "border-inline-start-width": { prop: "borderLeftWidth", cast: "number | undefined", layer: "view" },
  "border-inline-start-color": { prop: "borderLeftColor", cast: "string | undefined", layer: "view" },
  "border-inline-end-width": { prop: "borderRightWidth", cast: "number | undefined", layer: "view" },
  "border-inline-end-color": { prop: "borderRightColor", cast: "string | undefined", layer: "view" },
  "padding-block-start": { prop: "paddingTop", cast: "number | undefined", layer: "view" },
  "padding-block-end": { prop: "paddingBottom", cast: "number | undefined", layer: "view" },
  "padding-inline-start": { prop: "paddingLeft", cast: "number | undefined", layer: "view" },
  "padding-inline-end": { prop: "paddingRight", cast: "number | undefined", layer: "view" },
  "padding-top": { prop: "paddingTop", cast: "number | undefined", layer: "view" },
  "padding-bottom": { prop: "paddingBottom", cast: "number | undefined", layer: "view" },
  "padding-left": { prop: "paddingLeft", cast: "number | undefined", layer: "view" },
  "padding-right": { prop: "paddingRight", cast: "number | undefined", layer: "view" },
  gap: { prop: "gap", cast: "number | undefined", layer: "view" },
  width: { prop: "width", cast: 'ViewStyle["width"]', layer: "view" },
  height: { prop: "height", cast: 'ViewStyle["height"]', layer: "view" },
  "min-width": { prop: "minWidth", cast: "number | undefined", layer: "view" },
  "max-width": { prop: "maxWidth", cast: 'ViewStyle["maxWidth"]', layer: "view" },
  "min-height": { prop: "minHeight", cast: "number | undefined", layer: "view" },
  "max-height": { prop: "maxHeight", cast: 'ViewStyle["maxHeight"]', layer: "view" },
  opacity: { prop: "opacity", cast: "number | undefined", layer: "view" },
  color: { prop: "color", cast: "string | undefined", layer: "text" },
  "font-size": { prop: "fontSize", cast: "number | undefined", layer: "text" },
  "font-family": { prop: "fontFamily", cast: "string | undefined", layer: "text" },
  "font-weight": { prop: "fontWeight", cast: 'TextStyle["fontWeight"]', layer: "text" },
  "text-transform": { prop: "textTransform", cast: 'TextStyle["textTransform"]', layer: "text" },
  "text-align": { prop: "textAlign", cast: 'TextStyle["textAlign"]', layer: "text" },
};

const CSS_ONLY_LITERALS = new Set([
  "none",
  "fit-content",
  "max-content",
  "min-content",
  "unset",
  "inherit",
  "initial",
  "revert",
]);

export interface JoinedStyleEntry {
  rnProp: string;
  expr: string;
  layer: "view" | "text";
  tokenName: string;
  resolvesTo?: string;
  rawValue?: string;
  isLiteral: boolean;
}

function rootCssDeclarations(ir: ComponentIR): Record<string, string> {
  const block = ir.cssBlocks.find(
    (candidate) => candidate.selector === `.${ir.cssPrefix}`,
  );
  return block?.declarations ?? {};
}

function cssVarReference(value: string): string | null {
  const match = /^var\((--[A-Za-z0-9-]+)/.exec(value.trim());
  return match ? match[1]! : null;
}

function joinedScopeStyleEntries(
  ir: ComponentIR,
  scopeKey: string,
): JoinedStyleEntry[] {
  const scope = ir.tokenScopes.find((candidate) => candidate.scope === scopeKey);
  if (!scope) return [];
  const out: JoinedStyleEntry[] = [];
  for (const [cssProp, declValue] of Object.entries(rootCssDeclarations(ir))) {
    const mapping = CSS_TO_RN_STYLE[cssProp];
    if (!mapping) continue;
    const varName = cssVarReference(declValue);
    if (!varName) continue;
    const token = scope.values.find((value) => value.cssVar === varName);
    if (!token) continue;
    // CSS-only keyword literals have no native realization; emitting them
    // would hand RN invalid style values (e.g. maxWidth: "none").
    if (token.isLiteral && token.rawValue !== undefined && CSS_ONLY_LITERALS.has(token.rawValue.trim())) {
      continue;
    }
    out.push({
      rnProp: mapping.prop,
      layer: mapping.layer,
      expr: `(tokens.${scopeKey}?.[${JSON.stringify(token.name)}] as ${mapping.cast})`,
      tokenName: token.name,
      ...(token.resolvesTo !== undefined && { resolvesTo: token.resolvesTo }),
      ...(token.rawValue !== undefined && { rawValue: token.rawValue }),
      isLiteral: token.isLiteral,
    });
  }
  return out;
}

/**
 * Second variant realization pattern: the variant block declares CSS
 * properties directly (`.spinner--xs { font-size: var(--fsds-spinner-size-xs) }`,
 * `.avatar--small { width: var(--fsds-avatar-size-small) }`) instead of
 * re-declaring token slots. The referenced var is dereferenced at generation
 * time to the owning token scope; literal declarations and parseable var()
 * fallbacks lower to static values.
 */
function variantBlockStyleEntries(
  ir: ComponentIR,
  modifierSuffix: string,
): JoinedStyleEntry[] {
  const block = ir.cssBlocks.find(
    (candidate) => candidate.selector === `.${ir.cssPrefix}--${modifierSuffix}`,
  );
  if (!block) return [];
  const out: JoinedStyleEntry[] = [];
  for (const [cssProp, declValue] of Object.entries(block.declarations)) {
    const mapping = CSS_TO_RN_STYLE[cssProp];
    if (!mapping) continue;
    const varName = cssVarReference(declValue);
    if (varName) {
      let resolved = false;
      for (const scope of ir.tokenScopes) {
        const token = scope.values.find((candidate) => candidate.cssVar === varName);
        if (!token) continue;
        if (
          token.isLiteral &&
          token.rawValue !== undefined &&
          CSS_ONLY_LITERALS.has(token.rawValue.trim())
        ) {
          resolved = true;
          break;
        }
        out.push({
          rnProp: mapping.prop,
          layer: mapping.layer,
          expr: `(tokens.${scope.scope}?.[${JSON.stringify(token.name)}] as ${mapping.cast})`,
          tokenName: token.name,
          ...(token.resolvesTo !== undefined && { resolvesTo: token.resolvesTo }),
          ...(token.rawValue !== undefined && { rawValue: token.rawValue }),
          isLiteral: token.isLiteral,
        });
        resolved = true;
        break;
      }
      if (resolved) continue;
      // Semantic/core var with a parseable fallback lowers statically; a
      // bare unresolvable var has no native value and is skipped.
      const fallbackMatch = /^var\(--[A-Za-z0-9-]+,\s*([^)]+)\)$/.exec(declValue.trim());
      const literal = fallbackMatch ? nativeStyleLiteral(fallbackMatch[1]!.trim()) : null;
      if (literal !== null) {
        out.push({
          rnProp: mapping.prop,
          layer: mapping.layer,
          expr: literal,
          tokenName: cssProp,
          rawValue: fallbackMatch![1]!.trim(),
          isLiteral: true,
        });
      }
      continue;
    }
    const literal = nativeStyleLiteral(declValue.trim());
    if (literal !== null) {
      out.push({
        rnProp: mapping.prop,
        layer: mapping.layer,
        expr: literal,
        tokenName: cssProp,
        rawValue: declValue.trim(),
        isLiteral: true,
      });
    }
  }
  return out;
}

/** Lower a CSS literal to a native style literal, or null when CSS-only. */
function nativeStyleLiteral(value: string): string | null {
  if (CSS_ONLY_LITERALS.has(value)) return null;
  const px = /^(-?\d+(?:\.\d+)?)px$/.exec(value);
  if (px) return px[1]!;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return value;
  if (/^-?\d+(?:\.\d+)?%$/.test(value)) return JSON.stringify(value);
  const rem = /^(-?\d+(?:\.\d+)?)rem$/.exec(value);
  if (rem) return String(Number(rem[1]) * 16);
  if (/^-?\d+(?:\.\d+)?(em|ex|ch|vw|vh|dvh|svh|dvw|svw)$/.test(value)) return null;
  if (value.includes("calc(") || value.includes("clamp(") || value.includes("var(")) return null;
  return JSON.stringify(value);
}

export interface VariantStyleFact {
  axis: string;
  axisSafeName: string;
  /** Default expression for the axis prop, from the class recipe. */
  defaultExpr?: string;
  value: string;
  scopeKey: string;
  styleKey: string;
  textStyleKey: string;
  viewEntries: JoinedStyleEntry[];
  textEntries: JoinedStyleEntry[];
}

export function variantStyleFacts(ir: ComponentIR): VariantStyleFact[] {
  if (usesNativeToggle(ir)) return [];
  const out: VariantStyleFact[] = [];
  // The class recipe is the governed variant-axis fact: it carries the axis
  // prop (synthesized on web even when the contract declares no prop) and the
  // collision-disambiguating valuePrefix that shapes selectors + scope keys.
  for (const modifier of ir.classRecipe.valueModifiers) {
    const values = ir.variants[modifier.propName] ?? [];
    for (const value of values) {
      const modifierSuffix = `${modifier.valuePrefix ?? ""}${value}`;
      const scopeKey = `variant_${sanitizeStyleKey(modifierSuffix)}`;
      const entries = [
        ...joinedScopeStyleEntries(ir, scopeKey),
        ...variantBlockStyleEntries(ir, modifierSuffix),
      ];
      out.push({
        axis: modifier.propName,
        axisSafeName: modifier.safeName,
        ...(modifier.defaultExpr !== undefined && { defaultExpr: modifier.defaultExpr }),
        value,
        scopeKey,
        styleKey: `root_${scopeKey}`,
        textStyleKey: `rootText_${scopeKey}`,
        viewEntries: entries.filter((entry) => entry.layer === "view"),
        textEntries: entries.filter((entry) => entry.layer === "text"),
      });
    }
  }
  return out;
}

function rootIsTextComponent(ir: ComponentIR): boolean {
  return rnComponentForNode(ir.dom ?? fallbackViewNode()) === "RNText";
}

/**
 * Interactive state realization (FEAT-MOBILE-RN-001 slice 3). Web state
 * blocks (`.button:active { background-color: var(--…-active) }`) lower to
 * Pressable state styles: `:active` → pressed (style-function form),
 * `:disabled` → the disabled prop. `:hover` / `:focus-visible` have no
 * Pressable analog and are intentionally not realized. View-layer only —
 * text-layer state styling would need state plumbed into the text wrapper.
 */
const RN_STATE_PSEUDOS = [
  { pseudo: "active", stateKey: "pressed" },
  { pseudo: "disabled", stateKey: "disabled" },
] as const;

type RnStateKey = (typeof RN_STATE_PSEUDOS)[number]["stateKey"];

function stateBlockEntries(
  ir: ComponentIR,
  pseudo: string,
  scopeKey: string,
): JoinedStyleEntry[] {
  // Match the state block by its state PREFIX, not by exact string equality.
  //
  // RN is reading a web selector as a fact ("this is the :active block"), and
  // exact equality made that reading brittle: adding a suppression guard turned
  // `.button:active` into `.button:active:not(:disabled)` and this lookup
  // silently returned nothing, dropping every `_pressed` style from RN Button
  // and all its variants. A decorated selector is still the same state block.
  //
  // Boundary-checked so `.button:active` does not match a hypothetical
  // `.button:active-within`; a guard always continues with `:` or `[`.
  const stateSelector = `.${ir.cssPrefix}:${pseudo}`;
  const block = ir.cssBlocks.find((candidate) => {
    if (candidate.selector === stateSelector) return true;
    if (!candidate.selector.startsWith(stateSelector)) return false;
    const next = candidate.selector.charAt(stateSelector.length);
    return next === ":" || next === "[";
  });
  if (!block) return [];
  const scope = ir.tokenScopes.find((candidate) => candidate.scope === scopeKey);
  const out: JoinedStyleEntry[] = [];
  for (const [cssProp, declValue] of Object.entries(block.declarations)) {
    const mapping = CSS_TO_RN_STYLE[cssProp];
    if (!mapping || mapping.layer !== "view") continue;
    const varName = cssVarReference(declValue);
    if (varName) {
      const token = scope?.values.find((candidate) => candidate.cssVar === varName);
      if (!token) continue;
      if (
        token.isLiteral &&
        token.rawValue !== undefined &&
        CSS_ONLY_LITERALS.has(token.rawValue.trim())
      ) {
        continue;
      }
      out.push({
        rnProp: mapping.prop,
        layer: mapping.layer,
        expr: `(tokens.${scopeKey}?.[${JSON.stringify(token.name)}] as ${mapping.cast})`,
        tokenName: token.name,
        ...(token.resolvesTo !== undefined && { resolvesTo: token.resolvesTo }),
        ...(token.rawValue !== undefined && { rawValue: token.rawValue }),
        isLiteral: token.isLiteral,
      });
    } else if (scopeKey === "root") {
      const literal = nativeStyleLiteral(declValue.trim());
      if (literal !== null) {
        out.push({
          rnProp: mapping.prop,
          layer: mapping.layer,
          expr: literal,
          tokenName: cssProp,
          rawValue: declValue.trim(),
          isLiteral: true,
        });
      }
    }
  }
  return out;
}

export interface StateStyleFact {
  stateKey: RnStateKey;
  /** Entries for the root scope (the default-variant state realization). */
  rootEntries: JoinedStyleEntry[];
  /** Per-variant overrides keyed by the variant fact's styleKey. */
  variantEntries: Map<string, JoinedStyleEntry[]>;
}

export function stateStyleFacts(ir: ComponentIR): StateStyleFact[] {
  if (usesNativeToggle(ir)) return [];
  const out: StateStyleFact[] = [];
  for (const { pseudo, stateKey } of RN_STATE_PSEUDOS) {
    const rootEntries = stateBlockEntries(ir, pseudo, "root");
    const variantEntries = new Map<string, JoinedStyleEntry[]>();
    for (const fact of variantStyleFacts(ir)) {
      const entries = stateBlockEntries(ir, pseudo, fact.scopeKey);
      if (entries.length > 0) variantEntries.set(fact.styleKey, entries);
    }
    if (rootEntries.length > 0 || variantEntries.size > 0) {
      out.push({ stateKey, rootEntries, variantEntries });
    }
  }
  return out;
}

/** Axes (in contract order) that realized at least one variant style entry. */
function realizedVariantAxes(ir: ComponentIR): string[] {
  const axes: string[] = [];
  for (const fact of variantStyleFacts(ir)) {
    if (fact.viewEntries.length === 0 && fact.textEntries.length === 0) continue;
    if (!axes.includes(fact.axis)) axes.push(fact.axis);
  }
  return axes;
}

/** Variant axes whose font-size token scales at least one em-sized part. */
function emSizedPartAxes(ir: ComponentIR): Set<string> {
  return new Set(emSizedParts(ir).map((part) => part.axis));
}

/** Selection-const names for an em-sized part node (e.g. visualStyleForSize). */
function emPartSizeConsts(node: DomNodeIR, ir: ComponentIR): string[] {
  if (node.part === undefined) return [];
  return emSizedParts(ir)
    .filter((part) => part.part === node.part)
    .map((part) => `${part.styleKey}StyleFor${capitalize(part.axisSafeName)}`);
}

/**
 * Selection realization: an `[aria-selected="true"]` state block in the
 * contract styles lowers onto the tree node that mutates the selection
 * channel with an iterated item. RN has a native `accessibilityState.selected`
 * flag, so the subject carries it plus the selected style while selected.
 * The subject is discovered from contract facts only — the attr-state block
 * names the target part, and the dom tree supplies the iterated setter —
 * never a component name.
 */
interface SelectionLowering {
  /** The dom node that mutates the channel with the iterated item. */
  subjectNode: DomNodeIR;
  /** The channel whose value the subject mutates (e.g. "value"). */
  channel: NormalizedChannelIR;
  /** The iteration item variable in scope at the subject (e.g. "item"). */
  itemLocal: string;
  /** StyleSheet key of the selected-state style (e.g. "day_state_selected"). */
  styleKey: string;
  /** View-layer token entries realized from the attr-state block. */
  entries: JoinedStyleEntry[];
}

const selectionLoweringCache = new WeakMap<ComponentIR, SelectionLowering | null>();

const ARIA_SELECTED_SELECTOR =
  /^\.([a-z0-9-]+)__([a-z0-9-]+)\[aria-selected="true"\](?: \.([a-z0-9-]+)__([a-z0-9-]+))?$/;

function selectionLowering(ir: ComponentIR): SelectionLowering | null {
  const cached = selectionLoweringCache.get(ir);
  if (cached !== undefined) return cached;
  const lowering = computeSelectionLowering(ir);
  selectionLoweringCache.set(ir, lowering);
  return lowering;
}

function computeSelectionLowering(ir: ComponentIR): SelectionLowering | null {
  for (const block of ir.cssBlocks) {
    const match = ARIA_SELECTED_SELECTOR.exec(block.selector);
    if (!match || match[1] !== ir.cssPrefix) continue;
    if (match[3] !== undefined && match[3] !== ir.cssPrefix) continue;
    const targetPart = match[4] ?? match[2]!;
    const subject = findSelectionSubject(ir, targetPart);
    if (!subject) continue;
    const channel = ir.behavior.normalizedChannels.find(
      (candidate) => candidate.name === subject.channelName,
    );
    if (!channel) continue;
    const entries = attrStateViewEntries(ir, block);
    if (entries.length === 0) continue;
    return {
      subjectNode: subject.node,
      channel,
      itemLocal: subject.itemLocal,
      styleKey: `${styleKeyForPart(targetPart)}_state_selected`,
      entries,
    };
  }
  return null;
}

interface SelectionSubject {
  /** The dom node that mutates the channel with the iterated item. */
  node: DomNodeIR;
  channelName: string;
  itemLocal: string;
}

function findSelectionSubject(
  ir: ComponentIR,
  targetPart: string,
): SelectionSubject | null {
  const visited = new Set<DomNodeIR>();
  const walk = (
    node: DomNodeIR | undefined,
    itemLocals: string[],
  ): SelectionSubject | null => {
    if (!node || visited.has(node)) return null;
    visited.add(node);
    const locals = node.iteration?.itemVar
      ? [...itemLocals, node.iteration.itemVar]
      : itemLocals;
    if (node.part === targetPart && node.part !== "root" && locals.length > 0) {
      for (const binding of Object.values(node.events)) {
        for (const local of locals) {
          if (bindingReferencesLocal(binding, local)) {
            const channelName = bindingChannelName(binding);
            if (channelName) return { node, channelName, itemLocal: local };
          }
        }
      }
    }
    for (const child of node.children) {
      const found = walk(child, locals);
      if (found) return found;
    }
    return null;
  };
  return walk(ir.dom, []);
}

function bindingChannelName(binding: BindingExpression): string | undefined {
  if (
    binding.kind === "channel" ||
    binding.kind === "channelCall" ||
    binding.kind === "channelUpdate"
  ) {
    return binding.channel;
  }
  return undefined;
}

function bindingReferencesLocal(
  binding: BindingExpression,
  local: string,
): boolean {
  switch (binding.kind) {
    case "iterationLocal":
      return binding.local === local;
    case "conditional":
      return (
        bindingReferencesLocal(binding.condition, local) ||
        bindingReferencesLocal(binding.whenTrue, local) ||
        bindingReferencesLocal(binding.whenFalse, local)
      );
    case "valueMap":
      return bindingReferencesLocal(binding.source, local);
    case "projection":
      return bindingReferencesLocal(binding.source, local);
    case "channelCall":
      return bindingReferencesLocal(binding.arg, local);
    case "channelUpdate":
      return binding.operands.some((operand) =>
        bindingReferencesLocal(operand, local),
      );
    case "predicate":
      return (
        bindingReferencesLocal(binding.left, local) ||
        bindingReferencesLocal(binding.right, local)
      );
    default:
      return false;
  }
}

/**
 * View-layer entries from an attr-state block, resolved against every token
 * scope (state blocks routinely reference component-level color tokens).
 */
function attrStateViewEntries(
  ir: ComponentIR,
  block: { declarations: Record<string, string> },
): JoinedStyleEntry[] {
  const out: JoinedStyleEntry[] = [];
  for (const [cssProp, declValue] of Object.entries(block.declarations)) {
    const mapping = CSS_TO_RN_STYLE[cssProp];
    if (!mapping || mapping.layer !== "view") continue;
    const varName = cssVarReference(declValue);
    if (!varName) continue;
    for (const scope of ir.tokenScopes) {
      const token = scope.values.find((candidate) => candidate.cssVar === varName);
      if (!token) continue;
      if (
        token.isLiteral &&
        token.rawValue !== undefined &&
        CSS_ONLY_LITERALS.has(token.rawValue.trim())
      ) {
        break;
      }
      out.push({
        rnProp: mapping.prop,
        layer: mapping.layer,
        expr: `(tokens.${scope.scope}?.[${JSON.stringify(token.name)}] as ${mapping.cast})`,
        tokenName: token.name,
        ...(token.resolvesTo !== undefined && { resolvesTo: token.resolvesTo }),
        ...(token.rawValue !== undefined && { rawValue: token.rawValue }),
        isLiteral: token.isLiteral,
      });
      break;
    }
  }
  return out;
}

/** Style-array appendix applying the selected style, or "" for non-subjects. */
function selectionStyleAppendix(node: DomNodeIR, ir: ComponentIR): string {
  const lowering = selectionLowering(ir);
  if (!lowering || lowering.subjectNode !== node) return "";
  return `, isEntrySelected(${lowering.itemLocal}, ${lowering.channel.name}) ? styles.${lowering.styleKey} : undefined`;
}

/**
 * Em-sized part geometry: a part whose base block declares em-unit
 * width/height (e.g. `.spinner__visual { width: 1em; height: 1em }`) scales
 * with the root font-size on the web — the same declared fact the variant
 * `--<axis>` font-size rules drive. RN has no em unit, so the axis's
 * font-size token lowers directly onto the part's width/height at the
 * declared factor (FEAT-RN-LINT-ZERO: realized, not ignored, sizing).
 */
interface EmSizedPart {
  /** Anatomy part name (e.g. "visual"). */
  part: string;
  /** StyleSheet key base (styleKeyForPart of the part). */
  styleKey: string;
  /** Variant axis whose font-size token scales this part (e.g. "size"). */
  axis: string;
  axisSafeName: string;
  /** em multiplier parsed from the declared literal (1em → 1). */
  factor: number;
}

function emSizedParts(ir: ComponentIR): EmSizedPart[] {
  const out: EmSizedPart[] = [];
  for (const part of ir.parts) {
    if (part.name === "root") continue;
    const styleKey = styleKeyForPart(part.name);
    const block = ir.cssBlocks.find(
      (candidate) => candidate.selector === `.${ir.cssPrefix}__${part.name}`,
    );
    if (!block) continue;
    const geometry = ["width", "height"]
      .map((cssProp) => {
        const raw = block.declarations[cssProp];
        if (!raw) return null;
        const match = /^([0-9.]+)em$/.exec(raw.trim());
        return match ? { cssProp, factor: Number.parseFloat(match[1]!) } : null;
      })
      .filter((entry): entry is { cssProp: string; factor: number } => entry !== null);
    if (geometry.length === 0) continue;
    const factor = geometry[0]!.factor;
    for (const fact of variantStyleFacts(ir)) {
      const hasFontSizeEntry = fact.textEntries.some(
        (entry) => entry.rnProp === "fontSize",
      );
      if (!hasFontSizeEntry) continue;
      if (
        out.some(
          (existing) =>
            existing.part === part.name && existing.axis === fact.axis,
        )
      ) {
        continue;
      }
      out.push({
        part: part.name,
        styleKey,
        axis: fact.axis,
        axisSafeName: fact.axisSafeName,
        factor,
      });
    }
  }
  return out;
}

/** The em-size StyleSheet entries for one variant fact on one part. */
function emSizeStyleEntries(
  fact: VariantStyleFact,
  factor: number,
): JoinedStyleEntry[] {
  const fontEntry = fact.textEntries.find((entry) => entry.rnProp === "fontSize");
  if (!fontEntry) return [];
  const sizeExpr =
    factor === 1 ? fontEntry.expr : `(${fontEntry.expr}) * ${JSON.stringify(factor)}`;
  return [
    { rnProp: "width", layer: "view" as const, expr: sizeExpr, tokenName: fontEntry.tokenName, isLiteral: false },
    { rnProp: "height", layer: "view" as const, expr: sizeExpr, tokenName: fontEntry.tokenName, isLiteral: false },
  ];
}

function variantStyleConstName(axisSafeName: string): string {
  return `variantStyleFor${capitalize(axisSafeName)}`;
}

function textVariantStyleConstName(axisSafeName: string): string {
  return `textVariantStyleFor${capitalize(axisSafeName)}`;
}

function styleObjectLiteral(entries: JoinedStyleEntry[]): string {
  const parts: string[] = [];
  for (const entry of entries) {
    if (parts.some((existing) => existing.startsWith(`${entry.rnProp}: `))) continue;
    parts.push(`${entry.rnProp}: ${entry.expr}`);
  }
  // definedStyle drops undefined values so a themeless ref-only token can
  // never clobber an earlier style layer's committed fallback.
  return parts.length > 0 ? `definedStyle({ ${parts.join(", ")} })` : "{}";
}

function nativeStyleForKey(ir: ComponentIR, key: string): string {
  const entries: string[] = [];
  if (key === "root") {
    const ios = nativeRootClipping(ir, "ios");
    const android = nativeRootClipping(ir, "android");
    if (ios !== undefined || android !== undefined) {
      entries.push(`overflow: ${ios === android
        ? JSON.stringify(ios)
        : `Platform.select({ ios: "${ios ?? "visible"}", android: "${android ?? "visible"}", default: "visible" })`}`);
    }
  }
  const scope = key.includes("_") ? key.slice(0, key.indexOf("_")) : key;
  if (key === "root" || key === "input" || key === "control") {
    // Under the checkbox lowering the interactive Pressable is a ROW holding
    // the indicator box and the label; the box-model padding, colors and
    // border belong to `indicator`, not the row. Both `root` (the contract's
    // <label> wrapper) and `input` (the native control the RN Pressable
    // collapses) are that same row.
    const isCheckboxInput =
      (key === "input" || key === "root") && isCheckboxControl(ir);
    if (!isCheckboxInput) {
      pushStyle(entries, "paddingTop", tokenNumberAccessForStyle(ir, scope, "box-model.padding-block-start"));
      pushStyle(entries, "paddingBottom", tokenNumberAccessForStyle(ir, scope, "box-model.padding-block-end"));
      pushStyle(entries, "minHeight", tokenNumberAccessForStyle(ir, scope, "box-model.min-height"));
    }
    pushStyle(entries, "paddingLeft", tokenNumberAccessForStyle(ir, scope, "box-model.padding-inline-start"));
    pushStyle(entries, "paddingRight", tokenNumberAccessForStyle(ir, scope, "box-model.padding-inline-end"));
    pushStyle(entries, "gap", tokenNumberAccessForStyle(ir, scope, "box-model.gap"));
    pushStyle(entries, "minWidth", tokenNumberAccessForStyle(ir, scope, "box-model.min-width"));
    if (!isCheckboxInput) {
      pushStyle(entries, "backgroundColor", tokenStringByName(ir, scope, [
        ".color.background.default",
        ".color.bg.default",
        ".color.bg",
      ]));
      pushStyle(entries, "borderColor", tokenStringByName(ir, scope, [
        ".color.border.default",
        ".color.border",
      ]));
      pushStyle(entries, "borderWidth", tokenNumberByName(ir, scope, [
        ".border.width",
        ".size.border",
      ]));
      pushStyle(entries, "borderRadius", tokenNumberByName(ir, scope, [
        ".border.radius",
        ".size.radius",
        ".radius.default",
        ".radius",
      ]));
      // Inline-start accent stripe (logical border-inline-start → physical borderLeft on RN).
      // Emitted only when the contract declares an accent-stripe width slot, so the
      // variant blocks' borderLeftColor has a base width to render against.
      pushStyle(entries, "borderLeftWidth", tokenNumberByName(ir, scope, [
        ".size.statusAccent.width",
        ".statusAccent.width",
      ]));
      pushStyle(entries, "borderLeftColor", tokenStringByName(ir, scope, [
        ".color.statusAccent.default",
        ".statusAccent.default",
      ]));
    }
  }
  if (key === "root" && rnComponentForNode(ir.dom ?? fallbackViewNode()) === "Pressable") {
    entries.push("alignItems: \"center\"", "justifyContent: \"center\"");
  }
  if ((key === "input" || key === "root") && isCheckboxControl(ir)) {
    entries.push("alignItems: \"center\"", "flexDirection: \"row\"");
  }
  if (key === "indicator") {
    entries.push("alignItems: \"center\"", "height: 20", "justifyContent: \"center\"", "width: 20");
    pushStyle(entries, "backgroundColor", tokenStringByName(ir, "root", [".color.background.default"]));
    pushStyle(entries, "borderColor", tokenStringByName(ir, "root", [".color.border.default"]));
    pushStyle(entries, "borderWidth", tokenNumberByName(ir, "root", [".border.width"]));
    pushStyle(entries, "borderRadius", tokenNumberByName(ir, "root", [".border.radius"]));
  }
  if (key === "indicator_checked") {
    pushStyle(entries, "backgroundColor", tokenStringByName(ir, "root", [
      ".color.border.default",
      ".color.background.default",
    ]));
  }
  if (key === "indicatorMark") {
    entries.push("color: \"#ffffff\"", "fontSize: 12", "fontWeight: \"700\"", "lineHeight: 16");
  }
  if (key === "label" || key === "help" || key === "error" || key === "validatingIndicator") {
    pushStyle(entries, "color", tokenStringByName(ir, "root", [
      key === "error" ? ".color.invalid-text" : "",
      key === "label" ? ".label.color" : "",
      ".color.fg",
      ".color.text.default",
      ".color.foreground.default",
    ].filter(Boolean)));
  }
  if (key === "meta") {
    entries.push("flexDirection: \"column\"");
    pushStyle(entries, "gap", tokenNumberByName(ir, "root", [".gap.meta"]));
  }
  return entries.length > 0 ? `{ ${entries.join(", ")} }` : "{}";
}

function fallbackViewNode(): DomNodeIR {
  return {
    attrs: {},
    bindings: {},
    children: [],
    componentRef: undefined,
    content: undefined,
    cssVarBindings: [],
    events: {},
    iconGlyph: undefined,
    ifNegated: false,
    ifProp: undefined,
    iteration: undefined,
    part: "root",
    propertyBindings: {},
    slotName: undefined,
    tag: "div",
    generatedIdSlug: undefined,
    idRefAttrs: [],
  };
}

function pushStyle(entries: string[], prop: string, value: string | undefined): void {
  if (value === undefined) return;
  const existingIndex = entries.findIndex((entry) => entry.startsWith(`${prop}: `));
  const next = `${prop}: ${value}`;
  if (existingIndex >= 0) {
    entries[existingIndex] = next;
  } else {
    entries.push(next);
  }
}

function tokenNumberAccessForStyle(
  ir: ComponentIR,
  scope: string,
  name: string,
): string | undefined {
  return tokenNumberAccess(ir, scope, name) ?? tokenNumberAccess(ir, "root", name);
}

function tokenByName(
  ir: ComponentIR,
  scope: string,
  predicates: string[],
): string | undefined {
  const scopes = [scope, "root"].filter((value, index, array) => array.indexOf(value) === index);
  for (const scopeName of scopes) {
    const tokenScope = ir.tokenScopes.find((candidate) => candidate.scope === scopeName);
    if (!tokenScope) continue;
    for (const predicate of predicates) {
      const match = tokenScope.values.find((value) =>
        value.name.endsWith(predicate) || value.name.includes(predicate),
      );
      if (match) return match.name;
    }
  }
  return undefined;
}

function tokenNumberByName(
  ir: ComponentIR,
  scope: string,
  predicates: string[],
): string | undefined {
  const name = tokenByName(ir, scope, predicates);
  return name ? tokenNumberAccess(ir, scope, name) ?? tokenNumberAccess(ir, "root", name) : undefined;
}

function tokenStringByName(
  ir: ComponentIR,
  scope: string,
  predicates: string[],
): string | undefined {
  const name = tokenByName(ir, scope, predicates);
  return name ? tokenStringAccess(ir, scope, name) ?? tokenStringAccess(ir, "root", name) : undefined;
}

function nativeToggleSizeStyle(ir: ComponentIR, variant: string): string {
  const width = tokenNumberAccess(ir, "root", `${ir.cssPrefix}.size.${variant}.track.width`);
  const height = tokenNumberAccess(ir, "root", `${ir.cssPrefix}.size.${variant}.track.height`);
  const entries: string[] = [];
  if (width !== undefined) entries.push(`width: ${width}`);
  if (height !== undefined) entries.push(`height: ${height}`);
  return entries.length > 0 ? `{ ${entries.join(", ")} }` : "{}";
}

function generateReactNativeTokensFile(ir: ComponentIR): string {
  const lines = [
    "// @generated:start imports",
    `import { resolveComponentTokens, type ComponentTokenScopes, type FsdsTheme } from "../../tokens";`,
    "// @generated:end",
    "",
    "// @generated:start tokens",
    `export const ${tokenConstName(ir)} = {`,
  ];
  for (const scope of ir.tokenScopes) {
    if (scope.values.length === 0) continue;
    lines.push(`${INDENT}${JSON.stringify(scope.scope)}: {`);
    for (const value of scope.values) {
      lines.push(`${INDENT}${INDENT}${JSON.stringify(value.name)}: {`);
      lines.push(`${INDENT}${INDENT}${INDENT}name: ${JSON.stringify(value.name)},`);
      lines.push(`${INDENT}${INDENT}${INDENT}cssVar: ${JSON.stringify(value.cssVar)},`);
      if (value.resolvesTo) {
        lines.push(`${INDENT}${INDENT}${INDENT}ref: ${JSON.stringify(value.resolvesTo)},`);
      }
      if (value.rawValue !== undefined) {
        const nativeValue = nativeTokenLiteral(value.rawValue);
        lines.push(`${INDENT}${INDENT}${INDENT}${value.isLiteral ? "literal" : "fallback"}: ${nativeValue},`);
      }
      lines.push(`${INDENT}${INDENT}},`);
    }
    lines.push(`${INDENT}},`);
  }
  lines.push("} satisfies ComponentTokenScopes;");
  lines.push("");
  lines.push(`export function resolve${ir.name}Tokens(theme?: FsdsTheme) {`);
  lines.push(`${INDENT}return resolveComponentTokens(${tokenConstName(ir)}, theme);`);
  lines.push("}");
  lines.push("// @generated:end");
  return lines.join("\n") + "\n";
}

function tokenConstName(ir: ComponentIR): string {
  return `${ir.cssPrefix.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}TokenScopes`;
}

function styleKeyForPart(part: string | undefined): string {
  if (!part || part === "root") return "root";
  return sanitizeStyleKey(part);
}

function variantStyleExpression(ir: ComponentIR): string {
  const sizeProp = ir.styledProps.find((p) => p.name === "size");
  if (!sizeProp) return "styles.root";
  return `styles[\`root_\${${sizeProp.safeName}}\`] ?? styles.root`;
}

function usesNativeToggle(ir: ComponentIR): boolean {
  return collectCollapseIntents(ir).has("native-toggle-affordance");
}

/**
 * True when the contract declares a checkbox form control that no native
 * toggle primitive covers — RN has no native checkbox, so this drives the
 * Pressable + indicator lowering below.
 *
 * Keyed on `behavior.form.inputType`, the contract's own declaration, NOT on the root
 * `anatomy.dom` tag. The tag probe was a proxy that held only while the input
 * happened to be the root element: giving Checkbox a `<label>` wrapper (so its
 * `input`/`indicator` style carriers become reachable on the web) silently
 * flipped RN off this lowering onto the generic DOM walk, dropping the
 * indicator mark, the label text, and the testID from the interactive node. A
 * web-side anatomy repair must not be able to decide whether RN has a checkbox.
 *
 * Switch and ToggleSwitch also declare `inputType: "checkbox"` but collapse to
 * the native toggle primitive, so they are excluded here and handled by
 * `usesNativeToggle` earlier in the dispatch chain.
 */
function isCheckboxControl(ir: ComponentIR): boolean {
  return ir.behavior.form?.inputType === "checkbox" && !usesNativeToggle(ir);
}

/**
 * True when a contract relationship declares aria-expanded from the anchored
 * surface's `trigger` part — the disclosure-state fact the web families bind
 * as `aria-expanded` and RN realizes via `accessibilityState.expanded`.
 */
function triggerDeclaresAriaExpanded(ir: ComponentIR): boolean {
  return (ir.behavior.relationships ?? []).some(
    (rel) => rel.attribute === "aria-expanded" && rel.from === "trigger",
  );
}

function findProp(ir: ComponentIR, name: string): ResolvedPropIR | undefined {
  return ir.styledProps.find((p) => p.name === name);
}

function tokenAccess(
  ir: ComponentIR,
  scope: string,
  name: string,
): string | undefined {
  if (!hasToken(ir, scope, name)) return undefined;
  return `tokens.${scope}?.[${JSON.stringify(name)}]`;
}

function tokenNumberAccess(
  ir: ComponentIR,
  scope: string,
  name: string,
): string | undefined {
  const access = tokenAccess(ir, scope, name);
  return access ? `(${access} as number | undefined)` : undefined;
}

function tokenStringAccess(
  ir: ComponentIR,
  scope: string,
  name: string,
): string | undefined {
  const access = tokenAccess(ir, scope, name);
  return access ? `(${access} as string | undefined)` : undefined;
}

function tokenStringFallbackAccess(
  ir: ComponentIR,
  name: string,
  scopes: string[],
): string | undefined {
  const accesses = scopes
    .map((scope) => tokenStringAccess(ir, scope, name))
    .filter((value): value is string => value !== undefined);
  return accesses.length > 0 ? accesses.join(" ?? ") : undefined;
}

function hasToken(ir: ComponentIR, scope: string, name: string): boolean {
  return ir.tokenScopes.some((tokenScope) =>
    tokenScope.scope === scope && tokenScope.values.some((value) => value.name === name),
  );
}

/**
 * The full name of the first declared component token slot whose name ends
 * with one of the given semantic suffixes, in priority order. Drives native
 * control color wiring from what the contract declares rather than one
 * component's canonical slot spelling.
 */
function declaredTokenSlotName(
  ir: ComponentIR,
  suffixes: string[],
): string | undefined {
  const declared = ir.tokenScopes.flatMap((scope) =>
    scope.values.map((value) => value.name),
  );
  for (const suffix of suffixes) {
    const match = declared.find((name) => matchesTokenRole(name, `.${suffix}`));
    if (match) return match;
  }
  return undefined;
}

function nativeFillWidthBinding(node: DomNodeIR) {
  return node.cssVarBindings.find((binding) => binding.varName.includes('fill-width'));
}

function nativeMaxLinesBinding(node: DomNodeIR) {
  return node.cssVarBindings.find((item) =>
    item.varName.includes("max-lines") || item.varName.includes("content-lines"),
  );
}

function maxLinesExpressionForNode(node: DomNodeIR, ir: ComponentIR): string | undefined {
  const binding = nativeMaxLinesBinding(node);
  if (!binding) return undefined;
  const maxLines = bindingExpr(binding.value, ir);
  const expandedChannel = ir.behavior.normalizedChannels.find(
    (channel) => channel.name === "expanded",
  );
  return expandedChannel ? `${expandedChannel.name} ? undefined : ${maxLines}` : maxLines;
}

function nativeTokenLiteral(rawValue: string): string {
  if (rawValue.trim() === "0") return "0";
  const px = /^(-?\d+(?:\.\d+)?)px$/.exec(rawValue.trim());
  if (px) return px[1]!;
  const rem = /^(-?\d+(?:\.\d+)?)rem$/.exec(rawValue.trim());
  if (rem) return String(Number(rem[1]) * 16);
  const ms = /^(-?\d+(?:\.\d+)?)ms$/.exec(rawValue.trim());
  if (ms) return ms[1]!;
  return JSON.stringify(rawValue);
}

function tsTypeForChannel(ir: ComponentIR, channel: NormalizedChannelIR): string {
  const prop = ir.styledProps.find((p) => p.name === channel.valueProp);
  if (prop) return rnPropType(ir, prop);
  if (channel.valueType === "boolean") return "boolean";
  if (channel.valueType === "number") return "number";
  if (channel.valueType === "string") return "string";
  return "unknown";
}

function defaultForChannel(channel: NormalizedChannelIR): string {
  if (channel.valueType === "boolean") return "false";
  if (channel.valueType === "number") return "0";
  if (channel.valueType === "string") return '""';
  return "undefined";
}

function sanitizeStyleKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_$]/g, "_");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
