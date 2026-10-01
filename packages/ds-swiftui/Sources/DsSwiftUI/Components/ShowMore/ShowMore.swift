// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types

// @generated:end

// @generated:start component
/// Token scope data for ShowMore (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum ShowMoreTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.action.size.medium.padding-block", fallback: .string("4px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.action.size.medium.padding-inline", fallback: .string("8px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.action.size.medium.gap", fallback: .string("8px")),
            "show-more.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-show-more-color-background", name: "show-more.color.background", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
            "show-more.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-show-more-color-foreground-primary", name: "show-more.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "show-more.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-show-more-color-border", name: "show-more.color.border", ref: "semantic.color.border.light", fallback: .adaptive(light: "#b8b8b8", dark: "#474647")),
            "show-more.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-show-more-size-radius", name: "show-more.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// Emitted through the expandable-content path: the expanded channel (ControllableValue substrate) gates the line limit; the disclosure toggle appears when the contract authors one.
public struct ShowMore<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        ShowMoreTokens.scopes
    }
    @StateObject private var expanded: ControllableValue<Bool>
    private let maxLines: Int
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        expanded: Binding<Bool>? = nil,
        defaultExpanded: Bool = false,
        onExpandedChange: ((Bool) -> Void)? = nil,
        maxLines: Int = 3,
        @ViewBuilder content: () -> Content
    ) {
        self._expanded = StateObject(wrappedValue: ControllableValue(controlled: expanded, defaultValue: defaultExpanded, onChange: onExpandedChange))
        self.maxLines = maxLines
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

    private var background: Color { colorSlot("color.background") ?? .accentColor }
    private var foreground: Color { colorSlot("color.foreground.primary") ?? .primary }
    private var borderColor: Color { colorSlot("color.border") ?? .clear }
    private var radius: CGFloat { pxSlot("size.radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }

    public var body: some View {
        VStack(spacing: 4) {
            content
                .lineLimit(expanded.value ? nil : maxLines)
            if true {
                Button(expanded.value ? "Show less" : "Show more") {
                    expanded.toggle()
                }
                .buttonStyle(.plain)
            }
        }
            .foregroundStyle(foreground)
    }
}
// @generated:end
