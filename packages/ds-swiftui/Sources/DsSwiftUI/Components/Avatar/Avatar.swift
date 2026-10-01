// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types

// @generated:end

// @generated:start component
/// Token scope data for Avatar (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum AvatarTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", literal: .string("0")),
            "avatar.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-avatar-size-radius", name: "avatar.size.radius", ref: "semantic.shape.control.radius.pill", fallback: .string("9999px")),
            "avatar.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-avatar-color-background", name: "avatar.color.background", ref: "semantic.color.background.secondary", fallback: .adaptive(light: "#f7f7f7", dark: "#313131")),
            "avatar.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-avatar-color-foreground-primary", name: "avatar.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "avatar.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-avatar-color-border", name: "avatar.color.border", ref: "semantic.color.border.light", fallback: .adaptive(light: "#b8b8b8", dark: "#474647")),
        ],
    ]
}

/// Emitted through the src-or-fallback path: the referenced component renders when src is set; the name prop is the fallback content.
public struct Avatar: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        AvatarTokens.scopes
    }
    private let src: String?
    private let name: String?

    public init(
        src: String? = nil,
        name: String? = nil
    ) {
        self.src = src
        self.name = name
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

    @Environment(\.fsdsTheme) private var fsdsTheme

    public var body: some View {
        Group {
            if let src {
                DsSwiftUI.Image(src: src, alt: name)
            } else {
                SwiftUI.Text(name ?? "")
            }
        }
            .frame(width: 40, height: 40)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .background(background)
    }
}
// @generated:end
