// Generated mount witness for Shuttle. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Shuttle::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("shuttle-root").is_some(), "generated Shuttle root part must reach layout");
}
