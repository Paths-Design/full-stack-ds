// Generated mount witness for Blockquote. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Blockquote::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("blockquote-root").is_some(), "generated Blockquote root part must reach layout");
}
