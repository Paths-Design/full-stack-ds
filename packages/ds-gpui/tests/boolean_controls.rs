use full_stack_ds_gpui::components::{Switch, ToggleSwitch};
use full_stack_ds_gpui::control::ChangeRequest;

#[test]
fn generated_switch_requests_and_suppresses_contract_channel_changes() {
    let mut control = Switch::default().default_checked(true);
    assert!(control.state.value());
    assert_eq!(control.request_change(), Some(ChangeRequest {
        channel: "checked", handler: "onChange", value: false,
    }));
    assert!(!control.state.value());
    control = control.disabled(true);
    assert_eq!(control.request_change(), None);
    assert!(!control.state.value());
    assert_eq!(Switch::CONTROL_PART, "input");
}

#[test]
fn generated_button_control_waits_for_its_owner_to_accept_requests() {
    let mut control = ToggleSwitch::default().checked(Some(false));
    assert_eq!(control.request_change(), Some(ChangeRequest {
        channel: "checked", handler: "onChange", value: true,
    }));
    assert!(!control.state.value());
    control = control.checked(Some(true));
    assert!(control.state.value());
    assert_eq!(control.request_change().unwrap().value, false);
    assert!(control.state.value());
    assert_eq!(ToggleSwitch::CONTROL_PART, "root");
}
