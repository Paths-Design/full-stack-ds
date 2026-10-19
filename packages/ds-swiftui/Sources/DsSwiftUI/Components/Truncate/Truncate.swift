// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types

// @generated:end

// @generated:start component
/// Token scope data for Truncate (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum TruncateTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.display.size.gap", fallback: .string("4px")),
        ],
    ]
}

/// Emitted through the expandable-content path: the expanded channel (ControllableValue substrate) gates the line limit; the disclosure toggle appears when the contract authors one.
public struct Truncate<Content: View>: View {
    @Environment(\.fsdsMessages) private var fsdsMessages
    private var fsdsScopes: FsdsComponentTokenScopes {
        TruncateTokens.scopes
    }
    @ControllableState private var expanded: ControllableValue<Bool>
    private let expandable: Bool
    private let lines: Int
    private let collapseTextProp: String?
    private let expandTextProp: String?
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        expanded: Binding<Bool>? = nil,
        defaultExpanded: Bool = false,
        onExpandedChange: ((Bool) -> Void)? = nil,
        expandable: Bool = true,
        lines: Int = 3,
        collapseText: String? = nil,
        expandText: String? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self._expanded = ControllableState(controlled: expanded, defaultValue: defaultExpanded, onChange: onExpandedChange)
        self.expandable = expandable
        self.lines = lines
        self.collapseTextProp = collapseText
        self.expandTextProp = expandText
        self.content = content()
    }

    private var collapseText: String { collapseTextProp ?? fsdsMessages.string("Truncate.collapse", default: "Show less") }
    private var expandText: String { expandTextProp ?? fsdsMessages.string("Truncate.expand", default: "Show more") }

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

    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }

    public var body: some View {
        VStack(spacing: 4) {
            content
                .lineLimit(expanded.value ? nil : lines)
            if expandable {
                Button(expanded.value ? collapseText : expandText) {
                    expanded.toggle()
                }
                .buttonStyle(.plain)
            }
        }
    }
}
// @generated:end
