// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types

// @generated:end

// @generated:start component
/// Token scope data for Postcard (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum PostcardTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.surface.size.padding-block", fallback: .string("16px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.surface.size.padding-inline", fallback: .string("16px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.surface.size.gap", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "postcard.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-postcard-color-background-default", name: "postcard.color.background.default", ref: "semantic.color.background.primary", fallback: .adaptive(light: "#ffffff", dark: "#000000")),
            "postcard.color.border.default": FsdsComponentTokenDefinition(cssVar: "--fsds-postcard-color-border-default", name: "postcard.color.border.default", ref: "semantic.color.border.light", fallback: .adaptive(light: "#b8b8b8", dark: "#474647")),
            "postcard.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-postcard-color-foreground-primary", name: "postcard.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "postcard.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-postcard-size-radius", name: "postcard.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
            "postcard.size.border": FsdsComponentTokenDefinition(cssVar: "--fsds-postcard-size-border", name: "postcard.size.border", ref: "semantic.shape.control.border.defaultWidth", fallback: .string("1px")),
        ],
        "part_handle": [
            "postcard.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-postcard-color-foreground-primary", name: "postcard.color.foreground.primary", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
        ],
        "part_timestamp": [
            "postcard.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-postcard-color-foreground-primary", name: "postcard.color.foreground.primary", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
        ],
        "part_stat": [
            "postcard.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-postcard-color-foreground-primary", name: "postcard.color.foreground.primary", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
        ],
    ]
}

/// Emitted through the static-content path: passive article root with a single consumer content region.
public struct Postcard<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        PostcardTokens.scopes
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
    private var borderWidth: CGFloat { pxSlot("size.border") ?? 0 }
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
