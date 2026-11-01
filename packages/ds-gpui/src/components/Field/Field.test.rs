// Generated mount witness for Field. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Field::default().required(true).disabled(true).read_only(true).validating(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("field-root").is_some(), "generated Field root part must reach layout");
}
