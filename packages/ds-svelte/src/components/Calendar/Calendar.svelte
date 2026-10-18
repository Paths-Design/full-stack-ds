<script lang="ts">
// @generated:start imports
import { useCalendar } from "./useCalendar.svelte.js";
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
  class?: string;
}

let { caption: captionProp, value, defaultValue, onChange, mode = "single", disabled, minDate, maxDate, locale = "en-US", shouldCloseOnSelect = true, days, class: className }: Props = $props();
const CalendarMessages = { caption: "Calendar", previousMonth: "Previous month", nextMonth: "Next month", gridLabel: "Calendar" };
const fsdsMessages = useFsdsMessages("Calendar", CalendarMessages);
const caption = $derived(captionProp ?? fsdsMessages.current.caption);
// @generated:end

// @generated:start hook
const behavior = useCalendar({
  value: () => value,
  defaultValue: () => defaultValue,
  onChange: () => onChange,
  shouldCloseOnSelect: () => shouldCloseOnSelect,
});
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

<div class={classes} role="application" data-fsds-component="calendar" data-fsds-box="">
  <div class={'calendar__header'}>
    <button class={'calendar__nav'} aria-label={fsdsMessages.current.previousMonth}></button>
    <span class={'calendar__caption'}>{caption}</span>
    <button class={'calendar__nav'} aria-label={fsdsMessages.current.nextMonth}></button>
  </div>
  <table class={'calendar__grid'} role="grid" aria-label={fsdsMessages.current.gridLabel}>
    <tbody>
      <tr>
        {#each (days ?? []) as item, index (index)}
        <td class={'calendar__cell'} role="gridcell" data-calendar-index={index}>
          <button class={'calendar__day'} onclick={() => behavior.setValue(item)} tabindex="-1">{item.getDate()}</button>
        </td>
        {/each}
      </tr>
    </tbody>
  </table>
</div>
