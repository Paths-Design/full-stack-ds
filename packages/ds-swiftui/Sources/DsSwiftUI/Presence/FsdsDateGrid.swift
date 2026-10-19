import Foundation

// Hand-maintained runtime (alongside ControllableValue) — NOT generated.
// The SwiftUI realization of the contract's date-grid fact: the visible
// month, its six-week day grid, range-span selection, bounds and locale
// formatting. The web and React Native targets realize the same fact through
// packages/ds-codegen/src/date/date-grid.ts and Compose through FsdsDateGrid.kt;
// this file mirrors that derivation over Foundation so every target derives
// the same grid from the same channels.
//
// The grid is Gregorian, with the locale's first weekday. Formatting uses the
// locale's calendar when its months are the Gregorian months (only the era or
// year numbering differs) and the Gregorian calendar otherwise.
//
// Inside this module `Calendar` names the generated view, so the Foundation
// type is always spelled `Foundation.Calendar`.

public struct FsdsDateGridDay: Identifiable, Equatable, Sendable {
    /// Local calendar day as YYYY-MM-DD.
    public let id: String
    public let date: Date
    public let label: String
    public let fullLabel: String
    public let isSelected: Bool
    public let isToday: Bool
    public let isDisabled: Bool
    public let isOutsideMonth: Bool
}

public struct FsdsDateGridWeek: Identifiable, Equatable, Sendable {
    public let id: String
    public let days: [FsdsDateGridDay]
}

public struct FsdsDateGridWeekday: Identifiable, Equatable, Sendable {
    public let id: Int
    public let short: String
    public let long: String
}

public struct FsdsDateGridState: Equatable, Sendable {
    /// The first day of the visible month.
    public let month: Date
    public let caption: String
    public let weekdays: [FsdsDateGridWeekday]
    public let weeks: [FsdsDateGridWeek]
    public let previousDisabled: Bool
    public let nextDisabled: Bool
    public let isDisabled: Bool
    /// The locale's own name for the current day, announced as its value.
    public let todayName: String
}

public enum FsdsDateGrid {
    private static let weeks = 6
    private static let weekLength = 7
    private static let gregorianMonthCalendars: Set<Foundation.Calendar.Identifier> = [
        .gregorian, .iso8601, .buddhist, .japanese, .republicOfChina,
    ]

    /// A BCP 47 tag as a Locale; an empty tag is the current locale.
    public static func locale(_ tag: String) -> Locale {
        tag.isEmpty ? Locale.current : Locale(identifier: tag)
    }

    /// The Gregorian grid calendar, starting its weeks on the locale's first weekday.
    public static func gridCalendar(_ locale: Locale, timeZone: TimeZone = .current) -> Foundation.Calendar {
        var calendar = Foundation.Calendar(identifier: .gregorian)
        calendar.locale = locale
        calendar.timeZone = timeZone
        calendar.firstWeekday = locale.calendar.firstWeekday
        return calendar
    }

    private static func formatCalendar(_ locale: Locale, timeZone: TimeZone) -> Foundation.Calendar {
        var calendar = gregorianMonthCalendars.contains(locale.calendar.identifier)
            ? Foundation.Calendar(identifier: locale.calendar.identifier)
            : Foundation.Calendar(identifier: .gregorian)
        calendar.locale = locale
        calendar.timeZone = timeZone
        return calendar
    }

    private static func formatter(_ locale: Locale, _ calendar: Foundation.Calendar, template: String? = nil, style: DateFormatter.Style? = nil) -> DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        if let style {
            formatter.dateStyle = style
            formatter.timeStyle = .none
        } else if let template {
            formatter.setLocalizedDateFormatFromTemplate(template)
        }
        return formatter
    }

    /// The locale's name for the current day ("Today"), capitalized as the
    /// separate phrase VoiceOver speaks it as after the day's label.
    public static func todayName(_ locale: Locale) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = locale
        formatter.dateTimeStyle = .named
        formatter.formattingContext = .beginningOfSentence
        return formatter.localizedString(from: DateComponents(day: 0))
    }

    /// The first day of the month `months` after the one `month` falls in.
    public static func addMonths(_ month: Date, _ months: Int, timeZone: TimeZone = .current) -> Date {
        let calendar = gridCalendar(Locale(identifier: "en_US_POSIX"), timeZone: timeZone)
        let first = calendar.date(from: calendar.dateComponents([.year, .month], from: month))!
        return calendar.date(byAdding: .month, value: months, to: first)!
    }

    /// Same visible month: the grid only reports a month change across months.
    public static func isSameMonth(_ date: Date, _ other: Date, timeZone: TimeZone = .current) -> Bool {
        gridCalendar(Locale(identifier: "en_US_POSIX"), timeZone: timeZone).isDate(date, equalTo: other, toGranularity: .month)
    }

    /// The selection after activating `day`. A range pairs a lone start with
    /// the activated day as a sorted [start, end] span and otherwise starts a
    /// new span; a single selection is the day itself.
    public static func select(_ selection: [Date], day: Date, range: Bool) -> [Date] {
        guard range, selection.count == 1 else { return [day] }
        let start = selection[0]
        return start <= day ? [start, day] : [day, start]
    }

    /// Derive the grid. `month` is any date inside the visible month; nil
    /// follows the selection, then today. `caption` replaces the formatted
    /// month and year when set.
    public static func compute(
        selection: [Date],
        month: Date?,
        range: Bool,
        locale tag: String,
        minDate: Date? = nil,
        maxDate: Date? = nil,
        disabled: Bool = false,
        caption: String? = nil,
        today: Date = Date(),
        timeZone: TimeZone = .current
    ) -> FsdsDateGridState {
        let locale = locale(tag)
        let grid = gridCalendar(locale, timeZone: timeZone)
        let format = formatCalendar(locale, timeZone: timeZone)
        let days = selection.map { grid.startOfDay(for: $0) }
        let now = grid.startOfDay(for: today)
        let first = grid.date(from: grid.dateComponents([.year, .month], from: month ?? days.first ?? now))!
        let min = minDate.map { grid.startOfDay(for: $0) }
        let max = maxDate.map { grid.startOfDay(for: $0) }
        func outOfBounds(_ day: Date) -> Bool {
            (min.map { day < $0 } ?? false) || (max.map { day > $0 } ?? false)
        }
        func selected(_ day: Date) -> Bool {
            if range && days.count >= 2 {
                let (start, end) = days[0] <= days[1] ? (days[0], days[1]) : (days[1], days[0])
                return day >= start && day <= end
            }
            return days.contains(day)
        }
        let lead = (grid.component(.weekday, from: first) - grid.firstWeekday + weekLength) % weekLength
        let start = grid.date(byAdding: .day, value: -lead, to: first)!

        let dayLabel = formatter(locale, format, template: "d")
        let fullLabel = formatter(locale, format, style: .full)
        let captionFormat = formatter(locale, format, template: "yMMMM")

        let rows = (0..<weeks).map { row in
            let cells = (0..<weekLength).map { column -> FsdsDateGridDay in
                let day = grid.date(byAdding: .day, value: row * weekLength + column, to: start)!
                let parts = grid.dateComponents([.year, .month, .day], from: day)
                return FsdsDateGridDay(
                    id: String(format: "%04d-%02d-%02d", parts.year!, parts.month!, parts.day!),
                    date: day,
                    label: dayLabel.string(from: day),
                    fullLabel: fullLabel.string(from: day),
                    isSelected: selected(day),
                    isToday: day == now,
                    isDisabled: disabled || outOfBounds(day),
                    isOutsideMonth: !grid.isDate(day, equalTo: first, toGranularity: .month)
                )
            }
            return FsdsDateGridWeek(id: cells[0].id, days: cells)
        }
        let weekdays = rows[0].days.map { day -> FsdsDateGridWeekday in
            let index = grid.component(.weekday, from: day.date) - 1
            return FsdsDateGridWeekday(
                id: index,
                short: format.shortStandaloneWeekdaySymbols[index],
                long: format.standaloneWeekdaySymbols[index]
            )
        }
        let previousLast = grid.date(byAdding: .day, value: -1, to: first)!
        let nextFirst = grid.date(byAdding: .month, value: 1, to: first)!
        return FsdsDateGridState(
            month: first,
            caption: caption ?? captionFormat.string(from: first),
            weekdays: weekdays,
            weeks: rows,
            previousDisabled: disabled || (min.map { previousLast < $0 } ?? false),
            nextDisabled: disabled || (max.map { nextFirst > $0 } ?? false),
            isDisabled: disabled,
            todayName: todayName(locale)
        )
    }
}
