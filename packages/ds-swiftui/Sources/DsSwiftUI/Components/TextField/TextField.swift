// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types

// @generated:end

// @generated:start component
/// Token scope data for TextField (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum TextFieldTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.input.size.medium.padding-block", fallback: .string("4px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.input.size.medium.padding-inline", fallback: .string("8px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.input.size.medium.gap", fallback: .string("8px")),
            "text-field.border.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-text-field-border-radius", name: "text-field.border.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// Emitted through the labeled text-control path: the string channel rides ControllableValue<String>; slot regions are consumer closures.
public struct TextField<LabelRegion: View, DescriptionRegion: View, ErrorRegion: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        TextFieldTokens.scopes
    }
    @ControllableState private var value: ControllableValue<String>
    private let label: LabelRegion
    private let description: DescriptionRegion
    private let error: ErrorRegion
    private let disabled: Bool
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        value: Binding<String>? = nil,
        defaultValue: String = "",
        onChange: ((String) -> Void)? = nil,
        @ViewBuilder label: () -> LabelRegion = { EmptyView() },
        @ViewBuilder description: () -> DescriptionRegion = { EmptyView() },
        @ViewBuilder error: () -> ErrorRegion = { EmptyView() },
        disabled: Bool = false
    ) {
        self._value = ControllableState(controlled: value, defaultValue: defaultValue, onChange: onChange)
        self.label = label()
        self.description = description()
        self.error = error()
        self.disabled = disabled
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

    private var radius: CGFloat { pxSlot("radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }

    public var body: some View {
        VStack(spacing: gap) {
            label
            SwiftUI.TextField("", text: value.binding())
                .disabled(disabled)
            description
            error
        }
    }
}
// @generated:end
