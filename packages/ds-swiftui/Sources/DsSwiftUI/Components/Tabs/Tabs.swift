// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum TabsOrientation: String, CaseIterable {
    case horizontal
    case vertical
}
public enum TabsAppearance: String, CaseIterable {
    case underline
    case pills
}
public enum TabsActivationMode: String, CaseIterable {
    case automatic
    case manual
}
// @generated:end

// @generated:start component
/// Token scope data for Tabs (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum TabsTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.structure.size.gap", fallback: .string("16px")),
            "tabs.color.fg": FsdsComponentTokenDefinition(cssVar: "--fsds-tabs-color-fg", name: "tabs.color.fg", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "tabs.shape.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-tabs-shape-radius", name: "tabs.shape.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// Emitted through the interactive-composite path: the activeTab channel gates content visibility (union channel lowers to its multi member v1).
public struct Tabs<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        TabsTokens.scopes
    }
    @ControllableState private var activeTab: ControllableValue<String>
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        activeTab: Binding<String>? = nil,
        defaultActiveTab: String = "",
        onActiveTabChange: ((String) -> Void)? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self._activeTab = ControllableState(controlled: activeTab, defaultValue: defaultActiveTab, onChange: onActiveTabChange)
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

    private var foreground: Color { colorSlot("color.fg") ?? .primary }
    private var radius: CGFloat { pxSlot("radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }

    public var body: some View {
        VStack(spacing: gap) {
            content
        }
            .environmentObject(activeTab)
    }
}

/// Press-wired tab: sets the `activeTab` channel to `value`.
public struct TabsTab: View {
    @EnvironmentObject var activeTab: ControllableValue<String>
    private let value: String
    private let label: String
    public init(value: String, label: String) {
        self.value = value
        self.label = label
    }
    public var body: some View {
        Button(label) { activeTab.set(value) }
            .buttonStyle(.plain)
    }
}

/// Panel region: content visible only while the `activeTab` channel equals `value`.
public struct TabsPanel<Content: View>: View {
    @EnvironmentObject var activeTab: ControllableValue<String>
    private let value: String
    private let content: Content
    public init(value: String, @ViewBuilder content: () -> Content) {
        self.value = value
        self.content = content()
    }
    public var body: some View {
        if activeTab.value == value {
            content
        } else {
            EmptyView()
        }
    }
}
// @generated:end
