// Generated mount witness for Status. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Status::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("status-root").is_some(), "generated Status root part must reach layout");
}
