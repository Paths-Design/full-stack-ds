package com.fullstackds.components.calendar

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.runComposeUiTest
import com.fullstackds.date.FsdsDate
import java.time.LocalDate
import java.time.ZoneId
import java.util.Date
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Drives the generated Calendar through its semantics tree: the grid is
 * derived from the month channel, the nav controls move it, day names and
 * the caption follow the locale, and selection is Compose `selected` state.
 * March 1, 2031 is a Saturday.
 */
@OptIn(ExperimentalTestApi::class)
class CalendarSemanticsTest {
    private val zone = ZoneId.of("UTC")

    @BeforeTest
    fun pinZone() {
        FsdsDate.zone = zone
    }

    private fun day(year: Int, month: Int, dayOfMonth: Int): Date =
        Date.from(LocalDate.of(year, month, dayOfMonth).atStartOfDay(zone).toInstant())

    @Test
    fun theNavControlsMoveTheMonthChannel() = runComposeUiTest {
        val months = mutableListOf<Date>()
        setContent { Calendar(defaultMonth = day(2031, 3, 1), onMonthChange = { months += it }) }
        onNodeWithText("March 2031").assert(SemanticsMatcher.expectValue(SemanticsProperties.LiveRegion, LiveRegionMode.Polite))
        onNodeWithContentDescription("Next month").performClick()
        onNodeWithText("April 2031").assertExists()
        onNodeWithContentDescription("Previous month").performClick()
        onNodeWithContentDescription("Previous month").performClick()
        onNodeWithText("February 2031").assertExists()
        assertEquals(listOf(day(2031, 4, 1), day(2031, 3, 1), day(2031, 2, 1)), months)
    }

    @Test
    fun theGridIsSixWeeksOfSevenNamedDays() = runComposeUiTest {
        setContent { Calendar(defaultMonth = day(2031, 3, 1)) }
        val grid = onNodeWithContentDescription("March 2031").fetchSemanticsNode()
        val info = grid.config[SemanticsProperties.CollectionInfo]
        assertEquals(6 to 7, info.rowCount to info.columnCount)
        onNodeWithContentDescription("Sunday").assertExists()
        // The en-US grid opens on the Sunday before March 1 and closes on April 5.
        onNodeWithContentDescription("Sunday, February 23, 2031").assertExists()
        onNodeWithContentDescription("Saturday, April 5, 2031").assertExists()
    }

    @Test
    fun activationSelectsADayAndReportsIt() = runComposeUiTest {
        val values = mutableListOf<Date?>()
        setContent { Calendar(defaultMonth = day(2031, 3, 1), onChange = { values += it }) }
        val tenth = onNodeWithContentDescription("Monday, March 10, 2031")
        tenth.assertIsNotSelected()
        tenth.performClick()
        tenth.assertIsSelected()
        onNodeWithContentDescription("Tuesday, March 11, 2031").assertIsNotSelected()
        assertEquals(listOf<Date?>(day(2031, 3, 10)), values)
    }

    @Test
    fun aControlledNullIsAClearedSelection() = runComposeUiTest {
        // The parent starts empty, accepts a tap, then clears; the tapped day
        // must not reappear from uncontrolled state when the value is null again.
        var selected by mutableStateOf<Date?>(null)
        setContent { Calendar(value = selected, defaultMonth = day(2031, 3, 1), onChange = { selected = it }) }
        val tenth = onNodeWithContentDescription("Monday, March 10, 2031")
        tenth.performClick()
        tenth.assertIsSelected()
        selected = null
        tenth.assertIsNotSelected()
    }

    @Test
    fun aControlledNullHidesTheDefault() = runComposeUiTest {
        setContent { Calendar(value = null, defaultValue = day(2031, 3, 10), defaultMonth = day(2031, 3, 1)) }
        onNodeWithContentDescription("Monday, March 10, 2031").assertIsNotSelected()
    }

    @Test
    fun aRangePairsTwoActivationsIntoASelectedSpan() = runComposeUiTest {
        val ranges = mutableListOf<List<Date>>()
        setContent {
            Calendar(defaultMonth = day(2031, 3, 1), mode = CalendarMode.Range, onValuesChange = { ranges += it })
        }
        onNodeWithContentDescription("Wednesday, March 12, 2031").performClick()
        onNodeWithContentDescription("Monday, March 10, 2031").performClick()
        for (label in listOf("Monday, March 10, 2031", "Tuesday, March 11, 2031", "Wednesday, March 12, 2031")) {
            onNodeWithContentDescription(label).assertIsSelected()
        }
        onNodeWithContentDescription("Thursday, March 13, 2031").assertIsNotSelected()
        assertEquals(listOf(listOf(day(2031, 3, 12)), listOf(day(2031, 3, 10), day(2031, 3, 12))), ranges)
    }

    @Test
    fun selectingAnOutsideDayShowsItsMonth() = runComposeUiTest {
        val months = mutableListOf<Date>()
        setContent { Calendar(defaultMonth = day(2031, 3, 1), onMonthChange = { months += it }) }
        onNodeWithContentDescription("Friday, February 28, 2031").performClick()
        onNodeWithText("February 2031").assertExists()
        assertEquals(listOf(day(2031, 2, 1)), months)
    }

    @Test
    fun boundsDisableTheDaysAndNavigationBeyondThem() = runComposeUiTest {
        setContent {
            Calendar(defaultMonth = day(2031, 3, 1), minDate = day(2031, 3, 5), maxDate = day(2031, 4, 2))
        }
        onNodeWithContentDescription("Previous month").assertIsNotEnabled()
        onNodeWithContentDescription("Next month").assertIsEnabled()
        onNodeWithContentDescription("Tuesday, March 4, 2031").assertIsNotEnabled()
        onNodeWithContentDescription("Wednesday, March 5, 2031").assertIsEnabled()
    }

    @Test
    fun labelsFollowTheLocale() = runComposeUiTest {
        setContent { Calendar(defaultMonth = day(2031, 3, 1), locale = "de-DE") }
        onNodeWithText("März 2031").assertExists()
        onNodeWithContentDescription("Montag").assertExists()
        // The de-DE week opens on Monday, so the grid starts on February 24.
        onNodeWithContentDescription("Montag, 24. Februar 2031").assertExists()
        onNodeWithContentDescription("Montag, 10. März 2031").assertExists()
    }
}
