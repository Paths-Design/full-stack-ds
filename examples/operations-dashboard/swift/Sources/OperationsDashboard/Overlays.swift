// Overlay surfaces: the assign side Sheet, the resolve & close confirm
// Dialog, and the transient Toast region. All three run through FSDS
// components' controlled open channels; native sheet dismissal (Esc / overlay
// click) drives openness back through the channels.

import SwiftUI
import DsSwiftUI
import OperationsDashboardSeam

/// Assign workflow — side Sheet with a pending/disabled commit posture.
struct AssignSheet: View {
    @Bindable var controller: DashboardController
    @State private var assigneeInput = ""

    var body: some View {
        // FSDS: Sheet — the "Assign" side workflow. Presented via the
        // component's native sheet surface; Esc / backdrop dismissal closes
        // with no queue change.
        Sheet(
            open: Binding(
                get: { controller.assignOpen },
                set: { open in open ? controller.openAssign() : controller.closeAssign() }
            ),
            title: { Text("Assign incident") },
            bodyContent: {
                Stack(variant: .vertical, spacing: 12) {
                    Text("Assign \(controller.selectedSummary?.id ?? "this incident") to an on-call engineer.")
                    FsdsField(label: {
                        Text("Assignee")
                    }, control: {
                        Input(value: $assigneeInput, placeholder: "e.g. @ada")
                    })
                }
            },
            footer: {
                Stack(variant: .horizontal, spacing: 8) {
                    FsdsButton(
                        variant: .secondary,
                        disabled: controller.assignPending,
                        onTap: { controller.closeAssign() }
                    ) {
                        Text("Cancel")
                    }
                    FsdsButton(
                        variant: .primary,
                        disabled: controller.assignPending || assigneeInput.trimmingCharacters(in: .whitespaces).isEmpty,
                        loading: controller.assignPending,
                        onTap: {
                            controller.submitAssign(assigneeInput)
                            assigneeInput = ""
                        }
                    ) {
                        Text("Assign")
                    }
                }
            }
        )
    }
}

/// Resolve & close — confirm Dialog over the destructive action.
struct ResolveDialog: View {
    @Bindable var controller: DashboardController

    var body: some View {
        // FSDS: Dialog — Esc / backdrop dismissal cancels (no state change);
        // confirming removes the item, clears the selection, and raises a
        // Toast.
        Dialog(
            open: Binding(
                get: { controller.resolveOpen },
                set: { open in open ? controller.openResolve() : controller.closeResolve() }
            ),
            title: { Text("Resolve & close incident?") },
            bodyContent: {
                if let summary = controller.selectedSummary {
                    Text("This removes \(summary.id) — “\(summary.title)” — from the active queue. This cannot be undone in the demo.")
                } else {
                    Text("Select an incident first.")
                }
            },
            footer: {
                Stack(variant: .horizontal, spacing: 8) {
                    FsdsButton(
                        variant: .secondary,
                        disabled: controller.resolvePending,
                        onTap: { controller.closeResolve() }
                    ) {
                        Text("Cancel")
                    }
                    FsdsButton(
                        variant: .destructive,
                        disabled: controller.resolvePending || controller.selectedSummary == nil,
                        loading: controller.resolvePending,
                        onTap: { controller.confirmResolve() }
                    ) {
                        Text("Resolve & close")
                    }
                }
            }
        )
    }
}

/// Transient acknowledgements — the single FSDS Toast surface. Raising a new
/// toast overwrites the slot and re-arms the component's dwell auto-dismiss.
struct ToastRegion: View {
    @Bindable var controller: DashboardController

    var body: some View {
        if let toast = controller.toast {
            // FSDS: Toast — auto-dismisses after the component's dwell; the
            // Dismiss button closes it early through the same channel.
            Toast(open: $controller.toastOpen, item: {
                Stack(variant: .horizontal, spacing: 8) {
                    Badge(
                        variant: .status,
                        intent: Format.toastBadgeIntent(toast.variant),
                        content: { Text(Format.toastLabel(toast.variant)) }
                    )
                    FsdsButton(
                        size: .small,
                        variant: .ghost,
                        onTap: { controller.dismissToast() }
                    ) {
                        Text("Dismiss")
                    }
                }
            }, title: {
                Text(toast.title)
            })
            // Hit-testable only while visible so the hidden surface never
            // blocks the panes underneath.
            .allowsHitTesting(controller.toastOpen)
        }
    }
}
