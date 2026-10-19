// @generated:start types
public enum WalkthroughPlacement: String, CaseIterable {
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
/// Token scope data for Walkthrough (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum WalkthroughTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", literal: .string("0")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", literal: .string("0")),
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.structure.size.gap", fallback: .string("16px")),
            "walkthrough.surface.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-walkthrough-surface-radius", name: "walkthrough.surface.radius", ref: "semantic.shape.radius.large", fallback: .string("16px")),
            "walkthrough.button.primary.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-walkthrough-button-primary-radius", name: "walkthrough.button.primary.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
        ],
    ]
}

/// Emitted through the coachmark surface path: an overlay panel on the step channel with prev/next navigation and the contract's completion/skip callbacks.
public struct Walkthrough<TitleRegion: View, DescriptionRegion: View>: View {
    @Environment(\.fsdsMessages) private var fsdsMessages
    private var fsdsScopes: FsdsComponentTokenScopes {
        WalkthroughTokens.scopes
    }
    @ControllableState private var step: ControllableValue<Double>
    private let stepCount: Int
    private let onComplete: (() -> Void)?
    private let onSkip: (() -> Void)?
    private let nextLabelProp: String?
    private let title: TitleRegion
    private let description: DescriptionRegion
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        step: Double = 0,
        stepCount: Int = 3,
        onStepChange: ((Double) -> Void)? = nil,
        onComplete: (() -> Void)? = nil,
        onSkip: (() -> Void)? = nil,
        nextLabel: String? = nil,
        @ViewBuilder title: () -> TitleRegion = { EmptyView() },
        @ViewBuilder description: () -> DescriptionRegion = { EmptyView() }
    ) {
        self._step = ControllableState(controlled: nil, defaultValue: step, onChange: onStepChange)
        self.stepCount = stepCount
        self.onComplete = onComplete
        self.onSkip = onSkip
        self.nextLabelProp = nextLabel
        self.title = title()
        self.description = description()
    }

    private var nextLabel: String { nextLabelProp ?? fsdsMessages.string("Walkthrough.next", default: "Next") }

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
            title
            description
            HStack {
                Button(fsdsMessages.string("Walkthrough.skip", default: "Skip")) { onSkip?() }
                    .buttonStyle(.plain)
                    .accessibilityLabel(fsdsMessages.string("Walkthrough.skipTour", default: "Skip tour"))
                Spacer()
                Button(fsdsMessages.string("Walkthrough.previous", default: "Previous")) { if step.value > 0 { step.set(step.value - 1) } }
                    .buttonStyle(.plain)
                    .accessibilityLabel(fsdsMessages.string("Walkthrough.previousStep", default: "Previous step"))
                Button(nextLabel) {
                    step.set(step.value + 1)
                    if Int(step.value) >= stepCount - 1 { onComplete?() }
                }
                .buttonStyle(.borderedProminent)
            }
        }
            .padding(.vertical, blockPadding)
            .padding(.horizontal, inlinePadding)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
}
// @generated:end
