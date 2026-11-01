// Generated mount witness for ToggleSwitch. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::ToggleSwitch::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("toggle-switch-root").is_some(), "generated ToggleSwitch root part must reach layout");
}
