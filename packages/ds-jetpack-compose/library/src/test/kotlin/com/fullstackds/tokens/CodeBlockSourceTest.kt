package com.fullstackds.tokens

import com.fullstackds.components.codeblock.CodeBlockToken
import com.fullstackds.components.codeblock.CodeBlockTokenType
import com.fullstackds.components.codeblock.codeBlockTokenScopes
import com.fullstackds.components.codeblock.fsdsSplitSource
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CodeBlockSourceTest {
    @Test
    fun suppliedTokensPreserveLfCrLfAndTrailingLine() {
        val code = "a\r\nb\n"
        val supplied = listOf(
            CodeBlockToken(CodeBlockTokenType.Keyword, "a\r"),
            CodeBlockToken(CodeBlockTokenType.String, "\nb\n"),
        )
        val (lines, highlighted) = fsdsSplitSource(code, supplied, true)
        assertTrue(highlighted)
        assertEquals(listOf("a", "b", ""), lines.map { line -> line.tokens.joinToString("") { it.text } })
    }

    @Test
    fun invalidOrDisabledTokensUseCanonicalPlainSource() {
        for (enabled in listOf(true, false)) {
            val (lines, highlighted) = fsdsSplitSource("actual", listOf(CodeBlockToken(CodeBlockTokenType.Keyword, "other")), enabled)
            assertFalse(highlighted)
            assertEquals("actual", lines.flatMap { it.tokens }.joinToString("") { it.text })
        }
    }

    @Test
    fun brandOverrideReachesSyntaxAndGutterSlots() {
        val root = codeBlockTokenScopes.getValue("root")
        val theme = FsdsTheme(mapOf(
            "code-block.token.color.keyword" to "#112233",
            "code-block.gutter.color.number" to "#445566",
        ))
        assertEquals("#112233", theme.resolve(root.getValue("code-block.token.color.keyword")))
        assertEquals("#445566", theme.resolve(root.getValue("code-block.gutter.color.number")))
    }
}
