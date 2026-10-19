<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useCalendar } from "./useCalendar.js";
import { useDateGrid } from "../../primitives/hooks/useDateGrid.js";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CalendarMode = "single" | "range";
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
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = withDefaults(defineProps<Props>(), {
  mode: "single",
  disabled: undefined,
  locale: "en-US",
  shouldCloseOnSelect: true,
});
const CalendarMessages = { previousMonth: "Previous month", nextMonth: "Next month" };
const fsdsMessages = useFsdsMessages("Calendar", CalendarMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, {  });
// @generated:end

// @generated:start hook
const behavior = useCalendar({
  value: () => props.value,
  defaultValue: props.defaultValue,
  onChange: props.onChange,
  month: () => props.month,
  defaultMonth: props.defaultMonth,
  onMonthChange: props.onMonthChange,
  shouldCloseOnSelect: props.shouldCloseOnSelect,
});
const dateGrid = useDateGrid(() => ({ value: behavior.value.value, month: behavior.month.value, mode: props.mode, locale: props.locale, minDate: props.minDate, maxDate: props.maxDate, disabled: props.disabled, caption: props.caption, onValueChange: behavior.setValue, onMonthChange: behavior.setMonth }));
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "calendar",
  props.mode ? `calendar--${props.mode}` : null,
  props.disabled ? "calendar--disabled" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <div :class="classNames" role="application" :data-testid="props.dataTestid" data-fsds-component="calendar" data-fsds-box="">
    <div :class="'calendar__header'">
      <button :class="'calendar__nav'" type="button" data-calendar-nav="previous" @click="dateGrid.previous" :aria-label="fsdsMessages.previousMonth" :aria-disabled="dateGrid.state.previousDisabled">
        <span aria-hidden="true">
          ‹
        </span>
      </button>
      <span :class="'calendar__caption'" aria-live="polite">
        {{ dateGrid.state.caption }}
      </span>
      <button :class="'calendar__nav'" type="button" data-calendar-nav="next" @click="dateGrid.next" :aria-label="fsdsMessages.nextMonth" :aria-disabled="dateGrid.state.nextDisabled">
        <span aria-hidden="true">
          ›
        </span>
      </button>
    </div>
    <table :class="'calendar__grid'" role="grid" @keydown="dateGrid.keydown" :aria-label="dateGrid.state.caption">
      <thead>
        <tr role="row">
          <th v-for="(item, index) in (dateGrid.state.weekdays ?? [])" :key="index" :class="'calendar__weekday'" role="columnheader" scope="col" :aria-label="item.long">
            <span>
              {{ item.short }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(week, row) in (dateGrid.state.weeks ?? [])" :key="row" role="row">
          <td v-for="(day, column) in (week.days ?? [])" :key="column" :class="'calendar__day'" role="gridcell" @click="() => dateGrid.select(day)" :tabindex="day.tabIndex" :aria-label="day.fullLabel" :aria-selected="day.selected" :aria-current="day.current" :aria-disabled="day.disabled" :data-date="day.key" :data-outside-month="day.outsideMonth">
            <span>
              {{ day.label }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
