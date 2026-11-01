// Generated mount witness for Pagination. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Pagination::default().disabled(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("pagination-root").is_some(), "generated Pagination root part must reach layout");
}
