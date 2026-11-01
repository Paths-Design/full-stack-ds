// Generated mount witness for Stat. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Stat::default());
    cx.run_until_parked();
    assert!(cx.debug_bounds("stat-root").is_some(), "generated Stat root part must reach layout");
}
