// Generated mount witness for Divider. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Divider::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("divider-root").is_some(), "generated Divider root part must reach layout");
}
