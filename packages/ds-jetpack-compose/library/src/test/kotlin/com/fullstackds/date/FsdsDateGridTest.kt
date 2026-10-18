package com.fullstackds.date

import java.time.LocalDate
import java.time.ZoneId
import java.util.Date
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Pins the JVM date-grid derivation against the same March 2031 fixtures the
 * web core is pinned with (March 1, 2031 is a Saturday): the grid is derived
 * from the month, starts on the locale's first weekday, labels in the
 * locale's language and digits, spans a range, and reports bounds.
 */
class FsdsDateGridTest {
    private val zone = ZoneId.of("UTC")
    private val today = LocalDate.of(2031, 3, 18)

    @BeforeTest
    fun pinZone() {
        FsdsDate.zone = zone
    }

    private fun day(year: Int, month: Int, dayOfMonth: Int): Date =
        Date.from(LocalDate.of(year, month, dayOfMonth).atStartOfDay(zone).toInstant())

    private fun grid(
        locale: String = "en-US",
        selection: List<Date> = emptyList(),
        month: Date? = day(2031, 3, 1),
        range: Boolean = false,
        minDate: Date? = null,
        maxDate: Date? = null,
        disabled: Boolean = false,
        caption: String? = null,
    ) = FsdsDateGrid.compute(selection, month, range, locale, minDate, maxDate, disabled, caption, today)

    private fun FsdsDateGridState.days() = weeks.flatMap { it.days }
    private fun FsdsDateGridState.find(key: String) = days().single { it.key == key }

    @Test
    fun derivesSixWeeksFromTheMonthStartingOnTheLocaleWeekStart() {
        val us = grid("en-US")
        assertEquals(6, us.weeks.size)
        assertTrue(us.weeks.all { it.days.size == 7 })
        assertEquals("2031-02-23", us.days().first().key)
        assertEquals("2031-04-05", us.days().last().key)
        assertEquals("2031-02-24", grid("de-DE").days().first().key)
        assertEquals("2031-03-01", grid("ar-EG").days().first().key)
        assertEquals(listOf("SUNDAY", "MONDAY"), us.weekdays.take(2).map { it.key })
    }

    @Test
    fun labelsFollowTheLocaleLanguageAndDigits() {
        val us = grid("en-US")
        assertEquals("March 2031", us.caption)
        assertEquals("10", us.find("2031-03-10").label)
        assertEquals("Monday, March 10, 2031", us.find("2031-03-10").fullLabel)
        assertEquals(FsdsDateGridWeekday("MONDAY", "Mon", "Monday"), us.weekdays[1])

        val de = grid("de-DE")
        assertEquals("März 2031", de.caption)
        assertEquals("Montag, 10. März 2031", de.find("2031-03-10").fullLabel)
        assertEquals(FsdsDateGridWeekday("MONDAY", "Mo", "Montag"), de.weekdays[0])

        val ar = grid("ar-EG")
        assertEquals("مارس ٢٠٣١", ar.caption)
        assertEquals("١٠", ar.find("2031-03-10").label)
    }

    @Test
    fun anExplicitCaptionReplacesTheFormattedMonth() {
        assertEquals("Billing period", grid(caption = "Billing period").caption)
    }

    @Test
    fun marksOutsideMonthDaysAndToday() {
        val us = grid()
        assertTrue(us.find("2031-02-28").outsideMonth)
        assertFalse(us.find("2031-03-01").outsideMonth)
        assertEquals(listOf("2031-03-18"), us.days().filter { it.isToday }.map { it.key })
    }

    @Test
    fun aNullMonthFollowsTheSelectionThenToday() {
        assertEquals(day(2031, 7, 1), grid(month = null, selection = listOf(day(2031, 7, 14))).month)
        assertEquals(day(2031, 3, 1), grid(month = null).month)
    }

    @Test
    fun singleSelectionMarksExactlyTheSelectedDay() {
        val selected = grid(selection = listOf(day(2031, 3, 10))).days().filter { it.selected }.map { it.key }
        assertEquals(listOf("2031-03-10"), selected)
    }

    @Test
    fun aRangeSelectsEveryDayOfTheSpanInEitherOrder() {
        val span = listOf("2031-03-10", "2031-03-11", "2031-03-12")
        for (selection in listOf(listOf(day(2031, 3, 10), day(2031, 3, 12)), listOf(day(2031, 3, 12), day(2031, 3, 10)))) {
            val selected = grid(range = true, selection = selection).days().filter { it.selected }.map { it.key }
            assertEquals(span, selected)
        }
    }

    @Test
    fun activationPairsALoneRangeStartAndOtherwiseStartsOver() {
        val start = day(2031, 3, 12)
        assertEquals(listOf(day(2031, 3, 10), start), FsdsDateGrid.select(listOf(start), day(2031, 3, 10), range = true))
        assertEquals(listOf(start, day(2031, 3, 14)), FsdsDateGrid.select(listOf(start), day(2031, 3, 14), range = true))
        assertEquals(listOf(day(2031, 3, 20)), FsdsDateGrid.select(listOf(start, day(2031, 3, 14)), day(2031, 3, 20), range = true))
        assertEquals(listOf(day(2031, 3, 20)), FsdsDateGrid.select(listOf(start), day(2031, 3, 20), range = false))
    }

    @Test
    fun boundsDisableDaysAndTheNavigationThatLeavesThem() {
        val bounded = grid(minDate = day(2031, 3, 5), maxDate = day(2031, 3, 31))
        assertTrue(bounded.find("2031-03-04").disabled)
        assertFalse(bounded.find("2031-03-05").disabled)
        assertTrue(bounded.find("2031-04-01").disabled)
        assertTrue(bounded.previousDisabled)
        assertTrue(bounded.nextDisabled)
        val open = grid(minDate = day(2031, 2, 28), maxDate = day(2031, 4, 1))
        assertFalse(open.previousDisabled)
        assertFalse(open.nextDisabled)
    }

    @Test
    fun aDisabledGridDisablesEveryDayAndBothNavs() {
        val disabled = grid(disabled = true)
        assertTrue(disabled.days().all { it.disabled })
        assertTrue(disabled.previousDisabled && disabled.nextDisabled)
    }

    @Test
    fun monthStepsLandOnTheFirstDayAcrossYearEdges() {
        assertEquals(day(2031, 2, 1), FsdsDateGrid.addMonths(day(2031, 3, 31), -1))
        assertEquals(day(2032, 1, 1), FsdsDateGrid.addMonths(day(2031, 12, 15), 1))
        assertTrue(FsdsDateGrid.isSameMonth(day(2031, 3, 1), day(2031, 3, 31)))
        assertFalse(FsdsDateGrid.isSameMonth(day(2031, 3, 1), day(2032, 3, 1)))
    }
}
