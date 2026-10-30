package com.fullstackds.components.semantics

import androidx.compose.foundation.text.BasicText
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.runComposeUiTest
import com.fullstackds.components.popover.Popover
import com.fullstackds.components.select.Select
import com.fullstackds.components.select.SelectOption
import com.fullstackds.components.tabs.Tabs
import com.fullstackds.components.tabs.TabsTab
import com.fullstackds.components.walkthrough.Walkthrough
import kotlin.test.Test

// Roles and selection are platform semantics: TalkBack announces them in the
// device's language, where a component-authored stateDescription is English.
@OptIn(ExperimentalTestApi::class)
class RoleSemanticsTest {
    private fun SemanticsNodeInteraction.assertRole(role: Role) =
        assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, role))

    @Test
    fun tabsAreSelectableTabsWhoseSelectionFollowsTheActiveTab() = runComposeUiTest {
        setContent {
            Tabs(defaultValue = "a") {
                TabsTab(key = "a") { BasicText("Alpha") }
                TabsTab(key = "b") { BasicText("Beta") }
            }
        }
        val alpha = onNodeWithText("Alpha")
        val beta = onNodeWithText("Beta")
        alpha.assertRole(Role.Tab).assertIsSelected()
        beta.assertRole(Role.Tab).assertIsNotSelected()
        alpha.assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))

        beta.performClick()
        beta.assertIsSelected()
        alpha.assertIsNotSelected()
    }

    @Test
    fun walkthroughStepButtonsAreButtons() = runComposeUiTest {
        setContent { Walkthrough(onNext = {}, onPrevious = {}) }
        onNodeWithText("Previous").assertRole(Role.Button)
        onNodeWithText("Next").assertRole(Role.Button)
    }

    @Test
    fun aPopoverTriggerIsAButton() = runComposeUiTest {
        setContent { Popover(trigger = { BasicText("Details") }) { BasicText("Panel") } }
        onNodeWithText("Details").assertRole(Role.Button)
    }

    @Test
    fun aSelectTriggerIsADropdownList() = runComposeUiTest {
        setContent { Select(options = listOf(SelectOption("a", "Alpha"))) }
        onNodeWithText("Select an option").assertRole(Role.DropdownList)
    }
}
