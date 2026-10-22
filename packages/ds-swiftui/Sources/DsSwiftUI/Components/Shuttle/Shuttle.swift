// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types

// @generated:end

// @generated:start component
/// Token scope data for Shuttle (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum ShuttleTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.structure.size.gap", fallback: .string("16px")),
            "shuttle.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-color-background", name: "shuttle.color.background", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
            "shuttle.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-color-foreground-primary", name: "shuttle.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "shuttle.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-color-border", name: "shuttle.color.border", ref: "semantic.color.border.light", fallback: .adaptive(light: "#b8b8b8", dark: "#474647")),
            "shuttle.color.list.background": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-color-list-background", name: "shuttle.color.list.background", ref: "semantic.color.background.primary", fallback: .adaptive(light: "#ffffff", dark: "#000000")),
            "shuttle.color.item.marked.background": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-color-item-marked-background", name: "shuttle.color.item.marked.background", ref: "semantic.color.background.accent", fallback: .adaptive(light: "#d92d2e", dark: "#d92d2e")),
            "shuttle.color.item.marked.foreground": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-color-item-marked-foreground", name: "shuttle.color.item.marked.foreground", ref: "semantic.color.foreground.onColor", fallback: .adaptive(light: "#ffffff", dark: "#ffffff")),
            "shuttle.size.padding": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-size-padding", name: "shuttle.size.padding", ref: "core.spacing.size.07", fallback: .string("24px")),
            "shuttle.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-size-radius", name: "shuttle.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// A dual-listbox transfer: the options outside the selection channel, and the selection itself.
/// A tap marks an item (the isSelected trait); add and remove move the marked items.
public struct Shuttle: View {
    @Environment(\.fsdsMessages) private var fsdsMessages
    private var fsdsScopes: FsdsComponentTokenScopes {
        ShuttleTokens.scopes
    }
    @ControllableState private var selection: ControllableValue<[String]>
    private let options: [String]
    private let accessibilityLabel: String?
    @State private var markedAvailable: Set<String> = []
    @State private var markedSelected: Set<String> = []
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        options: [String] = ["alpha", "beta", "gamma", "delta", "epsilon"],
        selection: Binding<[String]>? = nil,
        defaultSelection: [String] = [],
        onSelectionChange: (([String]) -> Void)? = nil,
        accessibilityLabel: String? = nil
    ) {
        self.options = options
        self._selection = ControllableState(controlled: selection, defaultValue: defaultSelection, onChange: onSelectionChange)
        self.accessibilityLabel = accessibilityLabel
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(fsdsScopes, fsdsTheme, layers: ["root"])
    }
    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }
    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }
    private var background: Color { colorSlot("color.background") ?? .clear }
    private var foreground: Color { colorSlot("color.foreground.primary") ?? .primary }
    private var borderColor: Color { colorSlot("color.border") ?? .secondary }
    private var listBackground: Color { colorSlot("color.list.background") ?? .clear }
    private var markedBackground: Color { colorSlot("color.item.marked.background") ?? .accentColor }
    private var markedForeground: Color { colorSlot("color.item.marked.foreground") ?? .white }
    private var radius: CGFloat { pxSlot("size.radius") ?? 6 }
    private var padding: CGFloat { pxSlot("size.padding") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 16 }

    /// The options outside the selection, in options order (FsdsTransferList).
    private var available: [String] { FsdsTransferList.available(options: options, value: selection.value) }
    /// The selection, in the order items were moved into it.
    private var selected: [String] { FsdsTransferList.selected(value: selection.value) }

    private func add() {
        guard let next = FsdsTransferList.adding(markedAvailable, options: options, value: selection.value) else { return }
        markedAvailable.removeAll()
        selection.set(next)
    }
    private func remove() {
        guard let next = FsdsTransferList.removing(markedSelected, value: selection.value) else { return }
        markedSelected.removeAll()
        selection.set(next)
    }

    private func list(_ items: [String], marked: Binding<Set<String>>, label: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(items, id: \.self) { item in
                let isMarked = marked.wrappedValue.contains(item)
                Button {
                    if isMarked { marked.wrappedValue.remove(item) } else { marked.wrappedValue.insert(item) }
                } label: {
                    SwiftUI.Text(item)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .foregroundStyle(isMarked ? markedForeground : foreground)
                        .background(isMarked ? markedBackground : Color.clear)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isMarked ? [.isSelected] : [])
            }
        }
        .frame(minWidth: 120, minHeight: 96, alignment: .top)
        .background(listBackground)
        .overlay(RoundedRectangle(cornerRadius: radius).stroke(borderColor, lineWidth: 1))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    public var body: some View {
        HStack(alignment: .top, spacing: gap) {
            list(available, marked: $markedAvailable, label: fsdsMessages.string("Shuttle.availableLabel", default: "Available"))
            VStack(spacing: 8) {
                Button(fsdsMessages.string("Shuttle.add", default: "Add")) { add() }
                    .disabled(FsdsTransferList.adding(markedAvailable, options: options, value: selection.value) == nil)
                Button(fsdsMessages.string("Shuttle.remove", default: "Remove")) { remove() }
                    .disabled(FsdsTransferList.removing(markedSelected, value: selection.value) == nil)
            }
            list(selected, marked: $markedSelected, label: fsdsMessages.string("Shuttle.selectedLabel", default: "Selected"))
        }
        .padding(padding)
        .background(background)
        .accessibilityElement(children: .contain)
        .fsdsAccessibilityLabel(accessibilityLabel)
    }
}
// @generated:end
