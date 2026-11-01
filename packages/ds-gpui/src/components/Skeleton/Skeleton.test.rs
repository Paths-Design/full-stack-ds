// Generated mount witness for Skeleton. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Skeleton::default().decorative(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("skeleton-root").is_some(), "generated Skeleton root part must reach layout");
}
