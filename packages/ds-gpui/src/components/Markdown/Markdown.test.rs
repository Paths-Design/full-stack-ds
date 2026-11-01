// Generated mount witness for Markdown. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Markdown::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("markdown-root").is_some(), "generated Markdown root part must reach layout");
}
