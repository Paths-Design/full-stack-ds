// Generated mount witness for Chip. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Chip::default().disabled(true).aria_expanded(true).aria_pressed(true).dismissible(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("chip-root").is_some(), "generated Chip root part must reach layout");
}
