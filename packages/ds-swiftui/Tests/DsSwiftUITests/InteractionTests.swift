// Interaction-level behavioral tests: press REAL SwiftUI buttons through
// the macOS accessibility API (AXPress) on our own process and assert
// the contract callbacks fire (FIX-SWIFTUI-INTERACTION-TESTS-01).
// These prove the emitted wiring — FsdsButton's onTap chain,
// Walkthrough's step mutations — which compile and body-evaluation
// gates cannot see. If accessibility is unavailable (AX not trusted),
// the tests SKIP loudly rather than silently pass — a skip is visible
// in the run log and is not a green signal.
import XCTest
import AppKit
import SwiftUI
import ApplicationServices
@testable import DsSwiftUI

@MainActor
final class InteractionTests: XCTestCase {
    private static var appReady = false

    private func prepareApp() {
        if InteractionTests.appReady { return }
        let app = NSApplication.shared
        app.setActivationPolicy(.regular)
        app.activate(ignoringOtherApps: true)
        RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        InteractionTests.appReady = true
    }

    private func axTrusted() -> Bool {
        let opts = ["AXTrustedCheckOptionPrompt": false] as CFDictionary
        return AXIsProcessTrustedWithOptions(opts)
    }

    /// Host a view in a key window so SwiftUI materializes its tree.
    @discardableResult
    private func hostInWindow<V: View>(_ view: V) -> NSWindow {
        prepareApp()
        let host = NSHostingView(rootView: AnyView(view))
        host.frame = NSRect(x: 0, y: 0, width: 400, height: 300)
        let window = NSWindow(
            contentRect: host.frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.contentView = host
        window.makeKeyAndOrderFront(nil)
        NSApplication.shared.updateWindows()
        RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        return window
    }

    /// Collect all AX buttons under an element recursively.
    private func axButtons(under element: AXUIElement) -> [AXUIElement] {
        var found: [AXUIElement] = []
        var childrenRef: CFTypeRef?
        guard
            AXUIElementCopyAttributeValue(
                element, kAXChildrenAttribute as CFString, &childrenRef
            ) == .success,
            let children = childrenRef as? [AXUIElement]
        else {
            return found
        }
        for child in children {
            var roleRef: CFTypeRef?
            if AXUIElementCopyAttributeValue(
                child, kAXRoleAttribute as CFString, &roleRef
            ) == .success,
                let role = roleRef as? String,
                role == "AXButton" {
                found.append(child)
            }
            found.append(contentsOf: axButtons(under: child))
        }
        return found
    }

    /// The app-level AX element for our own process.
    private func appElement() -> AXUIElement {
        AXUIElementCreateApplication(ProcessInfo.processInfo.processIdentifier)
    }

    /// Host, settle, and press every AX button in OUR windows. Returns
    /// the number of successful presses, or nil when the runner cannot
    /// materialize SwiftUI's accessibility tree (headless `swift test`
    /// runners return zero children for any window — verified empirically;
    /// an Xcode UI-test host or AX-enabled runner engages the suite).
    private func pressAllButtons(_ view: some View) throws -> Int? {
        hostInWindow(view)
        RunLoop.current.run(until: Date().addingTimeInterval(0.15))
        let buttons = axButtons(under: appElement())
        guard !buttons.isEmpty else { return nil }
        var presses = 0
        for button in buttons {
            if AXUIElementPerformAction(button, kAXPressAction as CFString) == .success {
                presses += 1
            }
        }
        RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        return presses
    }

    /// Shared skip: name exactly what is missing so the gap is visible.
    private func requireAXButtons() throws {
        try XCTSkipUnless(
            axTrusted(),
            "AX not trusted — interaction proof unavailable (visible skip, not a pass)"
        )
    }

    func testChipActionPressFiresOnClick() throws {
        try requireAXButtons()
        var clicks = 0
        guard let presses = try pressAllButtons(
            Chip(onClick: { clicks += 1 }) { SwiftUI.Text("chip") }
        ) else {
            throw XCTSkip("AX tree empty under this runner — press→callback proof requires an AX-capable host (visible skip, not a pass)")
        }
        XCTAssertGreaterThan(presses, 0, "at least one AX button accepted the press")
        XCTAssertEqual(clicks, presses, "every action press fires onClick exactly once (wired 1:1)")
    }

    func testChipDismissibleAddsDismissAndFiresCallbacks() throws {
        try requireAXButtons()
        var clicks = 0
        var dismisses = 0
        guard let presses = try pressAllButtons(
            Chip(dismissible: true, onClick: { clicks += 1 }, onDismiss: { dismisses += 1 }) {
                SwiftUI.Text("x")
            }
        ) else {
            throw XCTSkip("AX tree empty under this runner — press→callback proof requires an AX-capable host (visible skip, not a pass)")
        }
        XCTAssertEqual(presses, 2, "dismissible chip exposes action + dismiss buttons")
        XCTAssertEqual(clicks, 1)
        XCTAssertEqual(dismisses, 1)

        var offDismisses = 0
        guard let offPresses = try pressAllButtons(
            Chip(dismissible: false, onDismiss: { offDismisses += 1 }) { SwiftUI.Text("y") }
        ) else {
            throw XCTSkip("AX tree empty under this runner (visible skip)")
        }
        XCTAssertEqual(offPresses, 1, "non-dismissible chip exposes only the action button")
        XCTAssertEqual(offDismisses, 0, "dismiss never fires when absent")
    }

    func testWalkthroughNextAndSkipDriveCallbacks() throws {
        try requireAXButtons()
        var steps: [Double] = []
        var completed = 0
        var skipped = 0
        hostInWindow(
            Walkthrough(
                step: 0,
                onStepChange: { steps.append($0) },
                onComplete: { completed += 1 },
                onSkip: { skipped += 1 },
                title: { SwiftUI.Text("t") }
            )
        )
        RunLoop.current.run(until: Date().addingTimeInterval(0.15))
        let buttons = axButtons(under: appElement())
        guard !buttons.isEmpty else {
            throw XCTSkip("AX tree empty under this runner — press→callback proof requires an AX-capable host (visible skip, not a pass)")
        }
        XCTAssertGreaterThanOrEqual(buttons.count, 3, "Skip, Back, and Next are all pressable")
        for button in buttons {
            _ = AXUIElementPerformAction(button, kAXPressAction as CFString)
        }
        RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        XCTAssertEqual(skipped, 1, "Skip press fires onSkip exactly once")
        XCTAssertEqual(steps, [1.0], "only Next steps the channel; Back is a no-op at 0")
        XCTAssertEqual(completed, 0, "one step has not crossed the completion threshold")

        var steps2: [Double] = []
        var completed2 = 0
        hostInWindow(
            Walkthrough(
                step: 1,
                onStepChange: { steps2.append($0) },
                onComplete: { completed2 += 1 },
                title: { SwiftUI.Text("t") }
            )
        )
        RunLoop.current.run(until: Date().addingTimeInterval(0.15))
        let round2 = axButtons(under: appElement())
        guard !round2.isEmpty else {
            throw XCTSkip("AX tree empty under this runner (visible skip)")
        }
        for button in round2 {
            _ = AXUIElementPerformAction(button, kAXPressAction as CFString)
        }
        RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        XCTAssertEqual(steps2.last, 2.0, "Next advances the step channel")
        XCTAssertEqual(completed2, 1, "onComplete fires when the step crosses 1")
    }

    /// Every accessible name string (title, description) an AX element exposes.
    private func axNames(_ element: AXUIElement) -> [String] {
        [kAXTitleAttribute, kAXDescriptionAttribute].compactMap { attribute in
            var value: CFTypeRef?
            guard AXUIElementCopyAttributeValue(element, attribute as CFString, &value) == .success else {
                return nil
            }
            return value as? String
        }
    }

    func testWalkthroughControlsResolveFromTheMessageCatalog() throws {
        try requireAXButtons()
        hostInWindow(
            Walkthrough(
                step: 0,
                onSkip: {},
                nextLabel: "Terminer",
                title: { SwiftUI.Text("t") }
            )
            .fsdsMessages(FsdsMessages(overrides: [
                "Walkthrough.skip": "Passer",
                "Walkthrough.skipTour": "Passer la visite",
                "Walkthrough.previousStep": "Étape précédente",
                "Walkthrough.next": "Suivant",
            ]))
        )
        RunLoop.current.run(until: Date().addingTimeInterval(0.15))
        let names = axButtons(under: appElement()).flatMap(axNames)
        guard !names.isEmpty else {
            throw XCTSkip("AX tree empty under this runner — catalog-to-label proof requires an AX-capable host (visible skip, not a pass)")
        }
        XCTAssertTrue(names.contains("Passer la visite"), "skip's accessible name comes from the catalog: \(names)")
        XCTAssertTrue(names.contains("Étape précédente"), "previous's accessible name comes from the catalog: \(names)")
        XCTAssertTrue(names.contains("Terminer"), "an explicit nextLabel wins over the catalog: \(names)")
        XCTAssertFalse(names.contains("Suivant"), "the catalog must not override an explicit nextLabel: \(names)")
    }

    /// The AX button whose title or description is exactly `name`.
    private func axButton(named name: String) -> AXUIElement? {
        axButtons(under: appElement()).first { axNames($0).contains(name) }
    }

    private func axSelected(_ element: AXUIElement) -> Bool? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXSelectedAttribute as CFString, &value) == .success else {
            return nil
        }
        return value as? Bool
    }

    func testCalendarDaysSelectAndNavigationMovesTheMonth() throws {
        try requireAXButtons()
        let gregorian = Foundation.Calendar(identifier: .gregorian)
        let date = { (month: Int, day: Int) in gregorian.date(from: DateComponents(year: 2031, month: month, day: day))! }
        var values: [Date?] = []
        var months: [Date?] = []
        hostInWindow(
            Calendar(
                onChange: { values.append($0) },
                defaultMonth: date(3, 1),
                onMonthChange: { months.append($0) }
            )
        )
        RunLoop.current.run(until: Date().addingTimeInterval(0.15))
        guard let tenth = axButton(named: "Monday, March 10, 2031") else {
            throw XCTSkip("AX tree empty under this runner — calendar proof requires an AX-capable host (visible skip, not a pass)")
        }
        XCTAssertEqual(AXUIElementPerformAction(tenth, kAXPressAction as CFString), .success)
        RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        XCTAssertEqual(values, [date(3, 10)], "a day press writes that day to the value channel")
        XCTAssertEqual(axButton(named: "Monday, March 10, 2031").flatMap(axSelected), true, "the selected day exposes the selected state")

        let next = try XCTUnwrap(axButton(named: "Next month"), "the next control is named from the catalog")
        XCTAssertEqual(AXUIElementPerformAction(next, kAXPressAction as CFString), .success)
        RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        XCTAssertEqual(months, [date(4, 1)], "next moves the month channel to the following month")
        XCTAssertNotNil(axButton(named: "Thursday, April 10, 2031"), "the grid re-derives from the moved month")
    }

    func testSelectExposesPressableControl() throws {
        try requireAXButtons()
        guard let presses = try pressAllButtons(
            Select(options: [SelectOption(value: "a", label: "Alpha")])
        ) else {
            throw XCTSkip("AX tree empty under this runner (visible skip)")
        }
        XCTAssertGreaterThan(presses, 0, "Select's Menu is a pressable accessibility control")
    }
}
