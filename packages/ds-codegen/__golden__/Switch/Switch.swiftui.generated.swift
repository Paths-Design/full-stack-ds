// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum SwitchSize: String, CaseIterable {
    case sm
    case md
    case lg
}
// @generated:end

// @generated:start component
public struct Switch: View {
    @ControllableState private var checked: ControllableValue<Bool>
    private let size: SwitchSize
    private let disabled: Bool
    private let name: String?
    private let value: String?
    private let accessibilityLabel: String?

    public init(
        checked: Binding<Bool>? = nil,
        defaultChecked: Bool = false,
        onChange: ((Bool) -> Void)? = nil,
        size: SwitchSize = .md,
        disabled: Bool = false,
        name: String? = nil,
        value: String? = nil,
        accessibilityLabel: String? = nil
    ) {
        self._checked = ControllableState(controlled: checked, defaultValue: defaultChecked, onChange: onChange)
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
        .frame(width: trackWidth, height: trackHeight)
    }

    private var trackWidth: CGFloat {
        switch size {
        case .sm: return 32
        case .md: return 48
        case .lg: return 64
        }
    }

    private var trackHeight: CGFloat {
        switch size {
        case .sm: return 16
        case .md: return 24
        case .lg: return 32
        }
    }
}
// @generated:end
