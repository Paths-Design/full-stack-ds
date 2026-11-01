// Generated mount witness for Command. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Command::default().should_filter(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("command-root").is_some(), "generated Command root part must reach layout");
}
