// Generated mount witness for Input. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Input::default().disabled(true).invalid(true).required(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("input-root").is_some(), "generated Input root part must reach layout");
}
