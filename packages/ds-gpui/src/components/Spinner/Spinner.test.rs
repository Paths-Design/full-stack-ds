// Generated mount witness for Spinner. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Spinner::default().aria_hidden(true).inline(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("spinner-root").is_some(), "generated Spinner root part must reach layout");
}
