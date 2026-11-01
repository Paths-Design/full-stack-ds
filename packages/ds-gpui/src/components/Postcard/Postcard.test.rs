// Generated mount witness for Postcard. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Postcard::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("postcard-root").is_some(), "generated Postcard root part must reach layout");
}
