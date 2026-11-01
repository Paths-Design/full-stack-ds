// Generated mount witness for Tabs. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Tabs::default().unmount_inactive(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("tabs-root").is_some(), "generated Tabs root part must reach layout");
}
