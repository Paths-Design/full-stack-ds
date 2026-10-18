// FsdsDateGrid — the JVM realization of the contract's date-grid fact: the
// visible month, its six-week day grid, range-span selection, bounds and
// locale formatting. The web and React Native targets realize the same fact
// through packages/ds-codegen/src/date/date-grid.ts; this file mirrors that
// derivation over java.time so every target derives the same grid from the
// same channels.
//
// Days are local calendar days resolved in `FsdsDate.zone`, so arithmetic
// never crosses a daylight-saving boundary by an hour. Formatting is
// Gregorian (ISO chronology) with the locale's own digits.
//
// This file is NOT generated; it is committed substrate, like FsdsDate.kt.
// java.time only, so it stays usable from any JVM target.

package com.fullstackds.date

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DecimalStyle
import java.time.format.FormatStyle
import java.time.temporal.WeekFields
import java.util.Date
import java.util.Locale

data class FsdsDateGridDay(
    /** Local calendar day as YYYY-MM-DD. */
    val key: String,
    val date: Date,
    val label: String,
    val fullLabel: String,
    val selected: Boolean,
    val isToday: Boolean,
    val disabled: Boolean,
    val outsideMonth: Boolean,
)

data class FsdsDateGridWeek(val key: String, val days: List<FsdsDateGridDay>)

data class FsdsDateGridWeekday(val key: String, val short: String, val long: String)

data class FsdsDateGridState(
    /** The first day of the visible month. */
    val month: Date,
    val caption: String,
    val weekdays: List<FsdsDateGridWeekday>,
    val weeks: List<FsdsDateGridWeek>,
    val previousDisabled: Boolean,
    val nextDisabled: Boolean,
    val disabled: Boolean,
)

object FsdsDateGrid {
    private const val WEEKS = 6
    private const val WEEK_LENGTH = 7

    /** A BCP 47 tag as a Locale; a blank tag is the JVM default locale. */
    fun locale(tag: String?): Locale =
        if (tag.isNullOrBlank()) Locale.getDefault() else Locale.forLanguageTag(tag)

    /** The locale's first day of the week, from its region's CLDR week data. */
    fun weekStart(locale: Locale): DayOfWeek = WeekFields.of(locale).firstDayOfWeek

    private fun date(day: LocalDate): Date =
        Date.from(day.atStartOfDay(FsdsDate.zone).toInstant())

    /** The first day of the month `months` after the one `month` falls in. */
    fun addMonths(month: Date, months: Int): Date =
        date(FsdsDate.dayOf(month).withDayOfMonth(1).plusMonths(months.toLong()))

    /** Same visible month: the grid only reports a month change across months. */
    fun isSameMonth(date: Date, other: Date): Boolean {
        val a = FsdsDate.dayOf(date)
        val b = FsdsDate.dayOf(other)
        return a.year == b.year && a.month == b.month
    }

    /**
     * The selection after activating `day`. A range pairs a lone start with
     * the activated day as a sorted [start, end] span and otherwise starts a
     * new span; a single selection is the day itself.
     */
    fun select(selection: List<Date>, day: Date, range: Boolean): List<Date> {
        if (!range || selection.size != 1) return listOf(day)
        val start = selection[0]
        return if (FsdsDate.dayOf(start) <= FsdsDate.dayOf(day)) listOf(start, day) else listOf(day, start)
    }

    private fun isSelected(day: LocalDate, selection: List<LocalDate>, range: Boolean): Boolean {
        if (range && selection.size >= 2) {
            val start = minOf(selection[0], selection[1])
            val end = maxOf(selection[0], selection[1])
            return day in start..end
        }
        return selection.any { it == day }
    }

    private fun formatter(pattern: String, locale: Locale): DateTimeFormatter =
        DateTimeFormatter.ofLocalizedPattern(pattern).withLocale(locale).withDecimalStyle(DecimalStyle.of(locale))

    /**
     * Derive the grid. `month` is any date inside the visible month; null
     * follows the selection, then today. `caption` replaces the formatted
     * month and year when set.
     */
    fun compute(
        selection: List<Date>,
        month: Date?,
        range: Boolean,
        locale: String?,
        minDate: Date? = null,
        maxDate: Date? = null,
        disabled: Boolean = false,
        caption: String? = null,
        today: LocalDate = LocalDate.now(FsdsDate.zone),
    ): FsdsDateGridState {
        val resolvedLocale = locale(locale)
        val days = selection.map(FsdsDate::dayOf)
        val first = (month?.let(FsdsDate::dayOf) ?: days.firstOrNull() ?: today).withDayOfMonth(1)
        val min = minDate?.let(FsdsDate::dayOf)
        val max = maxDate?.let(FsdsDate::dayOf)
        fun outOfBounds(day: LocalDate) = (min != null && day < min) || (max != null && day > max)

        val weekStart = weekStart(resolvedLocale)
        val lead = (first.dayOfWeek.value - weekStart.value + WEEK_LENGTH) % WEEK_LENGTH
        val gridStart = first.minusDays(lead.toLong())

        val dayLabel = formatter("d", resolvedLocale)
        val fullLabel = DateTimeFormatter.ofLocalizedDate(FormatStyle.FULL)
            .withLocale(resolvedLocale)
            .withDecimalStyle(DecimalStyle.of(resolvedLocale))
        val shortWeekday = DateTimeFormatter.ofPattern("ccc", resolvedLocale)
        val longWeekday = DateTimeFormatter.ofPattern("cccc", resolvedLocale)
        val captionFormat = formatter("yMMMM", resolvedLocale)

        val weeks = (0 until WEEKS).map { row ->
            val cells = (0 until WEEK_LENGTH).map { column ->
                val day = gridStart.plusDays((row * WEEK_LENGTH + column).toLong())
                FsdsDateGridDay(
                    key = day.toString(),
                    date = date(day),
                    label = dayLabel.format(day),
                    fullLabel = fullLabel.format(day),
                    selected = isSelected(day, days, range),
                    isToday = day == today,
                    disabled = disabled || outOfBounds(day),
                    outsideMonth = day.month != first.month || day.year != first.year,
                )
            }
            FsdsDateGridWeek(cells.first().key, cells)
        }
        val weekdays = (0 until WEEK_LENGTH).map { column ->
            val day = gridStart.plusDays(column.toLong())
            FsdsDateGridWeekday(day.dayOfWeek.name, shortWeekday.format(day), longWeekday.format(day))
        }
        val last = first.plusMonths(1).minusDays(1)
        return FsdsDateGridState(
            month = date(first),
            caption = caption ?: captionFormat.format(first),
            weekdays = weekdays,
            weeks = weeks,
            previousDisabled = disabled || (min != null && first.minusDays(1) < min),
            nextDisabled = disabled || (max != null && last.plusDays(1) > max),
            disabled = disabled,
        )
    }
}
