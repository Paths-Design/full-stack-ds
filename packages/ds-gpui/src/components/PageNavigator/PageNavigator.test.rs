// Generated mount witness for PageNavigator. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::PageNavigator::default().disabled(true).show_choices(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("page-navigator-root").is_some(), "generated PageNavigator root part must reach layout");
}
