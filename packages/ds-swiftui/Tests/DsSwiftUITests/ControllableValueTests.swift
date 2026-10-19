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
}
