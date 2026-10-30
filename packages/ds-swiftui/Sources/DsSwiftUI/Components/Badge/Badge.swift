// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum BadgeVariant: String, CaseIterable {
    case `default`
    case status
    case counter
    case tag
}
public enum BadgeIntent: String, CaseIterable {
    case info
    case success
    case warning
    case danger
}
public enum BadgeSize: String, CaseIterable {
    case sm
    case md
    case lg
}
// @generated:end

// @generated:start component
/// Token scope data for Badge (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum BadgeTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("2px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("8px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", literal: .string("0")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", ref: "semantic.glyph.size.medium.extent", fallback: .string("16px")),
            "badge.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-background-default", name: "badge.color.background.default", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
            "badge.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-foreground-primary", name: "badge.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "badge.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-border", name: "badge.color.border", ref: "semantic.surface.border.subtle", fallback: .adaptive(light: "#d0d0d0", dark: "#474647")),
            "badge.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-size-radius", name: "badge.size.radius", ref: "semantic.shape.control.radius.pill", fallback: .string("9999px")),
            "badge.size.border": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-size-border", name: "badge.size.border", ref: "semantic.shape.control.border.defaultWidth", fallback: .string("1px")),
        ],
        "variant_info": [
            "badge.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-background-default", name: "badge.color.background.default", ref: "semantic.color.background.info.subtle", fallback: .adaptive(light: "#95dafb", dark: "#000a69")),
            "badge.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-foreground-primary", name: "badge.color.foreground.primary", ref: "semantic.color.foreground.on.info.subtle", fallback: .adaptive(light: "#013ab0", dark: "#00a9fb")),
            "badge.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-border", name: "badge.color.border", ref: "semantic.color.border.info", fallback: .adaptive(light: "#034fd6", dark: "#0566fe")),
        ],
        "variant_success": [
            "badge.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-background-default", name: "badge.color.background.default", ref: "semantic.color.background.success.subtle", fallback: .adaptive(light: "#b3dba7", dark: "#0b2200")),
            "badge.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-foreground-primary", name: "badge.color.foreground.primary", ref: "semantic.color.foreground.on.success.subtle", fallback: .adaptive(light: "#2c4f09", dark: "#6eb157")),
            "badge.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-border", name: "badge.color.border", ref: "semantic.color.border.success", fallback: .adaptive(light: "#3a6614", dark: "#497f21")),
        ],
        "variant_warning": [
            "badge.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-background-default", name: "badge.color.background.default", ref: "semantic.color.background.warning.subtle", fallback: .adaptive(light: "#fdc67f", dark: "#341400")),
            "badge.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-foreground-primary", name: "badge.color.foreground.primary", ref: "semantic.color.foreground.on.warning.subtle", fallback: .adaptive(light: "#6c3a00", dark: "#ec8802")),
            "badge.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-border", name: "badge.color.border", ref: "semantic.color.border.warning", fallback: .adaptive(light: "#8b4b00", dark: "#ae5d00")),
        ],
        "variant_danger": [
            "badge.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-background-default", name: "badge.color.background.default", ref: "semantic.color.background.danger.subtle", fallback: .adaptive(light: "#fac2c2", dark: "#440000")),
            "badge.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-foreground-primary", name: "badge.color.foreground.primary", ref: "semantic.color.foreground.on.danger.subtle", fallback: .adaptive(light: "#900909", dark: "#ee8181")),
            "badge.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-border", name: "badge.color.border", ref: "semantic.color.border.danger", fallback: .adaptive(light: "#b31b1b", dark: "#d92d2e")),
        ],
        "variant_counter": [
            "badge.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-background-default", name: "badge.color.background.default", ref: "semantic.color.background.danger.strong", fallback: .adaptive(light: "#b31b1b", dark: "#d92d2e")),
            "badge.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-foreground-primary", name: "badge.color.foreground.primary", ref: "semantic.color.foreground.inverse", fallback: .adaptive(light: "#fafafa", dark: "#fafafa")),
            "badge.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-color-border", name: "badge.color.border", ref: "semantic.color.background.danger.strong", fallback: .adaptive(light: "#b31b1b", dark: "#d92d2e")),
        ],
        "variant_tag": [
            "badge.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-badge-size-radius", name: "badge.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}
enum BadgeNativeTextRules {
    static let rules: [FsdsNativeTextRule] = [
        .init(part: "root", predicates: [], declarations: [.init(property: "badge.color.foreground.primary", value: "#141414", token: "semantic.color.foreground.primary"), .init(property: "badge.size.fontSize", value: "12px", token: "semantic.glyph.badge.size.md.fontSize"), .init(property: "badge.text.weight", value: "500", token: "semantic.typography.font.weight.medium")]),
        .init(part: "root", predicates: [], declarations: [.init(property: "color", value: "#141414", token: "badge.color.foreground.primary", designSlot: "badge.design.root.foreground.color"), .init(property: "font-size", value: "12px", token: "badge.size.fontSize", designSlot: "badge.design.root.typography.size"), .init(property: "font-weight", value: "500", token: "badge.text.weight", designSlot: "badge.design.root.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "sm")], declarations: [.init(property: "badge.size.fontSize", value: "10px", token: "semantic.glyph.badge.size.sm.fontSize")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "md")], declarations: [.init(property: "badge.size.fontSize", value: "12px", token: "semantic.glyph.badge.size.md.fontSize")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "lg")], declarations: [.init(property: "badge.size.fontSize", value: "14px", token: "semantic.glyph.badge.size.lg.fontSize")]),
        .init(part: "root", predicates: [.init(axis: "intent", value: "info")], declarations: [.init(property: "badge.color.foreground.primary", value: "#013ab0", token: "semantic.color.foreground.on.info.subtle")]),
        .init(part: "root", predicates: [.init(axis: "intent", value: "success")], declarations: [.init(property: "badge.color.foreground.primary", value: "#2c4f09", token: "semantic.color.foreground.on.success.subtle")]),
        .init(part: "root", predicates: [.init(axis: "intent", value: "warning")], declarations: [.init(property: "badge.color.foreground.primary", value: "#6c3a00", token: "semantic.color.foreground.on.warning.subtle")]),
        .init(part: "root", predicates: [.init(axis: "intent", value: "danger")], declarations: [.init(property: "badge.color.foreground.primary", value: "#900909", token: "semantic.color.foreground.on.danger.subtle")]),
        .init(part: "root", predicates: [.init(axis: "variant", value: "counter")], declarations: [.init(property: "badge.color.foreground.primary", value: "#fafafa", token: "semantic.color.foreground.inverse")]),
    ]
    static let omissions: [String] = []
}

/// Emitted through the icon-decorated content path: the icon prop feeds the shared GlyphCatalog registry; content is the consumer's single region.
public struct Badge<IconRegion: View, Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        BadgeTokens.scopes
    }
    private let iconRegion: IconRegion
    private let variant: BadgeVariant?
    private let intent: BadgeIntent?
    private let size: BadgeSize?
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme
    private var nativeTextStyle: FsdsResolvedNativeTextStyle {
        var values: [String: String] = [:]
        if let value = variant { values["variant"] = value.rawValue }
        if let value = intent { values["intent"] = value.rawValue }
        if let value = size { values["size"] = value.rawValue }
        do {
            return try resolveFsdsNativeTextStyle(BadgeNativeTextRules.rules, theme: fsdsTheme, variants: values, part: "content")
        } catch {
            preconditionFailure(String(describing: error))
        }
    }

    public init(
        @ViewBuilder icon: () -> IconRegion = { EmptyView() },
        variant: BadgeVariant? = nil,
        intent: BadgeIntent? = nil,
        size: BadgeSize? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.iconRegion = icon()
        self.variant = variant
        self.intent = intent
        self.size = size
        self.content = content()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", variant.map { "variant_\($0.rawValue)" }, intent.map { "variant_\($0.rawValue)" }, size.map { "variant_\($0.rawValue)" }].compactMap { $0 }
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
    private var borderColor: Color { colorSlot("color.border") ?? .clear }
    private var borderWidth: CGFloat { pxSlot("size.border") ?? 0 }
    private var radius: CGFloat { pxSlot("size.radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }
    private var minHeight: CGFloat { pxSlot("min-height") ?? 0 }

    public var body: some View {
        HStack(spacing: gap) {
            iconRegion
            content
                .font(nativeTextStyle.fontSize.map { Font.system(size: $0) })
                .fontWeight(nativeTextStyle.fontWeight)
                .foregroundStyle(nativeTextStyle.color ?? foreground)
        }
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: radius, style: .continuous).stroke(borderColor, lineWidth: borderWidth))
            .foregroundStyle(foreground)
    }
}
// @generated:end
