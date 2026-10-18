<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useCalendar } from "./useCalendar.js";
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
const CalendarMessages = { caption: "Calendar", previousMonth: "Previous month", nextMonth: "Next month", gridLabel: "Calendar" };
const fsdsMessages = useFsdsMessages("Calendar", CalendarMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { caption: "caption" });
// @generated:end

// @generated:start hook
const behavior = useCalendar({
  value: () => props.value,
  defaultValue: props.defaultValue,
  onChange: props.onChange,
  shouldCloseOnSelect: props.shouldCloseOnSelect,
});
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
      <button :class="'calendar__nav'" :aria-label="fsdsMessages.previousMonth"></button>
      <span :class="'calendar__caption'">
        {{ props.caption }}
      </span>
      <button :class="'calendar__nav'" :aria-label="fsdsMessages.nextMonth"></button>
    </div>
    <table :class="'calendar__grid'" role="grid" :aria-label="fsdsMessages.gridLabel">
      <tbody>
        <tr>
          <td v-for="(item, index) in (props.days ?? [])" :key="index" :class="'calendar__cell'" role="gridcell" :data-calendar-index="index">
            <button :class="'calendar__day'" @click="() => behavior.setValue(item)" tabindex="-1">
              {{ item.getDate() }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
