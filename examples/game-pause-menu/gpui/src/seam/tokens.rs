//! Token-graph loader for the parity palette.
//!
//! The GPUI target has no brand-overlay loader of its own, so the lane resolves
//! its rendering palette from the committed token graph (`resolved.tokens.json`)
//! and the Orion brand layer (`orion.tokens.json`) instead of carrying a second
//! copy of the palette. Values are embedded at compile time so the lane and its
//! tests always read exactly the committed token bytes.
//!
//! The authority (`fixtures/parity-layout.json`) stores a `colorTokens` /
//! `typeTokens` provenance entry for every colour and size; this module turns
//! those entries into the rendered values.

use serde_json::Value;
use std::collections::BTreeMap;
use std::sync::OnceLock;

pub const RESOLVED_TOKENS_JSON: &str =
    include_str!("../../../../../packages/ds-tokens/generated/resolved.tokens.json");
pub const ORION_BRAND_JSON: &str =
    include_str!("../../../../../packages/ds-tokens/src/brands/orion.tokens.json");

const REM_PX: f32 = 16.0;

/// One authority role's token provenance (`colorTokens` / `typeTokens` value).
#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize)]
pub struct TokenProvenance {
    pub token: String,
    #[serde(default = "default_mode")]
    pub mode: String,
}

fn default_mode() -> String {
    "dark".into()
}

struct Tables {
    resolved: BTreeMap<String, Value>,
    /// Brand leaves keyed by the semantic token name the token build emits.
    brand: BTreeMap<String, Value>,
}

fn tables() -> &'static Tables {
    static TABLES: OnceLock<Tables> = OnceLock::new();
    TABLES.get_or_init(|| {
        let resolved = parse_tables(RESOLVED_TOKENS_JSON, false).expect("resolved token graph JSON");
        let brand = parse_tables(ORION_BRAND_JSON, true).expect("Orion brand token JSON");
        Tables { resolved, brand }
    })
}

fn parse_tables(source: &str, is_brand: bool) -> Result<BTreeMap<String, Value>, String> {
    let root: Value = serde_json::from_str(source).map_err(|error| error.to_string())?;
    let mut out = BTreeMap::new();
    let mut trail = Vec::new();
    walk(&root, &mut trail, &mut out, is_brand)?;
    Ok(out)
}

fn walk(
    node: &Value,
    trail: &mut Vec<String>,
    out: &mut BTreeMap<String, Value>,
    is_brand: bool,
) -> Result<(), String> {
    let object = node
        .as_object()
        .ok_or_else(|| "token nodes must be JSON objects".to_string())?;
    if object.contains_key("$value") {
        let path = trail.join(".");
        let key = if is_brand {
            format!("semantic.{path}")
        } else {
            path
        };
        out.insert(key, node.clone());
        return Ok(());
    }
    for (key, child) in object {
        if key.starts_with('$') {
            continue;
        }
        // Brand component overrides address component-local slots rather than
        // the semantic layer; they are not part of the parity palette.
        if is_brand && trail.is_empty() && key == "components" {
            continue;
        }
        trail.push(key.clone());
        walk(child, trail, out, is_brand)?;
        trail.pop();
    }
    Ok(())
}

fn themed_value(value: &Value, mode: &str) -> Value {
    let Some(object) = value.as_object() else {
        return value.clone();
    };
    if object.contains_key("light") || object.contains_key("dark") {
        return object
            .get(if mode == "light" { "light" } else { "dark" })
            .cloned()
            .unwrap_or_else(|| value.clone());
    }
    value.clone()
}

fn resolve_node(token: &str, mode: &str) -> Option<Value> {
    let tables = tables();
    if let Some(node) = tables.brand.get(token) {
        let node = node.as_object()?;
        let extension = node
            .get("$extensions")
            .and_then(|extensions| match mode {
                "light" => extensions.get("fsds.light"),
                _ => extensions.get("fsds.dark"),
            });
        let value = extension.or_else(|| node.get("$value"))?;
        return Some(themed_value(value, mode));
    }
    let node = tables.resolved.get(token)?.as_object()?;
    Some(themed_value(node.get("$value")?, mode))
}

/// Resolve a colour token to its `#RRGGBB` value.
pub fn resolve_color(token: &str, mode: &str) -> Option<String> {
    let value = resolve_node(token, mode)?;
    let text = value.as_str()?.trim();
    let bytes = text.as_bytes();
    if text.len() == 7 && bytes[0] == b'#' && bytes[1..].iter().all(u8::is_ascii_hexdigit) {
        Some(text.to_string())
    } else {
        None
    }
}

fn dimension_px(value: &Value) -> Option<f32> {
    if let Some(number) = value.as_f64() {
        return Some(number as f32);
    }
    if let Some(text) = value.as_str() {
        let trimmed = text.trim();
        if let Some(px) = trimmed.strip_suffix("px") {
            return px.parse::<f32>().ok();
        }
        if let Some(rem) = trimmed.strip_suffix("rem") {
            return rem.parse::<f32>().ok().map(|value| value * REM_PX);
        }
        return None;
    }
    let object = value.as_object()?;
    if let (Some(number), Some(unit)) = (object.get("value")?.as_f64(), object.get("unit")?.as_str()) {
        return match unit {
            "px" => Some(number as f32),
            "rem" => Some(number as f32 * REM_PX),
            _ => None,
        };
    }
    if object.contains_key("light") || object.contains_key("dark") {
        return dimension_px(&themed_value(value, "dark"));
    }
    None
}

/// Resolve a dimension/typography token to pixels.
pub fn resolve_size(token: &str, mode: &str) -> Option<f32> {
    dimension_px(&resolve_node(token, mode)?)
}

/// Resolve an authority colour map (`name → provenance`) to rendered hex values.
pub fn resolve_palette(
    tokens: &BTreeMap<String, TokenProvenance>,
) -> Result<BTreeMap<String, String>, String> {
    let mut out = BTreeMap::new();
    for (name, provenance) in tokens {
        let value = resolve_color(&provenance.token, &provenance.mode)
            .ok_or_else(|| format!("colour '{name}' token '{}' does not resolve", provenance.token))?;
        out.insert(name.clone(), value);
    }
    Ok(out)
}

/// Resolve an authority type map (`key → provenance`) to pixel sizes.
pub fn resolve_type_scale(
    tokens: &BTreeMap<String, TokenProvenance>,
) -> Result<BTreeMap<String, f32>, String> {
    let mut out = BTreeMap::new();
    for (name, provenance) in tokens {
        let value = resolve_size(&provenance.token, &provenance.mode)
            .ok_or_else(|| format!("type '{name}' token '{}' does not resolve to a size", provenance.token))?;
        out.insert(name.clone(), value);
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_orion_dark_and_light_tokens() {
        assert_eq!(
            resolve_color("semantic.color.background.secondary", "dark").as_deref(),
            Some("#232320")
        );
        assert_eq!(
            resolve_color("semantic.color.background.secondary", "light").as_deref(),
            Some("#E9E5D8")
        );
        assert_eq!(
            resolve_color("semantic.color.surface.moss", "dark").as_deref(),
            Some("#7D8F82")
        );
        assert_eq!(resolve_size("core.typography.ramp.9", "dark"), Some(40.0));
        assert_eq!(
            resolve_size("semantic.typography.graphic.size.display", "dark"),
            Some(28.0)
        );
    }

    #[test]
    fn unknown_tokens_do_not_resolve() {
        assert_eq!(resolve_color("semantic.color.not.a.token", "dark"), None);
        assert_eq!(resolve_size("core.typography.not-a-token", "dark"), None);
    }
}
