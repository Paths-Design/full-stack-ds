// Unit tests for the UI-layer FilterState helpers added with the responsive
// shell (EXAMPLES-OPS-DASH-RESPONSIVE-01): `activeCount` drives the Filters
// toggle's count badge in the collapsed medium/narrow tiers, and collapsing
// must never change filter state (spec cross-tier invariant).

package com.fullstackds.examples.operationsdashboard

import com.fullstackds.examples.operationsdashboard.domain.Severity
import com.fullstackds.examples.operationsdashboard.ui.FilterState
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class FilterStateTest {

    @Test
    fun `activeCount counts one per axis value with zero for defaults`() {
        assertEquals(0, FilterState().activeCount, "default state has no active filters")
        assertEquals(1, FilterState(search = "latency").activeCount)
        assertEquals(1, FilterState(environment = "prod").activeCount)
        assertEquals(
            1,
            FilterState(severities = setOf(Severity.Critical)).activeCount,
            "one active severity checkbox counts once",
        )
        assertEquals(
            2,
            FilterState(severities = setOf(Severity.High, Severity.Low)).activeCount,
            "two active severity checkboxes count twice",
        )
        assertEquals(
            3,
            FilterState(environment = "prod", severities = setOf(Severity.High, Severity.Low)).activeCount,
        )
    }

    @Test
    fun `blank search does not count as an active filter`() {
        assertEquals(0, FilterState(search = "   ").activeCount)
        assertFalse(FilterState(search = "   ").active)
    }

    @Test
    fun `active stays consistent with activeCount`() {
        val state = FilterState(search = "1042")
        assertTrue(state.active)
        assertEquals(1, state.activeCount)
    }
}
