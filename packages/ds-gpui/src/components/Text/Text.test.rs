// Generated mount witness for Text. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Text::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("text-root").is_some(), "generated Text root part must reach layout");
}
