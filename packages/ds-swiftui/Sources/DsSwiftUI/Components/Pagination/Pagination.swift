// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum PaginationPresentation: String, CaseIterable {
    case indicators
    case pages
}
public enum PaginationProgress: String, CaseIterable {
    case none
    case elapsed
}
// @generated:end

// @generated:start component
/// Token scope data for Pagination (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum PaginationTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", literal: .string("0")),
            "pagination.color.foreground": FsdsComponentTokenDefinition(cssVar: "--fsds-pagination-color-foreground", name: "pagination.color.foreground", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "pagination.color.track": FsdsComponentTokenDefinition(cssVar: "--fsds-pagination-color-track", name: "pagination.color.track", ref: "semantic.color.border.subtle", fallback: .adaptive(light: "#d0d0d0", dark: "#474647")),
            "pagination.size.dot-size": FsdsComponentTokenDefinition(cssVar: "--fsds-pagination-size-dot-size", name: "pagination.size.dot-size", ref: "core.spacing.size.04", fallback: .string("8px")),
        ],
    ]
}

/// Emitted through the paged-position set path: the page channel rides ControllableValue<Int>, each item button requests its zero-based index, and the shared FsdsPagedPosition policy derives validity, the ordinal and the step guards (createPagedSet rules). The current position stays focusable.
public struct Pagination: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        PaginationTokens.scopes
    }
    @StateObject private var page: ControllableValue<Int>
    private let pages: [String]
    private let presentation: PaginationPresentation
    private let progress: PaginationProgress
    private let label: String?
    private let disabled: Bool
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        index: Binding<Int>? = nil,
        defaultIndex: Int = 0,
        onIndexChange: ((Int) -> Void)? = nil,
        pages: [String] = [],
        presentation: PaginationPresentation = .indicators,
        progress: PaginationProgress = .none,
        label: String? = "Choose page",
        disabled: Bool = false
    ) {
        self._page = StateObject(wrappedValue: ControllableValue(controlled: index, defaultValue: defaultIndex, onChange: onIndexChange))
        self.pages = pages
        self.presentation = presentation
        self.progress = progress
        self.label = label
        self.disabled = disabled
    }

    private var position: FsdsPagedPosition {
        FsdsPagedPosition(index: page.value, count: pages.count, disabled: disabled)
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", "variant_\(presentation.rawValue)", "variant_\(progress.rawValue)"]
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }
    private var foreground: Color { colorSlot("color.foreground") ?? .primary }

    public var body: some View {
        HStack(spacing: gap) {
            ForEach(pages.indices, id: \.self) { itemIndex in
                Button {
                    if position.canRequest(itemIndex) {
                        page.set(itemIndex)
                    }
                } label: {
                    HStack(spacing: 4) {
                        if presentation == .indicators {
                            marker(for: itemIndex)
                        }
                        if presentation == .pages {
                            SwiftUI.Text(pages[itemIndex])
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(disabled)
                .accessibilityLabel(pages[itemIndex])
                .accessibilityAddTraits(itemIndex == page.value ? [.isSelected] : [])
            }
        }
        .fsdsAccessibilityLabel(label)
    }

    @ViewBuilder private func marker(for itemIndex: Int) -> some View {
        let current = itemIndex == page.value
        Capsule()
            .fill(current && progress == .elapsed ? accentFill : trackFill)
            .frame(width: current && progress == .elapsed ? dotSize * 2 : dotSize, height: dotSize)
    }

    private var accentFill: Color { colorSlot("pagination.color.progress") ?? .accentColor }
    private var trackFill: Color { colorSlot("pagination.color.track") ?? Color.secondary.opacity(0.35) }
    private var dotSize: CGFloat { pxSlot("pagination.size.dot-size") ?? 6 }
}
// @generated:end
