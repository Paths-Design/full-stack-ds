using System;
using FullStackDS;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;
using Button = UnityEngine.UIElements.Button; // native fallback; FullStackDS now admits Button

namespace GamePauseMenu.Tests
{
    /// <summary>Mounts the lane app into a real editor panel, the same harness the package's own
    /// EditMode tests use, and dispatches the UI Toolkit events a user's input would produce.</summary>
    public sealed class TestHost : IDisposable
    {
        public EditorWindow Window { get; }
        public PauseMenuApp App { get; }
        public VisualElement Mount { get; }

        public TestHost()
        {
            var fixtures = FixtureRepository.LoadFromResources();
            var viewport = new Vector2((float)fixtures.Parity.ViewportWidth, (float)fixtures.Parity.ViewportHeight);
            Window = ScriptableObject.CreateInstance<EditorWindow>();
            Window.minSize = viewport;
            Window.maxSize = viewport;
            Window.Show();
            // Show creates the native window and can restore its saved dimensions.
            // Apply the fixture viewport after that native sizing step.
            Window.position = new Rect(Vector2.zero, viewport);
            App = new PauseMenuApp(fixtures);
            Mount = Window.rootVisualElement;
            Mount.Add(App.Root);
            App.ApplyParityTypography();
        }

        public void Dispose()
        {
            if (Window != null) Window.Close();
        }

        public void Submit(Button button)
        {
            using (var evt = NavigationSubmitEvent.GetPooled())
            {
                evt.target = button;
                button.SendEvent(evt);
            }
        }

        public void Click(VisualElement target)
        {
            using (var evt = ClickEvent.GetPooled())
            {
                evt.target = target;
                target.SendEvent(evt);
            }
        }

        public void Key(VisualElement target, KeyCode key)
        {
            using (var evt = KeyDownEvent.GetPooled(new Event { type = EventType.KeyDown, keyCode = key }))
            {
                evt.target = target;
                target.SendEvent(evt);
            }
        }

        public void Hover(VisualElement target)
        {
            using (var evt = PointerEnterEvent.GetPooled())
            {
                evt.target = target;
                target.SendEvent(evt);
            }
        }

        public void Unhover(VisualElement target)
        {
            using (var evt = PointerLeaveEvent.GetPooled())
            {
                evt.target = target;
                target.SendEvent(evt);
            }
        }
    }
}
