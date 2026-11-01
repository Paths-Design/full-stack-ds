// Generated mount witness for Progress. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Progress::default().show_value(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("progress-root").is_some(), "generated Progress root part must reach layout");
}
