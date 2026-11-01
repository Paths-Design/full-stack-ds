// Generated mount witness for List. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::List::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("list-root").is_some(), "generated List root part must reach layout");
}
