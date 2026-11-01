// Generated mount witness for ProfileFlag. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::ProfileFlag::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("profile-flag-root").is_some(), "generated ProfileFlag root part must reach layout");
}
