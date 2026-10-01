package com.fullstackds.tokens

import com.fullstackds.components.switch.switchTokenScopes
import com.fullstackds.components.toggleswitch.toggleSwitchTokenScopes
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

/** Uses the actual generated dictionaries, not a synthetic definition. */
class GeneratedToggleTokensTest {
    @Test
    fun switchStateDefinitionsResolveFallbacksAndThemeOverrides() {
        val root = switchTokenScopes.getValue("root")
        val checked = switchTokenScopes.getValue("checked")
        val disabled = switchTokenScopes.getValue("disabled")
        val slot = "switch.color.track.background"
        assertEquals("#d0d0d0", FsdsTheme().resolve(root.getValue(slot)))
        assertEquals("#d92d2e", FsdsTheme().resolve(checked.getValue(slot)))
        assertEquals("#d0d0d0", FsdsTheme().resolve(disabled.getValue(slot)))
        assertEquals("#112233", FsdsTheme(mapOf("semantic.color.foreground.accent" to "#112233")).resolve(checked.getValue(slot)))
        assertEquals("#abcdef", FsdsTheme(mapOf(slot to "#abcdef", "semantic.color.foreground.accent" to "#112233")).resolve(checked.getValue(slot)))
        assertEquals("48px", FsdsTheme().resolve(root.getValue("switch.size.md.track.width")))
        assertFalse(root.containsKey("box-model.gap"))
    }

    @Test
    fun bothTogglesRetainOnlyUsedBoxGeometry() {
        for (scopes in listOf(switchTokenScopes, toggleSwitchTokenScopes)) {
            val root = scopes.getValue("root")
            assertEquals("4px", FsdsTheme().resolve(root.getValue("box-model.padding-block-start")))
            assertEquals("8px", FsdsTheme().resolve(root.getValue("box-model.padding-inline-end")))
            assertEquals("32px", FsdsTheme().resolve(root.getValue("box-model.min-height")))
            assertEquals("12px", FsdsTheme(mapOf("box-model.padding-block-start" to "12px")).resolve(root.getValue("box-model.padding-block-start")))
            assertFalse(root.containsKey("box-model.gap"))
        }
    }
}
