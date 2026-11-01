// Generated mount witness for Carousel. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Carousel::default().auto_play(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("carousel-root").is_some(), "generated Carousel root part must reach layout");
}
