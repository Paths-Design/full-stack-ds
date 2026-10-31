//! Game pause menu — GPUI lane library target.
//!
//! The library target holds ONLY the lane-local data seam: the fixture adapter
//! (the single fixture-shape reader), the validated fixture snapshot, and the
//! framework-neutral pause-menu state machine that realizes interactions
//! I1–I15 of `examples/game-pause-menu/spec.md`.
//!
//! The seam is pure `std` + `serde`: it deliberately imports no gpui types so
//! `cargo test` exercises the domain rules without a platform backend. The
//! binary target (`src/main.rs` + `src/app/`) owns the GPUI window and
//! projects this state through the public API of `full_stack_ds_gpui`.

pub mod seam;

pub use seam::{
    Abilities, Ability, AbilityStats, AppState, Appearance, Audio, AudioSlider, CaptureOutcome,
    Commander, ControllerSetting, Dismissed, DropdownKind, Earnings, Faction, FactionDetail,
    FixtureError, Fixtures, Followers, GeneralSetting, LanguageSetting, MapIcon, MapIcons, Palette,
    Part, Rank, RemapAction, RemapRow, RejectReason, Settings, SlotOutcome, SlotReject, SlotState,
    SliderState, StyleConstants, SubtitleBackground, Surface, Swatch, Tab, ToggleState, Vehicle,
    VehicleSlot, contrast_ratio, format_grouped, hex_rgb, load_fixtures,
    normalize_binding, relative_luminance, try_load_fixtures, RARITIES,
};
