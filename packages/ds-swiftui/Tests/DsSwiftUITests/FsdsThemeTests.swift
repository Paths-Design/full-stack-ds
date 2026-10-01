// Regression tests for the FsdsTheme token runtime. Born from the deduper
// consumption pilot: every fallback-only slot resolved nil because the ??
// chains were assigned directly into optional-Value dictionary subscripts
// (FIX-SWIFTUI-TOKEN-RESOLVER-01). These tests fail against the unfixed
// resolver and pin the staged-assignment behavior.
import Foundation
import XCTest
import SwiftUI
import AppKit
@testable import DsSwiftUI

final class ComposerRadiusTests: XCTestCase {
    @MainActor
    func testGeneratedComposerRejectsUnsupportedRadius() throws {
        if ProcessInfo.processInfo.environment["FSDS_RADIUS_REJECTION_CHILD"] == "1" {
            let card = Card(content: { Color.clear.frame(width: 100, height: 100) })
                .environment(\.fsdsTheme, FsdsTheme(tokens: ["card.size.radius": .string("50%")]))
            let host = NSHostingView(rootView: card)
            host.frame = NSRect(x: 0, y: 0, width: 100, height: 100)
            host.layoutSubtreeIfNeeded()
            return
        }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/xcrun")
        process.arguments = ["xctest", "-XCTest",
            "DsSwiftUITests.ComposerRadiusTests/testGeneratedComposerRejectsUnsupportedRadius",
            Bundle(for: Self.self).bundlePath]
        process.environment = ProcessInfo.processInfo.environment.merging(
            ["FSDS_RADIUS_REJECTION_CHILD": "1"], uniquingKeysWith: { _, child in child })
        let output = Pipe()
        process.standardOutput = output
        process.standardError = output
        try process.run()
        let data = output.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        XCTAssertNotEqual(process.terminationStatus, 0, "The actual composer must reject, not render zero radius")
        XCTAssertTrue(String(decoding: data, as: UTF8.self).contains("FSDS_SWIFTUI_RADIUS_UNSUPPORTED"))
    }

    func testSupportedAbsoluteValuesAndAbsence() throws {
        XCTAssertNil(fsdsRequireRadius(nil, slot: "radius"))
        for (input, expected): (FsdsTokenValue, CGFloat) in [
            (.number(0), 0), (.string("0px"), 0), (.string("20px"), 20),
            (.number(2.5), 2.5), (.string("8"), 8)
        ] {
            XCTAssertEqual(try input.validatedRadius(), expected)
            XCTAssertEqual(fsdsRequireRadius(input, slot: "radius"), expected)
        }
    }

    func testUnsupportedUnitsAndInvalidGeometryAreExplicitErrors() {
        for input: FsdsTokenValue in [
            .string("50%"), .string("2rem"), .string("calc(1px + 2px)"),
            .string("-1px"), .number(-1), .number(.infinity), .number(.nan),
            .adaptive(light: "#ffffff", dark: "#000000")
        ] {
            XCTAssertThrowsError(try input.validatedRadius()) { error in
                XCTAssertTrue(String(describing: error).contains("FSDS_SWIFTUI_RADIUS_UNSUPPORTED"))
            }
        }
    }
}

/// Flatten the double-optional produced by optional-Value dictionary reads.
private func flat(_ value: FsdsTokenValue??) -> FsdsTokenValue? {
    value ?? nil
}

private struct NativeTokenResolverFixture: Decodable {
    let version: Int
    let precedence: [String]
    let cases: [NativeTokenResolverCase]
}

private struct NativeTokenResolverCase: Decodable {
    let id: String
    let name: String
    let ref: String?
    let literal: String?
    let fallback: String?
    let themeByName: String?
    let themeByRef: String?
    let unrelatedTheme: String?
    let expected: String
}

private func loadNativeTokenResolverFixture() throws -> NativeTokenResolverFixture {
    let testsDir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
    let packagesDir = testsDir
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
    let url = packagesDir
        .appendingPathComponent("ds-contracts/fixtures/native-token-resolver.conformance.json")
    return try JSONDecoder().decode(
        NativeTokenResolverFixture.self,
        from: Data(contentsOf: url)
    )
}

final class NativeTokenResolverConformanceTests: XCTestCase {
    func testSharedFixtureAgainstOrdinaryAndLayeredResolvers() throws {
        let fixture = try loadNativeTokenResolverFixture()
        XCTAssertEqual(fixture.version, 1)
        XCTAssertEqual(
            fixture.precedence,
            ["themeByName", "themeByRef", "literal", "fallback"]
        )

        for testCase in fixture.cases {
            let literalBacked = testCase.literal != nil
                && testCase.ref == nil
                && testCase.fallback == nil
            let tokenBacked = testCase.literal == nil
                && testCase.ref != nil
                && testCase.fallback != nil
            XCTAssertTrue(
                literalBacked || tokenBacked,
                "fixture case is not a legal token sidecar shape: \(testCase.id)"
            )

            let definition = FsdsComponentTokenDefinition(
                cssVar: "--fixture",
                name: testCase.name,
                ref: testCase.ref,
                literal: testCase.literal.map(FsdsTokenValue.string),
                fallback: testCase.fallback.map(FsdsTokenValue.string)
            )
            let scopes: FsdsComponentTokenScopes = [
                "root": [testCase.name: definition],
            ]
            var tokens: [String: FsdsTokenValue] = [:]
            if let value = testCase.themeByName {
                tokens[testCase.name] = .string(value)
            }
            if let ref = testCase.ref, let value = testCase.themeByRef {
                tokens[ref] = .string(value)
            }
            if let value = testCase.unrelatedTheme {
                tokens["fixture.unrelated"] = .string(value)
            }
            let theme = FsdsTheme(tokens: tokens)
            let expected = FsdsTokenValue.string(testCase.expected)

            let ordinary = resolveFsdsComponentTokens(scopes, theme)
            XCTAssertEqual(
                flat(ordinary["root"]?[testCase.name]),
                expected,
                "ordinary resolver: \(testCase.id)"
            )
            let layered = resolveFsdsLayeredTokens(scopes, theme, layers: ["root"])
            XCTAssertEqual(
                flat(layered[testCase.name]),
                expected,
                "layered resolver: \(testCase.id)"
            )
        }
    }
}

final class FsdsThemeTests: XCTestCase {
    private func fallbackOnlyScopes() -> FsdsComponentTokenScopes {
        [
            "root": [
                "card.color.background.default": FsdsComponentTokenDefinition(
                    cssVar: "--x", name: "card.color.background.default",
                    fallback: .string("#ffffff")
                ),
                "box-model.padding-block-start": FsdsComponentTokenDefinition(
                    cssVar: "--y", name: "box-model.padding-block-start",
                    fallback: .string("8px")
                ),
                "button.text.weight": FsdsComponentTokenDefinition(
                    cssVar: "--z", name: "button.text.weight",
                    literal: .string("500")
                ),
            ],
        ]
    }

    func testFallbackOnlySlotResolvesToFallback() {
        // The headline pilot defect: a nil literal must not short-circuit
        // the chain before fallback is evaluated.
        let resolved = resolveFsdsComponentTokens(fallbackOnlyScopes(), FsdsTheme())
        XCTAssertEqual(
            flat(resolved["root"]?["card.color.background.default"]),
            .string("#ffffff")
        )
    }

    func testLiteralSlotResolves() {
        let resolved = resolveFsdsComponentTokens(fallbackOnlyScopes(), FsdsTheme())
        XCTAssertEqual(flat(resolved["root"]?["button.text.weight"]), .string("500"))
    }

    func testThemeOverrideWins() {
        let theme = FsdsTheme(tokens: ["card.color.background.default": .string("#0000ff")])
        let resolved = resolveFsdsComponentTokens(fallbackOnlyScopes(), theme)
        XCTAssertEqual(
            flat(resolved["root"]?["card.color.background.default"]),
            .string("#0000ff")
        )
    }

    func testLayeredResolutionAppliesVariantOverRoot() {
        let scopes: FsdsComponentTokenScopes = [
            "root": [
                "bg": FsdsComponentTokenDefinition(
                    cssVar: "--r", name: "bg", fallback: .string("#ffffff")
                ),
            ],
            "variant_destructive": [
                "bg": FsdsComponentTokenDefinition(
                    cssVar: "--d", name: "bg", fallback: .string("#d92d2e")
                ),
            ],
        ]
        let base = resolveFsdsLayeredTokens(scopes, FsdsTheme(), layers: ["root"])
        let layered = resolveFsdsLayeredTokens(
            scopes, FsdsTheme(), layers: ["root", "variant_destructive"]
        )
        XCTAssertEqual(flat(base["bg"]), .string("#ffffff"))
        XCTAssertEqual(flat(layered["bg"]), .string("#d92d2e"))
    }

    func testValueAccessorsParsePxAndHex() {
        XCTAssertEqual(FsdsTokenValue.string("8px").px, 8)
        XCTAssertEqual(FsdsTokenValue.string("9999px").px, 9999)
        XCTAssertNotNil(FsdsTokenValue.string("#ffffff").color)
        XCTAssertNil(FsdsTokenValue.string("1rem").px)
        XCTAssertNil(FsdsTokenValue.string("cubic-bezier(0.4, 0, 0.2, 1)").color)
    }

    func testAbsentSlotAndMissingLayerStayUnresolved() {
        let resolved = resolveFsdsComponentTokens(fallbackOnlyScopes(), FsdsTheme())
        XCTAssertNil(flat(resolved["root"]?["not-a-slot"]))
        let layered = resolveFsdsLayeredTokens(
            fallbackOnlyScopes(), FsdsTheme(), layers: ["root", "missing-layer"]
        )
        XCTAssertEqual(flat(layered["box-model.padding-block-start"]), .string("8px"))
    }
}

final class FsdsAdaptiveColorTests: XCTestCase {
    func testAdaptivePickResolvesDarkUnderDarkAquaAndLightOtherwise() {
        // Headless decision-logic coverage; per-appearance rendering is
        // verified visually through the deduper pilot's SettingsPreview.
        let light = NSColor.red
        let dark = NSColor.blue
        XCTAssertEqual(
            FsdsTokenValue.adaptivePick(
                appearance: NSAppearance(named: .aqua)!, light: light, dark: dark
            ),
            light
        )
        XCTAssertEqual(
            FsdsTokenValue.adaptivePick(
                appearance: NSAppearance(named: .darkAqua)!, light: light, dark: dark
            ),
            dark
        )
    }

    func testAdaptivePxIsNilAndStringColorStillParses() {
        XCTAssertNil(FsdsTokenValue.adaptive(light: "#ffffff", dark: "#000000").px)
        XCTAssertNotNil(FsdsTokenValue.string("#ffffff").color)
        XCTAssertNil(FsdsTokenValue.adaptive(light: "not-hex", dark: "#000000").color)
    }
}

// FEAT-SWIFTUI-TOKEN-CARRIER-PARITY-01: the ref arm. Without it, a
// semantic-keyed theme table can never reach component slots — only
// slot-name-keyed overrides could — and swift theming would silently
// diverge from the RN/Compose carriers.
final class FsdsTokenRefResolutionTests: XCTestCase {
    private let scopes: FsdsComponentTokenScopes = [
        "root": [
            "switch.color.track.background": FsdsComponentTokenDefinition(
                cssVar: "--fsds-switch-color-track-background",
                name: "switch.color.track.background",
                ref: "semantic.color.background.tertiary",
                fallback: .string("#b8b8b8")
            ),
        ],
    ]

    func testSemanticRefOverrideReachesSlotAndBeatsFallback() {
        let theme = FsdsTheme(tokens: ["semantic.color.background.tertiary": .string("#123456")])
        let resolved = resolveFsdsComponentTokens(scopes, theme)["root"]?["switch.color.track.background"] ?? nil
        XCTAssertEqual(resolved, .string("#123456"))
    }

    func testSlotNameOverrideStillBeatsRefOverride() {
        let theme = FsdsTheme(tokens: [
            "switch.color.track.background": .string("#aaaaaa"),
            "semantic.color.background.tertiary": .string("#123456"),
        ])
        let resolved = resolveFsdsComponentTokens(scopes, theme)["root"]?["switch.color.track.background"] ?? nil
        XCTAssertEqual(resolved, .string("#aaaaaa"))
    }

    func testNoOverridesFallsBackToAuthoredFallback() {
        let resolved = resolveFsdsComponentTokens(scopes, FsdsTheme())["root"]?["switch.color.track.background"] ?? nil
        XCTAssertEqual(resolved, .string("#b8b8b8"))
    }

    func testUnrelatedRefKeyDoesNotLeakIntoSlot() {
        let theme = FsdsTheme(tokens: ["semantic.color.unrelated": .string("#ffff00")])
        let resolved = resolveFsdsComponentTokens(scopes, theme)["root"]?["switch.color.track.background"] ?? nil
        XCTAssertEqual(resolved, .string("#b8b8b8"))
    }
}

// FEAT-SWIFTUI-SEMANTIC-DEFAULTS-01: the defaults table is proven against
// the committed graph EXHAUSTIVELY (every entry, not a sample), and a real
// component slot is proven to reach the graph value through the ref arm.
final class FsdsSemanticDefaultsTests: XCTestCase {
    private func loadGraph(file: StaticString = #filePath) throws -> [String: Any] {
        let testsDir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        let packageRoot = testsDir.deletingLastPathComponent().deletingLastPathComponent()
        let url = packageRoot.deletingLastPathComponent()
            .appendingPathComponent("ds-tokens/generated/resolved.tokens.json")
        let data = try Data(contentsOf: url)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    /// Raw `$value` node — a scalar or a mode-bearing {light, dark} dict.
    private func graphRawValue(_ dotted: String, graph: [String: Any]) throws -> Any {
        var node: Any = graph
        for segment in dotted.split(separator: ".") {
            node = try XCTUnwrap((node as? [String: Any])?[String(segment)], "missing segment '\(segment)' in \(dotted)")
        }
        let dict = try XCTUnwrap(node as? [String: Any], "\(dotted) is not a group")
        return try XCTUnwrap(dict["$value"], "\(dotted) has no $value")
    }

    /// The light-mode string of a `$value`, whichever shape it takes.
    private func graphLightString(_ dotted: String, graph: [String: Any]) throws -> String {
        let raw = try graphRawValue(dotted, graph: graph)
        if let s = raw as? String { return s }
        if let modes = raw as? [String: Any] {
            return try XCTUnwrap(modes["light"] as? String, "\(dotted) has no light half")
        }
        return String(describing: raw)
    }

    func testEveryDefaultsEntryEqualsItsGraphValue() throws {
        let graph = try loadGraph()
        // Completeness (the table equals the graph-derived ref set, with no
        // missing entries) is enforced by the `swiftui:semantic-defaults:check`
        // drift gate in CI — this test only proves every present entry matches
        // the committed graph. The count is a generated function of the Swift
        // corpus refs, so it is intentionally not pinned here.
        XCTAssertFalse(FsdsSemanticDefaults.light.isEmpty, "semantic-defaults table must not be empty")
        for (ref, token) in FsdsSemanticDefaults.light {
            let raw = try graphRawValue(ref, graph: graph)
            switch token {
            case .string(let value):
                if let s = raw as? String {
                    XCTAssertEqual(value, s, "table drift for \(ref)")
                } else if let modes = raw as? [String: Any], let light = modes["light"] as? String {
                    XCTAssertEqual(value, light, "scalar table entry vs mode-bearing graph token \(ref)")
                } else {
                    XCTFail("shape mismatch for \(ref)")
                }
            case .adaptive(let light, let dark):
                let modes = try XCTUnwrap(raw as? [String: Any], "adaptive entry for scalar graph token \(ref)")
                XCTAssertEqual(light, modes["light"] as? String, "light drift for \(ref)")
                XCTAssertEqual(dark, modes["dark"] as? String, "dark drift for \(ref)")
            case .number(let value):
                if let n = raw as? Double {
                    XCTAssertEqual(value, n, "number drift for \(ref)")
                } else if let n = raw as? Int {
                    XCTAssertEqual(value, Double(n), "number drift for \(ref)")
                } else if let s = raw as? String, let n = Double(s) {
                    XCTAssertEqual(value, n, "number drift for \(ref)")
                } else {
                    XCTFail("shape mismatch for \(ref)")
                }
            }
        }
    }

    func testComponentSlotReachesGraphValueThroughRefArm() throws {
        // Card's default background slot refs semantic.color.background.primary;
        // with the defaults theme installed, resolution must return the graph
        // value through the ref arm. (Sidecar fallbacks mirror graph values by
        // design; the decisive arm-order proof lives in the ref-arm tests above.)
        let theme = FsdsTheme(tokens: FsdsSemanticDefaults.light)
        let resolved = resolveFsdsComponentTokens(CardTokens.scopes, theme)
        let slot = resolved["root"]?["card.color.background.default"] ?? nil
        let expectedLight = try graphLightString("semantic.color.background.primary", graph: try loadGraph())
        let slotLight: String
        switch slot {
        case .some(.string(let s)): slotLight = s
        case .some(.adaptive(let l, _)): slotLight = l
        default: XCTFail("slot resolved nil or non-color"); return
        }
        XCTAssertEqual(slotLight, expectedLight)
    }

    func testDefaultsThemeStillYieldsToSlotNameOverride() {
        var tokens = FsdsSemanticDefaults.light
        tokens["card.color.background.default"] = .string("#000001")
        let resolved = resolveFsdsComponentTokens(CardTokens.scopes, FsdsTheme(tokens: tokens))
        XCTAssertEqual(
            resolved["root"]?["card.color.background.default"] ?? nil,
            .string("#000001")
        )
    }
}
