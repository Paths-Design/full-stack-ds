// Generated mount witness for Card. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Card::default().interactive(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("card-root").is_some(), "generated Card root part must reach layout");
}
