// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum CodeSnippetElement: String, CaseIterable {
    case code
    case kbd
    case samp
}
// @generated:end

// @generated:start component
/// Token scope data for CodeSnippet (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum CodeSnippetTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.surface.size.padding-block", fallback: .string("16px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.surface.size.padding-inline", fallback: .string("16px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.display.size.gap", fallback: .string("4px")),
            "code-snippet.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-code-snippet-color-background", name: "code-snippet.color.background", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
            "code-snippet.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-code-snippet-color-foreground-primary", name: "code-snippet.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "code-snippet.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-code-snippet-color-border", name: "code-snippet.color.border", ref: "semantic.color.border.subtle", fallback: .adaptive(light: "#d0d0d0", dark: "#474647")),
            "code-snippet.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-code-snippet-size-radius", name: "code-snippet.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// Emitted through the prop-text leaf path: the `text` prop is the entire content, rendered as monospaced text.
public struct CodeSnippet: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        CodeSnippetTokens.scopes
    }
    private let text: String

    public init(text: String = "") {
        self.text = text
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

    @Environment(\.fsdsTheme) private var fsdsTheme

    public var body: some View {
        SwiftUI.Text(text)
            .font(.system(.body, design: .monospaced))
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .foregroundStyle(foreground)
    }
}
// @generated:end
