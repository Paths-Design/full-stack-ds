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

/// The current values of the compound channels above a view, keyed by channel
/// object so a compound nested inside another does not shadow its channel.
public struct FsdsChannelValues: Equatable {
    fileprivate var values: [ObjectIdentifier: AnyHashable] = [:]
    public init() {}
}

private struct FsdsChannelValuesKey: EnvironmentKey {
    static var defaultValue: FsdsChannelValues { FsdsChannelValues() }
}

extension EnvironmentValues {
    public var fsdsChannelValues: FsdsChannelValues {
        get { self[FsdsChannelValuesKey.self] }
        set { self[FsdsChannelValuesKey.self] = newValue }
    }
}

extension ControllableValue where Value: Hashable {
    /// The value this channel's compound root passed down, or the channel's
    /// own value outside one.
    public func value(in channels: FsdsChannelValues) -> Value {
        channels.values[ObjectIdentifier(self)]?.base as? Value ?? value
    }
}

extension View {
    /// Hands a compound root's channel to its subcomponents: the object for
    /// writes, and its current value through the environment. A value the
    /// parent sets publishes nothing on the object, so a subcomponent that
    /// depends on the object alone keeps showing the old value; one that reads
    /// the environment value re-renders when the root's value changes, in the
    /// same update.
    public func fsdsChannel<Value: Hashable>(_ channel: ControllableValue<Value>) -> some View {
        environmentObject(channel)
            .transformEnvironment(\.fsdsChannelValues) { $0.values[ObjectIdentifier(channel)] = AnyHashable(channel.value) }
    }
}
