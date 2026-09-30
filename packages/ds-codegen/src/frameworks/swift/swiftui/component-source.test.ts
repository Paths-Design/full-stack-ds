import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../../../ir.js";
import { generateSwiftUIComponentSource } from "./component-source.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve a path relative to the repo root. The codegen package lives at
 * `<root>/packages/ds-codegen`; this file is four levels deep
 * (`src/frameworks/swift/swiftui/`), so the repo root is six levels up.
 */
function repoRoot(): string {
  return resolve(__dirname, "../../../../../..");
}

/**
 * Load a component contract along with its tokens/styles sidecars (if any),
 * returning the merged shape `buildComponentIR` expects. Mirrors the CLI's
 * load order: contract first, then sidecars attached as `contract.tokens` /
 * `contract.styles`.
 */
function loadContract(name: string): unknown {
  const folder = resolve(
    repoRoot(),
    "packages/ds-contracts/components",
    name,
  );
  const contract = JSON.parse(
    readFileSync(resolve(folder, `${name}.contract.json`), "utf8"),
  ) as { tokens?: unknown; styles?: unknown };
  const tokensPath = resolve(folder, `${name}.tokens.json`);
  if (existsSync(tokensPath)) {
    contract.tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
  }
  const stylesPath = resolve(folder, `${name}.styles.json`);
  if (existsSync(stylesPath)) {
    contract.styles = JSON.parse(readFileSync(stylesPath, "utf8"));
  }
  return contract;
}

function replaceComponentRef(value: unknown, from: string, to: string): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => replaceComponentRef(entry, from, to));
    return;
  }
  if (value === null || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (record.componentRef === from) record.componentRef = to;
  Object.values(record).forEach((entry) => replaceComponentRef(entry, from, to));
}

function findRecordByPart(
  value: unknown,
  part: string,
): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = findRecordByPart(entry, part);
      if (match) return match;
    }
    return undefined;
  }
  if (value === null || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (record.part === part) return record;
  for (const entry of Object.values(record)) {
    const match = findRecordByPart(entry, part);
    if (match) return match;
  }
  return undefined;
}

function loadGolden(relative: string): string {
  const path = resolve(
    repoRoot(),
    "packages/ds-codegen/__golden__",
    relative,
  );
  return readFileSync(path, "utf8");
}

describe("generateSwiftUIComponentSource — round 2 byte-identity (Switch)", () => {
  it("produces byte-identical output to Switch.swiftui.generated.swift", () => {
    const contract = loadContract("Switch") as Parameters<
      typeof buildComponentIR
    >[0];
    const ir = buildComponentIR(contract);

    const actual = generateSwiftUIComponentSource(ir);
    const expected = loadGolden("Switch/Switch.swiftui.generated.swift");

    expect(actual).toBe(expected);
  });

  it("the component path still fails loud for unknown shapes (structural)", () => {
    // With the full corpus admitted, the negative control is structural:
    // a surface-less synthetic IR with no dom and no channels matches no
    // class and must throw the explicit error.
    const ir = buildComponentIR({
      name: "Synthetic",
      description: "test",
      anatomy: { parts: ["root"], details: { root: { tag: "div" } } },
    } as Parameters<typeof buildComponentIR>[0]);
    expect(() => generateSwiftUIComponentSource(ir)).toThrow(
      /no emission class matches/,
    );
  });
});

describe("generateSwiftUIComponentSource — projected-children action (Button)", () => {
  it("emits under the Fsds prefix when the name collides with SwiftUI", () => {
    const contract = loadContract("Button") as Parameters<
      typeof buildComponentIR
    >[0];
    const ir = buildComponentIR(contract);

    const source = generateSwiftUIComponentSource(ir);

    // Reserved-type table: SwiftUI.Button collision → FsdsButton export.
    expect(source).toContain("public struct FsdsButton<Label: View>: View {");
    expect(source).not.toContain("public struct Button");
  });

  it("ships token scope data from ir.tokenScopes and resolves through FsdsTheme", () => {
    const contract = loadContract("Button") as Parameters<
      typeof buildComponentIR
    >[0];
    const ir = buildComponentIR(contract);

    const source = generateSwiftUIComponentSource(ir);

    // RN normal form: data in a caseless-enum namespace, never resolved
    // constants; resolution goes through the theme at render.
    expect(source).toContain("enum ButtonTokens {");
    expect(source).toContain("public static let scopes: FsdsComponentTokenScopes = [");
    expect(source).toContain('"variant_destructive": [');
    expect(source).toContain('fallback: .string("#0566fe")');
    // The outlined destructive label ships its themed fallback pair, so an
    // unthemed app still reads dark red on light and light red on dark.
    expect(source).toContain(
      'ref: "semantic.color.foreground.on.danger.subtle", fallback: .adaptive(light: "#900909", dark: "#ee8181")',
    );
    // The ref arm (FEAT-SWIFTUI-TOKEN-CARRIER-PARITY-01): sidecar
    // resolvesTo paths must reach the runtime so semantic-keyed theme
    // tables can override component slots like RN/Compose.
    expect(source).toMatch(/ref: "semantic\.[a-z.]+"/);
    expect(source).toContain("resolveFsdsLayeredTokens(");
    expect(source).toContain("@Environment(\\.fsdsTheme)");
    // Layering: root base + variant_<size> + variant_<intent> (Swift
    // interpolation survives into the emitted source).
    expect(source).toContain('layers: ["root", "variant_\\(size.rawValue)", "variant_\\(variant.rawValue)"]');
  });

  it("derives init defaults from contract prop defaults and applies presence-driven chrome", () => {
    const contract = loadContract("Button") as Parameters<
      typeof buildComponentIR
    >[0];
    const ir = buildComponentIR(contract);

    const source = generateSwiftUIComponentSource(ir);

    expect(source).toContain("variant: ButtonVariant = .primary,");
    expect(source).toContain("size: ButtonSize = .medium,");
    expect(source).toContain("onTap: (() -> Void)? = nil,");
    expect(source).toContain("Button(action: { onTap?() }) {");
    // Chrome slots that exist in the corpus get accessors + modifiers…
    expect(source).toContain('.background(background)');
    expect(source).toContain('.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))');
    // …and the loading affordance swaps the projected label.
    expect(source).toContain("ProgressView().controlSize(.small)");
    expect(source).toContain(".disabled(disabled || loading)");
  });
});

describe("generateSwiftUIComponentSource — default size member (ToggleSwitch)", () => {
  // ToggleSwitch's size union is small/medium/large with contract default
  // `medium` — unlike Switch's sm/md/lg with default `md`. Pins the
  // FEAT-SWIFTUI-EMITTER-WIRING-01 derivation: the initializer default and
  // the size-accessor fallback come from the contract's props[].default
  // fact, never a hardcoded `.md` (which produced invalid Swift:
  // "type 'ToggleSwitchSize' has no member 'md'").
  it("derives the initializer default from the contract prop default", () => {
    const contract = loadContract("ToggleSwitch") as Parameters<
      typeof buildComponentIR
    >[0];
    const ir = buildComponentIR(contract);

    const source = generateSwiftUIComponentSource(ir);

    expect(source).toContain("size: ToggleSwitchSize = .medium,");
    expect(source).not.toContain("= .md,");
    expect(source).toContain("case small");
    expect(source).toContain("case medium");
    expect(source).toContain("case large");
  });

  it("omits track geometry when no size token facts are authored", () => {
    // ToggleSwitch's sidecar authors no *.size.*.track.* slots, so the
    // emitter must NOT emit a .frame(width:height:) or 0-valued accessors —
    // the native Toggle keeps its intrinsic platform size instead of
    // silently rendering an invisible 0x0 control.
    const contract = loadContract("ToggleSwitch") as Parameters<
      typeof buildComponentIR
    >[0];
    const ir = buildComponentIR(contract);

    const source = generateSwiftUIComponentSource(ir);

    expect(source).not.toContain(".frame(width: trackWidth");
    expect(source).not.toContain("trackWidth");
    expect(source).not.toContain("return 0");
  });
});

describe("generateSwiftUIComponentSource — compound-part composer (Card)", () => {
  function emitCard(): string {
    const contract = loadContract("Card") as Parameters<
      typeof buildComponentIR
    >[0];
    return generateSwiftUIComponentSource(buildComponentIR(contract));
  }

  it("emits one ViewBuilder region per compound part", () => {
    const source = emitCard();
    expect(source).toContain(
      "public struct Card<Header: View, Media: View, Content: View, Footer: View, Actions: View, Badge: View, Description: View, Link: View, Note: View>: View {",
    );
    expect(source).toContain("@ViewBuilder header: () -> Header = { EmptyView() }");
    expect(source).toContain("@ViewBuilder media: () -> Media = { EmptyView() }");
    expect(source).toContain("@ViewBuilder content: () -> Content = { EmptyView() }");
    expect(source).toContain("@ViewBuilder footer: () -> Footer = { EmptyView() }");
    expect(source).toContain("@ViewBuilder actions: () -> Actions = { EmptyView() }");
    expect(source).toContain("@ViewBuilder badge: () -> Badge = { EmptyView() }");
    expect(source).toContain("@ViewBuilder description: () -> Description = { EmptyView() }");
    expect(source).toContain("@ViewBuilder link: () -> Link = { EmptyView() }");
    expect(source).toContain("@ViewBuilder note: () -> Note = { EmptyView() }");
    expect(source).toContain("VStack(spacing: gap) {");
  });

  it("realizes neutral chrome without a status accent bar", () => {
    const source = emitCard();
    expect(source).toContain("enum CardTokens {");
    expect(source).toContain('.adaptive(light: "#ffffff", dark:');
    expect(source).not.toContain(
      "Rectangle().fill(statusAccent).frame(width: statusAccentWidth)",
    );
    expect(source).toContain(".background(background, in: RoundedRectangle(cornerRadius: radius, style: .continuous))");
    expect(source).not.toContain(".clipShape(");
    expect(source).toContain(".foregroundStyle(foreground)");
  });

  it("keeps authored-default axes defaulted and no-default axes optional", () => {
    const source = emitCard();
    expect(source).not.toContain("CardStatus");
    // density defaults to the `default` member — a Swift keyword, escaped.
    expect(source).toContain("case `default`");
    expect(source).toContain("density: CardDensity = .`default`,");
  });
});

describe("generateSwiftUIComponentSource — named-slot composer (Field)", () => {
  function emitField(): string {
    const contract = loadContract("Field") as Parameters<
      typeof buildComponentIR
    >[0];
    return generateSwiftUIComponentSource(buildComponentIR(contract));
  }

  it("emits one ViewBuilder region per named slot in dom order", () => {
    const source = emitField();
    // `Field` is in the SwiftUI reserved-type table → exported as FsdsField.
    expect(source).toMatch(
      /public struct FsdsField<Label: View, Control: View, Help: View, Error: View, ValidatingIndicator: View>: View \{/,
    );
    expect(source).toContain("@ViewBuilder label: () -> Label = { EmptyView() }");
    expect(source).toContain("@ViewBuilder control: () -> Control = { EmptyView() }");
    expect(source).toContain("@ViewBuilder help: () -> Help = { EmptyView() }");
    expect(source).toContain("@ViewBuilder error: () -> Error = { EmptyView() }");
    expect(source).toContain("@ViewBuilder validatingIndicator: () -> ValidatingIndicator = { EmptyView() }");
    // No trailing comma on the final region parameter.
  });

  it("keeps Field layout-only while layering its text status axis", () => {
    const source = emitField();
    expect(source).toContain("enum FieldTokens {");
    expect(source).not.toContain('colorSlot("color.bg")');
    expect(source).not.toContain('colorSlot("color.border")');
    expect(source).not.toContain(".background(");
    expect(source).not.toContain(".clipShape(");
    expect(source).toContain('colorSlot("color.fg") ?? .primary');
    expect(source).toContain("status: FieldStatus? = nil,");
    expect(source).toContain('status.map { "variant_\\($0.rawValue)" }');
  });

  it("omits the web value-channel API instead of accepting-and-ignoring it", () => {
    const source = emitField();
    expect(source).not.toContain("value:");
    expect(source).not.toContain("onChange");
    expect(source).not.toContain("validate:");
  });
});

describe("generateSwiftUIComponentSource — value-channel text control (Input)", () => {
  function emitInput(): string {
    const contract = loadContract("Input") as Parameters<
      typeof buildComponentIR
    >[0];
    return generateSwiftUIComponentSource(buildComponentIR(contract));
  }

  it("projects the string channel through the controllable-state pattern", () => {
    const source = emitInput();
    expect(source).toContain("public struct Input: View {");
    expect(source).toContain("@StateObject private var text: ControllableValue<String>");
    expect(source).toContain("value: Binding<String>? = nil");
    expect(source).toContain("@StateObject private var text: ControllableValue<String>");
    expect(source).toContain("onChange: onChange))");
    expect(source).toContain("TextField(");
    expect(source).toContain("prompt: placeholder.map(SwiftUI.Text.init)");
  });

  it("omits HTML-form props instead of accepting-and-ignoring them", () => {
    const source = emitInput();
    for (const omitted of ["type: String", "required: Bool", "name: String", "invalid: Bool"]) {
      expect(source).not.toContain(omitted);
    }
  });

  it("realizes chrome through FsdsTheme with the input suffix forms", () => {
    const source = emitInput();
    expect(source).toContain('colorSlot("color.bg.default")');
    expect(source).toContain('colorSlot("color.text.default")');
    expect(source).toContain('.background(background)');
    expect(source).toContain('.frame(minHeight: minHeight)');
  });
});

describe("generateSwiftUIComponentSource — coverage batch (disclosure + static content)", () => {
  function emit(name: string): string {
    const contract = loadContract(name) as Parameters<
      typeof buildComponentIR
    >[0];
    return generateSwiftUIComponentSource(buildComponentIR(contract));
  }

  it("collapses native-disclosure to DisclosureGroup (Details)", () => {
    const source = emit("Details");
    expect(source).toContain("DisclosureGroup(isExpanded: Binding(");
    expect(source).toContain("summary: String? = nil");
    expect(source).toContain("ControllableValue(controlled: open");
    expect(source).toContain("Text(summary)");
  });

  it("emits static content for Label and Blockquote", () => {
    // Label collides with SwiftUI.Label → FsdsLabel via the reserved table.
    const label = emit("Label");
    expect(label).toContain("public struct FsdsLabel<Content: View>: View {");
    expect(label).toContain("@ViewBuilder content: () -> Content");
    const quote = emit("Blockquote");
    expect(quote).toContain("public struct Blockquote<Content: View>: View {");
    expect(quote).not.toContain("cite:");
  });

  it("emits static content for Links and List (gate breadth)", () => {
    expect(emit("Links")).toContain("@ViewBuilder content: () -> Content");
    expect(emit("List")).toContain("@ViewBuilder content: () -> Content");
  });
});

describe("generateSwiftUIComponentSource — coverage batch 2", () => {
  function emit(name: string): string {
    const contract = loadContract(name) as Parameters<
      typeof buildComponentIR
    >[0];
    return generateSwiftUIComponentSource(buildComponentIR(contract));
  }

  it("lowers the boolean input channel to a checkbox Toggle (Checkbox)", () => {
    const source = emit("Checkbox");
    expect(source).toContain("public struct Checkbox: View {");
    expect(source).toContain(".toggleStyle(.checkbox)");
    expect(source).toContain("checked: Binding<Bool>? = nil");
    expect(source).toContain("onChange: onChange))");
    expect(source).not.toContain("indeterminate:");
  });

  it("lowers the bare hr rule to FsdsDivider with a local orientation enum", () => {
    const source = emit("Divider");
    expect(source).toContain("public struct FsdsDivider: View {");
    expect(source).toContain("public enum DividerOrientation: String, CaseIterable {");
    expect(source).toContain("orientation: DividerOrientation? = nil");
    expect(source).toContain("Divider()");
  });

  it("lowers the progressbar role to ProgressView with contract 0-100 semantics", () => {
    const source = emit("Progress");
    expect(source).toContain("ProgressView(value: value / 100)");
    expect(source).toContain("value: Double? = nil");
    expect(source).toContain("ProgressView()");
    expect(source).toContain(".fsdsAccessibilityLabel(label)");
  });

  it("lowers the visual-only leaf to a native spinner (Spinner)", () => {
    const source = emit("Spinner");
    expect(source).toContain("public struct Spinner: View {");
    expect(source).toContain("ProgressView()");
    expect(source).not.toContain("showAfterMs");
  });
});

describe("generateSwiftUIComponentSource — glyph host (Icon)", () => {
  it("emits a registry lookup with size hints and decorative default", () => {
    const contract = loadContract("Icon") as Parameters<
      typeof buildComponentIR
    >[0];
    const source = generateSwiftUIComponentSource(buildComponentIR(contract));
    expect(source).toContain("public struct Icon: View {");
    expect(source).toContain("GlyphCatalog.glyph(named: name, size: glyphSize)");
    expect(source).toContain("case .sm: return 16");
    expect(source).toContain("case .md: return 20");
    expect(source).toContain("case .lg: return 24");
    expect(source).toContain("case .xl: return 32");
    expect(source).toContain(".accessibilityHidden(");
    expect(source).toContain("GlyphCatalog.decorativeDefaults.contains(name)");
  });
});

describe("generateSwiftUIComponentSource — selection control (Select)", () => {
  function emitSelect(): string {
    const contract = loadContract("Select") as Parameters<
      typeof buildComponentIR
    >[0];
    return generateSwiftUIComponentSource(buildComponentIR(contract));
  }

  it("lowers the union channel to SelectionState with the mode gate", () => {
    const source = emitSelect();
    expect(source).toContain("public struct Select: View {");
    expect(source).toContain("@StateObject private var selection: SelectionState");
    expect(source).toContain("multiple: multiple,");
    expect(source).toContain("selection.apply(option.value)");
    expect(source).toContain("@StateObject private var open: ControllableValue<Bool>");
    // searchable/filterFn omitted, never accepted-and-ignored.
    expect(source).not.toContain("searchable");
    expect(source).not.toContain("filterFn");
  });

  it("synthesizes the option struct from the contract alias", () => {
    const source = emitSelect();
    expect(source).toContain("public struct SelectOption: Identifiable {");
    expect(source).toContain("public var id: String { value }");
    expect(source).toContain("public let value: String");
    expect(source).toContain("public let label: String");
    expect(source).toContain("public let disabled: Bool?");
  });
});

describe("generateSwiftUIComponentSource — icon-decorated content (Alert, Badge)", () => {
  function emit(name: string): string {
    const contract = loadContract(name) as Parameters<
      typeof buildComponentIR
    >[0];
    return generateSwiftUIComponentSource(buildComponentIR(contract));
  }

  it("emits ReactNode icons as consumer regions (Alert)", () => {
    const source = emit("Alert");
    expect(source).toMatch(/public struct Alert<IconRegion: View, Content: View>: View \{/);
    expect(source).toContain("@ViewBuilder icon: () -> IconRegion = { EmptyView() }");
    expect(source).toContain("iconRegion");
    // The dismiss component-instance is omitted, not wired.
    expect(source).not.toContain("onDismiss");
  });

  it("emits Badge with axes and the icon region", () => {
    const source = emit("Badge");
    expect(source).toMatch(/public struct Badge<IconRegion: View, Content: View>: View \{/);
    expect(source).not.toContain("showStatusIcon");
  });

  it("Status admits via static content (icon part has no author-addressable prop)", () => {
    expect(emit("Status")).toContain("public struct Status");
  });
});

describe("generateSwiftUIComponentSource — count-iterated field group (OTP)", () => {
  it("distributes the string channel over N fields with setCharAt semantics", () => {
    const contract = loadContract("OTP") as Parameters<
      typeof buildComponentIR
    >[0];
    const source = generateSwiftUIComponentSource(buildComponentIR(contract));
    expect(source).toContain("public struct OTP: View {");
    expect(source).toContain("@StateObject private var value: ControllableValue<String>");
    expect(source).toContain("ForEach(0..<length");
    expect(source).toContain("setCharacter($0, at: index)");
    expect(source).toContain("payload[payload.count - 1]");
    expect(source).toContain("onComplete?(next)");
    expect(source).not.toContain("readOnly:");
    expect(source).not.toContain("mode:");
  });
});

describe("generateSwiftUIComponentSource — compositeref batch (TextField, Chip)", () => {
  function emit(name: string): string {
    const contract = loadContract(name) as Parameters<
      typeof buildComponentIR
    >[0];
    return generateSwiftUIComponentSource(buildComponentIR(contract));
  }

  it("emits TextField with slot regions over the controllable substrate", () => {
    const source = emit("TextField");
    expect(source).toContain(
      "public struct TextField<LabelRegion: View, DescriptionRegion: View, ErrorRegion: View>: View {",
    );
    expect(source).toContain("@StateObject private var value: ControllableValue<String>");
    expect(source).toContain("SwiftUI.TextField(\"\", text: value.binding())");
    expect(source).toContain("@ViewBuilder label: () -> LabelRegion = { EmptyView() }");
    expect(source).not.toContain("required:");
    expect(source).not.toContain("ariaDescribedby:");
  });

  it("emits Chip as the dual referenced-action composition", () => {
    const source = emit("Chip");
    expect(source).toContain("public struct Chip<Text: View, IconRegion: View>: View {");
    expect(source).toContain("DsSwiftUI.FsdsButton(");
    expect(source).toContain("onTap: onClick");
    expect(source).toContain("onTap: onDismiss");
    expect(source).toContain("if dismissible {");
    expect(source).toContain('SwiftUI.Image(systemName: "xmark")');
    expect(source).not.toContain("ariaExpanded:");
  });
});

describe("generateSwiftUIComponentSource — final five", () => {
  function emit(name: string): string {
    const contract = loadContract(name) as Parameters<
      typeof buildComponentIR
    >[0];
    return generateSwiftUIComponentSource(buildComponentIR(contract));
  }

  it("emits Shuttle over the array-channel substrate", () => {
    const source = emit("Shuttle");
    expect(source).toContain("@StateObject private var selection: ControllableValue<[String]>");
    expect(source).toContain("ForEach(selection.value, id: \\.self)");
  });

  it("emits Accordion and Tabs as interactive composites", () => {
    const accordion = emit("Accordion");
    expect(accordion).toContain("ControllableValue<[String]>");
    const tabs = emit("Tabs");
    expect(tabs).toContain("@StateObject private var activeTab: ControllableValue<String>");
  });

  it("emits Calendar on the Date channel", () => {
    const source = emit("Calendar");
    expect(source).toContain("@StateObject private var value: ControllableValue<Date?>");
    expect(source).toContain("SwiftUI.DatePicker(");
    expect(source).not.toContain("locale:");
  });
});

/**
 * Emission-class assignment must follow contract semantics, not incidental web
 * DOM topology. Repairing a web style carrier changes `anatomy.dom`; that must
 * neither drop a component out of every class (a hard emit failure) nor pull an
 * unrelated component into an earlier, broader class in the ordered dispatch
 * chain (a silent realization swap).
 *
 * Each negative below pins a distinct guard, so removing any one guard turns
 * exactly one of these red.
 */
describe("generateSwiftUIComponentSource — emission-class assignment", () => {
  function emit(name: string): string {
    const contract = loadContract(name) as Parameters<
      typeof buildComponentIR
    >[0];
    return generateSwiftUIComponentSource(buildComponentIR(contract));
  }

  const ACTION = "Emitted through the projected-children action path";
  const BOOLEAN_CONTROL = "Emitted through the boolean-channel control path";

  it("Button takes the action path despite spinner/loadingText chrome around its content region", () => {
    expect(emit("Button")).toContain(ACTION);
  });

  it("Checkbox takes the boolean-control path with its input nested under a label root", () => {
    expect(emit("Checkbox")).toContain(BOOLEAN_CONTROL);
  });

  it("Chip is a dual-action composite, not an action — its role is button but its root element is not", () => {
    const source = emit("Chip");
    expect(source).toContain("Emitted through the dual-action composite path");
    expect(source).not.toContain(ACTION);
  });

  it("selects the dual-action path structurally and emits the referenced action type", () => {
    const contract = structuredClone(loadContract("Chip"));
    replaceComponentRef(contract, "fsds.Button", "fsds.ActionControl");

    const source = generateSwiftUIComponentSource(
      buildComponentIR(contract as Parameters<typeof buildComponentIR>[0]),
    );

    expect(source).toContain("Emitted through the dual-action composite path");
    expect(source).toContain("DsSwiftUI.ActionControl(");
    expect(source).not.toContain("DsSwiftUI.FsdsButton(");
  });

  it("rejects a dual-reference shape whose dismiss event does not carry onDismiss", () => {
    const contract = structuredClone(loadContract("Chip"));
    const dismiss = findRecordByPart(contract, "dismiss");
    expect(dismiss).toBeDefined();
    const events = dismiss?.events;
    expect(events).toBeTypeOf("object");
    (events as Record<string, unknown>).click = "prop:onClick";

    const ir = buildComponentIR(
      contract as Parameters<typeof buildComponentIR>[0],
    );
    expect(() => generateSwiftUIComponentSource(ir)).toThrow(
      /no emission class matches/,
    );
  });

  it("selects the src-fallback path structurally and emits the referenced media type", () => {
    const contract = structuredClone(loadContract("Avatar"));
    replaceComponentRef(contract, "fsds.Image", "fsds.MediaAsset");

    const source = generateSwiftUIComponentSource(
      buildComponentIR(contract as Parameters<typeof buildComponentIR>[0]),
    );

    expect(source).toContain("Emitted through the src-or-fallback path");
    expect(source).toContain("DsSwiftUI.MediaAsset(src: src, alt: name)");
    expect(source).not.toContain("DsSwiftUI.Image(src:");
  });

  it("ShowMore is expandable content, not an action — role button over a div root", () => {
    const source = emit("ShowMore");
    expect(source).toContain("Emitted through the expandable-content path");
    expect(source).not.toContain(ACTION);
  });

  it("OTP is a count-iterated field group, not a scalar control — its input is iterated", () => {
    const source = emit("OTP");
    expect(source).toContain("Emitted through the count-iterated field-group path");
    expect(source).not.toContain(BOOLEAN_CONTROL);
    expect(source).not.toContain("Emitted through the value-channel text-control path");
  });

  it("Select is a selection control, not a scalar control — its input belongs to the listbox search", () => {
    const source = emit("Select");
    expect(source).toContain("Emitted through the selection-control path");
    expect(source).not.toContain(BOOLEAN_CONTROL);
  });

  it("an iterated direct-child input is not a scalar control — collapsing it to one Toggle would drop N-1 fields", () => {
    // No corpus contract pairs an iterated input with a sole scalar channel,
    // so this shape is synthetic. Without the iteration guard the IR below
    // reaches the boolean-control path and emits a single Toggle for a
    // control the contract says renders `count` times.
    const ir = buildComponentIR({
      name: "IteratedToggle",
      description: "test",
      anatomy: {
        parts: ["root", "field"],
        details: { root: { tag: "div" }, field: { tag: "input" } },
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              tag: "input",
              part: "field",
              iterate: { source: "prop:count", kind: "count" },
              attrs: { type: "checkbox" },
              bindings: { checked: "channel:checked.value" },
            },
          ],
        },
      },
      props: {
        designed: {
          members: [
            { name: "count", propType: { kind: "number" }, description: "n" },
            { name: "checked", propType: { kind: "boolean" }, description: "c" },
          ],
        },
      },
      channels: {
        checked: { value: "checked", valueType: "boolean", description: "c" },
      },
    } as unknown as Parameters<typeof buildComponentIR>[0]);
    expect(() => generateSwiftUIComponentSource(ir)).toThrow(
      /no emission class matches/,
    );
  });
});
