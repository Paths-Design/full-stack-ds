// Generated mount witness for Image. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Image::default().show_placeholder(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("image-root").is_some(), "generated Image root part must reach layout");
}
