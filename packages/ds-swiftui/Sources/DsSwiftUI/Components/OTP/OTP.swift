// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum OTPMode: String, CaseIterable {
    case numeric
    case alphanumeric
}
// @generated:end

// @generated:start component
/// Token scope data for OTP (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum OTPTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.input.size.medium.padding-block", fallback: .string("4px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.input.size.medium.padding-inline", fallback: .string("8px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.input.size.medium.gap", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", ref: "semantic.input.size.medium.min-height", fallback: .string("32px")),
            "otp.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-otp-color-background", name: "otp.color.background", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
            "otp.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-otp-color-foreground-primary", name: "otp.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "otp.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-otp-color-border", name: "otp.color.border", ref: "semantic.color.border.light", fallback: .adaptive(light: "#b8b8b8", dark: "#474647")),
            "otp.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-otp-size-radius", name: "otp.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// Emitted through the count-iterated field-group path: the string channel distributes over N single-character fields (setCharAt semantics — the last character of a multi-char payload wins); onComplete fires when every field is filled.
public struct OTP: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        OTPTokens.scopes
    }
    @StateObject private var value: ControllableValue<String>
    private let length: Int
    private let disabled: Bool
    private let onComplete: ((String) -> Void)?
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        value: Binding<String>? = nil,
        defaultValue: String = "",
        onChange: ((String) -> Void)? = nil,
        length: Int = 6,
        disabled: Bool = false,
        onComplete: ((String) -> Void)? = nil
    ) {
        self._value = StateObject(wrappedValue: ControllableValue(controlled: value, defaultValue: defaultValue, onChange: onChange))
        self.length = length
        self.disabled = disabled
        self.onComplete = onComplete
    }

    private func character(at index: Int) -> String {
        guard index < value.value.count else { return "" }
        return String(Array(value.value)[index])
    }

    /// setCharAt: write the payload's last character at the index, 
    /// padding with spaces so the index always exists.
    private func setCharacter(_ raw: String, at index: Int) {
        var chars = Array(value.value.padding(toLength: length, withPad: " ", startingAt: 0))
        guard index < chars.count else { return }
        let payload = raw.count > 0 ? Array(raw) : [" "]
        chars[index] = payload[payload.count - 1]
        let next = String(chars).trimmingCharacters(in: .whitespaces)
        value.set(next)
        if next.count == length {
            onComplete?(next)
        }
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
    private var minHeight: CGFloat { pxSlot("min-height") ?? 0 }

    public var body: some View {
        HStack(spacing: gap) {
            ForEach(0..<length, id: \.self) { index in
                SwiftUI.TextField("", text: Binding(
                    get: { character(at: index) },
                    set: { setCharacter($0, at: index) }
                ))
                    .frame(width: 32)
                    .disabled(disabled)
            }
        }
    }
}
// @generated:end
