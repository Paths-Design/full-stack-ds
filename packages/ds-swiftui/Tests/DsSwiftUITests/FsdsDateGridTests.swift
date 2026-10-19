import XCTest
@testable import DsSwiftUI

/// Pins the Foundation date-grid derivation against the same March 2031
/// fixtures the web and JVM cores are pinned with (March 1, 2031 is a
/// Saturday): the grid is derived from the month, starts on the locale's
/// first weekday, labels in the locale's language, calendar and digits,
/// spans a range, and reports bounds.
final class FsdsDateGridTests: XCTestCase {
    private let utc = TimeZone(identifier: "UTC")!

    private func day(_ year: Int, _ month: Int, _ dayOfMonth: Int) -> Date {
        var calendar = Foundation.Calendar(identifier: .gregorian)
        calendar.timeZone = utc
        return calendar.date(from: DateComponents(year: year, month: month, day: dayOfMonth))!
    }

    private func grid(
        _ locale: String = "en-US",
        selection: [Date] = [],
        month: Date? = nil,
        range: Bool = false,
        minDate: Date? = nil,
        maxDate: Date? = nil,
        disabled: Bool = false,
        caption: String? = nil,
        noMonth: Bool = false
    ) -> FsdsDateGridState {
        FsdsDateGrid.compute(
            selection: selection,
            month: noMonth ? nil : (month ?? day(2031, 3, 1)),
            range: range,
            locale: locale,
            minDate: minDate,
            maxDate: maxDate,
            disabled: disabled,
            caption: caption,
            today: day(2031, 3, 18),
            timeZone: utc
        )
    }

    private func find(_ state: FsdsDateGridState, _ key: String) -> FsdsDateGridDay {
        state.weeks.flatMap(\.days).first { $0.id == key }!
    }

    func testDerivesSixWeeksFromTheMonthStartingOnTheLocaleWeekStart() {
        let us = grid("en-US")
        XCTAssertEqual(us.weeks.count, 6)
        XCTAssertTrue(us.weeks.allSatisfy { $0.days.count == 7 })
        XCTAssertEqual(us.weeks.first!.days.first!.id, "2031-02-23")
        XCTAssertEqual(us.weeks.last!.days.last!.id, "2031-04-05")
        XCTAssertEqual(grid("de-DE").weeks[0].days[0].id, "2031-02-24")
        XCTAssertEqual(grid("ar-EG").weeks[0].days[0].id, "2031-03-01")
    }

    func testLabelsFollowTheLocaleLanguageAndDigits() {
        let us = grid("en-US")
        XCTAssertEqual(us.caption, "March 2031")
        XCTAssertEqual(find(us, "2031-03-10").label, "10")
        XCTAssertEqual(find(us, "2031-03-10").fullLabel, "Monday, March 10, 2031")
        XCTAssertEqual(us.weekdays[1], FsdsDateGridWeekday(id: 1, short: "Mon", long: "Monday"))

        let de = grid("de-DE")
        XCTAssertEqual(de.caption, "März 2031")
        XCTAssertEqual(find(de, "2031-03-10").fullLabel, "Montag, 10. März 2031")
        XCTAssertEqual(de.weekdays[0].long, "Montag")

        let ar = grid("ar-EG")
        XCTAssertEqual(ar.caption, "مارس ٢٠٣١")
        XCTAssertEqual(find(ar, "2031-03-10").label, "١٠")
    }

    func testAPersianCalendarLocaleFormatsTheGregorianMonth() {
        // fa-IR defaults to the Persian calendar, whose months are not the
        // grid's: the caption must name the Gregorian month the grid shows.
        XCTAssertTrue(grid("fa-IR").caption.contains("۲۰۳۱"))
    }

    func testTheCurrentDayCarriesTheLocaleNameForToday() {
        let us = grid("en-US")
        XCTAssertEqual(us.weeks.flatMap(\.days).filter(\.isToday).map(\.id), ["2031-03-18"])
        XCTAssertEqual(us.todayName, "Today")
        XCTAssertEqual(grid("de-DE").todayName, "Heute")
    }

    func testAnExplicitCaptionReplacesTheFormattedMonth() {
        XCTAssertEqual(grid(caption: "Billing period").caption, "Billing period")
    }

    func testANilMonthFollowsTheSelectionThenToday() {
        XCTAssertEqual(grid(selection: [day(2031, 7, 14)], noMonth: true).month, day(2031, 7, 1))
        XCTAssertEqual(grid(noMonth: true).month, day(2031, 3, 1))
    }

    func testOutsideMonthDays() {
        XCTAssertTrue(find(grid(), "2031-02-28").isOutsideMonth)
        XCTAssertFalse(find(grid(), "2031-03-01").isOutsideMonth)
    }

    func testARangeSelectsEveryDayOfTheSpanInEitherOrder() {
        for selection in [[day(2031, 3, 10), day(2031, 3, 12)], [day(2031, 3, 12), day(2031, 3, 10)]] {
            let selected = grid(selection: selection, range: true).weeks.flatMap(\.days).filter(\.isSelected).map(\.id)
            XCTAssertEqual(selected, ["2031-03-10", "2031-03-11", "2031-03-12"])
        }
        let single = grid(selection: [day(2031, 3, 10), day(2031, 3, 12)]).weeks.flatMap(\.days).filter(\.isSelected).map(\.id)
        XCTAssertEqual(single, ["2031-03-10", "2031-03-12"])
    }

    func testActivationPairsALoneRangeStartAndOtherwiseStartsOver() {
        let start = day(2031, 3, 12)
        XCTAssertEqual(FsdsDateGrid.select([start], day: day(2031, 3, 10), range: true), [day(2031, 3, 10), start])
        XCTAssertEqual(FsdsDateGrid.select([start], day: day(2031, 3, 14), range: true), [start, day(2031, 3, 14)])
        XCTAssertEqual(FsdsDateGrid.select([start, day(2031, 3, 14)], day: day(2031, 3, 20), range: true), [day(2031, 3, 20)])
        XCTAssertEqual(FsdsDateGrid.select([start], day: day(2031, 3, 20), range: false), [day(2031, 3, 20)])
    }

    func testBoundsDisableDaysAndTheNavigationThatLeavesThem() {
        let bounded = grid(minDate: day(2031, 3, 5), maxDate: day(2031, 3, 31))
        XCTAssertTrue(find(bounded, "2031-03-04").isDisabled)
        XCTAssertFalse(find(bounded, "2031-03-05").isDisabled)
        XCTAssertTrue(find(bounded, "2031-04-01").isDisabled)
        XCTAssertTrue(bounded.previousDisabled)
        XCTAssertTrue(bounded.nextDisabled)
        let open = grid(minDate: day(2031, 2, 28), maxDate: day(2031, 4, 1))
        XCTAssertFalse(open.previousDisabled)
        XCTAssertFalse(open.nextDisabled)
    }

    func testADisabledGridDisablesEveryDayAndBothNavs() {
        let disabled = grid(disabled: true)
        XCTAssertTrue(disabled.weeks.flatMap(\.days).allSatisfy(\.isDisabled))
        XCTAssertTrue(disabled.previousDisabled && disabled.nextDisabled)
    }

    func testMonthStepsLandOnTheFirstDayAcrossYearEdges() {
        XCTAssertEqual(FsdsDateGrid.addMonths(day(2031, 3, 31), -1, timeZone: utc), day(2031, 2, 1))
        XCTAssertEqual(FsdsDateGrid.addMonths(day(2031, 12, 15), 1, timeZone: utc), day(2032, 1, 1))
        XCTAssertTrue(FsdsDateGrid.isSameMonth(day(2031, 3, 1), day(2031, 3, 31), timeZone: utc))
        XCTAssertFalse(FsdsDateGrid.isSameMonth(day(2031, 3, 1), day(2032, 3, 1), timeZone: utc))
    }
}
