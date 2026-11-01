// Generated mount witness for Sheet. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Sheet::default().modal(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("sheet-root").is_some(), "generated Sheet root part must reach layout");
}
