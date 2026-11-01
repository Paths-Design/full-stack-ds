// Generated mount witness for RadioGroup. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::RadioGroup::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("radio-group-root").is_some(), "generated RadioGroup root part must reach layout");
}
