// @generated:start types
public enum DialogSize: String, CaseIterable {
    case sm
    case md
    case lg
    case xl
    case full
}
// @generated:end

// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start component
/// Token scope data for Dialog (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum DialogTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.surface.size.padding-block", fallback: .string("16px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.surface.size.padding-inline", fallback: .string("16px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.surface.size.gap", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "dialog.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-dialog-color-background", name: "dialog.color.background", ref: "semantic.color.background.primary", fallback: .adaptive(light: "#ffffff", dark: "#000000")),
            "dialog.color.foreground": FsdsComponentTokenDefinition(cssVar: "--fsds-dialog-color-foreground", name: "dialog.color.foreground", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "dialog.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-dialog-color-border", name: "dialog.color.border", ref: "semantic.color.border.subtle", fallback: .adaptive(light: "#d0d0d0", dark: "#474647")),
            "dialog.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-dialog-size-radius", name: "dialog.size.radius", ref: "semantic.shape.radius.large", fallback: .string("16px")),
        ],
        "part_backdrop": [
            "dialog.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-dialog-color-background", name: "dialog.color.background", ref: "semantic.color.overlay.scrim", fallback: .string("#00000066")),
        ],
        "part_body": [
            "dialog.color.foreground": FsdsComponentTokenDefinition(cssVar: "--fsds-dialog-color-foreground", name: "dialog.color.foreground", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
        ],
        "part_closeButton": [
            "dialog.color.foreground": FsdsComponentTokenDefinition(cssVar: "--fsds-dialog-color-foreground", name: "dialog.color.foreground", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
        ],
        "hover": [
            "dialog.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-dialog-color-background", name: "dialog.color.background", ref: "semantic.color.background.hover", fallback: .adaptive(light: "#f7f7f7", dark: "#474647")),
        ],
    ]
}

/// Emitted through the centered-modal surface path: presented as a sheet whose native dismissal (Esc, overlay click) drives the openness channel back through onOpenChange — the contract's escape/overlayClick dismissal triggers realized by the platform.
public struct Dialog<Header: View, Title: View, BodyContent: View, Footer: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        DialogTokens.scopes
    }
    @StateObject private var open: ControllableValue<Bool>
    private let openControlled: Binding<Bool>?
    private let header: Header
    private let title: Title
    private let bodyContent: BodyContent
    private let footer: Footer
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        open: Binding<Bool>? = nil,
        defaultOpen: Bool = false,
        onOpenChange: ((Bool) -> Void)? = nil,
        @ViewBuilder header: () -> Header = { EmptyView() },
        @ViewBuilder title: () -> Title = { EmptyView() },
        @ViewBuilder bodyContent: () -> BodyContent = { EmptyView() },
        @ViewBuilder footer: () -> Footer = { EmptyView() }
    ) {
        self._open = StateObject(wrappedValue: ControllableValue(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange))
        self.openControlled = open
        self.header = header()
        self.title = title()
        self.bodyContent = bodyContent()
        self.footer = footer()
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
    private var foreground: Color { colorSlot("color.foreground") ?? .primary }
    private var borderColor: Color { colorSlot("color.border") ?? .clear }
    private var radius: CGFloat { pxSlot("size.radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }
    private var minHeight: CGFloat { pxSlot("min-height") ?? 0 }

    @ViewBuilder
    private var panel: some View {
        VStack(spacing: gap) {
            header
            title
            bodyContent
            footer
        }
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .foregroundStyle(foreground)
    }

    private var presentationBinding: Binding<Bool> {
        if let controlled = openControlled {
            return Binding(
                get: { controlled.wrappedValue },
                set: { open.set($0) }
            )
        }
        return Binding(
            get: { open.value },
            set: { open.set($0) }
        )
    }

    public var body: some View {
        SwiftUI.Color.clear.frame(width: 0, height: 0)
            .sheet(isPresented: presentationBinding) {
                panel
            }
    }
}
// @generated:end
