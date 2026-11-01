// Generated mount witness for Calendar. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Calendar::default().disabled(true).should_close_on_select(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("calendar-root").is_some(), "generated Calendar root part must reach layout");
}
