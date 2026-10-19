// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { useCalendar } from "./useCalendar";
import { useDateGrid } from "../../primitives/hooks/useDateGrid.js";
import { useFsdsMessages } from "../../primitives/messages";
import "./Calendar.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CalendarMode = "single" | "range";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface CalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, "caption" | "children" | "className" | "data-testid" | "defaultMonth" | "defaultValue" | "disabled" | "locale" | "maxDate" | "minDate" | "mode" | "month" | "onChange" | "onMonthChange" | "shouldCloseOnSelect" | "value"> {
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
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents
export interface CalendarHeaderProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function CalendarHeader({
  children,
  className,
  "data-testid": testId,
}: CalendarHeaderProps) {
  const classNames = ["calendar__header", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
const CalendarMessages = { previousMonth: "Previous month", nextMonth: "Next month" };

export function Calendar({
  value: controlledValue,
  defaultValue,
  onChange,
  month: controlledMonth,
  defaultMonth,
  onMonthChange,
  mode = "single",
  disabled,
  className,
  "data-testid": testId,
  caption,
  minDate,
  maxDate,
  locale = "en-US",
  shouldCloseOnSelect = true,
  ...rest
}: CalendarProps) {
  const fsdsMessages = useFsdsMessages("Calendar", CalendarMessages);
  const { value, setValue, month, setMonth } = useCalendar({
    value: controlledValue,
    defaultValue,
    onChange,
    month: controlledMonth,
    defaultMonth,
    onMonthChange,
    shouldCloseOnSelect,
  });

  const dateGrid = useDateGrid({ value: value, month: month, mode: mode, locale: locale, minDate: minDate, maxDate: maxDate, disabled: disabled, caption: caption, onValueChange: setValue, onMonthChange: setMonth });
  const classNames = [
    "calendar",
    mode && `calendar--${mode}`,
    disabled && "calendar--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <div className={`${classNames}`} role="application" data-testid={testId} data-fsds-component="calendar" data-fsds-box="" {...rest}>
    <div className="calendar__header">
      <button className="calendar__nav" type="button" data-calendar-nav="previous" onClick={dateGrid.previous} aria-label={fsdsMessages.previousMonth} aria-disabled={dateGrid.state.previousDisabled}>
        <span aria-hidden="true">
          {"‹"}
        </span>
      </button>
      <span className="calendar__caption" aria-live="polite">
        {dateGrid.state.caption}
      </span>
      <button className="calendar__nav" type="button" data-calendar-nav="next" onClick={dateGrid.next} aria-label={fsdsMessages.nextMonth} aria-disabled={dateGrid.state.nextDisabled}>
        <span aria-hidden="true">
          {"›"}
        </span>
      </button>
    </div>
    <table className="calendar__grid" role="grid" onKeyDown={dateGrid.keydown} aria-label={dateGrid.state.caption} aria-multiselectable={dateGrid.state.multiselectable}>
      <thead>
        <tr role="row">
          {(dateGrid.state.weekdays ?? []).map((item, index) => (
            <th className="calendar__weekday" role="columnheader" scope="col" aria-label={item.long} key={index}>
              <span>
                {item.short}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(dateGrid.state.weeks ?? []).map((week, row) => (
          <tr role="row" key={row}>
            {(week.days ?? []).map((day, column) => (
              <td className="calendar__day" role="gridcell" onClick={() => dateGrid.select(day)} tabIndex={day.tabIndex} aria-label={day.fullLabel} aria-selected={day.selected} aria-current={day.current} aria-disabled={day.disabled} data-date={day.key} data-outside-month={day.outsideMonth} key={column}>
                <span>
                  {day.label}
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
