// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum CalendarMode: String, CaseIterable {
    case single
    case range
}
// @generated:end

// @generated:start component
/// Token scope data for Calendar (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum CalendarTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.gap": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-gap", name: "box-model.gap", ref: "semantic.structure.size.gap", fallback: .string("16px")),
            "calendar.color.background": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-color-background", name: "calendar.color.background", ref: "semantic.color.background.primary", fallback: .adaptive(light: "#ffffff", dark: "#000000")),
            "calendar.color.foreground.primary": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-color-foreground-primary", name: "calendar.color.foreground.primary", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "calendar.color.foreground.muted": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-color-foreground-muted", name: "calendar.color.foreground.muted", ref: "semantic.color.foreground.secondary", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
            "calendar.color.border": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-color-border", name: "calendar.color.border", ref: "semantic.surface.border.subtle", fallback: .adaptive(light: "#d0d0d0", dark: "#474647")),
            "calendar.color.day.selected.background": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-color-day-selected-background", name: "calendar.color.day.selected.background", ref: "semantic.color.background.accent", fallback: .adaptive(light: "#d92d2e", dark: "#d92d2e")),
            "calendar.color.day.selected.foreground": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-color-day-selected-foreground", name: "calendar.color.day.selected.foreground", ref: "semantic.color.foreground.inverse", fallback: .adaptive(light: "#fafafa", dark: "#fafafa")),
            "calendar.color.today.ring": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-color-today-ring", name: "calendar.color.today.ring", ref: "semantic.color.border.accent", fallback: .adaptive(light: "#d92d2e", dark: "#e55b5a")),
            "calendar.size.padding": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-size-padding", name: "calendar.size.padding", ref: "core.spacing.size.06", fallback: .string("16px")),
            "calendar.size.cell": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-size-cell", name: "calendar.size.cell", ref: "core.spacing.size.08", fallback: .string("32px")),
            "calendar.size.nav": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-size-nav", name: "calendar.size.nav", ref: "core.spacing.size.07", fallback: .string("24px")),
            "calendar.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-size-radius", name: "calendar.size.radius", ref: "semantic.shape.control.radius.default", fallback: .string("6px")),
            "calendar.size.radius.day": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-size-radius-day", name: "calendar.size.radius.day", ref: "semantic.shape.radius.small", fallback: .string("4px")),
            "calendar.typography.caption.size": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-typography-caption-size", name: "calendar.typography.caption.size", ref: "semantic.typography.body.02", fallback: .string("16px")),
            "calendar.typography.day.size": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-typography-day-size", name: "calendar.typography.day.size", ref: "semantic.typography.body.03", fallback: .string("14px")),
            "calendar.focus.ring.width": FsdsComponentTokenDefinition(cssVar: "--fsds-calendar-focus-ring-width", name: "calendar.focus.ring.width", ref: "semantic.focus.ring.width", fallback: .string("2px")),
        ],
    ]
}

/// A month grid derived from the month channel through FsdsDateGrid.
public struct Calendar: View {
    @Environment(\.fsdsMessages) private var fsdsMessages
    private var fsdsScopes: FsdsComponentTokenScopes {
        CalendarTokens.scopes
    }
    @ControllableState private var value: ControllableValue<Date?>
    @ControllableState private var values: ControllableValue<[Date]>
    @ControllableState private var month: ControllableValue<Date?>
    private let mode: CalendarMode
    private let locale: String
    private let caption: String?
    private let disabled: Bool
    private let minDate: Date?
    private let maxDate: Date?
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        value: Binding<Date?>? = nil,
        defaultValue: Date? = nil,
        onChange: ((Date?) -> Void)? = nil,
        values: Binding<[Date]>? = nil,
        defaultValues: [Date] = [],
        onValuesChange: (([Date]) -> Void)? = nil,
        month: Binding<Date?>? = nil,
        defaultMonth: Date? = nil,
        onMonthChange: ((Date?) -> Void)? = nil,
        mode: CalendarMode = .single,
        locale: String = "en-US",
        caption: String? = nil,
        disabled: Bool = false,
        minDate: Date? = nil,
        maxDate: Date? = nil
    ) {
        self._value = ControllableState(controlled: value, defaultValue: defaultValue, onChange: onChange)
        self._values = ControllableState(controlled: values, defaultValue: defaultValues, onChange: onValuesChange)
        self._month = ControllableState(controlled: month, defaultValue: defaultMonth, onChange: onMonthChange)
        self.mode = mode
        self.locale = locale
        self.caption = caption
        self.disabled = disabled
        self.minDate = minDate
        self.maxDate = maxDate
    }

    private var range: Bool { mode == .range }

    private var dateGrid: FsdsDateGridState {
        FsdsDateGrid.compute(
            selection: range ? values.value : [value.value].compactMap { $0 },
            month: month.value,
            range: range,
            locale: locale,
            minDate: minDate,
            maxDate: maxDate,
            disabled: disabled,
            caption: caption
        )
    }

    /// A day outside the visible month moves the month channel to it.
    private func showMonth(_ date: Date, of grid: FsdsDateGridState) {
        if FsdsDateGrid.isSameMonth(date, grid.month) { return }
        month.set(FsdsDateGrid.addMonths(date, 0))
    }

    private func select(_ day: FsdsDateGridDay, of grid: FsdsDateGridState) {
        if day.isDisabled { return }
        if range {
            values.set(FsdsDateGrid.select(values.value, day: day.date, range: true))
        } else {
            value.set(day.date)
        }
        showMonth(day.date, of: grid)
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root"]
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var background: Color { colorSlot("calendar.color.background") ?? .clear }
    private var foreground: Color { colorSlot("calendar.color.foreground.primary") ?? .primary }
    private var muted: Color { colorSlot("calendar.color.foreground.muted") ?? .secondary }
    private var border: Color { colorSlot("calendar.color.border") ?? .clear }
    private var selectedBackground: Color { colorSlot("calendar.color.day.selected.background") ?? .accentColor }
    private var selectedForeground: Color { colorSlot("calendar.color.day.selected.foreground") ?? .white }
    private var todayRing: Color { colorSlot("calendar.color.today.ring") ?? .accentColor }
    private var ringWidth: CGFloat { pxSlot("calendar.focus.ring.width") ?? 0 }
    private var padding: CGFloat { pxSlot("calendar.size.padding") ?? 0 }
    private var cellSize: CGFloat { pxSlot("calendar.size.cell") ?? 0 }
    private var navSize: CGFloat { pxSlot("calendar.size.nav") ?? 0 }
    private var radius: CGFloat { pxSlot("calendar.size.radius") ?? 0 }
    private var dayRadius: CGFloat { pxSlot("calendar.size.radius.day") ?? 0 }
    private var captionSize: CGFloat { pxSlot("calendar.typography.caption.size") ?? 0 }
    private var daySize: CGFloat { pxSlot("calendar.typography.day.size") ?? 0 }
    private var gap: CGFloat { pxSlot("box-model.gap") ?? 0 }

    public var body: some View {
        let grid = dateGrid
        VStack(spacing: gap) {
            header(grid)
            days(grid)
        }
        .padding(padding)
        .background(background, in: RoundedRectangle(cornerRadius: radius))
        .overlay(RoundedRectangle(cornerRadius: radius).stroke(border, lineWidth: 1))
        .onChange(of: grid.caption) { _, caption in
            AccessibilityNotification.Announcement(caption).post()
        }
    }

    private func header(_ grid: FsdsDateGridState) -> some View {
        HStack(spacing: gap) {
            Button {
                showMonth(FsdsDateGrid.addMonths(grid.month, -1), of: grid)
            } label: {
                SwiftUI.Text(verbatim: "‹")
                    .font(.system(size: captionSize))
                    .foregroundStyle(foreground)
                    .frame(width: navSize, height: navSize)
                    .accessibilityHidden(true)
            }
            .buttonStyle(.plain)
            .disabled(grid.previousDisabled)
            .accessibilityLabel(fsdsMessages.string("Calendar.previousMonth", default: "Previous month"))
            SwiftUI.Text(grid.caption)
                .font(.system(size: captionSize))
                .foregroundStyle(foreground)
                .frame(maxWidth: .infinity)
            Button {
                showMonth(FsdsDateGrid.addMonths(grid.month, 1), of: grid)
            } label: {
                SwiftUI.Text(verbatim: "›")
                    .font(.system(size: captionSize))
                    .foregroundStyle(foreground)
                    .frame(width: navSize, height: navSize)
                    .accessibilityHidden(true)
            }
            .buttonStyle(.plain)
            .disabled(grid.nextDisabled)
            .accessibilityLabel(fsdsMessages.string("Calendar.nextMonth", default: "Next month"))
        }
    }

    private func days(_ grid: FsdsDateGridState) -> some View {
        Grid(horizontalSpacing: gap / 2, verticalSpacing: gap / 2) {
            GridRow {
                ForEach(grid.weekdays) { weekday in
                    SwiftUI.Text(weekday.short)
                        .font(.system(size: daySize))
                        .foregroundStyle(muted)
                        .frame(width: cellSize)
                        .accessibilityLabel(weekday.long)
                        .accessibilityAddTraits(.isHeader)
                }
            }
            ForEach(grid.weeks) { week in
                GridRow {
                    ForEach(week.days) { day in
                        dayCell(day, grid)
                    }
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(grid.caption)
    }

    private func dayCell(_ day: FsdsDateGridDay, _ grid: FsdsDateGridState) -> some View {
        let shape = RoundedRectangle(cornerRadius: dayRadius)
        let ink: Color = day.isSelected ? selectedForeground : (day.isOutsideMonth ? muted : foreground)
        let fill: Color = day.isSelected ? selectedBackground : .clear
        let ring: Color = day.isToday && !day.isSelected ? todayRing : .clear
        let current: String = day.isToday ? grid.todayName : ""
        let traits: AccessibilityTraits = day.isSelected ? [.isSelected] : []
        return Button {
            select(day, of: grid)
        } label: {
            SwiftUI.Text(day.label)
                .font(.system(size: daySize))
                .foregroundStyle(ink)
                .frame(width: cellSize, height: cellSize)
                .background(fill, in: shape)
                .overlay(shape.stroke(ring, lineWidth: ringWidth))
        }
        .buttonStyle(.plain)
        .disabled(day.isDisabled)
        .accessibilityLabel(day.fullLabel)
        .accessibilityValue(current)
        .accessibilityAddTraits(traits)
    }
}
// @generated:end
