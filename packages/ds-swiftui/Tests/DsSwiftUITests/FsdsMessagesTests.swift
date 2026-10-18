// Resolution-order tests for the FsdsMessages runtime: overrides beat the
// bundle's FsdsComponents table, the table beats the contract default the
// generated call site bakes in, and `{name}` placeholders follow the
// translator's word order.
import XCTest
@testable import DsSwiftUI

final class FsdsMessagesTests: XCTestCase {
    /// A throwaway bundle directory holding one `FsdsComponents.strings`
    /// table, standing in for a host app's localized resources.
    private func bundle(with table: [String: String]) throws -> Bundle {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("fsds-messages-\(UUID().uuidString).bundle")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let body = table
            .map { "\"\($0.key)\" = \"\($0.value)\";" }
            .joined(separator: "\n")
        try body.write(
            to: root.appendingPathComponent("FsdsComponents.strings"),
            atomically: true,
            encoding: .utf8
        )
        return try XCTUnwrap(Bundle(url: root))
    }

    func testMissingKeyFallsBackToContractDefault() throws {
        let messages = FsdsMessages(bundle: try bundle(with: [:]))
        XCTAssertEqual(
            messages.string("Carousel.nextSlide", default: "Next slide"),
            "Next slide"
        )
    }

    func testBundleTableBeatsContractDefault() throws {
        let messages = FsdsMessages(
            bundle: try bundle(with: ["Carousel.nextSlide": "Diapositive suivante"])
        )
        XCTAssertEqual(
            messages.string("Carousel.nextSlide", default: "Next slide"),
            "Diapositive suivante"
        )
        XCTAssertEqual(
            messages.string("Carousel.previousSlide", default: "Previous slide"),
            "Previous slide",
            "a partial table leaves untranslated keys on their contract default"
        )
    }

    func testOverrideBeatsBundleTable() throws {
        let messages = FsdsMessages(
            bundle: try bundle(with: ["Walkthrough.skip": "Passer"]),
            overrides: ["Walkthrough.skip": "Ignorer"]
        )
        XCTAssertEqual(messages.string("Walkthrough.skip", default: "Skip"), "Ignorer")
    }

    func testTableNamesItsOwnFile() throws {
        let messages = FsdsMessages(
            bundle: try bundle(with: ["Walkthrough.skip": "Passer"]),
            table: "SomeOtherTable"
        )
        XCTAssertEqual(
            messages.string("Walkthrough.skip", default: "Skip"),
            "Skip",
            "lookups read only the configured table"
        )
    }

    func testParamsFollowTranslatorWordOrder() throws {
        let messages = FsdsMessages(
            bundle: try bundle(with: [:]),
            overrides: ["Carousel.slidePosition": "{count} 枚中 {index} 枚目"]
        )
        XCTAssertEqual(
            messages.string(
                "Carousel.slidePosition",
                default: "{index} of {count}",
                params: ["index": "2", "count": "3"]
            ),
            "3 枚中 2 枚目"
        )
    }

    func testDefaultTemplateIsFormattedToo() throws {
        let messages = FsdsMessages(bundle: try bundle(with: [:]))
        XCTAssertEqual(
            messages.string("PageNavigator.pageCount", default: "of {count}", params: ["count": "12"]),
            "of 12"
        )
    }

    func testUnknownPlaceholderStaysVisible() {
        XCTAssertEqual(
            FsdsMessages.format("{index} of {total}", ["index": "1"]),
            "1 of {total}",
            "a translation typo must not silently drop text"
        )
        XCTAssertEqual(FsdsMessages.format("100% {", ["x": "y"]), "100% {", "an unclosed brace is literal")
        XCTAssertEqual(FsdsMessages.format("{a}{a}", ["a": "z"]), "zz", "every occurrence is replaced")
    }
}
