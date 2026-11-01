// Generated mount witness for TextField. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::TextField::default().invalid(true).disabled(true).required(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("text-field-root").is_some(), "generated TextField root part must reach layout");
}
