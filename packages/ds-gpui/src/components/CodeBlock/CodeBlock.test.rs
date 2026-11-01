// Generated mount witness for CodeBlock. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::CodeBlock::default().highlight(true).show_line_numbers(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("code-block-root").is_some(), "generated CodeBlock root part must reach layout");
}
