// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum StatusIntent: String, CaseIterable {
    case info
    case success
    case warning
    case danger
    case error
}
// @generated:end

// @generated:start component
/// Token scope data for Status (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum StatusTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.glyph.badge.size.md.paddingY", fallback: .string("2px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.glyph.badge.size.md.paddingX", fallback: .string("8px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.glyph.badge.size.md.gap", fallback: .string("4px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "status.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-background", name: "status.color.background", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
            "status.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-foreground-primary", name: "status.color.foreground.primary", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
            "status.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-border", name: "status.color.border", ref: "semantic.color.border.subtle", fallback: .adaptive(light: "#d0d0d0", dark: "#474647")),
            "status.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-status-size-radius", name: "status.size.radius", ref: "semantic.shape.control.radius.pill", fallback: .string("9999px")),
            "status.size.border": FsdsComponentTokenDefinition(cssVar: "--fsds-status-size-border", name: "status.size.border", ref: "semantic.shape.control.border.defaultWidth", fallback: .string("1px")),
        ],
        "variant_info": [
            "status.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-background", name: "status.color.background", ref: "semantic.color.background.info.subtle", fallback: .adaptive(light: "#95dafb", dark: "#000a69")),
            "status.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-foreground-primary", name: "status.color.foreground.primary", ref: "semantic.color.foreground.on.info.subtle", fallback: .adaptive(light: "#013ab0", dark: "#00a9fb")),
            "status.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-border", name: "status.color.border", ref: "semantic.color.border.info", fallback: .adaptive(light: "#034fd6", dark: "#0566fe")),
        ],
        "variant_success": [
            "status.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-background", name: "status.color.background", ref: "semantic.color.background.success.subtle", fallback: .adaptive(light: "#b3dba7", dark: "#0b2200")),
            "status.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-foreground-primary", name: "status.color.foreground.primary", ref: "semantic.color.foreground.on.success.subtle", fallback: .adaptive(light: "#2c4f09", dark: "#6eb157")),
            "status.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-border", name: "status.color.border", ref: "semantic.color.border.success", fallback: .adaptive(light: "#3a6614", dark: "#497f21")),
        ],
        "variant_warning": [
            "status.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-background", name: "status.color.background", ref: "semantic.color.background.warning.subtle", fallback: .adaptive(light: "#fdc67f", dark: "#341400")),
            "status.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-foreground-primary", name: "status.color.foreground.primary", ref: "semantic.color.foreground.on.warning.subtle", fallback: .adaptive(light: "#6c3a00", dark: "#ec8802")),
            "status.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-border", name: "status.color.border", ref: "semantic.color.border.warning", fallback: .adaptive(light: "#8b4b00", dark: "#ae5d00")),
        ],
        "variant_danger": [
            "status.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-background", name: "status.color.background", ref: "semantic.color.background.danger.subtle", fallback: .adaptive(light: "#fac2c2", dark: "#440000")),
            "status.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-foreground-primary", name: "status.color.foreground.primary", ref: "semantic.color.foreground.on.danger.subtle", fallback: .adaptive(light: "#900909", dark: "#ee8181")),
            "status.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-border", name: "status.color.border", ref: "semantic.color.border.danger", fallback: .adaptive(light: "#b31b1b", dark: "#d92d2e")),
        ],
        "variant_error": [
            "status.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-background", name: "status.color.background", ref: "semantic.color.background.danger.subtle", fallback: .adaptive(light: "#fac2c2", dark: "#440000")),
            "status.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-foreground-primary", name: "status.color.foreground.primary", ref: "semantic.color.foreground.on.danger.subtle", fallback: .adaptive(light: "#900909", dark: "#ee8181")),
            "status.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-status-color-border", name: "status.color.border", ref: "semantic.color.border.danger", fallback: .adaptive(light: "#b31b1b", dark: "#d92d2e")),
        ],
    ]
}

/// Emitted through the static-content path: passive span root with a single consumer content region.
public struct Status<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        StatusTokens.scopes
    }
    private let status: StatusIntent?
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        status: StatusIntent? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.status = status
        self.content = content()
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

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var background: Color { colorSlot("color.background") ?? .accentColor }
    private var foreground: Color { colorSlot("color.foreground.primary") ?? .primary }
    private var borderColor: Color { colorSlot("color.border") ?? .clear }
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
