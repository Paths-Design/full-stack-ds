// Generated mount witness for Breadcrumbs. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Breadcrumbs::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("breadcrumbs-root").is_some(), "generated Breadcrumbs root part must reach layout");
}
