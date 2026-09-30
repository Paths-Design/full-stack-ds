// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum FieldStatus: String, CaseIterable {
    case idle
    case validating
    case valid
    case invalid
}
// @generated:end

// @generated:start component
/// Token scope data for FsdsField (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum FieldTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.input.size.medium.gap", fallback: .string("8px")),
            "field.color.fg": FsdsComponentTokenDefinition(cssVar: "--fsds-field-color-fg", name: "field.color.fg", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
        ],
        "variant_idle": [
            "field.color.fg": FsdsComponentTokenDefinition(cssVar: "--fsds-field-color-fg", name: "field.color.fg", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
        ],
        "variant_validating": [
            "field.color.fg": FsdsComponentTokenDefinition(cssVar: "--fsds-field-color-fg", name: "field.color.fg", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
        ],
        "variant_valid": [
            "field.color.fg": FsdsComponentTokenDefinition(cssVar: "--fsds-field-color-fg", name: "field.color.fg", ref: "semantic.color.foreground.success", fallback: .adaptive(light: "#497f21", dark: "#5b973c")),
        ],
        "variant_invalid": [
            "field.color.fg": FsdsComponentTokenDefinition(cssVar: "--fsds-field-color-fg", name: "field.color.fg", ref: "semantic.color.foreground.danger", fallback: .adaptive(light: "#d92d2e", dark: "#e55b5a")),
        ],
    ]
}

/// Emitted through a composer path: passive container root, one content region per named region (compound part or named slot).
/// SwiftUI reserves the `Field` type name; this target exports it as `FsdsField`.
public struct FsdsField<Label: View, Control: View, Help: View, Error: View, ValidatingIndicator: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        FieldTokens.scopes
    }
    private let status: FieldStatus?
    private let label: Label
    private let control: Control
    private let help: Help
    private let error: Error
    private let validatingIndicator: ValidatingIndicator
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        status: FieldStatus? = nil,
        @ViewBuilder label: () -> Label = { EmptyView() },
        @ViewBuilder control: () -> Control = { EmptyView() },
        @ViewBuilder help: () -> Help = { EmptyView() },
        @ViewBuilder error: () -> Error = { EmptyView() },
        @ViewBuilder validatingIndicator: () -> ValidatingIndicator = { EmptyView() }
    ) {
        self.status = status
        self.label = label()
        self.control = control()
        self.help = help()
        self.error = error()
        self.validatingIndicator = validatingIndicator()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", status.map { "variant_\($0.rawValue)" }].compactMap { $0 }
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String, requireRadius: Bool = false) -> CGFloat? {
        let value = layered.first { $0.key.hasSuffix(suffix) }?.value
        return requireRadius ? fsdsRequireRadius(value, slot: suffix) : value?.px
    }

    private var foreground: Color { colorSlot("color.fg") ?? .primary }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }

    @ViewBuilder
    private var regions: some View {
        VStack(spacing: gap) {
            label
            control
            help
            error
            validatingIndicator
        }
    }

    public var body: some View {
        regions
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .foregroundStyle(foreground)
    }
}
// @generated:end
