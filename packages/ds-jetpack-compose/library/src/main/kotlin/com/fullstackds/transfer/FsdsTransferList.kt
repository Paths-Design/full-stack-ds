// FsdsTransferList — the JVM realization of the contract's transfer fact: a
// dual-listbox whose selected list is the value, in the order items were moved
// into it, and whose available list is every option outside the value, in
// options order. The web and React Native targets realize the same fact
// through packages/ds-codegen/src/transfer/transfer-list.ts; SwiftUI through
// FsdsTransferList.swift.
//
// This file is NOT generated; it is committed substrate, like FsdsDateGrid.kt.
package com.fullstackds.transfer

object FsdsTransferList {
    /** The options outside [value], first occurrence only, in options order. */
    fun available(options: List<String>, value: List<String>): List<String> {
        val seen = value.toMutableSet()
        return options.filter { seen.add(it) }
    }

    /** The value without repeats, in transfer order. */
    fun selected(value: List<String>): List<String> = value.distinct()

    /** The value after moving the marked available items to its end, in options order; null when none is marked. */
    fun adding(marked: Set<String>, options: List<String>, value: List<String>): List<String>? {
        val moving = available(options, value).filter { it in marked }
        return if (moving.isEmpty()) null else selected(value) + moving
    }

    /** The value after moving the marked selected items back; null when none is marked. */
    fun removing(marked: Set<String>, value: List<String>): List<String>? {
        val current = selected(value)
        val moving = current.filter { it in marked }
        return if (moving.isEmpty()) null else current.filter { it !in moving }
    }
}
