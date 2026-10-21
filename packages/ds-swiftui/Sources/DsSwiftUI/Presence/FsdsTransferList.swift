import Foundation

/// Foundation counterpart of the web transfer-list core
/// (packages/ds-codegen/src/transfer/transfer-list.ts) for a dual-listbox
/// transfer. Hand-maintained: the selected list is the value, in the order
/// items were moved into it; the available list is every option outside the
/// value, in options order. Moving items returns the next value, or nil when
/// nothing marked is on that side.
public enum FsdsTransferList {
    /// The options outside `value`, first occurrence only, in options order.
    public static func available(options: [String], value: [String]) -> [String] {
        var seen = Set(value)
        return options.filter { seen.insert($0).inserted }
    }

    /// The value without repeats, in transfer order.
    public static func selected(value: [String]) -> [String] {
        var seen = Set<String>()
        return value.filter { seen.insert($0).inserted }
    }

    /// The value after moving the marked available items to its end, in
    /// options order; nil when no available item is marked.
    public static func adding(_ marked: Set<String>, options: [String], value: [String]) -> [String]? {
        let moving = available(options: options, value: value).filter { marked.contains($0) }
        return moving.isEmpty ? nil : selected(value: value) + moving
    }

    /// The value after moving the marked selected items back; nil when no
    /// selected item is marked.
    public static func removing(_ marked: Set<String>, value: [String]) -> [String]? {
        let current = selected(value: value)
        let moving = current.filter { marked.contains($0) }
        return moving.isEmpty ? nil : current.filter { !moving.contains($0) }
    }
}
