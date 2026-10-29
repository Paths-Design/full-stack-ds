// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum LinkTarget: String, CaseIterable {
    case _self
    case _blank
    case _parent
    case _top
}
public enum LinkSize: String, CaseIterable {
    case small
    case medium
    case large
}
// @generated:end

// @generated:start component
/// Token scope data for Links (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum LinksTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.display.size.gap", fallback: .string("4px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "links.color.foreground.default": FsdsComponentTokenDefinition(cssVar: "--fsds-links-color-foreground-default", name: "links.color.foreground.default", ref: "semantic.color.foreground.link", fallback: .adaptive(light: "#d92d2e", dark: "#e55b5a")),
            "links.focus.ring.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-links-focus-ring-radius", name: "links.focus.ring.radius", ref: "semantic.shape.radius.small", fallback: .string("4px")),
        ],
    ]
}
enum LinksNativeTextRules {
    static let rules: [FsdsNativeTextRule] = [
        .init(part: "root", predicates: [], declarations: [.init(property: "links.color.foreground.default", value: "#d92d2e", token: "semantic.color.foreground.link"), .init(property: "links.color.foreground.hover", value: "#b31b1b", token: "semantic.color.foreground.linkHover"), .init(property: "links.color.foreground.disabled", value: "#727272", token: "semantic.color.foreground.disabled"), .init(property: "links.size.fontSize.small", value: "0.875rem", token: "core.typography.ramp.3"), .init(property: "links.size.fontSize.medium", value: "1rem", token: "core.typography.ramp.4"), .init(property: "links.size.fontSize.large", value: "1.125rem", token: "core.typography.ramp.5")]),
        .init(part: "root", predicates: [], declarations: [.init(property: "color", value: "#d92d2e", token: "links.color.foreground.default", designSlot: "links.design.root.foreground.color"), .init(property: "font-size", value: "1rem", token: "links.size.fontSize.medium", designSlot: "links.design.root.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "small")], declarations: [.init(property: "links.size.fontSize.medium", value: "0.875rem", token: "links.size.fontSize.small"), .init(property: "font-size", value: "1rem", token: "links.size.fontSize.medium", designSlot: "links.design.condition-42b522a9c46e.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "medium")], declarations: [.init(property: "links.size.fontSize.medium", value: "1rem", token: "core.typography.ramp.4"), .init(property: "font-size", value: "1rem", token: "links.size.fontSize.medium", designSlot: "links.design.condition-a9821c9eea70.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "large")], declarations: [.init(property: "links.size.fontSize.medium", value: "1.125rem", token: "links.size.fontSize.large"), .init(property: "font-size", value: "1rem", token: "links.size.fontSize.medium", designSlot: "links.design.condition-cbbd2740a3e5.typography.size")]),
    ]
    static let omissions: [String] = ["visited: selector outside normalized native grammar", "hover: text rule has unsupported predicate or pseudo", "disabled: text rule has unsupported predicate or pseudo"]
}

/// Emitted through the static-content path: passive a root with a single consumer content region.
public struct Links<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        LinksTokens.scopes
    }
    private let size: LinkSize?
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme
    private var nativeTextStyle: FsdsResolvedNativeTextStyle {
        var values: [String: String] = [:]
        if let value = size { values["size"] = value.rawValue }
        do {
            return try resolveFsdsNativeTextStyle(LinksNativeTextRules.rules, theme: fsdsTheme, variants: values, part: "root")
        } catch {
            preconditionFailure(String(describing: error))
        }
    }

    public init(
        size: LinkSize? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.size = size
        self.content = content()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", size.map { "variant_\($0.rawValue)" }].compactMap { $0 }
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var foreground: Color { colorSlot("color.foreground.default") ?? .primary }
    private var radius: CGFloat { pxSlot("radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }
    private var minHeight: CGFloat { pxSlot("min-height") ?? 0 }

    public var body: some View {
        content
            .font(nativeTextStyle.fontSize.map { Font.system(size: $0) })
            .fontWeight(nativeTextStyle.fontWeight)
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .foregroundStyle(nativeTextStyle.color ?? foreground)
    }
}
// @generated:end
