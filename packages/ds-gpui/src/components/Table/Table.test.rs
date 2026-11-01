// Generated mount witness for Table. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Table::default().responsive(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("table-root").is_some(), "generated Table root part must reach layout");
}
