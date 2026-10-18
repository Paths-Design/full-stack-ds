package com.fullstackds.messages

import kotlin.test.Test
import kotlin.test.assertEquals

// Resolution-order tests for the Compose message runtime: overrides beat the
// host resolver, the resolver beats the contract default the generated
// default argument bakes in, and `{name}` placeholders follow the
// translator's word order.
class FsdsMessagesTest {
    @Test
    fun missingKeyFallsBackToContractDefault() {
        assertEquals("Next slide", FsdsMessages().string("Carousel.nextSlide", "Next slide"))
    }

    @Test
    fun resolverBeatsContractDefaultAndMissesFallThrough() {
        val messages = FsdsMessages(resolve = { key -> if (key == "Chip.dismiss") "Retirer" else null })
        assertEquals("Retirer", messages.string("Chip.dismiss", "Remove"))
        assertEquals(
            "Dismiss",
            messages.string("Alert.dismiss", "Dismiss"),
            "a resolver miss leaves the key on its contract default",
        )
    }

    @Test
    fun overrideBeatsResolver() {
        val messages = FsdsMessages(
            overrides = mapOf("Walkthrough.skip" to "Ignorer"),
            resolve = { "Passer" },
        )
        assertEquals("Ignorer", messages.string("Walkthrough.skip", "Skip"))
    }

    @Test
    fun paramsFollowTranslatorWordOrder() {
        val messages = FsdsMessages(overrides = mapOf("Carousel.slidePosition" to "{count} 枚中 {index} 枚目"))
        assertEquals(
            "3 枚中 2 枚目",
            messages.string("Carousel.slidePosition", "{index} of {count}", mapOf("index" to "2", "count" to "3")),
        )
    }

    @Test
    fun defaultTemplateIsFormattedToo() {
        assertEquals("of 12", FsdsMessages().string("PageNavigator.pageCount", "of {count}", mapOf("count" to "12")))
    }

    @Test
    fun unknownPlaceholderStaysVisible() {
        assertEquals("1 of {total}", FsdsMessages.format("{index} of {total}", mapOf("index" to "1")))
        assertEquals("100% {", FsdsMessages.format("100% {", mapOf("x" to "y")), "an unclosed brace is literal")
        assertEquals("zz", FsdsMessages.format("{a}{a}", mapOf("a" to "z")), "every occurrence is replaced")
    }
}
