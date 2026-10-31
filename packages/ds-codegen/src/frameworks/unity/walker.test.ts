import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { loadContractWithSidecars } from "./boundary.js";
import { createUnityEmitter, unityLowering } from "./factory.js";

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");

function irFor(name: string, replacement: string) {
  const contract = loadContractWithSidecars(root, name) as ComponentContract;
  const ir = buildComponentIR(contract);
  ir.name = replacement;
  expect(unityLowering(ir).behavior).toBe("Passive");
  return ir;
}

const emit = (ir: ReturnType<typeof irFor>): string => createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;

function surfaceIr(name: string, replacement: string) {
  const contract = loadContractWithSidecars(root, name) as ComponentContract;
  const ir = buildComponentIR(contract);
  ir.name = replacement;
  expect(unityLowering(ir).behavior).toBe("AnchoredSurface");
  return ir;
}

describe("Unity passive anatomy path", () => {
  it("emits a channel-free rule host with a real orientation style carrier", () => {
    const ir = irFor("Divider", "UnrelatedRule");
    ir.styledProps = ir.styledProps.filter(prop => prop.name === "orientation");
    const output = emit(ir);
    expect(output).toContain("public partial class UnrelatedRule : VisualElement");
    expect(output).toContain('[UxmlAttribute] public string Orientation { get => Variants.Get(this, "divider", "horizontal", "vertical");');
    expect(output).not.toContain("ChannelName");
    expect(output).not.toContain("ChangeHandler");
    expect(output).not.toMatch(/(?:BooleanControl|ItemGroup|AnchoredSurface)\.Attach\(this/);
  });

  it("emits a consumer-content host without synthesizing a channel or interaction", () => {
    const ir = irFor("Text", "UnrelatedContent");
    ir.styledProps = ir.styledProps.filter(prop => prop.name === "variant" || prop.name === "weight");
    ir.dom!.bindings = {};
    const output = emit(ir);
    expect(output).toContain("public partial class UnrelatedContent : TextElement");
    expect(output).toContain("public UnrelatedContent()");
    expect(output).not.toContain("ChannelName");
    expect(output).not.toMatch(/(?:BooleanControl|ItemGroup|AnchoredSurface)\.Attach\(this/);
    expect(output).not.toContain("INotifyValueChanged");
  });

  it("emits bounded passive roots while leaving unprojected props out of their API", () => {
    const rule = emit(irFor("Divider", "UnrelatedRule"));
    expect(rule).toContain("public partial class UnrelatedRule : VisualElement");
    expect(rule).toContain("public string Orientation");
    expect(rule).not.toMatch(/public (?:bool|string) (?:Decorative|Thickness|Title) \{/);
    const text = emit(irFor("Text", "UnrelatedContent"));
    expect(text).toContain("public partial class UnrelatedContent : TextElement");
    expect(text).not.toMatch(/public (?:bool|string) (?:As|Align|Transform|Truncate) \{/);
  });

  it("refuses authored passive anatomy that a native host would silently drop", () => {
    const rootContent = irFor("Divider", "UnrelatedRule");
    rootContent.dom!.content = { kind: "literal", value: "Hidden" };
    expect(() => emit(rootContent)).toThrow("UNITY_UNSUPPORTED_PASSIVE_ANATOMY: UnrelatedRule root has unlowered authored facts");
    const arbitraryDataBinding = irFor("Text", "UnrelatedContent");
    arbitraryDataBinding.dom!.bindings["title"] = { kind: "prop", prop: "truncate" };
    expect(() => emit(arbitraryDataBinding)).toThrow("UNITY_UNSUPPORTED_PASSIVE_ANATOMY: UnrelatedContent root has unlowered authored facts");
    const compoundContent = irFor("Text", "UnrelatedContent");
    compoundContent.styledProps = [];
    compoundContent.dom!.bindings = {};
    const caption = { ...compoundContent.parts[0]!, name: "caption", nativeTag: "span", isCompound: true, isRootOnly: false };
    compoundContent.parts.push(caption);
    compoundContent.compoundParts.push(caption);
    compoundContent.dom!.children = [{ ...compoundContent.dom!, tag: "span", part: "caption", content: { kind: "literal", value: "VISIBLE" }, children: [] }];
    expect(() => emit(compoundContent)).toThrow("UNITY_UNSUPPORTED_PASSIVE_ANATOMY: UnrelatedContent caption has unlowered authored facts");
  });

  it("emits only carrier-backed axes for the admitted passive containers", () => {
    const quote = emit(irFor("Blockquote", "UnrelatedQuote"));
    expect(quote).toContain('[UxmlAttribute] public string Variant { get => Variants.Get(this, "blockquote", "default", "bordered", "highlighted");');
    expect(quote).toContain('[UxmlAttribute] public string Size { get => Variants.Get(this, "blockquote", "sm", "md", "lg");');
    expect(quote).not.toMatch(/Cite/);
    const stat = emit(irFor("Stat", "UnrelatedStat"));
    expect(stat).toContain('[UxmlAttribute] public string Size { get => Variants.Get(this, "stat", "sm", "md", "lg");');
    expect(stat).toContain('[UxmlAttribute] public string Trend { get => Variants.Get(this, "stat", "up", "down", "neutral");');
    const flag = emit(irFor("ProfileFlag", "UnrelatedFlag"));
    expect(flag).toContain("public partial class UnrelatedFlag : VisualElement");
    expect(flag).not.toMatch(/Profile\b(?!Flag)/);
  });

  it("omits a guarded node-content decoration and keeps only carrier axes for Badge", () => {
    const source = emit(irFor("Badge", "UnrelatedBadge"));
    expect(source).toContain('Variants.Get(this, "badge", "default", "status", "counter", "tag")');
    expect(source).toContain('Variants.Get(this, "badge", "info", "success", "warning", "danger")');
    expect(source).toContain('Variants.Get(this, "badge", "sm", "md", "lg")');
    // The guarded node-content icon decoration is omitted; only the composed content part remains.
    expect(source).not.toMatch(/Icon\b/);
    expect(source).not.toMatch(/ShowStatusIcon/);
    expect(source).toContain("public partial class UnrelatedBadgeContent : VisualElement");
    expect(source).toContain('AddToClassList("badge__content")');
  });

  it("emits prefixed modifier carriers for List and withholds the uncarried axes", () => {
    const source = emit(irFor("List", "UnrelatedList"));
    expect(source).toContain("public partial class UnrelatedList : VisualElement");
    expect(source).toContain('AddToClassList("list")');
    expect(source).toContain('Variants.GetAxis(this, "list", "variant-", "default", "unstyled", "inline", "divided", "spaced")');
    expect(source).toContain('Variants.GetAxis(this, "list", "size-", "sm", "md", "lg")');
    expect(source).not.toMatch(/public string (?:As|Marker|Spacing)\b/);
  });

  it("omits guarded alert chrome and emits only its carrier axes", () => {
    const alert = emit(irFor("Alert", "UnrelatedAlert"));
    expect(alert).toContain('Variants.Get(this, "alert", "info", "success", "warning", "danger")');
    expect(alert).toContain('Variants.Get(this, "alert", "inline", "section", "page")');
    expect(alert).toContain("public partial class UnrelatedAlertBody : VisualElement");
    expect(alert).not.toMatch(/Dismissible|OnDismiss|DismissLabel/);
    const notice = emit(irFor("AlertNotice", "UnrelatedNotice"));
    expect(notice).toContain('Variants.Get(this, "alert-notice", "info", "success", "warning", "error")');
    expect(notice).toContain('Variants.Get(this, "alert-notice", "page", "section", "inline")');
    expect(notice).not.toMatch(/Dismissible|OnDismiss|DismissLabel/);
  });

  it("ignores passive-root DOM metadata bindings for the semantic wrappers", () => {
    const label = emit(irFor("Label", "UnrelatedLabel"));
    expect(label).toContain("public partial class UnrelatedLabel : TextElement");
    expect(label).toContain('AddToClassList("label")');
    expect(label).not.toMatch(/HtmlFor|public string Form\b/);
    const crumbs = emit(irFor("Breadcrumbs", "UnrelatedCrumbs"));
    expect(crumbs).toContain("public partial class UnrelatedCrumbs : VisualElement");
    expect(crumbs).toContain("public partial class UnrelatedCrumbsList : VisualElement");
    expect(crumbs).toContain("public partial class UnrelatedCrumbsItem : VisualElement");
    expect(crumbs).not.toMatch(/AriaLabel|Separator/);
  });

  it("attaches the tooltip surface in hover/focus-open mode", () => {
    const source = emit(surfaceIr("Tooltip", "UnrelatedTip") as ReturnType<typeof irFor>);
    expect(source).toContain("public partial class UnrelatedTip : VisualElement, INotifyValueChanged<bool>");
    expect(source).toContain("public partial class UnrelatedTipTrigger : UnityEngine.UIElements.Button");
    expect(source).toContain("public partial class UnrelatedTipContent");
    expect(source).toContain('stateClass: null, openOnHover: true, openOnFocus: true, closeOnPointerLeave: true, contentFocusable: false');
    expect(source).not.toMatch(/EnableInClassList/);
  });

  it("omits a decoration component instance and suffixes the colliding carrier member", () => {
    const source = emit(irFor("Status", "UnrelatedStatus"));
    expect(source).toContain("public partial class UnrelatedStatus : VisualElement");
    expect(source).toContain("public VisualElement Label { get; } = new VisualElement();");
    expect(source).toContain("public override VisualElement contentContainer => Label;");
    expect(source).toContain('public string Status { get => Variants.Get(this, "status", "info", "success", "warning", "danger", "error");');
    expect(source).not.toMatch(/Icon\b/);
  });

  it("synthesizes a parts-only container and its composed subcomponent classes", () => {
    const source = emit(irFor("Card", "UnrelatedCard"));
    expect(source).toContain("public partial class UnrelatedCard : VisualElement");
    expect(source).toContain('public string Density { get => Variants.Get(this, "card", "default", "inset");');
    for (const part of ["Header", "Media", "Content", "Footer", "Actions", "Badge", "Description", "Link", "Note"]) {
      expect(source).toContain(`public partial class UnrelatedCard${part} : VisualElement`);
      expect(source).toContain(`AddToClassList("card__${part.toLowerCase()}");`);
    }
    expect(source).not.toMatch(/Interactive/);
  });

  it("lowers the semantic nav container with its composed list and item classes", () => {
    const source = emit(irFor("NavList", "UnrelatedNav"));
    expect(source).toContain("public partial class UnrelatedNav : VisualElement");
    expect(source).toContain("public partial class UnrelatedNavList : VisualElement");
    expect(source).toContain("public partial class UnrelatedNavItem : VisualElement");
    expect(source).toContain('AddToClassList("nav-list__list");');
    expect(source).toContain('AddToClassList("nav-list__item");');
    expect(source).not.toMatch(/Orientation|AriaLabel/);
  });

  it("omits the iteration subtree and keeps only carrier axes for Skeleton", () => {
    const source = emit(irFor("Skeleton", "UnrelatedPlaceholder"));
    expect(source).toContain("public partial class UnrelatedPlaceholder : VisualElement");
    expect(source).toContain('Variants.Get(this, "skeleton", "block", "text", "avatar", "media", "dataviz", "actions")');
    expect(source).toContain('Variants.Get(this, "skeleton", "shimmer", "wipe", "pulse", "none")');
    expect(source).toContain('Variants.Get(this, "skeleton", "compact", "regular", "spacious")');
    expect(source).not.toMatch(/UnrelatedPlaceholder(?:Stack|Row|Shape)\b/);
    expect(source).not.toMatch(/Lines|Radius|AspectRatio|Decorative|AriaLabel/);
  });

  it("lowers the semantic table container with its native region and composed parts", () => {
    const source = emit(irFor("Table", "UnrelatedGrid"));
    expect(source).toContain("public partial class UnrelatedGrid : VisualElement");
    expect(source).toContain("public VisualElement Container { get; } = new VisualElement();");
    expect(source).toContain("public override VisualElement contentContainer => Container;");
    expect(source).toContain('AddToClassList("table__container");');
    for (const part of ["Caption", "Head", "Body", "Footer", "Row", "Cell", "HeaderCell"]) {
      expect(source).toContain(`public partial class UnrelatedGrid${part} : VisualElement`);
    }
    expect(source).not.toMatch(/Responsive|AriaLabel/);
  });

  it("omits the content-transform chrome and keeps a consumer code region for CodeBlock", () => {
    const source = emit(irFor("CodeBlock", "UnrelatedCode"));
    expect(source).toContain("public partial class UnrelatedCode : VisualElement");
    expect(source).toContain("public VisualElement Code { get; } = new VisualElement();");
    expect(source).toContain('AddToClassList("code-block__code");');
    expect(source).toContain("public override VisualElement contentContainer => children;");
    expect(source).not.toMatch(/UnrelatedCode(?:Source|Line|Gutter|Token)\b/);
    expect(source).not.toMatch(/public string (?:Code|Language|Highlight|Tokens|ShowLineNumbers)\b/);
  });

  it("attaches a disclosure and projects the summary string for Details", () => {
    const contract = loadContractWithSidecars(root, "Details") as ComponentContract;
    const detailsIr = buildComponentIR(contract);
    detailsIr.name = "UnrelatedDisclosure";
    const source = createUnityEmitter().emitComponent(detailsIr, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class UnrelatedDisclosure : VisualElement");
    expect(source).toContain("public DisclosureControl Disclosure { get; }");
    expect(source).toContain("DisclosureControl.Attach(this, summary: SummaryControl, content: Content, stateClass: \"is-open\");");
    expect(source).toContain('public string Summary { get => SummaryText.text; set { SummaryText.text = value ?? ""; } }');
    expect(source).toContain("public override VisualElement contentContainer => Content;");
    expect(source).toContain("public UnityEngine.UIElements.Button Trigger => SummaryControl;");
  });

  it("attaches a value fill and projects the numeric value for Progress", () => {
    const contract = loadContractWithSidecars(root, "Progress") as ComponentContract;
    const progressIr = buildComponentIR(contract);
    progressIr.name = "UnrelatedMeter";
    const source = createUnityEmitter().emitComponent(progressIr, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class UnrelatedMeter : VisualElement");
    expect(source).toContain("public ProgressControl ValueFill { get; }");
    expect(source).toContain("ValueFill = ProgressControl.Attach(this, fill: Fill, valueElement: ValueControl, min: 0, max: 100);");
    expect(source).toContain("public float Value { get => (float)ValueFill.Value; set => ValueFill.Value = value; }");
    expect(source).toContain("public bool ShowValue { get => ValueFill.ShowValue; set => ValueFill.ShowValue = value; }");
    expect(source).toContain('Variants.Get(this, "progress", "info", "success", "warning", "danger")');
    expect(source).toContain("public override VisualElement contentContainer => ValueControl;");
    expect(source).not.toMatch(/FormatValue|public string Label/);
  });

  it("renders composed triggers as native action chrome for Chip", () => {
    const contract = loadContractWithSidecars(root, "Chip") as ComponentContract;
    const chipIr = buildComponentIR(contract);
    chipIr.name = "UnrelatedTag";
    const source = createUnityEmitter().emitComponent(chipIr, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class UnrelatedTag : VisualElement");
    expect(source).toContain("public UnityEngine.UIElements.Button Action { get; } = new UnityEngine.UIElements.Button();");
    expect(source).toContain("public UnityEngine.UIElements.Button Dismiss { get; } = new UnityEngine.UIElements.Button();");
    expect(source).toContain("public Action OnClick { get; set; }");
    expect(source).toContain("public Action OnDismiss { get; set; }");
    expect(source).toContain("Action.clicked += () => OnClick?.Invoke();");
    expect(source).toContain("Dismiss.clicked += () => OnDismiss?.Invoke();");
    expect(source).toContain("public bool Dismissible {");
    expect(source).toContain("Dismissible = false;");
    expect(source).toContain("public override VisualElement contentContainer => Text;");
    expect(source).not.toMatch(/AriaLabel|AriaExpanded|AriaPressed/);
  });

  it("attaches a blocking modal surface and renders its content panel for Dialog", () => {
    const contract = loadContractWithSidecars(root, "Dialog") as ComponentContract;
    const dialogIr = buildComponentIR(contract);
    dialogIr.name = "UnrelatedDialog";
    const source = createUnityEmitter().emitComponent(dialogIr, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class UnrelatedDialog : VisualElement");
    expect(source).toContain("public ModalSurface Surface { get; }");
    expect(source).toContain("ModalSurface.Attach(this, content: Modal, overlay: Backdrop, trigger: CloseButton, stateClass: \"is-open\");");
    expect(source).toContain("public override VisualElement contentContainer => Body;");
    expect(source).toContain("public VisualElement Content => Modal;");
    expect(source).toContain("public bool Dismissible { get => Surface.Dismissible; set => Surface.Dismissible = value; }");
    expect(source).toContain("public bool CloseOnBackdropClick { get => Surface.CloseOnOverlayClick; set => Surface.CloseOnOverlayClick = value; }");
    expect(source).toContain("public bool CloseOnEscape { get => Surface.CloseOnEscape; set => Surface.CloseOnEscape = value; }");
    expect(source).not.toMatch(/AriaLabel|InitialFocus|ReturnFocus|public bool Modal /);
  });

  it("reuses the modal surface for an edge-placed Sheet and drives placement", () => {
    const contract = loadContractWithSidecars(root, "Sheet") as ComponentContract;
    const sheetIr = buildComponentIR(contract);
    sheetIr.name = "UnrelatedPanel";
    const source = createUnityEmitter().emitComponent(sheetIr, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class UnrelatedPanel : VisualElement");
    expect(source).toContain("public ModalSurface Surface { get; }");
    expect(source).toContain("ModalSurface.Attach(this, content: Content, overlay: Overlay, trigger: Close, stateClass: \"is-open\");");
    expect(source).toContain('public string Side { get => Variants.Get(this, "sheet", "top", "right", "bottom", "left"); set { Variants.Set(this, "sheet", value, "top", "right", "bottom", "left"); Surface.Placement = value; } }');
    expect(source).toContain("public override VisualElement contentContainer => Body;");
    expect(source).not.toMatch(/AriaLabel|public bool Modal /);
  });

  it("lowers a native text input with a string channel for Input", () => {
    const contract = loadContractWithSidecars(root, "Input") as ComponentContract;
    const inputIr = buildComponentIR(contract);
    inputIr.name = "UnrelatedField";
    const source = createUnityEmitter().emitComponent(inputIr, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class UnrelatedField : UnityEngine.UIElements.TextField");
    expect(source).toContain("public TextControl Control { get; }");
    expect(source).toContain("public string Value { get => Control.Value; set => Control.Value = value; }");
    expect(source).toContain("public string Placeholder { get => Control.Placeholder; set => Control.Placeholder = value; }");
    expect(source).toContain("Control = TextControl.Attach(this);");
    expect(source).not.toMatch(/AriaLabel|public bool Required|public string Name /);
  });

  it("wraps a native text field with named slots for TextField", () => {
    const contract = loadContractWithSidecars(root, "TextField") as ComponentContract;
    const fieldIr = buildComponentIR(contract);
    fieldIr.name = "UnrelatedFieldGroup";
    const source = createUnityEmitter().emitComponent(fieldIr, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class UnrelatedFieldGroup : VisualElement");
    expect(source).toContain("public UnityEngine.UIElements.TextField Field { get; } = new UnityEngine.UIElements.TextField();");
    expect(source).toContain('LabelSlot.AddToClassList("text-field__label");');
    expect(source).toContain("public TextControl Control { get; }");
    expect(source).toContain("Control = TextControl.Attach(Field);");
    expect(source).toContain("public string Value { get => Control.Value; set => Control.Value = value; }");
    expect(source).not.toMatch(/AriaLabel|public bool Required|public string Name /);
  });

  it("lowers a passive text host with a generated text attribute for CodeSnippet", () => {
    const contract = loadContractWithSidecars(root, "CodeSnippet") as ComponentContract;
    const snippetIr = buildComponentIR(contract);
    snippetIr.name = "UnrelatedSnippet";
    const source = createUnityEmitter().emitComponent(snippetIr, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class UnrelatedSnippet : TextElement");
    expect(source).toContain('public string As { get => Variants.Get(this, "code-snippet", "code", "kbd", "samp");');
    expect(source).toContain('public string Text { get => this.text; set => this.text = value ?? ""; }');
    expect(source).not.toMatch(/public string As .*\n.*Text.*\{ get; \}/);
  });
});
