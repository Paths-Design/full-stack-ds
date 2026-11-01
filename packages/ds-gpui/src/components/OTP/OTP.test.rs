// Generated mount witness for OTP. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::OTP::default().disabled(true).read_only(true));
    cx.run_until_parked();
    assert!(cx.debug_bounds("otp-root").is_some(), "generated OTP root part must reach layout");
}
