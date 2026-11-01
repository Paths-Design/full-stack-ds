// Generated mount witness for Accordion. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::Accordion::default().collapsible(true).disabled(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("accordion-root").is_some(), "generated Accordion root part must reach layout");
}
