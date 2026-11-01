// Generated mount witness for Select. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Select::default().multiple(true).disabled(true).searchable(true).empty(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("select-root").is_some(), "generated Select root part must reach layout");
}
