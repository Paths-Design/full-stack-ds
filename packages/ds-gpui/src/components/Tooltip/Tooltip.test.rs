// Generated mount witness for Tooltip. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Tooltip::default().disabled(true).close_on_escape(true).close_on_blur(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("tooltip-root").is_some(), "generated Tooltip root part must reach layout");
}
