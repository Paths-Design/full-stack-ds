// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum NavListOrientation: String, CaseIterable {
    case vertical
    case horizontal
}
// @generated:end

// @generated:start component
/// Token scope data for NavList (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum NavListTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.structure.size.gap", fallback: .string("16px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "nav-list.color.foreground.default": FsdsComponentTokenDefinition(cssVar: "--fsds-nav-list-color-foreground-default", name: "nav-list.color.foreground.default", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
            "nav-list.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-nav-list-color-background-default", name: "nav-list.color.background.default", ref: "semantic.color.background.transparent", fallback: .string("transparent")),
            "nav-list.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-nav-list-size-radius", name: "nav-list.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// Emitted through the static-content path: passive nav root with a single consumer content region.
public struct NavList<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        NavListTokens.scopes
    }
    private let orientation: NavListOrientation
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        orientation: NavListOrientation = .vertical,
        @ViewBuilder content: () -> Content
    ) {
        self.orientation = orientation
        self.content = content()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", "variant_\(orientation.rawValue)"]
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var background: Color { colorSlot("color.background.default") ?? .accentColor }
    private var foreground: Color { colorSlot("color.foreground.default") ?? .primary }
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
