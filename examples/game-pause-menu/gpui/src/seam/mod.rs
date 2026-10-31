//! Lane-local data seam: fixtures → validated snapshot → domain state.
//!
//! BOUNDARY (mirrors `examples/operations-dashboard/gpui/src/seam/`): UI code
//! consumes ONLY the public surface re-exported here — [`AppState`] for domain
//! transitions and [`Fixtures`] for immutable fixture data. The adapter
//! ([`adapter`]) is the single module that knows the raw JSON field names;
//! reaching past it into fixture files or raw `serde_json::Value`s from view
//! code is a boundary violation, the same class as reaching past the
//! `full_stack_ds_gpui` public exports.
//!
//! The whole module is pure `std` + `serde` (no gpui types), so `cargo test`
//! exercises every domain rule without a platform backend.

pub mod adapter;
pub mod state;
pub mod types;

pub use adapter::{FixtureError, Fixtures, load_fixtures, try_load_fixtures, RARITIES};
pub use state::{
    AppState, CaptureOutcome, Dismissed, DropdownKind, RemapRow, RejectReason, SlotOutcome,
    SlotReject, SlotState, SliderState, Tab, ToggleState, format_grouped, normalize_binding,
};
pub use types::{
    Abilities, Ability, AbilityStats, Appearance, Audio, AudioSlider, Commander, ControllerSetting,
    Earnings, Faction, FactionDetail, Followers, GeneralSetting, LanguageSetting, MapIcon,
    MapIcons, Palette, Part, Rank, RemapAction, Settings, StyleConstants, SubtitleBackground,
    Surface, Swatch, Vehicle, VehicleSlot, contrast_ratio, hex_rgb, relative_luminance,
};
