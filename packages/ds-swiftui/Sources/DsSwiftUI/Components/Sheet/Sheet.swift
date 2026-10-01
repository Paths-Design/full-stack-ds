// @generated:start types
public enum SheetSide: String, CaseIterable {
    case top
    case right
    case bottom
    case left
}
// @generated:end

// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start component
/// Token scope data for Sheet (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum SheetTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.surface.size.padding-block", fallback: .string("16px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.surface.size.padding-inline", fallback: .string("16px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.surface.size.gap", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "sheet.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-sheet-color-background", name: "sheet.color.background", ref: "semantic.color.background.primary", fallback: .adaptive(light: "#ffffff", dark: "#000000")),
            "sheet.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-sheet-color-border", name: "sheet.color.border", ref: "semantic.color.border.light", fallback: .adaptive(light: "#b8b8b8", dark: "#474647")),
            "sheet.border.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-sheet-border-radius", name: "sheet.border.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// Emitted through the centered-modal surface path: presented as a sheet whose native dismissal (Esc, overlay click) drives the openness channel back through onOpenChange — the contract's escape/overlayClick dismissal triggers realized by the platform.
public struct Sheet<Content: View, Header: View, Title: View, Description: View, BodyContent: View, Footer: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        SheetTokens.scopes
    }
    @StateObject private var open: ControllableValue<Bool>
    private let openControlled: Binding<Bool>?
    private let content: Content
    private let header: Header
    private let title: Title
    private let description: Description
    private let bodyContent: BodyContent
    private let footer: Footer
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        open: Binding<Bool>? = nil,
        defaultOpen: Bool = false,
        onOpenChange: ((Bool) -> Void)? = nil,
        @ViewBuilder content: () -> Content = { EmptyView() },
        @ViewBuilder header: () -> Header = { EmptyView() },
        @ViewBuilder title: () -> Title = { EmptyView() },
        @ViewBuilder description: () -> Description = { EmptyView() },
        @ViewBuilder bodyContent: () -> BodyContent = { EmptyView() },
        @ViewBuilder footer: () -> Footer = { EmptyView() }
    ) {
        self._open = StateObject(wrappedValue: ControllableValue(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange))
        self.openControlled = open
        self.content = content()
        self.header = header()
        self.title = title()
        self.description = description()
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
    private var borderColor: Color { colorSlot("color.border") ?? .clear }
    private var radius: CGFloat { pxSlot("radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }
    private var minHeight: CGFloat { pxSlot("min-height") ?? 0 }

    @ViewBuilder
    private var panel: some View {
        VStack(spacing: gap) {
            content
            header
            title
            description
            bodyContent
            footer
        }
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
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
