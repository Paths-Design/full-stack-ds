// FsdsDate — the local calendar day a java.util.Date falls on, the one
// conversion the JVM date grid (FsdsDateGrid) derives every day from.
//
// A java.util.Date carries an instant, not a calendar day, so the zone is
// resolved exactly once and calendar days are compared rather than
// millisecond instants: two Dates 12 hours apart are the same day when they
// fall on the same local day, and different days across midnight.
//
// This file is NOT generated; it is committed substrate, like FsdsTheme.kt
// and FsdsSvgPath.kt. Zero androidx.compose.material imports: java.time
// only, so it stays usable from any JVM target.

package com.fullstackds.date

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Date

object FsdsDate {
    /** The zone day boundaries are resolved in. Overridable so a caller (or a
     *  test) can pin the calendar day without mutating the process default. */
    var zone: ZoneId = ZoneId.systemDefault()

    /** The local calendar day an instant falls on. */
    fun dayOf(date: Date): LocalDate =
        Instant.ofEpochMilli(date.time).atZone(zone).toLocalDate()
}
