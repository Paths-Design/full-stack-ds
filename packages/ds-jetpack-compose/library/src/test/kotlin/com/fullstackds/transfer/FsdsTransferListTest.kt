package com.fullstackds.transfer

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/**
 * Pins the JVM transfer-list derivation against the fixtures the web core is
 * pinned with: options alpha…epsilon, value [delta, alpha].
 */
class FsdsTransferListTest {
    private val options = listOf("alpha", "beta", "gamma", "delta", "epsilon")
    private val value = listOf("delta", "alpha")

    @Test
    fun availableIsTheOptionsOutsideTheValueInOptionsOrder() {
        assertEquals(listOf("beta", "gamma", "epsilon"), FsdsTransferList.available(options, value))
    }

    @Test
    fun selectedIsTheValueInTransferOrderWithoutRepeats() {
        assertEquals(listOf("delta", "alpha"), FsdsTransferList.selected(listOf("delta", "alpha", "delta")))
    }

    @Test
    fun addingAppendsTheMarkedAvailableItemsInOptionsOrder() {
        assertEquals(listOf("delta", "alpha", "beta", "epsilon"), FsdsTransferList.adding(setOf("epsilon", "beta"), options, value))
    }

    @Test
    fun addingIgnoresAMarkOnAnItemAlreadySelected() {
        assertNull(FsdsTransferList.adding(setOf("alpha"), options, value))
    }

    @Test
    fun removingKeepsTheRestInOrder() {
        assertEquals(listOf("delta", "gamma"), FsdsTransferList.removing(setOf("alpha"), listOf("delta", "alpha", "gamma")))
    }

    @Test
    fun removingNothingMarkedChangesNothing() {
        assertNull(FsdsTransferList.removing(emptySet(), value))
        assertNull(FsdsTransferList.removing(setOf("beta"), value))
    }
}
