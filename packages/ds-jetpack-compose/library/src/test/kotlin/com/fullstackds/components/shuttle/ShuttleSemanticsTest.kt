package com.fullstackds.components.shuttle

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.runComposeUiTest
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Drives the generated Shuttle through its semantics tree: both lists are
 * named from the catalog, a tap marks an item as Compose `selected` state,
 * and the add and remove controls move the marked items and report the value.
 */
@OptIn(ExperimentalTestApi::class)
class ShuttleSemanticsTest {
    private val options = listOf("alpha", "beta", "gamma")

    @Test
    fun bothListsAreNamedFromTheCatalog() = runComposeUiTest {
        setContent { Shuttle(options = options, defaultValue = listOf("gamma")) }
        onNodeWithContentDescription("Available").assertExists()
        onNodeWithContentDescription("Selected").assertExists()
    }

    @Test
    fun aTapMarksAnItemAsSelectedAndEnablesItsControl() = runComposeUiTest {
        setContent { Shuttle(options = options, defaultValue = listOf("gamma")) }
        onNodeWithText("Add").assertIsNotEnabled()
        onNodeWithText("Remove").assertIsNotEnabled()
        onNodeWithText("beta").assertIsNotSelected().performClick()
        onNodeWithText("beta").assertIsSelected()
        onNodeWithText("Add").assertIsEnabled()
        onNodeWithText("Remove").assertIsNotEnabled()
        onNodeWithText("beta").performClick()
        onNodeWithText("beta").assertIsNotSelected()
        onNodeWithText("Add").assertIsNotEnabled()
    }

    @Test
    fun addAndRemoveMoveTheMarkedItemsAndReportTheValue() = runComposeUiTest {
        val values = mutableListOf<List<String>>()
        setContent { Shuttle(options = options, defaultValue = listOf("gamma"), onValueChange = { values += it }) }
        onNodeWithText("alpha").performClick()
        onNodeWithText("beta").performClick()
        onNodeWithText("Add").performClick()
        onNodeWithText("alpha").assertIsNotSelected()
        onNodeWithText("Add").assertIsNotEnabled()
        onNodeWithText("gamma").performClick()
        onNodeWithText("Remove").performClick()
        assertEquals(listOf(listOf("gamma", "alpha", "beta"), listOf("alpha", "beta")), values)
    }
}
