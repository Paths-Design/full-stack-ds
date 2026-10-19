import XCTest
import SwiftUI
@testable import DsSwiftUI

final class ControllableValueTests: XCTestCase {
    func testControlledTakesPrecedence() {
        var observed = "controlled"
        let v = ControllableValue<String>(
            controlled: .constant("controlled"), defaultValue: "default",
            onChange: { observed = $0 }
        )
        XCTAssertEqual(v.value, "controlled")
    }

    func testUncontrolledHoldsDefaultAndSetWrites() {
        let v = ControllableValue<String>(defaultValue: "default")
        XCTAssertEqual(v.value, "default")
        v.set("next")
        XCTAssertEqual(v.value, "next")
    }

    func testOnChangeFiresOnEverySet() {
        var seen: [String] = []
        let v = ControllableValue<String>(defaultValue: "a", onChange: { seen.append($0) })
        v.set("b")
        v.set("c")
        XCTAssertEqual(seen, ["b", "c"])
    }

    func testBindingRoundTripsThroughOnChange() {
        var fired = 0
        let v = ControllableValue<Bool>(defaultValue: false, onChange: { _ in fired += 1 })
        let binding = v.binding()
        XCTAssertEqual(binding.wrappedValue, false)
        binding.wrappedValue = true
        XCTAssertTrue(v.value)
        XCTAssertEqual(fired, 1)
    }

    func testControlledSetWritesThroughBinding() {
        var upstream = "old"
        let v = ControllableValue<String>(
            controlled: Binding(get: { upstream }, set: { upstream = $0 }),
            defaultValue: "default"
        )
        v.set("new")
        XCTAssertEqual(upstream, "new")
        XCTAssertEqual(v.value, "new")
    }

    /// A binding holding nil is a controlled empty value (a cleared calendar
    /// selection), not a fall-back to the uncontrolled default.
    func testControlledNilIsAClearedValue() {
        var upstream: Date? = Date(timeIntervalSince1970: 0)
        let v = ControllableValue<Date?>(
            controlled: Binding(get: { upstream }, set: { upstream = $0 }),
            defaultValue: Date(timeIntervalSince1970: 86_400)
        )
        upstream = nil
        XCTAssertNil(v.value)
        v.set(Date(timeIntervalSince1970: 172_800))
        XCTAssertEqual(upstream, Date(timeIntervalSince1970: 172_800))
        upstream = nil
        XCTAssertNil(v.value)
    }

    func testBoolToggle() {
        let v = ControllableValue<Bool>(defaultValue: false)
        v.toggle()
        XCTAssertTrue(v.value)
    }

    /// The view re-binds the channel before each body: reads, writes and the
    /// callback all follow the binding and onChange it passed last.
    func testRebindFollowsTheViewsCurrentBindingAndCallback() {
        var first = "first", second = "second"
        var firstFired: [String] = [], secondFired: [String] = []
        let v = ControllableValue<String>(
            controlled: Binding(get: { first }, set: { first = $0 }),
            defaultValue: "default",
            onChange: { firstFired.append($0) }
        )
        v.rebind(Binding(get: { second }, set: { second = $0 }), onChange: { secondFired.append($0) })
        XCTAssertEqual(v.value, "second")
        v.set("next")
        XCTAssertEqual(second, "next")
        XCTAssertEqual(first, "first")
        XCTAssertEqual(secondFired, ["next"])
        XCTAssertEqual(firstFired, [])
    }

    /// A controlled write announces the change, so the view reading the
    /// channel re-renders even when the binding's source does not publish.
    func testControlledSetPublishes() {
        var upstream = false
        let v = ControllableValue<Bool>(controlled: Binding(get: { upstream }, set: { upstream = $0 }), defaultValue: false)
        var announced = 0
        let subscription = v.objectWillChange.sink { announced += 1 }
        v.set(true)
        XCTAssertEqual(announced, 1)
        XCTAssertTrue(upstream)
        subscription.cancel()
    }

    func testSelectionRebindFollowsTheViewsCurrentBindings() {
        var first = "a", second = "b"
        var fired: [String] = []
        let s = SelectionState(selection: Binding(get: { first }, set: { first = $0 }))
        s.rebind(selection: Binding(get: { second }, set: { second = $0 }), multipleSelection: nil, onSelectionChange: { fired.append("\($0)") })
        XCTAssertTrue(s.isSelected("b"))
        var announced = 0
        let subscription = s.objectWillChange.sink { announced += 1 }
        s.apply("c")
        XCTAssertEqual(second, "c")
        XCTAssertEqual(first, "a")
        XCTAssertEqual(fired, ["c"])
        XCTAssertEqual(announced, 1)
        subscription.cancel()
    }
}
