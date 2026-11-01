// Generated mount witness for Walkthrough. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Walkthrough::default().auto_start(true).close_on_outside_click(true).previous_disabled(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("walkthrough-root").is_some(), "generated Walkthrough root part must reach layout");
}
