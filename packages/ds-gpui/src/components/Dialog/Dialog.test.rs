// Generated mount witness for Dialog. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Dialog::default().modal(true).dismissible(true).close_on_escape(true).close_on_backdrop_click(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("dialog-root").is_some(), "generated Dialog root part must reach layout");
}
