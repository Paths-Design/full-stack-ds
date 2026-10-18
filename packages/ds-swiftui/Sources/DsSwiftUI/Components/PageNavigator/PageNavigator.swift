// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum PageNavigatorPresentation: String, CaseIterable {
    case indicators
    case pages
}
// @generated:end

// @generated:start component

/// Emitted through the paged navigator composite path: previous/next triggers, a draft page field committed on Return or via the commit trigger, and an optional composed position set — component references lower to their sibling generated views, and the shared FsdsPagedPosition policy owns the step/draft guards.
public struct PageNavigator: View {
    @Environment(\.fsdsMessages) private var fsdsMessages
    @StateObject private var page: ControllableValue<Int>
    private let pages: [String]
    private let pageCount: Int?
    private let presentation: PageNavigatorPresentation
    private let pageLabelProp: String?
    private let previousLabelProp: String?
    private let nextLabelProp: String?
    private let commitLabelProp: String?
    private let showChoices: Bool
    private let labelProp: String?
    private let disabled: Bool
    @State private var draft = ""

    public init(
        index: Binding<Int>? = nil,
        defaultIndex: Int = 0,
        onIndexChange: ((Int) -> Void)? = nil,
        pages: [String] = [],
        pageCount: Int? = nil,
        presentation: PageNavigatorPresentation = .indicators,
        pageLabel: String? = nil,
        previousLabel: String? = nil,
        nextLabel: String? = nil,
        commitLabel: String? = nil,
        showChoices: Bool = false,
        label: String? = nil,
        disabled: Bool = false
    ) {
        self._page = StateObject(wrappedValue: ControllableValue(controlled: index, defaultValue: defaultIndex, onChange: onIndexChange))
        self.pages = pages
        self.pageCount = pageCount
        self.presentation = presentation
        self.pageLabelProp = pageLabel
        self.previousLabelProp = previousLabel
        self.nextLabelProp = nextLabel
        self.commitLabelProp = commitLabel
        self.showChoices = showChoices
        self.labelProp = label
        self.disabled = disabled
    }

    private var pageLabel: String { pageLabelProp ?? fsdsMessages.string("PageNavigator.pageLabel", default: "Current page") }
    private var previousLabel: String { previousLabelProp ?? fsdsMessages.string("PageNavigator.previousPage", default: "Previous page") }
    private var nextLabel: String { nextLabelProp ?? fsdsMessages.string("PageNavigator.nextPage", default: "Next page") }
    private var commitLabel: String { commitLabelProp ?? fsdsMessages.string("PageNavigator.commit", default: "Go") }
    private var label: String { labelProp ?? fsdsMessages.string("PageNavigator.groupLabel", default: "Page navigation") }

    private var position: FsdsPagedPosition {
        FsdsPagedPosition(index: page.value, count: pageCount ?? pages.count, disabled: disabled)
    }

    public var body: some View {
        HStack(spacing: 4) {
            FsdsButton(
                disabled: position.previousDisabled,
                accessibilityLabel: previousLabel,
                onTap: { request(page.value - 1) }
            ) {
                Icon(name: "arrow-left", size: .sm)
            }
            Input(
                value: $draft,
                placeholder: pageLabel,
                disabled: position.stateDisabled
            )
                .frame(maxWidth: 48)
                .onSubmit(commit)
            SwiftUI.Text(fsdsMessages.string("PageNavigator.pageCount", default: "of {count}", params: ["count": String(position.count)]))
            FsdsButton(
                disabled: position.stateDisabled,
                accessibilityLabel: commitLabel,
                onTap: commit
            ) {
                SwiftUI.Text(commitLabel)
            }
            FsdsButton(
                disabled: position.nextDisabled,
                accessibilityLabel: nextLabel,
                onTap: { request(page.value + 1) }
            ) {
                Icon(name: "arrow-right", size: .sm)
            }
            if showChoices {
                Pagination(
                    index: page.binding(),
                    pages: pages,
                    presentation: presentation == .pages ? .pages : .indicators,
                    label: label,
                    disabled: disabled
                )
            }
        }
        .fsdsAccessibilityLabel(label)
        .onAppear { draft = position.ordinal }
        .onChange(of: position.ordinal) { draft = $0 }
    }

    private func request(_ target: Int) {
        if position.canRequest(target) {
            page.set(target)
        }
    }

    private func commit() {
        if let target = position.commitTarget(for: draft) {
            page.set(target)
        }
        draft = position.ordinal
    }
}
// @generated:end
