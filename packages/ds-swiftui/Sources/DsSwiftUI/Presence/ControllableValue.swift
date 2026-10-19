import SwiftUI
import Combine

// Hand-maintained runtime (alongside FsdsTheme) — NOT generated.
// The single state machine every controllable channel lowers onto:
// controlled Binding takes precedence over the uncontrolled default, and
// every write fires onChange — the React useControllableState rule the
// per-component projections encoded before this substrate existed
// (FEAT-SWIFTUI-PRESENCE-COMPOSITION-01). Generic over the channel's
// value type: presence is ControllableValue<Bool>, a text channel is
// ControllableValue<String>.
//
// ObservableObject (not a State-holding struct): the uncontrolled default
// must drive view re-renders and must work wherever SwiftUI installs it —
// and stay unit-testable headless. Generated views hold it through
// ControllableState (below), which keeps the controlled Binding where
// SwiftUI refreshes it.
public final class ControllableValue<Value>: ObservableObject {
    @Published private var uncontrolled: Value
    private var controlled: Binding<Value>?
    private var onChange: ((Value) -> Void)?

    public init(
        controlled: Binding<Value>? = nil,
        defaultValue: Value,
        onChange: ((Value) -> Void)? = nil
    ) {
        self.controlled = controlled
        self.uncontrolled = defaultValue
        self.onChange = onChange
    }

    public var value: Value {
        controlled?.wrappedValue ?? uncontrolled
    }

    /// Point the channel at the view's current controlled binding and
    /// callback. Not published: it runs while SwiftUI updates the view.
    public func rebind(_ controlled: Binding<Value>?, onChange: ((Value) -> Void)?) {
        self.controlled = controlled
        self.onChange = onChange
    }

    public func set(_ next: Value) {
        if let binding = controlled {
            // The binding lives in this object, not in the view, so nothing
            // else tells SwiftUI the view that reads `value` is stale.
            objectWillChange.send()
            binding.wrappedValue = next
        } else {
            uncontrolled = next
        }
        onChange?(next)
    }

    /// A Binding view of the channel for presenters and controls
    /// (.sheet(isPresented:), Toggle(isOn:), TextField(text:)) — writes
    /// route through set(), so onChange always fires.
    public func binding() -> Binding<Value> {
        Binding(
            get: { self.value },
            set: { self.set($0) }
        )
    }

    /// Toggle for boolean channels.
    public func toggle() where Value == Bool {
        set(!value)
    }
}

/// A view's controllable channel: the ControllableValue state object,
/// re-bound before every body to the view's current controlled Binding
/// and onChange. SwiftUI refreshes a Binding only while a view (or a
/// dynamic property inside one) holds it; a Binding held only by the state
/// object reads the value it had when the view first appeared, so a
/// controlled value set by the component or its parent never re-rendered.
@propertyWrapper
public struct ControllableState<Value>: DynamicProperty {
    @StateObject private var storage: ControllableValue<Value>
    private let controlled: Binding<Value>?
    private let onChange: ((Value) -> Void)?

    public init(controlled: Binding<Value>?, defaultValue: Value, onChange: ((Value) -> Void)? = nil) {
        self.controlled = controlled
        self.onChange = onChange
        _storage = StateObject(wrappedValue: ControllableValue(controlled: controlled, defaultValue: defaultValue, onChange: onChange))
    }

    public var wrappedValue: ControllableValue<Value> { storage }

    public func update() {
        storage.rebind(controlled, onChange: onChange)
    }
}
