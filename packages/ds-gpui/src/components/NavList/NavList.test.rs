// Generated mount witness for NavList. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::NavList::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("nav-list-root").is_some(), "generated NavList root part must reach layout");
}
