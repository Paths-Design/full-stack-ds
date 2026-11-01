// Generated mount witness for Label. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Label::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("label-root").is_some(), "generated Label root part must reach layout");
}
