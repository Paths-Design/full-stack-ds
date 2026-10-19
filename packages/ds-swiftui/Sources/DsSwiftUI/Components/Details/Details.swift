// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum DetailsVariant: String, CaseIterable {
    case `default`
    case inline
    case compact
}
public enum DetailsIcon: String, CaseIterable {
    case left
    case right
    case none
}
// @generated:end

// @generated:start component
/// Token scope data for Details (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum DetailsTokens {
    public static let scopes: FsdsComponentTokenScopes = [:
    ]
}

/// Emitted through the native-disclosure collapse path: SwiftUI DisclosureGroup realizes the summary + expandable content anatomy.
public struct Details<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        DetailsTokens.scopes
    }
    @ControllableState private var open: ControllableValue<Bool>
    private let summary: String?
    private let disabled: Bool
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        open: Binding<Bool>? = nil,
        defaultOpen: Bool = false,
        onOpenChange: ((Bool) -> Void)? = nil,
        summary: String? = nil,
        disabled: Bool = false,
        @ViewBuilder content: () -> Content
    ) {
        self._open = ControllableState(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange)
        self.summary = summary
        self.disabled = disabled
        self.content = content()
    }


    public var body: some View {
        DisclosureGroup(isExpanded: Binding(
            get: { open.value },
            set: { open.set($0) }
        )) {
            content
        } label: {
            if let summary {
                SwiftUI.Text(summary)
            } else {
                EmptyView()
            }
        }
            .disabled(disabled)
    }
}
// @generated:end
