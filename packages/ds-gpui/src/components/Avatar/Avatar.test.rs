// Generated mount witness for Avatar. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Avatar::default().priority(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("avatar-root").is_some(), "generated Avatar root part must reach layout");
}
