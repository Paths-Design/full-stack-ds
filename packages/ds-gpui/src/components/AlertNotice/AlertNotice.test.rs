// Generated mount witness for AlertNotice. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::AlertNotice::default().dismissible(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("alert-notice-root").is_some(), "generated AlertNotice root part must reach layout");
}
