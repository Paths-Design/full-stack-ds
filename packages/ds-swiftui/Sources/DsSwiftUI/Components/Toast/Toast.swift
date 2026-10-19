// @generated:start types
public enum ToastVariant: String, CaseIterable {
    case info
    case success
    case warning
    case error
}
public enum ToastPoliteness: String, CaseIterable {
    case polite
    case assertive
}
// @generated:end

// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start component
/// Token scope data for Toast (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum ToastTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.surface.size.padding-block", fallback: .string("16px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.surface.size.padding-inline", fallback: .string("16px")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.surface.size.gap", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", literal: .string("0")),
            "toast.surface.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-toast-surface-radius", name: "toast.surface.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// Emitted through the toast surface path: an overlay presentation over the open channel (the shared ControllableValue substrate); ephemeral presence auto-dismisses after the dwell token (6000ms).
public struct Toast<Item: View, Title: View, Description: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        ToastTokens.scopes
    }
    @ControllableState private var open: ControllableValue<Bool>
    private let item: Item
    private let title: Title
    private let description: Description
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        open: Binding<Bool>? = nil,
        defaultOpen: Bool = false,
        onOpenChange: ((Bool) -> Void)? = nil,
        @ViewBuilder item: () -> Item = { EmptyView() },
        @ViewBuilder title: () -> Title = { EmptyView() },
        @ViewBuilder description: () -> Description = { EmptyView() }
    ) {
        self._open = ControllableState(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange)
        self.item = item()
        self.title = title()
        self.description = description()
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

    private var radius: CGFloat { pxSlot("radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }
    private var minHeight: CGFloat { pxSlot("min-height") ?? 0 }

    @ViewBuilder
    private var panel: some View {
        VStack(spacing: gap) {
            item
            title
            description
        }
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }

    public var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.clear
            if open.value {
                panel
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
            .task(id: open.value) {
                if open.value {
                    try? await Task.sleep(for: .milliseconds(6000))
                    open.set(false)
                }
            }
    }
}
// @generated:end
