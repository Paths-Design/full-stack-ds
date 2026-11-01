// Generated mount witness for Toast. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Toast::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("toast-viewport").is_some(), "generated Toast root part must reach layout");
}
