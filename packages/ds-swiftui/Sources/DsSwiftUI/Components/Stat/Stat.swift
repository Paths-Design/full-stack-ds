// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum StatSize: String, CaseIterable {
    case sm
    case md
    case lg
}
public enum StatTrend: String, CaseIterable {
    case up
    case down
    case neutral
}
// @generated:end

// @generated:start component
/// Token scope data for Stat (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum StatTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.display.size.gap", fallback: .string("4px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
        ],
    ]
}
enum StatNativeTextRules {
    static let rules: [FsdsNativeTextRule] = [
        .init(part: "root", predicates: [], declarations: [.init(property: "stat.color.foreground.value", value: "#141414", token: "semantic.color.foreground.primary"), .init(property: "stat.color.foreground.trend.up", value: "#497f21", token: "semantic.color.feedback.foreground.success.default"), .init(property: "stat.color.foreground.trend.down", value: "#d92d2e", token: "semantic.color.feedback.foreground.danger.default"), .init(property: "stat.color.foreground.trend.neutral", value: "#474647", token: "semantic.color.foreground.secondary"), .init(property: "stat.size.value.sm", value: "18px", token: "semantic.typography.heading.04"), .init(property: "stat.size.value.md", value: "24px", token: "semantic.typography.heading.02"), .init(property: "stat.size.value.lg", value: "32px", token: "semantic.typography.heading.01"), .init(property: "stat.typography.weight.value", value: "700", token: "semantic.typography.font.weight.bold")]),
        .init(part: "root", predicates: [], declarations: [.init(property: "color", value: "#141414", token: "stat.color.foreground.value", designSlot: "stat.design.root.foreground.color"), .init(property: "font-size", value: "24px", token: "stat.size.value.md", designSlot: "stat.design.root.typography.size"), .init(property: "font-weight", value: "700", token: "stat.typography.weight.value", designSlot: "stat.design.root.typography.weight")]),
        .init(part: "root", predicates: [.init(axis: "trend", value: "up")], declarations: [.init(property: "color", value: "#497f21", token: "stat.color.foreground.trend.up", designSlot: "stat.design.condition-150f0c29952e.foreground.color")]),
        .init(part: "root", predicates: [.init(axis: "trend", value: "down")], declarations: [.init(property: "color", value: "#d92d2e", token: "stat.color.foreground.trend.down", designSlot: "stat.design.condition-c3362b4b3c5b.foreground.color")]),
        .init(part: "root", predicates: [.init(axis: "trend", value: "neutral")], declarations: [.init(property: "color", value: "#474647", token: "stat.color.foreground.trend.neutral", designSlot: "stat.design.condition-611d8c5b8be1.foreground.color")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "sm")], declarations: [.init(property: "font-size", value: "18px", token: "stat.size.value.sm", designSlot: "stat.design.condition-24964d7ed3a7.typography.size")]),
        .init(part: "root", predicates: [.init(axis: "size", value: "lg")], declarations: [.init(property: "font-size", value: "32px", token: "stat.size.value.lg", designSlot: "stat.design.condition-72800fd5573d.typography.size")]),
    ]
    static let omissions: [String] = []
}

/// Emitted through the static-content path: passive div root with a single consumer content region.
public struct Stat<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        StatTokens.scopes
    }
    private let size: StatSize
    private let trend: StatTrend?
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme
    private var nativeTextStyle: FsdsResolvedNativeTextStyle {
        var values: [String: String] = [:]
        values["size"] = size.rawValue
        if let value = trend { values["trend"] = value.rawValue }
        do {
            return try resolveFsdsNativeTextStyle(StatNativeTextRules.rules, theme: fsdsTheme, variants: values, part: "root")
        } catch {
            preconditionFailure(String(describing: error))
        }
    }

    public init(
        size: StatSize = .md,
        trend: StatTrend? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.size = size
        self.trend = trend
        self.content = content()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", "variant_\(size.rawValue)", trend.map { "variant_\($0.rawValue)" }].compactMap { $0 }
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

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
            .foregroundStyle(nativeTextStyle.color ?? Color.primary)
    }
}
// @generated:end
