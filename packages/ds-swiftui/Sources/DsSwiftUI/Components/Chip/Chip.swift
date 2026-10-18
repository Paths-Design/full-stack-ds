// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum ChipType: String, CaseIterable {
    case button
    case submit
    case reset
}
public enum ChipVariant: String, CaseIterable {
    case `default`
    case selected
    case dismissible
}
public enum ChipSize: String, CaseIterable {
    case small
    case medium
    case large
}
// @generated:end

// @generated:start component
/// Emitted through the dual-action composite path: the referenced components compose the action/dismiss pair within DsSwiftUI.
public struct Chip<Text: View, IconRegion: View>: View {
    @Environment(\.fsdsMessages) private var fsdsMessages
    private let disabled: Bool
    private let dismissible: Bool
    private let onClick: (() -> Void)?
    private let onDismiss: (() -> Void)?
    private let accessibilityLabel: String?
    private let dismissLabelProp: String?
    private let iconRegion: IconRegion
    private let text: Text

    public init(
        disabled: Bool = false,
        dismissible: Bool = false,
        onClick: (() -> Void)? = nil,
        onDismiss: (() -> Void)? = nil,
        accessibilityLabel: String? = nil,
        dismissLabel: String? = nil,
        @ViewBuilder icon: () -> IconRegion = { EmptyView() },
        @ViewBuilder text: () -> Text
    ) {
        self.disabled = disabled
        self.dismissible = dismissible
        self.onClick = onClick
        self.onDismiss = onDismiss
        self.accessibilityLabel = accessibilityLabel
        self.dismissLabelProp = dismissLabel
        self.iconRegion = icon()
        self.text = text()
    }

    private var dismissLabel: String { dismissLabelProp ?? fsdsMessages.string("Chip.dismiss", default: "Remove") }

    public var body: some View {
        HStack(spacing: 4) {
            DsSwiftUI.FsdsButton(
                disabled: disabled,
                onTap: onClick
            ) {
                iconRegion
                text
            }
            .fsdsAccessibilityLabel(accessibilityLabel)
            if dismissible {
                DsSwiftUI.FsdsButton(
                    disabled: disabled,
                    onTap: onDismiss
                ) {
                    SwiftUI.Image(systemName: "xmark")
                }
                .fsdsAccessibilityLabel(dismissLabel)
            }
        }
    }
}
// @generated:end
