using System;
using System.Globalization;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Date-grid behavior: owns the single-date value channel and the
    /// visible-month channel over a runtime six-week grid, builds the declared
    /// header/nav/caption/grid/weekday/day shell from native controls, bounds month
    /// navigation by the declared min/max dates and selects single dates as ISO
    /// yyyy-MM-dd strings. Range mode, keyboard roving, localised formats and the
    /// authored shell markup are not realised.</summary>
    public sealed class DateGridControl
    {
        private const string IsoFormat = "yyyy-MM-dd";
        private readonly VisualElement host;
        private readonly UnityEngine.UIElements.Button previousButton;
        private readonly UnityEngine.UIElements.Button nextButton;
        private readonly Label caption;
        private readonly VisualElement grid;
        private readonly string prefix;
        private readonly string weekdayClass;
        private readonly string dayClass;
        private DateTime month;
        private DateTime value;
        private bool hasValue;
        private DateTime? minDate;
        private DateTime? maxDate;
        private string captionText = "";
        private bool disabled;
        private bool valueExplicit;
        private DateTime defaultMonth;
        private bool monthExplicit;
        public bool Controlled { get; set; }
        public bool MonthControlled { get; set; }
        public Action<string> ValueChanged;
        public Action<string> ValueRequested;
        public Action<string> MonthChanged;
        public Action<string> MonthRequested;

        private DateGridControl(VisualElement host, string prefix, string headerPart, string captionPart, string gridPart, string navPart, string weekdayPart, string dayPart)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            this.prefix = prefix ?? "";
            weekdayClass = $"{prefix}__{weekdayPart}";
            dayClass = $"{prefix}__{dayPart}";
            var header = new VisualElement();
            header.AddToClassList($"{prefix}__{headerPart}");
            previousButton = new UnityEngine.UIElements.Button { text = "\u2039" };
            previousButton.AddToClassList($"{prefix}__{navPart}");
            caption = new Label();
            caption.AddToClassList($"{prefix}__{captionPart}");
            nextButton = new UnityEngine.UIElements.Button { text = "\u203A" };
            nextButton.AddToClassList($"{prefix}__{navPart}");
            header.Add(previousButton);
            header.Add(caption);
            header.Add(nextButton);
            grid = new VisualElement();
            grid.AddToClassList($"{prefix}__{gridPart}");
            host.Add(header);
            host.Add(grid);
            month = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            defaultMonth = month;
            previousButton.clicked += () => Navigate(-1);
            nextButton.clicked += () => Navigate(1);
            Apply();
        }

        public static DateGridControl Attach(VisualElement host, string prefix, string headerPart, string captionPart, string gridPart, string navPart, string weekdayPart, string dayPart)
            => new DateGridControl(host, prefix, headerPart, captionPart, gridPart, navPart, weekdayPart, dayPart);

        public string Value
        {
            get => hasValue ? value.ToString(IsoFormat, CultureInfo.InvariantCulture) : "";
            set
            {
                valueExplicit = true;
                hasValue = TryParse(value, out value);
                if (hasValue) month = new DateTime(value.Year, value.Month, 1);
                Apply();
            }
        }

        public string DefaultValue
        {
            get => "";
            set
            {
                if (valueExplicit) return;
                hasValue = TryParse(value, out value);
                if (hasValue) month = new DateTime(value.Year, value.Month, 1);
                Apply();
            }
        }

        public string Month
        {
            get => month.ToString(IsoFormat, CultureInfo.InvariantCulture);
            set
            {
                monthExplicit = true;
                if (TryParse(value, out var parsed)) month = new DateTime(parsed.Year, parsed.Month, 1);
                Apply();
            }
        }

        public string DefaultMonth
        {
            get => defaultMonth.ToString(IsoFormat, CultureInfo.InvariantCulture);
            set
            {
                if (TryParse(value, out var parsed)) defaultMonth = new DateTime(parsed.Year, parsed.Month, 1);
                if (!monthExplicit) month = defaultMonth;
                Apply();
            }
        }

        public string Caption
        {
            get => captionText;
            set
            {
                captionText = value ?? "";
                Apply();
            }
        }

        public string MinDate
        {
            get => minDate?.ToString(IsoFormat, CultureInfo.InvariantCulture) ?? "";
            set
            {
                minDate = TryParse(value, out var parsed) ? parsed : null;
                Apply();
            }
        }

        public string MaxDate
        {
            get => maxDate?.ToString(IsoFormat, CultureInfo.InvariantCulture) ?? "";
            set
            {
                maxDate = TryParse(value, out var parsed) ? parsed : null;
                Apply();
            }
        }

        public bool Disabled
        {
            get => disabled;
            set
            {
                disabled = value;
                Apply();
            }
        }

        private static bool TryParse(string? text, out DateTime parsed)
        {
            parsed = default;
            if (string.IsNullOrWhiteSpace(text)) return false;
            return DateTime.TryParseExact(text.Trim(), IsoFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed)
                || DateTime.TryParse(text.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed);
        }

        private void Navigate(int months)
        {
            if (disabled) return;
            var candidate = month.AddMonths(months);
            if (!MonthAllowed(candidate)) return;
            if (MonthControlled)
            {
                MonthRequested?.Invoke(candidate.ToString(IsoFormat, CultureInfo.InvariantCulture));
                return;
            }
            month = candidate;
            monthExplicit = true;
            Apply();
            MonthChanged?.Invoke(month.ToString(IsoFormat, CultureInfo.InvariantCulture));
        }

        private bool MonthAllowed(DateTime candidate)
        {
            var bounds = new DateTime(candidate.Year, candidate.Month, 1);
            if (minDate.HasValue && bounds < new DateTime(minDate.Value.Year, minDate.Value.Month, 1)) return false;
            if (maxDate.HasValue && bounds > new DateTime(maxDate.Value.Year, maxDate.Value.Month, 1)) return false;
            return true;
        }

        private void Select(DateTime date)
        {
            if (disabled) return;
            if (minDate.HasValue && date < minDate.Value) return;
            if (maxDate.HasValue && date > maxDate.Value) return;
            if (Controlled)
            {
                ValueRequested?.Invoke(date.ToString(IsoFormat, CultureInfo.InvariantCulture));
                return;
            }
            value = date;
            hasValue = true;
            valueExplicit = true;
            month = new DateTime(date.Year, date.Month, 1);
            Apply();
            ValueChanged?.Invoke(Value);
        }

        private void Apply()
        {
            caption.text = string.IsNullOrEmpty(captionText) ? month.ToString("yyyy-MM", CultureInfo.InvariantCulture) : captionText;
            previousButton.SetEnabled(!disabled && MonthAllowed(month.AddMonths(-1)));
            nextButton.SetEnabled(!disabled && MonthAllowed(month.AddMonths(1)));
            BuildGrid();
        }

        private void BuildGrid()
        {
            grid.Clear();
            var weekdayRow = new VisualElement();
            for (var i = 0; i < 7; i++)
            {
                var label = new Label(CultureInfo.InvariantCulture.DateTimeFormat.AbbreviatedDayNames[i]);
                label.AddToClassList(weekdayClass);
                weekdayRow.Add(label);
            }
            grid.Add(weekdayRow);
            var first = new DateTime(month.Year, month.Month, 1);
            var offset = (int)first.DayOfWeek;
            var start = first.AddDays(-offset);
            for (var row = 0; row < 6; row++)
            {
                var weekRow = new VisualElement();
                for (var column = 0; column < 7; column++)
                {
                    var date = start.AddDays(row * 7 + column);
                    var button = new UnityEngine.UIElements.Button { text = date.Day.ToString(CultureInfo.InvariantCulture) };
                    button.AddToClassList(dayClass);
                    if (date.Month != month.Month) button.AddToClassList($"{prefix}__day--outside");
                    var selectable = !disabled && date.Month == month.Month && (!minDate.HasValue || date >= minDate.Value) && (!maxDate.HasValue || date <= maxDate.Value);
                    button.SetEnabled(selectable);
                    var target = date;
                    button.clicked += () => Select(target);
                    weekRow.Add(button);
                }
                grid.Add(weekRow);
            }
        }
    }
}
