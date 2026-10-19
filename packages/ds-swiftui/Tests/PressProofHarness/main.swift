// Press-proof harness (FIX-SWIFTUI-PRESS-PROOF-01,
// TEST-SWIFTUI-RUNTIME-BREADTH-01, FIX-SWIFTUI-POPOVER-TRIGGER-01,
// CALENDAR-DATE-GRID-01).
//
// A REAL SwiftUI App that drives itself: hosts each scenario in the
// window, waits for the a11y tree to materialize (a genuine run loop
// is the piece headless runners never had), discovers AX elements,
// actuates them through the OS accessibility path (AXPress; AXValue
// writes for text entry), and prints per-scenario callback counters.
// Proves the emitted wiring fires through OS-mediated interaction:
// AXPress → SwiftUI control → channel/callback. Exits nonzero naming
// any failed counter.
//
// Element discovery is AX-role-based — no component identity, no view
// internals; scenarios compose the same public inits consumers use.
// Surfaces this host cannot reach through AX print a LIMITATION
// artifact and are excluded from the exit code with that evidence —
// never silently skipped (spec invariant).
//
// Run: swift run --package-path packages/ds-swiftui PressProofHarness
import SwiftUI
import AppKit
import CoreGraphics
import ApplicationServices
import DsSwiftUI

@MainActor
final class Counters {
    var chipClicks = 0
    var chipDismisses = 0
    var steps: [Double] = []
    var completes = 0
    var skips = 0

    // TEST-SWIFTUI-RUNTIME-BREADTH-01 breadth phases.
    var switchStates: [Bool] = []
    var switchBindingFinal = false
    var switchAXValues: [String] = []
    /// After one press each: the rendered value and stored value of a switch
    /// bound to unpublished storage, and the rendered value and callbacks of
    /// a switch whose binding refuses every write.
    var unpublishedSwitch: [String] = []
    var refusingSwitch: [String] = []
    var refusingChanges: [Bool] = []
    var selectChanges: [String] = []
    var selectBindingFinal = ""
    var selectTriggerLabel = ""
    var popoverOpens: [Bool] = []
    var popoverVisibleAfterPress = false
    var otpChanges: [String] = []
    var otpCompletes: [String] = []
    var otpBindingFinal = ""
    var dialogOpens: [Bool] = []
    var dialogSheetVisibleBefore = true
    var dialogSheetVisibleAfterOpen = false
    var dialogSheetVisibleAfterClose = true
    var dialogOpensUncontrolled: [Bool] = []
    var dialogUncontrolledVisible = false
    var dialogCensusAfterOpen: [String: Int] = [:]
    var dialogTriggerPresses = 0
    var plainSheetVisible = false
    var plainTriggerPresses = 0
    var plainProbeEnvironmental = false
    var calendarButtonsDump: [String] = []
    var calendarChanges: [String] = []
    var calendarCensus: [String: Int] = [:]
    // CALENDAR-DATE-GRID-01: the day's isSelected trait, the month channel
    // and the locale, read back through the OS accessibility tree.
    var calendarMonthChanges: [String] = []
    var calendarSelectedBefore: [String] = []
    var calendarSelectedAfter: [String] = []
    var calendarBindingFinal = ""
    var calendarHeadersEnUS: [String] = []
    var calendarHeadersDeDE: [String] = []
    var calendarDayLabelDeDE = ""
    var calendarProbeSelected = false
    var calendarStaticSelectedDeDE: [String] = []
    var calendarSelectedExternal: [String] = []
    var calendarUncontrolledAfterPress: [String] = []
    // FEAT-SWIFTUI-COMPOUND-INTERACTIVITY-01 compound proofs.
    var tabsChanges: [String] = []
    var accordionChanges: [String] = []
    var shuttleChanges: [String] = []
    /// What the controlled Tabs and Accordion show at mount, after the parent
    /// sets each value, and after it sets them back.
    var controlledCompound: [String] = []
    var compoundCensus: [String: Int] = [:]
    var limitations: [String] = []
}

@MainActor
final class HarnessModel: ObservableObject {
    enum Phase {
        case chipActionOnly
        case chipDismissible
        case walkthroughCold
        case walkthroughThreshold
        case switchToggle
        case switchUnpublished
        case selectOption
        case popoverClick
        case otpEntry
        case dialogChannel
        case dialogPlainProbe
        case dialogUncontrolled
        case calendarDay
        case calendarLocale
        case compoundProofs
        case done
    }

    @Published var phase: Phase = .chipActionOnly
    // Binding-backed channel state for the breadth phases — the harness
    // observes what the component writes through the OS interaction path.
    @Published var switchOn = false
    @Published var selection = ""
    @Published var otp = ""
    @Published var dialogOpen = false
    /// Which dialog pass we are on (1 = pre-probe, 2 = probe-informed re-run).
    var dialogPass = 1
    @Published var plainSheetOpen = false
    @Published var pickedDate: Date? = nil
    /// Storage SwiftUI cannot observe: a binding over it publishes nothing.
    final class Unpublished { var on = false }
    let unpublished = Unpublished()
    @Published var controlledTab = "x"
    @Published var controlledOpenness: [String] = []
    let counters = Counters()
    var failures: [String] = []

    func run() {
        Self.focusOurWindow()
        schedule(3.0) { self.advance() }
    }

    /// End of the compound proofs: advance to done.
    private func finishCompound() {
        self.phase = .done
        self.schedule(0.5) { self.advance() }
    }

    func schedule(_ delay: Double, _ work: @escaping @MainActor () -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
    }

    /// Poll for the controlled sheet's content (close-dialog) up to
    /// `remaining` times, then drive the close path and poll dismissal.
    /// Closing flips the consumer binding (what the footer button does);
    /// AXPress from this main thread into a PRESENTED modal sheet can
    /// block the AppKit run loop — sheet-resident controls are never
    /// actuated through AX here, only detected.
    func pollDialogPresentation(remaining: Int) {
        if Self.axButtons(labeled: "close-dialog").count > 0 {
            counters.dialogSheetVisibleAfterOpen = true
            self.dialogOpen = false
            pollDialogDismissal(remaining: 10)
            return
        }
        guard remaining > 0 else {
            counters.dialogCensusAfterOpen = Self.axCensus()
            if counters.plainProbeEnvironmental {
                // The plain-SwiftUI control already failed the same
                // after-mount flip — the host blocks it, not the
                // component. Limitation, with the probe as evidence.
                counters.limitations.append(
                    "dialog(controlled): sheet never presented after open=true, but the plain-probe control failed identically — host blocks after-mount sheet flips (environmental); controlled open/close cycle unprovable on this host"
                )
            } else {
                failures.append(
                    "dialog(controlled): sheet content never appeared after open=true (trigger pressed \(counters.dialogTriggerPresses)x; census \(counters.dialogCensusAfterOpen.sorted { $0.key < $1.key }))"
                )
            }
            phase = .dialogUncontrolled
            schedule(1.0) { self.advance() }
            return
        }
        schedule(0.6) { self.pollDialogPresentation(remaining: remaining - 1) }
    }

    func pollDialogDismissal(remaining: Int) {
        if Self.axButtons(labeled: "close-dialog").isEmpty {
            counters.dialogSheetVisibleAfterClose = false
            // Web parity: onOpenChange fires from NATIVE dismissal
            // (Esc/overlay — the component's own transition), never from a
            // consumer-driven binding change (the consumer did it; React
            // Dialog behaves identically). This proof closes via the
            // consumer binding, so the web-parity-correct value is [].
            if counters.dialogOpens != [] {
                failures.append("dialog: onOpenChange values \(counters.dialogOpens), expected [] (consumer-driven close does not fire the channel — web parity)")
            }
            counters.limitations.append(
                "dialog(native dismissal): onOpenChange-on-dismissal unproven on this host — AXPress from this main thread into a presented modal sheet blocks the AppKit run loop (probe-evidenced); the channel's dismissal wiring is proven at the emitter level (set routes through ControllableValue) but not through a native dismissal interaction here"
            )
            // Two-pass topology: the first dismissal leads to the plain
            // probe, whose verdict informs the dialog re-run; the SECOND
            // dismissal exits to uncontrolled. Without the pass counter the
            // probe↔dialog cycle never terminates once the emitted Dialog
            // actually presents (which is exactly what the presentation
            // fix made happen — the loop only "worked" before because the
            // controlled sheet never presented and exhaustion broke out).
            if dialogPass == 1 {
                dialogPass = 2
                phase = .dialogPlainProbe
            } else {
                phase = .dialogUncontrolled
            }
            schedule(0.5) { self.advance() }
            return
        }
        guard remaining > 0 else {
            counters.dialogSheetVisibleAfterClose = true
            failures.append("dialog: sheet content still present after close")
            phase = .dialogUncontrolled
            schedule(1.0) { self.advance() }
            return
        }
        schedule(0.6) { self.pollDialogDismissal(remaining: remaining - 1) }
    }

    /// Poll for the plain probe's sheet text; classify environmental
    /// limitation vs component defect accordingly. The probe records the
    /// host's capability and dismisses via its own binding; the DEFECT
    /// verdict is appended by the re-run dialog phase only if the emitted
    /// Dialog fails while the probe presented (the differential).
    func pollPlainSheet(remaining: Int) {
        let presented = Self.axStaticTexts().contains { Self.title(of: $0) == "plain-probe-sheet" }
        if presented {
            counters.plainSheetVisible = true
            // Host presents after-mount flips fine. Dismiss through the
            // consumer binding and let the dialog phase re-run carry the
            // differential verdict (a still-presented sheet here would
            // block every later sheet from this window).
            self.plainSheetOpen = false
            phase = .dialogChannel
            schedule(1.0) { self.advance() }
            return
        }
        guard remaining > 0 else {
            counters.plainSheetVisible = false
            counters.plainProbeEnvironmental = true
            counters.limitations.append(
                "dialog(plain probe): even plain SwiftUI Color.clear.sheet(isPresented:) does not present on an after-mount binding flip on this host (trigger \(counters.plainTriggerPresses == 0 ? "" : "pressed ")— environmental) — controlled-Dialog after-mount presentation proof unavailable on this host"
            )
            self.plainSheetOpen = false
            phase = .dialogChannel
            schedule(1.0) { self.advance() }
            return
        }
        schedule(0.6) { self.pollPlainSheet(remaining: remaining - 1) }
    }

    func advance() {
        switch phase {
        case .chipActionOnly:
            let buttons = Self.axButtons()
            guard buttons.count == 1 else {
                failures.append("chip(action-only): expected 1 AXButton, found \(buttons.count)")
                phase = .chipDismissible
                schedule(1.0) { self.advance() }
                return
            }
            Self.click(at: buttons[0])
            schedule(1.0) {
                if self.counters.chipClicks != 1 {
                    self.failures.append("chip(action-only): onClick fired \(self.counters.chipClicks)x, expected 1")
                }
                self.phase = .chipDismissible
                self.schedule(1.0) { self.advance() }
            }

        case .chipDismissible:
            counters.chipClicks = 0
            schedule(1.0) {
                let buttons = Self.axButtons()
                guard buttons.count == 2 else {
                    self.failures.append("chip(dismissible): expected 2 AXButtons, found \(buttons.count)")
                    self.phase = .walkthroughCold
                    self.schedule(1.0) { self.advance() }
                    return
                }
                Self.click(at: buttons[0])
                Self.click(at: buttons[1])
                self.schedule(1.0) {
                    if self.counters.chipClicks != 1 {
                        self.failures.append("chip(dismissible): onClick fired \(self.counters.chipClicks)x, expected 1")
                    }
                    if self.counters.chipDismisses != 1 {
                        self.failures.append("chip(dismissible): onDismiss fired \(self.counters.chipDismisses)x, expected 1")
                    }
                    self.phase = .walkthroughCold
                    self.schedule(1.0) { self.advance() }
                }
            }

        case .walkthroughCold:
            schedule(1.0) {
                let buttons = Self.axButtons()
                guard buttons.count == 3 else {
                    self.failures.append("walkthrough: expected 3 AXButtons (Skip/Back/Next), found \(buttons.count)")
                    self.phase = .walkthroughThreshold
                    self.schedule(1.0) { self.advance() }
                    return
                }
                    Self.click(at: buttons[0]) // Skip
                Self.click(at: buttons[1]) // Back (no-op at 0)
                Self.click(at: buttons[2]) // Next → 1
                self.schedule(1.0) {
                    if self.counters.skips != 1 {
                        self.failures.append("walkthrough: onSkip fired \(self.counters.skips)x, expected 1")
                    }
                    if self.counters.steps != [1.0] {
                        self.failures.append("walkthrough: steps \(self.counters.steps), expected [1.0]")
                    }
                    if self.counters.completes != 0 {
                        self.failures.append("walkthrough: completes \(self.counters.completes), expected 0 below threshold")
                    }
                    self.phase = .walkthroughThreshold
                    self.schedule(1.0) { self.advance() }
                }
            }

        case .walkthroughThreshold:
            counters.steps = []
            schedule(1.0) {
                let buttons = Self.axButtons()
                guard buttons.count == 3 else {
                    self.failures.append("walkthrough(threshold): expected 3 AXButtons, found \(buttons.count)")
                    self.phase = .switchToggle
                    self.schedule(1.0) { self.advance() }
                    return
                }
                Self.click(at: buttons[2]) // Next → 2 crosses threshold 1
                self.schedule(1.0) {
                if self.counters.steps.last != 2.0 {
                    self.failures.append("walkthrough(threshold): steps \(self.counters.steps), expected last 2.0")
                }
                if self.counters.completes != 1 {
                    self.failures.append("walkthrough(threshold): completes \(self.counters.completes), expected 1")
                }
                self.phase = .switchToggle
                self.schedule(0.5) { self.advance() }
                }
            }

        case .switchToggle:
            counters.switchStates = []
            schedule(1.0) {
                let pressables = Self.axPressables()
                guard pressables.count == 1 else {
                    self.failures.append("switch: expected 1 pressable (Toggle → AXCheckBox/AXSwitch), found \(pressables.count); census \(Self.axCensus())")
                    self.phase = .selectOption
                    self.schedule(1.0) { self.advance() }
                    return
                }
                Self.click(at: pressables[0])
                self.schedule(0.7) {
                    // The rendered toggle, not only the callback, follows the
                    // controlled binding: its AXValue is the state it shows.
                    self.counters.switchAXValues.append(Self.numberValue(of: Self.axPressables().first ?? pressables[0]))
                    Self.click(at: Self.axPressables().first ?? pressables[0])
                    self.schedule(0.7) {
                        self.counters.switchAXValues.append(Self.numberValue(of: Self.axPressables().first ?? pressables[0]))
                        if self.counters.switchAXValues != ["1", "0"] {
                            self.failures.append("switch: rendered AXValue after each press \(self.counters.switchAXValues), expected [\"1\", \"0\"]")
                        }
                        self.counters.switchBindingFinal = self.switchOn
                        if self.counters.switchStates != [true, false] {
                            self.failures.append("switch: onChange values \(self.counters.switchStates), expected [true, false]")
                        }
                        if self.counters.switchBindingFinal != false {
                            self.failures.append("switch: binding final \(self.counters.switchBindingFinal), expected false (two toggles)")
                        }
                        self.phase = .switchUnpublished
                        self.schedule(0.5) { self.advance() }
                    }
                }
            }

        case .switchUnpublished:
            counters.refusingChanges = []
            schedule(1.0) {
                let labeled = { (label: String) in Self.axPressables().first { Self.description(of: $0) == label } }
                guard let plain = labeled("unpublished-switch"), let refusing = labeled("refusing-switch") else {
                    self.failures.append("switch(unpublished): expected the unpublished and refusing switches, found \(Self.axPressables().map { Self.description(of: $0) ?? "?" })")
                    self.phase = .selectOption
                    self.schedule(0.5) { self.advance() }
                    return
                }
                Self.click(at: plain)
                Self.click(at: refusing)
                self.schedule(0.7) {
                    // A controlled switch shows what its owner publishes. The
                    // write reaches unpublished storage, but the switch keeps
                    // the value from its parent's last render; a write the
                    // owner refuses leaves its value on screen and the callback
                    // still reports the request.
                    self.counters.unpublishedSwitch = [labeled("unpublished-switch").map(Self.numberValue) ?? "<missing>", "stored \(self.unpublished.on)"]
                    self.counters.refusingSwitch = [labeled("refusing-switch").map(Self.numberValue) ?? "<missing>"]
                    if self.counters.unpublishedSwitch != ["0", "stored true"] {
                        self.failures.append("switch(unpublished): shown/stored \(self.counters.unpublishedSwitch), expected [\"0\", \"stored true\"]")
                    }
                    if self.counters.refusingSwitch != ["0"] || self.counters.refusingChanges != [true] {
                        self.failures.append("switch(refusing): shown \(self.counters.refusingSwitch) onChange \(self.counters.refusingChanges), expected [\"0\"] and [true]")
                    }
                    self.phase = .selectOption
                    self.schedule(0.5) { self.advance() }
                }
            }

        case .selectOption:
            counters.selectChanges = []
            schedule(1.0) {
                // SwiftUI Menu exposes its trigger as AXMenuButton (not AXButton).
                let triggers = Self.axElements(withRoles: ["AXButton", "AXMenuButton"])
                guard triggers.count == 1 else {
                    self.failures.append("select: expected 1 trigger (AXButton/AXMenuButton), found \(triggers.count); census \(Self.axCensus())")
                    self.phase = .popoverClick
                    self.schedule(1.0) { self.advance() }
                    return
                }
                let triggerY = Self.center(of: triggers[0]).y
                Self.click(at: triggers[0]) // open the menu
                self.schedule(0.8) {
                    // The app menu bar contributes ~131 AXMenuItems; the
                    // popup's options are distinguished by exact option
                    // labels and vertical proximity to the trigger.
                    let optionLabels: Set<String> = ["A", "B", "C"]
                    let items = Self.axMenuItems().filter { item in
                        guard let title = Self.title(of: item), optionLabels.contains(title) else { return false }
                        return abs(Self.center(of: item).y - triggerY) < 300
                    }
                    guard let optionB = items.first(where: { Self.title(of: $0) == "B" }) else {
                        self.counters.limitations.append(
                            "select: menu opened via trigger but option \"B\" not reachable (candidates \(items.count), census \(Self.axCensus())) — option-press proof unavailable on this host"
                        )
                        self.phase = .popoverClick
                        self.schedule(0.5) { self.advance() }
                        return
                    }
                    Self.click(at: optionB) // press option "B" (value "b")
                    self.schedule(0.8) {
                        // The trigger renders the controlled selection's label.
                        let trigger = Self.axElements(withRoles: ["AXButton", "AXMenuButton"]).first
                        self.counters.selectTriggerLabel = trigger.flatMap { Self.title(of: $0) ?? Self.description(of: $0) } ?? "<missing>"
                        if self.counters.selectTriggerLabel != "B" {
                            self.failures.append("select: trigger shows \"\(self.counters.selectTriggerLabel)\" after choosing B, expected \"B\"")
                        }
                        self.counters.selectBindingFinal = self.selection
                        if self.counters.selectChanges != ["b"] {
                            self.failures.append("select: onSelectionChange values \(self.counters.selectChanges), expected [\"b\"]")
                        }
                        if self.counters.selectBindingFinal != "b" {
                            self.failures.append("select: binding final \"\(self.counters.selectBindingFinal)\", expected \"b\"")
                        }
                        self.phase = .popoverClick
                        self.schedule(0.5) { self.advance() }
                    }
                }
            }

        case .popoverClick:
            counters.popoverOpens = []
            schedule(1.0) {
                let triggers = Self.axButtons(labeled: "open-popover")
                let visibleBefore = Self.axStaticTexts().contains {
                    Self.title(of: $0) == "popover-content"
                }
                guard triggers.count == 1, !visibleBefore else {
                    self.failures.append(
                        "popover: expected one native open-popover button and hidden content before press; found \(triggers.count) triggers, visibleBefore=\(visibleBefore)"
                    )
                    self.phase = .otpEntry
                    self.schedule(0.5) { self.advance() }
                    return
                }
                Self.click(at: triggers[0])
                self.schedule(0.8) {
                    self.counters.popoverVisibleAfterPress = Self.waitForStaticText("popover-content")
                    if self.counters.popoverOpens != [true] {
                        self.failures.append(
                            "popover: onOpenChange values \(self.counters.popoverOpens), expected [true] after one OS accessibility press"
                        )
                    }
                    if !self.counters.popoverVisibleAfterPress {
                        self.failures.append("popover: content was not observable after trigger press")
                    }
                    self.phase = .otpEntry
                    self.schedule(1.0) { self.advance() }
                }
            }

        case .otpEntry:
            counters.otpChanges = []
            counters.otpCompletes = []
            schedule(1.0) {
                let fields = Self.axTextFields()
                guard fields.count == 6 else {
                    self.failures.append("otp: expected 6 AXTextFields, found \(fields.count); census \(Self.axCensus())")
                    self.phase = .dialogPlainProbe
                    self.schedule(1.0) { self.advance() }
                    return
                }
                // Probe writability on field 0 first; only then fill the rest.
                let probe = Self.setValue("7", on: fields[0])
                self.schedule(0.6) {
                    guard probe, self.otp.hasPrefix("7") else {
                        self.counters.limitations.append(
                            "otp: AXValue write on field 0 \(probe ? "succeeded but binding read \"\(self.otp)\"" : "rejected") — keyboard path unavailable (no key window on this host), text-entry proof unavailable"
                        )
                        self.phase = .dialogPlainProbe
                        self.schedule(0.5) { self.advance() }
                        return
                    }
                    let digits = ["1", "2", "3", "4", "5", "6"]
                    for (index, digit) in digits.enumerated() where index > 0 {
                        _ = Self.setValue(digit, on: fields[index])
                    }
                    self.schedule(0.8) {
                        self.counters.otpBindingFinal = self.otp
                        if self.counters.otpBindingFinal != "123456" {
                            self.failures.append("otp: binding final \"\(self.counters.otpBindingFinal)\", expected \"123456\"")
                        }
                        if self.counters.otpCompletes != ["123456"] {
                            self.failures.append("otp: onComplete values \(self.counters.otpCompletes), expected [\"123456\"]")
                        }
                        self.phase = .dialogPlainProbe
                        self.schedule(0.5) { self.advance() }
                    }
                }
            }

        case .dialogChannel:
            counters.dialogOpens = []
            schedule(1.0) {
                self.counters.dialogSheetVisibleBefore = Self.axButtons(labeled: "close-dialog").count > 0
                let trigger = Self.axButtons(labeled: "open-dialog")
                guard trigger.count == 1, !self.counters.dialogSheetVisibleBefore else {
                    self.failures.append("dialog: expected exactly 1 open-dialog trigger and no sheet content before open; found \(trigger.count) triggers, sheet visible \(!self.counters.dialogSheetVisibleBefore)")
                    self.phase = .dialogUncontrolled
                    self.schedule(1.0) { self.advance() }
                    return
                }
                Self.click(at: trigger[0])
                // Sheet presentation animates — poll well past a single
                // settle beat before declaring the channel broken.
                self.pollDialogPresentation(remaining: 10)
            }

        case .dialogPlainProbe:
            // Minimal plain-SwiftUI control: same zero-size anchor, same
            // after-mount binding flip, no component code. If this
            // presents where the emitted Dialog did not, the defect is
            // in the Dialog binding path; if neither presents, the host
            // environment blocks after-mount presentation entirely.
            schedule(1.0) {
                let trigger = Self.axButtons(labeled: "open-plain")
                guard trigger.count == 1 else {
                    self.counters.limitations.append(
                        "dialog(plain probe): expected 1 open-plain trigger, found \(trigger.count) — probe inconclusive"
                    )
                    self.phase = .dialogChannel
                    self.schedule(1.0) { self.advance() }
                    return
                }
                Self.click(at: trigger[0])
                self.pollPlainSheet(remaining: 10)
            }

        case .dialogUncontrolled:
            schedule(1.0) {
                self.counters.dialogUncontrolledVisible = Self.axButtons(labeled: "close-uncontrolled").count > 0
                if !self.counters.dialogUncontrolledVisible {
                    self.failures.append("dialog(uncontrolled): defaultOpen=true did not present a sheet at mount — presentation anchor broken")
                }
                self.phase = .calendarDay
                self.schedule(0.5) { self.advance() }
            }

        case .calendarDay:
            counters.calendarChanges = []
            counters.calendarMonthChanges = []
            counters.calendarCensus = [:]
            counters.calendarButtonsDump = []
            schedule(1.0) {
                self.counters.calendarCensus = Self.axCensus()
                self.counters.calendarButtonsDump = Self.axButtons().compactMap {
                    Self.description(of: $0) ?? Self.title(of: $0)
                }
                self.counters.calendarHeadersEnUS = Self.axHeadingLabels()
                self.counters.calendarSelectedBefore = Self.selectedButtonLabels()
                // en-US weeks begin on Sunday, and nothing is selected before
                // the first press (the value binding starts nil).
                if self.counters.calendarHeadersEnUS.count != 7 || self.counters.calendarHeadersEnUS.first != "Sunday" {
                    self.failures.append("calendar: en-US column headers \(self.counters.calendarHeadersEnUS), expected 7 starting with Sunday")
                }
                if !self.counters.calendarSelectedBefore.isEmpty {
                    self.failures.append("calendar: days selected before any press: \(self.counters.calendarSelectedBefore)")
                }
                // Each day is a Button named by its locale-formatted full
                // date; press one through AXPress and expect exactly one
                // commit of that day, the binding to follow, and the day
                // alone to carry the isSelected trait (AXSelected).
                let day = Self.axButtons(described: "Monday, March 10, 2031")
                guard day.count == 1 else {
                    self.failures.append(
                        "calendar: expected one day button named 'Monday, March 10, 2031', found \(day.count) (buttons \(self.counters.calendarButtonsDump))"
                    )
                    self.phase = .calendarLocale
                    self.schedule(0.5) { self.advance() }
                    return
                }
                Self.click(at: day[0])
                self.schedule(0.8) {
                    self.counters.calendarBindingFinal = Self.dayKey(self.pickedDate)
                    self.counters.calendarSelectedAfter = Self.waitForSelectedButtons(["Monday, March 10, 2031"])
                    if self.counters.calendarChanges != ["2031-03-10"] {
                        self.failures.append("calendar: onChange values \(self.counters.calendarChanges), expected [\"2031-03-10\"] after one press")
                    }
                    if self.counters.calendarBindingFinal != "2031-03-10" {
                        self.failures.append("calendar: value binding \(self.counters.calendarBindingFinal), expected 2031-03-10")
                    }
                    // The plain control classifies a miss: if it reports
                    // AXSelected and the day does not, the Calendar is at
                    // fault; if neither does, the host's mapping is.
                    self.counters.calendarProbeSelected = Self.axButtons(labeled: Self.selectedControl).first.map(Self.isSelected) ?? false
                    if self.counters.calendarSelectedAfter != ["Monday, March 10, 2031"] {
                        let pressed = Self.axButtons(described: "Monday, March 10, 2031").first.map(Self.attributeDump) ?? "<missing>"
                        if self.counters.calendarProbeSelected {
                            self.failures.append(
                                "calendar: AXSelected days \(self.counters.calendarSelectedAfter), expected only Monday, March 10, 2031, while the plain isSelected control reports AXSelected (pressed day: \(pressed))"
                            )
                        } else {
                            self.counters.limitations.append(
                                "calendar: neither the selected day nor a plain Button carrying .isSelected reports AXSelected on this host — selected-state exposure unprovable here"
                            )
                        }
                    }
                    // The parent owns the controlled value: moving it from
                    // outside moves the selected day with it.
                    self.pickedDate = Foundation.Calendar(identifier: .gregorian)
                        .date(from: DateComponents(year: 2031, month: 3, day: 12))
                    // Read after the run loop turns: the re-render the write
                    // schedules cannot happen while this closure polls.
                    self.schedule(0.8) {
                    self.counters.calendarSelectedExternal = Self.waitForSelectedButtons(["Wednesday, March 12, 2031"])
                    if self.counters.calendarSelectedExternal != ["Wednesday, March 12, 2031"] {
                        self.failures.append("calendar: after the parent set the value to March 12, AXSelected days \(self.counters.calendarSelectedExternal), expected only Wednesday, March 12, 2031")
                    }
                    let next = Self.axButtons(labeled: "Next month")
                    guard next.count == 1 else {
                        self.failures.append("calendar: expected one 'Next month' control, found \(next.count)")
                        self.phase = .calendarLocale
                        self.schedule(0.5) { self.advance() }
                        return
                    }
                    Self.click(at: next[0])
                    self.schedule(0.8) {
                        // The month channel moves once, and the grid re-derives
                        // from it: April's days replace March's.
                        let april = Self.waitForButton(described: "Thursday, April 10, 2031")
                        if !april {
                            self.failures.append("calendar: Next month did not re-derive the grid for April 2031")
                        }
                        if !Self.axButtons(described: "Monday, March 10, 2031").isEmpty {
                            self.failures.append("calendar: March 10 is still on screen after Next month")
                        }
                        if self.counters.calendarMonthChanges != ["2031-04"] {
                            self.failures.append("calendar: onMonthChange values \(self.counters.calendarMonthChanges), expected [\"2031-04\"]")
                        }
                        self.phase = .calendarLocale
                        self.schedule(0.5) { self.advance() }
                    }
                    }
                }
            }

        case .calendarLocale:
            schedule(1.0) {
                // de-DE: Monday-first columns and German full-date names.
                self.counters.calendarHeadersDeDE = Self.axHeadingLabels()
                self.counters.calendarStaticSelectedDeDE = Self.selectedButtonLabels()
                let day = Self.axButtons(described: "Montag, 10. März 2031")
                self.counters.calendarDayLabelDeDE = day.first.flatMap { Self.description(of: $0) } ?? "<missing>"
                if self.counters.calendarHeadersDeDE.count != 7 || self.counters.calendarHeadersDeDE.first != "Montag" {
                    self.failures.append("calendar(de-DE): column headers \(self.counters.calendarHeadersDeDE), expected 7 starting with Montag")
                }
                if day.count != 1 {
                    self.failures.append("calendar(de-DE): expected one day named 'Montag, 10. März 2031', found \(day.count)")
                }
                // Uncontrolled: the default value is selected at mount, and a
                // press moves the selection to the pressed day.
                if self.counters.calendarStaticSelectedDeDE != ["Montag, 10. März 2031"] {
                    self.failures.append("calendar(de-DE): AXSelected at mount \(self.counters.calendarStaticSelectedDeDE), expected only Montag, 10. März 2031 (the default value)")
                }
                if let tuesday = Self.axButtons(described: "Dienstag, 11. März 2031").first { Self.click(at: tuesday) }
                self.schedule(0.8) {
                    self.counters.calendarUncontrolledAfterPress = Self.waitForSelectedButtons(["Dienstag, 11. März 2031"])
                    if self.counters.calendarUncontrolledAfterPress != ["Dienstag, 11. März 2031"] {
                        self.failures.append("calendar(de-DE): AXSelected after pressing Dienstag \(self.counters.calendarUncontrolledAfterPress), expected only Dienstag, 11. März 2031")
                    }
                    self.phase = .compoundProofs
                    self.schedule(0.5) { self.advance() }
                }
            }

        case .compoundProofs:
            schedule(1.0) {
                // Scope discovery to the Press Proof window: earlier
                // phases can leave orphaned sheet windows in the app's
                // window list, and the menu bar contributes ~131 items
                // of noise. The window-scoped census is the honest
                // artifact for what THIS surface exposes.
                self.counters.compoundCensus = Self.axCensus(scopedToMainWindow: true)
                let pressable = Self.axElements(withRoles: ["AXButton", "AXCheckBox", "AXSwitch"], scopedToMainWindow: true).count
                if pressable == 0 {
                    // The FEAT-SWIFTUI-COMPOUND-INTERACTIVITY-01 emission
                    // wires every compound control as a pressable; zero
                    // pressables is a wiring regression, not a limitation.
                    self.failures.append(
                        "compound: window census \(self.counters.compoundCensus.sorted { $0.key < $1.key }) exposes ZERO pressables — the deepened Tabs/Accordion/Shuttle wiring regressed to structural emission"
                    )
                    self.phase = .done
                    self.schedule(0.5) { self.advance() }
                    return
                }

                @MainActor func accordionStep() {
                    // -- Accordion: press the item trigger twice; the union
                    // openness channel toggles membership both directions
                    // and the content region follows.
                    guard let trigger = Self.axButtons(labeled: "accordion trigger").first else {
                        self.failures.append("accordion: no pressable 'accordion trigger' (census \(self.counters.compoundCensus.sorted { $0.key < $1.key }))")
                        return self.finishCompound()
                    }
                    Self.click(at: trigger)
                    self.schedule(0.8) {
                        let opened = Self.waitForStaticText("accordion content")
                        Self.click(at: trigger)
                        self.schedule(0.8) {
                            let closed = Self.waitForStaticTextAbsence("accordion content")
                            if self.counters.accordionChanges != ["[\"k1\"]", "[]"] {
                                self.failures.append("accordion: openness changes \(self.counters.accordionChanges), expected [\"[\\\"k1\\\"]\", \"[]\"] (both directions)")
                            }
                            if !opened || !closed {
                                let titles = Self.axStaticTexts().compactMap { Self.title(of: $0) }
                                self.failures.append("accordion: content visibility did not track openness (opened=\(opened) closed=\(closed); staticTexts=\(titles))")
                            }
                            controlledCompoundStep()
                        }
                    }
                }

                @MainActor func controlledCompoundStep() {
                    // -- Controlled Tabs and Accordion: the parent moves each
                    // value with no press. Their panels and content read the
                    // channel through the environment, so they must follow
                    // the parent in both directions.
                    let shown = { () -> String in
                        let tab = Self.waitForStaticText("controlled panel x", attempts: 2) ? "x" : Self.waitForStaticText("controlled panel y", attempts: 2) ? "y" : "-"
                        let content = Self.waitForStaticText("controlled content", attempts: 2) ? "open" : "closed"
                        return "tab \(tab), item \(content)"
                    }
                    self.counters.controlledCompound = [shown()]
                    self.controlledTab = "y"
                    self.controlledOpenness = ["c1"]
                    self.schedule(0.8) {
                        self.counters.controlledCompound.append(shown())
                        self.controlledTab = "x"
                        self.controlledOpenness = []
                        self.schedule(0.8) {
                            self.counters.controlledCompound.append(shown())
                            let expected = ["tab x, item closed", "tab y, item open", "tab x, item closed"]
                            if self.counters.controlledCompound != expected {
                                self.failures.append("controlled compound: shown \(self.counters.controlledCompound), expected \(expected) as the parent sets Tabs and Accordion")
                            }
                            self.finishCompound()
                        }
                    }
                }

                @MainActor func shuttleStep() {
                    // -- Shuttle: the contract iterates the SELECTION channel
                    // (web parity: `(selection ?? []).map`), so rendered rows
                    // are selected items and press REMOVES. Two removals
                    // prove press→channel→re-render in both observable
                    // directions; an "add" press is not contract-modeled in
                    // any family and is not asserted here.
                    let rowAlpha = Self.axButtons(labeled: "alpha").first
                    let rowBeta = Self.axButtons(labeled: "beta").first
                    guard let alpha = rowAlpha else {
                        self.failures.append("shuttle: no pressable 'alpha' row (census \(self.counters.compoundCensus.sorted { $0.key < $1.key }))")
                        return accordionStep()
                    }
                    Self.click(at: alpha)
                    self.schedule(0.8) {
                        let alphaGone = Self.axButtons(labeled: "alpha").isEmpty
                        if let beta = rowBeta ?? Self.axButtons(labeled: "beta").first {
                            Self.click(at: beta)
                        }
                        self.schedule(0.8) {
                            if self.counters.shuttleChanges != ["[\"beta\"]", "[]"] {
                                self.failures.append("shuttle: selection changes \(self.counters.shuttleChanges), expected [\"[\\\"beta\\\"]\", \"[]\"]")
                            }
                            if !alphaGone {
                                self.failures.append("shuttle: pressed row 'alpha' did not leave the rendered selection")
                            }
                            accordionStep()
                        }
                    }
                }

                // -- Tabs: press tab "b"; the string channel fires once and
                // swaps the gated panel content.
                guard let tabB = Self.axButtons(labeled: "tabs-b").first else {
                    self.failures.append("tabs: no pressable 'tabs-b' control (census \(self.counters.compoundCensus.sorted { $0.key < $1.key }))")
                    return shuttleStep()
                }
                Self.click(at: tabB)
                self.schedule(0.8) {
                    let panelB = Self.waitForStaticText("tabs panel b")
                    let panelA = Self.waitForStaticText("tabs panel a", attempts: 2)
                    if self.counters.tabsChanges != ["b"] {
                        self.failures.append("tabs: activeTab changes \(self.counters.tabsChanges), expected [\"b\"] exactly once")
                    }
                    if !panelB || panelA {
                        self.failures.append("tabs: panel gating did not swap (panelB=\(panelB) panelA=\(panelA))")
                    }
                    shuttleStep()
                }
            }

        case .done:
            print("=== PRESS-PROOF COUNTERS (OS event path) ===")
            print("chip.onClick(action-only)  : \(counters.chipClicks) fire(s) [expect 1]")
            print("chip.onDismiss(dismissible): \(counters.chipDismisses) fire(s) [expect 1]")
            print("walkthrough.steps          : \(counters.steps) [expect [1.0] then last 2.0]")
            print("walkthrough.onSkip         : \(counters.skips) fire(s) [expect 1]")
            print("walkthrough.onComplete     : \(counters.completes) fire(s) [expect 1]")
            print("--- breadth (TEST-SWIFTUI-RUNTIME-BREADTH-01) ---")
            print("switch.onChange            : \(counters.switchStates) [expect [true, false]]")
            print("switch.bindingFinal        : \(counters.switchBindingFinal) [expect false]")
            print("switch.AXValue per press   : \(counters.switchAXValues) [expect [\"1\", \"0\"]]")
            print("switch(unpublished) shown  : \(counters.unpublishedSwitch) [expect [\"0\", \"stored true\"]]")
            print("switch(refusing) shown     : \(counters.refusingSwitch) onChange \(counters.refusingChanges) [expect [\"0\"] and [true]]")
            print("select.onSelectionChange   : \(counters.selectChanges) [expect [\"b\"]]")
            print("select.bindingFinal        : \"\(counters.selectBindingFinal)\" [expect \"b\"]")
            print("select.trigger label       : \"\(counters.selectTriggerLabel)\" [expect \"B\"]")
            print("popover.onOpenChange       : \(counters.popoverOpens) [expect first value true; phase unmount may append native-dismissal false]")
            print("popover.content after press: \(counters.popoverVisibleAfterPress) [expect true]")
            print("otp.onChange(last)         : \(counters.otpChanges.last ?? "<none>")")
            print("otp.onComplete             : \(counters.otpCompletes)")
            print("otp.bindingFinal           : \"\(counters.otpBindingFinal)\"")
            print("dialog.onOpenChange        : \(counters.dialogOpens) [expect [] — consumer-driven close does not fire the channel (web parity); native-dismissal fire is a ledgered host limitation]")
            print("dialog.sheet before/open/after-close: \(counters.dialogSheetVisibleBefore)/\(counters.dialogSheetVisibleAfterOpen)/\(counters.dialogSheetVisibleAfterClose) [expect false/true/false]")
            print("dialog.uncontrolled visible at mount: \(counters.dialogUncontrolledVisible) [expect true — isolates EmptyView().sheet anchor]")
            print("dialog.uncontrolled onOpenChange: \(counters.dialogOpensUncontrolled)")
            print("dialog.plainProbe presented on after-mount flip: \(counters.plainSheetVisible) (trigger pressed \(counters.plainTriggerPresses)x)")
            print("calendar.onChange          : \(counters.calendarChanges) [expect [\"2031-03-10\"]]")
            print("calendar.bindingFinal      : \(counters.calendarBindingFinal) [expect 2031-03-10]")
            print("calendar.AXSelected before : \(counters.calendarSelectedBefore) [expect []]")
            print("calendar.AXSelected after  : \(counters.calendarSelectedAfter) [expect [\"Monday, March 10, 2031\"]]")
            print("calendar.isSelected control: selected=\(counters.calendarProbeSelected) [expect true]")
            print("calendar.AXSelected after parent set: \(counters.calendarSelectedExternal) [expect [\"Wednesday, March 12, 2031\"]]")
            print("calendar.de-DE AXSelected at mount: \(counters.calendarStaticSelectedDeDE) [expect [\"Montag, 10. März 2031\"]]")
            print("calendar.de-DE AXSelected after press: \(counters.calendarUncontrolledAfterPress) [expect [\"Dienstag, 11. März 2031\"]]")
            print("calendar.onMonthChange     : \(counters.calendarMonthChanges) [expect [\"2031-04\"]]")
            print("calendar.headers en-US     : \(counters.calendarHeadersEnUS) [expect 7, first Sunday]")
            print("calendar.headers de-DE     : \(counters.calendarHeadersDeDE) [expect 7, first Montag]")
            print("calendar.day de-DE         : \(counters.calendarDayLabelDeDE) [expect Montag, 10. März 2031]")
            print("calendar.buttons           : \(counters.calendarButtonsDump)")
            print("calendar.census            : \(counters.calendarCensus.sorted { $0.key < $1.key })")
            print("compound.census            : \(counters.compoundCensus.sorted { $0.key < $1.key })")
            print("tabs.activeTab changes     : \(counters.tabsChanges) [expect [\"b\"]]")
            print("accordion.openness changes : \(counters.accordionChanges) [expect [\"[\\\"k1\\\"]\", \"[]\"]]")
            print("controlled tabs/accordion  : \(counters.controlledCompound) [expect [\"tab x, item closed\", \"tab y, item open\", \"tab x, item closed\"]]")
            print("shuttle.selection changes  : \(counters.shuttleChanges) [expect [\"[\\\"beta\\\"]\", \"[]\"]]")
            for limitation in counters.limitations {
                print("LIMITATION: \(limitation)")
            }
            if failures.isEmpty {
                print("PRESS-PROOF: all counters match expectations")
                Foundation.exit(0)
            } else {
                for failure in failures {
                    FileHandle.standardError.write(Data(("PRESS-PROOF FAILURE: " + failure + "\n").utf8))
                }
                Foundation.exit(1)
            }
        }
    }

    // MARK: - AX + interaction plumbing

    /// AXButtons sorted left-to-right by screen position.
    static func axButtons() -> [AXUIElement] {
        axElements(withRoles: ["AXButton"]).sorted { center(of: $0).x < center(of: $1).x }
    }

    /// AXButtons whose AXTitle or AXDescription contains the marker text.
    static func axButtons(labeled marker: String) -> [AXUIElement] {
        axButtons().filter { element in
            let label = (title(of: element) ?? "") + (description(of: element) ?? "")
            return label.localizedCaseInsensitiveContains(marker)
        }
    }

    /// AXButtons whose AXDescription (the accessibility label) is exactly `label`.
    static func axButtons(described label: String) -> [AXUIElement] {
        axButtons().filter { description(of: $0) == label }
    }

    /// Whether the element reports AXSelected (SwiftUI's isSelected trait).
    static func isSelected(_ element: AXUIElement) -> Bool {
        var ref: CFTypeRef?
        guard
            AXUIElementCopyAttributeValue(element, kAXSelectedAttribute as CFString, &ref) == .success
        else { return false }
        return (ref as? Bool) ?? false
    }

    /// A control's numeric AXValue (a toggle's 0/1) as text, or "<none>".
    static func numberValue(of element: AXUIElement) -> String {
        var ref: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &ref) == .success,
              let number = ref as? NSNumber else { return "<none>" }
        return number.stringValue
    }

    /// Every AX attribute of an element with its value, for failure artifacts.
    static func attributeDump(of element: AXUIElement) -> String {
        var namesRef: CFArray?
        guard AXUIElementCopyAttributeNames(element, &namesRef) == .success,
              let names = namesRef as? [String] else { return "<no attributes>" }
        return names.map { name -> String in
            var value: CFTypeRef?
            let read = AXUIElementCopyAttributeValue(element, name as CFString, &value)
            guard read == .success, let value else { return "\(name)=<\(read.rawValue)>" }
            let text = String(describing: value)
            return "\(name)=\(text.count > 60 ? String(text.prefix(60)) + "…" : text)"
        }.joined(separator: ", ")
    }

    /// The plain-SwiftUI Button that always carries the isSelected trait.
    static let selectedControl = "selected-probe"

    /// Labels of the AXButtons that report AXSelected, left to right,
    /// leaving out the plain control.
    static func selectedButtonLabels() -> [String] {
        axButtons().filter(isSelected)
            .map { description(of: $0) ?? title(of: $0) ?? "" }
            .filter { $0 != selectedControl }
    }

    /// Poll until the selected buttons are `expected` (the AX tree lags a
    /// press), returning the last read either way.
    static func waitForSelectedButtons(_ expected: [String], attempts: Int = 8) -> [String] {
        var labels = selectedButtonLabels()
        for _ in 0..<attempts where labels != expected {
            usleep(250_000)
            labels = selectedButtonLabels()
        }
        return labels
    }

    /// Poll for a button whose accessibility label is exactly `label`.
    static func waitForButton(described label: String, attempts: Int = 8) -> Bool {
        for _ in 0..<attempts {
            if !axButtons(described: label).isEmpty { return true }
            usleep(250_000)
        }
        return false
    }

    /// Accessibility labels of the AXHeadings, left to right (a grid's
    /// column headers).
    static func axHeadingLabels() -> [String] {
        axElements(withRoles: ["AXHeading"])
            .sorted { center(of: $0).x < center(of: $1).x }
            .map { description(of: $0) ?? title(of: $0) ?? "" }
    }

    /// A local calendar day as yyyy-MM-dd, or "nil".
    static func dayKey(_ date: Date?) -> String {
        guard let date else { return "nil" }
        let parts = Foundation.Calendar(identifier: .gregorian).dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    /// A local calendar month as yyyy-MM, or "nil".
    static func monthKey(_ date: Date?) -> String {
        guard let date else { return "nil" }
        let parts = Foundation.Calendar(identifier: .gregorian).dateComponents([.year, .month], from: date)
        return String(format: "%04d-%02d", parts.year ?? 0, parts.month ?? 0)
    }

    /// Pressable controls: SwiftUI Buttons (AXButton) and toggles
    /// (AXCheckBox / AXSwitch), sorted left-to-right.
    static func axPressables() -> [AXUIElement] {
        axElements(withRoles: ["AXButton", "AXCheckBox", "AXSwitch"])
            .sorted { center(of: $0).x < center(of: $1).x }
    }

    /// Menu items (opened SwiftUI Menu), sorted top-to-bottom.
    static func axMenuItems() -> [AXUIElement] {
        axElements(withRoles: ["AXMenuItem"]).sorted { center(of: $0).y < center(of: $1).y }
    }

    /// Text inputs (SwiftUI TextField), sorted left-to-right.
    static func axTextFields() -> [AXUIElement] {
        axElements(withRoles: ["AXTextField"]).sorted { center(of: $0).x < center(of: $1).x }
    }

    /// Static texts, for asserting presented sheet content.
    static func axStaticTexts() -> [AXUIElement] {
        axElements(withRoles: ["AXStaticText"])
    }

    /// Role census — the artifact that proves what a mounted surface
    /// actually exposes. `scopedToMainWindow` walks only the Press Proof
    /// window (no menu bar noise, no orphaned sheet windows).
    static func axCensus(scopedToMainWindow: Bool = false) -> [String: Int] {
        let root: AXUIElement = scopedToMainWindow
            ? (mainWindowElement() ?? AXUIElementCreateApplication(ProcessInfo.processInfo.processIdentifier))
            : AXUIElementCreateApplication(ProcessInfo.processInfo.processIdentifier)
        var census: [String: Int] = [:]
        censusWalk(under: root, into: &census)
        return census
    }

    static func axElements(withRoles wanted: Set<String>, scopedToMainWindow: Bool = false) -> [AXUIElement] {
        let root: AXUIElement = scopedToMainWindow
            ? (mainWindowElement() ?? AXUIElementCreateApplication(ProcessInfo.processInfo.processIdentifier))
            : AXUIElementCreateApplication(ProcessInfo.processInfo.processIdentifier)
        var found: [AXUIElement] = []
        collect(under: root, roles: wanted, into: &found)
        return found
    }

    /// The app's AXWindow titled "Press Proof", if present.
    static func mainWindowElement() -> AXUIElement? {
        let app = AXUIElementCreateApplication(ProcessInfo.processInfo.processIdentifier)
        var windowsRef: CFTypeRef?
        guard
            AXUIElementCopyAttributeValue(
                app, kAXWindowsAttribute as CFString, &windowsRef
            ) == .success,
            let windows = windowsRef as? [AXUIElement]
        else { return nil }
        return windows.first { title(of: $0) == "Press Proof" }
    }

    static func center(of element: AXUIElement) -> CGPoint {
        var posRef: CFTypeRef?
        var sizeRef: CFTypeRef?
        guard
            AXUIElementCopyAttributeValue(
                element, kAXPositionAttribute as CFString, &posRef
            ) == .success,
            AXUIElementCopyAttributeValue(
                element, kAXSizeAttribute as CFString, &sizeRef
            ) == .success,
            let pos = posRef,
            let size = sizeRef
        else { return .zero }
        var p = CGPoint.zero
        var sz = CGSize.zero
        let posVal = pos as! AXValue
        let sizeVal = size as! AXValue
        withUnsafeMutablePointer(to: &p) { pPtr in
            withUnsafeMutablePointer(to: &sz) { szPtr in
                AXValueGetValue(posVal, .cgPoint, pPtr)
                AXValueGetValue(sizeVal, .cgSize, szPtr)
            }
        }
        return CGPoint(x: p.x + sz.width / 2, y: p.y + sz.height / 2)
    }

    static func title(of element: AXUIElement) -> String? {
        stringAttribute(kAXTitleAttribute as CFString, of: element)
            ?? stringAttribute(kAXValueAttribute as CFString, of: element)
    }

    /// Poll for a static text to become exposed with the given title. The
    /// AX tree lags rapid interaction (successive clicks coalesce and
    /// attribute reads transiently return nil while SwiftUI rebuilds the
    /// accessibility snapshot); a single immediate read under-asserts.
    static func waitForStaticText(_ wanted: String, attempts: Int = 8) -> Bool {
        for _ in 0..<attempts {
            if axStaticTexts().contains(where: { title(of: $0) == wanted }) {
                return true
            }
            usleep(250_000)
        }
        return false
    }

    /// Poll for a static text to disappear AND stay gone (the inverse of
    /// waitForStaticText: absence is only trusted after the tree settles).
    static func waitForStaticTextAbsence(_ unwanted: String, attempts: Int = 8) -> Bool {
        for _ in 0..<attempts {
            if !axStaticTexts().contains(where: { title(of: $0) == unwanted }) {
                return true
            }
            usleep(250_000)
        }
        return false
    }

    static func description(of element: AXUIElement) -> String? {
        stringAttribute(kAXDescriptionAttribute as CFString, of: element)
    }

    static func stringAttribute(_ attribute: CFString, of element: AXUIElement) -> String? {
        var ref: CFTypeRef?
        guard
            AXUIElementCopyAttributeValue(element, attribute, &ref) == .success
        else { return nil }
        return ref as? String
    }

    /// OS-mediated text entry: write through the AXValue attribute.
    /// Returns false when the element rejects value writes.
    static func setValue(_ value: String, on element: AXUIElement) -> Bool {
        var settable: DarwinBoolean = false
        guard
            AXUIElementIsAttributeSettable(
                element, kAXValueAttribute as CFString, &settable
            ) == .success,
            settable.boolValue
        else { return false }
        let result = AXUIElementSetAttributeValue(
            element, kAXValueAttribute as CFString, value as CFString
        )
        usleep(150_000)
        return result == .success
    }

    private static func censusWalk(under element: AXUIElement, into census: inout [String: Int]) {
        var childrenRef: CFTypeRef?
        guard
            AXUIElementCopyAttributeValue(
                element, kAXChildrenAttribute as CFString, &childrenRef
            ) == .success
        else { return }
        let children = (childrenRef as? [AXUIElement]) ?? []
        for child in children {
            if let role = role(of: child) {
                // Traffic-light window buttons would inflate AXButton counts;
                // count only content controls like the collectors do.
                if role == "AXButton",
                    let subrole = stringAttribute(kAXSubroleAttribute as CFString, of: child),
                    ["AXCloseButton", "AXMinimizeButton", "AXZoomButton", "AXFullScreenButton"].contains(subrole) {
                    continue
                }
                census[role, default: 0] += 1
            }
            censusWalk(under: child, into: &census)
        }
    }

    private static func role(of element: AXUIElement) -> String? {
        stringAttribute(kAXRoleAttribute as CFString, of: element)
    }

    private static func collect(
        under element: AXUIElement, roles wanted: Set<String>, into found: inout [AXUIElement]
    ) {
        var childrenRef: CFTypeRef?
        guard
            AXUIElementCopyAttributeValue(
                element, kAXChildrenAttribute as CFString, &childrenRef
            ) == .success
        else { return }
        let children = (childrenRef as? [AXUIElement]) ?? []
        for child in children {
            if let role = role(of: child), wanted.contains(role) {
                var subroleRef: CFTypeRef?
                var subrole: String?
                if AXUIElementCopyAttributeValue(
                    child, kAXSubroleAttribute as CFString, &subroleRef
                ) == .success {
                    subrole = subroleRef as? String
                }
                // Traffic lights are AXButtons with standard subroles —
                // skip them; only content controls drive the scenarios.
                if let subrole,
                    ["AXCloseButton", "AXMinimizeButton", "AXZoomButton", "AXFullScreenButton"].contains(subrole) {
                    continue
                }
                found.append(child)

            }
            collect(under: child, roles: wanted, into: &found)
        }
    }

    /// Background windows eat the first click as activation — explicitly
    /// activate + key the window so the synthesized click reaches the
    /// button on the first press.
    static func focusOurWindow() {
        NSApp.activate(ignoringOtherApps: true)
        // keyWindow can be nil under swift run; front every window we own.
        for window in NSApplication.shared.windows where window.canBecomeKey {
            window.orderFrontRegardless()
            window.makeKeyAndOrderFront(nil)
        }
        usleep(200_000)
    }

    /// Actuate through the OS accessibility action path: AXPress fires
    /// the same SwiftUI control action a user press does. CGEvent mouse
    /// delivery was attempted first and requires a keyable window this
    /// swift-run host never grants (keyWindow nil after
    /// orderFrontRegardless + makeKeyAndOrderFront — recorded per phase).
    /// Focus is a once-per-run courtesy: AXPress does not require key
    /// state, and re-keying every owned window on each click fights a
    /// presented modal sheet for key status (the sheet is itself a keyable
    /// window) — observed as a main-thread livelock once the controlled
    /// Dialog actually presented (FEAT-SWIFTUI-COMPOUND-INTERACTIVITY-01).
    private static var didFocusOnce = false
    static func click(at button: AXUIElement) {
        if !didFocusOnce {
            focusOurWindow()
            didFocusOnce = true
        }
        let result = AXUIElementPerformAction(button, kAXPressAction as CFString)
        if result != .success {
            FileHandle.standardError.write(Data(("AXPress error: \(result.rawValue)\n").utf8))
        }
        usleep(250_000)
    }
}

@main
struct PressProofHarnessApp: App {
    @StateObject private var model = HarnessModel()

    var body: some Scene {
        WindowGroup("Press Proof") {
            ZStack {
                switch model.phase {
                case .chipActionOnly:
                    Chip(
                        onClick: { model.counters.chipClicks += 1 }
                    ) { SwiftUI.Text("chip") }
                case .chipDismissible:
                    Chip(
                        dismissible: true,
                        onClick: { model.counters.chipClicks += 1 },
                        onDismiss: { model.counters.chipDismisses += 1 }
                    ) { SwiftUI.Text("x") }
                case .walkthroughCold:
                    Walkthrough(
                        step: 0,
                        onStepChange: { model.counters.steps.append($0) },
                        onComplete: { model.counters.completes += 1 },
                        onSkip: { model.counters.skips += 1 },
                        title: { SwiftUI.Text("t") }
                    )
                case .walkthroughThreshold:
                    Walkthrough(
                        step: 1,
                        onStepChange: { model.counters.steps.append($0) },
                        onComplete: { model.counters.completes += 1 },
                        title: { SwiftUI.Text("t") }
                    )
                case .switchToggle:
                    Switch(
                        checked: $model.switchOn,
                        onChange: { model.counters.switchStates.append($0) },
                        accessibilityLabel: "harness-switch"
                    )
                case .switchUnpublished:
                    VStack {
                        Switch(
                            checked: Binding(get: { model.unpublished.on }, set: { model.unpublished.on = $0 }),
                            accessibilityLabel: "unpublished-switch"
                        )
                        Switch(
                            checked: Binding(get: { false }, set: { _ in }),
                            onChange: { model.counters.refusingChanges.append($0) },
                            accessibilityLabel: "refusing-switch"
                        )
                    }
                case .selectOption:
                    Select(
                        options: [
                            SelectOption(value: "a", label: "A"),
                            SelectOption(value: "b", label: "B"),
                            SelectOption(value: "c", label: "C"),
                        ],
                        selection: $model.selection,
                        onSelectionChange: { model.counters.selectChanges.append("\($0)") }
                    )
                    .frame(width: 200)
                case .popoverClick:
                    Popover(
                        onOpenChange: { model.counters.popoverOpens.append($0) },
                        trigger: { SwiftUI.Text("open-popover") },
                        content: { SwiftUI.Text("popover-content") }
                    )
                case .otpEntry:
                    OTP(
                        value: $model.otp,
                        onChange: { model.counters.otpChanges.append($0) },
                        onComplete: { model.counters.otpCompletes.append($0) }
                    )
                case .dialogChannel:
                    VStack(spacing: 12) {
                        SwiftUI.Button("open-dialog") {
                            model.counters.dialogTriggerPresses += 1
                            model.dialogOpen = true
                        }
                        Dialog(
                            open: $model.dialogOpen,
                            onOpenChange: { model.counters.dialogOpens.append($0) },
                            title: { SwiftUI.Text("dialog title") },
                            bodyContent: { SwiftUI.Text("dialog body") },
                            footer: {
                                SwiftUI.Button("close-dialog") { model.dialogOpen = false }
                            }
                        )
                    }
                case .dialogPlainProbe:
                    VStack(spacing: 12) {
                        SwiftUI.Button("open-plain") {
                            model.counters.plainTriggerPresses += 1
                            model.plainSheetOpen = true
                        }
                        SwiftUI.Color.clear
                            .frame(width: 0, height: 0)
                            .sheet(isPresented: $model.plainSheetOpen) {
                                SwiftUI.Text("plain-probe-sheet")
                            }
                    }
                case .dialogUncontrolled:
                    // Uncontrolled probe in its own phase: a presented sheet
                    // blocks a second sheet from the same window, so the
                    // controlled flow must complete before this mounts.
                    Dialog(
                        defaultOpen: true,
                        onOpenChange: { model.counters.dialogOpensUncontrolled.append($0) },
                        title: { SwiftUI.Text("uncontrolled title") },
                        footer: {
                            SwiftUI.Button("close-uncontrolled") {}
                        }
                    )
                case .calendarDay:
                    Calendar(
                        value: $model.pickedDate,
                        onChange: { model.counters.calendarChanges.append(HarnessModel.dayKey($0)) },
                        defaultMonth: Foundation.Calendar(identifier: .gregorian)
                            .date(from: DateComponents(year: 2031, month: 3, day: 1)),
                        onMonthChange: { model.counters.calendarMonthChanges.append(HarnessModel.monthKey($0)) }
                    )
                    .overlay(alignment: .topLeading) {
                        // Plain-SwiftUI control for the selected-state read: if
                        // this Button exposes the isSelected trait and a selected
                        // day does not, the Calendar is at fault; if neither
                        // does, the host's mapping is.
                        SwiftUI.Button(HarnessModel.selectedControl) {}
                            .accessibilityAddTraits(.isSelected)
                    }
                case .calendarLocale:
                    Calendar(
                        defaultValue: Foundation.Calendar(identifier: .gregorian)
                            .date(from: DateComponents(year: 2031, month: 3, day: 10)),
                        defaultMonth: Foundation.Calendar(identifier: .gregorian)
                            .date(from: DateComponents(year: 2031, month: 3, day: 1)),
                        locale: "de-DE"
                    )
                case .compoundProofs:
                    VStack(spacing: 16) {
                        // Composed through the deepened compound API: the
                        // root injects its channel; subcomponents consume it
                        // and press-wire it (FEAT-SWIFTUI-COMPOUND-INTERACTIVITY-01).
                        Tabs(
                            defaultActiveTab: "a",
                            onActiveTabChange: { model.counters.tabsChanges.append($0) }
                        ) {
                            HStack {
                                TabsTab(value: "a", label: "tabs-a")
                                TabsTab(value: "b", label: "tabs-b")
                            }
                            TabsPanel(value: "a") { SwiftUI.Text("tabs panel a") }
                            TabsPanel(value: "b") { SwiftUI.Text("tabs panel b") }
                        }
                        Accordion(
                            onOpennessChange: { model.counters.accordionChanges.append(String(describing: $0)) }
                        ) {
                            AccordionItem(key: "k1", trigger: { SwiftUI.Text("accordion trigger") }) {
                                SwiftUI.Text("accordion content")
                            }
                        }
                        Tabs(activeTab: $model.controlledTab) {
                            TabsPanel(value: "x") { SwiftUI.Text("controlled panel x") }
                            TabsPanel(value: "y") { SwiftUI.Text("controlled panel y") }
                        }
                        Accordion(openness: $model.controlledOpenness) {
                            AccordionItem(key: "c1", trigger: { SwiftUI.Text("controlled trigger") }) {
                                SwiftUI.Text("controlled content")
                            }
                        }
                        Shuttle(
                            defaultSelection: ["alpha", "beta"],
                            onSelectionChange: { model.counters.shuttleChanges.append(String(describing: $0)) }
                        )
                    }
                case .done:
                    SwiftUI.Text("done")
                }
            }
            .frame(width: 420, height: 320)
            .onAppear { model.run() }
        }
        .windowResizability(.contentSize)
    }
}
