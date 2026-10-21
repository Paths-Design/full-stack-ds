<script lang="ts">
// @generated:start imports
import { useCalendar } from "./useCalendar.svelte.js";
import { createReactiveDateGrid } from "../../primitives/date-grid.svelte.js";
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
type CalendarMode = "single" | "range";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  caption?: string;
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  value?: Date | Date[] | null;
  defaultValue?: Date | Date[] | null;
  onChange?: (value: Date | Date[] | null) => void;
  mode?: CalendarMode;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
  shouldCloseOnSelect?: boolean;
  class?: string;
}

let { caption, month, defaultMonth, onMonthChange, value, defaultValue, onChange, mode = "single", disabled, minDate, maxDate, locale = "en-US", shouldCloseOnSelect = true, class: className }: Props = $props();
const CalendarMessages = { previousMonth: "Previous month", nextMonth: "Next month" };
const fsdsMessages = useFsdsMessages("Calendar", CalendarMessages);
// @generated:end

// @generated:start hook
const behavior = useCalendar({
  value: () => value,
  defaultValue: () => defaultValue,
  onChange: () => onChange,
  month: () => month,
  defaultMonth: () => defaultMonth,
  onMonthChange: () => onMonthChange,
  shouldCloseOnSelect: () => shouldCloseOnSelect,
});
const dateGrid = createReactiveDateGrid(() => ({ value: behavior.value, month: behavior.month, mode: mode, locale: locale, minDate: minDate, maxDate: maxDate, disabled: disabled, caption: caption, onValueChange: behavior.setValue, onMonthChange: behavior.setMonth }));
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "calendar",
    mode ? `calendar--${mode}` : null,
    disabled ? "calendar--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} role="group" data-fsds-component="calendar" data-fsds-box="">
  <div class={'calendar__header'}>
    <button class={'calendar__nav'} type="button" data-calendar-nav="previous" onclick={dateGrid.previous} aria-label={fsdsMessages.current.previousMonth} aria-disabled={dateGrid.state.previousDisabled}>
      <span aria-hidden="true">‹</span>
    </button>
    <span class={'calendar__caption'} aria-live="polite">{dateGrid.state.caption}</span>
    <button class={'calendar__nav'} type="button" data-calendar-nav="next" onclick={dateGrid.next} aria-label={fsdsMessages.current.nextMonth} aria-disabled={dateGrid.state.nextDisabled}>
      <span aria-hidden="true">›</span>
    </button>
  </div>
  <table class={'calendar__grid'} role="grid" onkeydown={dateGrid.keydown} aria-label={dateGrid.state.caption} aria-multiselectable={dateGrid.state.multiselectable}>
    <thead>
      <tr role="row">
        {#each (dateGrid.state.weekdays ?? []) as item, index (index)}
        <th class={'calendar__weekday'} role="columnheader" scope="col" aria-label={item.long}>
          <span>{item.short}</span>
        </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each (dateGrid.state.weeks ?? []) as week, row (row)}
      <tr role="row">
        {#each (week.days ?? []) as day, column (column)}
        <td class={'calendar__day'} role="gridcell" onclick={() => dateGrid.select(day)} tabindex={day.tabIndex} aria-label={day.fullLabel} aria-selected={day.selected} aria-current={day.current} aria-disabled={day.disabled} data-date={day.key} data-outside-month={day.outsideMonth}>
          <span>{day.label}</span>
        </td>
        {/each}
      </tr>
      {/each}
    </tbody>
  </table>
</div>
