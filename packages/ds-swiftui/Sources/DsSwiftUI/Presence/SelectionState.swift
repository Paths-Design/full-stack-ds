import SwiftUI

// Hand-maintained runtime (alongside ControllableValue) — NOT generated.
// The selection semantics substrate: a union (string | string[]) channel
// lowers to single + multi ControllableValue projections behind one
// mode-gated apply — the channelUpdate grammar's replace-vs-
// toggleMembership dispatch, authored by the contract's `multiple` prop
// (FEAT-SWIFTUI-SELECTION-SUBSTRATE-01). No second state machine: both
// halves compose ControllableValue.
public final class SelectionState: ObservableObject {
    @Published private var uncontrolledSingle: String
    @Published private var uncontrolledMulti: [String]
    private var controlledSingle: Binding<String>?
    private var controlledMulti: Binding<[String]>?
    private var onSelectionChange: ((Any) -> Void)?
    let multiple: Bool

    public init(
        selection: Binding<String>? = nil,
        defaultSelection: String = "",
        multipleSelection: Binding<[String]>? = nil,
        defaultMultipleSelection: [String] = [],
        multiple: Bool = false,
        onSelectionChange: ((Any) -> Void)? = nil
    ) {
        self.controlledSingle = selection
        self.uncontrolledSingle = defaultSelection
        self.controlledMulti = multipleSelection
        self.uncontrolledMulti = defaultMultipleSelection
        self.multiple = multiple
        self.onSelectionChange = onSelectionChange
    }

    public var single: String {
        controlledSingle?.wrappedValue ?? uncontrolledSingle
    }

    public var multi: [String] {
        controlledMulti?.wrappedValue ?? uncontrolledMulti
    }

    public func isSelected(_ value: String) -> Bool {
        multiple ? multi.contains(value) : single == value
    }

    /// Point the selection at the view's current controlled bindings and
    /// callback. Not published: it runs while SwiftUI updates the view.
    public func rebind(
        selection: Binding<String>?,
        multipleSelection: Binding<[String]>?,
        onSelectionChange: ((Any) -> Void)?
    ) {
        controlledSingle = selection
        controlledMulti = multipleSelection
        self.onSelectionChange = onSelectionChange
    }

    /// The channelCall lowering target: apply(option.value) from a menu
    /// item action. Dispatches replace (single mode) or toggleMembership
    /// (multi mode) — the contract-authored mode gate.
    public func apply(_ value: String) {
        if multiple {
            var next = multi
            if let index = next.firstIndex(of: value) {
                next.remove(at: index)
            } else {
                next.append(value)
            }
            if let binding = controlledMulti {
                objectWillChange.send()
                binding.wrappedValue = next
            } else {
                uncontrolledMulti = next
            }
            onSelectionChange?(next)
        } else {
            if let binding = controlledSingle {
                objectWillChange.send()
                binding.wrappedValue = value
            } else {
                uncontrolledSingle = value
            }
            onSelectionChange?(value)
        }
    }
}

/// A view's selection channel: the SelectionState object, re-bound before
/// every body to the view's current controlled Bindings and callback, for
/// the reason ControllableState gives.
@propertyWrapper
public struct ControllableSelection: DynamicProperty {
    @StateObject private var storage: SelectionState
    private let selection: Binding<String>?
    private let multipleSelection: Binding<[String]>?
    private let onSelectionChange: ((Any) -> Void)?

    public init(
        selection: Binding<String>? = nil,
        defaultSelection: String = "",
        multipleSelection: Binding<[String]>? = nil,
        defaultMultipleSelection: [String] = [],
        multiple: Bool = false,
        onSelectionChange: ((Any) -> Void)? = nil
    ) {
        self.selection = selection
        self.multipleSelection = multipleSelection
        self.onSelectionChange = onSelectionChange
        _storage = StateObject(wrappedValue: SelectionState(
            selection: selection,
            defaultSelection: defaultSelection,
            multipleSelection: multipleSelection,
            defaultMultipleSelection: defaultMultipleSelection,
            multiple: multiple,
            onSelectionChange: onSelectionChange
        ))
    }

    public var wrappedValue: SelectionState { storage }

    public func update() {
        storage.rebind(selection: selection, multipleSelection: multipleSelection, onSelectionChange: onSelectionChange)
    }
}
