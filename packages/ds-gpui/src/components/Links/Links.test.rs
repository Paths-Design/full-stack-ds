// Generated mount witness for Links. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Links::default().disabled(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("links-root").is_some(), "generated Links root part must reach layout");
}
