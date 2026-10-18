import Foundation
import SwiftUI

// Hand-maintained runtime (alongside ControllableValue) — NOT generated.
// The SwiftUI realization of the contract message catalog: every generated
// view resolves its chrome text through this value instead of carrying an
// English literal, so a host app localizes the design system the same way
// it localizes itself — a `FsdsComponents` strings table in its bundle.
//
// Resolution order for `<Component>.<key>`:
//   1. `overrides` (previews, tests, runtime-loaded catalogs)
//   2. the bundle's `FsdsComponents` table for the current locale
//   3. the contract's `defaultMessage`, baked into the generated call site
// An explicit component parameter (e.g. `label:`) wins over all three; the
// generated view applies that precedence before calling `string(_:default:)`.
//
// Templates use the contract placeholder syntax (`{count}`), not printf
// specifiers, so translators reorder parameters freely and the same table
// text is valid on every target. Plural/ICU selection is not supported.
public struct FsdsMessages: Sendable {
    public var bundle: Bundle
    public var table: String
    public var overrides: [String: String]

    public init(
        bundle: Bundle = .main,
        table: String = "FsdsComponents",
        overrides: [String: String] = [:]
    ) {
        self.bundle = bundle
        self.table = table
        self.overrides = overrides
    }

    /// The localized template for `key`, formatted with `params`.
    public func string(
        _ key: String,
        default defaultValue: String,
        params: [String: String] = [:]
    ) -> String {
        let template = overrides[key]
            ?? bundle.localizedString(forKey: key, value: defaultValue, table: table)
        return FsdsMessages.format(template, params)
    }

    /// Substitutes `{name}` placeholders. An unknown placeholder is left in
    /// place so a translation typo stays visible instead of silently vanishing.
    public static func format(_ template: String, _ params: [String: String]) -> String {
        guard !params.isEmpty, template.contains("{") else { return template }
        var result = ""
        var rest = Substring(template)
        while let open = rest.firstIndex(of: "{") {
            result += rest[..<open]
            let afterOpen = rest.index(after: open)
            guard let close = rest[afterOpen...].firstIndex(of: "}") else {
                rest = rest[open...]
                break
            }
            let name = String(rest[afterOpen..<close])
            if let value = params[name] {
                result += value
            } else {
                result += rest[open...close]
            }
            rest = rest[rest.index(after: close)...]
        }
        result += rest
        return result
    }
}

private struct FsdsMessagesKey: EnvironmentKey {
    static let defaultValue = FsdsMessages()
}

extension EnvironmentValues {
    public var fsdsMessages: FsdsMessages {
        get { self[FsdsMessagesKey.self] }
        set { self[FsdsMessagesKey.self] = newValue }
    }
}

extension View {
    /// Supplies the message catalog generated components resolve their
    /// chrome text from.
    public func fsdsMessages(_ messages: FsdsMessages) -> some View {
        environment(\.fsdsMessages, messages)
    }
}
