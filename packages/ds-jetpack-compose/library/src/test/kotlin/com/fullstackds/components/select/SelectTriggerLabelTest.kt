package com.fullstackds.components.select

import kotlin.test.Test
import kotlin.test.assertEquals

// The trigger names the active selection; the (catalog-resolved) placeholder
// shows only when no option matches it.
class SelectTriggerLabelTest {
    private val options = listOf(SelectOption("a", "Alpha"), SelectOption("b", "Beta"))

    @Test
    fun singleModeShowsTheSelectedValueEvenWhenTheListIsEmpty() {
        assertEquals("Alpha", selectedOptionLabel(options, emptyList(), "a", multiple = false, placeholder = "Choisir"))
    }

    @Test
    fun singleModeIgnoresTheMultipleSelectionList() {
        assertEquals("Beta", selectedOptionLabel(options, listOf("a"), "b", multiple = false, placeholder = "Choisir"))
    }

    @Test
    fun multipleModeJoinsTheSelectedListInOptionOrderOfSelection() {
        assertEquals("Beta, Alpha", selectedOptionLabel(options, listOf("b", "a"), "", multiple = true, placeholder = "Choisir"))
    }

    @Test
    fun noMatchShowsThePlaceholder() {
        assertEquals("Choisir", selectedOptionLabel(options, emptyList(), "", multiple = false, placeholder = "Choisir"))
        assertEquals("Choisir", selectedOptionLabel(options, listOf("z"), "a", multiple = true, placeholder = "Choisir"))
    }
}
