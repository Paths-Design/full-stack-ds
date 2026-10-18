// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { useCalendar } from "./useCalendar";
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
export interface CalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, "caption" | "children" | "className" | "data-testid" | "days" | "defaultValue" | "disabled" | "locale" | "maxDate" | "minDate" | "mode" | "onChange" | "shouldCloseOnSelect" | "value"> {
  caption?: string;
  value?: Date | Date[] | null;
  defaultValue?: Date | Date[] | null;
  onChange?: (value: Date | Date[] | null) => void;
  mode?: CalendarMode;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
  shouldCloseOnSelect?: boolean;
  days?: Date[];
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
const CalendarMessages = { caption: "Calendar", previousMonth: "Previous month", nextMonth: "Next month", gridLabel: "Calendar" };

export function Calendar({
  value: controlledValue,
  defaultValue,
  onChange,
  mode = "single",
  disabled,
  className,
  "data-testid": testId,
  caption: captionProp,
  minDate: _minDate,
  maxDate: _maxDate,
  locale: _locale = "en-US",
  shouldCloseOnSelect = true,
  days,
  ...rest
}: CalendarProps) {
  const fsdsMessages = useFsdsMessages("Calendar", CalendarMessages);
  const caption = captionProp ?? fsdsMessages.caption;
  const { value: _value, setValue } = useCalendar({
    value: controlledValue,
    defaultValue,
    onChange,
    shouldCloseOnSelect,
  });

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
      <button className="calendar__nav" aria-label={fsdsMessages.previousMonth} />
      <span className="calendar__caption">
        {caption}
      </span>
      <button className="calendar__nav" aria-label={fsdsMessages.nextMonth} />
    </div>
    <table className="calendar__grid" role="grid" aria-label={fsdsMessages.gridLabel}>
      <tbody>
        <tr>
          {(days ?? []).map((item, index) => (
            <td className="calendar__cell" role="gridcell" data-calendar-index={index} key={index}>
              <button className="calendar__day" onClick={() => setValue(item)} tabIndex={-1}>
                {item.getDate()}
              </button>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
