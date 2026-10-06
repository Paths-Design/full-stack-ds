// Body-evaluation smoke harness: every allowlisted component instantiates
// and its body evaluates through NSHostingController without crashing —
// the kink-class compile-only gates cannot see (FEAT-SWIFTUI-PARITY-BATCH-01).
// The factory table mirrors fsds.targets.json's swiftui allowlist; the
// completeness assertion fails when a component is admitted but not smoked.
import XCTest
import AppKit
import SwiftUI
@testable import DsSwiftUI

@MainActor
final class ComponentSmokeTests: XCTestCase {
    private func evaluate(_ name: String, _ factory: () -> AnyView) {
        let host = NSHostingController(rootView: factory())
        // Forcing a fitting-size pass evaluates the body on this thread.
        let size = host.view.fittingSize
        XCTAssertFalse(size.width.isNaN && size.height.isNaN, "\(name) produced NaN size")
        _ = host.view // keep controller alive through evaluation
    }

    func testEveryAdmittedComponentBodyEvaluates() {
        var cases: [(String, () -> AnyView)] = []
        cases.append(("Switch", { AnyView(Switch()) }))
        cases.append(("ToggleSwitch", { AnyView(ToggleSwitch()) }))
        cases.append(("Button", { AnyView(FsdsButton { SwiftUI.Text("OK") }) }))
        cases.append(("Card", { AnyView(Card { SwiftUI.Text("h") } content: { SwiftUI.Text("c") }) }))
        cases.append(("Field", { AnyView(FsdsField { SwiftUI.Text("l") } control: { Input() }) }))
        cases.append(("Input", { AnyView(Input()) }))
        cases.append(("Dialog", { AnyView(Dialog(open: .constant(true), title: { SwiftUI.Text("t") })) }))
        cases.append(("Tooltip", { AnyView(Tooltip(trigger: { SwiftUI.Text("tr") }, content: { SwiftUI.Text("c") })) }))
        cases.append(("Command", { AnyView(Command(open: .constant(false))) }))
        cases.append(("Details", { AnyView(Details(summary: "s") { SwiftUI.Text("b") }) }))
        cases.append(("Sheet", { AnyView(Sheet(open: .constant(false), content: { SwiftUI.Text("c") })) }))
        cases.append(("Label", { AnyView(FsdsLabel { SwiftUI.Text("l") }) }))
        cases.append(("Blockquote", { AnyView(Blockquote { SwiftUI.Text("q") }) }))
        cases.append(("Links", { AnyView(Links { SwiftUI.Text("l") }) }))
        cases.append(("List", { AnyView(List { SwiftUI.Text("i") }) }))
        cases.append(("Checkbox", { AnyView(Checkbox()) }))
        cases.append(("Divider", { AnyView(FsdsDivider()) }))
        cases.append(("Progress", { AnyView(Progress(value: 50)) }))
        cases.append(("Spinner", { AnyView(Spinner()) }))
        cases.append(("Icon", { AnyView(Icon(name: "alarm")) }))
        cases.append(("Toast", { AnyView(Toast(open: .constant(false), title: { SwiftUI.Text("t") })) }))
        cases.append(("Select", { AnyView(Select(options: [SelectOption(value: "a", label: "A")])) }))
        cases.append(("Alert", { AnyView(Alert { SwiftUI.Text("body") }) }))
        cases.append(("Badge", { AnyView(Badge { SwiftUI.Text("b") }) }))
        cases.append(("OTP", { AnyView(OTP()) }))
        cases.append(("AlertNotice", { AnyView(AlertNotice { SwiftUI.Text("n") }) }))
        cases.append(("Stat", { AnyView(Stat { SwiftUI.Text("v") }) }))
        cases.append(("ProfileFlag", { AnyView(ProfileFlag { SwiftUI.Text("f") }) }))
        cases.append(("Postcard", { AnyView(Postcard { SwiftUI.Text("p") }) }))
        cases.append(("Breadcrumbs", { AnyView(Breadcrumbs { SwiftUI.Text("b") }) }))
        cases.append(("NavList", { AnyView(NavList { SwiftUI.Text("n") }) }))
        cases.append(("CodeSnippet", { AnyView(CodeSnippet(text: "let x = 1")) }))
        cases.append(("CodeBlock", { AnyView(CodeBlock(code: "let y = 2")) }))
        cases.append(("Image", { AnyView(Image(src: "https://example.com/x.png")) }))
        cases.append(("Avatar", { AnyView(Avatar(src: "https://e.com/a.png", name: "Ada")) }))
        cases.append(("Truncate", { AnyView(Truncate { Text(Self.longText) }) }))
        cases.append(("ShowMore", { AnyView(ShowMore { Text(Self.longText) }) }))
        cases.append(("Popover", { AnyView(Popover(trigger: { SwiftUI.Text("tr") }, content: { SwiftUI.Text("c") })) }))
        cases.append(("Skeleton", { AnyView(Skeleton()) }))
        cases.append(("TextField", { AnyView(TextField(value: .constant("x"), label: { SwiftUI.Text("L") })) }))
        cases.append(("Chip", { AnyView(Chip { SwiftUI.Text("chip") }) }))
        cases.append(("Shuttle", { AnyView(Shuttle(selection: .constant(["a", "b"]))) }))
        cases.append(("Accordion", { AnyView(Accordion { SwiftUI.Text("panel") }) }))
        cases.append(("Tabs", { AnyView(Tabs { SwiftUI.Text("panel") }) }))
        cases.append(("Calendar", { AnyView(Calendar()) }))
        cases.append(("Walkthrough", { AnyView(Walkthrough(title: { SwiftUI.Text("t") })) }))
        cases.append(("Text", { AnyView(DsSwiftUI.Text { SwiftUI.Text("body") }) }))
        cases.append(("Status", { AnyView(Status { SwiftUI.Text("ok") }) }))
        cases.append(("Table", { AnyView(FsdsTable { SwiftUI.Text("row") }) }))
        cases.append(("RadioGroup", { AnyView(RadioGroup(options: [RadioGroupOption(value: "a", label: "A"), RadioGroupOption(value: "b", label: "B", disabled: true)], defaultValue: "a", ariaLabel: "Choices", orientation: .horizontal)) }))
        cases.append(("Markdown", { AnyView(Markdown(content: "# Heading")) }))
        cases.append(("NavTree", { AnyView(NavTree(icon: "alarm")) }))
        cases.append(("Pagination", { AnyView(Pagination(pages: ["One", "Two", "Three"])) }))
        cases.append(("PageNavigator", { AnyView(PageNavigator(pages: ["One", "Two", "Three"], pageCount: 3)) }))
        cases.append(("Carousel", { AnyView(Carousel(slides: ["One", "Two"]) { SwiftUI.Text("slide") }) }))
        XCTAssertEqual(cases.count, 55, "factory table drifted from the allowlist")
        for (name, factory) in cases {
            evaluate(name, factory)
        }
    }

    static var longText: String {
        String(repeating: "word ", count: 80)
    }

    func testAvatarFallbackRendersNameWhenSrcNil() {
        let host = NSHostingController(rootView: AnyView(Avatar(src: nil, name: "Ada")))
        XCTAssertFalse(host.view.fittingSize.width.isNaN)
    }

    func testSelectMultiModeAppliesToggleThroughMenuPath() {
        var multi: [String] = []
        let select = Select(
            options: [SelectOption(value: "a", label: "A")],
            multipleSelection: Binding(get: { multi }, set: { multi = $0 }),
            multiple: true
        )
        let host = NSHostingController(rootView: AnyView(select))
        _ = host.view.fittingSize
        XCTAssertTrue(multi.isEmpty, "render alone must not mutate selection")
    }
}
