using System;
using System.Collections.Generic;
using System.IO;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;
namespace FullStackDS.Tests {
public class EngineComparison {
    [Serializable] public class Command { public string op, value; }
    [Serializable] public class Case { public string id, component; public bool controlled; public Command[] commands; public string[] expected; }
    [Serializable] public class Traces { public Case[] cases; }
    [Serializable] public class Row { public string id; public string[] states; }
    [Serializable] public class Receipt { public string runId, engine = "unity"; public bool passed = true; public Row[] rows; }
    private static readonly string[] Keys = { "a", "b", "locked" };
    // Each generated root composes its compound sub-elements; commands go through the attached behavior.
    private static VisualElement Build(string component) {
        if (component == "Switch") { var s = new Switch(); s.Add(new Label("Switch")); return s; }
        if (component == "Accordion") {
            var root = new Accordion { Collapsible = true };
            foreach (var key in Keys) {
                var item = new AccordionItem(); var header = new AccordionHeader();
                header.Add(new AccordionTrigger { Value = key, text = key, Disabled = key == "locked" });
                item.Add(header); item.Add(new AccordionContent { Value = key }); root.Add(item);
            }
            return root;
        }
        if (component == "Tabs") {
            var root = new Tabs(); var list = new TabsList(); root.Add(list);
            foreach (var key in Keys) { list.Add(new TabsTab { Value = key, text = key, Disabled = key == "locked" }); root.Add(new TabsPanel { Value = key }); }
            return root;
        }
        var popover = new Popover(); popover.Add(new PopoverTrigger { text = "Popover" }); popover.Add(new PopoverContent()); return popover;
    }
    [Test] public void FrozenSemanticTraces() {
        var traces = JsonUtility.FromJson<Traces>(File.ReadAllText(Environment.GetEnvironmentVariable("FSDS_ENGINE_TRACES")));
        var window = ScriptableObject.CreateInstance<EditorWindow>(); window.Show();
        var rows = new List<Row>();
        try {
            foreach (var trace in traces.cases) {
                VisualElement control = Build(trace.component);
                window.rootVisualElement.Add(control);
                BooleanControl boolean = (control as Switch)?.Control;
                ItemGroup group = (control as Accordion)?.Group ?? (control as Tabs)?.Group;
                AnchoredSurface surface = (control as Popover)?.Surface;
                if (boolean != null) boolean.Controlled = trace.controlled;
                if (group != null) group.Controlled = trace.controlled;
                if (surface != null) surface.Controlled = trace.controlled;
                var states = new List<string>();
                foreach (var command in trace.commands) {
                    if (command.op == "disable") control.SetEnabled(false);
                    else if (command.op == "commit") boolean.Value = command.value == "true";
                    else if (boolean != null) boolean.RequestValue(!boolean.Value);
                    else if (group != null) group.Activate(command.value);
                    else surface.RequestValue(!surface.Value);
                    states.Add(boolean != null ? boolean.Value.ToString().ToLowerInvariant() : group != null ? group.Value : surface.Value.ToString().ToLowerInvariant());
                }
                CollectionAssert.AreEqual(trace.expected, states, trace.id);
                rows.Add(new Row { id = trace.id, states = states.ToArray() });
                control.RemoveFromHierarchy();
            }
            File.WriteAllText(Path.Combine(Environment.GetEnvironmentVariable("FSDS_ENGINE_OUT"), "unity.json"), JsonUtility.ToJson(new Receipt { runId = Environment.GetEnvironmentVariable("FSDS_ENGINE_RUN"), rows = rows.ToArray() },true));
        } finally { window.Close(); }
    }
}}
