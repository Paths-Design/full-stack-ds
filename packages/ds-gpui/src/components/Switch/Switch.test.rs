// Generated mount witness for Switch. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Switch::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("switch-root").is_some(), "generated Switch root part must reach layout");
}
