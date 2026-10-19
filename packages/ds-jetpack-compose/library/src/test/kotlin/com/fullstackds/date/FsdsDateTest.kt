package com.fullstackds.date

import java.time.LocalDate
import java.time.ZoneId
import java.util.Calendar
import java.util.Date
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Falsifies the day-granular contract of `FsdsDate`: a java.util.Date carries
 * an instant, so `dayOf` must name the local calendar day, not the instant.
 * The zone is pinned per test so the assertions do not depend on the
 * machine's default and cannot pass by accident at a particular hour.
 */
class FsdsDateTest {
    private val utc = ZoneId.of("UTC")

    @AfterTest
    fun restoreZone() {
        FsdsDate.zone = utc
    }

    private fun at(year: Int, month: Int, day: Int, hour: Int = 0, minute: Int = 0): Date =
        Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC")).apply {
            clear()
            set(year, month - 1, day, hour, minute, 0)
        }.time

    @Test
    fun theTimeOfDayDoesNotMoveTheDay() {
        FsdsDate.zone = utc
        assertEquals(LocalDate.of(2026, 3, 1), FsdsDate.dayOf(at(2026, 3, 1)))
        // 23:30 on the last day of the month is still that day, not the next.
        assertEquals(LocalDate.of(2026, 3, 31), FsdsDate.dayOf(at(2026, 3, 31, hour = 23, minute = 30)))
    }

    @Test
    fun theZoneDecidesTheDaySoAMidnightStraddleFlips() {
        val instant = at(2026, 3, 4, hour = 23, minute = 30)
        FsdsDate.zone = utc
        assertEquals(LocalDate.of(2026, 3, 4), FsdsDate.dayOf(instant))
        // +01:00 is past midnight, so the same instant is the 5th there.
        FsdsDate.zone = ZoneId.of("Europe/Berlin")
        assertEquals(LocalDate.of(2026, 3, 5), FsdsDate.dayOf(instant))
    }
}
