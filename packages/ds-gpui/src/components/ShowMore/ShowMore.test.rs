// Generated mount witness for ShowMore. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::ShowMore::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("show-more-root").is_some(), "generated ShowMore root part must reach layout");
}
