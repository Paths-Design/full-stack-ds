// Generated mount witness for CodeSnippet. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::CodeSnippet::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("code-snippet-root").is_some(), "generated CodeSnippet root part must reach layout");
}
