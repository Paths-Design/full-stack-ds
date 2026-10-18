// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum ToggleSwitchSize: String, CaseIterable {
    case small
    case medium
    case large
}
// @generated:end

// @generated:start component
public struct ToggleSwitch: View {
    @StateObject private var checked: ControllableValue<Bool>
    private let size: ToggleSwitchSize
    private let disabled: Bool
    private let name: String?
    private let value: String?
    private let accessibilityLabel: String?

    public init(
        checked: Binding<Bool>? = nil,
        defaultChecked: Bool = false,
        onChange: ((Bool) -> Void)? = nil,
        size: ToggleSwitchSize = .medium,
        disabled: Bool = false,
        name: String? = nil,
        value: String? = nil,
        accessibilityLabel: String? = nil
    ) {
        self._checked = StateObject(wrappedValue: ControllableValue(controlled: checked, defaultValue: defaultChecked, onChange: onChange))
        self.size = size
        self.disabled = disabled
        self.name = name
        self.value = value
        self.accessibilityLabel = accessibilityLabel
    }

    public var body: some View {
        Toggle(isOn: Binding(
            get: { checked.value },
            set: { checked.set($0) }
        )) {
            EmptyView()
        }
        .toggleStyle(.switch)
        .disabled(disabled)
        .fsdsAccessibilityLabel(accessibilityLabel)
    }

}
// @generated:end
