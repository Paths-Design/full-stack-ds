// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum TextElement: String, CaseIterable {
    case p
    case span
    case div
    case h1
    case h2
    case h3
    case h4
    case h5
    case h6
}
public enum TextVariant: String, CaseIterable {
    case display
    case headline
    case title
    case body
    case caption
    case overline
    case code
}
public enum TextSize: String, CaseIterable {
    case xs
    case sm
    case md
    case lg
    case xl
    case `2xl`
    case `3xl`
}
public enum TextWeight: String, CaseIterable {
    case light
    case normal
    case medium
    case semibold
    case bold
}
public enum TextAlign: String, CaseIterable {
    case left
    case center
    case right
    case justify
}
public enum TextTransform: String, CaseIterable {
    case none
    case uppercase
    case lowercase
    case capitalize
}
// @generated:end

// @generated:start component
/// Token scope data for Text (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum TextTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.display.size.gap", fallback: .string("4px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "text.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-text-color-foreground-primary", name: "text.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
        ],
    ]
}
enum TextNativeTextRules {
    static let rules: [FsdsNativeTextRule] = [
        .init(part: "root", predicates: [], declarations: [.init(property: "text.color.foreground.primary", value: "#141414", token: "semantic.color.foreground.primary"), .init(property: "text.typography.fontWeight.light", value: "300", token: "semantic.typography.font.weight.light"), .init(property: "text.typography.fontWeight.regular", value: "400", token: "semantic.typography.font.weight.regular"), .init(property: "text.typography.fontWeight.medium", value: "500", token: "semantic.typography.font.weight.medium"), .init(property: "text.typography.fontWeight.bold", value: "700", token: "semantic.typography.font.weight.bold"), .init(property: "text.size.xs", value: "0.75rem", token: "core.typography.ramp.2"), .init(property: "text.size.sm", value: "0.875rem", token: "core.typography.ramp.3"), .init(property: "text.size.md", value: "1rem", token: "core.typography.ramp.4"), .init(property: "text.size.lg", value: "1.125rem", token: "core.typography.ramp.5"), .init(property: "text.size.xl", value: "1.25rem", token: "core.typography.ramp.6"), .init(property: "text.size.2xl", value: "1.5rem", token: "core.typography.ramp.7"), .init(property: "text.size.3xl", value: "2rem", token: "core.typography.ramp.8")]),
        .init(part: "root", predicates: [], declarations: [.init(property: "color", value: "#141414", token: "text.color.foreground.primary", designSlot: "text.design.root.foreground.color"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.root.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "variant", value: "display")], declarations: [.init(property: "text.size.md", value: "3.75rem", token: "core.typography.ramp.11"), .init(property: "text.typography.fontWeight.bold", value: "700", token: "semantic.typography.font.weight.bold"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-7aecafa55fab.typography.size"), .init(property: "font-weight", value: "700", token: "text.typography.fontWeight.bold", designSlot: "text.design.condition-7aecafa55fab.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "variant", value: "headline")], declarations: [.init(property: "text.size.md", value: "2rem", token: "core.typography.ramp.8"), .init(property: "text.typography.fontWeight.bold", value: "700", token: "semantic.typography.font.weight.bold"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-8819f782ecc4.typography.size"), .init(property: "font-weight", value: "700", token: "text.typography.fontWeight.bold", designSlot: "text.design.condition-8819f782ecc4.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "variant", value: "title")], declarations: [.init(property: "text.size.md", value: "1.25rem", token: "core.typography.ramp.6"), .init(property: "text.typography.fontWeight.bold", value: "700", token: "semantic.typography.font.weight.bold"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-ad1d0c32b0fa.typography.size"), .init(property: "font-weight", value: "700", token: "text.typography.fontWeight.bold", designSlot: "text.design.condition-ad1d0c32b0fa.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "variant", value: "body")], declarations: [.init(property: "text.size.md", value: "1rem", token: "core.typography.ramp.4"), .init(property: "text.typography.fontWeight.regular", value: "400", token: "semantic.typography.font.weight.regular"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-2ccff328366e.typography.size"), .init(property: "font-weight", value: "400", token: "text.typography.fontWeight.regular", designSlot: "text.design.condition-2ccff328366e.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "variant", value: "caption")], declarations: [.init(property: "text.size.md", value: "0.75rem", token: "core.typography.ramp.2"), .init(property: "text.typography.fontWeight.regular", value: "400", token: "semantic.typography.font.weight.regular"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-e697e79ba40b.typography.size"), .init(property: "font-weight", value: "400", token: "text.typography.fontWeight.regular", designSlot: "text.design.condition-e697e79ba40b.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "variant", value: "overline")], declarations: [.init(property: "text.size.md", value: "0.75rem", token: "core.typography.ramp.2"), .init(property: "text.typography.fontWeight.medium", value: "500", token: "semantic.typography.font.weight.medium"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-9b05002ba0aa.typography.size"), .init(property: "font-weight", value: "500", token: "text.typography.fontWeight.medium", designSlot: "text.design.condition-9b05002ba0aa.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "variant", value: "code")], declarations: [.init(property: "text.size.md", value: "0.875rem", token: "core.typography.ramp.3"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-3a2bffe9ebbb.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "xs")], declarations: [.init(property: "text.size.md", value: "0.75rem", token: "text.size.xs"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-ac39d57baace.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "sm")], declarations: [.init(property: "text.size.md", value: "0.875rem", token: "text.size.sm"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-24964d7ed3a7.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "md")], declarations: [.init(property: "text.size.md", value: "1rem", token: "core.typography.ramp.4"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-dc35d39122c5.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "lg")], declarations: [.init(property: "text.size.md", value: "1.125rem", token: "text.size.lg"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-72800fd5573d.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "xl")], declarations: [.init(property: "text.size.md", value: "1.25rem", token: "text.size.xl"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-bcfaa22e125a.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "2xl")], declarations: [.init(property: "text.size.md", value: "1.5rem", token: "text.size.2xl"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-b6534e1dde7a.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "3xl")], declarations: [.init(property: "text.size.md", value: "2rem", token: "text.size.3xl"), .init(property: "font-size", value: "1rem", token: "text.size.md", designSlot: "text.design.condition-c64026a43137.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "weight", value: "light")], declarations: [.init(property: "text.typography.fontWeight.light", value: "300", token: "semantic.typography.font.weight.light"), .init(property: "font-weight", value: "300", token: "text.typography.fontWeight.light", designSlot: "text.design.condition-2f78ecef044e.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "weight", value: "normal")], declarations: [.init(property: "text.typography.fontWeight.regular", value: "400", token: "semantic.typography.font.weight.regular"), .init(property: "font-weight", value: "400", token: "text.typography.fontWeight.regular", designSlot: "text.design.condition-223331540ae2.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "weight", value: "medium")], declarations: [.init(property: "text.typography.fontWeight.medium", value: "500", token: "semantic.typography.font.weight.medium"), .init(property: "font-weight", value: "500", token: "text.typography.fontWeight.medium", designSlot: "text.design.condition-a9821c9eea70.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "weight", value: "semibold")], declarations: [.init(property: "text.typography.fontWeight.medium", value: "600", token: "semantic.typography.font.weight.semibold"), .init(property: "font-weight", value: "500", token: "text.typography.fontWeight.medium", designSlot: "text.design.condition-eae8588b0e7e.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "weight", value: "bold")], declarations: [.init(property: "text.typography.fontWeight.bold", value: "700", token: "semantic.typography.font.weight.bold"), .init(property: "font-weight", value: "700", token: "text.typography.fontWeight.bold", designSlot: "text.design.condition-7e6b52652555.typography.weight")]),
    ]
    static let omissions: [String] = [".text[data-truncate=\"true\"]: selector outside normalized native grammar"]
}

/// Emitted through the static-content path: passive p root with a single consumer content region.
public struct Text<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        TextTokens.scopes
    }
    private let variant: TextVariant?
    private let size: TextSize?
    private let weight: TextWeight?
    private let align: TextAlign?
    private let transform: TextTransform?
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme
    private var nativeTextStyle: FsdsResolvedNativeTextStyle {
        var values: [String: String] = [:]
        if let value = variant { values["variant"] = value.rawValue }
        if let value = size { values["size"] = value.rawValue }
        if let value = weight { values["weight"] = value.rawValue }
        if let value = align { values["align"] = value.rawValue }
        if let value = transform { values["transform"] = value.rawValue }
        do {
            return try resolveFsdsNativeTextStyle(TextNativeTextRules.rules, theme: fsdsTheme, variants: values, part: "root")
        } catch {
            preconditionFailure(String(describing: error))
        }
    }

    public init(
        variant: TextVariant? = nil,
        size: TextSize? = nil,
        weight: TextWeight? = nil,
        align: TextAlign? = nil,
        transform: TextTransform? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.variant = variant
        self.size = size
        self.weight = weight
        self.align = align
        self.transform = transform
        self.content = content()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", variant.map { "variant_\($0.rawValue)" }, size.map { "variant_\($0.rawValue)" }, weight.map { "variant_\($0.rawValue)" }, align.map { "variant_\($0.rawValue)" }, transform.map { "variant_\($0.rawValue)" }].compactMap { $0 }
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var foreground: Color { colorSlot("color.foreground.primary") ?? .primary }
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
