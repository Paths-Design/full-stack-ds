import SwiftUI

// Hand-maintained runtime (alongside ControllableValue) — NOT generated.
// The SwiftUI realization of the shared paged-position policy: position
// validity, the 1-based ordinal, the previous/next step guards, and the
// draft commit rule live here once, so the generated paged views lower onto
// the same semantics as every other target's paging runtime
// (createPagedSet on web/RN — SWIFTUI-PAGED-POSITION-ADMISSION-01).
//
// A value-type policy (not an ObservableObject): the position *channel*
// stays a ControllableValue<Int> in the generated view — the controllable-
// state substrate every other channel uses — and this struct derives the
// policy facts from (index, count, disabled) per evaluation. Draft text is
// view-local @State because it is presentation state, not contract state.
public struct FsdsPagedPosition: Equatable {
    public let index: Int
    public let count: Int
    public let disabled: Bool

    public init(index: Int, count: Int, disabled: Bool = false) {
        self.index = index
        self.count = count
        self.disabled = disabled
    }

    /// A position is valid when the count is a positive integer and the
    /// index sits inside it — the createPagedSet.sync validity rule.
    public var valid: Bool {
        count > 0 && index >= 0 && index < count
    }

    /// The state-level disabled rule: an invalid position disables every
    /// control regardless of the declared disabled prop.
    public var stateDisabled: Bool {
        !valid || disabled
    }

    /// The 1-based ordinal label; empty while the position is invalid —
    /// the createPagedSet ordinal rule.
    public var ordinal: String {
        valid ? String(index + 1) : ""
    }

    public var previousDisabled: Bool {
        !valid || disabled || index == 0
    }

    public var nextDisabled: Bool {
        !valid || disabled || index == count - 1
    }

    /// A request is honored when the position is valid, enabled, in range,
    /// and not the current index — the createPagedSet.request guard.
    public func canRequest(_ target: Int) -> Bool {
        valid && !disabled && target >= 0 && target < count && target != index
    }

    /// The zero-based position a draft commits to — 1-based, digits only,
    /// and it must name a reachable position — or nil when the commit
    /// degrades to cancel (draft reset). The createPagedSet.commit rule.
    public func commitTarget(for draft: String) -> Int? {
        let trimmed = draft.trimmingCharacters(in: .whitespaces)
        guard trimmed.range(of: "^[0-9]+$", options: .regularExpression) != nil,
              let parsed = Int(trimmed) else {
            return nil
        }
        return canRequest(parsed - 1) ? parsed - 1 : nil
    }
}
