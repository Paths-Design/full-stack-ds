// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum CodeBlockLanguage: String, CaseIterable {
    case bash
    case css
    case html
    case javascript
    case json
    case jsx
    case markdown
    case plaintext
    case svelte
    case tsx
    case typescript
    case vue
}
public enum CodeBlockTokenType: String, CaseIterable {
    case comment
    case definition
    case keyword
    case plain
    case property
    case punctuation
    case `static`
    case string
    case tag
}
// @generated:end

// @generated:start component
/// Token scope data for CodeBlock (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum CodeBlockTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.surface.size.padding-block", fallback: .string("16px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.surface.size.padding-inline", fallback: .string("16px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.display.size.gap", fallback: .string("4px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "code-block.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-color-background-default", name: "code-block.color.background.default", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
            "code-block.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-color-foreground-primary", name: "code-block.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "code-block.color.border.default": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-color-border-default", name: "code-block.color.border.default", ref: "semantic.color.border.subtle", fallback: .adaptive(light: "#d0d0d0", dark: "#474647")),
            "code-block.size.radius.default": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-size-radius-default", name: "code-block.size.radius.default", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
            "code-block.size.border.default": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-size-border-default", name: "code-block.size.border.default", ref: "semantic.shape.control.border.defaultWidth", fallback: .string("1px")),
        ],
    ]
}

/// Emitted through the static-content path: passive pre root with a single consumer content region.
public struct CodeBlock<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        CodeBlockTokens.scopes
    }
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        @ViewBuilder content: () -> Content
    ) {
        self.content = content()
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

    private var background: Color { colorSlot("color.background.default") ?? .accentColor }
    private var foreground: Color { colorSlot("color.foreground.primary") ?? .primary }
    private var borderColor: Color { colorSlot("color.border.default") ?? .clear }
    private var borderWidth: CGFloat { pxSlot("size.border.default") ?? 0 }
    private var radius: CGFloat { pxSlot("size.radius.default") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }
    private var minHeight: CGFloat { pxSlot("min-height") ?? 0 }

    public var body: some View {
        content
            .font(.system(.body, design: .monospaced))
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .foregroundStyle(foreground)
    }
}

extension CodeBlock where Content == SwiftUI.Text {
    public init(
        code: String = ""
    ) {
        self.init() { SwiftUI.Text(verbatim: code) }
    }
}
// @generated:end
