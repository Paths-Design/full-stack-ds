// Generated mount witness for Button. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Button::default().loading(true).disabled(true).aria_expanded(true).aria_pressed(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("button-root").is_some(), "generated Button root part must reach layout");
}
