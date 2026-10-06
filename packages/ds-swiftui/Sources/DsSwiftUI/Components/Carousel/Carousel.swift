// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum CarouselIndicator: String, CaseIterable {
    case pagination
    case next
    case both
}
// @generated:end

// @generated:start component
/// Token scope data for Carousel (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum CarouselTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", literal: .string("0")),
        ],
    ]
}

/// Emitted through the sequence pager path: the slide channel rides ControllableValue<Int>; the rotation affordance toggles a dwell timer (6000ms from the token graph), previous/next step the channel, and the picker composition requests positions. The viewport shows the consumer's projected surface.
public struct Carousel<Content: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        CarouselTokens.scopes
    }
    @StateObject private var slide: ControllableValue<Int>
    private let slides: [String]
    private let autoPlay: Bool
    private let duration: Double?
    private let indicator: CarouselIndicator
    private let label: String?
    private let content: Content
    @State private var playing: Bool
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        index: Binding<Int>? = nil,
        defaultIndex: Int = 0,
        onIndexChange: ((Int) -> Void)? = nil,
        slides: [String] = [],
        autoPlay: Bool = false,
        duration: Double? = nil,
        indicator: CarouselIndicator = .pagination,
        label: String? = "Featured content",
        @ViewBuilder content: () -> Content
    ) {
        self._slide = StateObject(wrappedValue: ControllableValue(controlled: index, defaultValue: defaultIndex, onChange: onIndexChange))
        self.slides = slides
        self.autoPlay = autoPlay
        self.duration = duration
        self.indicator = indicator
        self.label = label
        self.content = content()
        self._playing = State(initialValue: autoPlay)
    }

    private var valid: Bool {
        !slides.isEmpty && slide.value >= 0 && slide.value < slides.count
    }

    /// The dwell seconds: the duration prop wins; nil falls to the
    /// sequence's token-resolved dwell.
    private var dwellSeconds: Double {
        max(duration ?? 6, 0.05)
    }

    private func step(_ delta: Int) {
        let target = slide.value + delta
        if target >= 0 && target < slides.count {
            slide.set(target)
        }
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root"]
        )
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }

    public var body: some View {
        VStack(spacing: gap) {
            Button(playing ? "Stop slide rotation" : "Start slide rotation") {
                playing.toggle()
            }
            .buttonStyle(.plain)
            .disabled(!valid)
            content
            HStack(spacing: 4) {
                Button {
                    step(-1)
                } label: {
                    Icon(name: "arrow-left", size: .sm)
                }
                .buttonStyle(.plain)
                .disabled(!valid)
                .accessibilityLabel("Previous slide")
                Pagination(
                    index: slide.binding(),
                    pages: slides,
                    presentation: .indicators,
                    progress: (indicator == .pagination || indicator == .both) ? .elapsed : .none,
                    label: "Choose slide"
                )
                Button {
                    step(1)
                } label: {
                    Icon(name: "arrow-right", size: .sm)
                }
                .buttonStyle(.plain)
                .disabled(!valid)
                .accessibilityLabel("Next slide")
            }
        }
        .fsdsAccessibilityLabel(label)
        .onReceive(Timer.publish(every: dwellSeconds, on: .main, in: .common).autoconnect()) { _ in
            if playing && valid {
                step(1)
            }
        }
    }
}
// @generated:end
