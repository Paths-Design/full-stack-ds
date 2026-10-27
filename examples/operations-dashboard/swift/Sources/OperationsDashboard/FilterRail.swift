// Filter rail region: a Card hosting the search Field/Input, the environment
// Select, the severity Checkbox group, and a visible "Clear filters"
// affordance. All controls run through their package-owned channels.

import SwiftUI
import DsSwiftUI
import OperationsDashboardSeam

struct FilterRail: View {
    @Bindable var controller: DashboardController

    var body: some View {
        // FSDS: the rail is a Card; each labelled control is an FsdsField
        // (named-slot composer: label/control regions) hosting the package's
        // value-channel Input / selection-channel Select.
        Card(header: {
            Text("Filters").font(.headline)
        }, content: {
            Stack(variant: .vertical, spacing: 12) {
                FsdsField(label: {
                    Text("Search")
                }, control: {
                    Input(
                        value: $controller.filters.search,
                        placeholder: "id, title, or service"
                    )
                })

                FsdsField(label: {
                    Text("Environment")
                }, control: {
                    Select(options: environmentOptions, selection: environmentSelection)
                })

                severityGroup

                FsdsDivider()

                FsdsButton(
                    variant: .tertiary,
                    disabled: !controller.filtersActive,
                    onTap: { controller.clearFilters() }
                ) {
                    Text("Clear filters")
                }
            }
        })
    }

    // NOT FSDS: the severity group label. The Swift target has no
    // Fieldset/Legend surface (the React lane used a native <fieldset>); a
    // plain text label marks the group.
    private var severityGroup: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Severity").font(.subheadline)
            Stack(variant: .vertical, spacing: 6) {
                ForEach(Severity.allCases, id: \.self) { severity in
                    Stack(variant: .horizontal, spacing: 6) {
                        Checkbox(checked: severityBinding(severity))
                        Text(Format.severityLabel(severity))
                    }
                }
            }
        }
    }

    // MARK: Channels

    /// "All environments" is the empty string = no environment filter
    /// (React parity).
    private var environmentOptions: [SelectOption] {
        [SelectOption(value: "", label: "All environments")]
            + OpsEnvironment.allCases.map { SelectOption(value: $0.rawValue, label: $0.rawValue) }
    }

    private var environmentSelection: Binding<String> {
        Binding(
            get: { controller.filters.environment?.rawValue ?? "" },
            set: { controller.filters.environment = OpsEnvironment(rawValue: $0) }
        )
    }

    private func severityBinding(_ severity: Severity) -> Binding<Bool> {
        Binding(
            get: { controller.filters.severities.contains(severity) },
            set: { _ in controller.toggleSeverity(severity) }
        )
    }
}
