import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../../../ir.js";
import { generateSwiftUISurfaceFiles, isSurfaceComponent } from "./surface-emit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function repoRoot(): string {
  return resolve(__dirname, "../../../../../..");
}

function loadContract(name: string): unknown {
  const folder = resolve(repoRoot(), "packages/ds-contracts/components", name);
  const contract = JSON.parse(
    readFileSync(resolve(folder, `${name}.contract.json`), "utf8"),
  ) as { name: string; tokens?: unknown; styles?: unknown };
  for (const sidecar of ["tokens", "styles"]) {
    const p = resolve(folder, `${name}.${sidecar}.json`);
    if (existsSync(p)) {
      (contract as Record<string, unknown>)[sidecar] = JSON.parse(
        readFileSync(p, "utf8"),
      );
    }
  }
  return contract;
}

function irFor(name: string) {
  return buildComponentIR(loadContract(name) as Parameters<typeof buildComponentIR>[0]);
}

describe("generateSwiftUISurfaceFiles — centered modal (Dialog)", () => {
  it("routes every surface kind to the surface path", () => {
    expect(isSurfaceComponent(irFor("Dialog"))).toBe(true);
    expect(isSurfaceComponent(irFor("Tooltip"))).toBe(true);
    expect(isSurfaceComponent(irFor("Button"))).toBe(false);
  });

  it("emits a sheet presenting the panel through the openness channel", () => {
    const { componentFile } = generateSwiftUISurfaceFiles(irFor("Dialog"));

    expect(componentFile).toContain("public struct Dialog<Header: View, Title: View, BodyContent: View, Footer: View>: View {");
    // Presentation rides the stored controlled binding when present (a
    // computed binding over the StateObject never invalidates for
    // controlled after-mount flips — press-proven defect fix), with set
    // routing through ControllableValue so native dismissal fires
    // onOpenChange.
    expect(componentFile).toContain(".sheet(isPresented: presentationBinding)");
    expect(componentFile).toContain("private let openControlled: Binding<Bool>?");
    expect(componentFile).toContain("get: { controlled.wrappedValue },");
    expect(componentFile).toContain("set: { open.set($0) }");
    expect(componentFile).toContain("get: { open.value },");
    expect(componentFile).toContain("ControllableState(controlled: open");
    expect(componentFile).toContain("open: Binding<Bool>? = nil");
    expect(componentFile).toContain("defaultOpen: Bool = false");
    // `body` region renames to bodyContent (Swift View.body collision).
    expect(componentFile).toContain("@ViewBuilder bodyContent: () -> BodyContent = { EmptyView() }");
    expect(componentFile).not.toContain("private let body: Body");
    // Chrome is presence-driven through FsdsTheme.
    expect(componentFile).toContain('.adaptive(light: "#ffffff", dark:');
    expect(componentFile).toContain(".clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))");
  });

  it("throws for surface-less components (all surface kinds now emit)", () => {
    expect(() => generateSwiftUISurfaceFiles(irFor("Button"))).toThrow(
      /declares no surface block/,
    );
  });

  it("emits the anchored tooltip with hover-driven open channel and placement edge", () => {
    const ir = irFor("Tooltip");
    expect(ir.surface?.openTriggers).toEqual(["hover", "focus"]);
    const { componentFile } = generateSwiftUISurfaceFiles(ir);
    expect(componentFile).toContain(
      "public struct Tooltip<Trigger: View, Content: View>: View {",
    );
    expect(componentFile).toContain(".popover(isPresented: presentationBinding");
    expect(componentFile).toContain("arrowEdge: placementEdge");
    expect(componentFile).toContain(".onHover { hovering in");
    expect(componentFile).toContain("if !disabled { open.set(hovering) }");
    expect(componentFile).not.toContain("SwiftUI.Button(action: { open.toggle() })");
    expect(componentFile).toContain("ControllableState(controlled: open");
    // placement union lowers through the grammar table, auto → platform default.
    expect(componentFile).toContain("case .auto: return .bottom");
    expect(componentFile).toContain("case .top: return .top");
    // Chrome is presence-driven through FsdsTheme.
    expect(componentFile).toContain('.adaptive(light: "#141414", dark:');
    // Dismissal flags are omitted, not accepted-and-ignored.
    expect(componentFile).not.toContain("closeOnEscape");
    expect(componentFile).not.toContain("closeOnBlur");
  });

  it("lowers a click-triggered popover to a disabled-aware native button", () => {
    const ir = irFor("Popover");
    expect(ir.surface?.openTriggers).toEqual(["click"]);
    const { componentFile } = generateSwiftUISurfaceFiles(ir);

    expect(componentFile).toContain(
      "public struct Popover<Trigger: View, Content: View>: View {",
    );
    expect(componentFile).toContain("SwiftUI.Button(action: { open.toggle() }) {");
    expect(componentFile).toContain(".buttonStyle(.plain)");
    expect(componentFile).toContain(".disabled(disabled)");
    expect(componentFile).toContain(".popover(isPresented: presentationBinding");
    expect(componentFile).not.toContain(".onHover { hovering in");
  });
});

describe("generateSwiftUISurfaceFiles — coverage batch (sheet + search channel)", () => {
  it("routes the sheet kind through the centered-modal branch", () => {
    const { componentFile } = generateSwiftUISurfaceFiles(irFor("Sheet"));
    expect(componentFile).toContain(".sheet(isPresented: presentationBinding)");
    expect(componentFile).toContain("open: Binding<Bool>? = nil");
    // side/modal props omitted, never accepted-and-ignored.
    expect(componentFile).not.toContain("side:");
    expect(componentFile).not.toContain("modal:");
  });

  it("projects a second string channel as the panel search field (Command)", () => {
    const { componentFile } = generateSwiftUISurfaceFiles(irFor("Command"));
    expect(componentFile).toContain("search: Binding<String>? = nil");
    expect(componentFile).toContain("ControllableState(controlled: search");
    // The prompt is the placeholder prop: an explicit value wins over the catalog, then the contract default.
    expect(componentFile).toContain("placeholder: String? = nil,");
    expect(componentFile).toContain("self.placeholderProp = placeholder");
    expect(componentFile).toContain(
      'private var placeholder: String { placeholderProp ?? fsdsMessages.string("Command.searchPlaceholder", default: "Search...") }',
    );
    expect(componentFile).toContain("prompt: SwiftUI.Text(placeholder)");
    // Dialog carries no string channel → no search surface.
    const dialog = generateSwiftUISurfaceFiles(irFor("Dialog")).componentFile;
    expect(dialog).not.toContain("search: Binding<String>");
  });
});

describe("generateSwiftUISurfaceFiles — toast (generative substrate proof)", () => {
  it("emits ephemeral presence with dwell auto-dismiss and zero bespoke state machine", () => {
    const { componentFile } = generateSwiftUISurfaceFiles(irFor("Toast"));
    expect(componentFile).toContain(
      "public struct Toast<Item: View, Title: View, Description: View>: View {",
    );
    // The shared substrate — same field every controllable component emits.
    expect(componentFile).toContain("@ControllableState private var open: ControllableValue<Bool>");
    expect(componentFile).toContain("ControllableState(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange)");
    // Ephemeral presence ⇒ dwell task driven by the notification dismissal policy (6000ms).
    expect(componentFile).toContain(".task(id: open.value)");
    expect(componentFile).toContain("Task.sleep(for: .milliseconds(6000))");
    expect(componentFile).toContain("open.set(false)");
    // No per-class projection survives.
    expect(componentFile).not.toContain("controlledOpen");
    expect(componentFile).not.toContain("setOpen(");
  });
});

describe("generateSwiftUISurfaceFiles — coachmark (Walkthrough)", () => {
  it("emits the step channel with prev/next and skip/complete", () => {
    const { componentFile } = generateSwiftUISurfaceFiles(irFor("Walkthrough"));
    expect(componentFile).toContain("@ControllableState private var step: ControllableValue<Double>");
    expect(componentFile).toContain("step.set(step.value + 1)");
    expect(componentFile).toContain("onSkip?()");
    expect(componentFile).toContain("onComplete?()");
  });
});
