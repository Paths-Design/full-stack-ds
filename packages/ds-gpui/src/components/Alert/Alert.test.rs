// Generated mount witness for Alert. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Alert::default().dismissible(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("alert-root").is_some(), "generated Alert root part must reach layout");
}
