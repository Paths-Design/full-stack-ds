// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Calendar : VisualElement
    {
        public DateGridControl Control { get; }
        [UxmlAttribute] public string Value { get => Control.Value; set => Control.Value = value; }
        [UxmlAttribute] public string Month { get => Control.Month; set => Control.Month = value; }
        [UxmlAttribute] public string DefaultValue { get => Control.DefaultValue; set => Control.DefaultValue = value; }
        [UxmlAttribute] public string DefaultMonth { get => Control.DefaultMonth; set => Control.DefaultMonth = value; }
        [UxmlAttribute] public string Caption { get => Control.Caption; set => Control.Caption = value; }
        [UxmlAttribute] public string MinDate { get => Control.MinDate; set => Control.MinDate = value; }
        [UxmlAttribute] public string MaxDate { get => Control.MaxDate; set => Control.MaxDate = value; }
        [UxmlAttribute] public bool Disabled { get => Control.Disabled; set => Control.Disabled = value; }
        public Action<string> OnChange { get => Control.ValueChanged; set => Control.ValueChanged = value; }
        public Action<string> OnMonthChange { get => Control.MonthChanged; set => Control.MonthChanged = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<string> ValueRequested { get => Control.ValueRequested; set => Control.ValueRequested = value; }
        public bool MonthControlled { get => Control.MonthControlled; set => Control.MonthControlled = value; }
        public Action<string> MonthRequested { get => Control.MonthRequested; set => Control.MonthRequested = value; }
        public Calendar()
        {
            name = "root";
            AddToClassList("calendar");
            Gap.Attach(this);
            Control = DateGridControl.Attach(this, prefix: "calendar", headerPart: "header", captionPart: "caption", gridPart: "grid", navPart: "nav", weekdayPart: "weekday", dayPart: "day");
        }
    }
}
