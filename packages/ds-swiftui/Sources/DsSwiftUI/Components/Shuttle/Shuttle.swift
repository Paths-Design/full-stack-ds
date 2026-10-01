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
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.structure.size.gap", fallback: .string("16px")),
            "shuttle.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-color-background", name: "shuttle.color.background", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
            "shuttle.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-color-foreground-primary", name: "shuttle.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "shuttle.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-color-border", name: "shuttle.color.border", ref: "semantic.color.border.light", fallback: .adaptive(light: "#b8b8b8", dark: "#474647")),
            "shuttle.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-shuttle-size-radius", name: "shuttle.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// Emitted through the array-iterated list path: the selection channel rides ControllableValue<[String]>; ForEach renders each item.
public struct Shuttle: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        ShuttleTokens.scopes
    }
    @StateObject private var selection: ControllableValue<[String]>
    private let accessibilityLabel: String?
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        selection: Binding<[String]>? = nil,
        defaultSelection: [String] = [],
        onSelectionChange: (([String]) -> Void)? = nil,
        accessibilityLabel: String? = nil
    ) {
        self._selection = StateObject(wrappedValue: ControllableValue(controlled: selection, defaultValue: defaultSelection, onChange: onSelectionChange))
        self.accessibilityLabel = accessibilityLabel
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root"]
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var background: Color { colorSlot("color.background") ?? .accentColor }
    private var foreground: Color { colorSlot("color.foreground.primary") ?? .primary }
    private var borderColor: Color { colorSlot("color.border") ?? .clear }
    private var radius: CGFloat { pxSlot("size.radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }

    public var body: some View {
        VStack(spacing: gap) {
            ForEach(selection.value, id: \.self) { item in
                Button {
                    selection.set(selection.value.filter { $0 != item })
                } label: {
                    SwiftUI.Text(item)
                }
                    .buttonStyle(.plain)
            }
        }
            .fsdsAccessibilityLabel(accessibilityLabel)
            .foregroundStyle(foreground)
    }
}
// @generated:end
