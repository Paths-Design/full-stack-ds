// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum ListElement: String, CaseIterable {
    case ul
    case ol
    case dl
}
public enum ListVariant: String, CaseIterable {
    case `default`
    case unstyled
    case inline
    case divided
    case spaced
}
public enum ListMarker: String, CaseIterable {
    case `default`
    case none
    case disc
    case circle
    case square
    case decimal
    case alpha
    case roman
}
public enum ListSpacing: String, CaseIterable {
    case none
    case sm
    case md
    case lg
}
public enum ListSize: String, CaseIterable {
    case sm
    case md
    case lg
}
// @generated:end

// @generated:start component
/// Token scope data for FsdsList (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum ListTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.structure.size.gap", fallback: .string("16px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "list.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-list-color-foreground-primary", name: "list.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "list.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-list-color-border", name: "list.color.border", ref: "semantic.surface.border.subtle", fallback: .adaptive(light: "#d0d0d0", dark: "#474647")),
        ],
    ]
}
enum ListNativeTextRules {
    static let rules: [FsdsNativeTextRule] = [
        .init(part: "root", predicates: [], declarations: [.init(property: "list.color.foreground.primary", value: "#141414", token: "semantic.color.foreground.primary"), .init(property: "list.size.sm", value: "14px", token: "semantic.typography.body.03"), .init(property: "list.size.md", value: "16px", token: "semantic.typography.body.02"), .init(property: "list.size.lg", value: "18px", token: "semantic.typography.body.01")]),
        .init(part: "root", predicates: [], declarations: [.init(property: "color", value: "#141414", token: "list.color.foreground.primary", designSlot: "list.design.root.foreground.color")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "sm")], declarations: [.init(property: "font-size", value: "14px", token: "list.size.sm", designSlot: "list.design.condition-f14e3fae918a.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "md")], declarations: [.init(property: "font-size", value: "16px", token: "list.size.md", designSlot: "list.design.condition-8791efdf7f0f.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "lg")], declarations: [.init(property: "font-size", value: "18px", token: "list.size.lg", designSlot: "list.design.condition-b1a65b7b2e57.typography.size")]),
    ]
    static let omissions: [String] = [".list--spacing-none > * + *: selector outside normalized native grammar", ".list--spacing-sm > * + *: selector outside normalized native grammar", ".list--spacing-md > * + *: selector outside normalized native grammar", ".list--spacing-lg > * + *: selector outside normalized native grammar", ".list--variant-divided > * + *: selector outside normalized native grammar", ".list--variant-spaced > *: selector outside normalized native grammar"]
}

/// Emitted through the static-content path: passive ul root with a single consumer content region.
/// SwiftUI reserves the `List` type name; this target exports it as `FsdsList`.
public struct FsdsList<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        ListTokens.scopes
    }
    private let `as`: ListElement?
    private let variant: ListVariant
    private let marker: ListMarker
    private let spacing: ListSpacing?
    private let size: ListSize?
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme
    private var nativeTextStyle: FsdsResolvedNativeTextStyle {
        var values: [String: String] = [:]
        if let value = `as` { values["as"] = value.rawValue }
        values["variant"] = variant.rawValue
        values["marker"] = marker.rawValue
        if let value = spacing { values["spacing"] = value.rawValue }
        if let value = size { values["size"] = value.rawValue }
        do {
            return try resolveFsdsNativeTextStyle(ListNativeTextRules.rules, theme: fsdsTheme, variants: values, part: "root")
        } catch {
            preconditionFailure(String(describing: error))
        }
    }

    public init(
        as: ListElement? = nil,
        variant: ListVariant = .`default`,
        marker: ListMarker = .`default`,
        spacing: ListSpacing? = nil,
        size: ListSize? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.`as` = `as`
        self.variant = variant
        self.marker = marker
        self.spacing = spacing
        self.size = size
        self.content = content()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", `as`.map { "variant_\($0.rawValue)" }, "variant_\(variant.rawValue)", "variant_\(marker.rawValue)", spacing.map { "variant_\($0.rawValue)" }, size.map { "variant_\($0.rawValue)" }].compactMap { $0 }
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var foreground: Color { colorSlot("color.foreground.primary") ?? .primary }
    private var borderColor: Color { colorSlot("color.border") ?? .clear }
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
            .foregroundStyle(nativeTextStyle.color ?? foreground)
    }
}
// @generated:end
