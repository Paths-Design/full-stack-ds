using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace FullStackDS
{
    public enum GlyphCommandKind { Move, Line, Cubic, Close }

    public readonly struct GlyphCommand
    {
        public readonly GlyphCommandKind Kind;
        public readonly Vector2 P1, P2, P3;

        public GlyphCommand(GlyphCommandKind kind, Vector2 p1 = default,
            Vector2 p2 = default, Vector2 p3 = default)
        {
            Kind = kind; P1 = p1; P2 = p2; P3 = p3;
        }
    }

    public sealed class GlyphPath
    {
        public readonly bool Fill, Stroke;
        public readonly float StrokeWidth;
        public readonly LineCap LineCap;
        public readonly LineJoin LineJoin;
        public readonly FillRule FillRule;
        public readonly GlyphCommand[] FillCommands, StrokeCommands;

        public GlyphPath(bool fill, bool stroke, float strokeWidth,
            LineCap lineCap, LineJoin lineJoin, FillRule fillRule,
            GlyphCommand[] fillCommands, GlyphCommand[] strokeCommands)
        {
            Fill = fill; Stroke = stroke; StrokeWidth = strokeWidth;
            LineCap = lineCap; LineJoin = lineJoin; FillRule = fillRule;
            FillCommands = fillCommands; StrokeCommands = strokeCommands;
        }
    }

    public sealed class GlyphVariant
    {
        public readonly Rect ViewBox;
        public readonly GlyphPath[] Paths;
        public GlyphVariant(Rect viewBox, GlyphPath[] paths)
        {
            ViewBox = viewBox; Paths = paths;
        }
    }

    /// <summary>Paints authored catalog paths using inherited currentColor.</summary>
    public sealed class GlyphElement : VisualElement
    {
        private string glyphName = "";
        private float pixelSize = 20;
        private GlyphVariant glyph;
        private Color observedColor;
        private bool hasObservedColor;

        public string GlyphName
        {
            get => glyphName;
            set
            {
                var next = value ?? "";
                if (glyphName == next) return;
                glyphName = next;
                Resolve();
            }
        }

        public float PixelSize
        {
            get => pixelSize;
            set
            {
                if (float.IsNaN(value) || float.IsInfinity(value) || value <= 0)
                    throw new ArgumentOutOfRangeException(nameof(value));
                if (pixelSize == value) return;
                pixelSize = value;
                style.width = value;
                style.height = value;
                Resolve();
            }
        }

        public bool HasGlyph => glyph != null;
        public Rect SelectedViewBox => glyph == null ? Rect.zero : glyph.ViewBox;

        public GlyphElement()
        {
            pickingMode = PickingMode.Ignore;
            focusable = false;
            style.width = pixelSize;
            style.height = pixelSize;
            style.flexShrink = 0;
            generateVisualContent += Draw;
            RegisterCallback<GeometryChangedEvent>(_ => MarkDirtyRepaint());
            RegisterCallback<CustomStyleResolvedEvent>(_ => MarkDirtyRepaint());
            RegisterCallback<AttachToPanelEvent>(_ => {
                hasObservedColor = false;
                MarkDirtyRepaint();
            });
            // Inherited color may change when an ancestor swaps its theme class.
            // The scheduler suspends while detached and repaints only on change.
            schedule.Execute(ObserveColor).Every(16);
        }

        private void Resolve()
        {
            glyph = null;
            if (GlyphCatalog.TryGet(glyphName, pixelSize, out var found))
                glyph = found;
            MarkDirtyRepaint();
        }

        private void ObserveColor()
        {
            var color = resolvedStyle.color;
            if (hasObservedColor && color == observedColor) return;
            observedColor = color;
            hasObservedColor = true;
            MarkDirtyRepaint();
        }

        private static Vector2 Map(Vector2 point, Rect viewBox, Rect frame, float scale)
        {
            return new Vector2(
                frame.x + (frame.width - viewBox.width * scale) * .5f + (point.x - viewBox.x) * scale,
                frame.y + (frame.height - viewBox.height * scale) * .5f + (point.y - viewBox.y) * scale);
        }

        private static void Build(Painter2D painter, GlyphCommand[] commands,
            Rect viewBox, Rect frame, float scale)
        {
            painter.BeginPath();
            foreach (var command in commands)
            {
                switch (command.Kind)
                {
                    case GlyphCommandKind.Move:
                        painter.MoveTo(Map(command.P1, viewBox, frame, scale));
                        break;
                    case GlyphCommandKind.Line:
                        painter.LineTo(Map(command.P1, viewBox, frame, scale));
                        break;
                    case GlyphCommandKind.Cubic:
                        painter.BezierCurveTo(Map(command.P1, viewBox, frame, scale),
                            Map(command.P2, viewBox, frame, scale),
                            Map(command.P3, viewBox, frame, scale));
                        break;
                    case GlyphCommandKind.Close:
                        painter.ClosePath();
                        break;
                    default:
                        throw new InvalidOperationException("Unknown glyph command.");
                }
            }
        }

        private void Draw(MeshGenerationContext context)
        {
            var selected = glyph;
            var frame = contentRect;
            if (selected == null || frame.width <= 0 || frame.height <= 0) return;
            var viewBox = selected.ViewBox;
            if (viewBox.width <= 0 || viewBox.height <= 0) return;
            var scale = Mathf.Min(frame.width / viewBox.width, frame.height / viewBox.height);
            var painter = context.painter2D;
            var color = resolvedStyle.color;
            painter.fillColor = color;
            painter.strokeColor = color;
            painter.miterLimit = 4;
            foreach (var path in selected.Paths)
            {
                if (path.Fill)
                {
                    Build(painter, path.FillCommands, viewBox, frame, scale);
                    painter.Fill(path.FillRule);
                }
                if (path.Stroke && path.StrokeWidth > 0)
                {
                    painter.lineWidth = path.StrokeWidth * scale;
                    painter.lineCap = path.LineCap;
                    painter.lineJoin = path.LineJoin;
                    Build(painter, path.StrokeCommands, viewBox, frame, scale);
                    painter.Stroke();
                }
            }
        }
    }
}
