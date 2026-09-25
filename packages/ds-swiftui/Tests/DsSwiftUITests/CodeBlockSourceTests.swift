import XCTest
import SwiftUI
@testable import DsSwiftUI

final class CodeBlockSourceTests: XCTestCase {
    @MainActor
    func testSuppliedTokensAndLineNumbersPreserveCanonicalSource() {
        let code = "a\r\nb\n"
        let supplied = [
            CodeBlockToken(kind: .keyword, text: "a\r"),
            CodeBlockToken(kind: .string, text: "\nb\n"),
        ]
        let source = fsdsSplitSource(code, tokens: supplied, highlight: true)
        XCTAssertTrue(source.highlighted)
        XCTAssertEqual(source.lines.map { $0.tokens.map(\.text).joined() }, ["a", "b", ""])
        let line = CodeBlockLine(number: 2, showLineNumbers: true) { SwiftUI.Text("b") }
        XCTAssertEqual(line.number, 2)
        XCTAssertTrue(line.showLineNumbers)
        let block = CodeBlock(code: code, tokens: supplied, showLineNumbers: true)
        XCTAssertEqual(block.code, code)
        XCTAssertTrue(block.showLineNumbers)
    }

    @MainActor
    func testInvalidAndDisabledTokensFallBackToPlainSource() {
        let supplied = [CodeBlockToken(kind: .keyword, text: "other")]
        for enabled in [true, false] {
            let source = fsdsSplitSource("actual", tokens: supplied, highlight: enabled)
            XCTAssertFalse(source.highlighted)
            XCTAssertEqual(source.lines.flatMap(\.tokens).map(\.text).joined(), "actual")
        }
    }

    func testBrandOverrideReachesSyntaxAndGutterSlots() {
        let theme = FsdsTheme(tokens: [
            "code-block.token.color.keyword": .string("#112233"),
            "code-block.gutter.color.number": .string("#445566"),
        ])
        let root = resolveFsdsComponentTokens(CodeBlockTokens.scopes, theme)["root"]
        XCTAssertEqual(root?["code-block.token.color.keyword"] ?? nil, .string("#112233"))
        XCTAssertEqual(root?["code-block.gutter.color.number"] ?? nil, .string("#445566"))
    }
}
