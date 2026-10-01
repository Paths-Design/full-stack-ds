// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum BlockquoteVariant: String, CaseIterable {
    case `default`
    case bordered
    case highlighted
}
public enum BlockquoteSize: String, CaseIterable {
    case sm
    case md
    case lg
}
// @generated:end

// @generated:start component
/// Token scope data for Blockquote (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum BlockquoteTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.surface.size.padding-block", fallback: .string("16px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.surface.size.padding-inline", fallback: .string("16px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.surface.size.gap", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "blockquote.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-blockquote-color-foreground-primary", name: "blockquote.color.foreground.primary", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
            "blockquote.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-blockquote-color-background", name: "blockquote.color.background", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
            "blockquote.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-blockquote-color-border", name: "blockquote.color.border", ref: "semantic.color.border.accent", fallback: .adaptive(light: "#d92d2e", dark: "#e55b5a")),
            "blockquote.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-blockquote-size-radius", name: "blockquote.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
        "variant_default": [
            "blockquote.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-blockquote-color-background", name: "blockquote.color.background", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
        ],
        "variant_bordered": [
            "blockquote.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-blockquote-color-background", name: "blockquote.color.background", ref: "semantic.color.background.primary", fallback: .adaptive(light: "#ffffff", dark: "#000000")),
        ],
        "variant_highlighted": [
            "blockquote.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-blockquote-color-background", name: "blockquote.color.background", ref: "semantic.color.background.accentSubtle", fallback: .adaptive(light: "#95dafb", dark: "#002782")),
            "blockquote.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-blockquote-color-foreground-primary", name: "blockquote.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
        ],
    ]
}

/// Emitted through the static-content path: passive blockquote root with a single consumer content region.
public struct Blockquote<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        BlockquoteTokens.scopes
    }
    private let variant: BlockquoteVariant?
    private let size: BlockquoteSize?
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        variant: BlockquoteVariant? = nil,
        size: BlockquoteSize? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.variant = variant
        self.size = size
        self.content = content()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", variant.map { "variant_\($0.rawValue)" }, size.map { "variant_\($0.rawValue)" }].compactMap { $0 }
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
        content
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .foregroundStyle(foreground)
    }
}
// @generated:end
