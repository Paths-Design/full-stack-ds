import XCTest
@testable import DsSwiftUI

/// Pins the Foundation transfer-list derivation against the fixtures the web
/// core is pinned with: options alpha…epsilon, value [delta, alpha].
final class FsdsTransferListTests: XCTestCase {
    private let options = ["alpha", "beta", "gamma", "delta", "epsilon"]
    private let value = ["delta", "alpha"]

    func testAvailableIsTheOptionsOutsideTheValueInOptionsOrder() {
        XCTAssertEqual(FsdsTransferList.available(options: options, value: value), ["beta", "gamma", "epsilon"])
    }

    func testSelectedIsTheValueInTransferOrderWithoutRepeats() {
        XCTAssertEqual(FsdsTransferList.selected(value: ["delta", "alpha", "delta"]), ["delta", "alpha"])
    }

    func testAddingAppendsTheMarkedAvailableItemsInOptionsOrder() {
        XCTAssertEqual(
            FsdsTransferList.adding(["epsilon", "beta"], options: options, value: value),
            ["delta", "alpha", "beta", "epsilon"]
        )
    }

    func testAddingIgnoresAMarkOnAnItemAlreadySelected() {
        XCTAssertNil(FsdsTransferList.adding(["alpha"], options: options, value: value))
    }

    func testRemovingKeepsTheRestInOrder() {
        XCTAssertEqual(FsdsTransferList.removing(["alpha"], value: ["delta", "alpha", "gamma"]), ["delta", "gamma"])
    }

    func testRemovingNothingMarkedChangesNothing() {
        XCTAssertNil(FsdsTransferList.removing([], value: value))
        XCTAssertNil(FsdsTransferList.removing(["beta"], value: value))
    }
}
