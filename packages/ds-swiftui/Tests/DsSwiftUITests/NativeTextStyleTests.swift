import XCTest
import AppKit
import SwiftUI
@testable import DsSwiftUI

final class NativeTextStyleTests: XCTestCase {
    private let rules: [FsdsNativeTextRule] = [
        .init(part: "root", declarations: [
            .init(property: "text.size.md", value: "1rem", token: "core.type.body"),
            .init(property: "color", value: "#141414", token: "text.foreground"),
            .init(property: "font-size", value: "1rem", token: "text.size.md"),
            .init(property: "font-weight", value: "400"),
        ]),
        .init(part: "root", predicates: [.init(axis: "variant", value: "display")], declarations: [
            .init(property: "text.size.md", value: "3rem", token: "core.type.display"),
            .init(property: "font-weight", value: "700"),
        ]),
    ]

    func testVariantRebindsRootFontSizeAfterPropertyDeclaration() throws {
        let body = try resolveFsdsNativeTextStyle(rules, theme: FsdsTheme(), variants: [:], part: "root")
        let display = try resolveFsdsNativeTextStyle(rules, theme: FsdsTheme(), variants: ["variant": "display"], part: "root")
        XCTAssertEqual(body.fontSize, 16)
        XCTAssertEqual(display.fontSize, 48)
        XCTAssertEqual(display.raw["font-weight"], .string("700"))

        let semanticOverride = try resolveFsdsNativeTextStyle(
            rules,
            theme: FsdsTheme(tokens: ["core.type.display": .string("4rem")]),
            variants: ["variant": "display"], part: "root"
        )
        XCTAssertEqual(semanticOverride.fontSize, 64)
        let slotOverride = try resolveFsdsNativeTextStyle(
            rules,
            theme: FsdsTheme(tokens: ["text.size.md": .string("2rem")]),
            variants: ["variant": "display"], part: "root"
        )
        XCTAssertEqual(slotOverride.fontSize, 32)
    }

    func testPartColorOverridesInheritedRootEvenWhenDeclaredFirst() throws {
        let partFirst = [
            FsdsNativeTextRule(part: "content", declarations: [.init(property: "color", value: "#123456")]),
            FsdsNativeTextRule(part: "root", declarations: [.init(property: "color", value: "#141414")]),
        ]
        let style = try resolveFsdsNativeTextStyle(partFirst, theme: FsdsTheme(), variants: [:], part: "content")
        XCTAssertEqual(style.raw["color"], .string("#123456"))
        XCTAssertNotNil(style.color)
    }

    func testPartTokenDefinitionOverridesInheritedRootRegardlessOfSourceOrder() throws {
        let partFirst = [
            FsdsNativeTextRule(part: "content", declarations: [
                .init(property: "text.size", value: "32px"),
                .init(property: "font-size", value: "16px", token: "text.size"),
            ]),
            FsdsNativeTextRule(part: "root", declarations: [.init(property: "text.size", value: "16px")]),
        ]
        let style = try resolveFsdsNativeTextStyle(partFirst, theme: FsdsTheme(), variants: [:], part: "content")
        XCTAssertEqual(style.fontSize, 32)
    }

    func testGeneratedTextColorRetainsAdaptiveGraphValue() throws {
        let style = try resolveFsdsNativeTextStyle(
            TextNativeTextRules.rules, theme: FsdsTheme(), variants: [:], part: "root"
        )
        XCTAssertEqual(style.raw["color"], .adaptive(light: "#141414", dark: "#fafafa"))

        let info = try resolveFsdsNativeTextStyle(
            AlertNoticeNativeTextRules.rules, theme: FsdsTheme(),
            variants: ["status": "info"], part: "root"
        )
        XCTAssertEqual(info.raw["color"], .adaptive(light: "#013ab0", dark: "#00a9fb"))
    }

    func testRejectsInvalidActiveStyleAndTokenCycles() {
        XCTAssertThrowsError(try resolveFsdsNativeTextStyle(
            rules,
            theme: FsdsTheme(tokens: ["text.size.md": .string("auto")]),
            variants: [:], part: "root"
        )) { error in
            XCTAssertEqual((error as? FsdsNativeTextStyleError)?.code, "FSDS_NATIVE_TEXT_SIZE_UNSUPPORTED")
        }
        let cycle = [FsdsNativeTextRule(part: "root", declarations: [
            .init(property: "text.a", value: "1rem", token: "text.b"),
            .init(property: "text.b", value: "1rem", token: "text.a"),
            .init(property: "font-size", value: "1rem", token: "text.a"),
        ])]
        XCTAssertThrowsError(try resolveFsdsNativeTextStyle(cycle, theme: FsdsTheme(), variants: [:], part: "root")) { error in
            XCTAssertEqual((error as? FsdsNativeTextStyleError)?.code, "FSDS_NATIVE_TEXT_TOKEN_CYCLE")
        }
    }

    @MainActor
    func testGeneratedContentRegionsRenderAuthoredTextSizeOverrides() {
        func width<V: View>(_ view: V) -> CGFloat {
            NSHostingView(rootView: view).fittingSize.width
        }

        let text = DsSwiftUI.Text { SwiftUI.Text("WIDE") }
        let textLarge = text.environment(\.fsdsTheme, FsdsTheme(tokens: ["text.size.md": .string("40px")]))
        XCTAssertGreaterThan(width(textLarge), width(text) + 20)

        let button = FsdsButton(label: { SwiftUI.Text("WIDE") })
        let buttonLarge = button.environment(\.fsdsTheme, FsdsTheme(tokens: ["button.size.fontSize.medium": .string("40px")]))
        XCTAssertGreaterThan(width(buttonLarge), width(button) + 20)

        let badge = Badge(content: { SwiftUI.Text("WIDE") })
        let badgeLarge = badge.environment(\.fsdsTheme, FsdsTheme(tokens: ["badge.size.fontSize": .string("40px")]))
        XCTAssertGreaterThan(width(badgeLarge), width(badge) + 20)

        let alert = AlertNotice(content: { SwiftUI.Text("WIDE") })
        let alertLarge = alert.environment(\.fsdsTheme, FsdsTheme(tokens: ["alert-notice.text.size": .string("40px")]))
        XCTAssertGreaterThan(width(alertLarge), width(alert) + 20)
    }

    @MainActor
    func testGeneratedTextPaintsAdaptiveForegroundInBothAppearances() throws {
        let view = DsSwiftUI.Text(variant: .display) { SwiftUI.Text("MMMM") }

        func hasInk(_ appearance: NSAppearance, expected: (CGFloat, CGFloat, CGFloat)) throws -> Bool {
            let host = NSHostingView(rootView: view)
            host.appearance = appearance
            let size = host.fittingSize
            host.frame = NSRect(origin: .zero, size: size)
            host.layoutSubtreeIfNeeded()
            let bitmap = try XCTUnwrap(host.bitmapImageRepForCachingDisplay(in: host.bounds))
            host.cacheDisplay(in: host.bounds, to: bitmap)
            for y in 0..<bitmap.pixelsHigh {
                for x in 0..<bitmap.pixelsWide {
                    guard let pixel = bitmap.colorAt(x: x, y: y)?.usingColorSpace(.sRGB) else { continue }
                    if abs(pixel.redComponent - expected.0) < 0.03 &&
                        abs(pixel.greenComponent - expected.1) < 0.03 &&
                        abs(pixel.blueComponent - expected.2) < 0.03 {
                        return true
                    }
                }
            }
            return false
        }

        XCTAssertTrue(try hasInk(NSAppearance(named: .aqua)!, expected: (20 / 255, 20 / 255, 20 / 255)))
        XCTAssertTrue(try hasInk(NSAppearance(named: .darkAqua)!, expected: (250 / 255, 250 / 255, 250 / 255)))
    }
}
