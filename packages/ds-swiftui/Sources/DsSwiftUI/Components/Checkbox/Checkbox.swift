// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum CheckboxSize: String, CaseIterable {
    case sm
    case md
    case lg
}
// @generated:end

// @generated:start component
/// Emitted through the boolean-channel control path: the checked channel projects through the controllable-state pattern onto a native checkbox Toggle.
public struct Checkbox: View {
    @ControllableState private var checked: ControllableValue<Bool>
    private let disabled: Bool

    public init(
        checked: Binding<Bool>? = nil,
        defaultChecked: Bool = false,
        onChange: ((Bool) -> Void)? = nil,
        disabled: Bool = false
    ) {
        self._checked = ControllableState(controlled: checked, defaultValue: defaultChecked, onChange: onChange)
        self.disabled = disabled
    }


    public var body: some View {
        Toggle(isOn: Binding(
            get: { checked.value },
            set: { checked.set($0) }
        )) {
            EmptyView()
        }
        .toggleStyle(.checkbox)
        .disabled(disabled)
    }
}
// @generated:end
