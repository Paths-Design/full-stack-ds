// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types

// @generated:end

// @generated:start component
/// Token scope data for Input (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum InputTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.input.size.medium.padding-block", fallback: .string("4px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.input.size.medium.padding-inline", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", ref: "semantic.input.size.medium.min-height", fallback: .string("32px")),
            "input.color.bg.default": FsdsComponentTokenDefinition(cssVar: "--fsds-input-color-bg-default", name: "input.color.bg.default", ref: "semantic.color.background.primary", fallback: .adaptive(light: "#ffffff", dark: "#000000")),
            "input.color.text.default": FsdsComponentTokenDefinition(cssVar: "--fsds-input-color-text-default", name: "input.color.text.default", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
        ],
    ]
}

/// Emitted through the value-channel text-control path: input root whose string channel projects through the controllable-state pattern (controlled Binding takes precedence over @State).
public struct Input: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        InputTokens.scopes
    }
    @ControllableState private var text: ControllableValue<String>
    private let placeholder: String?
    private let disabled: Bool
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        value: Binding<String>? = nil,
        defaultValue: String = "",
        onChange: ((String) -> Void)? = nil,
        placeholder: String? = nil,
        disabled: Bool = false
    ) {
        self._text = ControllableState(controlled: value, defaultValue: defaultValue, onChange: onChange)
        self.placeholder = placeholder
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

    private var background: Color { colorSlot("color.bg.default") ?? .accentColor }
    private var foreground: Color { colorSlot("color.text.default") ?? .primary }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var minHeight: CGFloat { pxSlot("min-height") ?? 0 }

    public var body: some View {
        SwiftUI.TextField(
            "",
            text: Binding(
                get: { text.value },
                set: { text.set($0) }
            ),
            prompt: placeholder.map(SwiftUI.Text.init)
        )
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .frame(minHeight: minHeight)
            .background(background)
            .foregroundStyle(foreground)
            .disabled(disabled)
    }
}
// @generated:end
