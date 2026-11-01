// Generated mount witness for Icon. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Icon::default().decorative(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("icon-root").is_some(), "generated Icon root part must reach layout");
}
