// Generated mount witness for Popover. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Popover::default().disabled(true).close_on_escape(true).close_on_outside_click(true).close_on_blur(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("popover-root").is_some(), "generated Popover root part must reach layout");
}
