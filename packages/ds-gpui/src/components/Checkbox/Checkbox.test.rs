// Generated mount witness for Checkbox. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Checkbox::default().indeterminate(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("checkbox-root").is_some(), "generated Checkbox root part must reach layout");
}
