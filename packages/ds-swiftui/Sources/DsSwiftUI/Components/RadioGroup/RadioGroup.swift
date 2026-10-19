// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum RadioGroupOrientation: String, CaseIterable {
    case vertical
    case horizontal
}
// @generated:end

// @generated:start component
public struct RadioGroupOption {
    public let value: String
    public let label: String
    public let disabled: Bool?
    public let description: String?
    public init(value: String, label: String, disabled: Bool? = nil, description: String? = nil) {
        self.value = value
        self.label = label
        self.disabled = disabled
        self.description = description
    }
}

/// Native single-choice Picker; web form names have no SwiftUI transport meaning.
public struct RadioGroup: View {
    private let options: [RadioGroupOption]
    @ControllableState private var selection: ControllableValue<String>
    private let ariaLabel: String
    private let orientation: RadioGroupOrientation

    public init(options: [RadioGroupOption], value: Binding<String>? = nil, defaultValue: String = "", onChange: ((String) -> Void)? = nil, ariaLabel: String = "", orientation: RadioGroupOrientation = .vertical) {
        self.options = options
        self._selection = ControllableState(controlled: value, defaultValue: defaultValue, onChange: onChange)
        self.ariaLabel = ariaLabel
        self.orientation = orientation
    }

    private var choices: some View {
        SwiftUI.Picker(ariaLabel, selection: selection.binding()) {
            ForEach(options, id: \.value) { item in
                SwiftUI.Text(verbatim: item.label).tag(item.value)
                    .disabled(item.disabled ?? false)
                    .help(item.description ?? "")
            }
        }
        .pickerStyle(.radioGroup)
    }

    public var body: some View {
        if orientation == .horizontal {
            choices.horizontalRadioGroupLayout()
        } else {
            choices
        }
    }
}
// @generated:end
