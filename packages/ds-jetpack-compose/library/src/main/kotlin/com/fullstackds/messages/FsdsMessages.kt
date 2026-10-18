package com.fullstackds.messages

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf

// Hand-maintained runtime (alongside FsdsTheme) — NOT generated.
// The Compose realization of the contract message catalog: generated
// composables default every message-backed parameter to
// `LocalFsdsMessages.current.string("<Component>.<key>", "<contract default>")`,
// so an explicit argument wins, then the provided catalog, then the default.
//
// Resolution order for `<Component>.<key>`:
//   1. `overrides` (a flat map, e.g. loaded from a translation file)
//   2. `resolve` (a host bridge, e.g. to Android string resources — resource
//      names cannot contain `.`, so the bridge owns its key mapping)
//   3. the contract's `defaultMessage`, baked into the generated call site
//
// Templates use the contract placeholder syntax (`{count}`), not
// `String.format` specifiers, so translators reorder parameters freely and
// the same text is valid on every target. Plural selection is not supported.
@Immutable
class FsdsMessages(
    private val overrides: Map<String, String> = emptyMap(),
    private val resolve: ((key: String) -> String?)? = null,
) {
    /** The localized template for [key], formatted with [params]. */
    fun string(key: String, default: String, params: Map<String, String> = emptyMap()): String {
        val template = overrides[key] ?: resolve?.invoke(key) ?: default
        return format(template, params)
    }

    companion object {
        /**
         * Substitutes `{name}` placeholders. An unknown placeholder is left in
         * place so a translation typo stays visible instead of vanishing.
         */
        fun format(template: String, params: Map<String, String>): String {
            if (params.isEmpty() || '{' !in template) return template
            val out = StringBuilder()
            var index = 0
            while (index < template.length) {
                val open = template.indexOf('{', index)
                if (open < 0) break
                val close = template.indexOf('}', open + 1)
                if (close < 0) break
                out.append(template, index, open)
                val name = template.substring(open + 1, close)
                out.append(params[name] ?: template.substring(open, close + 1))
                index = close + 1
            }
            out.append(template, index, template.length)
            return out.toString()
        }
    }
}

/** The message catalog generated composables resolve their chrome text from. */
val LocalFsdsMessages = staticCompositionLocalOf { FsdsMessages() }
