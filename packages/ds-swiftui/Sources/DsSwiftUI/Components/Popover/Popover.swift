// @generated:start types
public enum PopoverPlacement: String, CaseIterable {
    case top
    case bottom
    case left
    case right
    case auto
}
// @generated:end

// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start component
/// Token scope data for Popover (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum PopoverTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.surface.size.padding-block", fallback: .string("16px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.surface.size.padding-inline", fallback: .string("16px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.surface.size.gap", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "popover.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-popover-size-radius", name: "popover.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
            "popover.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-popover-color-border", name: "popover.color.border", ref: "semantic.color.border.subtle", fallback: .adaptive(light: "#d0d0d0", dark: "#474647")),
        ],
    ]
}

/// Emitted through the anchored-surface path: press on the trigger region drives the open channel from the declared open triggers, presenting the content region in a popover. Native popover dismissal realizes platform dismissal.
public struct Popover<Trigger: View, Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        PopoverTokens.scopes
    }
    @StateObject private var open: ControllableValue<Bool>
    private let openControlled: Binding<Bool>?
    private let placement: PopoverPlacement
    private let disabled: Bool
    private let trigger: Trigger
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        open: Binding<Bool>? = nil,
        defaultOpen: Bool = false,
        onOpenChange: ((Bool) -> Void)? = nil,
        placement: PopoverPlacement = .top,
        disabled: Bool = false,
        @ViewBuilder trigger: () -> Trigger,
        @ViewBuilder content: () -> Content = { EmptyView() }
    ) {
        self._open = StateObject(wrappedValue: ControllableValue(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange))
        self.openControlled = open
        self.placement = placement
        self.disabled = disabled
        self.trigger = trigger()
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

    private var borderColor: Color { colorSlot("color.border") ?? .clear }
    private var radius: CGFloat { pxSlot("size.radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }
    private var minHeight: CGFloat { pxSlot("min-height") ?? 0 }

    @ViewBuilder
    private var panel: some View {
        content
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
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
        SwiftUI.Button(action: { open.toggle() }) {
            trigger
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .popover(isPresented: presentationBinding, arrowEdge: placementEdge) {
            panel
        }
    }

    private var placementEdge: Edge {
        switch placement {
        case .top: return .top
        case .bottom: return .bottom
        case .left: return .leading
        case .right: return .trailing
        case .auto: return .bottom
        }
    }
}
// @generated:end

