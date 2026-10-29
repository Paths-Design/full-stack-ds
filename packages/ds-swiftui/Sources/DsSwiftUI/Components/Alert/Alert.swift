// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum AlertIntent: String, CaseIterable {
    case info
    case success
    case warning
    case danger
}
public enum AlertLevel: String, CaseIterable {
    case inline
    case section
    case page
}
// @generated:end

// @generated:start component
/// Token scope data for Alert (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum AlertTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.feedback.size.padding-block", fallback: .string("16px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.feedback.size.padding-inline", fallback: .string("16px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.feedback.size.gap", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "alert.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-alert-color-foreground-primary", name: "alert.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "alert.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-alert-size-radius", name: "alert.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
        "variant_info": [
            "alert.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-alert-color-foreground-primary", name: "alert.color.foreground.primary", ref: "semantic.color.foreground.on.info.subtle", fallback: .adaptive(light: "#013ab0", dark: "#00a9fb")),
        ],
        "variant_success": [
            "alert.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-alert-color-foreground-primary", name: "alert.color.foreground.primary", ref: "semantic.color.foreground.on.success.subtle", fallback: .adaptive(light: "#2c4f09", dark: "#6eb157")),
        ],
        "variant_warning": [
            "alert.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-alert-color-foreground-primary", name: "alert.color.foreground.primary", ref: "semantic.color.foreground.on.warning.subtle", fallback: .adaptive(light: "#6c3a00", dark: "#ec8802")),
        ],
        "variant_danger": [
            "alert.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-alert-color-foreground-primary", name: "alert.color.foreground.primary", ref: "semantic.color.foreground.on.danger.subtle", fallback: .adaptive(light: "#900909", dark: "#ee8181")),
        ],
    ]
}
enum AlertNativeTextRules {
    static let rules: [FsdsNativeTextRule] = [
        .init(part: "root", predicates: [], declarations: [.init(property: "alert.color.foreground.primary", value: "#141414", token: "semantic.color.foreground.primary"), .init(property: "alert.text.size", value: "14px", token: "semantic.typography.body.03"), .init(property: "alert.text.weight", value: "400", token: "semantic.typography.font.weight.regular")]),
        .init(part: "root", predicates: [], declarations: [.init(property: "font-size", value: "14px", token: "alert.text.size", designSlot: "alert.design.root.typography.size"), .init(property: "font-weight", value: "400", token: "alert.text.weight", designSlot: "alert.design.root.typography.weight"), .init(property: "color", value: "#141414", token: "alert.color.foreground.primary", designSlot: "alert.design.root.foreground.color")]),
        .init(part: "root", predicates: [.init(axis: "intent", value: "info")], declarations: [.init(property: "alert.color.foreground.primary", value: "#013ab0", token: "semantic.color.foreground.on.info.subtle")]),
        .init(part: "root", predicates: [.init(axis: "intent", value: "success")], declarations: [.init(property: "alert.color.foreground.primary", value: "#2c4f09", token: "semantic.color.foreground.on.success.subtle")]),
        .init(part: "root", predicates: [.init(axis: "intent", value: "warning")], declarations: [.init(property: "alert.color.foreground.primary", value: "#6c3a00", token: "semantic.color.foreground.on.warning.subtle")]),
        .init(part: "root", predicates: [.init(axis: "intent", value: "danger")], declarations: [.init(property: "alert.color.foreground.primary", value: "#900909", token: "semantic.color.foreground.on.danger.subtle")]),
        .init(part: "root", predicates: [.init(axis: "level", value: "inline")], declarations: [.init(property: "alert.text.size", value: "12px", token: "semantic.typography.body.04")]),
        .init(part: "root", predicates: [.init(axis: "level", value: "section")], declarations: [.init(property: "alert.text.size", value: "14px", token: "semantic.typography.body.03")]),
        .init(part: "root", predicates: [.init(axis: "level", value: "page")], declarations: [.init(property: "alert.text.size", value: "16px", token: "semantic.typography.body.02")]),
    ]
    static let omissions: [String] = []
}

/// Emitted through the icon-decorated content path: the icon prop feeds the shared GlyphCatalog registry; content is the consumer's single region.
public struct Alert<IconRegion: View, Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        AlertTokens.scopes
    }
    private let iconRegion: IconRegion
    private let intent: AlertIntent?
    private let level: AlertLevel?
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme
    private var nativeTextStyle: FsdsResolvedNativeTextStyle {
        var values: [String: String] = [:]
        if let value = intent { values["intent"] = value.rawValue }
        if let value = level { values["level"] = value.rawValue }
        do {
            return try resolveFsdsNativeTextStyle(AlertNativeTextRules.rules, theme: fsdsTheme, variants: values, part: "root")
        } catch {
            preconditionFailure(String(describing: error))
        }
    }

    public init(
        @ViewBuilder icon: () -> IconRegion = { EmptyView() },
        intent: AlertIntent? = nil,
        level: AlertLevel? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.iconRegion = icon()
        self.intent = intent
        self.level = level
        self.content = content()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", intent.map { "variant_\($0.rawValue)" }, level.map { "variant_\($0.rawValue)" }].compactMap { $0 }
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var foreground: Color { colorSlot("color.foreground.primary") ?? .primary }
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
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .foregroundStyle(foreground)
    }
}
// @generated:end
