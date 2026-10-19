// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum AccordionType: String, CaseIterable {
    case single
    case multiple
}
// @generated:end

// @generated:start component
/// Token scope data for Accordion (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum AccordionTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.structure.size.gap", fallback: .string("16px")),
            "accordion.border.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-accordion-border-radius", name: "accordion.border.radius", ref: "semantic.shape.radius.small", fallback: .string("4px")),
        ],
    ]
}

/// Emitted through the interactive-composite path: the openness channel gates content visibility (union channel lowers to its multi member v1).
public struct Accordion<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        AccordionTokens.scopes
    }
    @ControllableState private var openness: ControllableValue<[String]>
    private let disabled: Bool
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        openness: Binding<[String]>? = nil,
        defaultOpenness: [String] = [],
        onOpennessChange: (([String]) -> Void)? = nil,
        disabled: Bool = false,
        @ViewBuilder content: () -> Content
    ) {
        self._openness = ControllableState(controlled: openness, defaultValue: defaultOpenness, onChange: onOpennessChange)
        self.disabled = disabled
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

    private var radius: CGFloat { pxSlot("radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }

    public var body: some View {
        VStack(spacing: gap) {
            content
        }
            .environmentObject(openness)
    }
}

/// Disclosure item: press toggles `openness` membership for `key`; content visible while contained.
public struct AccordionItem<Trigger: View, Content: View>: View {
    @EnvironmentObject var openness: ControllableValue<[String]>
    private let key: String
    private let trigger: Trigger
    private let content: Content
    public init(key: String, @ViewBuilder trigger: () -> Trigger, @ViewBuilder content: () -> Content) {
        self.key = key
        self.trigger = trigger()
        self.content = content()
    }
    public var body: some View {
        VStack(spacing: 4) {
            Button {
                let next = openness.value.contains(key)
                    ? openness.value.filter { $0 != key }
                    : openness.value + [key]
                openness.set(next)
            } label: {
                trigger
            }
                .buttonStyle(.plain)
            if openness.value.contains(key) {
                content
            } else {
                EmptyView()
            }
        }
    }
}
// @generated:end
