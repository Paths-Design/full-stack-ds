// Generated mount witness for NavTree. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::NavTree::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("nav-tree-root").is_some(), "generated NavTree root part must reach layout");
}
