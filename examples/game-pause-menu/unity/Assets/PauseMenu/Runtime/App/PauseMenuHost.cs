using System;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu
{
    /// <summary>Scene host: loads the copied fixtures, builds the pause menu and mounts it into the
    /// UIDocument on this GameObject. Failures are recorded so the capture harness can report them.</summary>
    [RequireComponent(typeof(UIDocument))]
    public sealed class PauseMenuHost : MonoBehaviour
    {
        public PauseMenuApp App { get; private set; }
        public string Error { get; private set; }
        private UIDocument document;

        private void Awake()
        {
            document = GetComponent<UIDocument>();
        }

        private void Start()
        {
            try
            {
                var fixtures = FixtureRepository.LoadFromResources();
                App = new PauseMenuApp(fixtures);
                var mount = document.rootVisualElement;
                mount.Clear();
                mount.style.flexGrow = 1;
                mount.Add(App.Root);
                App.ApplyParityTypography();

                if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("FSDS_PAUSE_EVIDENCE")))
                    gameObject.AddComponent<CaptureHarness>().Bind(this);
            }
            catch (Exception error)
            {
                Error = error.ToString();
                Debug.LogError("Game pause menu failed to build: " + Error);
            }
        }
    }
}
