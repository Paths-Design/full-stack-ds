// Generated mount witness for Details. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Details::default().disabled(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("details-root").is_some(), "generated Details root part must reach layout");
}
