//! State policy shared by generated Boolean controls. It has no platform authority.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BooleanState {
    pub controlled: Option<bool>,
    pub disabled: bool,
    local: bool,
}

impl BooleanState {
    pub fn new(default_value: bool) -> Self {
        Self { controlled: None, disabled: false, local: default_value }
    }

    pub fn value(&self) -> bool {
        self.controlled.unwrap_or(self.local)
    }

    /// Return a requested change; controlled owners must accept it explicitly.
    pub fn request_toggle(&mut self) -> Option<bool> {
        if self.disabled { return None; }
        let next = !self.value();
        if self.controlled.is_none() { self.local = next; }
        Some(next)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChangeRequest {
    pub channel: &'static str,
    pub handler: &'static str,
    pub value: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uncontrolled_toggles_from_the_declared_default() {
        let mut state = BooleanState::new(true);
        assert!(state.value());
        assert_eq!(state.request_toggle(), Some(false));
        assert!(!state.value());
        assert_eq!(state.request_toggle(), Some(true));
        assert!(state.value());
    }

    #[test]
    fn controlled_requests_do_not_accept_their_own_value() {
        let mut state = BooleanState::new(true);
        state.controlled = Some(false);
        assert_eq!(state.request_toggle(), Some(true));
        assert!(!state.value());
        assert_eq!(state.request_toggle(), Some(true));
        state.controlled = Some(true);
        assert!(state.value());
        assert_eq!(state.request_toggle(), Some(false));
        assert!(state.value());
        state.controlled = None;
        assert!(state.value());
    }

    #[test]
    fn disabled_suppresses_requests_in_both_modes() {
        for controlled in [None, Some(false), Some(true)] {
            let mut state = BooleanState::new(false);
            state.controlled = controlled;
            state.disabled = true;
            let before = state.clone();
            assert_eq!(state.request_toggle(), None);
            assert_eq!(state, before);
            state.disabled = false;
            assert_eq!(state.request_toggle(), Some(!before.value()));
        }
    }
}
