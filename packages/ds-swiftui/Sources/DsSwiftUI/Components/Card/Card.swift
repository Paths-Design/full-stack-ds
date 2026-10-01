// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum CardDensity: String, CaseIterable {
    case `default`
    case inset
}
// @generated:end

// @generated:start component
/// Token scope data for Card (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum CardTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.surface.size.padding-block", fallback: .string("16px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.surface.size.padding-inline", fallback: .string("16px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.surface.size.gap", fallback: .string("8px")),
            "card.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-card-color-background-default", name: "card.color.background.default", ref: "semantic.color.background.primary", fallback: .adaptive(light: "#ffffff", dark: "#000000")),
            "card.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-card-color-border", name: "card.color.border", ref: "semantic.color.border.light", fallback: .adaptive(light: "#b8b8b8", dark: "#474647")),
            "card.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-card-color-foreground-primary", name: "card.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "card.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-card-size-radius", name: "card.size.radius", ref: "semantic.shape.radius.medium", fallback: .string("8px")),
        ],
        "part_description": [
            "card.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-card-color-foreground-primary", name: "card.color.foreground.primary", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
        ],
        "part_link": [
            "card.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-card-color-foreground-primary", name: "card.color.foreground.primary", ref: "semantic.color.foreground.link", fallback: .adaptive(light: "#d92d2e", dark: "#e55b5a")),
        ],
        "part_note": [
            "card.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-card-color-foreground-primary", name: "card.color.foreground.primary", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
        ],
    ]
}

/// Emitted through a composer path: passive container root, one content region per named region (compound part or named slot).
public struct Card<Header: View, Media: View, Content: View, Footer: View, Actions: View, Badge: View, Description: View, Link: View, Note: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        CardTokens.scopes
    }
    private let density: CardDensity
    private let header: Header
    private let media: Media
    private let content: Content
    private let footer: Footer
    private let actions: Actions
    private let badge: Badge
    private let description: Description
    private let link: Link
    private let note: Note
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        density: CardDensity = .`default`,
        @ViewBuilder header: () -> Header = { EmptyView() },
        @ViewBuilder media: () -> Media = { EmptyView() },
        @ViewBuilder content: () -> Content = { EmptyView() },
        @ViewBuilder footer: () -> Footer = { EmptyView() },
        @ViewBuilder actions: () -> Actions = { EmptyView() },
        @ViewBuilder badge: () -> Badge = { EmptyView() },
        @ViewBuilder description: () -> Description = { EmptyView() },
        @ViewBuilder link: () -> Link = { EmptyView() },
        @ViewBuilder note: () -> Note = { EmptyView() }
    ) {
        self.density = density
        self.header = header()
        self.media = media()
        self.content = content()
        self.footer = footer()
        self.actions = actions()
        self.badge = badge()
        self.description = description()
        self.link = link()
        self.note = note()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", "variant_\(density.rawValue)"]
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String, requireRadius: Bool = false) -> CGFloat? {
        let value = layered.first { $0.key.hasSuffix(suffix) }?.value
        return requireRadius ? fsdsRequireRadius(value, slot: suffix) : value?.px
    }

    private var background: Color { colorSlot("color.background.default") ?? .accentColor }
    private var foreground: Color { colorSlot("color.foreground.primary") ?? .primary }
    private var borderColor: Color { colorSlot("color.border") ?? .clear }
    private var radius: CGFloat { pxSlot("size.radius", requireRadius: true) ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }

    @ViewBuilder
    private var regions: some View {
        VStack(spacing: gap) {
            header
            media
            content
            footer
            actions
            badge
            description
            link
            note
        }
    }

    public var body: some View {
        regions
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .background(background, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .foregroundStyle(foreground)
    }
}
// @generated:end
